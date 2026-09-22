import test from "node:test";
import assert from "node:assert/strict";
import { createCatalog, httpUrl, pagesUrl } from "../scripts/catalog.mjs";
import { config, records, repo } from "./fixtures.mjs";

test("discovers eligible projects and preserves the legacy JSON contract", () => {
  const catalog = createCatalog([
    ...records, repo("private", { private: true }), repo("fork", { fork: true }),
    repo("no-pages", { has_pages: false }), repo("example.github.io"),
  ], config, "example");
  assert.deepEqual(catalog.map((project) => project.name), ["experiment", "calculator", "atlas"]);
  const project = catalog.find((p) => p.name === "atlas");
  assert.equal(project.description, "A useful project.");
  assert.equal(project.updated, "2026-05-01T12:00:00Z");
  assert.equal(project.url, "https://example.github.io/atlas/");
  assert.equal(project.source, "https://github.com/example/atlas");
  assert.equal(project.archived, false);
  assert.equal(project.title, "The data atlas");
  assert.equal(project.featured, 1);
});

test("new and incomplete projects remain usable without curation", () => {
  const catalog = createCatalog([repo("a-new-project", { description: "", topics: [], archived: true })], config, "example");
  assert.equal(catalog[0].title, "A New Project");
  assert.equal(catalog[0].summary, "");
  assert.equal(catalog[0].preview, null);
  assert.equal(catalog[0].archived, true);
});

test("repository names cannot accidentally inherit presentation metadata", () => {
  const catalog = createCatalog(["constructor", "__proto__", "toString", "_"].map((name) => repo(name)),
    { projects: {} }, "example");
  assert.equal(catalog.length, 4);
  for (const project of catalog) {
    assert.ok(project.title.trim());
    assert.equal(project.featured, null);
    assert.equal(project.preview, null);
  }
});

test("snapshot normalization is idempotent and preserves topics", () => {
  const live = createCatalog(records, config, "example");
  assert.deepEqual(createCatalog(live, config, "example", { snapshot: true }), live);
  assert.deepEqual(live.find((p) => p.name === "calculator").topics, ["m365", "cost"]);
});

test("explicit exclusions survive both discovery and older offline snapshots", () => {
  const excludedConfig = { ...config, exclude: ["experiment", "atlas"] };
  const oldSnapshot = createCatalog(records, config, "example");
  assert.deepEqual(createCatalog(records, excludedConfig, "example").map((p) => p.name), ["calculator"]);
  assert.deepEqual(createCatalog(oldSnapshot, excludedConfig, "example", { snapshot: true }).map((p) => p.name), ["calculator"]);
});

test("additional sites use real public metadata without requiring Pages", () => {
  const input = [repo("azure-app", { has_pages: false, topics: ["ai"] })];
  const options = {
    projects: {},
    additionalProjects: [
      { name: "azure-app", url: "https://example.azurewebsites.net/", source: input[0].html_url },
      { name: "external", url: "https://external.example.test/" },
    ],
  };
  const result = createCatalog(input, options, "example");
  assert.equal(result.length, 2);
  assert.equal(result[0].url, "https://example.azurewebsites.net/");
  assert.equal(result[0].updated, input[0].updated_at);
  assert.equal(result[0].description, input[0].description);
  assert.deepEqual(result[0].topics, ["ai"]);
  assert.equal(result[1].source, null);
  assert.equal(result[1].updated, null);
  assert.deepEqual(createCatalog(result, options, "example", { snapshot: true }), result);
});

