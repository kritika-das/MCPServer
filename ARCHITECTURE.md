# MCP Ecommerce Cart Server - Complete Architecture Guide

## 🎯 Project Overview: What Is This?

This is an **MCP Server** (Model Context Protocol) that automates shopping on e-commerce websites. Think of it as a **robot that can:**
1. Open a website
2. Search for a product
3. Add it to a shopping cart
4. Report back what it did

It's designed to work with AI tools like Claude in VSCode or Cursor so they can automate shopping tasks.

---

## 🏗️ Architecture (End-to-End)

```
┌─────────────────────────────────────────────────────────────┐
│           AI Tool (Claude in VSCode/Cursor)                 │
│           "Add an iPhone to the cart"                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │   MCP Protocol      │
                │  (Communication)    │
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────────────┐
                │   server.js (Main Server)   │
                │  - Registers tools          │
                │  - Listens for commands     │
                └──────────┬──────────────────┘
                           │
                ┌──────────▼──────────────────┐
                │  ecommerce.js (Brain)       │
                │  - Opens browser            │
                │  - Finds products           │
                │  - Clicks buttons           │
                │  - Returns results          │
                └──────────┬──────────────────┘
                           │
                ┌──────────▼──────────────────┐
                │  Playwright (Browser)       │
                │  - Chromium/Chrome          │
                │  - Navigates websites       │
                │  - Interacts with HTML      │
                └─────────────────────────────┘
```

---

## 📋 Main Components Explained

### 1. Server.js - The Command Center
**File:** `src/server.js`

**What it does:**
- Starts an MCP Server listening on stdin/stdout (like a text pipe)
- Registers a tool called `add_to_cart` 
- Tells AI tools what parameters the tool accepts
- Receives requests from AI tools and routes them to ecommerce.js

**Key responsibilities:**
- Initialize the MCP server with name and version
- Define the `add_to_cart` tool schema with input parameters
- Set up transport layer (stdio) for communication
- Handle incoming requests and error handling

**Key part:**
```javascript
server.registerTool(
  "add_to_cart",
  {
    title: "Add To Cart",
    description: "Open an ecommerce storefront, locate a product..."
    // Define all the input parameters here
  }
)
```

**Input Schema Parameters:**
- `siteUrl` (required): Base storefront URL, e.g., `https://demo.opencart.com/`
- `productQuery` (optional): Product name or search phrase to look up
- `productUrl` (optional): Direct URL for the product page
- `quantity` (optional): Desired quantity (1-10, default 1)
- `headless` (optional): Whether to run browser headlessly (default true)
- `browserChannel` (optional): Browser choice (chromium, chrome, msedge)
- `timeoutMs` (optional): Timeout per major step
- `screenshotsDir` (optional): Directory for saving screenshots
- `selectors` (optional): CSS overrides for custom websites

---

### 2. Ecommerce.js - The Robot Brain
**File:** `src/ecommerce.js`

**What it does:**
This is where the actual automation happens. It exports the main function `addProductToCart()` that orchestrates the entire process.

**Step-by-Step Workflow:**

```
1. Initialize Browser Context
   ↓
2. Navigate to Site URL
   ↓
3. Dismiss Cookie Banner (if present)
   ↓
4. Find & Navigate to Product
   ├─ Option A: Direct URL → Navigate directly
   └─ Option B: Search Query → Search → Select product
   ↓
5. Set Quantity (if needed)
   ↓
6. Click "Add to Cart" Button
   ↓
7. Wait for Confirmation Message
   ↓
8. Take Screenshot (optional)
   ↓
9. Return Success/Error Result
```

**Example flow:**
```
User Input: 
  siteUrl="https://demoblaze.com"
  productQuery="iPhone"
  quantity=2

Process:
  Open browser → Go to demoblaze.com
    ↓
  Find search input → Type "iPhone" → Click search
    ↓
  Find first product link → Click it
    ↓
  Set quantity to 2 → Click "Add to Cart"
    ↓
  Return: {success: true, message: "Added 2 items to cart"}
```

#### Key Functions:

**Smart Selector Arrays:**
Instead of hardcoding one exact button selector, the code tries multiple patterns:

```javascript
const SEARCH_INPUT_SELECTORS = [
  'input[type="search"]',
  'input[name*="search" i]',
  'input[id*="search" i]',
  // ... tries all these until one works
]
```

