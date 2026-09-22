#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { gzipSync } from "node:zlib";
import fs from "node:fs/promises";

const args = process.argv.slice(2);
let target = "http://127.0.0.1:8080/";
let output;
for (let index = 0; index < args.length; index += 2) {
  if (!args[index + 1]) throw new Error(`Missing value for ${args[index]}.`);
  if (args[index] === "--url") target = args[index + 1];
  else if (args[index] === "--output") output = args[index + 1];
  else throw new Error(`Unknown option: ${args[index]}. Use --url or --output.`);
}
const url = new URL(target);
if (!["http:", "https:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
  throw new Error("Budget measurements must target a locally served build.");
}
url.searchParams.set("scoutTheme", "light");
const browser = await chromium.launch();
const runs = [];
try {
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
      isMobile: true, hasTouch: true, reducedMotion: "no-preference",
    });
    try {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false, latency: 150,
        downloadThroughput: 4 * 1024 * 1024 / 8,
        uploadThroughput: 1024 * 1024 / 8,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.addInitScript(() => {
        window.__portfolioVitals = { lcp: 0, cls: 0 };
        new PerformanceObserver((list) => {
          window.__portfolioVitals.lcp = list.getEntries().at(-1).startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__portfolioVitals.cls += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      const measurements = [];
      page.on("response", (response) => {
        if (new URL(response.url()).origin !== url.origin) return;
        measurements.push((async () => {
          if (!response.ok()) throw new Error(`Resource failed: ${response.status()} ${response.url()}`);
          await response.finished();
          const body = await response.body();
          const sizes = await response.request().sizes();
          return {
            url: response.url(),
            wireBytes: sizes.responseBodySize + sizes.responseHeadersSize,
            applicationJsGzip: response.request().resourceType() === "script" ? gzipSync(body).length : 0,
          };
        })());
      });
      await page.goto(url.href, { waitUntil: "load" });
      await page.waitForSelector('html[data-enhanced="true"]');
      await page.locator("#stage-preview img").evaluate((image) => image.decode());
      await page.waitForTimeout(800);
      const vitals = await page.evaluate(() => window.__portfolioVitals);
      const resources = await Promise.all(measurements);
      const filterFrameMs = await page.evaluate(async () => {
        const catalog = JSON.parse(document.getElementById("catalog-data").textContent);
        const input = document.getElementById("project-search");
        const start = performance.now();
        input.value = catalog.projects[0].name;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await new Promise(requestAnimationFrame);
        return performance.now() - start;
      });
      if (!vitals.lcp) throw new Error("No LCP measurement was observed.");
      runs.push({
        lcpMs: Math.round(vitals.lcp),
        cls: Number(vitals.cls.toFixed(4)),
        filterFrameMs: Math.round(filterFrameMs),
        initialTransferBytes: resources.reduce((sum, entry) => sum + entry.wireBytes, 0),
        applicationJsGzipBytes: resources.reduce((sum, entry) => sum + entry.applicationJsGzip, 0),
      });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
const median = (key) => [...runs].sort((a, b) => a[key] - b[key])[1][key];
const result = {
  profile: "Chromium; 390x844; DPR 2; 4x CPU; 150 ms RTT; 4 Mbps down/1 Mbps up; three fresh contexts",
  note: "Local lab measurements, not field INP. Transfer includes actual response bodies and headers from the local server.",
  runs,
  median: Object.fromEntries(Object.keys(runs[0]).map((key) => [key, median(key)])),
  limits: { lcpMs: 2500, cls: 0.1, filterFrameMs: 200, initialTransferBytes: 700 * 1024, applicationJsGzipBytes: 50 * 1024 },
};
result.passed = Object.entries(result.limits).every(([key, limit]) => result.median[key] <= limit);
const json = JSON.stringify(result, null, 2);
if (output) await fs.writeFile(output, json + "\n");
console.log(json);
if (!result.passed) process.exitCode = 1;
