import {
  visibleProjects, readState, reconcileSelection, stepProject, surpriseProject, stateUrl,
} from "./portfolio-state.js";

function initialize() {
  const payload = JSON.parse(document.getElementById("catalog-data").textContent);
  const projects = payload.projects;
  if (!Array.isArray(projects) || projects.some((project) =>
    !project || typeof project.name !== "string" || typeof project.title !== "string" ||
    typeof project.url !== "string" || !Array.isArray(project.topics))) {
    throw new TypeError("The project catalog could not be read.");
  }
  const byName = new Map(projects.map((project) => [project.name, project]));
  const rows = new Map([...document.querySelectorAll("[data-project-row]")].map((row) => [row.dataset.projectRow, row]));
  const channels = new Map([...document.querySelectorAll("[data-channel]")].map((button) => [button.dataset.channel, button]));
  const list = document.getElementById("project-list");
  const track = document.getElementById("channel-track");
  const search = document.getElementById("project-search");
  const sort = document.getElementById("project-sort");
  const main = document.getElementById("stage-preview");
  const wings = [...document.querySelectorAll("[data-wing]")];
  const selectedPanel = document.getElementById("selected-project");
  const stageEmpty = document.querySelector(".stage-empty");
  const notice = document.getElementById("site-notice");
  const dialog = document.getElementById("project-dialog");
  const supportsDialog = typeof dialog.showModal === "function";
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const motionButton = document.querySelector("[data-motion-toggle]");
  let { state, warnings, details: initialDetails } = readState(projects, new URLSearchParams(location.search));
  let motionPreference = "system";
  let activeTransition = null;
  let screenAnimation = null;
  let alignmentFrame = 0;
  let returnFocus = null;
  let renderedProject = main?.dataset.inspect ?? null;

  function announce(message) {
    notice.textContent = message;
    notice.hidden = !message;
  }

  function reducedMotion() {
    return motionQuery.matches || motionPreference === "reduced";
  }

  function applyMotion() {
    const reduced = reducedMotion();
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
    motionButton.setAttribute("aria-pressed", String(reduced));
    motionButton.querySelector("[data-motion-label]").textContent = reduced ? "Motion reduced" : "Reduce motion";
    motionButton.title = motionQuery.matches ? "Following your device's reduced-motion setting" : "Switch between full and reduced motion";
    if (reduced) {
      activeTransition?.skipTransition();
      screenAnimation?.cancel();
    }
  }

  try {
    const saved = localStorage.getItem("zeffree:motion");
    if (saved === "reduced" || saved === "system") motionPreference = saved;
    else if (saved !== null) warnings.push("An old motion preference was reset to follow your device.");
  } catch (error) {
    console.warn("Motion preferences are unavailable in this browser.", error);
    warnings.push("Your browser cannot store preferences. Motion will follow your device for this visit.");
  }

  function failedPreview(image) {
    const media = image.closest("[data-preview]");
    if (!media) return;
    image.hidden = true;
    const fallback = media.querySelector(".preview-fallback");
    fallback.hidden = false;
    fallback.querySelector("strong").textContent ||= "Project preview";
    fallback.querySelector("strong + span").textContent = "Preview unavailable.";
  }

  function checkPreviews(container) {
    container.querySelectorAll("[data-preview] img").forEach((image) => {
      if (image.complete && image.naturalWidth === 0) failedPreview(image);
    });
  }

  document.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement) failedPreview(event.target);
  }, true);

  function updateMedia(screen, project, isMain = false) {
    if (screen.dataset.previewProject === project.name) return;
    const source = rows.get(project.name)?.querySelector(".index-preview .preview-media");
    if (!source) throw new Error(`Missing static preview for ${project.name}.`);
    const media = source.cloneNode(true);
    const image = media.querySelector("img");
    if (image) {
      image.loading = isMain ? "eager" : "lazy";
      image.sizes = isMain ? "(max-width: 700px) 90vw, 62vw" : "(max-width: 700px) 1px, 28vw";
      image.setAttribute("fetchpriority", isMain ? "high" : "low");
    }
    screen.querySelector(".preview-media").replaceWith(media);
    screen.querySelector("[data-screen-title]").textContent = project.title;
    screen.dataset.previewProject = project.name;
    screen.setAttribute("aria-label", `${isMain ? "Inspect" : "Select"} ${project.title}`);
    if (isMain) {
      screen.href = `#details-${project.name}`;
      screen.dataset.inspect = project.name;
    } else {
      screen.dataset.select = project.name;
    }
    checkPreviews(media);
  }

  function orderElements(container, elements) {
    let cursor = container.firstElementChild;
    for (const element of elements) {
      if (element !== cursor) container.insertBefore(element, cursor);
      cursor = element.nextElementSibling;
    }
  }

  function alignChannel() {
    const selected = channels.get(state.selected);
    if (!selected || selected.hidden) return;
    const bounds = track.getBoundingClientRect();
    const target = selected.getBoundingClientRect();
    if (target.left < bounds.left) track.scrollLeft += target.left - bounds.left;
    else if (target.right > bounds.right) track.scrollLeft += target.right - bounds.right;
  }

  function scheduleAlignment() {
    cancelAnimationFrame(alignmentFrame);
    alignmentFrame = requestAnimationFrame(alignChannel);
  }

  function render() {
    const visible = visibleProjects(projects, state);
    const names = new Set(visible.map((project) => project.name));
    const focus = document.activeElement;
    for (const [name, row] of rows) row.hidden = !names.has(name);
    for (const [name, button] of channels) {
      button.hidden = !names.has(name);
      button.setAttribute("aria-pressed", String(name === state.selected));
      button.querySelector(".channel-marker").textContent = name === state.selected ? "\u2713" : "\u2197";
      button.tabIndex = name === state.selected ? 0 : -1;
    }
    orderElements(list, visible.map((project) => rows.get(project.name)));
    orderElements(track, visible.map((project) => channels.get(project.name)));
    visible.forEach((project, index) => {
      const number = String(index + 1).padStart(2, "0");
      channels.get(project.name).querySelector(".channel-id").textContent = number;
      const label = rows.get(project.name).querySelector(".channel-number");
      label.textContent = number;
      label.setAttribute("aria-label", `Channel ${index + 1}`);
    });
    const selected = byName.get(state.selected);
    const position = visible.findIndex((project) => project.name === state.selected);
    if (selected && main) {
      main.hidden = false;
      updateMedia(main, selected, true);
      document.getElementById("selected-title").textContent = selected.title;
      document.getElementById("selected-summary").textContent = selected.summary || "Open the project to find out more.";
      document.getElementById("selected-launch").href = selected.url;
      const detailsLink = document.getElementById("selected-details");
      detailsLink.href = `#details-${selected.name}`;
      detailsLink.dataset.inspect = selected.name;
    } else if (main) main.hidden = true;
    wings.forEach((wing, index) => {
      wing.hidden = visible.length < index + 2;
      if (!wing.hidden) updateMedia(wing, visible[(position + index + 1) % visible.length]);
    });
    selectedPanel.hidden = !selected;
    stageEmpty.hidden = Boolean(selected);
    document.getElementById("stage-position").textContent = visible.length
      ? `Channel ${String(position + 1).padStart(2, "0")} / ${String(visible.length).padStart(2, "0")}`
      : projects.length ? "No matching channels" : "No channels yet";
    document.querySelectorAll("[data-step]").forEach((button) => { button.disabled = visible.length < 2; });
    document.getElementById("surprise").disabled = visible.length < 2;
    document.getElementById("no-results").hidden = visible.length > 0;
    document.getElementById("results-status").textContent = state.query || state.category
      ? `${visible.length} of ${projects.length} projects${state.category ? ` in ${state.category}` : ""}.`
      : `${projects.length} project${projects.length === 1 ? "" : "s"} to explore.`;
    document.getElementById("clear-search").hidden = !state.query;
    document.querySelectorAll("[data-category]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.category === state.category));
      button.querySelector(".filter-check").textContent = button.dataset.category === state.category ? "\u2713" : "";
    });
    sort.value = state.sort;
    scheduleAlignment();
    if (focus instanceof HTMLElement && focus.isConnected && !focus.closest("[hidden]") &&
        document.activeElement !== focus) focus.focus({ preventScroll: true });
  }

  function syncUrl({ details = false, push = false } = {}) {
    const url = stateUrl(location.href, state, { details });
    const historyState = { ...(history.state ?? {}) };
    if (details && push) historyState.portfolioDialog = true;
    else if (!details) delete historyState.portfolioDialog;
    history[push ? "pushState" : "replaceState"](historyState, "", url);
  }

  function commit({ animate = false } = {}) {
    activeTransition?.skipTransition();
    screenAnimation?.cancel();
    const changed = renderedProject !== state.selected;
    const update = () => {
      render();
      renderedProject = state.selected;
    };
    if (animate && changed && !reducedMotion() && document.visibilityState === "visible") {
      if (typeof document.startViewTransition === "function") {
        const transition = document.startViewTransition(update);
        activeTransition = transition;
        transition.ready.catch((error) => {
          if (error.name === "AbortError") return;
          console.warn("Project transition unavailable.", error);
          announce("The animation could not run. You can still explore every project.");
        });
        transition.finished.then(() => {
          if (activeTransition === transition) activeTransition = null;
        }, (error) => {
          console.error("Project transition failed.", error);
          update();
          announce("The animation could not finish. The project view has been restored.");
        });
      } else {
        update();
      }
      if (main && typeof main.animate === "function" && !mobileQuery.matches) {
        screenAnimation = main.animate([
          { transform: "translateZ(-48px) rotateX(7deg)" },
          { transform: "translateZ(0) rotateX(3deg)" },
        ], { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" });
      }
    } else update();
  }

  function change(patch, { animate = false } = {}) {
    announce("");
    state = reconcileSelection(projects, { ...state, ...patch });
    syncUrl();
    commit({ animate });
  }

  function restoreFocus() {
    const target = returnFocus?.isConnected && returnFocus.getClientRects().length &&
      !returnFocus.closest("[hidden]") ? returnFocus : search;
    target.focus({ preventScroll: true });
    returnFocus = null;
  }

  function fillDialog(project) {
    const content = document.getElementById(`details-${project.name}`).querySelector(".detail-content").cloneNode(true);
    content.querySelectorAll("img").forEach((image) => { image.loading = "eager"; });
    document.getElementById("dialog-title").textContent = project.title;
    document.getElementById("dialog-content").replaceChildren(content);
    dialog.scrollTop = 0;
    checkPreviews(content);
  }

  function openDetails(name, opener, { fromHistory = false } = {}) {
    const project = byName.get(name);
    if (!project) {
      announce("That project is no longer available. Choose another from the index.");
      return;
    }
    if (!supportsDialog) {
      const details = document.getElementById(`details-${name}`);
      details.open = true;
      details.scrollIntoView({ block: "start" });
      details.querySelector("summary").focus({ preventScroll: true });
      return;
    }
    if (!dialog.open) returnFocus = opener ?? document.activeElement;
    state = { ...state, selected: name };
    commit();
    fillDialog(project);
    if (!fromHistory) syncUrl({ details: true, push: !dialog.open });
    if (!dialog.open) dialog.showModal();
  }

  function closeDetails() {
    if (history.state?.portfolioDialog) {
      history.back();
    } else {
      dialog.close();
      syncUrl();
      restoreFocus();
    }
  }

  if (main) main.dataset.previewProject = main.dataset.inspect;
  wings.forEach((wing) => { wing.dataset.previewProject = wing.dataset.select; });
  search.value = state.query;
  applyMotion();
  render();

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const inspect = event.target.closest("[data-inspect]");
    if (inspect && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) {
      event.preventDefault();
      openDetails(inspect.dataset.inspect, inspect);
    }
    const select = event.target.closest("[data-select], [data-channel]");
    if (select) change({ selected: select.dataset.select ?? select.dataset.channel }, { animate: true });
    const step = event.target.closest("[data-step]");
    if (step && !step.disabled) {
      change({ selected: stepProject(visibleProjects(projects, state), state.selected, Number(step.dataset.step)) }, { animate: true });
    }
  });

  track.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey ||
        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const visible = visibleProjects(projects, state);
    const name = event.key === "Home" ? visible[0]?.name : event.key === "End" ? visible.at(-1)?.name
      : stepProject(visible, state.selected, event.key === "ArrowLeft" ? -1 : 1);
    if (name) {
      change({ selected: name }, { animate: true });
      channels.get(name).focus({ preventScroll: true });
    }
  });

  search.addEventListener("input", () => { change({ query: search.value }); });
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && search.value) {
      event.preventDefault();
      search.value = "";
      change({ query: "" });
    }
  });
  document.getElementById("clear-search").addEventListener("click", () => {
    search.value = "";
    change({ query: "" });
    search.focus();
  });
  sort.addEventListener("change", () => { change({ sort: sort.value }); });
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => { change({ category: button.dataset.category }, { animate: true }); });
  });
  document.querySelectorAll("[data-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      search.value = "";
      change({ query: "", category: "", sort: "featured" });
      search.focus();
    });
  });
  document.getElementById("surprise").addEventListener("click", () => {
    change({ selected: surpriseProject(visibleProjects(projects, state), state.selected) });
    document.getElementById("control-room").scrollIntoView({ behavior: reducedMotion() ? "instant" : "smooth", block: "start" });
    document.getElementById("selected-title").focus({ preventScroll: true });
  });
  document.addEventListener("keydown", (event) => {
    const typing = event.target instanceof Element &&
      event.target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
    if (event.key === "/" && !typing && !dialog.open && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      search.focus();
      search.select();
    }
  });
  motionButton.addEventListener("click", () => {
    if (motionQuery.matches) {
      announce("Reduced motion follows your device setting. All project controls are still available.");
      return;
    }
    motionPreference = motionPreference === "reduced" ? "system" : "reduced";
    applyMotion();
    try {
      localStorage.setItem("zeffree:motion", motionPreference);
    } catch (error) {
      console.warn("The motion preference could not be saved.", error);
      announce("Motion changed for this visit. Your browser could not save the preference.");
    }
  });
  motionQuery.addEventListener("change", applyMotion);
  mobileQuery.addEventListener("change", () => { screenAnimation?.cancel(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      activeTransition?.skipTransition();
      screenAnimation?.cancel();
    }
  });
  dialog.querySelector(".dialog-close").addEventListener("click", closeDetails);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDetails(); });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) closeDetails();
  });
  window.addEventListener("popstate", () => {
    const restored = readState(projects, new URLSearchParams(location.search));
    state = restored.state;
    search.value = state.query;
    announce(restored.warnings.join(" "));
    commit();
    if (restored.details) openDetails(state.selected, null, { fromHistory: true });
    else if (dialog.open) {
      dialog.close();
      restoreFocus();
    }
  });

  document.querySelectorAll("[data-enhancement], [data-reset], [data-motion-toggle]").forEach((element) => { element.hidden = false; });
  track.setAttribute("role", "toolbar");
  track.setAttribute("aria-label", "Choose a project. Use the left and right arrow keys to change channels.");
  checkPreviews(document);
  announce(warnings.join(" "));
  if (initialDetails) openDetails(state.selected, null, { fromHistory: true });
  if (!initialDetails && location.hash.startsWith("#details-")) {
    try {
      const detail = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (detail instanceof HTMLDetailsElement) detail.open = true;
    } catch (error) {
      if (!(error instanceof URIError)) throw error;
      announce("The project link is incomplete. Use the project index below to find it.");
    }
  }
  scheduleAlignment();
  document.documentElement.dataset.enhanced = "true";
}

try {
  initialize();
} catch (error) {
  console.error("The interactive control room could not start.", error);
  const notice = document.getElementById("site-notice");
  notice.textContent = "The interactive view could not start. All project links and details remain available in the index below.";
  notice.hidden = false;
  document.querySelectorAll("[data-enhancement], [data-motion-toggle], [data-reset], [data-wing]").forEach((element) => { element.hidden = true; });
  document.querySelectorAll("[data-project-row]").forEach((element) => { element.hidden = false; });
}
