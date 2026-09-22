import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
import { renderHtml } from "../../scripts/render.mjs";
import { createCatalog } from "../../scripts/catalog.mjs";
import { repo } from "../fixtures.mjs";

async function ready(page, url = "/") {
  await page.goto(url);
  await expect(page.locator("html")).toHaveAttribute("data-enhanced", "true");
}

async function catalog(page) {
  return page.locator("#catalog-data").evaluate((element) => JSON.parse(element.textContent).projects);
}

test("the static catalog enhances without browser errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  const projects = await catalog(page);
  await expect(page.locator("[data-project-row]")).toHaveCount(projects.length);
  await expect(page.locator("#stage-preview")).toBeVisible();
  await expect(page.locator("#selected-launch")).toHaveAttribute("href", /^https?:\/\//);
  await expect(page.locator("#site-notice")).toBeHidden();
  expect(errors).toEqual([]);
});

test("explicit project membership and deployed launch URLs survive rendering", async ({ page }) => {
  await ready(page);
  const projects = await catalog(page);
  const expected = {
    "jcorp-ai-readiness": "https://jcorp-ai-readiness-xcvzjh.azurewebsites.net/",
    me7: "https://e7calc.azurewebsites.net/",
    "t1-demo-station": "https://t-onedemo-admin.azurewebsites.net/",
    mmcdashboard: "https://zeffree.github.io/mmcdashboard/",
  };
  for (const name of ["test-hermes", "myspringboard"]) {
    expect(projects.some((project) => project.name === name)).toBe(false);
    await expect(page.locator(`[data-project-row="${name}"]`)).toHaveCount(0);
  }
  for (const [name, url] of Object.entries(expected)) {
    expect(projects.filter((project) => project.name === name)).toHaveLength(1);
    await expect(page.locator(`[data-project-row="${name}"] .project-title`)).toHaveAttribute("href", url);
  }
});

test("external and private-source project details remain truthful", async ({ page }) => {
  await ready(page, "/?project=t1-demo-station&view=details");
  const dialog = page.getByRole("dialog");
  await expect(page.locator("#dialog-title")).toHaveText("T1 Demo Station");
  await expect(dialog.locator(".detail-actions a")).toHaveCount(1);
  await expect(dialog.locator("dt", { hasText: "Repository" })).toHaveCount(0);
  await expect(dialog.getByRole("link", { name: /Launch project/ })).toHaveAttribute("href", "https://t-onedemo-admin.azurewebsites.net/");
  await ready(page, "/?project=mmcdashboard&view=details");
  await expect(dialog.getByRole("link", { name: /View source \(private\)/ })).toHaveAttribute("href", "https://github.com/zeffree/mmcdashboard");
  await expect(dialog).toContainText("not actual MMC results");
  await expect(dialog).toContainText("requires GitHub access");
});

test("search, category, ordering, empty results, and reset stay coherent", async ({ page }) => {
  await ready(page);
  const projects = await catalog(page);
  const target = projects.find((project) => project.summary && project.category);
  const input = page.getByRole("searchbox", { name: "Find a project" });
  await input.fill(target.name);
  await expect(page.locator("[data-project-row]:visible")).toHaveCount(1);
  await expect(page.locator("#selected-title")).toHaveText(target.title);
  await expect(input).toBeFocused();
  await input.fill("no-such-project-0123456789");
  await expect(page.locator("#no-results")).toBeVisible();
  await expect(page.locator("#selected-project")).toBeHidden();
  await expect(page.locator("#surprise")).toBeDisabled();
  await page.getByRole("button", { name: "Reset filters", exact: true }).click();
  await expect(page.locator("[data-project-row]:visible")).toHaveCount(projects.length);
  const category = page.locator("[data-category]").filter({ hasText: target.category }).first();
  await category.click();
  await expect(page.locator("[data-project-row]:visible")).toHaveCount(projects.filter((p) => p.category === target.category).length);
  await page.locator("#project-sort").selectOption("alphabetical");
  const titles = await page.locator("[data-project-row]:visible h3").allTextContents();
  expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true })));
});

