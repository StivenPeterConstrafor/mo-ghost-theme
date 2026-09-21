/*
 * On a phone, Reading settings belongs in the dock with the rest.
 *
 * Ian, 2026-09-21: "Aa tool randomly in top left header? Needs to be
 * moved to bottom of the page toolbar."
 *
 * He is describing the last survivor of a toolbar that lost everything
 * else. At 390px the reader head keeps one control, #aaBtn, floating
 * on its own under the work title, while the seven controls a reader
 * actually uses sit in the dock at the bottom of the screen. It reads
 * as something left behind, and it is: Report went to the Aa panel,
 * Modernize went to the Aa panel, Tools went away entirely, and the
 * button that opens that panel stayed where the old bar used to be.
 *
 * So it joins them. The BUTTON moves, not a copy, so there is one
 * element, one handler and one aria-expanded; #aaPop is untouched and
 * still opens where it always did, under the reader head, because its
 * position is set in CSS rather than anchored to this button.
 *
 * It is placed FIRST in the dock rather than appended. The dock now
 * scrolls, so the end of the row is off screen at this width, and a
 * control nobody can see is the problem this is fixing rather than a
 * new home for it.
 */
(function () {
  "use strict";

  const NARROW = 640;
  const btn = document.getElementById("aaBtn");
  if (!btn) return;

  const home = btn.parentElement; // .aaw, in the reader head
  const plain = btn.innerHTML; // the bare "Aa" it wears there
  // The dock's own cell shape: a glyph over a word. Matched so the Aa
  // cell is not the one button in the row with no label under it.
  const dockShape = '<span class="ic" aria-hidden="true">Aa</span><span class="lb">Text</span>';

  function dock() { return document.querySelector("nav.frthumb"); }
  function narrow() { return window.innerWidth <= NARROW; }

  function place() {
    const bar = dock();
    if (narrow() && bar) {
      if (btn.parentElement !== bar) {
        btn.classList.add("frthumb-aa");
        btn.innerHTML = dockShape;
        bar.insertBefore(btn, bar.firstChild);
      }
    } else if (!narrow() && home && btn.parentElement !== home) {
      btn.classList.remove("frthumb-aa");
      btn.innerHTML = plain;
      home.appendChild(btn);
    }
  }

  place();

  /* The dock is built with the work and rebuilt when the reader changes
     lanes, which would leave the button behind in a detached node. */
  const root = document.getElementById("app") || document.body;
  if (window.MutationObserver) {
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => { queued = false; place(); });
    }).observe(root, { childList: true, subtree: true });
  }

  let resizing = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizing);
    resizing = window.setTimeout(place, 150);
  });
})();
