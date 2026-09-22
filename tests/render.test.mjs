import test from "node:test";
import assert from "node:assert/strict";
import { createCatalog } from "../scripts/catalog.mjs";
import { escapeHtml, renderHtml } from "../scripts/render.mjs";
import { config, records, repo } from "./fixtures.mjs";

const options = { user: "example", generatedAt: "2026-05-04T12:00:00Z" };

test("static output contains the entire portfolio and direct project/source links", () => {
  const projects = createCatalog(records, config, "example");
  const html = renderHtml(projects, options);
  for (const project of projects) {
    assert.ok(html.includes(`id="project-${project.name}"`));
    assert.ok(html.includes(`href="${project.url}"`));
    assert.ok(html.includes(`href="${project.source}"`));
    assert.ok(html.includes(`id="details-${project.name}"`));
  }
  assert.ok(html.includes("<noscript>"));
  assert.ok(html.includes('aria-labelledby="dialog-title"'));
  assert.ok(html.includes('id="selected-launch"'));
  assert.ok(!html.includes("<iframe"));
  assert.equal((html.match(/fetchpriority="high"/g) || []).length, 1);
  assert.ok(!/[ \t]+$/m.test(html), "Generated markup must not contain trailing whitespace.");
});

test("untrusted titles and descriptions cannot break markup or embedded JSON", () => {
  const attack = '</script><script>alert("x")</script><img src=x onerror=alert(1)>';
  const projects = createCatalog([repo("test", { description: attack })],
    { projects: { test: { title: attack, category: '"><svg onload=alert(1)>' } } }, "example");
  const html = renderHtml(projects, options);
  assert.ok(!html.includes("<script>alert"));
  assert.ok(!html.includes("<img src=x"));
  const json = html.match(/<script id="catalog-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(json).projects[0].title, attack);
  assert.ok(html.includes(escapeHtml(attack)));
});

test("empty, archived, and offline states are honest and renderable", () => {
  assert.ok(renderHtml([], options).includes("New signals coming soon."));
  const html = renderHtml(createCatalog([repo("old", { archived: true })], config, "example"), { ...options, snapshot: true });
  assert.ok(html.includes("Saved catalog preview"));
  assert.ok(!html.includes("Catalog refreshed"));
  assert.ok(html.includes("This repository is archived."));
  assert.ok(html.includes("No description yet.") === false);
});

test("theme initialization precedes the application and native static content is present", () => {
  const html = renderHtml(createCatalog(records, config, "example"), options);
  assert.ok(html.indexOf('get("scoutTheme")') < html.indexOf('src="./assets/portfolio.js"'));
  assert.ok(html.includes("--cp-bg: #f7f4ef;"));
  assert.ok(html.includes('html[data-theme="dark"]'));
  assert.ok(html.includes("<details"));
  assert.ok(html.includes("THESIS:"));
});

test("external sites have no invented repository, source link, or activity date", () => {
  const projects = createCatalog([], {
    projects: {}, additionalProjects: [{ name: "station", url: "https://station.example.test/" }],
  }, "example");
  const html = renderHtml(projects, options);
  const article = html.match(/<article class="project-row"[\s\S]*?<\/article>/)[0];
  assert.ok(article.includes("<dt>Website</dt>"));
  assert.ok(!article.includes("<dt>Repository</dt>"));
  assert.ok(!article.includes("Repository activity"));
  assert.ok(!article.includes("<time"));
  assert.ok(!article.includes(">Source"));
  assert.ok(!html.includes('href=""'));
  assert.ok(!html.includes("1970"));
});

test("explicit private source links are clearly identified", () => {
  const projects = createCatalog([], {
    projects: {}, additionalProjects: [{
      name: "concept", url: "https://concept.example.test/",
      source: "https://github.com/example/concept", sourcePrivate: true,
    }],
  }, "example");
  const html = renderHtml(projects, options);
  assert.ok(html.includes("Source (private)"));
  assert.ok(html.includes("View source (private)"));
  assert.ok(html.includes("The source repository is private and requires GitHub access."));
});
