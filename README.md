# Ecommerce Cart MCP Server

This project provides a small MCP server that uses Playwright to open an ecommerce storefront, find a product, and add it to the cart.

## What It Does

The server exposes one tool:

- `add_to_cart`: Opens a storefront, finds a product by direct URL or by search query, clicks the add-to-cart control, and optionally opens the cart page.

It is designed for demo sites, QA automation, and storefronts with conventional markup. Because storefront HTML varies a lot, the tool also accepts optional selector overrides when a site uses custom components.

## Requirements

- Node.js 18+
- Playwright browser binaries installed

If you need browser binaries on a new machine:

```powershell
npx playwright install chromium
```

## Install

```powershell
npm install
```

## Run The Server

```powershell
npm start
```

The server uses stdio transport, so it can be wired into any MCP client that supports stdio servers.

## MCP Client Config Example

```json
{
  "mcpServers": {
    "ecommerce-cart": {
      "command": "node",
      "args": [
        "C:/Users/kriti/Downloads/MCP/src/server.js"
      ]
    }
  }
}
```

## Tool Input

`add_to_cart` accepts:

- `siteUrl`: base storefront URL
- `productQuery`: product name to search for
- `productUrl`: direct product page URL
- `quantity`: optional quantity, default `1`
- `headless`: optional, default `true`
- `browserChannel`: optional, one of `chromium`, `chrome`, `msedge`
- `timeoutMs`: optional timeout per major step
- `screenshotsDir`: optional directory for a saved screenshot
- `selectors`: optional CSS overrides:
  - `cookieAccept`
  - `searchInput`
  - `searchSubmit`
  - `productLink`
  - `quantityInput`
  - `addToCart`
  - `cartLink`

You must provide either `productQuery` or `productUrl`.

## Example Tool Call

```json
{
  "siteUrl": "https://www.demoblaze.com/",
  "productUrl": "https://www.demoblaze.com/prod.html?idp_=1",
  "quantity": 1,
  "headless": true
}
```

## Local Smoke Test

This repo includes a basic smoke test against the Demoblaze demo site:

```powershell
npm run smoke
```

## Notes

- This server stops at adding an item to the cart. It does not enter payment details or place an order.
- Some sites require login, geo checks, anti-bot flows, or custom UI selectors. For those, pass explicit selectors in `selectors`.
