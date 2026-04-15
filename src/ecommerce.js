import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const SEARCH_INPUT_SELECTORS = [
  'input[type="search"]',
  'input[name*="search" i]',
  'input[id*="search" i]',
  'input[placeholder*="search" i]',
  'input[aria-label*="search" i]',
  'form[role="search"] input',
  "header input",
];

const SEARCH_SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button[aria-label*="search" i]',
  'button[name*="search" i]',
  'button[id*="search" i]',
];

const PRODUCT_LINK_SELECTORS = [
  "main a[href]",
  "article a[href]",
  '[class*="product" i] a[href]',
  '[data-testid*="product" i] a[href]',
  ".product-thumb a[href]",
];

const QUANTITY_SELECTORS = [
  'input[name*="qty" i]',
  'input[id*="qty" i]',
  'input[aria-label*="quantity" i]',
  'input[placeholder*="quantity" i]',
  'input[type="number"]',
];

const CART_LINK_SELECTORS = [
  'a[href*="cart" i]',
  'button[aria-label*="cart" i]',
  'a[aria-label*="cart" i]',
  '[class*="cart" i] a[href]',
  '[class*="bag" i] a[href]',
  '[class*="basket" i] a[href]',
];

const MESSAGE_SELECTORS = [
  '[role="alert"]',
  '[aria-live="polite"]',
  '[aria-live="assertive"]',
  '[class*="alert" i]',
  '[class*="notice" i]',
  '[class*="message" i]',
  '[class*="toast" i]',
];

const COOKIE_BUTTON_PATTERN = /accept|agree|allow|got it|ok(?:ay)?|continue/i;
const ADD_TO_CART_PATTERN = /add to cart|add to bag|add to basket|buy now|purchase/i;
const CART_PATTERN = /cart|bag|basket/i;
const POSITIVE_MESSAGE_PATTERN = /added|success|cart|bag|basket|purchase|buy/i;
const NEGATIVE_ACTION_PATTERN = /remove|delete|wishlist|compare|checkout/i;

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function toAbsoluteUrl(baseUrl, href) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function tokenize(text) {
  return normalizeText(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function scoreCandidate(text, href, query) {
  const normalizedText = normalizeText(text).toLowerCase();
  const normalizedHref = (href ?? "").toLowerCase();
  const tokens = tokenize(query);

  if (!normalizedText && !normalizedHref) {
    return -1;
  }

  let score = 0;

  for (const token of tokens) {
    if (normalizedText.includes(token)) {
      score += 5;
    }

    if (normalizedHref.includes(token)) {
      score += 2;
    }
  }

  if (normalizedText.includes(query.toLowerCase())) {
    score += 15;
  }

  if (NEGATIVE_ACTION_PATTERN.test(normalizedText)) {
    score -= 20;
  }

  return score;
}

async function waitForSettledPage(page, timeoutMs) {
  await page.waitForLoadState("domcontentloaded", { timeout: timeoutMs }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 5000) }).catch(() => {});
}

async function clickIfVisible(locator) {
  const count = await locator.count();

  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);

    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click({ timeout: 2000 }).catch(() => {});
      return true;
    }
  }

  return false;
}

async function dismissCookieBanner(page, selectors) {
  if (selectors.cookieAccept) {
    const clicked = await clickIfVisible(page.locator(selectors.cookieAccept));
    if (clicked) {
      await page.waitForTimeout(400);
      return true;
    }
  }

  const buttons = page.locator("button, a, [role=\"button\"]");
  const count = Math.min(await buttons.count(), 40);

  for (let index = 0; index < count; index += 1) {
    const candidate = buttons.nth(index);
    const text = normalizeText((await candidate.innerText().catch(() => "")) || "");

    if (!text || !COOKIE_BUTTON_PATTERN.test(text)) {
      continue;
    }

    if (!(await candidate.isVisible().catch(() => false))) {
      continue;
    }

    await candidate.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(400);
    return true;
  }

  return false;
}

async function findFirstVisible(page, selectorList) {
  for (const selector of selectorList) {
    const locator = page.locator(selector);
    const count = await locator.count().catch(() => 0);

    for (let index = 0; index < count; index += 1) {
      const candidate = locator.nth(index);
      if (await candidate.isVisible().catch(() => false)) {
        return candidate;
      }
    }
  }

  return null;
}

