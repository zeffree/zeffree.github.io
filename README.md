# zeffree.github.io

Master index page listing all of [@zeffree](https://github.com/zeffree)'s projects published on GitHub Pages. Auto-refreshes daily via GitHub Actions.

## How it works

`scripts/build.mjs` calls the GitHub REST API for the `zeffree` user, filters to repos with `has_pages: true` (skipping forks and the index repo itself), and renders `index.html` from the result. `projects.json` is also written for machine consumers.

## Local development

```bash
npm run build   # regenerate index.html + projects.json
npm run serve   # serve at http://localhost:8080
```

Set `GITHUB_TOKEN` in the environment to avoid the unauthenticated API rate limit (60/hr).

## Deployment

1. Create a public repo named `zeffree.github.io` on GitHub.
2. Push the contents of this folder to `main`.
3. In repo **Settings → Pages**, set **Source** to `GitHub Actions`.
4. The included workflow (`.github/workflows/build.yml`) builds on push, daily at 02:00 UTC, and on manual dispatch.

## Customizing

- **Username:** edit `GH_USER` in `.github/workflows/build.yml` and the default in `scripts/build.mjs`.
- **Style:** `styles.css`.
- **Filtering / sorting:** `scripts/build.mjs` (`pages` filter and sort).
