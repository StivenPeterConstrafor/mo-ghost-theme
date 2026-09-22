/*
 * The Dictionary on phones flows in the page (faith-received.css, "the
 * whole fixed shell went"). The port remembered the reader's place in
 * the list on the list pane's own scrollTop; with no pane scrolling, the
 * place is the window's, so it is kept here.
 *
 * Opening an entry (the port adds body.reading) saves the window's
 * position and starts the entry at the top of the dictionary. Closing it
 * puts the reader back where they were in the list.
 */
(function () {
  "use strict";
  const narrow = window.matchMedia("(max-width: 820px)");
  const page = () => document.querySelector(".faith-port-dtc-page");
  let listY = 0;
  let reading = document.body.classList.contains("reading");
  new MutationObserver(() => {
    const now = document.body.classList.contains("reading");
    if (now === reading) return;
    reading = now;
    if (!narrow.matches) return;
    if (now) {
      listY = window.scrollY;
      const el = page();
      const top = el ? el.getBoundingClientRect().top + window.scrollY : 0;
      window.scrollTo(0, Math.max(0, top - 8));
    } else {
      requestAnimationFrame(() => window.scrollTo(0, listY));
    }
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
})();
