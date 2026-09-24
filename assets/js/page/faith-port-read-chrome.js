/*
 * The reader's contents expand, and the toolbar folds away.
 *
 * Ian, 2026-09-23: the dictionary's expand/collapse/shrink functions, for
 * the reader. A first version put three text buttons in a row of their
 * own inside the toolbar; on works without a witness row the toolbar
 * does not wrap, the row sat inline and crushed the title ("the reader
 * is totally messed up"). This version puts each control where it
 * belongs instead of in a row of its own:
 *
 *   Hide / show contents  is the toolbar's own ☰ (#sbT). Nothing added.
 *   Expand contents       a quiet button at the top of the contents
 *       sidebar. It lays the outline over the text: one card per
 *       top-level section with its subsections, or one ruled list for a
 *       flat outline, read across in rows. Choosing an entry clicks the
 *       outline's own link (the port navigates) and the overlay closes.
 *   Hide bar              joins the toolbar's view group (Pages, Find,
 *       Aa, theme). It pins the state the port uses when a reader
 *       scrolls down: masthead and toolbar away, the text takes the
 *       screen. "Show toolbar" stays top right. Remembered per browser.
 *
 * Desktop only (html.g-mobile has the thumb bar). Labels by textContent;
 * outline titles copied as text.
 */
(function () {
  "use strict";

  const html = document.documentElement;
  const app = document.getElementById("app");
  const ph = document.querySelector(".ph");
  const nav = document.getElementById("nav");
  if (!app || !ph || !nav) return;

  const KEY = "fr_read_chrome";
  let barHidden = false;
  try { barHidden = (JSON.parse(window.localStorage.getItem(KEY) || "{}") || {}).bar === true; } catch (e) { /* shown */ }
  const remember = () => {
    try { window.localStorage.setItem(KEY, JSON.stringify({ bar: barHidden })); } catch (e) { /* not remembered */ }
  };

  const mobile = () => html.classList.contains("g-mobile");

  function button(label, cls) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = label;
    return b;
  }

  // ── Where the controls go ────────────────────────────────────────
  const ctr = ph.querySelector(".ctr");
  const sidebar = document.querySelector("aside.sidebar");
  const bBar = button("Hide bar", "fr-tb-focus");
  bBar.title = "Hide the toolbar";
  if (ctr) ctr.appendChild(bBar);
  const bExpand = button("Expand contents", "fr-read-fold");
  bExpand.setAttribute("aria-controls", "fr-read-toc");
  if (sidebar) {
    const actions = document.createElement("div");
    actions.className = "fr-sb-actions";
    actions.appendChild(bExpand);
    const navEl = sidebar.querySelector("#nav");
    if (navEl) navEl.before(actions);
    else sidebar.prepend(actions);
  }

  const restore = button("Show toolbar", "fr-read-restore");
  restore.hidden = true;
  document.body.appendChild(restore);

  // ── Hide toolbar: the port's scrolled-away state, pinned ─────────
  function paintBar() {
    const on = barHidden && !mobile();
    html.classList.toggle("fr-bar-hidden", on);
    restore.hidden = !on;
  }
  bBar.addEventListener("click", () => { barHidden = true; remember(); paintBar(); restore.focus({ preventScroll: true }); });
  restore.addEventListener("click", () => { barHidden = false; remember(); paintBar(); bBar.focus({ preventScroll: true }); });
  paintBar();

  // ── Expand contents: the outline as cards over the text ──────────
  const overlay = document.createElement("div");
  overlay.className = "fr-read-toc";
  overlay.id = "fr-read-toc";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Contents");
  app.appendChild(overlay);

  function depthOf(node) {
    const m = String(node.className).match(/\bnd(\d+)\b/);
    if (m) return Number(m[1]);
    const v = parseInt(node.style.getPropertyValue("--nav-depth"), 10);
    return Number.isFinite(v) ? v + 1 : 1;
  }

  function build() {
    const nodes = Array.from(nav.querySelectorAll(".nav-node"));
    overlay.replaceChildren();
    const head = document.createElement("div");
    head.className = "fr-read-toc-head";
    const h = document.createElement("h2");
    h.textContent = "Contents";
    const close = button("Shrink contents", "fr-read-fold");
    close.addEventListener("click", () => setExpanded(false));
    head.append(h, close);
    overlay.appendChild(head);
    if (!nodes.length) {
      const p = document.createElement("p");
      p.className = "fr-read-toc-empty";
      p.textContent = "This work has no outline yet. Use Pages in the sidebar to move through it.";
      overlay.appendChild(p);
      return;
    }
    const depths = nodes.map(depthOf);
    const top = Math.min(...depths);
    const grid = document.createElement("div");
    grid.className = "fr-read-toc-grid";
    // A flat outline (every entry at one level: Irenaeus's 173 chapters)
    // is a ruled list across the width, as the dictionary's expanded
    // index is, rather than 173 cards of one line each.
    if (depths.every((d) => d === top)) {
      grid.classList.add("fr-read-toc-flat");
      nodes.forEach((node) => {
        const link = node.querySelector("a.nn-t") || node.querySelector("a");
        const title = ((link || node).textContent || "").trim();
        if (!title) return;
        const entry = button(title, "fr-read-toc-entry");
        if (node.classList.contains("on")) entry.classList.add("is-current");
        entry.addEventListener("click", () => { setExpanded(false); (link || node).click(); });
        grid.appendChild(entry);
      });
      overlay.appendChild(grid);
      return;
    }
    let card = null;
    let list = null;
    nodes.forEach((node) => {
      const link = node.querySelector("a.nn-t") || node.querySelector("a");
      const title = ((link || node).textContent || "").trim();
      if (!title) return;
      const d = depthOf(node);
      const entry = button(title, "fr-read-toc-entry");
      if (node.classList.contains("on")) entry.classList.add("is-current");
      entry.addEventListener("click", () => {
        setExpanded(false);
        (link || node).click();
      });
      if (d <= top || !card) {
        card = document.createElement("section");
        card.className = "fr-read-toc-card";
        entry.classList.add("fr-read-toc-title");
        card.appendChild(entry);
        list = null;
        grid.appendChild(card);
      } else {
        if (!list) { list = document.createElement("ul"); card.appendChild(list); }
        const li = document.createElement("li");
        li.style.paddingLeft = `${Math.max(0, d - top - 1) * 14}px`;
        li.appendChild(entry);
        list.appendChild(li);
      }
    });
    overlay.appendChild(grid);
  }

  function setExpanded(on) {
    const want = Boolean(on) && !mobile();
    if (want) build();
    overlay.hidden = !want;
    html.classList.toggle("fr-toc-open", want);
    bExpand.textContent = want ? "Shrink contents" : "Expand contents";
    bExpand.setAttribute("aria-expanded", String(want));
    if (want) {
      const current = overlay.querySelector(".is-current") || overlay.querySelector(".fr-read-toc-entry");
      if (current) current.scrollIntoView({ block: "center" });
    }
  }
  bExpand.addEventListener("click", () => setExpanded(overlay.hidden));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) { setExpanded(false); bExpand.focus({ preventScroll: true }); }
  });
  setExpanded(false);
})();