Why? Because different websites use different HTML structures. This approach works on many sites automatically.

**Score-Based Candidate Selection:**
When searching for products, the code scores candidates:
```javascript
function scoreCandidate(text, href, query) {
  // Score based on:
  // - How many search terms appear in the text
  // - How many search terms appear in the URL
  // - Exact phrase matches (bonus points)
  // - Negative patterns like "Remove", "Wishlist" (penalty)
}
```

**Wait & Click Functions:**
```javascript
async function clickIfVisible(locator) {
  // Try to click visible elements
  // Handles timing issues automatically
}

async function dismissCookieBanner(page, selectors) {
  // Automatically dismisses cookie consent dialogs
  // Looks for buttons matching: "Accept", "Agree", "Allow", etc.
}

async function waitForSettledPage(page, timeoutMs) {
  // Waits for page to be fully loaded
  // Monitors: DOM ready + Network idle
}
```

**Error Handling:**
- Graceful degradation when selectors don't match
- Timeout management for slow sites
- Screenshot capture on success/failure
- Detailed error messages

---

### 3. Package.json - Project Configuration
**File:** `package.json`

```json
{
  "name": "ecommerce-cart-mcp-server",
  "version": "1.0.0",
  "description": "An MCP server that can browse an ecommerce site and add a product to the cart.",
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",      // Start the MCP server
    "smoke": "node scripts/smoke.js"    // Run automated test
  }
}
```

---

## 📦 Dependencies (Tools It Uses)

| Package | Version | Purpose |
|---------|---------|---------|
| **@modelcontextprotocol/sdk** | ^1.29.0 | Enables MCP protocol (talks to AI tools like Claude) |
| **playwright** | ^1.59.1 | Browser automation (opens websites, clicks buttons, fills forms) |
| **zod** | ^4.3.6 | Validates input parameters (ensures data correctness) |

### Why These?

- **MCP SDK**: Industry standard for connecting AI assistants to external tools
- **Playwright**: Cross-browser support (Chromium, Chrome, Firefox, Safari), modern API, reliable
- **Zod**: Runtime validation catches parameter errors before execution

---

## 🎬 Real-World Example

### Scenario: You ask Claude in VSCode: *"Add an iPhone to the cart on Demoblaze, quantity 2"*

**Complete Step-By-Step Process:**

```
1. YOU: "Add an iPhone to the cart on Demoblaze, quantity 2"
   ↓
2. Claude parses: "This needs the add_to_cart tool"
   ↓
3. Claude calls server with:
   {
     "siteUrl": "https://www.demoblaze.com/",
     "productQuery": "iPhone",
     "quantity": 2,
     "headless": false
   }
   ↓
4. server.js receives it and calls ecommerce.js:addProductToCart()
   ↓
5. ecommerce.js orchestrates:
   a. Creates browser context
   b. Navigates to demoblaze.com
   c. Waits for page to load
   d. Dismisses cookie banner
   e. Finds search box using SEARCH_INPUT_SELECTORS
   f. Types "iPhone"
   g. Finds and clicks search button
   h. Scores product links by relevance
   i. Clicks most relevant "iPhone" link
   j. Changes quantity from 1 to 2
   k. Clicks "Add to Cart" button
   l. Waits for success message
   m. Takes optional screenshot
   n. Closes browser
   ↓
6. Returns result:
   {
     "success": true,
     "message": "Added product to cart",
     "itemsInCart": 2,
     "siteUrl": "https://www.demoblaze.com/",
     "screenshot": "path/to/screenshot.png"
   }
   ↓
7. Claude reads this and tells you:
   ✅ "Done! I added 2 iPhones to your Demoblaze cart"
```

---

## 🧪 Testing & Demo Files

### Smoke Test: `scripts/smoke.js`
**Purpose**: Automated test against Demoblaze demo site

```javascript
const result = await addProductToCart({
  siteUrl: "https://www.demoblaze.com/",
  productUrl: "https://www.demoblaze.com/prod.html?idp_=1",
  quantity: 1,
  headless: false,
  timeoutMs: 30000,
});
```

**Run with:** `npm run smoke`

### Demo Files:

