import test from "node:test";
import assert from "node:assert/strict";
import { createCatalog } from "../scripts/catalog.mjs";
import { visibleProjects, readState, reconcileSelection, stepProject, surpriseProject, stateUrl } from "../assets/portfolio-state.js";
import { config, records } from "./fixtures.mjs";

const projects = createCatalog(records, config, "example");

test("featured, recent, and alphabetical orders do not mutate the catalog", () => {
  const original = projects.map((p) => p.name);
  assert.deepEqual(visibleProjects(projects).map((p) => p.name), ["atlas", "calculator", "experiment"]);
  assert.deepEqual(visibleProjects(projects, { sort: "recent" }).map((p) => p.name), original);
  assert.deepEqual(visibleProjects(projects, { sort: "alphabetical" }).map((p) => p.name), ["experiment", "calculator", "atlas"]);
  assert.deepEqual(projects.map((p) => p.name), original);
  assert.throws(() => visibleProjects(projects, { sort: "unexpected" }), /Unknown project order/);
});

test("search combines normalized words, topics, and categories", () => {
  assert.deepEqual(visibleProjects(projects, { query: "  Ｍ３６５   cost " }).map((p) => p.name), ["calculator"]);
  assert.equal(visibleProjects(projects, { query: "economIC", category: "Data & insights" })[0].name, "atlas");
  assert.equal(visibleProjects(projects, { query: "unknown" }).length, 0);
});

test("projects with unknown activity sort after dated projects without invalid dates", () => {
  const external = { ...projects[0], name: "external", title: "A station", updated: null, source: null, featured: null };
  const mixed = [external, ...projects];
  assert.equal(visibleProjects(mixed, { sort: "recent" }).at(-1).name, "external");
  assert.equal(visibleProjects(mixed, { sort: "featured" }).at(-1).name, "external");
  assert.equal(visibleProjects(mixed, { sort: "alphabetical" })[0].name, "external");
});

test("filtering retains a valid selection or chooses a visible replacement", () => {
  const state = { query: "", category: "", sort: "featured", selected: "atlas" };
  assert.equal(reconcileSelection(projects, { ...state, query: "cost" }).selected, "calculator");
  assert.equal(reconcileSelection(projects, { ...state, query: "not-present" }).selected, null);
  assert.equal(reconcileSelection(projects, state).selected, "atlas");
});

test("step and surprise actions handle wrapping, one project, and no projects", () => {
  const ordered = visibleProjects(projects);
  assert.equal(stepProject(ordered, "atlas", -1), "experiment");
  assert.equal(stepProject(ordered, "experiment", 1), "atlas");
  assert.equal(surpriseProject(ordered, "atlas", () => 0), "calculator");
  assert.equal(surpriseProject(ordered, "atlas", () => .99), "experiment");
  assert.equal(surpriseProject([ordered[0]], "atlas"), "atlas");
  assert.equal(surpriseProject([], null), null);
  assert.equal(stepProject([], null, 1), null);
});

test("shareable URLs preserve theme parameters and report invalid input", () => {
  const { state, warnings, details } = readState(projects, new URLSearchParams("project=atlas&category=Decision+tools&q=cost&view=details"));
  assert.equal(state.selected, "atlas");
  assert.equal(state.query, "");
  assert.equal(state.category, "");
  assert.equal(details, true);
  assert.equal(warnings.length, 1);
  const url = stateUrl("https://example.github.io/?scoutTheme=dark#old", state, { details: true });
  assert.equal(url.searchParams.get("scoutTheme"), "dark");
  assert.equal(url.searchParams.get("view"), "details");
  assert.equal(url.searchParams.get("project"), "atlas");
  assert.equal(url.hash, "");
});

test("a missing deep-linked project never opens an unrelated dialog", () => {
  const result = readState(projects, new URLSearchParams("project=removed&view=details&category=absent&sort=unknown"));
  assert.equal(result.details, false);
  assert.equal(result.warnings.length, 3);
  assert.equal(result.state.selected, "atlas");
  assert.equal(readState([], new URLSearchParams()).state.selected, null);
});
