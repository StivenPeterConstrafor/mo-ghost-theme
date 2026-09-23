/*
 * The Dictionary's index and top bar fold away.
 *
 * Ian, 2026-09-23: "Make sidebar and top bar expandable and collapsible.
 * When collapsed, article centers." Two buttons in a slim strip above
 * the panes (.dtc-chrome, in the template, outside #art, which the
 * engine rewrites on every article): one folds the article list, the
 * other folds the title bar and the search band. With the list folded
 * the article has the whole width and its column centres in it (the
 * centring is the article's own max-width and auto margins, in
 * faith-port-surfaces.css).
 *
 * The choice is remembered in this browser only (localStorage, a
 * per-reader convenience); if storage is blocked both start open.
 * Wide screens only: on a phone the dictionary already flows as one
 * column (faith-dtc-mobile-flow.js), and the strip is hidden there.
 * A third control expands the index over the article (see below).
 */
(function () {
  "use strict";

  const page = document.querySelector(".faith-port-dtc-page");
  const strip = page && page.querySelector(".dtc-chrome");
  if (!strip) return;
  const KEY = "fr_dtc_chrome";
  const buttons = {
    list: strip.querySelector("[data-dtc-fold='list']"),
    top: strip.querySelector("[data-dtc-fold='top']"),
  };
  const LABEL = {
    list: ["Hide index", "Show index"],
    top: ["Hide search bar", "Show search bar"],
  };

  let state = { list: false, top: false }; // true = folded
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") state = { list: !!saved.list, top: !!saved.top };
  } catch (e) { /* storage blocked: both open */ }

  function paint() {
    page.classList.toggle("dtc-no-list", state.list);
    page.classList.toggle("dtc-no-top", state.top);
    Object.keys(buttons).forEach((k) => {
      const b = buttons[k];
      if (!b) return;
      b.textContent = LABEL[k][state[k] ? 1 : 0];
      b.setAttribute("aria-expanded", String(!state[k]));
    });
  }

  Object.keys(buttons).forEach((k) => {
    const b = buttons[k];
    if (!b) return;
    b.addEventListener("click", () => {
      state[k] = !state[k];
      paint();
      try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* not remembered */ }
    });
  });
  paint();

  /* EXPAND THE INDEX. Ian, 2026-09-23: "a way to expand and shrink the
     TOC to the section where the article is in the middle. That way
     you can get a bigger browsing experience, especially when you click
     a letter." Expanded, the list takes the article's place and its
     headwords run in columns. Picking a letter opens it expanded;
     picking a headword shrinks it back so the article has its room.
     Not remembered: it is a browsing moment, not a setting. */
  const expand = strip.querySelector("[data-dtc-expand]");
  const wide = window.matchMedia("(min-width: 761px)");
  function setWide(on) {
    const want = !!on && wide.matches;
    page.classList.toggle("dtc-wide-list", want);
    if (expand) {
      expand.textContent = want ? "Shrink index" : "Expand index";
      expand.setAttribute("aria-pressed", String(want));
    }
    if (want && state.list) {
      state.list = false;
      paint();
    }
  }
  if (expand) expand.addEventListener("click", () => setWide(!page.classList.contains("dtc-wide-list")));
  const alpha = page.querySelector("#alpha");
  if (alpha) {
    alpha.addEventListener("click", (e) => {
      if (e.target.closest && e.target.closest("button[data-l]")) setWide(true);
    });
  }
  const list = page.querySelector("#list");
  if (list) {
    list.addEventListener("click", (e) => {
      if (e.target.closest && e.target.closest(".hw")) setWide(false);
    });
  }
  // Hiding the index also ends the expanded view.
  if (buttons.list) buttons.list.addEventListener("click", () => { if (state.list) setWide(false); });
  wide.addEventListener("change", () => { if (!wide.matches) setWide(false); });
  setWide(false);

  /* "PICK UP WHERE YOU LEFT OFF": A ROW, EACH WITH AN ×. Ian,
     2026-09-23: "little X's on these to delete them from this bar", then
     "this should be a whole row of works that goes across horizontally."
     The engine's paintResume() drew only the most recent article. It is
     a global the engine calls by name (after the index loads, after an
     article closes), so it is replaced here: the most recent articles
     with a remembered place, newest first, as a row of cards. Each card
     is still a .rz button with data-id, so the engine's own click
     handler on #resume opens it; the × beside it forgets that place in
     the position store (the record the reader and the Research hub read
     too) and the row redraws. Bookmarks are a different store and are
     not touched. Built with textContent; no HTML strings. */
  const resume = page.querySelector("#resume");
  const MAX_RESUME = 6;
  function recentPlaces() {
    const store = window.MOFaithPosition;
    if (!store || typeof store.load !== "function") return [];
    let map = {};
    try { map = store.load() || {}; } catch (e) { return []; }
    return Object.keys(map)
      .filter((k) => k.indexOf("dtc|") === 0 && map[k] && typeof map[k] === "object")
      .map((k) => ({ id: k.slice(4), t: map[k].t || 0 }))
      .sort((p, q) => q.t - p.t);
  }
  function titleOf(id) {
    let idx = [];
    // The engine's index (a top-level `let` in dtc.in02.js).
    try { idx = typeof IDX !== "undefined" && Array.isArray(IDX) ? IDX : []; } catch (e) { idx = []; }
    const row = idx.find((a) => String(a[0]) === String(id));
    return row ? String(row[5] || row[1] || "") : "";
  }
  function paintResumeRow() {
    if (!resume) return;
    const items = recentPlaces().map((p) => ({ id: p.id, title: titleOf(p.id) }))
      .filter((p) => p.title).slice(0, MAX_RESUME);
    resume.replaceChildren();
    if (!items.length) { resume.hidden = true; return; }
    const label = document.createElement("p");
    label.className = "rz-label";
    label.textContent = "Pick up where you left off";
    const row = document.createElement("div");
    row.className = "rz-row";
    items.forEach((it) => {
      const wrap = document.createElement("span");
      wrap.className = "rz-wrap";
      const open = document.createElement("button");
      open.type = "button";
      open.className = "rz";
      open.dataset.id = it.id;
      open.textContent = it.title;
      const x = document.createElement("button");
      x.type = "button";
      x.className = "rz-x";
      x.textContent = "×";
      x.title = "Remove";
      x.setAttribute("aria-label", `Remove ${it.title} from Pick up where you left off`);
      x.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const store = window.MOFaithPosition;
        try { if (store) store.clear("dtc", it.id); } catch (err) { /* nothing to forget */ }
        paintResumeRow();
      });
      wrap.append(open, x);
      row.appendChild(wrap);
    });
    resume.append(label, row);
    resume.hidden = false;
  }
  if (resume && typeof window.paintResume === "function") {
    window.paintResume = paintResumeRow;
    paintResumeRow();
  }

  /* AN × ON EACH ENTRY. Ian, 2026-09-23: "an X at the top right of each
     dictionary entry to close it out." The engine's closeArt() ends the
     reading state (hash, title, list place, resume bar) but, on a wide
     screen, leaves the article standing in the pane: its own close
     button is the phone's back arrow. So after closeArt() the pane gets
     the dictionary's opening text back, from <template id="dtc-welcome">
     in the page (the same partial the pane starts with), cloned, never
     parsed from a string. */
  const art = page.querySelector("#art");
  const welcome = document.getElementById("dtc-welcome");
  function addEntryClose() {
    if (!art) return;
    const inner = art.querySelector(".artscroll > .inner");
    if (!inner || !inner.querySelector(":scope > h1") || inner.querySelector(":scope > .dtc-close")) return;
    const x = document.createElement("button");
    x.type = "button";
    x.className = "dtc-close";
    x.textContent = "×";
    x.title = "Close";
    x.setAttribute("aria-label", "Close this entry");
    x.addEventListener("click", () => {
      if (typeof window.closeArt === "function") window.closeArt();
      if (welcome && welcome.content) art.replaceChildren(welcome.content.cloneNode(true));
      art.classList.remove("scrolled");
    });
    inner.prepend(x);
  }
  if (art) {
    new MutationObserver(addEntryClose).observe(art, { childList: true, subtree: true });
    addEntryClose();
  }
})();