| File | Purpose | Run With |
|------|---------|----------|
| **demo-product-url.js** | Add Nexus 6 using direct URL | `node demo-product-url.js` |
| **demo-visible.js** | Search for iPhone with visible browser | `node demo-visible.js` |
| **demo-task-iphone.js** | Search for iPhone (hidden browser) | `node demo-task-iphone.js` |
| **demo-task-iphone-fixed.js** | iPhone with custom selectors | `node demo-task-iphone-fixed.js` |
| **demo-task-samsung.js** | Search for Samsung product | `node demo-task-samsung.js` |
| **user-add-iphone-demo.js** | Full workflow demo | `node user-add-iphone-demo.js` |

---

## 🔄 How It All Connects

```
┌──────────────────────────────────────────────────────────────┐
│ AI LAYER                                                     │
│ User: "Add iPhone to cart"                                   │
│ Claude AI (VSCode/Cursor)                                    │
└───────────────────────┬──────────────────────────────────────┘
                        │
        MCP PROTOCOL (JSON over stdio)
                        │
┌───────────────────────▼──────────────────────────────────────┐
│ SERVER LAYER                                                 │
│ src/server.js                                                │
│ ├─ Registers "add_to_cart" tool                              │
│ ├─ Validates input with Zod                                  │
│ └─ Routes to ecommerce.js                                    │
└───────────────────────┬──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│ AUTOMATION LAYER                                             │
│ src/ecommerce.js                                             │
│ ├─ Initialize Playwright browser                             │
│ ├─ Navigate & wait for pages                                 │
│ ├─ Smart element detection                                   │
│ ├─ User interactions (type, click, select)                   │
│ └─ Result collection & validation                            │
└───────────────────────┬──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│ BROWSER LAYER                                                │
│ Playwright + Chromium/Chrome/Edge                            │
│ ├─ Actual website navigation                                 │
│ ├─ DOM manipulation                                          │
│ └─ Real user-like interactions                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🌐 Communication Flow (Message Exchange)

```
Claude (Thoughts)
    ↓
"User wants to add iPhone to cart. I have an add_to_cart tool."
    ↓
Claude (Tool Call - JSON)
────────────────────────────────────────────────────
{
  "tool": "add_to_cart",
  "params": {
    "siteUrl": "https://www.demoblaze.com/",
    "productQuery": "iPhone",
    "quantity": 2
  }
}
────────────────────────────────────────────────────
    ↓
server.js (Routes to ecommerce.js)
    ↓
ecommerce.js (Opens browser, automates)
    ↓
Playwright (Actual browser automation)
    ↓
Website (Receives clicks, form submissions)
    ↓
ecommerce.js (Returns result)
────────────────────────────────────────────────────
{
  "success": true,
  "message": "Added product to cart",
  "itemsInCart": 2
}
────────────────────────────────────────────────────
    ↓
Claude (Reads result)
    ↓
"Great! The automation succeeded. I can tell the user."
    ↓
Claude (Response to User)
    ↓
"✅ Done! I added 2 iPhones to your cart on Demoblaze"
```

---

## 🔧 Key Features & Capabilities

### ✅ Flexible Product Input
- **Option A**: Provide direct product URL → Goes there immediately
- **Option B**: Provide search query → Searches and intelligently selects product

### ✅ Website Compatibility
- Works on different websites (not just one)
- Smart selector fallbacks for various HTML structures
- Handles common obstacles (cookie banners, loaders)

### ✅ Automation Robustness
- Automatic timeouts to prevent hanging
- Waits for pages to fully load before interactions
- Tries multiple selector patterns for resilience
- Scores and ranks product matches
- Handles visibility checks before clicking

### ✅ Quantity & Browser Control
- Can add 1-10 items in single operation
- Choose browser: Chromium, Chrome, or Microsoft Edge
- Headless or visible mode (useful for debugging)

### ✅ Evidence & Debugging
- Optional screenshot capture
- Detailed success/error messages
- Execution logs for troubleshooting
- Works with any selector override

### ✅ Multi-Language AI Integration
- Works with Claude, GPT-4, or any MCP-compatible AI
- stdio transport (no port conflicts)
- Runs locally (no cloud dependency)

---

## 📝 Setup & Usage

### Installation
```powershell
# 1. Clone repository
git clone https://github.com/kritika-das/MCPServer.git
cd MCPServer

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npx playwright install chromium
```

### Start the Server
```powershell
npm start
```
Output: `ecommerce-cart-server running on stdio` (keep terminal running)

### Test It Locally
```powershell
npm run smoke
# Watch: Chromium opens, adds Nexus 6 to Demoblaze cart
```

### Integrate with AI Tools
**VSCode/Cursor MCP Config** (settings.json):
```json
{
  "mcpServers": {
    "ecommerce-cart": {
      "command": "node",
      "args": ["c:/Users/kriti/Downloads/MCP/src/server.js"]
    }
  }
}
```

### Use with Claude/AI
```
Prompt: "Use add_to_cart with siteUrl=https://www.demoblaze.com/, 
         productQuery=iPhone, quantity=2, headless=false"

