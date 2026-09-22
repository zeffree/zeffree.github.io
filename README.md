# zeffree's control room

A native HTML/CSS/JavaScript portfolio for [@zeffree](https://github.com/zeffree)'s
GitHub Pages projects. Select a screen, inspect a real interface preview, and
launch the original project. A searchable project index provides a direct route
around the spatial presentation.

The website has no runtime framework, embedded applications, tracking, or
browser-side GitHub API dependency. Its project links and native details remain
usable without JavaScript.

## Local development

Use Node.js 22 or newer:

```sh
npm ci
npm run build:offline
npm run serve
```

Open http://127.0.0.1:8080. The offline build uses the checked-in `projects.json`
and visibly identifies the page as a **saved catalog preview**.

To refresh the catalog from GitHub:

```sh
npm run build
```

The build writes `index.html` and `projects.json` as local snapshots, then
packages only the public site files into `dist`. **Publish `dist`, not the
repository root.** A failed API request fails the build instead of publishing a
silently stale or empty catalog.

Set `GITHUB_TOKEN` in your process environment if needed to avoid the
unauthenticated API rate limit. Never place a token in the configuration,
generated HTML, or browser JavaScript. Set `GH_USER` to change the GitHub owner.

## How the catalog works

`scripts/build.mjs` discovers public, non-fork repositories with GitHub Pages
enabled, excluding the index repository. `scripts/catalog.mjs` joins those
records with explicit inclusions and exclusions in `portfolio.config.json`;
`scripts/render.mjs` produces the static page. Browser enhancements live in
`assets/portfolio.js`, with pure selection
and filtering functions in `assets/portfolio-state.js`.

`projects.json` remains an array. Its original `name`, `description`, `url`,
`source`, `updated`, and `archived` fields retain their meanings. The presentation
fields `title`, `summary`, `category`, `featured`, `topics`, and `preview` are
additive. `description` remains the GitHub description; a curated `summary` does
not overwrite it.

Explicitly added sites can have `source: null` and `updated: null` when no
repository or activity date is supplied. No source link or activity date is
invented for these entries. `origin` identifies `github` versus `manual` entries,
and `sourcePrivate` marks source links that require repository access.

New projects appear even without presentation metadata. They receive a readable
repository title and a typographic preview rather than a fabricated screenshot.
Removed repositories do not leave phantom featured entries. Archived projects
remain identified as archived.

## Including and excluding projects

Use top-level `exclude` to keep named projects out of both live and offline
builds, even if GitHub discovery returns them again.

Use `additionalProjects` for Azure-hosted apps, other external sites, or an
explicitly requested public demo whose repository is private:

```json
{
  "exclude": ["test-hermes", "myspringboard"],
  "additionalProjects": [
    {
      "name": "t1-demo-station",
      "url": "https://t-onedemo-admin.azurewebsites.net/"
    }
  ],
  "projects": {
    "t1-demo-station": {
      "title": "T1 Demo Station",
      "summary": "Publish and share self-contained HTML demos.",
      "category": "Experiments"
    }
  }
}
```

An additional project's `source`, `updated`, `description`, and `topics` are
optional. Public GitHub metadata is refreshed when the entry matches a public
repository by both name and source URL; this does not require Pages to be
enabled. Otherwise unknown activity stays absent and sorts after dated projects.
Set `sourcePrivate: true` for an explicitly provided private source link.
Private repository metadata is never fetched or copied into the public catalog.

Explicit entries override discovery for the same name rather than appearing
twice. Offline builds reapply the current configuration, so excluded projects and
removed manual entries do not reappear from an older snapshot. Add matching
presentation metadata under `projects` to capture previews with `npm run previews`.

## Curating the opening

Edit `portfolio.config.json`, keyed by the exact repository name:

```json
{
  "projects": {
    "malaysia-macro-explorer": {
      "title": "Malaysia Macro Explorer",
      "summary": "Explore Malaysian economic indicators using DOSM open data.",
      "category": "Data & insights",
      "featured": 1
    }
  }
}
```

Use positive `featured` ranks to curate the opening. Unfeatured projects follow
by repository activity. The index also supports recent and alphabetical
ordering. Categories are derived from the catalog, so adding one does not
require changing the interface.

Use verified project facts only. Missing descriptions are preferable to
invented functionality or outcomes. Presentation metadata does not override
project or source URLs.

## Real preview images

Previews are static, unauthenticated captures of public project interfaces, not
live applications. Each has an explicit capture date, descriptive alt text, and
640/1280-pixel WebP variants. Captured screen contents can become outdated;
project details explain that visitors should open the original for current
information.

Install the capture browser once:

```sh
npx playwright install chromium
```

Then refresh selected previews:

```sh
npm run previews -- malaysia-macro-explorer me3tome5
```

The capture helper uses the current catalog and updates the matching preview
metadata without replacing curated copy. It reports failed captures explicitly.
An installed Edge browser can be used by setting `PLAYWRIGHT_CHANNEL=msedge`.
Preview capture is a maintenance operation, **not part of the daily build**.
Review the generated images before publishing them.

Do not hand-edit generated `index.html`: the next build replaces it. Change the
renderer, stylesheet, metadata, or client modules instead.

## Interaction and accessibility

- Search names, descriptions, summaries, and topics; filter categories and
  change ordering without fetching data.
- Use the channel rail, its arrow controls, or Left/Right/Home/End while a
  channel is focused. `/` focuses search unless you are already typing.
- **Surprise me** selects a different project from the current results. It
  never launches an application or opens a new tab.
- Details use a native dialog where supported, including Escape, focus return,
  and browser Back. Otherwise the native inline details stay usable.
- A URL containing `project=<repository-name>` restores selection.
  `view=details` additionally opens its details. Search/category/order parameters
  are retained, with invalid selections explained visibly.
- Motion follows the operating system, with an additional persisted
  reduced-motion preference. Optional View Transitions have an immediate
  fallback; no animation is required to find or launch a project.
- The shared light/dark theme follows the device. `scoutTheme=light` or
  `scoutTheme=dark` can pin it for previews.

All project/source links keep the existing new-tab behavior and include
accessible new-tab descriptions. The data contains no client-side credentials.

## Verification

```sh
npm test
npx playwright install chromium firefox webkit
npm run test:browser
npm run check:budgets
```

Unit coverage exercises discovery, metadata validation, JSON compatibility,
escaping, empty/large catalogs, filtering, sorting, selection, and URLs.
Browser coverage exercises Chromium, Firefox, WebKit, touch layouts, keyboard
navigation, history/dialogs, reduced motion, no JavaScript, unavailable APIs,
image failures, responsive overflow, and light/dark accessibility.

The browser suite serves the existing generated site on port 4173. Run a build
first. It does not call the GitHub API. Optional review screenshots are written
only when `PORTFOLIO_REVIEW_DIR` points to a chosen directory.

The budget command expects `npm run serve` on port 8080, or accepts
`-- --url http://127.0.0.1:4173/` for another local server. It takes the median of
three fresh mobile browser contexts with 4x CPU slowdown, 150 ms latency, and
4 Mbps downstream throughput. It measures LCP, initial layout shift, local
response bytes, compressed application code, and filter-to-frame latency.

Design budgets are at most 50 KB gzip of first-party JavaScript and 700 KB of
compressed initial-page transfer at the mobile reference viewport. Performance
targets are LCP <= 2.5 seconds, CLS <= 0.1, and responsive interactions below
200 ms on a documented mobile lab profile. Lab measurements are not field INP
or a guarantee for every connection.

## Deployment and refresh

In **Settings -> Pages**, select **GitHub Actions** as the source.
`.github/workflows/build.yml` installs declared tooling, runs the unit checks,
refreshes the catalog, and uploads `dist`. It is configured for pushes to
`main`, manual dispatch, and a daily schedule at 02:00 UTC.

GitHub can disable scheduled workflows after repository inactivity. If that
happens, explicitly re-enable **Build & Deploy** in Actions and verify a
successful run before claiming the catalog refreshes daily. Do not use
artificial keep-alive commits. Merely changing this repository's files does not
re-enable a disabled remote workflow.

The footer distinguishes a refreshed catalog from an offline snapshot.
Repository activity dates describe GitHub repository updates, not publication
dates, preview capture dates, or the freshness of data displayed inside a
linked application.

See `PRODUCT.md` for product constraints and `DESIGN.md` for the implemented
visual system.
