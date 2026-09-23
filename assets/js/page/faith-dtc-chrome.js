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
})();
