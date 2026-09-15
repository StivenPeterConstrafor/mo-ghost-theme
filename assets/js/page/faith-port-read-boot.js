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
 *    hides it.
 *
 *    The offset cannot be a constant, but not for the reason first
 *    written here. Our header does NOT wrap: .header-inner is
 *    flex-wrap:nowrap and its height follows .brand-logo. What it does
 *    is STEP at the 640px breakpoint — 61px at or below it, 85px above.
 *    61 is therefore the mobile height, not the desktop one, and it is
 *    the right fallback because it is the one a first paint on a phone
 *    needs. (Corrected from the Mobile agent's measurements.)
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
  /*
   * THE CONTENTS SIDEBAR STARTS OPEN WHERE THERE IS ROOM FOR IT.
   *
   * The template ships #app with `nosb` — closed — which is right on a
   * phone, where the sidebar is a drawer over the text. On a desktop it
   * meant landing on a 276-section work with no contents in sight and a
   * hamburger to discover.
   *
   * The class is dropped rather than styled around. An earlier attempt
   * neutralised the closed state's transform in CSS, which made closed
   * look exactly like open and left the toggle doing nothing visible.
   * The engine owns this class; we only choose its starting value, and
   * only on the first paint, so every later toggle is the reader's.
   */
  function openSidebarOnDesktop() {
    if (window.innerWidth < 1100) return;
    const app = document.getElementById("app");
    if (app) app.classList.remove("nosb");
  }
  // This file runs in the HEAD, so #app does not exist yet and the
  // first attempt found nothing — the sidebar stayed shut and it looked
  // as though the toggle was dead. Run it once the body is parsed.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", openSidebarOnDesktop, { once: true });
  } else {
    openSidebarOnDesktop();
  }

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

  // A resize listener only catches height changes that a resize causes.
  // The header also changes height without one — a webfont swapping in
  // after load, nav content changing — and the site's own
  // boot/header-behaviors.js already watches for exactly that with a
  // ResizeObserver. Caught the two disagreeing in a live document:
  // scroll-padding-top said 85px while --mo-head still said 61, and the
  // toolbar sat 24px inside our nav. Watch the element, not the window.
  const header = document.querySelector("header.site-header, header.site, .site-header");
  if (header && window.ResizeObserver) new ResizeObserver(measure).observe(header);

  // --phh is the READER TOOLBAR's height, and the sidebar and the fixed
  // chrome are positioned from it. The engine sets it once, so a toolbar
  // that wrapped to two lines while the fonts were still loading and then
  // reflowed to one left --phh too tall: the sidebar started below the
  // toolbar's real bottom and the reading text showed through the band
  // between them. Measured from the toolbar itself, and re-measured
  // whenever it changes shape.
  /* Embedded in an iframe — the Ask workspace's source preview opens the
     reader in one. The site masthead and footer are the frame around a
     page, and inside someone else's panel they are neither: Ian saw a
     second Mere Orthodoxy nav bar, hamburger and all, sitting in the
     middle of an Ask answer.

     Marked on <html> rather than tested in CSS because there is no media
     query for "I am in a frame". Set as early as this script runs, so the
     chrome never paints inside the panel. */
  try {
    if (window.self !== window.top) {
      document.documentElement.classList.add("mo-embedded");
    }
  } catch (e) {
    // Cross-origin parent: reading window.top throws, and throwing at all
    // means we are framed. Same conclusion.
    document.documentElement.classList.add("mo-embedded");
  }

  function measurePh() {
    const ph = document.querySelector(".ph");
    if (!ph) return;
    const px = Math.round(ph.getBoundingClientRect().height);
    if (px > 0) document.documentElement.style.setProperty("--phh", `${px}px`);
  }
  measurePh();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", measurePh, { once: true });
  }
  window.addEventListener("load", measurePh, { once: true });
  if (window.ResizeObserver) {
    const ph = document.querySelector(".ph");
    if (ph) new ResizeObserver(measurePh).observe(ph);
    // The toolbar is built by the engine after this script runs, so wait
    // for it to appear before trying to observe it.
    else if (window.MutationObserver) {
      const mo = new MutationObserver(() => {
        const el = document.querySelector(".ph");
        if (!el) return;
        mo.disconnect();
        measurePh();
        new ResizeObserver(measurePh).observe(el);
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    }
  }
})();
