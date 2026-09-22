import { compareActivity } from "../assets/portfolio-state.js";

const REPOSITORY_NAME = /^[a-zA-Z0-9_.-]+$/;
const PREVIEW_PATH = /^assets\/previews\/[a-zA-Z0-9_.-]+\.webp$/;

export function httpUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`${label} must be an absolute HTTP(S) URL.`);
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new TypeError(`${label} must be an HTTP(S) URL without credentials.`);
  }
  return url.href;
}

export function pagesUrl(repo, user) {
  if (repo.homepage) {
    const homepage = httpUrl(repo.homepage, `${repo.name} homepage`);
    if (new URL(homepage).hostname.endsWith(".github.io")) return homepage;
  }
  return `https://${user}.github.io/${encodeURIComponent(repo.name)}/`;
}

export function readableName(name) {
  return name.replace(/[-_]+/g, " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase()).trim() || name;
}

function text(value, label, { optional = false } = {}) {
  if (optional && (value === undefined || value === null)) return "";
  if (optional && typeof value === "string" && !value.trim()) return "";
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function previewData(preview, name) {
  if (preview === undefined || preview === null) return null;
  if (typeof preview !== "object" || Array.isArray(preview)) {
    throw new TypeError(`${name} preview must be an object.`);
  }
  for (const key of ["src", "small"]) {
    if (!PREVIEW_PATH.test(preview[key] ?? "")) {
      throw new TypeError(`${name} preview ${key} must be a WebP file in assets/previews.`);
    }
  }
  for (const key of ["width", "height"]) {
    if (!Number.isInteger(preview[key]) || preview[key] <= 0) {
      throw new TypeError(`${name} preview ${key} must be a positive integer.`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preview.capturedAt ?? "") ||
      !Number.isFinite(Date.parse(preview.capturedAt))) {
    throw new TypeError(`${name} preview needs a valid capturedAt date.`);
  }
  return {
    src: preview.src,
    small: preview.small,
    width: preview.width,
    height: preview.height,
    alt: text(preview.alt, `${name} preview alt`),
    capturedAt: preview.capturedAt,
  };
}

export function createCatalog(records, config, user, { snapshot = false } = {}) {
  if (!Array.isArray(records)) throw new TypeError("The project catalog must be an array.");
  if (!config || !config.projects || typeof config.projects !== "object" || Array.isArray(config.projects)) {
    throw new TypeError("portfolio.config.json must contain a projects object.");
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(user)) {
    throw new TypeError("GH_USER must be a valid GitHub username.");
  }
  const exclusions = config.exclude === undefined ? [] : config.exclude;
  const additions = config.additionalProjects === undefined ? [] : config.additionalProjects;
  if (!Array.isArray(exclusions) || exclusions.some((name) => typeof name !== "string" || !REPOSITORY_NAME.test(name))) {
    throw new TypeError("exclude must be an array of project names.");
  }
  if (!Array.isArray(additions)) throw new TypeError("additionalProjects must be an array.");
  const excluded = new Set(exclusions);
  const manualNames = new Set();
  for (const project of additions) {
    if (!project || typeof project !== "object" || Array.isArray(project) ||
        typeof project.name !== "string" || !REPOSITORY_NAME.test(project.name)) {
      throw new TypeError("Every additional project must have a valid name.");
    }
    if (manualNames.has(project.name)) throw new TypeError(`Duplicate additional project: ${project.name}.`);
    manualNames.add(project.name);
  }
  const seen = new Set();
  const entries = records
    .filter((record) => {
      if (!record || typeof record !== "object") throw new TypeError("Invalid project record.");
      return (snapshot || record.has_pages) && !record.fork && !record.private &&
        record.name !== `${user}.github.io` && !excluded.has(record.name) &&
        !manualNames.has(record.name) && record.origin !== "manual";
    })
    .map((record) => ({ record, manual: false }));
  for (const project of additions) {
    if (excluded.has(project.name)) continue;
    const publicRecord = project.source && !project.sourcePrivate
      ? records.find((record) => record.name === project.name &&
        !record.private && !record.fork && !record.sourcePrivate &&
        (snapshot ? record.source : record.html_url) === project.source)
      : undefined;
    entries.push({
      manual: true,
      record: {
        ...project,
        description: project.description ?? publicRecord?.description ?? null,
        updated: project.updated ?? (snapshot ? publicRecord?.updated : publicRecord?.updated_at) ?? null,
        topics: project.topics ?? publicRecord?.topics ?? [],
        archived: project.archived ?? publicRecord?.archived ?? false,
      },
    });
  }
  return entries
    .map(({ record, manual }) => {
      const name = record.name;
      if (typeof name !== "string" || !REPOSITORY_NAME.test(name)) {
        throw new TypeError("Every project must have a valid repository name.");
      }
      if (seen.has(name)) throw new TypeError(`Duplicate project: ${name}.`);
      seen.add(name);
      const curated = Object.hasOwn(config.projects, name) ? config.projects[name] : {};
      if (!curated || typeof curated !== "object" || Array.isArray(curated)) {
        throw new TypeError(`${name} presentation metadata must be an object.`);
      }
      const description = record.description === null || record.description === undefined
        ? null
        : text(record.description, `${name} description`, { optional: true });
      const updated = snapshot || manual ? record.updated : record.updated_at;
      if (!(manual && updated === null) && (typeof updated !== "string" || !Number.isFinite(Date.parse(updated)))) {
        throw new TypeError(`${name} needs a valid repository activity date.`);
      }
      const source = manual && (record.source === undefined || record.source === null)
        ? null
        : httpUrl(snapshot || manual ? record.source : record.html_url, `${name} source URL`);
      const sourcePrivate = manual && record.sourcePrivate !== undefined ? record.sourcePrivate : false;
      if (typeof sourcePrivate !== "boolean" || (sourcePrivate && !source)) {
        throw new TypeError(`${name} sourcePrivate must be a boolean and needs a source URL when true.`);
      }
      const topics = record.topics ?? [];
      if (!Array.isArray(topics) || topics.some((topic) => typeof topic !== "string")) {
        throw new TypeError(`${name} topics must be an array of strings.`);
      }
      if (curated.featured !== undefined &&
          (!Number.isInteger(curated.featured) || curated.featured <= 0)) {
        throw new TypeError(`${name} featured rank must be a positive integer.`);
      }
      return {
        name,
        description,
        url: httpUrl(snapshot || manual ? record.url : pagesUrl(record, user), `${name} project URL`),
        source,
        updated,
        archived: Boolean(record.archived),
        origin: manual ? "manual" : "github",
        sourcePrivate,
        title: curated.title === undefined ? readableName(name) : text(curated.title, `${name} title`),
        summary: curated.summary === undefined ? description ?? "" : text(curated.summary, `${name} summary`),
        category: curated.category === undefined ? "Experiments" : text(curated.category, `${name} category`),
        featured: curated.featured ?? null,
        topics: [...new Set(topics.filter(Boolean))],
        preview: previewData(curated.preview, name),
      };
    })
    .sort((a, b) => compareActivity(a, b) || a.name.localeCompare(b.name));
}
