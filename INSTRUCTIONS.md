# Ecommerce Cart MCP Server - Run Instructions

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ 
- PowerShell/Terminal in `c:/Users/kriti/Downloads/MCP`

### 2. Install
```powershell
npm ci
npx playwright install chromium
```

### 3. Start Server (Stdio MCP)
```powershell
npm start
```
*Output*: `ecommerce-cart-server running on stdio` (keep running)

### 4. Test (Visible Browser Demo)
```powershell
npm run smoke  # Modified: headless=false
# OR
node demo-product-url.js  # Nexus 6 x2 to cart
node demo-visible.js      # iPhone search
```
**Watch**: Chromium opens, adds to cart live.

## 🛠️ MCP Client Integration (VSCode/Cursor/Continue)

**Config** (`settings.json` or `mcp.json`):
```json
{
  \"mcpServers\": {
    \"ecommerce-cart\": {
      \"command\": \"node\",
      \"args\": [\"c:/Users/kriti/Downloads/MCP/src/server.js\"]
    }
  }
}
```
**Prompt Example**:
```
Use add_to_cart: siteUrl=https://www.demoblaze.com/, productQuery=iPhone, quantity=2, headless=false
```

## 📋 Tool: `add_to_cart`
| Param | Req | Desc |
|-------|-----|------|
| siteUrl | ✅ | e.g. https://demoblaze.com |
| productQuery | ❗ | Search \"laptop\" |
| productUrl | ❗ | Direct /prod/123 |
| quantity |  | 1-10 |
| headless |  | false=visible |
| selectors |  | Custom CSS |

**Mutually exclusive**: productQuery OR productUrl.

## ✅ Verified
- Server: Running on stdio.
- Smoke: Success (Samsung galaxy s6).
- Demos: Visible browser (Nexus 6 x2).

**Stop**: Ctrl+C. Restart anytime.