async function searchForProduct(page, siteUrl, productQuery, selectors, timeoutMs) {
  const searchInput = await findFirstVisible(page, [
    ...(selectors.searchInput ? [selectors.searchInput] : []),
    ...SEARCH_INPUT_SELECTORS,
  ]);

  if (!searchInput) {
    throw new Error("Could not find a visible search input on the storefront.");
  }

  await searchInput.click({ timeout: 3000 }).catch(() => {});
  await searchInput.fill(productQuery, { timeout: 5000 });

  let submitted = false;

  if (selectors.searchSubmit) {
    submitted = await clickIfVisible(page.locator(selectors.searchSubmit));
  }

  if (!submitted) {
    submitted = await clickIfVisible(page.locator(SEARCH_SUBMIT_SELECTORS.join(", ")));
  }

  if (!submitted) {
    await searchInput.press("Enter");
  }

  await waitForSettledPage(page, timeoutMs);

  const productLink = await pickProductLink(page, siteUrl, productQuery, selectors);

  if (!productLink) {
    throw new Error(`Could not find a product result matching "${productQuery}".`);
  }

  await productLink.click({ timeout: 5000 });
  await waitForSettledPage(page, timeoutMs);
}

async function pickProductLink(page, siteUrl, productQuery, selectors) {
  if (selectors.productLink) {
    const overridden = await findFirstVisible(page, [selectors.productLink]);
    if (overridden) {
      return overridden;
    }
  }

  const selector = PRODUCT_LINK_SELECTORS.join(", ");
  const candidates = page.locator(selector);
  const count = Math.min(await candidates.count().catch(() => 0), 80);
  const scored = [];

  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);

    if (!(await candidate.isVisible().catch(() => false))) {
      continue;
    }

    const text = normalizeText((await candidate.innerText().catch(() => "")) || "");
    const href = toAbsoluteUrl(siteUrl, await candidate.getAttribute("href").catch(() => null));

    if (!href) {
      continue;
    }

    const score = scoreCandidate(text, href, productQuery);

    if (score > 0) {
      scored.push({ candidate, score });
    }
  }

  scored.sort((left, right) => right.score - left.score);
  return scored[0]?.candidate ?? null;
}

async function setQuantity(page, quantity, selectors) {
  if (quantity <= 1) {
    return false;
  }

  const quantityInput = await findFirstVisible(page, [
    ...(selectors.quantityInput ? [selectors.quantityInput] : []),
    ...QUANTITY_SELECTORS,
  ]);

  if (!quantityInput) {
    return false;
  }

  await quantityInput.fill(String(quantity), { timeout: 3000 }).catch(() => {});
  return true;
}

async function findAddToCartTarget(page, selectors) {
  if (selectors.addToCart) {
    const overridden = await findFirstVisible(page, [selectors.addToCart]);
    if (overridden) {
      return { locator: overridden, strategy: `selector:${selectors.addToCart}` };
    }
  }

  const roleButton = page.getByRole("button", { name: ADD_TO_CART_PATTERN }).first();
  if (await roleButton.isVisible().catch(() => false)) {
    return { locator: roleButton, strategy: "role-button" };
  }

  const genericTargets = page.locator('button, a, input[type="submit"], [role="button"]');
  const count = Math.min(await genericTargets.count().catch(() => 0), 120);

  for (let index = 0; index < count; index += 1) {
    const candidate = genericTargets.nth(index);

    if (!(await candidate.isVisible().catch(() => false))) {
      continue;
    }

    const text = normalizeText((await candidate.innerText().catch(() => "")) || "");
    const valueText = normalizeText((await candidate.getAttribute("value").catch(() => "")) || "");
    const combined = `${text} ${valueText}`.trim();

    if (!combined || !ADD_TO_CART_PATTERN.test(combined) || NEGATIVE_ACTION_PATTERN.test(combined)) {
      continue;
    }

    return { locator: candidate, strategy: "text-match" };
  }

  return null;
}

async function extractProductTitle(page) {
  const candidates = [
    "main h1",
    "main h2",
    'h1[itemprop="name"]',
    'h2[itemprop="name"]',
    '[class*="product-title" i]',
    '[class*="product-name" i]',
    ".name",
    "h1",
    "h2",
  ];

  const heading = await findFirstVisible(page, candidates);

  if (heading) {
    const text = normalizeText((await heading.innerText().catch(() => "")) || "");
    if (text) {
      return text;
    }
  }

  return normalizeText(await page.title());
}

async function clickAddToCart(page, selectors, timeoutMs) {
  const target = await findAddToCartTarget(page, selectors);

  if (!target) {
    throw new Error("Could not find an add-to-cart control on the product page.");
  }

  const previousUrl = page.url();
  await target.locator.click({ timeout: 5000 });
  await page.waitForTimeout(1500);
  await waitForSettledPage(page, timeoutMs);

  return {
    strategy: target.strategy,
    navigated: page.url() !== previousUrl,
  };
}

