/*
 * The ported reader, booted inside Mere Orthodoxy's shell.
 *
 * WHY THIS FILE EXISTS. The reader used to be a whole document of its
 * own: its own <html>, its own <head>, its own masthead, and a bridge
 * bar whose entire job was to link back to mereorthodoxy.com. It read as
 * a different site because it WAS one (Ian, 2026-09-14: "the problem
 * with this is that it takes you out of the Mere O site"). The template
 * now extends `default`, so Ghost owns <html> and <body> and our nav and
 * footer wrap the reader. Two things the engine used to get from its own
 * document have to be supplied here instead.
 *
 * 1. THE FAMILY IDENTITY. reader-core.js reads, in order, ?site= then
 *    window.__FR_SITE__ then <html data-site>. The <html> tag is Ghost's
 *    now, so the middle hook is the one left to us. It is the engine's
 *    own supported path, not a workaround. This must run BEFORE
 *    reader-core.js, which is why the template loads it first in the
 *    head.
 *
 * 2. THE HEIGHT OF OUR MASTHEAD. Both headers are position:fixed at
 *    top:0 — ours at z-index 20, the reader's toolbar at 40 — so without
 *    an offset the reader's toolbar sits on top of the site nav and
 *    hides it. The offset cannot be a constant: our header is 61px on a
 *    desktop and taller when it wraps. So it is measured and published
 *    as --mo-head, and the stylesheet positions the toolbar against it.
 *
 * It is a page script, so per this theme's script-order rule it runs
 * before site.min.js and must not depend on any site-bundle global. It
 * reads the DOM and nothing else.
 */
(function () {
  "use strict";

  // Before anything the engine does: it is consumed at reader-core's
  // first statement and a later assignment would be ignored.
  window.__FR_SITE__ = "faith-received";

  const FALLBACK = 61;

  function measure() {
    const h = document.querySelector("header.site-header, header.site, .site-header");
    // offsetHeight, not the rect: a header mid-transition reports a
    // fractional height and the toolbar lands a pixel into the nav.
    const px = h && h.offsetHeight ? h.offsetHeight : FALLBACK;
    document.documentElement.style.setProperty("--mo-head", `${px}px`);
  }

  // Published before first paint so the toolbar is never briefly over
  // the nav, then again once the header's own fonts and layout settle.
  measure();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", measure, { once: true });
  }
  window.addEventListener("load", measure, { once: true });

  let t = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(t);
    t = window.setTimeout(measure, 120);
  });
})();
