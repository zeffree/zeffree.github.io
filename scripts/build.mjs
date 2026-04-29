#!/usr/bin/env node
// Build script: fetches GitHub repos with Pages enabled and renders index.html
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const USER = process.env.GH_USER || "zeffree";
const TOKEN = process.env.GITHUB_TOKEN;

const headers = {
  "User-Agent": "zeffree-pages-index",
  Accept: "application/vnd.github+json",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function fetchAllRepos(user) {
  const out = [];
  for (let page = 1; page < 20; page++) {
    const url = `https://api.github.com/users/${user}/repos?per_page=100&type=owner&sort=updated&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const batch = await res.json();
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

function pagesUrl(repo) {
  if (repo.homepage && /^https?:\/\//.test(repo.homepage) && repo.homepage.includes("github.io")) {
    return repo.homepage;
  }
  return `https://${repo.owner.login}.github.io/${repo.name}/`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function renderCard(r) {
  const url = pagesUrl(r);
  const desc = r.description || "No description provided.";
  const topics = (r.topics || []).slice(0, 5);
  return `
    <article class="card">
      <header>
        <h2><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(r.name)}</a></h2>
        ${r.archived ? '<span class="badge archived">archived</span>' : ""}
      </header>
      <p class="desc">${escapeHtml(desc)}</p>
      ${topics.length ? `<ul class="topics">${topics.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : ""}
      <footer>
        <a class="link" href="${escapeHtml(url)}" target="_blank" rel="noopener">↗ Live site</a>
        <a class="link muted" href="${escapeHtml(r.html_url)}" target="_blank" rel="noopener">Source</a>
        <span class="meta">Updated ${fmtDate(r.updated_at)}</span>
      </footer>
    </article>`;
}

function renderHtml(repos, user, builtAt) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(user)} · Projects</title>
  <meta name="description" content="Index of ${escapeHtml(user)}'s GitHub Pages projects." />
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <main class="wrap">
    <header class="hero">
      <img class="avatar" src="https://github.com/${escapeHtml(user)}.png?size=120" alt="${escapeHtml(user)} avatar" width="80" height="80" />
      <div>
        <h1>${escapeHtml(user)}</h1>
        <p class="tagline">Projects published on GitHub Pages.</p>
        <p class="meta">
          <a href="https://github.com/${escapeHtml(user)}" target="_blank" rel="noopener">github.com/${escapeHtml(user)}</a>
          · ${repos.length} project${repos.length === 1 ? "" : "s"}
        </p>
      </div>
    </header>

    <section class="grid">
      ${repos.map(renderCard).join("\n")}
    </section>

    <footer class="site-foot">
      <span>Built ${builtAt}</span>
      <a href="https://github.com/${escapeHtml(user)}/${escapeHtml(user)}.github.io" target="_blank" rel="noopener">View source</a>
    </footer>
  </main>
</body>
</html>
`;
}

async function main() {
  console.log(`Fetching repos for ${USER}...`);
  const repos = await fetchAllRepos(USER);

  const pages = repos
    .filter(r => r.has_pages && !r.fork && !r.private && r.name !== `${USER}.github.io`)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  console.log(`Found ${pages.length} GitHub Pages projects.`);
  for (const r of pages) console.log(`  - ${r.name}`);

  const html = renderHtml(pages, USER, new Date().toISOString().slice(0, 10));
  await fs.writeFile(path.join(ROOT, "index.html"), html, "utf8");
  await fs.writeFile(
    path.join(ROOT, "projects.json"),
    JSON.stringify(pages.map(r => ({
      name: r.name,
      description: r.description,
      url: pagesUrl(r),
      source: r.html_url,
      updated: r.updated_at,
      archived: r.archived,
    })), null, 2),
    "utf8"
  );
  console.log("Wrote index.html and projects.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
