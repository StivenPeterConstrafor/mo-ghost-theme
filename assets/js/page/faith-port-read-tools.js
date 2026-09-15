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
  // on the pair, and the pair has to be the one All Works uses or a work
  // kept here is a second record rather than the same one.
  //
  // "aq" is Augustine, whose corpus id is the long name.
  const PREFIX = { eebo: "eebo", pld: "pld", pg: "pg", po: "po", aq: "augustine" };

  const SLUG = new URLSearchParams(location.search).get("w") || "";
  const CUT = SLUG.indexOf("-");
  const HEAD = CUT > 0 ? SLUG.slice(0, CUT) : "";

  // Two collections carry no prefix: the Latin Library, whose slugs are
  // author-title, and English Editions. Guessing between them by shape is
  // not possible, and guessing wrong is exactly the bug this exists to
  // close, so the English Editions catalogue is asked. It is 31KB and 69
  // works, it is only ever fetched for an unprefixed slug, and the answer
  // is kept for the life of the page.
  let englishEditions = null;
  function englishEditionSlugs() {
    if (englishEditions) return englishEditions;
    const base = window.__FR_BLOB_BASE__;
    if (!base) return (englishEditions = Promise.resolve(new Set()));
    englishEditions = fetch(String(base).replace(/\/$/, "") + "/v1/mo/index.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => new Set(((d && d.works) || []).map((w) => String(w.slug))))
      .catch(() => new Set());
    return englishEditions;
  }

  // Resolves the collection. A prefixed slug answers with no fetch at all.
  function where() {
    if (PREFIX[HEAD]) {
      return Promise.resolve({ corpus: PREFIX[HEAD], work: SLUG.slice(CUT + 1), slug: SLUG });
    }
    // Unprefixed: the work id is the whole slug either way, so only the
    // collection is in question.
    return englishEditionSlugs()
      .then((set) => ({ corpus: set.has(SLUG) ? "mo" : "tfr", work: SLUG, slug: SLUG }));
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
    u.searchParams.set("w", SLUG);
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

    // The reader scrolls inside #scroll, not the window, so the window's
    // height is the wrong ruler for what is on screen. This is the same
    // rect the port's own position capture measures against.
    const scroll = $("scroll");
    const box = scroll ? scroll.getBoundingClientRect() : null;
    const top = box ? box.top : 0;
    const bottom = box && box.height ? box.bottom : window.innerHeight;

    // innerText is empty for anything the browser is not rendering, so
    // textContent is the fallback. It loses paragraph breaks, which is
    // worth less than losing the text.
    const read = (el) => ((el.innerText || el.textContent || "").trim());

    const rows = Array.from(reading.querySelectorAll(".row"));
    const seen = [];
    rows.forEach((r) => {
      const b = r.getBoundingClientRect();
      if (b.bottom < top || b.top > bottom) return;
      const t = read(r);
      if (t) seen.push(t);
    });
    // A geometry test that finds nothing must not be the reason a reader
    // cannot copy. Fall back to the column itself.
    if (seen.length) return seen.join("\n\n");
    return read(reading);
  }

  function note(msg, bad) {
    if (!say) return;
    say.textContent = msg;
    say.classList.toggle("is-bad", !!bad);
  }

  function copyRaw(text) {
    if (!navigator.clipboard) return Promise.reject(new Error("no clipboard"));
    return navigator.clipboard.writeText(text);
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
    // Only the label. Writing textContent here would take the
    // description span with it, and the row would lose its second line
    // the first time anyone kept anything.
    const label = keep.querySelector(".rdt-l");
    if (label) label.textContent = on ? "★ Kept" : "☆ Keep this work";
  }
  if (!BM || !BM.available || !BM.available()) {
    keep.disabled = true;
    keep.title = "Sign in to keep a work";
  } else {
    // Disabled until the collection is known, because the id is what the
    // button acts on and an id built from a guess is the whole bug.
    keep.disabled = true;
    where().then((at) => {
      const id = BM.idFor(at.corpus, at.work);
      const paint = () => drawKeep(BM.has(id) === true);
      BM.ready().then(paint).catch(() => {});
      if (BM.subscribe) BM.subscribe(paint);
      keep.disabled = false;
      keep.addEventListener("click", () => {
        keep.disabled = true;
        Promise.resolve(BM.toggle(id))
          .then((on) => { drawKeep(on === true); note(on ? "Kept. It is in your bookmarks." : "Removed from your bookmarks."); })
          .catch(() => note("That could not be saved. Try again.", true))
          .finally(() => { keep.disabled = false; });
      });
    });
  }

  $("rdNote").addEventListener("click", () => {
    if (!NB) { note("The notebook could not load. Reload and try again.", true); return; }
    const body = visibleText();
    if (!body) { note("Wait for the text to appear.", true); return; }
    const w = work();
    const cite = citation();
    const url = deepLink();
    where().then((at) => {
      NB.add(NB.newEntry({
        kind: "selection",
        corpus: at.corpus,
        work: at.work,
        title: w.title,
        author: w.author,
        cite,
        anchor: w.page ? "p. " + w.page : "",
        url,
        text: body,
      }));
      note("Saved to your notebook.");
    }).catch(() => note("That could not be saved to the notebook.", true));
  });


  /* ---- Paragraph anchors -------------------------------------------
   *
   * The toolbar's Copy acts on the passage in view, which is the right
   * unit for reading and the wrong one for citing. Every block the
   * engine renders already carries a stable id — reader-core stamps
   * rw.id = "b" + page + "-" + n on each .row — so a paragraph is
   * addressable; nothing in the interface admitted it.
   *
   * A rail follows the pointer down the column and acts on the block it
   * is beside: ¶ copies a link that lands on that paragraph, ⧉ copies
   * the paragraph with its citation under it.
   */
  // Resolved per event, never held. See the delegation note below.
  const readingNow = () => $("reading");
  // No matchMedia gate here. Asking "(hover: hover)" once, at load, made
  // whether the feature exists at all depend on what the browser reported
  // in that instant, and a wrong answer then was permanent and silent.
  // Whether the rail SHOWS is a CSS question, answered in the skin by a
  // media query that re-evaluates itself; pointer events on a touch-only
  // device simply never arrive.
  {
    const rail = document.createElement("div");
    rail.className = "fr-para-rail";
    rail.hidden = true;
    rail.innerHTML =
      '<button type="button" data-a="link" title="Copy a link to this paragraph"' +
      ' aria-label="Copy a link to this paragraph">\u00b6</button>' +
      '<button type="button" data-a="copy" title="Copy this paragraph, with its citation"' +
      ' aria-label="Copy this paragraph, with its citation">\u29c9</button>';
    // NOT appended here. The engine renders each work by replacing the
    // contents of #reading, so a rail attached at load is thrown away the
    // moment a work arrives — and again on every page turn. It is
    // re-attached on demand instead, which survives every re-render
    // without having to know when one happened.
    // DELEGATED FROM THE DOCUMENT, with #reading looked up per event.
    // The engine does not refill the reading column when a work arrives,
    // it REPLACES the <main id="reading"> element. A listener bound to
    // the one present at load is left on a detached node, still
    // listening, never firing — which is why re-attaching the rail three
    // times changed nothing. Nothing this feature owns may outlive a
    // re-render.
    let host = null;
    document.addEventListener("pointerover", (e) => {
      const reading = readingNow();
      if (!reading || !e.target.closest) return;
      const row = e.target.closest(".row[id]");
      if (!row || !reading.contains(row)) {
        if (!e.target.closest("#reading")) { rail.hidden = true; host = null; }
        return;
      }
      if (rail.parentElement !== reading) reading.appendChild(rail);
      host = row;
      rail.style.top =
        (row.getBoundingClientRect().top - reading.getBoundingClientRect().top) + "px";
      rail.hidden = false;
    });

    // The rail reports on its own face. The Tools popover's status line
    // is shut when the rail is in use, so saying it there says nothing.
    function flash(b, mark) {
      const was = b.textContent;
      b.textContent = mark;
      setTimeout(() => { b.textContent = was; }, 1100);
    }

    rail.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || !host) return;
      e.preventDefault();
      const link = new URL(deepLink());
      link.hash = host.id;
      const body = b.getAttribute("data-a") === "link"
        ? link.href
        : (host.innerText || host.textContent || "").trim() +
          "\n\n" + citation() + "\n" + link.href;
      copyRaw(body).then(() => flash(b, "\u2713"), () => flash(b, "\u2715"));
    });
  }

  /* ---- The thumb bar's two dead buttons ----------------------------
   *
   * reader-core wires the phone toolbar's Search and Research buttons to
   * window.__frOpenSearch and window.__frOpenNotebook, and each call site
   * is guarded, so when the global is missing the button silently does
   * nothing at all. Both were missing here:
   *
   *   __frOpenNotebook is defined only in index.in05.js, the library
   *   landing bundle, which the reader does not load.
   *   __frOpenSearch is defined nowhere in the port, on any page.
   *
   * So two of the five buttons on the phone toolbar had never worked.
   * Defining the globals is the whole fix: the engine's call sites are
   * already there and already correct, and his file stays untouched.
   */
  if (!window.__frOpenSearch) {
    window.__frOpenSearch = function () {
      const app = document.getElementById("app");
      if (app) app.classList.remove("nosb");
      if (window.__frThumbSync) window.__frThumbSync();
      // The field lives on the contents tab, so make sure that is the
      // tab showing before reaching for it.
      let box = document.querySelector('.sidebar input[type="search"]');
      if (!box) {
        const tab = document.querySelector(".nav-vt button");
        if (tab) tab.click();
        box = document.querySelector('.sidebar input[type="search"]');
      }
      if (box) { box.focus(); box.select(); }
    };
  }

  // NO __frOpenNotebook. The Research panel it opened has been removed:
  // it was library-landing markup carried into this template without the
  // wiring, every one of its thirty-five controls was dead, it shipped
  // with `inert` set — so a real tap could not even reach its close
  // button — and one control navigated to /read/? and discarded the work
  // being read. Defining this global made an inert panel reachable,
  // which was worse than leaving the button doing nothing. The thumb
  // bar's Research button is hidden in the skin to match.

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
