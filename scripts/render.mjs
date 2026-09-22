import { visibleProjects } from "../assets/portfolio-state.js";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function dateLabel(value) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(value));
}

const externalHint = '<span class="sr-only"> (opens in a new tab)</span>';
const arrow = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const chevron = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
const shuffle = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c5 0 7-12 12-12h3m-4-4 4 4-4 4"/></svg>';

function externalLink(url, label, className = "text-link") {
  return `<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}${externalHint}</a>`;
}

function sourceLink(project, label = "Source", className = "text-link", icon = "") {
  if (!project.source) return "";
  return externalLink(project.source, `${label}${project.sourcePrivate ? " (private)" : ""}${icon ? ` ${icon}` : ""}`, className);
}

function preview(project, { eager = false, sizes = "(max-width: 700px) 90vw, 62vw" } = {}) {
  const image = project.preview;
  return `<span class="preview-media" data-preview>
    ${image ? `<img src="./${escapeHtml(image.src)}" srcset="./${escapeHtml(image.small)} 640w, ./${escapeHtml(image.src)} ${image.width}w" sizes="${sizes}" alt="${escapeHtml(image.alt)}" width="${image.width}" height="${image.height}" loading="${eager ? "eager" : "lazy"}"${eager ? ' fetchpriority="high"' : ""} decoding="async" />` : ""}
    <span class="preview-fallback"${image ? " hidden" : ""}><strong>${escapeHtml(project.title)}</strong><span>${image ? "Preview unavailable." : "No preview available."}</span><span>${project.source ? "Open the project or browse its source below." : "Open the project for the full experience."}</span></span>
  </span>`;
}

function screen(project, className, { main = false } = {}) {
  const tag = main ? "a" : "button";
  const attrs = main
    ? `id="stage-preview" href="#details-${escapeHtml(project.name)}" data-inspect="${escapeHtml(project.name)}" aria-label="Inspect ${escapeHtml(project.title)}"`
    : `type="button" data-wing data-select="${escapeHtml(project.name)}" aria-label="Select ${escapeHtml(project.title)}" hidden`;
  return `<${tag} class="project-screen ${className}" ${attrs}>
    <span class="screen-bar"><span class="screen-indicator" aria-hidden="true"></span><span data-screen-title>${escapeHtml(project.title)}</span><span class="screen-action" aria-hidden="true">${main ? arrow : "+"}</span></span>
    ${preview(project, { eager: main, sizes: main ? "(max-width: 700px) 90vw, 62vw" : "(max-width: 700px) 1px, 28vw" })}
    <span class="screen-caption"><span>Project preview</span><span>${main ? "Take a closer look" : "Tune in"} ${main ? "&#8599;" : "&#8594;"}</span></span>
  </${tag}>`;
}

function detailContent(project) {
  return `<div class="detail-content">
    ${preview(project, { sizes: "(max-width: 700px) 90vw, 880px" })}
    <div class="detail-copy">
      <p class="detail-summary">${escapeHtml(project.summary || "This project has no description yet. Open the project or its source to find out more.")}</p>
      <dl class="project-facts">
        <div><dt>Category</dt><dd>${escapeHtml(project.category)}</dd></div>
        ${project.source ? `<div><dt>Repository</dt><dd>${escapeHtml(project.name)}</dd></div>` : `<div><dt>Website</dt><dd>${escapeHtml(new URL(project.url).hostname)}</dd></div>`}
        ${project.updated ? `<div><dt>${project.source ? "Repository activity" : "Updated"}</dt><dd><time datetime="${escapeHtml(project.updated)}">${dateLabel(project.updated)}</time></dd></div>` : ""}
        ${project.preview ? `<div><dt>Preview captured</dt><dd><time datetime="${project.preview.capturedAt}">${dateLabel(project.preview.capturedAt)}</time></dd></div>` : ""}
      </dl>
      ${project.archived ? '<p class="archive-note">This repository is archived. Its original project and source remain available below.</p>' : ""}
      ${project.preview ? '<p class="preview-note">A snapshot of the interface, not live data. Open the project for its current content.</p>' : ""}
      ${project.sourcePrivate ? '<p class="preview-note">The source repository is private and requires GitHub access.</p>' : ""}
      <div class="detail-actions">${externalLink(project.url, `Launch project ${arrow}`, "button button-primary")}${sourceLink(project, "View source", "button button-outline", arrow)}</div>
    </div>
  </div>`;
}

