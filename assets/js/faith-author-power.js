/*
 * Power Search, narrowed to one author.
 *
 * Ian, 2026-09-11: "Search this author should be the same Power Search
 * feature but limited to whatever author page the box is on."
 *
 * Same endpoint, same result shape and the same reading vocabulary as
 * the Research desk's Power Search (assets/js/page/faith-power-search.js
 * is the fuller implementation and the one to read first). The
 * difference is the scope, and the scope is the whole problem.
 *
 * ── WHY THIS IS A FAN-OUT AND NOT ONE QUERY ─────────────────────
 *
 * /v1/vsearch takes exactly three filters and they are the three
 * metadata indexes that exist on the Vectorize index: `tradition`,
 * `corpus` and `slug` (see website/workers/tfr-library/lib/vsearch.js,
 * and the wrangler.toml comment listing the create-metadata-index
 * calls). There is NO author filter, and adding one is not a code
 * change we could make from here: Vectorize refuses a filter on a
 * property that was never indexed, so it needs a new metadata index
 * over the whole corpus.
 *
 * The obvious fallback — search the library and keep this author's
 * rows — does not work and should not be shipped. Vectorize returns at
 * most 50 candidates when metadata comes back with them, out of
 * nineteen thousand works. For all but the three or four heaviest
 * names in the library, filtering fifty library-wide hits down to one
 * author yields nothing, and a search box that answers "nothing" to
 * every question is worse than no search box.
 *
 * So this scopes the way the worker itself scopes an author, in
 * ask.js's authorCoverageEvidence(): one slug-filtered query per work,
 * fanned out, merged. `slug` IS an indexed property, so each leg is a
 * real server-side filter and a result from another author cannot
 * physically come back.
 *
 * THE COST, said out loud. Each leg is one request, one embedding of
 * the same sentence and one Vectorize query. The worker does this in a
 * single request and embeds once; we cannot, so a search here costs
 * MAX_WORKS legs instead of one. Two things bound it:
 *
 *   - MAX_WORKS is 12, against the worker's own AUTHOR_MAX_WORKS of 20
 *     for the same job. The limiter on /v1/vsearch is 30 calls in 60
 *     seconds against the member's identity, so 12 leaves room for a
 *     second search inside the same minute and for the reader to have
 *     been searching somewhere else a moment ago. Twenty would not.
 *   - Which 12, when an author has more, is decided by folded-word
 *     overlap between the query and each work's own title, the same
 *     titleRelevanceScore() trick and for the same reason ask.js gives:
 *     a first-N-in-catalogue-order cap once left "The Literal Meaning
 *     of Genesis" out of a search about Genesis.
 *
 * The panel says how many of the author's works were read, every time.
 * A shortlist presented as a complete answer is the one thing this
 * screen could say that a reader would carry away and repeat.
 *
 * WHAT WOULD REPLACE THIS. An `author` param on /v1/vsearch doing the
 * fan-out server-side: one embedding, one round trip, no client rate
 * budget, and the cap raised to the worker's 20. The client below would
 * then be a single request. That is a worker change and a deploy, and
 * it is not in this branch.
 *
 * ── QUOTATIONS ──────────────────────────────────────────────────
 *
 * `snippet` on a vsearch row is the embedded chunk's own text, straight
 * out of the work. It is the same string the worker hands the reader as
 * `?q=` to land on, which only works because it is verbatim. That is
 * why passages are printed here and why the mined topic summaries are
 * not printed anywhere on this page: see the header of
 * assets/js/faith-author-topics.js.
 *
 * ── ACCESS ──────────────────────────────────────────────────────
 *
 * /v1/vsearch is member-gated on the worker, so every call goes through
 * window.MOAuth.fetch, which attaches the member's bearer token and
 * refuses any host not on the page's mo-trusted-hosts allowlist. The
 * page does not load this file at all for a signed-out visitor (the
 * {{#if @member}} in custom-faith-author.hbs), and the Find button
 * carries data-feature-gate="ask" for the day the beta ends. A worker
 * 401, 403 or 429 answers with a reader-facing string it wrote itself,
 * and that string is shown as given rather than papered over.
 *
 * SAFETY. Nodes are built with createElement and textContent, every
 * href goes through MOSafeHref. Same rules as the Research desk's copy
 * and for the same reason: an earlier version of that file shipped an
 * XSS through an escaped `href`, which escapes perfectly and does
 * nothing whatever about `javascript:`.
 */
