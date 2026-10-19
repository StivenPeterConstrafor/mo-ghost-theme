/*
 * The reader's header on a phone: title, author, volume. Nothing else.
 *
 * Ian, 2026-10-19, on a Patrologia Latina work at 375px: "way too much
 * going on in these header bars". Under the title and the author line the
 * header carried two more full-width rows:
 *   #reader-volumes  ‹ PL 120 · PL 121 · 10 of 75 ▾ · PL 122 ›
 *                    (port/reader-volumes.js, migne())
 *   #reader-notes    Introduced by <notice> (<editor>)
 *                    (port/reader-notes.js, apply())
 * On a phone both move to the top of the Contents drawer, above the
 * outline, which is where a reader goes to find their way around a work.
 * Wider than PHONE they stay in the header, unchanged.
 *
 * Bones, not skin: both rows are still built by the port, which finds
 * them by id and refills them wherever they are (migne() and slot() reuse
 * an existing element), so moving the element moves every later fill
 * with it. The drawer box sits beside #nav, not inside it, because
 * buildNav() empties #nav on every tab change and rebuild.
 */
(function () {
  const PHONE = window.matchMedia("(max-width: 640px)");
  const IDS = ["reader-volumes", "reader-notes"];
  let box = null;

  function drawerBox() {
    if (box && box.isConnected) return box;
    const side = document.querySelector("#app aside.sidebar, aside.sidebar");
    if (!side) return null;
    box = document.createElement("div");
    box.className = "fr-phone-wayfinding";
    const bar = side.querySelector(".contents-toolbar");
    if (bar && bar.parentNode === side) side.insertBefore(box, bar.nextSibling);
    else side.insertBefore(box, side.firstChild);
    return box;
  }

  function header() {
    return document.querySelector("header.fr-reader-head") || document.querySelector("header.ph");
  }

  function place() {
    IDS.forEach((id) => {
      const row = document.getElementById(id);
      if (!row) return;
      if (PHONE.matches) {
        const b = drawerBox();
        if (b && row.parentNode !== b) b.appendChild(row);
      } else if (box && row.parentNode === box) {
        // Back where the port puts it: volumes before the editions row,
        // notes after it.
        const head = header();
        if (!head) return;
        const ed = document.getElementById("reader-editions");
        if (ed && ed.parentNode === head) {
          head.insertBefore(row, id === "reader-volumes" ? ed : ed.nextSibling);
        } else {
          head.appendChild(row);
        }
      }
    });
  }

  // The rows arrive late (volume spine and notices are fetched), so watch
  // the header for them rather than guess a time.
  function watch() {
    const head = header();
    if (!head) return false;
    new MutationObserver(place).observe(head, { childList: true });
    place();
    return true;
  }

  if (!watch()) document.addEventListener("DOMContentLoaded", watch, { once: true });
  if (PHONE.addEventListener) PHONE.addEventListener("change", place);
})();
