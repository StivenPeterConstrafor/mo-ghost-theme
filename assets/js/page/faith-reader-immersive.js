/*
 * Immersive reading: the chrome leaves when you read on, and comes back
 * the moment you look up.
 *
 * Andrew: "I'd like to be immersed in the text just like when I'm
 * reading on kindle... as soon as I start scroll the page should
 * understand I want to read. If I scroll backwards clearly I have
 * stopped reading and so UI features can reappear."
 *
 * That is the whole rule, and it is a rule about INTENT, not distance.
 * Scrolling down is reading; scrolling back is looking for something.
 * So the two directions are deliberately not symmetrical: it takes a
 * deliberate push down to hide the chrome, and the smallest flick up to
 * bring it back. Being wrong in the direction of "show the controls" is
 * cheap; being wrong the other way hides the button someone is reaching
 * for.
 *
 * HOW THE ROOM IS MADE. Not by hiding the bars and leaving a hole. The
 * reader's layout hangs off two custom properties -- --mo-head, our
 * masthead's measured height, and --phh, the reader toolbar's -- which
 * .app turns into padding-top and .ph into its own `top`. Zeroing both
 * (html.fr-immersive, in faith-port-reader-skin.css) makes the text
 * fill the viewport, and the bars slide out over it on a transform.
 * html.mo-embedded already zeroes --mo-head the same way, so this is the
 * layout's own lever rather than a new one bolted on.
 *
 * WHY scrollTop IS ADJUSTED. Growing the reading window upward moves
 * every line up with it, which yanks the text out from under the
 * reader's eye at the exact moment they are reading it. The offset is
 * measured from the container's own box before and after the class
 * flips -- not assumed from the bar heights, which differ between
 * phones, between orientations, and on a wrapped two-line masthead --
 * and given back to scrollTop, so the line you are on does not move.
 *
 * WHAT IT REFUSES TO DO. It will not hide the chrome while a popover,
 * the notebook, or Ask is open: those are anchored to bars that would
 * slide out from under them. It stays out of the way near the top of a
 * work, where the header is part of knowing where you are.
 */
(function () {
  "use strict";

  const root = document.documentElement;
  const IMMERSIVE = "fr-immersive";

  // The reader scrolls an inner element; the document itself does not.
  const scroller = document.getElementById("scroll");
  if (!scroller) return;

  // Far enough in that the title block is behind you. Before that the
  // header is orientation, not clutter.
  const ENGAGE_AFTER = 140;
  // Asymmetric on purpose, see the header.
  const DOWN = 10;
  const UP = 4;

  let last = scroller.scrollTop;
  let armed = 0;
  let ticking = false;

  /* Anything anchored to a bar keeps the bars still. A popover whose
   * toolbar slides out from under it is worse than no immersion. */
  function pinned() {
    if (root.classList.contains("fra-open")) return true; // Ask
    if (document.body.classList.contains("feature-gate-modal-open")) return true;
    const open = document.querySelector(
      "#rdToolsPop, #aaPop, #rdAboutPop, .aapop, .selpop, .bible-pop",
    );
    if (open) {
      const r = open.getBoundingClientRect();
      if (r.height > 0 && getComputedStyle(open).visibility !== "hidden") return true;
    }
    const nb = document.getElementById("notebook");
    if (nb && nb.classList.contains("open")) return true;
    return false;
  }

  function setImmersive(on) {
    if (on === root.classList.contains(IMMERSIVE)) return;

    // Measure, flip, measure. The difference is the exact distance the
    // window's top edge travelled, whatever the bars happen to be.
    const before = scroller.getBoundingClientRect().top;
    root.classList.toggle(IMMERSIVE, on);
    const after = scroller.getBoundingClientRect().top;
    const shift = after - before;
    if (shift) scroller.scrollTop += shift;

    last = scroller.scrollTop;
  }

  function onScroll() {
    const now = scroller.scrollTop;
    const delta = now - last;
    last = now;

    if (pinned()) { setImmersive(false); return; }

    if (delta > 0) {
      if (now < ENGAGE_AFTER) { setImmersive(false); armed = 0; return; }
      armed = armed > 0 ? armed + delta : delta;
      if (armed > DOWN) setImmersive(true);
    } else if (delta < 0) {
      armed = armed < 0 ? armed + delta : delta;
      if (armed < -UP) setImmersive(false);
    }
  }

  scroller.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => { ticking = false; onScroll(); });
  }, { passive: true });

  /* Reaching for something is the same signal as scrolling back. A tap
   * on the text brings the chrome back rather than doing nothing, which
   * is the gesture people try first when a bar they want is missing.
   * Listening for the tap only while immersed, so it never competes
   * with the reader's own selection and popover handling. Not touchend
   * with preventDefault -- that is what once killed the thumb bar's
   * delegated clicks. */
  scroller.addEventListener("click", (e) => {
    if (!root.classList.contains(IMMERSIVE)) return;
    if (e.target.closest("a, button, summary, input, select, [role=button]")) return;
    if (window.getSelection && String(window.getSelection()).length > 2) return;
    setImmersive(false);
  });

  // A keyboard reader never triggered this and should not be trapped by it.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setImmersive(false);
  });

  // Rotating the phone re-measures everything; start from a known state.
  window.addEventListener("orientationchange", () => setImmersive(false));
})();
