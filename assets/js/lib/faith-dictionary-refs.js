/*
 * The Faith Received — resolving a bookmarked DICTIONARY article.
 *
 * A dictionary article is bookmarked with the same id shape as a work,
 * `tfr:dtc:<article id>` (assets/js/lib/faith-work-bookmarks.js owns
 * that shape), so the mo-kit store, the 200-bookmark cap and the
 * per-member sync all apply to it without a worker change. What it
 * cannot do is resolve: every surface that prints a saved id looks the
 * work up in a CORPUS CATALOGUE, and the dictionary is not one.
 *
 * WHY NOT AN EIGHTH CORPUS. Registering it in faith-corpora.js would
 * have resolved it everywhere for free, and would also have put 1,916
 * dictionary articles into Browse, the search index, the century and
 * tradition indexes and the author shelf, all of which iterate
 * MOCorpora.all. The dictionary has its own front door and its own
 * engine; it is a reference work consulted by headword, not a shelf of
 * works to be read through. So it resolves here instead, and the two
 * surfaces that print saved things ask this file for the "dtc" ids and
 * the catalogues for the rest.
 *
 * ONE FETCH. The index is the same file the dictionary page itself
 * loads (v1/dictionary/index.json on the library worker, ~1,916 rows),
 * cached per page like MOCorpora.load caches a catalogue.
 *
 * ROW SHAPE, from the engine (assets/js/port/dtc.in02.js):
 *   [ id, French headword, letter, chars, hasEnglish, English headword ]
 *
 * What comes back out is the record every saved-list row already knows
 * how to print: { corpus, id, title, author, eyebrow, extent, url }.
 * `author` is empty because an article's author is a signature at its
 * foot and the index does not carry it.
 */
(function () {
  "use strict";

  const CORPUS = "dtc";
  const PAGE = "/the-faith-received/dictionary/";
  const LABEL = "Dictionary of Catholic Theology";

  function base() {
    const meta = document.querySelector('meta[name="tfr-library-base"]');
    const url = (meta && meta.getAttribute("content")) ||
      "https://mo-tfr-library.mo-podcast-feed.workers.dev";
    return String(url).replace(/\/$/, "");
  }

  /* The article's own address. The dictionary opens whatever is in the
     hash (openArt(h, false) on load), and reads ?paragraph= and ?lang=
     from the query, which is what lets a stop come back to the place
     rather than the top. Same vocabulary as writePlace() there. */
  function url(id, place) {
    const q = [];
    if (place && place.paragraph > 0) q.push("paragraph=" + encodeURIComponent(place.paragraph));
    if (place && /^(both|en|fr)$/.test(place.lang || "")) q.push("lang=" + encodeURIComponent(place.lang));
    return PAGE + (q.length ? "?" + q.join("&") : "") + "#" + encodeURIComponent(id);
  }

  let index = null;
  function load() {
    if (index) return index;
    index = fetch(base() + "/v1/dictionary/index.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const rows = (d && d.articles) || [];
        const by = new Map();
        rows.forEach((a) => {
          const id = String(a[0] || "");
          if (!id) return;
          by.set(id, {
            corpus: CORPUS,
            id,
            title: String(a[5] || a[1] || id),
            titleLatin: a[5] && a[1] !== a[5] ? String(a[1]) : "",
            author: "",
            eyebrow: LABEL,
            extent: Number(a[3]) || 0,
            url: url(id),
          });
        });
        return by;
      })
      // An unreachable index must read as "could not resolve these",
      // never as "you saved nothing": the callers keep the ids and say
      // so themselves.
      .catch(() => null);
    return index;
  }

  /* ids in, rows out, in the order given. Ids this file does not
     recognise are dropped, which is the same thing a catalogue does
     with a slug that has been renamed at the source. */
  function resolve(ids) {
    const wanted = (ids || [])
      .map((raw) => String(raw).replace(/^tfr:dtc:/, ""))
      .filter(Boolean);
    if (!wanted.length) return Promise.resolve([]);
    return load().then((by) => {
      if (!by) return null;
      return wanted.map((id) => by.get(id)).filter(Boolean);
    });
  }

  /* Where the reader stopped in this article, as a paragraph index.
     The stop is kept by faith-position-store.js under corpus "dtc" with
     the anchor "sec<n>", the id the engine gives each paragraph. The
     store's own appendTo() cannot build this link: it serves the reader
     path only, and refuses any URL that already carries a fragment,
     which every dictionary URL does — the article id IS the fragment.
     So the locator is assembled here, in the file that owns the
     dictionary's address. */
  function stop(id) {
    const store = window.MOFaithPosition;
    if (!store || !id) return null;
    const pos = store.get(CORPUS, String(id));
    const n = pos && /^sec(\d+)$/.exec(String(pos.anchor || ""));
    return n ? { paragraph: Number(n[1]), at: pos.at || 0 } : null;
  }

  function resumeUrl(id) {
    const at = stop(id);
    return at && at.paragraph > 0 ? url(id, { paragraph: at.paragraph }) : url(id);
  }

  function hasResume(id) {
    const at = stop(id);
    return !!(at && at.paragraph > 0);
  }

  function isDictionaryId(raw) {
    return /^tfr:dtc:/.test(String(raw || ""));
  }

  window.MODictionaryRefs = { CORPUS, LABEL, PAGE, url, load, resolve, stop, resumeUrl, hasResume, isDictionaryId };
})();
