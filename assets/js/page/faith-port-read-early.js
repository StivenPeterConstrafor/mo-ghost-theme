/*
 * The reader's first paint is its final layout.
 *
 * Ian, 2026-09-23: "Loading needs to happen near instantly and without
 * any jumpiness." Two things moved after the first paint:
 *
 * 1. THE BAND OF CHROME. faith-port-read-boot.js runs in the head,
 *    before the TFR rail exists, so --mo-head first meant the masthead
 *    alone: the toolbar and the page were placed 48px too high and
 *    dropped when the boot script measured again at DOMContentLoaded.
 * 2. THE CONTENTS SIDEBAR. The boot script opens it on a desktop at
 *    DOMContentLoaded, which can come after the browser has already
 *    painted it shut; it slid in a moment after the page appeared.
 *
 * This runs as the first child of #app: the masthead and the rail are
 * parsed and styled, and #app's own tag is open, so both are settled
 * before anything inside the reader is painted. The boot script keeps
 * measuring afterwards (fonts, resizes); this only gets the first frame
 * right. Synchronous on purpose, and tiny.
 */
(function () {
  "use strict";
  const html = document.documentElement;
  const head = document.querySelector("header.site-header, header.site, .site-header");
  const rail = document.querySelector(".tfr-rail");
  const mast = head && head.offsetHeight ? head.offsetHeight : 61;
  const railH = rail && rail.offsetHeight ? rail.offsetHeight : 0;
  html.style.setProperty("--mo-mast", `${mast}px`);
  html.style.setProperty("--mo-head", `${mast + railH}px`);
  if (window.innerWidth >= 1100) {
    const app = document.getElementById("app");
    if (app) app.classList.remove("nosb");
  }
}());
