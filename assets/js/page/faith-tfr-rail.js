/*
 * The Faith Received rail: opening and closing the drawers.
 *
 * Everything the rail links to is in the markup already, so this file
 * only decides what is shown. If it never loads, the rail is still six
 * items and the drawers are simply closed, which is why the toggles are
 * <button hidden>-controlled rather than the markup being empty.
 *
 * A FILE, NOT AN INLINE SCRIPT: the theme's CSP is script-src 'self'
 * with no 'unsafe-inline', so an inline handler is refused by the
 * browser and silently never runs.
 *
 * The drawer opens ALONG the rail rather than dropping over the page.
 * A dropdown would cover the first line of whatever the reader came to
 * look at; a drawer pushes the rail open and leaves the page alone.
 */
(function () {
  "use strict";

  const rail = document.querySelector(".tfr-rail");
  if (!rail) return;

  const toggles = Array.prototype.slice.call(rail.querySelectorAll("[data-tfr-drawer]"));
  if (!toggles.length) return;

  const drawerFor = (name) => rail.querySelector(`[data-tfr-drawer-for="${name}"]`);

  function close(toggle) {
    const d = drawerFor(toggle.dataset.tfrDrawer);
    if (!d) return;
    toggle.setAttribute("aria-expanded", "false");
    d.hidden = true;
    rail.classList.remove("tfr-rail--open");
  }

  function closeAll(except) {
    toggles.forEach((t) => { if (t !== except) close(t); });
  }

  function open(toggle) {
    const d = drawerFor(toggle.dataset.tfrDrawer);
    if (!d) return;
    closeAll(toggle);
    toggle.setAttribute("aria-expanded", "true");
    d.hidden = false;
    rail.classList.add("tfr-rail--open");
  }

  toggles.forEach((t) => {
    t.addEventListener("click", (e) => {
      e.preventDefault();
      if (t.getAttribute("aria-expanded") === "true") { close(t); return; }
      open(t);
    });
  });

  // Escape closes, and returns the focus to the control that opened it,
  // or the reader is left with the caret somewhere they cannot see.
  rail.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const openToggle = toggles.filter((t) => t.getAttribute("aria-expanded") === "true")[0];
    if (!openToggle) return;
    close(openToggle);
    openToggle.focus();
  });

  // A click anywhere else is a decision not to use the drawer.
  document.addEventListener("click", (e) => {
    if (rail.contains(e.target)) return;
    closeAll(null);
  });

  /* Mark where we are, so the rail says which part of the library the
     reader is standing in. Prefix match, because a surface may carry a
     query or a hash. The brand is exempt: every page is under it, and
     marking it on all of them would say nothing. */
  const here = `${window.location.pathname.replace(/\/+$/, "")}/`;
  Array.prototype.slice.call(rail.querySelectorAll("a[href]")).forEach((a) => {
    const href = a.getAttribute("href").split("#")[0].split("?")[0];
    if (!href || href === "/the-faith-received/") return;
    const path = `${href.replace(/\/+$/, "")}/`;
    if (here === path) {
      a.setAttribute("aria-current", "page");
      const group = a.closest(".tfr-rail-group");
      const toggle = group && group.querySelector("[data-tfr-drawer]");
      if (toggle) toggle.classList.add("is-current");
    }
  });
})();