test("explicit private source links never copy private repository metadata", () => {
  const options = {
    projects: {},
    additionalProjects: [{
      name: "private-demo", url: "https://example.github.io/private-demo/",
      source: "https://github.com/example/private-demo", sourcePrivate: true,
    }],
  };
  const result = createCatalog([repo("private-demo", {
    private: true, description: "Private internal information", topics: ["private-topic"],
  })], options, "example");
  assert.equal(result.length, 1);
  assert.equal(result[0].sourcePrivate, true);
  assert.equal(result[0].description, null);
  assert.equal(result[0].updated, null);
  assert.deepEqual(result[0].topics, []);
  assert.ok(!JSON.stringify(result).includes("Private internal information"));
  assert.deepEqual(createCatalog(result, options, "example", { snapshot: true }), result);
});

test("manual entries override discovery once and disappear when removed from config", () => {
  const options = {
    ...config,
    additionalProjects: [{ name: "atlas", url: "https://atlas.example.test/", source: records[2].html_url }],
  };
  const result = createCatalog(records, options, "example");
  assert.equal(result.filter((p) => p.name === "atlas").length, 1);
  assert.equal(result.find((p) => p.name === "atlas").url, "https://atlas.example.test/");
  assert.deepEqual(createCatalog(result, options, "example", { snapshot: true }), result);
  const withoutManual = createCatalog(result, config, "example", { snapshot: true });
  assert.ok(!withoutManual.some((p) => p.name === "atlas"));
  assert.ok(!createCatalog(records, { ...options, exclude: ["atlas"] }, "example").some((p) => p.name === "atlas"));
});

test("invalid inclusion configuration fails explicitly", () => {
  assert.throws(() => createCatalog(records, { ...config, exclude: "atlas" }, "example"), /exclude/);
  assert.throws(() => createCatalog(records, { ...config, additionalProjects: null }, "example"), /additionalProjects/);
  const entry = { name: "external", url: "https://external.example.test/" };
  assert.throws(() => createCatalog(records, { ...config, additionalProjects: [entry, entry] }, "example"), /Duplicate additional/);
  assert.throws(() => createCatalog([], { projects: {}, additionalProjects: [{ ...entry, url: "javascript:alert(1)" }] }, "example"), /HTTP/);
  assert.throws(() => createCatalog([], { projects: {}, additionalProjects: [{ ...entry, sourcePrivate: true }] }, "example"), /sourcePrivate/);
});

test("removed featured projects do not create phantom records", () => {
  const result = createCatalog([repo("another")], config, "example");
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "another");
});

test("valid Pages homepages are preserved, including custom paths", () => {
  assert.equal(pagesUrl(repo("atlas", { homepage: "https://example.github.io/a-different-path/" }), "example"),
    "https://example.github.io/a-different-path/");
  assert.equal(pagesUrl(repo("atlas", { homepage: "https://github.io.unrelated.test/" }), "example"),
    "https://example.github.io/atlas/");
});

test("unsafe URLs and invalid metadata fail explicitly", () => {
  assert.throws(() => httpUrl("javascript:alert(1)", "Project"), /HTTP/);
  assert.throws(() => httpUrl("https://user:password@example.test/", "Project"), /credentials/);
  assert.throws(() => createCatalog(records, { projects: null }, "example"), /projects object/);
  assert.throws(() => createCatalog([repo("a"), repo("a")], config, "example"), /Duplicate/);
  assert.throws(() => createCatalog([repo("a", { updated_at: "unknown" })], config, "example"), /activity date/);
  assert.throws(() => createCatalog([repo("a", { topics: "invalid" })], config, "example"), /topics/);
  assert.throws(() => createCatalog([repo("a")], { projects: { a: { featured: -1 } } }, "example"), /featured/);
  assert.throws(() => createCatalog([repo("atlas")], {
    projects: { atlas: { ...config.projects.atlas, preview: { ...config.projects.atlas.preview, src: "../private.webp" } } },
  }, "example"), /preview src/);
});

test("empty and large catalogs are supported without an artificial display cap", () => {
  assert.deepEqual(createCatalog([], config, "example"), []);
  assert.equal(createCatalog(Array.from({ length: 100 }, (_, index) => repo(`project-${index}`)), config, "example").length, 100);
});
