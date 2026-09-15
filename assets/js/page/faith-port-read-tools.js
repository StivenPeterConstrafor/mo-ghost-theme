/* The reader's four working tools: copy the text, copy a link to it, keep
 * the work, keep the passage.
 *
 * One popover rather than four more buttons, because the toolbar is
 * already full and these are actions rather than reading settings.
 *
 * The stores are ours, not the port's. The port ships its own bookmark
 * helper (FRReaderBookmarks) over a localStorage notebook, and nothing
 * in the theme ever bound a button to it. Ours are the same records the
 * rest of the site reads: MOFaithBookmarks is the mo-kit bookmark that
 * All Works draws its row stars from, so a work kept here is kept there,
 * and MOFaithNotebook is what /the-faith-received/desk/ writes from.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const pop = $("rdToolsPop");
  const btn = $("rdTools");
  if (!pop || !btn) return;

  const say = $("rdToolsSay");
  const BM = window.MOFaithBookmarks;
  const NB = window.MOFaithNotebook;

  // The ported reader folds the collection into the slug; our stores key
  // on the pair. "aq" is Augustine, whose corpus id is the long name.
  // A slug with no prefix is the Latin Library, which is also idFor's
  // default, so it needs no entry here.
  const PREFIX = { eebo: "eebo", pld: "pld", pg: "pg", po: "po", aq: "augustine" };

  function where() {
    const slug = new URLSearchParams(location.search).get("w") || "";
    const cut = slug.indexOf("-");
    const head = cut > 0 ? slug.slice(0, cut) : "";
    return PREFIX[head]
      ? { corpus: PREFIX[head], work: slug.slice(cut + 1), slug }
      : { corpus: "tfr", work: slug, slug };
  }

  // What the reader is showing, straight off the chrome it already fills
  // in, so this cannot drift from what the reader believes.
  function work() {
    const t = ($("h1") || {}).textContent || "";
    const a = ($("reader-author") || {}).textContent || "";
    const v = ($("reader-volume") || {}).textContent || "";
    const page = ($("pgJump") || {}).value || "";
    return { title: t.trim(), author: a.trim(), volume: v.trim(), page: page.trim() };
  }

  function citation() {
    const w = work();
    return [w.author, w.title, w.volume, w.page && "p. " + w.page]
      .filter(Boolean).join(", ");
  }

  // A link to the page in view, not to the top of the work.
  function deepLink() {
    const w = work();
    const u = new URL("/the-faith-received/read/", location.origin);
    u.searchParams.set("w", where().slug);
    if (w.page) u.searchParams.set("p", w.page);
    return u.href;
  }

  // The reader's selection if there is one, otherwise the whole of what
  // is on screen. Lane buttons decide which languages are showing, so
  // reading the rendered text is also the only thing that respects them.
  function visibleText() {
    const sel = String(window.getSelection() || "").trim();
    if (sel) return sel;
    const reading = $("reading");
    if (!reading) return "";
    const seen = [];
    reading.querySelectorAll(".row").forEach((r) => {
      const box = r.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      const t = (r.innerText || "").trim();
      if (t) seen.push(t);
    });
    return seen.join("\n\n");
  }

  function note(msg, bad) {
    if (!say) return;
    say.textContent = msg;
    say.classList.toggle("is-bad", !!bad);
  }

  async function toClipboard(text, ok) {
    try {
      await navigator.clipboard.writeText(text);
      note(ok);
    } catch (e) {
      // Clipboard access is refused outright in some browsers when the
      // click is not trusted, so say what happened rather than nothing.
      note("Your browser would not let the page copy. Select the text and copy it.", true);
    }
  }

  /* ---- The four ---------------------------------------------------- */

  $("rdCopyText").addEventListener("click", () => {
    const body = visibleText();
    if (!body) { note("Wait for the text to appear.", true); return; }
    // The citation travels with the words. A quotation pasted into a
    // footnote without its source is the thing this library exists to
    // stop happening.
    toClipboard(body + "\n\n" + citation() + "\n" + deepLink(), "Text and citation copied.");
  });

  $("rdCopyLink").addEventListener("click", () => {
    toClipboard(deepLink(), "Link to this page copied.");
  });

  const keep = $("rdKeep");
  function drawKeep(on) {
    keep.setAttribute("aria-pressed", on ? "true" : "false");
    keep.textContent = on ? "★ Kept" : "☆ Keep this work";
  }
  if (!BM || !BM.available || !BM.available()) {
    keep.disabled = true;
    keep.title = "Sign in to keep a work";
  } else {
    const id = BM.idFor(where().corpus, where().work);
    BM.ready().then(() => drawKeep(BM.has(id) === true)).catch(() => {});
    if (BM.subscribe) BM.subscribe(() => drawKeep(BM.has(id) === true));
    keep.addEventListener("click", () => {
      keep.disabled = true;
      Promise.resolve(BM.toggle(id))
        .then((on) => { drawKeep(on === true); note(on ? "Kept. It is in your bookmarks." : "Removed from your bookmarks."); })
        .catch(() => note("That could not be saved. Try again.", true))
        .finally(() => { keep.disabled = false; });
    });
  }

  $("rdNote").addEventListener("click", () => {
    if (!NB) { note("The notebook could not load. Reload and try again.", true); return; }
    const body = visibleText();
    if (!body) { note("Wait for the text to appear.", true); return; }
    const w = work();
    const at = where();
    try {
      NB.add(NB.newEntry({
        kind: "selection",
        corpus: at.corpus,
        work: at.work,
        title: w.title,
        author: w.author,
        cite: citation(),
        anchor: w.page ? "p. " + w.page : "",
        url: deepLink(),
        text: body,
      }));
      note("Saved to your notebook.");
    } catch (e) {
      note("That could not be saved to the notebook.", true);
    }
  });

  /* ---- The popover ------------------------------------------------- */

  function open(on) {
    btn.setAttribute("aria-expanded", on ? "true" : "false");
    pop.classList.toggle("is-open", on);
    if (!on) note("");
  }
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    open(btn.getAttribute("aria-expanded") !== "true");
  });
  pop.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", () => open(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") {
      open(false);
      btn.focus();
    }
  });
})();
