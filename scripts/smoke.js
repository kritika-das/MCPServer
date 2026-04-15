import { addProductToCart } from "../src/ecommerce.js";

const result = await addProductToCart({
    siteUrl: "https://www.demoblaze.com/",
    productUrl: "https://www.demoblaze.com/prod.html?idp_=1",
    quantity: 1,
    headless: false,
    timeoutMs: 30000,
});

console.log(JSON.stringify(result, null, 2));