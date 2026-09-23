/*
 * The Faith Received section of the member dashboard.
 *
 * Reads the raw bookmark ids from mo-kit and resolves the "tfr:" ones
 * against the catalogues. The enriched /bookmarks list cannot be used
 * here: it resolves ids against Ghost and drops everything Ghost does
 * not know, which is every work in the library.
 *
 * Also fills the count on the dashboard card, so the card is honest
 * before anyone opens it.
 */
(function () {
  // ONE LIBRARY (owner, 2026-09-23: "take out the whole latin library vs english things"). The library is one library,
  // shelved by tradition. "The Latin Library" is the name of the pipeline most of it came through, and it holds English
  // works (Davenant, Baxter, the Westminster minutes); Early English Books and the English Editions are the same
  // library's English shelves. So where a reader is told what a work is, the label is its shelf, never tfr / eebo / mo.
  // The printed series (Patrologia Latina, Graeca, Orientalis) and the confessions keep their own names.
  const ONE_LIBRARY = new Set(["tfr", "eebo", "mo", "mo-english"]);
  const shelfOf = (w) => {
    const t = String((w && w.tradition) || "").trim();
    if (!t) return "";
    const L = window.MOFaithLabel;
    return L && L.of ? L.of(t, w) : t;
  };
  /* One shelf order for the whole library, so a multi-volume set reads
   1, 2, 3 rather than 1, 10, 11, 2. window.MOTitleOrder ships in boot,
   which runs before every page script; the fallback is the ordering
   this line had before it existed, so a boot that failed to load costs
   the order and never the list. See assets/js/lib/faith-title-order.js. */
  function cmpTitle(a, b) {
    const x = String(a || ""), y = String(b || "");
    return window.MOTitleOrder
      ? window.MOTitleOrder.compareTitles(x, y)
      : x.localeCompare(y);
  }
  const {body} = document;
  const WORKER = (body.getAttribute("data-kit-worker-url") || "").replace(/\/$/, "");
  const list = document.querySelector("[data-faith-saved]");
  const countEl = document.querySelector('[data-card-count="faith-received"]');
  if (!WORKER || !window.MOAuth || (!list && !countEl)) return;

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  window.MOAuth.fetch(`${WORKER}/bookmarks?ids_only=1`, {
    method: "GET", mode: "cors", credentials: "omit",
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const ids = ((data && data.postIds) || []).filter((s) => /^tfr:/.test(s));
      if (countEl) countEl.textContent = ids.length ? `${ids.length} saved` : "";
      if (!list) return null;
      if (!ids.length) {
        list.innerHTML =
          `<p class="faith-saved-empty">Nothing saved yet. ` +
          `<a href="/the-faith-received/browse/">Browse the library</a> and use Save on any work.</p>`;
        return null;
      }
      return render(ids);
    })
    .catch(() => {
      if (list) {
        list.innerHTML = `<p class="faith-saved-empty">Could not load your saved works just now.</p>`;
      }
    });

  function render(ids) {
    // Group the wanted slugs by collection so each catalogue is fetched
    // once rather than once per work.
    const wanted = new Map();
    ids.forEach((raw) => {
      const parts = raw.split(":");
      const corpusId = parts[1] || "tfr";
      const slug = parts.slice(2).join(":");
      if (!slug) return;
      if (!wanted.has(corpusId)) wanted.set(corpusId, new Set());
      wanted.get(corpusId).add(slug);
    });

    /* Two things this list used to drop on the floor, both of which a
       member had deliberately saved:

       CONFESSIONS. The reader opens a creed or confession with no `?c=`
       at all, so saving one stores it as "tfr:tfr:<slug>" and the Latin
       Library catalogue has never heard of it. The Research page's
       panel already retries those against the confessions catalogue;
       this page did not, so every confession anyone had saved was
       invisible here. Same retry, same rule.

       DICTIONARY ARTICLES. "tfr:dtc:<id>" resolves through
       assets/js/lib/faith-dictionary-refs.js rather than a catalogue,
       for the reason stated in that file: making the dictionary an
       eighth corpus would put its 1,916 articles into Browse and every
       index. */
    const DICT = window.MODictionaryRefs;
    const CONFESSIONS = "confessions";
    const catalogueIds = [...wanted.keys()].filter((id) => !(DICT && id === DICT.CORPUS));
    if (wanted.has("tfr") && catalogueIds.indexOf(CONFESSIONS) < 0) catalogueIds.push(CONFESSIONS);

    const dictIds = DICT && wanted.has(DICT.CORPUS) ? [...wanted.get(DICT.CORPUS)] : [];
    const dictRows = dictIds.length
      ? DICT.load().then((by) => (by ? dictIds.map((id) => by.get(id)).filter(Boolean) : []))
          .catch(() => [])
      : Promise.resolve([]);

    return Promise.all([Promise.all(catalogueIds.map((id) =>
      window.MOFaithCatalogue.load(id).then((works) => ({ id, works })).catch(() => ({ id, works: [] }))
    )), dictRows]).then(([sets, articles]) => {
      const rows = [];
      const found = new Set();
      sets.forEach(({ id, works }) => {
        // A confession saved as "tfr:" is looked for under the id the
        // bookmark actually carries, not under the catalogue it was
        // finally found in.
        const slugs = wanted.get(id) || (id === CONFESSIONS ? wanted.get("tfr") : null);
        if (!slugs) return;
        const corpus = window.MOCorpora.get(id);
        works.forEach((w) => {
          if (!slugs.has(String(w.id)) || found.has(String(w.id))) return;
          found.add(String(w.id));
          rows.push({ w, corpus });
        });
      });

      if (!rows.length && !articles.length) {
        list.innerHTML =
          `<p class="faith-saved-empty">Your saved works could not be found in the library. ` +
          `They may have been renamed at the source.</p>`;
        return;
      }

      rows.sort((a, b) => String(a.w.author || "").localeCompare(String(b.w.author || ""))
        || cmpTitle(a.w.title, b.w.title));

      // Dictionary articles last and under their own heading: they are
      // entries in one reference work, not works on a shelf, and
      // sorting them in among the works by an author they do not have
      // would have put every one of them at the top.
      const dict = articles.length
        ? `<h2 class="faith-saved-head">${escapeHtml(DICT.LABEL)}</h2>` +
          `<ol class="faith-saved-list">${articles
            .slice()
            .sort((a, b) => cmpTitle(a.title, b.title))
            .map((a) => `<li><a href="${escapeHtml(DICT.resumeUrl(a.id))}">` +
              `<span class="faith-saved-title">${escapeHtml(a.title)}</span>` +
              `${a.titleLatin ? `<span class="faith-saved-author">${escapeHtml(a.titleLatin)}</span>` : ""}` +
              `${DICT.hasResume(a.id) ? `<span class="faith-saved-shelf">Where you stopped</span>` : ""}` +
              `</a></li>`).join("")}</ol>`
        : "";

      if (!rows.length) { list.innerHTML = dict; return; }

      list.innerHTML = `<ol class="faith-saved-list">${rows.map(({ w, corpus }) => {
        const author = w.author
          ? `<span class="faith-saved-author">${escapeHtml(w.author)}</span>` : "";
        const where = corpus && !ONE_LIBRARY.has(corpus.id) ? corpus.label : shelfOf(w);
        const shelf = where
          ? `<span class="faith-saved-shelf">${escapeHtml(where)}</span>` : "";
        return `<li><a href="${escapeHtml(w.url)}">` +
          `<span class="faith-saved-title">${escapeHtml(w.title || w.id)}</span>` +
          `${author}${shelf}</a></li>`;
      }).join("")}</ol>${dict}`;
    });
  }
})();
