/*
 * Bookmark a work in The Faith Received — the reader's own Save button.
 *
 * The store moved to assets/js/lib/faith-work-bookmarks.js on
 * 2026-09-10, when three surfaces started writing the same bookmark:
 * this button, the Bookmark button at the foot of every section, and
 * the rows on the browse, author, room and century pages. Read that
 * file for where bookmarks actually live and what the id means. What is
 * left here is the binding: one button, in the reader's text tools.
 *
 * It repaints from the store rather than from its own memory, so a
 * reader who bookmarks a section (which saves the work) sees this
 * button turn on without touching it. That is the whole reason the two
 * are not separate records.
 */
(function () {
  const host = document.querySelector("[data-faith-controls]");
  const content = document.querySelector("[data-fr-content]");
  if (!host || !content) return;

  const BM = window.MOFaithBookmarks;

  let slug = "";
  let corpusId = "tfr";
  try {
    const q = new URLSearchParams(window.location.search);
    slug = (q.get("w") || "").replace(/[^a-z0-9_-]/gi, "");
    corpusId = (q.get("c") || "tfr").replace(/[^a-z0-9_-]/gi, "");
  } catch (_) { /* no query */ }
  if (!slug) return;

  const id = BM ? BM.idFor(corpusId, slug) : "";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "faith-tool faith-bookmark";
  btn.setAttribute("aria-pressed", "false");
  const label = document.createElement("span");
  label.className = "faith-toggle-label";
  label.textContent = "Save";
  btn.appendChild(label);

  const state = { on: false, busy: false };

  function paint() {
    btn.setAttribute("aria-pressed", state.on ? "true" : "false");
    label.textContent = state.on ? "Saved" : "Save";
    btn.title = state.on
      ? "Remove this work from your dashboard"
      : "Save this work to your dashboard";
  }

  // Not a member: the button still shows, because hiding it hides the
  // feature. It goes to the membership page rather than failing.
  if (!BM || !id || !BM.available()) {
    btn.addEventListener("click", () => {
      // eslint-disable-next-line no-restricted-syntax -- same-origin path literal
      window.location.href = "/membership/";
    });
    paint();
    host.appendChild(btn);
    return;
  }

  BM.ready()
    .then(() => { state.on = BM.has(id) === true; paint(); })
    .catch(() => { /* silent; the button starts unsaved */ });

  // Somebody else saved this work — the section Bookmark button is the
  // one that does it. Follow, rather than sitting there reading "Save"
  // for a work that now is.
  BM.subscribe((changed, on) => {
    if (changed !== id) return;
    state.on = on;
    paint();
  });

  btn.addEventListener("click", () => {
    if (state.busy) return;
    state.busy = true;
    // Optimistic, then reconciled, inside the store: a save should feel
    // instant even on a slow connection, and the only cost of being
    // wrong is a button that flips back.
    BM.set(id, !state.on)
      .catch(() => { /* the store already put the state back */ })
      .then(() => { state.busy = false; });
  });

  paint();
  host.appendChild(btn);
})();
