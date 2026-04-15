#!/usr/bin/env node

import { addProductToCart } from "./src/ecommerce.js";

const result = await addProductToCart({
    siteUrl: "https://www.demoblaze.com/",
    productQuery: "iPhone",
    quantity: 2,
    headless: false,
    timeoutMs: 60000,
    selectors: {
        searchInput: '#search-items',
        cookieAccept: 'button[onclick*="accept"]',
    },
});

console.log(JSON.stringify(result, null, 2));