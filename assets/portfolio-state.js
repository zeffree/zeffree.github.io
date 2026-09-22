export const SORTS = ["featured", "recent", "alphabetical"];

const byTitle = (a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base", numeric: true });
const searchable = (project) => [
  project.name, project.title, project.summary, project.description, ...project.topics,
].filter(Boolean).join(" ").normalize("NFKC").toLocaleLowerCase("en");

export function compareActivity(a, b) {
  if (a.updated === null && b.updated === null) return 0;
  if (a.updated === null) return 1;
  if (b.updated === null) return -1;
  return Date.parse(b.updated) - Date.parse(a.updated);
}

export function visibleProjects(projects, { query = "", category = "", sort = "featured" } = {}) {
  if (!SORTS.includes(sort)) throw new RangeError(`Unknown project order: ${sort}`);
  const words = query.normalize("NFKC").toLocaleLowerCase("en").trim().split(/\s+/).filter(Boolean);
  return projects
    .filter((project) => (!category || project.category === category) &&
      words.every((word) => searchable(project).includes(word)))
    .sort((a, b) => {
      if (sort === "alphabetical") return byTitle(a, b);
      if (sort === "featured") {
        const rank = (a.featured ?? Infinity) - (b.featured ?? Infinity);
        if (rank && Number.isFinite(rank)) return rank;
        if (a.featured !== null && b.featured === null) return -1;
        if (a.featured === null && b.featured !== null) return 1;
      }
      return compareActivity(a, b) || byTitle(a, b);
    });
}

export function readState(projects, params) {
  const warnings = [];
  let category = params.get("category") ?? "";
  let sort = params.get("sort") ?? "featured";
  let query = params.get("q") ?? "";
  let selected = params.get("project");
  if (category && !projects.some((project) => project.category === category)) {
    warnings.push("That category is not available. Showing all categories.");
    category = "";
  }
  if (!SORTS.includes(sort)) {
    warnings.push("That sort order is not available. Showing featured projects first.");
    sort = "featured";
  }
  if (selected && !projects.some((project) => project.name === selected)) {
    warnings.push("That project is no longer in the catalog. Choose another project below.");
    selected = null;
  }
  if (selected && !visibleProjects(projects, { query, category, sort }).some((p) => p.name === selected)) {
    warnings.push("Filters were cleared to show the linked project.");
    query = "";
    category = "";
  }
  const state = reconcileSelection(projects, { query, category, sort, selected });
  return { state, warnings, details: params.get("view") === "details" && Boolean(selected) };
}

export function reconcileSelection(projects, state) {
  const visible = visibleProjects(projects, state);
  return {
    ...state,
    selected: visible.some((project) => project.name === state.selected)
      ? state.selected
      : visible[0]?.name ?? null,
  };
}

export function stepProject(projects, selected, direction) {
  if (!projects.length) return null;
  const index = projects.findIndex((project) => project.name === selected);
  return projects[(Math.max(index, 0) + direction % projects.length + projects.length) % projects.length].name;
}

export function surpriseProject(projects, selected, random = Math.random) {
  const choices = projects.filter((project) => project.name !== selected);
  if (!choices.length) return projects[0]?.name ?? null;
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))].name;
}

export function stateUrl(currentUrl, state, { details = false } = {}) {
  const url = new URL(currentUrl);
  for (const [key, value] of Object.entries({
    q: state.query || null,
    category: state.category || null,
    sort: state.sort === "featured" ? null : state.sort,
    project: state.selected,
    view: details ? "details" : null,
  })) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  url.hash = "";
  return url;
}