function projectRow(project, index) {
  return `<article class="project-row" id="project-${escapeHtml(project.name)}" data-project-row="${escapeHtml(project.name)}">
    <span class="channel-number" aria-label="Channel ${index + 1}">${String(index + 1).padStart(2, "0")}</span>
    <a class="index-preview" href="#details-${escapeHtml(project.name)}" data-inspect="${escapeHtml(project.name)}" aria-label="Inspect ${escapeHtml(project.title)}">${preview(project, { sizes: "(max-width: 600px) 128px, 184px" })}</a>
    <div class="project-copy">
      <h3>${externalLink(project.url, escapeHtml(project.title), "project-title")}</h3>
      <p>${escapeHtml(project.summary || "No description yet. Explore the project to find out more.")}</p>
      <div class="project-meta"><span>${escapeHtml(project.category)}</span>${project.archived ? '<span class="archived-badge">Archived</span>' : ""}${project.updated ? `<span>Updated <time datetime="${escapeHtml(project.updated)}">${dateLabel(project.updated)}</time></span>` : ""}</div>
      ${project.topics.length ? `<ul class="topics" aria-label="Topics">${project.topics.slice(0, 5).map((topic) => `<li>${escapeHtml(topic)}</li>`).join("")}</ul>` : ""}
    </div>
    <div class="row-actions">${externalLink(project.url, `Launch ${arrow}`, "button button-outline")}${sourceLink(project)}</div>
    <details class="project-details" id="details-${escapeHtml(project.name)}" data-detail="${escapeHtml(project.name)}">
      <summary data-inspect="${escapeHtml(project.name)}" aria-label="Details about ${escapeHtml(project.title)}"><span>Take a closer look</span><span aria-hidden="true">+</span></summary>
      ${detailContent(project)}
    </details>
  </article>`;
}

const themeTokens = `:root {
  color-scheme: light;
  --cp-bg: #f7f4ef;
  --cp-bg-elevated: #fcfbf8;
  --cp-surface: #ffffff;
  --cp-surface-soft: #f5f5f5;
  --cp-border: #dedede;
  --cp-border-strong: #919191;
  --cp-text: #242424;
  --cp-text-muted: #5c5c5c;
  --cp-text-soft: #6f6f6f;
  --cp-accent: #b11f4b;
  --cp-accent-hover: #9a1a41;
  --cp-accent-soft: rgba(177, 31, 75, 0.08);
  --cp-accent-fg: #ffffff;
  --cp-success: #16a34a;
  --cp-danger: #dc2626;
  --cp-warning: #f59e0b;
  --cp-link: #0078d4;
  --cp-shadow: 0 18px 48px rgba(0, 0, 0, 0.12);
  --cp-overlay: rgba(255, 255, 255, 0.8);
  --cp-panel: rgba(255, 255, 255, 0.86);
  --cp-panel-strong: rgba(255, 255, 255, 0.96);
  --cp-sheen: rgba(255, 255, 255, 0.55);
  --cp-highlight: rgba(177, 31, 75, 0.12);
}
html[data-theme="dark"] {
  color-scheme: dark;
  --cp-bg: #3d3b3a;
  --cp-bg-elevated: #343231;
  --cp-surface: #292929;
  --cp-surface-soft: #2e2e2e;
  --cp-border: #474747;
  --cp-border-strong: #5f5f5f;
  --cp-text: #dedede;
  --cp-text-muted: #919191;
  --cp-text-soft: #b0b0b0;
  --cp-accent: #fd8ea1;
  --cp-accent-hover: #fb7b91;
  --cp-accent-soft: rgba(253, 142, 161, 0.14);
  --cp-accent-fg: #1a1a1a;
  --cp-success: #4ade80;
  --cp-danger: #f87171;
  --cp-warning: #fbbf24;
  --cp-link: #4da6ff;
  --cp-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
  --cp-overlay: rgba(41, 41, 41, 0.88);
  --cp-panel: rgba(41, 41, 41, 0.72);
  --cp-panel-strong: rgba(41, 41, 41, 0.96);
  --cp-sheen: rgba(255, 255, 255, 0.04);
  --cp-highlight: rgba(253, 142, 161, 0.12);
}`;

