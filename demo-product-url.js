#!/usr/bin/env node

import { addProductToCart } from "./src/ecommerce.js";

const result = await addProductToCart({
    siteUrl: "https://www.demoblaze.com/",
    productUrl: "https://www.demoblaze.com/prod.html?idp_=3",
    quantity: 2,
    headless: false,
    timeoutMs: 60000,
});

console.log(JSON.stringify(result, null, 2));