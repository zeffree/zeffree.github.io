#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCatalog } from "./catalog.mjs";
import { renderHtml } from "./render.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USER = process.env.GH_USER || "zeffree";

async function fetchAllRepos(user) {
  const headers = {
    "User-Agent": "zeffree-pages-index",
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const repos = [];
  for (let page = 1; ; page++) {
    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&type=owner&sort=updated&page=${page}`,
      { headers, signal: AbortSignal.timeout(30_000) },
    );
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}. Check GITHUB_TOKEN or retry later; the catalog was not replaced.`);
    }
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new TypeError("GitHub returned an invalid repository list.");
    repos.push(...batch);
    if (batch.length < 100) return repos;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--offline")) {
    throw new Error("Usage: node scripts/build.mjs [--offline]");
  }
  const snapshot = args.includes("--offline");
  const config = JSON.parse(await fs.readFile(path.join(ROOT, "portfolio.config.json"), "utf8"));
  console.log(snapshot ? "Building from the saved catalog (offline)." : `Fetching public Pages projects for ${USER}...`);
  const records = snapshot
    ? JSON.parse(await fs.readFile(path.join(ROOT, "projects.json"), "utf8"))
    : await fetchAllRepos(USER);
  const projects = createCatalog(records, config, USER, { snapshot });
  for (const project of projects) {
    if (!project.preview) continue;
    for (const asset of [project.preview.src, project.preview.small]) {
      await fs.access(path.join(ROOT, ...asset.split("/")));
    }
  }
  const generatedAt = new Date().toISOString();
  const html = renderHtml(projects, { user: USER, generatedAt, snapshot });
  const json = JSON.stringify(projects, null, 2) + "\n";
  const dist = path.join(ROOT, "dist");
  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });
  await fs.cp(path.join(ROOT, "assets"), path.join(dist, "assets"), { recursive: true });
  await fs.copyFile(path.join(ROOT, "styles.css"), path.join(dist, "styles.css"));
  await Promise.all([
    fs.writeFile(path.join(dist, "index.html"), html, "utf8"),
    fs.writeFile(path.join(dist, "projects.json"), json, "utf8"),
  ]);
  await Promise.all([
    fs.writeFile(path.join(ROOT, "index.html"), html, "utf8"),
    fs.writeFile(path.join(ROOT, "projects.json"), json, "utf8"),
  ]);
  console.log(`Built ${projects.length} projects. Static deployment files are in dist.`);
}

main().catch((error) => {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
});
