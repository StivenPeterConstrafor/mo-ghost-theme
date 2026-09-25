/*
 * The title card at the top of a work, in the library's words.
 *
 * Jake, 2026-09-25, reading Anselm: "note the missing word in the title."
 * The card read "Why God man" while the tab, the top bar, the heading
 * above the text and the whole catalogue read "Why God Became Man".
 *
 * WHERE IT COMES FROM. Nothing is missing. A Patrologia Latina work opens
 * with its own running title as a block of text, and the English lane
 * carries a machine rendering of it, marked as such in the TEI:
 *
 *     <p xml:lang="la">Cur Deus homo</p>
 *     <p corresp="…" xml:lang="en" resp="#machine">Why God man</p>
 *
 * "Cur Deus homo" word for word IS "Why God man". The library's own
 * English title for that work, the one everything else prints, is the
 * idiomatic "Why God Became Man". So the reader was shown two English
 * titles for one work, and the worse of the two was the one set in a box
 * at the top of the page.
 *
 * WHAT THIS DOES. Where the work's title card in the ENGLISH lane is a
 * poorer rendering of the title the library already holds, it prints the
 * library's title instead. Nothing else on the page is touched.
 *
 * THE TEST IS DELIBERATELY NARROW, because a heading is not ours to
 * rewrite. All three must hold:
 *   - it is the first title in the English lane, in the first few rows,
 *     which is where a work's own title block sits and nowhere else;
 *   - every word of it appears in the library's title, in that order;
 *   - it is shorter than the library's title.
 * "Why God man" against "Why God Became Man" passes. "Dedication letter
 * to William" against "Dedicatory Letter to William" does not, and is
 * left exactly as the translator left it, because that is a different
 * wording and not a worse one. A card that says something the title does
 * not say is never touched.
 *
 * The original stays in data-mo-machine-title, so nothing is lost and the
 * next reader of this file can see what was replaced.
 *
 * ON CHANGING A HEADING'S WORDS AT ALL. faith-port-read-headings.js is
 * careful to change none, because the engine finds a heading by its
 * textContent. This is the one card that is safe: it is the work's title
 * block, not a division the outline lists or a passage link resolves to,
 * and its replacement is the very string the rest of the page uses for
 * the same work.
 */
(function () {
  "use strict";

  const reading = document.getElementById("reading");
  if (!reading) return;

  const ROWS = 3; // a work's title block is in the first row or two, never deeper

  const words = (t) => String(t || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  // Every word of `small`, in order, somewhere in `big`.
  const inOrder = (small, big) => {
    let i = 0;
    for (const w of big) if (i < small.length && small[i] === w) i += 1;
    return i === small.length;
  };

  const libraryTitle = () => {
    const el = document.querySelector(".reader-identity h1") || document.querySelector(".work .wt");
    const t = el ? el.textContent.trim() : "";
    return t && t.length < 300 ? t : "";
  };

  function pass() {
    const title = libraryTitle();
    if (!title) return;

    const head = reading.querySelector(".en .fr-hd-title");
    if (!head || head.dataset.moMachineTitle) return;

    const row = head.closest(".row");
    if (!row) return;
    const rows = [...reading.querySelectorAll(".folio > .row")];
    if (rows.indexOf(row) < 0 || rows.indexOf(row) >= ROWS) return;

    const shown = head.textContent.trim();
    if (!shown || shown === title) return;

    const sw = words(shown);
    const tw = words(title);
    if (!sw.length || sw.length >= tw.length || !inOrder(sw, tw)) return;

    head.dataset.moMachineTitle = shown;
    head.textContent = title;
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    window.setTimeout(() => { queued = false; pass(); }, 0);
  };

  if (window.MutationObserver) new MutationObserver(schedule).observe(reading, { childList: true, subtree: true });
  document.addEventListener("fr-folds-stamped", schedule);
  pass();
})();
