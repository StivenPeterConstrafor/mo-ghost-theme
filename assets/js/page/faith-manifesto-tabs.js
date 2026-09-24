/*
 * The About page's three pieces, one at a time (Ian, 2026-09-24).
 *
 * A tablist over three panels: Stiven's essay (#what), Ian's story
 * (#story), and Jake's letter (#mere-orthodoxy). The address hash opens
 * a panel, so each can be linked to, and choosing one writes the hash
 * back without a jump. Arrow keys, Home and End move between the three
 * buttons, as a tablist should. Without this script the toggle stays
 * hidden and the three panels read one after another.
 */
(function () {
  "use strict";
  const bar = document.querySelector("[data-mf-tabs]");
  if (!bar) return;
  const tabs = [...bar.querySelectorAll("[data-mf-tab]")];
  const panels = [...document.querySelectorAll("[data-mf-panel]")];
  if (!tabs.length || tabs.length !== panels.length) return;
  const ids = tabs.map((t) => t.dataset.mfTab);

  function show(id, focus) {
    if (!ids.includes(id)) id = ids[0];
    tabs.forEach((t) => {
      const on = t.dataset.mfTab === id;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    panels.forEach((p) => { p.hidden = p.id !== id; });
  }

  function fromHash() { return decodeURIComponent((location.hash || "").slice(1)); }

  bar.hidden = false;
  document.documentElement.classList.add("faith-mf-tabbed");
  show(fromHash(), false);

  function choose(id, focus) {
    show(id, focus);
    try { history.replaceState(null, "", `#${id}`); } catch (e) { /* no history */ }
    // Keep the toggle in view: a reader deep in one essay who picks
    // another starts at its top, not partway down the page.
    const top = bar.getBoundingClientRect().top;
    if (top < 0) bar.scrollIntoView({ block: "start" });
  }

  bar.addEventListener("click", (e) => {
    const t = e.target.closest("[data-mf-tab]");
    if (t) choose(t.dataset.mfTab, false);
  });
  bar.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = tabs.length - 1;
    if (n < 0) return;
    e.preventDefault();
    choose(tabs[n].dataset.mfTab, true);
  });
  // A link inside a panel to another panel ("the introductory essay").
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-mf-tab-link]");
    if (!a) return;
    const id = (a.getAttribute("href") || "").slice(1);
    if (!ids.includes(id)) return;
    e.preventDefault();
    choose(id, false);
    bar.scrollIntoView({ block: "start" });
  });
  window.addEventListener("hashchange", () => show(fromHash(), false));
}());