(function () {
  "use strict";

  const LIBRARY = (document.querySelector('meta[name="tfr-library-base"]') || {}).content
    || "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  const VSEARCH_URL = `${LIBRARY}/v1/vsearch`;

  // See the header. Twelve legs, against the 30-per-60s limiter.
  // The worker's fan-out cap (AUTHOR_FANOUT_MAX in lib/vsearch.js).
  // Kept here only so the note under the field can say how much of a
  // large shelf a search will reach. The cap itself is enforced there.
  const MAX_WORKS = 24;
  // Passages per work. The row is a work and the passages sit under it,
  // so this is how deep a single work can be read, not how wide.
  const PER_WORK = 5;
  // Three at a time. The limiter counts calls and not concurrency, so
  // this is about not opening twelve sockets at once on a phone.

  // Which collections the vector index actually holds. Patrologia
  // Orientalis is licensed out of it (LICENSED_EXCLUDED in the worker's
  // lib/collections.js), and the Augustine and confessions collections
  // are theme-side catalogues with no embeddings. A work in one of them
  // cannot be searched this way and is counted out loud rather than
  // silently dropped.
  const EMBEDDED = new Set(["tfr", "pld", "mo", "eebo", "pg"]);
  const PAGED_CORPORA = new Set(["tfr", "eebo"]);

  const CORPUS_LABELS = {
    tfr: "The Latin Library",
    eebo: "Early English Books",
    mo: "English Editions",
    pld: "Patrologia Latina",
    pg: "Patrologia Graeca",
    po: "Patrologia Orientalis",
  };

  const n = (x) => Number(x || 0).toLocaleString();

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  }

  /*
   * The work's id as the vector index spells it.
   *
   * Mirrors collectionFor() in the worker's lib/collections.js, read
   * backwards: the native Latin Library keeps its own unprefixed id and
   * every other collection carries its corpus as a prefix. Get this
   * wrong and the filter matches nothing, which looks exactly like an
   * author with nothing to say.
   */
  function slugOf(w) {
    const corpus = String(w && w.corpus || "");
    const id = String(w && w.id || "");
    if (!id || !EMBEDDED.has(corpus)) return "";
    return corpus === "tfr" ? id : `${corpus}-${id}`;
  }

  function searchable(works) {
    const out = [];
    const seen = new Set();
    (works || []).forEach((w) => {
      const slug = slugOf(w);
      if (!slug || seen.has(slug)) return;
      seen.add(slug);
      out.push({ slug, work: w });
    });
    return out;
  }

  // Words worth matching a title on: four folded characters or more, so
  // "Genesis" and "grace" count and "the" and "did" do not inflate
  // every title's score. Taken off the ORIGINAL text, because folding a
  // whole sentence first would collapse it into one unbroken run with
  // no word boundaries left.
  function foldedWords(text) {
    return (String(text || "")
      .normalize("NFD").replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[a-z0-9]{4,}/g)) || [];
  }

  function rank(rows, term) {
    if (rows.length <= MAX_WORKS) return rows.slice();
    const words = new Set(foldedWords(term));
    return rows
      .map((row) => {
        const title = new Set(foldedWords(row.work && row.work.title));
        let score = 0;
        words.forEach((word) => { if (title.has(word)) score += 1; });
        return { row, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_WORKS)
      .map((x) => x.row);
  }

  /* ── The note under the field ──────────────────────────────────── */

  function note(works) {
    const rows = searchable(works);
    if (!rows.length) {
      return "None of the works under this name are in the semantic index yet, so this mode has nothing to read.";
    }
    const reach = Math.min(rows.length, MAX_WORKS);
    const scope = rows.length > MAX_WORKS
      ? `the ${reach} of ${n(rows.length)} works whose titles sit closest to what you ask`
      : `all ${n(rows.length)} work${rows.length === 1 ? "" : "s"} under this name`;
    return `Searches by meaning rather than by word across ${scope}. `
      + "It reads a work at a time, so it takes a moment.";
  }

  function available(works) {
    return searchable(works).length > 0;
  }

  /* The per-work fan-out that used to live here is gone. It ranked the
     works client-side and issued one request each, up to twelve,
     through three lanes. The worker does all of that now in a single
     request on one embedding: GET /v1/vsearch?author=. See
     vsearchByAuthor in tfr-library/lib/vsearch.js, and the note in
     search() below. */

  /* ── Drawing ───────────────────────────────────────────────────── */

  function passageLocus(r) {
    if (r.locus) return String(r.locus);
    if (r.page && PAGED_CORPORA.has(r.corpus)) return `p. ${r.page}`;
    return "";
  }

  function link(href, text, cls) {
    const a = el("a", cls, text);
    if (window.MOSafeHref && window.MOSafeHref.set) window.MOSafeHref.set(a, href, "#");
    else a.setAttribute("href", href || "#");
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }

  function passageList(passages) {
    const ol = el("ol", "ps-passage-list");
    passages.forEach((p) => {
      const li = el("li", "ps-passage");
      const a = link(p.url, null, "ps-passage-link");
      const locus = passageLocus(p);
      if (locus) a.appendChild(el("span", "ps-passage-locus", locus));
      // The snippet is the work's own text. Where a row somehow carries
      // none, the link still says what it does rather than rendering an
      // empty line the reader cannot aim at.
      a.appendChild(el("span", "ps-passage-text", p.snippet || "Open this passage in the reader."));
      li.appendChild(a);
      ol.appendChild(li);
    });
    return ol;
  }

  function workRow(entry, index) {
    const li = el("li", "ps-work");
    const best = entry.passages[0] || {};

    const label = CORPUS_LABELS[best.corpus] || best.tradition || "";
    if (label) li.appendChild(el("p", "ps-work-trad", label));

    const titleP = el("p", "ps-work-title");
    titleP.appendChild(link(
      best.workUrl || (entry.work && entry.work.url) || best.url,
      (entry.work && entry.work.title) || best.title || entry.slug,
      "ps-work-titlelink"));
    li.appendChild(titleP);

    const count = entry.passages.length;
    const regionId = `fa-ps-passages-${index}`;
    const toggle = el("button", "ps-work-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", regionId);
    const toggleLabel = el("span", "ps-work-toggle-label",
      count === 1 ? "1 passage in this work" : `${count} passages in this work`);
    toggle.appendChild(toggleLabel);
    li.appendChild(toggle);

    const region = el("div", "ps-passages");
    region.id = regionId;
    region.hidden = true;
    // Already in hand. Each work was queried on its own to get here, so
    // unlike the Research desk's list there is no second call to make
    // and no reason to make opening a row cost anything.
    region.appendChild(passageList(entry.passages));
    if (count >= PER_WORK) {
      region.appendChild(el("p", "ps-passages-note",
        `The ${PER_WORK} closest passages in this work. A long work may hold more.`));
    }
    li.appendChild(region);

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      region.hidden = open;
    });

    return li;
  }

  /* ── The search ────────────────────────────────────────────────── */

  /*
   * works  every work on this author's shelf, normalised by MOCorpora.
   * term   what the reader typed.
   * out    the panel's output element. Emptied and rewritten.
   * say    announces one line to the panel's live region.
   *
   * Returns { cancel }, the same shape MOCorpusSearch.run returns, so
   * the panel can stop this the way it already stops a keyword crawl.
   */
  /* The writer's name as the CATALOGUE spells it, which is what the
   * worker matches on. Taken off the works themselves rather than the
   * URL: `?a=` carries the folded key ("augustineofhippo"), and while
   * the worker folds both sides before comparing, handing it the real
   * name keeps the request legible in a log and in a network panel.
   * The URL is the fallback for the case where no work carries one. */
  function authorOf(rows) {
    for (const r of rows) {
      const a = r.work && r.work.author;
      if (a && String(a).trim()) return String(a).trim();
    }
    try { return new URLSearchParams(window.location.search).get("a") || ""; }
    catch (_) { return ""; }
  }

  function search(works, term, out, say) {
    const all = searchable(works);
    const authorName = authorOf(all);
    const rows = rank(all, term);
    const controller = new AbortController();
    let stopped = false;
    let silenced = false;
    let done = 0;
    let serverHeld = 0;
    let serverTruncated = false;

    /*
     * `silent` is for the panel putting this down to run something
     * else, and it is load-bearing. Without it, cancelling a fan-out
     * still lands its own answer a beat later and writes it over the
     * one the reader actually asked for, under a field that says
     * something different. The Stop button passes nothing: there the
     * reader asked for the stop and is owed the partial result.
     */
    function cancel(silent) {
      if (stopped) return;
      stopped = true;
      silenced = !!silent;
      controller.abort();
    }

    if (!rows.length) {
      out.textContent = "";
      out.appendChild(el("p", "fa-search-msg",
        "None of the works under this name are in the semantic index yet."));
      say("None of the works under this name are in the semantic index yet.");
      return { cancel };
    }

    out.textContent = "";
    const progress = el("p", "fa-search-msg", "Reading this author\u2019s works\u2026");
    out.appendChild(progress);
    const stop = el("button", "fa-search-stop", "Stop");
    stop.type = "button";
    // Wrapped, not passed: a listener is handed the click Event, which
    // as `silent` above would be truthy and would swallow the very
    // result the reader pressed Stop to keep.
    stop.addEventListener("click", () => { cancel(); });
    out.appendChild(stop);

    const found = new Map();

    function collect(slug, work, passages) {
      if (!passages.length) return;
      const sorted = passages.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
      found.set(slug, { slug, work, passages: sorted, best: sorted[0].score || 0 });
    }

    function finish(message) {
      if (silenced) return;
      out.textContent = "";

      if (message) {
        const p = el("p", "fa-search-msg", message);
        p.setAttribute("role", "alert");
        out.appendChild(p);
        say(message);
        if (!found.size) return;
      }

      if (!found.size) {
        const line = stopped
          ? `Nothing close to that in the ${done} work${done === 1 ? "" : "s"} read before stopping.`
          : "Nothing close enough to that under this name. Try describing the idea a different way. The semantic index is still being built out across the collections, so a corner of the library may not answer yet.";
        out.appendChild(el("p", "fa-search-msg", line));
        say(line);
        return;
      }

      const list = [...found.values()].sort((a, b) => b.best - a.best);
      const passages = list.reduce((total, e) => total + e.passages.length, 0);
      // Both figures, because they answer different questions: how much
      // came back, and out of how much of the shelf. A count with only
      // the first reads as the whole answer.
      const head = `${n(passages)} passage${passages === 1 ? "" : "s"} in ${
        n(list.length)} of the ${n(done)} work${done === 1 ? "" : "s"} read${
        stopped ? " before stopping" : ""}`;
      out.appendChild(el("p", "fa-search-count", head));

      const ol = el("ol", "ps-results");
      list.forEach((entry, i) => ol.appendChild(workRow(entry, i)));
      out.appendChild(ol);

      const opener = "Power Search matches the sense rather than the words. Each work was searched on its own.";
      let scope;
      if (stopped) {
        scope = ` The rest of the shelf was not read. Press Find again to search all ${n(rows.length)}.`;
      } else if (serverTruncated && serverHeld > done) {
        scope = ` The ${n(done)} searched are the ones out of ${n(serverHeld)} whose titles sit closest to what you asked.`;
      } else {
        scope = " Every work under this name that the index holds was read.";
      }
      out.appendChild(el("p", "fa-search-note", opener + scope));
      say(head);
    }

    /* ONE request. The fan-out moved into the worker on 2026-09-11:
     * GET /v1/vsearch?author= resolves the writer's works and runs the
     * per-work queries there, on a single embedding. See
     * vsearchByAuthor in tfr-library/lib/vsearch.js.
     *
     * What this file used to do, and no longer does: rank the works
     * client-side, then run up to twelve requests through three lanes,
     * each one embedding the same sentence again, each one a slot
     * against a 30-per-60s limiter. The ranking, the cap and the
     * merging are the worker's now, and it does them better because it
     * can see the whole shelf.
     *
     * The reader-facing behaviour is deliberately unchanged: the same
     * grouped-by-work list, the same two figures underneath, the same
     * Stop. Stop is now one abort rather than a queue drain.
     */
    let fatal = "";
    const params = new URLSearchParams({ q: term, author: authorName, k: "40", per_work: String(PER_WORK) });
    const url = `${VSEARCH_URL}?${params.toString()}`;
    const init = { signal: controller.signal };

    (window.MOAuth && window.MOAuth.fetch ? window.MOAuth.fetch(url, init) : fetch(url, init))
      .then(async (res) => {
        if (!res.ok) {
          let message = "";
          try { const b = await res.json(); if (b && b.error) message = String(b.error); } catch (_) { /* status carries it */ }
          fatal = message || "The library is limiting searches just now. Try again in a minute.";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (stopped || !data) { finish(fatal); return; }
        // The worker says how much of the shelf it read. Used verbatim
        // rather than recomputed here, so the figure under the list is
        // the one the search actually used.
        done = data.works_read || 0;
        serverHeld = data.works_held || 0;
        serverTruncated = !!data.truncated;
        const byWork = new Map();
        (data.results || []).forEach((r) => {
          const slug = r.doc || r.slug;
          if (!slug) return;
          if (!byWork.has(slug)) byWork.set(slug, []);
          byWork.get(slug).push(r);
        });
        byWork.forEach((passages, slug) => {
          const known = all.find((w) => w.slug === slug);
          collect(slug, known ? known.work : (passages[0] && passages[0].title) || slug, passages);
        });
        finish(fatal);
      })
      .catch(() => { finish(fatal); });

    return { cancel };
  }

  window.MOAuthorPower = { available, note, search };
}());