export function renderHtml(projects, { user, generatedAt, snapshot = false }) {
  const ordered = visibleProjects(projects);
  const selected = ordered[0];
  const categories = [...new Set(ordered.map((project) => project.category))];
  const categoryRank = ["Data & insights", "Decision tools", "AI & adoption", "Experiments"];
  categories.sort((a, b) => {
    const rankA = categoryRank.includes(a) ? categoryRank.indexOf(a) : categoryRank.length;
    const rankB = categoryRank.includes(b) ? categoryRank.indexOf(b) : categoryRank.length;
    return rankA - rankB || a.localeCompare(b);
  });
  const count = projects.length;
  const favicon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><style>:root{--cp-accent:#b11f4b;--cp-accent-fg:#fff}rect{fill:var(--cp-accent)}text{fill:var(--cp-accent-fg)}</style><rect width="40" height="40" rx="10"/><text x="20" y="29" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="31" font-weight="800">z</text></svg>');
  return `<!doctype html>
<!--
THESIS: A portfolio as a working screen wall. Actual projects, not a grid of claims, own the room.
OWN-WORLD: A blue broadcast field, aluminum monitor frames, signal accents, clear native controls; shared Clawpilot color tokens.
STORY: Tune into a project, inspect the real interface, then launch the original work.
FIRST VIEWPORT: A dominant project screen between two angled previews; project title and launch below, named channel rail within reach.
FORM: Broadcast channel wall, grounded direction 7, seed 17ea1523. Focused screen selection with a direct linear index.
-->
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(user)} | The control room</title>
  <meta name="description" content="Explore ${escapeHtml(user)}'s interactive tools, data explorers, and experiments. Tune into a project, take a closer look, and launch it." />
  <meta property="og:title" content="${escapeHtml(user)} | The control room" />
  <meta property="og:description" content="Tools for decisions. Interfaces for ideas. Explore the work." />
  <meta property="og:type" content="website" />
  ${selected?.preview ? `<meta property="og:image" content="https://${escapeHtml(user)}.github.io/${escapeHtml(selected.preview.src)}" /><meta property="og:image:alt" content="${escapeHtml(selected.preview.alt)}" />` : ""}
  <link rel="icon" href="${escapeHtml(favicon)}" />
  <script>
    (() => {
      const param = new URLSearchParams(window.location.search).get("scoutTheme");
      const theme =
        param || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", theme);
    })();
  </script>
  <style>${themeTokens}</style>
  <link rel="stylesheet" href="./styles.css" />
  <script type="module" src="./assets/portfolio.js"></script>
</head>
<body>
  <a class="skip-link" href="#project-index">Skip to project index</a>
  <header class="masthead">
    <a class="brand" href="./" aria-label="${escapeHtml(user)} home"><span class="brand-symbol" aria-hidden="true"><i></i><i></i><i></i></span><span translate="no">${escapeHtml(user)}</span><span class="brand-note">Projects &amp; experiments</span></a>
    <nav class="main-nav" aria-label="Main navigation">
      <button class="motion-toggle" type="button" data-motion-toggle aria-pressed="false" hidden><span class="motion-symbol" aria-hidden="true">&#8779;</span><span data-motion-label>Reduce motion</span></button>
      <a href="#project-index">Project index <span aria-hidden="true">&#8600;</span></a>
      ${externalLink(`https://github.com/${user}`, `GitHub ${arrow}`, "nav-github")}
    </nav>
  </header>
  <main>
    <section class="control-room" id="control-room" aria-labelledby="room-title">
      <div class="room-heading">
        <h1 id="room-title">The control room<span aria-hidden="true">.</span></h1>
        <p>Tools for decisions. Interfaces for ideas.<br /> Pick a project. See what it can do.</p>
      </div>
      <div class="wall-status"><span><span class="status-light" aria-hidden="true"></span><span id="stage-position">${selected ? `Channel 01 / ${String(count).padStart(2, "0")}` : "No channels yet"}</span></span><span>Real projects. Open to explore.</span></div>
      <div class="screen-wall" id="screen-wall">
        <div class="wall-lines" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
        ${selected ? screen(selected, "screen-main", { main: true }) : ""}
        ${ordered[1] ? screen(ordered[1], "screen-left") : ""}
        ${ordered[2] ? screen(ordered[2], "screen-right") : ""}
        <div class="stage-empty"${selected ? " hidden" : ""}><h2>${count ? "Nothing on this channel." : "New signals coming soon."}</h2><p>${count ? "Try another search or clear your filters." : "Published projects will appear here automatically."}</p><button class="button button-light" type="button" data-reset hidden>Clear filters</button></div>
      </div>
      <div class="selected-project" id="selected-project"${selected ? "" : " hidden"}>
        <div class="selected-copy"><h2 id="selected-title" tabindex="-1" aria-live="polite" aria-atomic="true">${escapeHtml(selected?.title)}</h2><p id="selected-summary">${escapeHtml(selected?.summary || "Open the project to find out more.")}</p></div>
        <div class="selected-actions">
          <a class="button button-light" id="selected-launch" href="${escapeHtml(selected?.url || `https://github.com/${user}`)}" target="_blank" rel="noopener">Launch project ${arrow}${externalHint}</a>
          <a class="room-detail-link" id="selected-details" href="#details-${escapeHtml(selected?.name)}" data-inspect="${escapeHtml(selected?.name)}">Take a closer look <span aria-hidden="true">+</span></a>
        </div>
      </div>
      <nav class="channel-rail" aria-label="Project channels" data-enhancement hidden>
        <button class="rail-arrow previous" type="button" data-step="-1" aria-label="Previous project">${chevron}</button>
        <div class="channel-track" id="channel-track">
          ${ordered.map((project, index) => `<button class="channel" type="button" data-channel="${escapeHtml(project.name)}" aria-pressed="${index === 0}"><span class="channel-id">${String(index + 1).padStart(2, "0")}</span><span>${escapeHtml(project.title)}</span><span class="channel-marker" aria-hidden="true">${index === 0 ? "&#10003;" : "&#8599;"}</span></button>`).join("")}
        </div>
        <button class="rail-arrow" type="button" data-step="1" aria-label="Next project">${chevron}</button>
      </nav>
    </section>

    <section class="project-index" id="project-index" aria-labelledby="index-title">
      <div class="index-heading">
        <div><h2 id="index-title">The project index<span aria-hidden="true">.</span></h2><p>Something specific in mind? Start here.</p></div>
        <search class="project-search" data-enhancement hidden><label for="project-search">Find a project <kbd aria-hidden="true">/</kbd></label><div class="search-field"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><input id="project-search" name="q" type="search" placeholder="Try Malaysia or Copilot&#8230;" autocomplete="off" spellcheck="false" /><button type="button" id="clear-search" aria-label="Clear search" hidden>&#215;</button></div></search>
      </div>
      <noscript><p class="static-notice">You're viewing the static edition. Every project, preview, and source link is available below.</p></noscript>
      <p id="site-notice" class="site-notice" role="status" hidden></p>
      <div class="filter-bar" data-enhancement hidden>
        <div class="category-filters" role="group" aria-label="Filter by category"><button type="button" class="category-filter" data-category="" aria-pressed="true"><span class="filter-check" aria-hidden="true">&#10003;</span>All projects</button>${categories.map((category) => `<button type="button" class="category-filter" data-category="${escapeHtml(category)}" aria-pressed="false"><span class="filter-check" aria-hidden="true"></span>${escapeHtml(category)}</button>`).join("")}</div>
        <button class="surprise-button" id="surprise" type="button">${shuffle}<span>Surprise me</span></button>
      </div>
      <div class="index-status"><p id="results-status" role="status" aria-live="polite" aria-atomic="true">${count} project${count === 1 ? "" : "s"} to explore.</p><label class="sort-control" data-enhancement hidden>Order by <select id="project-sort" name="sort" autocomplete="off"><option value="featured">Featured first</option><option value="recent">Recently updated</option><option value="alphabetical">A to Z</option></select></label></div>
      <div class="no-results" id="no-results"${count ? " hidden" : ""}><h3>${count ? "No matching projects." : "The next idea starts here."}</h3><p>${count ? "Try a broader search, or reset the filters to explore everything." : "There are no published projects in this catalog yet."}</p><button class="button button-primary" type="button" data-reset hidden>Reset filters</button></div>
      <div class="project-list" id="project-list"${count > 50 ? " data-large-catalog" : ""}>${ordered.map(projectRow).join("\n")}</div>
    </section>
  </main>

  <footer class="site-footer"><div><a class="footer-brand" href="./">${escapeHtml(user)}</a><p>Always another idea to explore.</p></div><div class="footer-links">${externalLink(`https://github.com/${user}`, `GitHub profile ${arrow}`)}${externalLink(`https://github.com/${user}/${user}.github.io`, `Behind the scenes ${arrow}`)}<a class="text-link" href="./projects.json">Project data ${arrow}</a><span class="catalog-date">${snapshot ? "Saved catalog preview" : `Catalog refreshed ${dateLabel(generatedAt)}`}</span></div></footer>

  <dialog id="project-dialog" aria-labelledby="dialog-title">
    <div class="dialog-header"><h2 id="dialog-title"></h2><button class="dialog-close" type="button" aria-label="Close project details" autofocus>&#215;</button></div>
    <div id="dialog-content"></div>
  </dialog>
  <script id="catalog-data" type="application/json">${safeJson({ projects, generatedAt, snapshot })}</script>
</body>
</html>
`.replace(/[ \t]+$/gm, "");
}