test("a project expands into a native dialog and returns focus through Back and Escape", async ({ page }) => {
  await ready(page);
  const opener = page.locator("#selected-details");
  const previousUrl = page.url();
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close project details" })).toBeFocused();
  await expect(page).toHaveURL(/view=details/);
  await page.goBack();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(previousUrl);
  await expect(opener).toBeFocused();
  await opener.click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test("a direct project link opens the right details and closes without leaving the site", async ({ page }) => {
  await ready(page);
  const projects = await catalog(page);
  const target = projects.at(-1);
  await ready(page, `/?project=${encodeURIComponent(target.name)}&view=details`);
  await expect(page.locator("#dialog-title")).toHaveText(target.title);
  await page.getByRole("button", { name: "Close project details" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page).not.toHaveURL(/view=details/);
  await expect(page.locator("#selected-title")).toHaveText(target.title);
  await ready(page, "/?project=not-a-real-project&view=details");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("#site-notice")).toContainText("no longer in the catalog");
});

test("channel keys, next/previous, and surprise selection work without a mouse", async ({ page }) => {
  await ready(page);
  const current = await page.locator("#selected-title").textContent();
  const active = page.locator("[data-channel][aria-pressed=true]");
  await active.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#selected-title")).not.toHaveText(current);
  await expect(page.locator("[data-channel][aria-pressed=true]")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.locator("#selected-title")).toHaveText(current);
  await page.getByRole("button", { name: "Surprise me" }).click();
  await expect(page.locator("#selected-title")).not.toHaveText(current);
  await expect(page.locator("#selected-title")).toBeFocused();
  await page.keyboard.press("/");
  await expect(page.getByRole("searchbox")).toBeFocused();
});

test("the whole catalog remains available with JavaScript disabled", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("[data-project-row]").first()).toBeVisible();
    await expect(page.locator("#selected-launch")).toHaveAttribute("href", /^https?:\/\//);
    await expect(page.locator(".static-notice")).toBeVisible();
    await expect(page.getByRole("searchbox")).not.toBeVisible();
    const detail = page.locator(".project-details").first();
    await detail.locator("summary").click();
    await expect(detail).toHaveAttribute("open", "");
    await expect(detail.locator(".detail-content")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("unavailable transition and dialog APIs preserve project access", async ({ page }) => {
  await page.addInitScript(() => {
    document.startViewTransition = undefined;
    HTMLDialogElement.prototype.showModal = undefined;
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await ready(page);
  const original = await page.locator("#selected-title").textContent();
  await page.getByRole("button", { name: "Next project", exact: true }).click();
  await expect(page.locator("#selected-title")).not.toHaveText(original);
  const selectedName = await page.locator("#selected-details").getAttribute("data-inspect");
  await page.locator("#selected-details").click();
  await expect(page.locator(`[data-detail="${selectedName}"]`)).toHaveAttribute("open", "");
  await expect(page.locator(`[data-detail="${selectedName}"] .detail-content`)).toBeVisible();
});

test("motion preference persists and operating-system reduction takes priority", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await ready(page);
  await page.getByRole("button", { name: "Reduce motion", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await page.getByRole("button", { name: "Motion reduced", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  const animationCount = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  expect(animationCount).toBe(0);
});

test("failed preview images have an explicit fallback and a working launch link", async ({ page }) => {
  await page.route("**/assets/previews/*.webp", (route) => route.abort());
  await ready(page);
  await expect(page.locator("#stage-preview .preview-fallback")).toBeVisible();
  await expect(page.locator("#stage-preview .preview-fallback")).toContainText("Preview unavailable");
  await expect(page.locator("#selected-launch")).toHaveAttribute("href", /^https?:\/\//);
});

test("empty catalogs render a useful state rather than a broken application", async ({ page }) => {
  await page.route("**/empty-catalog", (route) => route.fulfill({
    contentType: "text/html",
    body: renderHtml([], { user: "example", generatedAt: "2026-05-04T12:00:00Z", snapshot: true }),
  }));
  await ready(page, "/empty-catalog");
  await expect(page.locator(".stage-empty")).toContainText("New signals coming soon");
  await expect(page.locator("#no-results")).toBeVisible();
  await expect(page.locator("#site-notice")).toBeHidden();
  await expect(page.locator("#surprise")).toBeDisabled();
});

test("large catalogs and long project copy remain searchable at narrow widths", async ({ page }) => {
  const projects = createCatalog(Array.from({ length: 100 }, (_, index) => repo(`project-${index}`)),
    { projects: { "project-99": { title: "A".repeat(180), summary: "A long description. ".repeat(30) } } }, "example");
  await page.route("**/large-catalog", (route) => route.fulfill({
    contentType: "text/html",
    body: renderHtml(projects, { user: "example", generatedAt: "2026-05-04T12:00:00Z", snapshot: true }),
  }));
  await page.setViewportSize({ width: 320, height: 844 });
  await ready(page, "/large-catalog");
  await page.getByRole("searchbox").fill("project-99");
  await expect(page.locator("[data-project-row]:visible")).toHaveCount(1);
  await expect(page.locator("#selected-title")).toHaveText("A".repeat(180));
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("rapid full-motion selections and malformed fragments do not break enhancement", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await ready(page, "/#details-%broken");
  await expect(page.locator("#site-notice")).toContainText("project link is incomplete");
  const names = await page.locator("[data-channel]").evaluateAll((buttons) => buttons.map((button) => button.dataset.channel));
  await page.locator("[data-channel]").evaluateAll((buttons) => {
    buttons[1].click();
    buttons[2].click();
    buttons[3].click();
  });
  await expect(page.locator(`[data-channel="${names[3]}"]`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#selected-details")).toHaveAttribute("data-inspect", names[3]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(errors).toEqual([]);
});

test("the layout stays inside the viewport at narrow, tablet, and desktop widths", async ({ page }) => {
  await ready(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});

test("light and dark themes and the dialog meet automated accessibility checks", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await ready(page, `/?scoutTheme=${theme}`);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
  }
  await page.locator("#selected-details").click();
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
});

test("capture the composed experience for the bounded design review", async ({ page }, testInfo) => {
  test.skip(!process.env.PORTFOLIO_REVIEW_DIR || !["chromium", "mobile"].includes(testInfo.project.name),
    "Visual artifacts are only written when a review directory is requested.");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await ready(page, "/?scoutTheme=light");
  await page.locator("#stage-preview img").evaluate((image) => image.decode());
  const name = testInfo.project.name === "mobile" ? "mobile" : "desktop";
  await page.screenshot({ path: path.join(process.env.PORTFOLIO_REVIEW_DIR, `control-room-${name}.png`) });
  await page.locator("#index-title").evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.screenshot({ path: path.join(process.env.PORTFOLIO_REVIEW_DIR, `project-index-${name}.png`) });
});
