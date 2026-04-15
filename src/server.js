#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { addProductToCart } from "./ecommerce.js";

const server = new McpServer(
  {
    name: "ecommerce-cart-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      logging: {},
    },
  },
);

server.registerTool(
  "add_to_cart",
  {
    title: "Add To Cart",
    description:
      "Open an ecommerce storefront, locate a product by URL or search query, and add it to the cart.",
    inputSchema: {
      siteUrl: z.string().url().describe("Base storefront URL, for example https://demo.opencart.com/."),
      productQuery: z
        .string()
        .min(1)
        .optional()
        .describe("Product name or search phrase to look up on the site."),
      productUrl: z
        .string()
        .url()
        .optional()
        .describe("Direct URL for the product page. Use this when you already know the exact item page."),
      quantity: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe("Desired quantity to place into the cart. Defaults to 1."),
      headless: z
        .boolean()
        .optional()
        .describe("Whether to run the browser headlessly. Defaults to true."),
      browserChannel: z
        .enum(["chromium", "chrome", "msedge"])
        .optional()
        .describe("Browser channel to use. Defaults to the bundled Chromium."),
      timeoutMs: z
        .number()
        .int()
        .min(1000)
        .max(120000)
        .optional()
        .describe("Maximum wait per major navigation step. Defaults to 30000."),
      screenshotsDir: z
        .string()
        .optional()
        .describe("Optional directory where a final screenshot should be saved."),
      selectors: z
        .object({
          cookieAccept: z.string().optional(),
          searchInput: z.string().optional(),
          searchSubmit: z.string().optional(),
          productLink: z.string().optional(),
          quantityInput: z.string().optional(),
          addToCart: z.string().optional(),
          cartLink: z.string().optional(),
        })
        .optional()
        .describe("Optional CSS selector overrides for storefronts with custom markup."),
    },
    outputSchema: {
      success: z.boolean(),
      siteUrl: z.string(),
      finalUrl: z.string(),
      productTitle: z.string(),
      quantity: z.number(),
      quantityUpdated: z.boolean(),
      addToCartStrategy: z.string(),
      cartOpened: z.boolean(),
      confirmationMessages: z.array(z.string()),
      cartPreview: z.array(z.string()),
      screenshotPath: z.string().nullable(),
    },
  },
  async (args) => {
    const result = await addProductToCart(args);

    return {
      content: [
        {
          type: "text",
          text: [
            `Added product on ${result.siteUrl}.`,
            `Product page: ${result.productTitle}`,
            `Final URL: ${result.finalUrl}`,
            `Add-to-cart strategy: ${result.addToCartStrategy}`,
            `Cart opened: ${result.cartOpened}`,
            result.confirmationMessages.length
              ? `Messages: ${result.confirmationMessages.join(" | ")}`
              : "Messages: none detected",
            result.cartPreview.length ? `Cart preview: ${result.cartPreview.join(" || ")}` : "Cart preview: unavailable",
            result.screenshotPath ? `Screenshot: ${result.screenshotPath}` : "Screenshot: not requested",
          ].join("\n"),
        },
      ],
      structuredContent: {
        ...result,
        screenshotPath: result.screenshotPath ?? null,
      },
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ecommerce-cart-server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