async function openCart(page, selectors, timeoutMs) {
  if (selectors.cartLink) {
    const overridden = await findFirstVisible(page, [selectors.cartLink]);
    if (overridden) {
      await overridden.click({ timeout: 3000 }).catch(() => {});
      await waitForSettledPage(page, timeoutMs);
      return true;
    }
  }

  const cartLocator = page.locator(CART_LINK_SELECTORS.join(", "));
  if (await clickIfVisible(cartLocator)) {
    await waitForSettledPage(page, timeoutMs);
    return true;
  }

  const cartRoleLink = page.getByRole("link", { name: CART_PATTERN }).first();
  if (await cartRoleLink.isVisible().catch(() => false)) {
    await cartRoleLink.click({ timeout: 3000 }).catch(() => {});
    await waitForSettledPage(page, timeoutMs);
    return true;
  }

  const cartRoleButton = page.getByRole("button", { name: CART_PATTERN }).first();
  if (await cartRoleButton.isVisible().catch(() => false)) {
    await cartRoleButton.click({ timeout: 3000 }).catch(() => {});
    await waitForSettledPage(page, timeoutMs);
    return true;
  }

  return false;
}

async function extractMessages(page, dialogMessages) {
  const messages = [];

  for (const selector of MESSAGE_SELECTORS) {
    const locator = page.locator(selector);
    const count = Math.min(await locator.count().catch(() => 0), 8);

    for (let index = 0; index < count; index += 1) {
      const text = normalizeText((await locator.nth(index).innerText().catch(() => "")) || "");
      if (text && POSITIVE_MESSAGE_PATTERN.test(text) && !NEGATIVE_ACTION_PATTERN.test(text)) {
        messages.push(text);
      }
    }
  }

  return [...new Set([...dialogMessages, ...messages])].slice(0, 5);
}

async function maybeSaveScreenshot(page, screenshotsDir, fileName) {
  if (!screenshotsDir) {
    return null;
  }

  const absoluteDir = path.resolve(screenshotsDir);
  await fs.mkdir(absoluteDir, { recursive: true });
  const screenshotPath = path.join(absoluteDir, fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

async function extractCartPreview(page) {
  const lines = [];
  const selectors = [
    "table tbody tr",
    '[class*="cart-item" i]',
    '[class*="line-item" i]',
    '[data-testid*="cart" i]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = Math.min(await locator.count().catch(() => 0), 5);

    for (let index = 0; index < count; index += 1) {
      const text = normalizeText((await locator.nth(index).innerText().catch(() => "")) || "");
      if (text) {
        lines.push(text);
      }
    }
  }

  return [...new Set(lines)].slice(0, 3);
}

function buildLaunchOptions(browserChannel, headless) {
  if (!browserChannel || browserChannel === "chromium") {
    return { headless };
  }

  return {
    channel: browserChannel,
    headless,
  };
}

export async function addProductToCart({
  browserChannel = "chromium",
  headless = true,
  productQuery,
  productUrl,
  quantity = 1,
  screenshotsDir,
  selectors = {},
  siteUrl,
  timeoutMs = 30000,
}) {
  const browser = await chromium.launch(buildLaunchOptions(browserChannel, headless));
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
  });
  const page = await context.newPage();
  const dialogMessages = [];

  page.on("dialog", async (dialog) => {
    dialogMessages.push(normalizeText(dialog.message()));
    await dialog.accept().catch(() => {});
  });

  try {
    await page.goto(siteUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await waitForSettledPage(page, timeoutMs);
    await dismissCookieBanner(page, selectors);

    if (productUrl) {
      await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      await waitForSettledPage(page, timeoutMs);
    } else if (productQuery) {
      await searchForProduct(page, siteUrl, productQuery, selectors, timeoutMs);
    } else {
      throw new Error("Provide either productQuery or productUrl.");
    }

    const productTitle = await extractProductTitle(page);
    const quantityUpdated = await setQuantity(page, quantity, selectors);
    const addResult = await clickAddToCart(page, selectors, timeoutMs);
    const confirmationMessages = await extractMessages(page, dialogMessages);
    const cartOpened = await openCart(page, selectors, timeoutMs);
    const cartPreview = cartOpened ? await extractCartPreview(page) : [];
    const screenshotPath = await maybeSaveScreenshot(page, screenshotsDir, "cart.png");

    return {
      success: true,
      siteUrl,
      finalUrl: page.url(),
      productTitle,
      quantity,
      quantityUpdated,
      addToCartStrategy: addResult.strategy,
      cartOpened,
      confirmationMessages,
      cartPreview,
      screenshotPath,
    };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
