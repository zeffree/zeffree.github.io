export function repo(name, overrides = {}) {
  return {
    name, description: "A useful project.", homepage: null,
    html_url: `https://github.com/example/${name}`,
    owner: { login: "example" }, updated_at: "2026-05-01T12:00:00Z",
    has_pages: true, fork: false, private: false, archived: false, topics: [],
    ...overrides,
  };
}

export const config = {
  projects: {
    atlas: {
      title: "The data atlas", summary: "Explore open economic data.", category: "Data & insights", featured: 1,
      preview: {
        src: "assets/previews/atlas-1280.webp", small: "assets/previews/atlas-640.webp",
        width: 1280, height: 800, alt: "An economic data explorer.", capturedAt: "2026-05-02",
      },
    },
    calculator: {
      title: "M365 cost calculator", summary: "Compare cost scenarios.", category: "Decision tools", featured: 2,
    },
  },
};

export const records = [
  repo("experiment", { description: null, updated_at: "2026-05-03T12:00:00Z" }),
  repo("calculator", { topics: ["m365", "cost"], updated_at: "2026-05-02T12:00:00Z" }),
  repo("atlas"),
];