Result: Browser opens, finds iPhone, adds to cart, shows success!
```

---

## 🎯 Use Cases

1. **E-commerce QA Testing**: Automated smoke tests for cart functionality
2. **Price Monitoring**: Check if products are still in stock and trackable
3. **Inventory Audits**: Verify products exist on multiple storefronts
4. **Demo Automation**: Create shopping demos without manual clicking
5. **AI Assistant Shopping**: Let Claude help customers add items to carts
6. **Cross-Site Testing**: Same tool works on different websites

---

## ⚠️ Limitations & Constraints

- Does NOT complete payment/checkout
- Some sites require login (would need credential handling)
- Anti-bot systems may block automated access
- Highly customized site UI may need custom selectors
- JavaScript-heavy sites need longer waits/timeouts
- Geo-restricted sites may not be accessible

---

## 🔍 Code Quality Features

- **Type Safety**: Zod validation on all inputs
- **Error Handling**: Graceful fallbacks, detailed error messages
- **Logging**: Comprehensive logging for debugging
- **Browser Safety**: Proper cleanup and resource management
- **Timeout Protection**: Prevents hanging on slow sites
- **Accessibility**: Semantic HTML detection (aria-labels, roles)

---

## 📚 File Structure

```
MCP/
├── src/
│   ├── server.js           # MCP server entry point
│   └── ecommerce.js        # Main automation logic
├── scripts/
│   └── smoke.js            # Automated test suite
├── demos/
│   ├── demo-product-url.js
│   ├── demo-visible.js
│   ├── demo-task-*.js      # Various demo scenarios
│   └── user-add-iphone-demo.js
├── package.json            # Project dependencies
├── package-lock.json       # Dependency lock file
├── README.md               # Quick start guide
├── INSTRUCTIONS.md         # Detailed setup instructions
├── ARCHITECTURE.md         # This file
└── .gitignore              # Git ignore patterns
```

---

## 🚀 Deployment

The server is designed to run locally and:
- Takes minimal resources (Chromium only when needed)
- Auto-closes browsers after each operation
- Stateless (each request is independent)
- Ready for containerization (Docker)
- Can run 24/7 for AI assistant integration

---

## 🤝 Integration Example

```javascript
// How Claude would use this tool:

// User: "Add iPhone to my Demoblaze cart"

// Claude decides: "I need to use add_to_cart"
// Claude sends:
{
  "tool": "add_to_cart",
  "arguments": {
    "siteUrl": "https://www.demoblaze.com/",
    "productQuery": "iPhone",
    "quantity": 1,
    "headless": false
  }
}

// Server executes and returns:
{
  "success": true,
  "message": "Added Samsung Galaxy S7 to cart",
  "itemsInCart": 1,
  "siteUrl": "https://www.demoblaze.com/"
}

// Claude tells user: "✅ Done! I added an iPhone to your cart."
```

---

## 📞 Support & Troubleshooting

**Server won't start:**
- Ensure Node.js 18+ is installed
- Check: `node --version`
- Ensure Playwright is installed: `npx playwright install chromium`

**Browser won't open:**
- Check Chromium installation: `npx playwright install --with-deps`
- Try headless=true to test without display

**Can't find product:**
- Try direct productUrl instead of search
- Increase timeoutMs parameter
- Check website HTML structure

**MCP tool not appearing in Claude:**
- Verify server is running and no errors
- Check MCP config path is correct
- Reload Claude/VSCode

---

## 📞 Version Information

- **Node.js**: 18+
- **Playwright**: 1.59.1+
- **MCP SDK**: 1.29.0+
- **Zod**: 4.3.6+
- **Created**: 2026

---

**For more details, see:**
- [README.md](README.md) - Quick start
- [INSTRUCTIONS.md](INSTRUCTIONS.md) - Detailed setup
- [src/server.js](src/server.js) - Server implementation
- [src/ecommerce.js](src/ecommerce.js) - Automation logic
