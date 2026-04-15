#!/usr/bin/env node

import { chromium } from "playwright";

async function inspect() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("https://www.demoblaze.com/");
    await page.waitForTimeout(5000); // manual inspect

    // Log all input selectors matching SEARCH_INPUT_SELECTORS
    const selectors = [
        'input[type="search"]',
        'input[name*="search" i]',
        'input[id*="search" i]',
        'input[placeholder*="search" i]',
        'input[aria-label*="search" i]',
        'form[role="search"] input',
        "header input",
    ];

    for (const selector of selectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        console.log(`Selector "${selector}": ${count} elements`);
        for (let i = 0; i < count; i++) {
            const el = elements.nth(i);
            const visible = await el.isVisible();
            const placeholder = await el.getAttribute('placeholder') || '';
            const id = await el.getAttribute('id') || '';
            const name = await el.getAttribute('name') || '';
            const type = await el.getAttribute('type') || '';
            console.log(`  [${i}] visible:${visible} placeholder:"${placeholder}" id:"${id}" name:"${name}" type:"${type}"`);
        }
    }

    console.log('Browser open - inspect manually, Ctrl+C to close');
    await new Promise(() => {}); // keep open
}

inspect();