/*
 * The reader's contents and toolbar fold away, and the contents expand.
 *
 * Ian, 2026-09-23: "Make the same expand/collapse/shrink functions that
 * we did for the dictionary but for the reader." Three controls, in a
 * slim row at the foot of the reader toolbar:
 *
 *   Hide contents / Show contents  The port's own sidebar toggle (#sbT,
 *       setContentsOpen), pressed for the reader, so its focus handling
 *       and its own close-after-navigating rule stay in charge.
 *   Expand contents / Shrink contents  The outline laid out over the
 *       text: one card per top-level section with its subsections under
 *       it, in rows, so a long work can be surveyed at a glance.
 *       Choosing an entry clicks the outline's own link, so the port does
 *       the navigating (shard loading, scroll settling, highlighting), and
 *       the overlay closes. The outline itself is not rearranged: its
 *       rows are flat siblings that the port's folds and scroll-spy
 *       depend on.
 *   Hide toolbar / Show toolbar  The state the port already uses when a
 *       reader scrolls down (masthead and toolbar slide away, the text
 *       takes the screen), pinned. A small "Show toolbar" button stays at
 *       the top while it is hidden. Remembered in this browser.
 *
 * Desktop only: on a phone (html.g-mobile) the thumb bar carries these.
 * The row sits inside .ph, whose height the reader measures into --phh,
 * so the text and the sidebar move down to make room on their own.
 * Every label is set with textContent; outline titles are copied as text.
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

  // ── The row ──────────────────────────────────────────────────────
  const strip = document.createElement("div");
  strip.className = "fr-read-strip";
  const bContents = button("Hide contents", "fr-read-fold");
  const bExpand = button("Expand contents", "fr-read-fold");
  const bBar = button("Hide toolbar", "fr-read-fold");
  bContents.setAttribute("aria-controls", "nav");
  bExpand.setAttribute("aria-controls", "fr-read-toc");
  strip.append(bContents, bExpand, bBar);
  ph.appendChild(strip);

  const restore = button("Show toolbar", "fr-read-restore");
  restore.hidden = true;
  document.body.appendChild(restore);

  // ── Hide contents: the port's own toggle ─────────────────────────
  function paintContents() {
    const closed = app.classList.contains("nosb");
    bContents.textContent = closed ? "Show contents" : "Hide contents";
    bContents.setAttribute("aria-expanded", String(!closed));
  }
  bContents.addEventListener("click", () => {
    const sbT = document.getElementById("sbT");
    if (sbT) sbT.click();
    else app.classList.toggle("nosb");
  });
  new MutationObserver(paintContents).observe(app, { attributes: true, attributeFilter: ["class"] });
  paintContents();

  // ── Hide toolbar: the port's scrolled-away state, pinned ─────────
  function paintBar() {
    const on = barHidden && !mobile();
    html.classList.toggle("fr-bar-hidden", on);
    bBar.textContent = "Hide toolbar";
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
    const top = Math.min(...nodes.map(depthOf));
    const grid = document.createElement("div");
    grid.className = "fr-read-toc-grid";
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
