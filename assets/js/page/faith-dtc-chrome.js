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
  // On a phone the alphabet is a scrolling rail (faith-received.css), and
  // the engine rewrites it on every letter, which would jump the rail
  // back to A. The chosen letter is brought back into view instead.
  if (alpha) {
    new MutationObserver(() => {
      if (wide.matches) return;
      const on = alpha.querySelector("button.on");
      if (!on) return;
      const a = alpha.getBoundingClientRect();
      const b = on.getBoundingClientRect();
      alpha.scrollLeft = Math.max(0, alpha.scrollLeft + (b.left - a.left) - (alpha.clientWidth - b.width) / 2);
    }).observe(alpha, { childList: true });
  }
  /* A SCROLL BAR UNDER THE RAIL. Ian, 2026-09-23: "give it a scroll bar
     at the bottom to indicate visually that it scrolls." Phones hide a
     native scroll bar until a finger is on the rail, and iOS ignores
     scroll-bar styling, so this is drawn: a thin track under the letters
     with a thumb sized to the part in view and moved as the rail
     scrolls. Decorative (aria-hidden); the rail itself is the control.
     Shown only on a phone (faith-received.css). */
  if (alpha) {
    const track = document.createElement("div");
    track.className = "alpha-track";
    track.setAttribute("aria-hidden", "true");
    const thumb = document.createElement("span");
    thumb.className = "alpha-thumb";
    track.appendChild(thumb);
    alpha.after(track);
    const paintTrack = () => {
      const max = alpha.scrollWidth - alpha.clientWidth;
      const w = track.clientWidth;
      if (max <= 0 || !w) { track.hidden = true; return; }
      track.hidden = false;
      const tw = Math.max(28, Math.round(w * (alpha.clientWidth / alpha.scrollWidth)));
      thumb.style.width = `${tw}px`;
      thumb.style.transform = `translateX(${Math.round((w - tw) * (alpha.scrollLeft / max))}px)`;
    };
    alpha.addEventListener("scroll", paintTrack, { passive: true });
    window.addEventListener("resize", paintTrack);
    new MutationObserver(() => requestAnimationFrame(paintTrack)).observe(alpha, { childList: true });
    requestAnimationFrame(paintTrack);
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

  /* THE EXPANDED INDEX IS LAID OUT A LETTER AT A TIME. The list is a
     fixed-height scroll pane; columns set on the pane itself overflowed
     sideways out of sight and the letter headings that spanned them
     collapsed onto the rows (Ian, 2026-09-23: "messy messy messy"). So
     each letter's headwords are gathered into a box of their own
     (.hw-group), which has no height limit, and the columns are set on
     that. The engine redraws the list with innerHTML on every letter,
     search and "Load more", so this regroups after each redraw. Its
     clicks are delegated from #list (closest(".hw")), so a headword
     one box deeper still opens. */
  function groupList() {
    if (!list || list.querySelector(":scope > .hw-group") && !list.querySelector(":scope > .hw")) return;
    let group = null;
    Array.from(list.children).forEach((el) => {
      if (el.classList.contains("hw")) {
        if (!group) {
          group = document.createElement("div");
          group.className = "hw-group";
          el.before(group);
        }
        group.appendChild(el);
      } else if (!el.classList.contains("hw-group")) {
        group = null;
      }
    });
  }
  if (list) {
    new MutationObserver(groupList).observe(list, { childList: true });
    groupList();
  }

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
  // Folded or open, remembered in this browser (Ian, 2026-09-23: "an
  // arrow in the corner that expands and collapses it"). Open by default.
  const RESUME_KEY = "fr_dtc_resume_folded";
  let resumeFolded = false;
  try { resumeFolded = window.localStorage.getItem(RESUME_KEY) === "1"; } catch (e) { /* open */ }
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
    const head = document.createElement("div");
    head.className = "rz-head";
    const label = document.createElement("p");
    label.className = "rz-label";
    label.textContent = "Pick up where you left off";
    const row = document.createElement("div");
    row.className = "rz-row";
    row.id = "rz-row";
    row.hidden = resumeFolded;
    const fold = document.createElement("button");
    fold.type = "button";
    fold.className = "rz-fold";
    fold.setAttribute("aria-controls", "rz-row");
    const paintFold = () => {
      fold.setAttribute("aria-expanded", String(!resumeFolded));
      fold.setAttribute("aria-label", resumeFolded ? "Show recent entries" : "Hide recent entries");
      fold.title = resumeFolded ? "Show" : "Hide";
      resume.classList.toggle("is-folded", resumeFolded);
    };
    fold.addEventListener("click", () => {
      resumeFolded = !resumeFolded;
      row.hidden = resumeFolded;
      paintFold();
      try { window.localStorage.setItem(RESUME_KEY, resumeFolded ? "1" : "0"); } catch (e) { /* not remembered */ }
    });
    paintFold();
    head.append(label, fold);
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
    resume.append(head, row);
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
