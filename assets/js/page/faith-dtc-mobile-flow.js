/*
 * Two repairs to the ported Dictionary (dtc.in02.js), kept out of the
 * vendored file so the next port stays diffable.
 *
 * 1. THE BACK BUTTON DID NOTHING. The article bar's "‹ Dictionary" is
 *    rendered as <button class="mb" onclick="closeArt()">. The site CSP
 *    has no 'unsafe-inline', so the handler never runs, and on a phone,
 *    where that button is the way back to the list, the reader was stuck
 *    in the entry. Found 2026-09-22 while fixing the phone layout. The
 *    click is delegated here to the port's global closeArt().
 *
 * 2. THE READER'S PLACE, ON PHONES. Below 820px the dictionary flows in
 *    the page (faith-received.css, "the whole fixed shell went"). The
 *    port kept the reader's place on the list pane's scrollTop; with no
 *    pane scrolling, the place is the window's. Opening an entry saves
 *    it and starts the entry at the top; closing restores it.
 *    Instant, not smooth: the site sets html { scroll-behavior: smooth },
 *    and a smooth restore lost to the port's list repaint, stopping
 *    ~1,100px short.
 */
(function () {
  "use strict";

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest(".artbar .mb");
    if (!b || typeof window.closeArt !== "function") return;
    e.preventDefault();
    window.closeArt();
  });

  const narrow = window.matchMedia("(max-width: 820px)");
  const jump = (y) => window.scrollTo({ top: y, behavior: "instant" });
  let listY = 0;
  let clickY = null;
  // Taken on the click itself, in the capture phase, before the port
  // handles it: the port repaints the list on the way into an entry, the
  // page is briefly shorter, and a position read after that is clamped
  // (2000 came back as 328).
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("#list .hw")) clickY = window.scrollY;
  }, true);
  let reading = document.body.classList.contains("reading");
  new MutationObserver(() => {
    const now = document.body.classList.contains("reading");
    if (now === reading) return;
    reading = now;
    if (!narrow.matches) return;
    if (now) {
      listY = clickY != null ? clickY : window.scrollY;
      clickY = null;
      const el = document.querySelector(".faith-port-dtc-page");
      jump(Math.max(0, (el ? el.getBoundingClientRect().top + window.scrollY : 0) - 8));
    } else {
      // The port repaints the list on close, in its own frame; restore
      // after it, and once more in case the repaint lands late.
      const back = () => jump(listY);
      requestAnimationFrame(() => requestAnimationFrame(back));
      setTimeout(back, 150);
    }
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
})();
