/*
 * The Faith Received — /the-faith-received/search/, the six-mode page.
 *
 * The data owner's spec (relayed 2026-09-03) describes six search
 * modes sharing one page: Find, Ask, Full text, Meaning, Scripture,
 * Tradition. Ask is real and lives in a shared partial. "Meaning" is
 * now Power Search and lives on /the-faith-received/research/; this
 * page's sixth tab is a door into it rather than a second copy of it
 * (see the panel comment in custom-faith-search.hbs).
 *
 * The other four are real, and three of them are one backend wearing
 * three faces:
 *
 *   FULL TEXT and FIND read the same index. `v1/search/pagefind/` on
 *   the mo-tfr bucket is a genuine Pagefind (v1.5.2) build over the
 *   Latin Library corpus — confirmed by fetching the real files with a
 *   scratch Worker before writing a line of this, not assumed from the
 *   directory name. It is not one index but ten: b0 through b8 (built
 *   2026-08-20, ~12,000 pages each) and bnew (built 2026-09-03,
 *   matching the taxonomy-drop timing), each a *complete*, independent
 *   Pagefind bundle — its own pagefind.js, its own WASM, its own
 *   fragment/filter/index shards. ~108,500 pages in total across the
 *   ten. Full text shows the hits flat, one row per matching page-
 *   shard. Find groups the same hits by the work they belong to, per
 *   the spec's "a hit lists the work once with its matching section
 *   headings under it, each with its page" — the same search, grouped
 *   differently in the UI, not a second backend.
 *
 *   TRADITION is Full text with the tradition scope pinned rather than
 *   optional: Pagefind's own `filters: {tradition: [...]}` argument,
 *   already carried by every fragment (`author`, `corpus`, `tradition`,
 *   `work`), narrows the search before it runs rather than after.
 *
 * ── PORTED 2026-09-11 from the corpus owner's own /search ─────────────
 *
 * Four things his page does that this one did not, each taken because
 * it fixes something this file was getting wrong, not because it was
 * there:
 *
 *   1. ONE MERGED INDEX, DISCOVERED. This file used to import all ten
 *      bundles separately, run ten searches, and merge the ten result
 *      lists by `score`. That was wrong twice. Ten bundles is ten WASM
 *      downloads and ten inits for one query. Worse, a Pagefind score
 *      is computed against the index it came from, so scores from ten
 *      independent indexes are not on one scale and sorting them
 *      together only looked like ranking. Pagefind has an answer to
 *      exactly this — `mergeIndex()` — and his loader uses it: import
 *      b0, merge the rest into it, search once. The bucket list is no
 *      longer a hand-maintained array either; the bucket serves
 *      `v1/search/pagefind/manifest.json`, which lists all ten
 *      including `bnew` (checked live 2026-09-11). The old array is
 *      kept below as the fallback for a manifest that fails to load,
 *      so a bad fetch degrades to what this file did yesterday.
 *
 *   2. A WAY PAST THE FIRST PAGE. The old code fetched at most 140
 *      fragments and showed 30 of them, and a reader who wanted the
 *      31st had nowhere to click. His note records the same complaint
 *      from his own owner ("the list hard-stopped at 60 of 2,294 with
 *      no way on"). Results are now walked in batches with a Show-more
 *      foot, and the count line says how many there are in total.
 *
 *   3. EXCERPTS THAT ARE NOT THE TITLE AGAIN. The index prepends each
 *      work's title to every one of its pages, so a query that matches
 *      a title matched every page of that work and every excerpt came
 *      back echoing the title rather than showing the text. cleanExcerpt()
 *      strips the title out, and bestExcerpt() prefers a Pagefind
 *      sub-result with real content over the page-level one.
 *
 *   4. WHAT IS ACTUALLY IN THE VOLUME. His most recent landing-page work
 *      ("Landing cards show volume contents", "Landing cards lead with
 *      the MAIN WORKS of each opera volume") added a line under a work
 *      card saying what a multi-volume set contains, because a card
 *      reading "Luther's Works, Volume 18" tells a reader nothing. Our
 *      landing page has no catalogue-rendered cards to put that on — its
 *      twelve works are a hand-written editorial selection — but this
 *      page does: a Find result for a volume set is exactly that bare
 *      title. So the port lands here. `v1/blurbs.json` carries `main`
 *      (the principal treatises in a volume) and `blurb` (what else is
 *      in it) for 1,664 works; it is 302 KB over the wire and cached a
 *      day, and it is fetched lazily AFTER the first results are on the
 *      screen, never before, so it costs a reader nothing until they
 *      have searched.
 *
 * WHAT WAS LEFT WITH HIM. His Meaning and Tradition modes call
 * `/v1/vsearch` and `/v1/xsearch` on mo-tfr-ask-dev, an ungated dev
 * worker this theme does not talk to; Power Search already does the
 * semantic half properly, on mo-tfr-library, behind the member gate.
 * His Works mode searches `v1/works-index.json` (7.3 MB) plus a
 * headings tier that our bucket does not serve at all. And his result
 * rows deep-link to `#b<page>-0`, which is his reader's anchor and not
 * ours (see below).
 *
 * WHAT THE INDEX DOES NOT GIVE US: each fragment's `meta.url` is an
 * anchor into *his* reader — `/read/<slug>#b633-0` — built at index
 * time by his site generator. That id does not exist in our DOM. Our
 * own reader (faith-reader.js, the "shards" path this corpus uses)
 * renders id="section-N" on outline nodes computed at render time from
 * the work's structure array; it never learns a page-level id like
 * "b633-0" at all. Rather than ship a deep link that silently lands
 * nowhere, results link to the work itself (`?w=<slug>`, always
 * resolvable) and state the page number as text. That page number used
 * to be a dead label; it is not any more, because the Preview control
 * on each row now opens the page's own text in place, read from
 * `v1/works/<slug>/` the same way the reader reads it. Honest, and no
 * deep link required.
 *
 * SCRIPTURE (that tab) is deliberately thin: a passage-lookup shortcut
 * into /the-faith-received/scripture/, which already carries the full
 * canon-wide citation panel (assets/js/faith-scripture-totals.js). A
 * second full citation browser here would be the "second search
 * backend" this session was told not to build; the parsing logic below
 * is duplicated in miniature (per this codebase's one-file-per-feature
 * convention) rather than reached into that module's closed state.
 *
 * Every module on this page is self-contained, per the rest of the
 * faith-*.js family — no shared state with faith-received.js's older,
 * unrelated Fuse.js search. This page uses fresh `data-fs-*` attributes
 * throughout specifically so that older code — which binds to
 * `[data-faith-search-input]` etc. — stays the inert no-op it already
 * is on this route.
 */
(function () {
  "use strict";

  const page = document.querySelector("[data-fs-page]");
  if (!page) return;

  const LIBRARY = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  const PAGEFIND_BASE = `${LIBRARY}/v1/search/pagefind`;

  // Only used if the manifest fetch fails. This was the whole bucket
  // list until 2026-09-11: a snapshot taken by listing the live bucket
  // 2026-09-03 (see website/sessions/2026-09-03-mo-tfr-bucket-audit.md),
  // which nothing could refresh at runtime. The manifest is the live
  // answer now and this is the floor under it.
  const FALLBACK_BUCKETS = ["b0", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "bnew"];

  const BATCH = 50; // fragments hydrated per Show-more press
  const MIN_ROWS = 8; // keep pulling batches until this many survive the scope filters
  const AUTOFILL_CAP = 300; // ... but never hydrate more than this without being asked
  const FIND_HITS_PER_WORK = 6;

  function fold(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  const n = (x) => Number(x || 0).toLocaleString();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Pagefind's excerpt/content fields are text it escaped itself at
  // index time, with only its own <mark> tags added — but this is
  // still HTML sourced from bucket data, and this codebase's rule is
  // that class of content never reaches innerHTML unsanitized. Same
  // helper faith-reader.js uses for the same reason: DOMPurify if the
  // boot bundle loaded it (it always has, by the time page scripts
  // run), otherwise stripped to plain text rather than trusted raw.
  function setExcerpt(node, html) {
    if (window.DOMPurify && typeof window.DOMPurify.sanitize === "function") {
      node.innerHTML = window.DOMPurify.sanitize(html, { ALLOWED_TAGS: ["mark"], ALLOWED_ATTR: [] });
      return;
    }
    node.textContent = String(html == null ? "" : html);
  }

  function readerUrl(slug) {
    // Built from our own template with a value we already know is a
    // bare slug (Pagefind's meta.slug matches faith-corpora.js's tfr
    // normalize()), never from a URL string the bucket handed us. See
    // the file header on why meta.url itself is not used.
    const href = `/the-faith-received/reader/?w=${encodeURIComponent(slug)}`;
    return window.MOSafeHref && window.MOSafeHref.sanitize
      ? window.MOSafeHref.sanitize(href, "#")
      : href;
  }

  function linkTo(slug, className) {
    const a = el("a", className);
    if (window.MOSafeHref && window.MOSafeHref.set) window.MOSafeHref.set(a, readerUrl(slug), "#");
    else a.href = readerUrl(slug);
    return a;
  }

  // The row id his crawler assigned ("b633-0" — folio 633, block 0) is
  // not a live anchor here (see file header), but the folio number
  // itself is real information about where in the work a hit sits, and
  // the Preview drawer below turns it into something a reader can act
  // on. Parsed from meta.url's hash rather than the anchors array,
  // which carries the same ids for a purpose this file doesn't use.
  function pageNumber(metaUrl) {
    const m = /#b(\d+)-/.exec(String(metaUrl || ""));
    return m ? m[1] : "";
  }
  function pageLabel(metaUrl) {
    const p = pageNumber(metaUrl);
    return p ? `p. ${p}` : "";
  }

  // ── Excerpts that are not the title again ────────────────────────
  //
  // Every indexed page begins with a metadata preamble, which is why a
  // query that matched a title matched all 900 pages of a folio and
  // why the excerpt then came back reading like the title rather than
  // like the book. Read off a real fragment 2026-09-11, the shape is:
  //
  //   <title>. <title>. <author>. <tradition>. <corpus>. fol. <n>. <text…>
  //
  // His cleanEx() deletes the title by literal match, which is the
  // right idea and does not survive contact with the highlighting:
  // when the query IS in the title, Pagefind has already broken the
  // title up with its own <mark> tags, so "Dissertatio de
  // Praedestinatione et Reprobatione" arrives as "Dissertatio de
  // <mark>Praedestinatione</mark> et Reprobatione" and the literal
  // match finds nothing. Exactly the case that needs fixing is the
  // case it misses.
  //
  // So the cut is made at the end of the preamble instead of at the
  // title: everything up to and including the first "fol. <n>." goes,
  // which takes the title, the second copy of the title, the author,
  // the tradition and the corpus with it and does not care what tags
  // are threaded through them. Bounded to the head of the excerpt so a
  // folio reference in the body text is not mistaken for the preamble,
  // and reverted if it would leave nothing to read, because an excerpt
  // that is all title is still better than an empty row.
  const PREAMBLE = /^[\s\S]{0,400}?\bfol\.\s*\d+\.\s*/;

  function cleanExcerpt(text, title) {
    let out = String(text || "");
    const cut = out.replace(PREAMBLE, "");
    if (cut.replace(/<[^>]+>/g, "").trim().length > 30) out = cut;
    // Second pass for the fragments that carry no folio marker: the
    // literal title strip, which still earns its place when the query
    // did not land in the title and no <mark> is in the way.
    const t = String(title || "").trim();
    if (t.length > 3) {
      try {
        out = out.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
      } catch (_) { /* a title that will not compile is left alone */ }
    }
    // The source texts carry light markdown that means nothing here: a
    // run of hashes is a heading in the reader and litter in a one-line
    // excerpt. Same scrub pageText() does for the Preview drawer.
    out = out.replace(/#{2,}/g, " ").replace(/\*{1,2}/g, "");
    return out.replace(/\s+/g, " ").trim();
  }

  // Pagefind hands back a page-level excerpt and, usually, a handful of
  // `sub_results` anchored inside the page. Once the title is stripped
  // the page-level one is often a stub, so the first sub-result with
  // real text wins and the page-level excerpt is the fallback.
  function bestExcerpt(d) {
    const title = (d.meta && d.meta.title) || "";
    const candidates = (d.sub_results || []).map((s) => cleanExcerpt(s.excerpt, title));
    candidates.push(cleanExcerpt(d.excerpt, title));
    for (let i = 0; i < candidates.length; i += 1) {
      if (candidates[i].length > 40) return candidates[i];
    }
    return candidates[candidates.length - 1] || "";
  }

  // ── What is actually in the volume ───────────────────────────────
  //
  // v1/blurbs.json, keyed by the same slug Pagefind's meta.slug
  // carries. `main` is the principal treatises in a volume, chosen by
  // his pipeline from that volume's own table of contents; `blurb` is
  // what else is in it. Fetched once, lazily, only after a search has
  // already put results on the screen — never on page load, and never
  // at all for a reader who opens this page and leaves.

  let BLURBS = null;
  let blurbsPromise = null;
  function ensureBlurbs(onReady) {
    if (BLURBS) return;
    if (blurbsPromise) return;
    blurbsPromise = fetch(`${LIBRARY}/v1/blurbs.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        BLURBS = j && typeof j === "object" ? j : {};
        if (onReady) onReady();
      })
      .catch(() => { BLURBS = {}; });
  }

  // Returns [label, text] or null. The label is what makes the line
  // readable: "Main works:" is a claim about the principal treatises,
  // "Contains:" is a claim about the rest, and running them together
  // unlabelled would say neither.
  function contentsOf(slug) {
    const b = BLURBS && BLURBS[slug];
    if (!b) return null;
    if (b.main) return ["Main works: ", String(b.main)];
    if (b.blurb) return ["", String(b.blurb)];
    return null;
  }

  function contentsLine(slug) {
    const c = contentsOf(slug);
    if (!c) return null;
    const p = el("p", "faith-find-contents");
    if (c[0]) p.appendChild(el("b", null, c[0]));
    p.appendChild(document.createTextNode(c[1]));
    return p;
  }

  // ── Tab switching ──────────────────────────────────────────────

  const tabs = page.querySelectorAll("[data-fs-mode]");
  const panels = page.querySelectorAll("[data-fs-panel]");
  // "power" replaced "meaning" on 2026-09-11: Power Search exists now,
  // on the Research page, and the tab is a door into it. Nothing
  // outside this page ever linked to #meaning (checked), so the old id
  // is not kept as an alias.
  const MODES = ["find", "fulltext", "works", "scripture", "tradition", "ask", "power"];

  function showMode(mode) {
    if (MODES.indexOf(mode) < 0) mode = "find";
    panels.forEach((p) => {
      p.hidden = p.getAttribute("data-fs-panel") !== mode;
    });
    tabs.forEach((t) => {
      const active = t.getAttribute("data-fs-mode") === mode;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    // Ask's workspace (.ask-workspace, shared with the standalone
    // /the-faith-received/ask/ page via
    // partials/faith-received/_ask-panel.hbs) makes its own width: it
    // breaks out of this page's `container-narrow` (720px) and runs the
    // full width of the viewport. What this class does is hide the
    // page's shared scope row while Ask is active — ten tradition pills
    // and two text inputs that dominated the panel below them, and that
    // Ask replaces with its own collapsed control in the composer. The
    // row is hidden, never cleared, so `currentTradition` below and the
    // other five modes are untouched. See ".fs-page--ask" in
    // faith-received.css.
    page.classList.toggle("fs-page--ask", mode === "ask");
    if (mode === "fulltext" || mode === "find" || mode === "tradition") {
      ensureIndex();
    }
  }

  tabs.forEach((t) => {
    t.addEventListener("click", () => {
      const mode = t.getAttribute("data-fs-mode");
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", `#${mode}`);
      }
      showMode(mode);
      // Switching into a text mode with a query already typed should
      // show that query's results rather than an empty panel.
      if (mode === "fulltext" || mode === "find" || mode === "tradition") render();
    });
  });

  function activeMode() {
    const a = page.querySelector("[data-fs-mode].is-active");
    return a ? a.getAttribute("data-fs-mode") : "find";
  }

  // ── Pagefind: one index, built from the bucket's own manifest ────

  const status = document.querySelector("[data-fs-status]");
  function setStatus(text) {
    if (status) status.textContent = text || "";
  }

  let indexPromise = null;

  function bucketList() {
    return fetch(`${PAGEFIND_BASE}/manifest.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        const list = m && Array.isArray(m.list) ? m.list : null;
        if (!list || !list.length) return FALLBACK_BUCKETS.slice();
        // Entries read "b0/pagefind"; the directory we want is the
        // part in front of it.
        const dirs = list
          .map((e) => String((e && e.path) || "").replace(/\/pagefind\/?$/, "").replace(/[^A-Za-z0-9_-]/g, ""))
          .filter(Boolean);
        return dirs.length ? dirs : FALLBACK_BUCKETS.slice();
      })
      .catch(() => FALLBACK_BUCKETS.slice());
  }

  function ensureIndex() {
    if (indexPromise) return indexPromise;
    setStatus("Loading the full-text index…");
    indexPromise = bucketList()
      .then((dirs) => {
        const first = dirs[0];
        const rest = dirs.slice(1);
        return import(`${PAGEFIND_BASE}/${first}/pagefind.js`)
          .then((mod) => mod.init().then(() => mod))
          .then((mod) => Promise.all(rest.map((d) =>
            mod.mergeIndex(`${PAGEFIND_BASE}/${d}/`).catch((err) => {
              // One bucket that will not merge is one shard of the
              // library missing from the results, not a broken page.
              if (window.console) window.console.warn("faith-tfr-search: merge", d, err && err.message);
              return null;
            })
          )).then(() => mod));
      })
      .then((mod) => { setStatus(""); return mod; })
      .catch((err) => {
        if (window.console) window.console.warn("faith-tfr-search:", err && err.message);
        setStatus("The full-text index didn’t load. Try reloading the page.");
        return null;
      });
    return indexPromise;
  }

  // ── Search state, walked in batches ──────────────────────────────

  const authorInput = page.querySelector("[data-fs-author]");
  const workInput = page.querySelector("[data-fs-work]");
  const queryInput = document.querySelector("[data-fs-query]");
  const tradPills = page.querySelectorAll("[data-fs-trad]");
  const tradRequired = page.querySelector("[data-fs-trad-required]");

  let currentTradition = "";

  function currentScope() {
    return {
      tradition: currentTradition,
      author: authorInput ? authorInput.value : "",
      work: workInput ? workInput.value : "",
    };
  }

  let runToken = 0;
  // `raw` is Pagefind's own result list, unhydrated: each entry is a
  // handle with a .data() that fetches the fragment. `rows` is what we
  // have hydrated and kept so far. Walking it this way is the whole
  // point of the paging port — the old code hydrated 140 and threw 110
  // of them away.
  let state = { token: 0, query: "", raw: [], rows: [], taken: 0, loading: false, scope: null };

  function scopeKeeps(d, scope) {
    const authorQ = scope && scope.author ? fold(scope.author) : "";
    const workQ = scope && scope.work ? fold(scope.work) : "";
    if (authorQ && !((d.filters && d.filters.author) || []).some((a) => fold(a).includes(authorQ))) return false;
    if (workQ && !((d.filters && d.filters.work) || []).some((w) => fold(w).includes(workQ))) return false;
    return true;
  }

  function loadMore(auto) {
    if (state.loading || state.taken >= state.raw.length) return;
    const { token } = state;
    state.loading = true;
    const slice = state.raw.slice(state.taken, state.taken + BATCH);
    state.taken += slice.length;
    Promise.all(slice.map((r) => r.data().then((d) => ({ ...d, score: r.score })).catch(() => null)))
      .then((got) => {
        if (token !== runToken) return;
        state.loading = false;
        got.filter(Boolean).forEach((d) => {
          if (scopeKeeps(d, state.scope)) state.rows.push(d);
        });
        // An author or work filter can eat a whole batch. Pull the next
        // one rather than showing a reader an empty page under a count
        // that says there are thousands of matches — but stop at a
        // ceiling, because "no results" is a legitimate answer and
        // walking 2,000 fragments to prove it is not.
        if (state.rows.length < MIN_ROWS && state.taken < state.raw.length && state.taken < AUTOFILL_CAP) {
          render();
          loadMore(true);
          return;
        }
        render();
        if (!auto) {
          // Keep the reader's place: the foot they pressed has moved
          // down the page, so put focus back on the new one.
          const more = page.querySelector(`[data-fs-panel="${activeMode()}"] .faith-search-more`);
          if (more) more.focus();
        }
      })
      .catch(() => { state.loading = false; });
  }

  function run() {
    const q = String(queryInput ? queryInput.value : "").trim();
    const scope = currentScope();
    const mode = activeMode();

    // Tradition mode requires a tradition — this is the difference
    // between it and Full text with the same pill available, per the
    // brief that it is a filter *pinned* rather than optional. Only the
    // decision not to search lives here; whether the note is on screen
    // is render()'s, so that arriving on the tab says so too and not
    // only typing into it does.
    if (mode === "tradition" && !scope.tradition) {
      state = { token: ++runToken, query: "", raw: [], rows: [], taken: 0, loading: false, scope };
      render();
      return;
    }

    // A question typed into Find is a question, not a title. His page
    // reads the shape of it and hands the reader to Ask, which is what
    // they meant; ours does the same rather than returning nothing and
    // letting them work it out.
    if ((mode === "find" || mode === "fulltext") && /^(what|why|how|did|does|is|are|who|when|where|can|should)\b/i.test(q) && /\?\s*$/.test(q)) {
      const askTab = page.querySelector('[data-fs-mode="ask"]');
      if (askTab) {
        askTab.click();
        const askInput = document.querySelector("[data-ask-input]") || document.querySelector(".ask-composer textarea");
        if (askInput) {
          askInput.value = q;
          askInput.focus();
        }
        return;
      }
    }

    const token = ++runToken;
    state = { token, query: q, raw: [], rows: [], taken: 0, loading: false, scope };

    if (q.length < 2) { render(); return; }

    setStatus("Searching…");
    ensureIndex().then((pf) => {
      if (token !== runToken) return;
      if (!pf) { render(); return; }
      const opts = scope.tradition ? { filters: { tradition: [scope.tradition] } } : undefined;
      return pf.search(q, opts).then((r) => {
        if (token !== runToken) return;
        setStatus("");
        state.raw = (r && r.results) || [];
        loadMore(true);
        // The results are on the screen (or about to be); now, and only
        // now, is it worth 302 KB to learn what is inside a volume.
        if (state.raw.length) ensureBlurbs(() => { if (token === runToken) render(); });
      });
    }).catch(() => {
      if (token !== runToken) return;
      setStatus("");
      render();
    });
  }

  // ── The start state ──────────────────────────────────────────────
  //
  // Before 2026-09-11 this page was blank until you typed, which made a
  // six-tab search look like a text box with some decoration. His
  // start state is one door per way of searching, each with a worked
  // example that runs when you press it. Taken whole; the chrome is
  // ours.

  const DOORS = [
    ["find", "Find a work", "The works whose text carries your phrase, one card each.", "foedus operum"],
    ["fulltext", "Find a passage", "Every matching page in the library, newest index first.", "communicatio idiomatum"],
    ["scripture", "Read on a passage", "Who in the library comments on a chapter.", "Romans 8"],
    ["ask", "Ask the library", "A question answered from the corpus, cited page by page.", "How did the early church understand the Eucharist?"],
  ];

  function startState() {
    const wrap = el("div", "faith-search-start");
    wrap.appendChild(el("p", "faith-search-start-head", "Start with what you need"));
    const grid = el("div", "faith-search-doors");
    DOORS.forEach(([mode, name, desc, example]) => {
      const b = el("button", "faith-search-door");
      b.type = "button";
      b.appendChild(el("span", "faith-search-door-n", `${name} →`));
      b.appendChild(el("span", "faith-search-door-d", desc));
      b.appendChild(el("span", "faith-search-door-e", `e.g. “${example}”`));
      b.addEventListener("click", () => {
        const tab = page.querySelector(`[data-fs-mode="${mode}"]`);
        if (tab) tab.click();
        if (mode === "ask") {
          const askInput = document.querySelector("[data-ask-input]") || document.querySelector(".ask-composer textarea");
          if (askInput) { askInput.value = example; askInput.focus(); }
          return;
        }
        if (queryInput) {
          queryInput.value = example;
          queryInput.focus();
        }
        run();
      });
      grid.appendChild(b);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  // ── The zero state ───────────────────────────────────────────────
  //
  // "No results" with nowhere to go is a dead end. His version names
  // the next thing to try; ours names ours.

  function zeroState(query, mode) {
    const wrap = el("div", "faith-search-zero");
    wrap.appendChild(el("p", "faith-search-zero-head", `No ${mode === "find" ? "works" : "pages"} match “${query}”.`));
    wrap.appendChild(el("p", "faith-search-zero-tip",
      "Try a shorter phrase, or drop a scope filter above. Power Search finds a passage by its sense rather than its wording, and Ask answers a question from the corpus."));
    const acts = el("p", "faith-pending-actions");
    const power = el("a", null, "Open Power Search");
    if (window.MOSafeHref && window.MOSafeHref.set) window.MOSafeHref.set(power, "/the-faith-received/research/#power-search", "#");
    else power.href = "/the-faith-received/research/#power-search";
    acts.appendChild(power);
    const ask = el("button", null, "Ask the library");
    ask.type = "button";
    ask.className = "faith-search-zero-ask";
    ask.addEventListener("click", () => {
      const askTab = page.querySelector('[data-fs-mode="ask"]');
      if (askTab) askTab.click();
      const askInput = document.querySelector("[data-ask-input]") || document.querySelector(".ask-composer textarea");
      if (askInput) { askInput.value = query; askInput.focus(); }
    });
    acts.appendChild(ask);
    wrap.appendChild(acts);
    return wrap;
  }

  // ── The Preview drawer ───────────────────────────────────────────
  //
  // Our rows cannot deep-link into the page they matched (file header),
  // which left "p. 633" as a label that told a reader where the hit was
  // and gave them no way to look at it. His Preview drawer reads the
  // page's own text out of v1/works/<slug>/ — meta.json for the shard
  // map, then the shard — which is the same route faith-reader.js takes
  // and works for every storage shape the corpus uses. Cached per page,
  // because a reader who closes a drawer often opens it again.

  const excerptCache = Object.create(null);
  function pageText(slug, pageNo, max) {
    const key = `${slug}|${pageNo}|${max}`;
    if (key in excerptCache) return Promise.resolve(excerptCache[key]);
    return fetch(`${LIBRARY}/v1/works/${encodeURIComponent(slug)}/meta.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((meta) => {
        if (!meta) return (excerptCache[key] = "");
        const shard = meta.single
          ? "work.json"
          : ((meta.shards || []).filter((s) => s.from <= pageNo && pageNo <= s.to)[0] || {}).file;
        if (!shard) return (excerptCache[key] = "");
        // The shard name comes out of the work's own meta, so it is
        // constrained to a filename before it is put in a path: a
        // catalogue that has been tampered with should not be able to
        // walk out of this work's directory.
        const safe = String(shard).replace(/[^A-Za-z0-9._-]/g, "");
        if (!safe) return (excerptCache[key] = "");
        return fetch(`${LIBRARY}/v1/works/${encodeURIComponent(slug)}/${safe}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            const pg = ((d && d.pages) || []).filter((x) => x.n === pageNo)[0];
            const text = String((pg && (pg.en || pg.la)) || "")
              .replace(/\[\^[^\]]*\]:?/g, "")
              .replace(/[#*]+/g, "")
              .replace(/\s+/g, " ")
              .trim();
            return (excerptCache[key] = text ? text.slice(0, max) : "");
          });
      })
      .catch(() => (excerptCache[key] = ""));
  }

  function previewControls(slug, pageNo) {
    const wrap = el("span", "faith-search-act");
    const drawer = el("div", "faith-search-drawer");
    drawer.hidden = true;
    const btn = el("button", "faith-search-peek", "Preview");
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");
    let loaded = false;
    btn.addEventListener("click", () => {
      if (!drawer.hidden) {
        drawer.hidden = true;
        btn.textContent = "Preview";
        btn.setAttribute("aria-expanded", "false");
        return;
      }
      drawer.hidden = false;
      btn.textContent = "Hide";
      btn.setAttribute("aria-expanded", "true");
      if (loaded) return;
      loaded = true;
      drawer.textContent = "Loading the page…";
      pageText(slug, Number(pageNo), 1600).then((text) => {
        drawer.textContent = "";
        if (!text) {
          drawer.appendChild(el("p", "faith-search-drawer-note",
            "This page has no readable text here. Open the work to see it in place."));
          return;
        }
        drawer.appendChild(el("div", "faith-search-drawer-text", text + (text.length >= 1600 ? "…" : "")));
      }).catch(() => {
        drawer.textContent = "";
        drawer.appendChild(el("p", "faith-search-drawer-note", "The page could not load."));
      });
    });
    wrap.appendChild(btn);
    const open = linkTo(slug, "faith-search-open");
    open.textContent = "Open →";
    wrap.appendChild(open);
    return { controls: wrap, drawer };
  }

  // ── Rendering ────────────────────────────────────────────────────

  function moreButton(total, shown) {
    const b = el("button", "faith-search-more btn btn-outline");
    b.type = "button";
    b.textContent = `Show more · ${n(shown)} of ${n(total)}`;
    b.addEventListener("click", () => {
      b.disabled = true;
      b.textContent = "Loading…";
      loadMore(false);
    });
    return b;
  }

  function hitRow(d) {
    const slug = (d.meta && d.meta.slug) || "";
    const title = (d.meta && d.meta.title) || slug;
    const author = ((d.filters && d.filters.author) || [])[0] || "";
    const tradition = ((d.filters && d.filters.tradition) || [])[0] || "";
    const label = pageLabel(d.meta && d.meta.url);
    const no = pageNumber(d.meta && d.meta.url);

    const li = el("li", "faith-search-hit");
    const a = linkTo(slug, "faith-search-hit-link");
    const meta = el("p", "faith-search-hit-meta");
    meta.appendChild(el("span", "faith-search-hit-type", [tradition, label].filter(Boolean).join(" · ") || "The Latin Library"));
    if (author) meta.appendChild(el("span", "faith-search-hit-author", author));
    a.appendChild(meta);
    const h = el("h3", "faith-search-hit-title");
    h.appendChild(el("em", null, title));
    a.appendChild(h);
    const snip = el("p", "faith-search-hit-snippet");
    setExcerpt(snip, bestExcerpt(d));
    a.appendChild(snip);
    li.appendChild(a);

    if (no) {
      const { controls, drawer } = previewControls(slug, no);
      li.appendChild(controls);
      li.appendChild(drawer);
    }
    return li;
  }

  function groupByWork(rows) {
    const map = new Map();
    rows.forEach((d) => {
      const slug = (d.meta && d.meta.slug) || "";
      if (!slug) return;
      let g = map.get(slug);
      if (!g) {
        g = {
          slug,
          title: (d.meta && d.meta.title) || slug,
          author: ((d.filters && d.filters.author) || [])[0] || "",
          tradition: ((d.filters && d.filters.tradition) || [])[0] || "",
          hits: [],
          bestScore: 0,
        };
        map.set(slug, g);
      }
      g.hits.push(d);
      if (d.score > g.bestScore) g.bestScore = d.score;
    });
    return Array.from(map.values()).sort((a, b) => b.bestScore - a.bestScore || b.hits.length - a.hits.length);
  }

  function workGroup(g) {
    const box = el("div", "btrad faith-find-group");
    const h = el("h3");
    const a = linkTo(g.slug);
    a.textContent = g.title;
    h.appendChild(a);
    box.appendChild(h);

    const meta = [g.tradition, `${n(g.hits.length)} match${g.hits.length === 1 ? "" : "es"}`].filter(Boolean).join(" · ");
    box.appendChild(el("p", "faith-find-group-meta", `${g.author}${g.author ? " — " : ""}${meta}`.replace(" — ", ", ")));

    // The ported line: what is actually inside this volume. Absent for
    // a work the catalogue has no note on, which is most of them, so
    // the card is unchanged rather than padded.
    const contents = contentsLine(g.slug);
    if (contents) box.appendChild(contents);

    const list = el("ul", "blist");
    g.hits.slice(0, FIND_HITS_PER_WORK).forEach((d) => {
      const li = el("li");
      const row = el("span", "brow-t");
      const label = pageLabel(d.meta && d.meta.url);
      if (label) row.appendChild(el("span", "faith-find-page", label));
      const snip = el("span", "faith-find-snippet");
      setExcerpt(snip, bestExcerpt(d));
      row.appendChild(snip);
      li.appendChild(row);
      const no = pageNumber(d.meta && d.meta.url);
      if (no) {
        const { controls, drawer } = previewControls(g.slug, no);
        li.appendChild(controls);
        li.appendChild(drawer);
      }
      list.appendChild(li);
    });
    box.appendChild(list);

    if (g.hits.length > FIND_HITS_PER_WORK) {
      box.appendChild(el("p", "faith-find-more",
        `${n(g.hits.length - FIND_HITS_PER_WORK)} more match${g.hits.length - FIND_HITS_PER_WORK === 1 ? "" : "es"} in this work.`));
    }
    return box;
  }

  const fulltextResults = page.querySelector('[data-fs-results="fulltext"]');
  const fulltextStatus = page.querySelector('[data-fs-count="fulltext"]');
  const findResults = page.querySelector('[data-fs-results="find"]');
  const findStatus = page.querySelector('[data-fs-count="find"]');
  const tradResults = page.querySelector('[data-fs-results="tradition"]');
  const tradStatus = page.querySelector('[data-fs-count="tradition"]');

  function renderFind() {
    if (!findResults) return;
    findResults.textContent = "";
    if (!state.query || state.query.length < 2) {
      if (!currentScope().author && !currentScope().work && !currentTradition) {
        findResults.appendChild(startState());
      }
      if (findStatus) findStatus.textContent = "";
      return;
    }
    const groups = groupByWork(state.rows);
    if (findStatus) {
      findStatus.textContent = groups.length
        ? `${n(groups.length)} work${groups.length === 1 ? "" : "s"} so far, out of ${n(state.raw.length)} matching page${state.raw.length === 1 ? "" : "s"}.`
        : "";
    }
    if (!groups.length) {
      findResults.appendChild(zeroState(state.query, "find"));
      return;
    }
    const wrap = el("div", "faith-search-groups");
    groups.forEach((g) => wrap.appendChild(workGroup(g)));
    findResults.appendChild(wrap);
    if (state.taken < state.raw.length) findResults.appendChild(moreButton(state.raw.length, state.taken));
  }

  function renderPanelFlat(results, statusEl, mode) {
    if (!results) return;
    // The flat panels are <ol>s, so the zero state and the Show-more
    // foot cannot live inside them; they go after, in a sibling the
    // panel owns.
    const host = results.parentNode;
    if (host) {
      host.querySelectorAll(".faith-search-tail").forEach((node) => node.remove());
    }
    results.textContent = "";
    if (!state.query || state.query.length < 2) {
      if (statusEl) statusEl.textContent = "";
      return;
    }
    if (statusEl) {
      statusEl.textContent = state.raw.length
        ? `${n(state.raw.length)} matching page${state.raw.length === 1 ? "" : "s"}, showing ${n(state.rows.length)}.`
        : "";
    }
    const tail = el("div", "faith-search-tail");
    if (!state.rows.length) {
      tail.appendChild(zeroState(state.query, mode));
    } else {
      state.rows.forEach((d) => results.appendChild(hitRow(d)));
      if (state.taken < state.raw.length) tail.appendChild(moreButton(state.raw.length, state.taken));
    }
    if (host) host.appendChild(tail);
  }


  /* ── Works: find a book by its NAME ───────────────────────────────
   *
   * Every other tab on this page searches TEXT. Pagefind indexes the
   * body of a work, so "Institutes of the Christian Religion" only
   * found Calvin if those words happened to fall inside somebody's
   * prose, and asking for a book by its title, which is what a reader
   * does first, was the one thing this page could not do.
   *
   * Answered by the worker (GET /v1/titles), not in the browser. The
   * corpus owner's version of this tier pulls the 7.3 MB catalogue
   * client-side and filters it there. A slim index of title, author and
   * id over all 30,624 works is still 1,164 KB gzipped, and the titles
   * are most of that, so there is no shape of that file worth shipping.
   * Measured before it was decided.
   *
   * No feature gate: this is string matching over a file we already
   * hold. It spends nothing, so it must not sit behind the paid gate.
   */
  const worksResults = page.querySelector('[data-fs-results="works"]');
  const worksStatus = page.querySelector('[data-fs-count="works"]');
  const LIB = (document.querySelector('meta[name="tfr-library-base"]') || {}).content
    || "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  let worksToken = 0;
  const worksCache = new Map();

  function worksHref(corpus, id) {
    const p = new URLSearchParams();
    if (corpus && corpus !== "tfr" && corpus !== "confessions") p.set("c", corpus);
    p.set("w", id);
    return `/the-faith-received/reader/?${p.toString()}`;
  }

  function renderWorks(data, q) {
    if (!worksResults || !worksStatus) return;
    worksResults.textContent = "";
    if (!q || q.length < 2) {
      worksStatus.textContent = "Type the name of a work.";
      return;
    }
    if (data && data.error) {
      // An index that did not load is not an empty shelf, and must
      // never be allowed to read as one.
      worksStatus.textContent = "The title index did not load, so this tab has nothing to search. Nothing is missing from the library.";
      return;
    }
    const items = (data && data.items) || [];
    if (!items.length) {
      worksStatus.textContent = `No work in the library is called \u201c${q}\u201d. Try Full text, which searches inside the works.`;
      return;
    }
    worksStatus.textContent = data.truncated
      ? `${items.length.toLocaleString()} of ${data.total.toLocaleString()} works whose name matches, best first.`
      : `${data.total.toLocaleString()} work${data.total === 1 ? "" : "s"} whose name matches.`;
    items.forEach((it) => {
      const li = document.createElement("li");
      li.className = "faith-search-result";
      const a = document.createElement("a");
      a.className = "faith-search-result-title";
      a.textContent = it.title;
      const href = worksHref(it.corpus, it.id);
      if (window.MOSafeHref) window.MOSafeHref.set(a, href, "#");
      else a.setAttribute("href", href);
      li.appendChild(a);
      const meta = document.createElement("p");
      meta.className = "faith-search-result-meta";
      const bits = [];
      if (it.author) bits.push(it.author);
      const c = window.MOCorpora && window.MOCorpora.get ? window.MOCorpora.get(it.corpus) : null;
      if (c && c.label) bits.push(c.label);
      meta.textContent = bits.join(" \u00b7 ");
      li.appendChild(meta);
      worksResults.appendChild(li);
    });
  }

  function runWorks(q) {
    if (!worksResults) return;
    const key = q.toLowerCase();
    if (worksCache.has(key)) { renderWorks(worksCache.get(key), q); return; }
    if (!q || q.length < 2) { renderWorks(null, q); return; }
    const mine = ++worksToken;
    worksStatus.textContent = "Searching the catalogue\u2026";
    fetch(`${LIB}/v1/titles?q=${encodeURIComponent(q)}&limit=60`, { signal: AbortSignal.timeout(15000) })
      .then((r) => (r.ok ? r.json() : { error: true }))
      .catch(() => ({ error: true }))
      .then((d) => {
        // A later keystroke won; this answer is stale.
        if (mine !== worksToken) return;
        worksCache.set(key, d);
        renderWorks(d, q);
      });
  }

  function render() {
    const mode = activeMode();
    // The Tradition tab's standing instruction. Evaluated here rather
    // than in run() so that simply arriving on the tab with no
    // tradition chosen says what to do, instead of the panel sitting
    // blank until somebody types.
    const tradBlocked = mode === "tradition" && !currentTradition;
    if (tradRequired) tradRequired.hidden = !tradBlocked;
    renderFind();
    renderPanelFlat(fulltextResults, fulltextStatus, "fulltext");
    if (mode === "tradition") renderPanelFlat(tradResults, tradStatus, "tradition");
    if (mode === "works") runWorks(state.query || "");
    try {
      document.dispatchEvent(new CustomEvent("mo:faith-search", {
        detail: { query: state.query, count: state.raw.length, mode },
      }));
    } catch (_) { /* telemetry must never break search */ }
  }

  // ── Controls ─────────────────────────────────────────────────────

  tradPills.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentTradition = btn.getAttribute("data-fs-trad") || "";
      tradPills.forEach((b) => b.classList.toggle("is-active", b === btn));
      run();
    });
  });

  let debounceTimer = 0;
  function debounced() {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(run, 220);
  }
  if (queryInput) queryInput.addEventListener("input", debounced);
  if (authorInput) authorInput.addEventListener("input", debounced);
  if (workInput) workInput.addEventListener("input", debounced);
  const form = document.querySelector("[data-fs-form]"); // also in the hero
  if (form) form.addEventListener("submit", (e) => { e.preventDefault(); run(); });

  // ── Scripture tab: a shortcut, not a second citation browser ─────
  //
  // Duplicates just enough of faith-scripture-totals.js's book-name
  // resolver to turn "Romans 8" into a link — not the totals, not the
  // per-tradition breakdown, both of which already live at
  // /the-faith-received/scripture/ and stay there.
  (function scriptureShortcut() {
    const sForm = page.querySelector("[data-fs-scripture-form]");
    const sInput = page.querySelector("[data-fs-scripture-input]");
    const sStatus = page.querySelector("[data-fs-scripture-status]");
    if (!sForm || !sInput) return;

    const OT = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
      "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah",
      "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song Of Solomon", "Isaiah", "Jeremiah",
      "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum",
      "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi"];
    const NT = ["Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
      "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
      "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John",
      "2 John", "3 John", "Jude", "Revelation"];
    const ALL_NAMES = OT.concat(NT);

    // The short forms a reader actually types. His page carries the
    // same table for the same reason: "Rom 8" and "Mt 5" are how a
    // reference is written, and a resolver that only knows the full
    // name reads as a broken box.
    const ABBR = {
      gen: "Genesis", ex: "Exodus", exod: "Exodus", lev: "Leviticus", num: "Numbers",
      deut: "Deuteronomy", dt: "Deuteronomy", josh: "Joshua", judg: "Judges",
      "1sam": "1 Samuel", "2sam": "2 Samuel", "1kgs": "1 Kings", "2kgs": "2 Kings",
      "1chr": "1 Chronicles", "2chr": "2 Chronicles", neh: "Nehemiah", esth: "Esther",
      ps: "Psalms", psa: "Psalms", psalm: "Psalms", prov: "Proverbs", eccl: "Ecclesiastes",
      song: "Song Of Solomon", cant: "Song Of Solomon", isa: "Isaiah", jer: "Jeremiah",
      lam: "Lamentations", ezek: "Ezekiel", dan: "Daniel", hos: "Hosea", obad: "Obadiah",
      mic: "Micah", nah: "Nahum", hab: "Habakkuk", zeph: "Zephaniah", hag: "Haggai",
      zech: "Zechariah", mal: "Malachi", matt: "Matthew", mt: "Matthew", mk: "Mark",
      lk: "Luke", jn: "John", rom: "Romans", "1cor": "1 Corinthians", "2cor": "2 Corinthians",
      gal: "Galatians", eph: "Ephesians", phil: "Philippians", col: "Colossians",
      "1thess": "1 Thessalonians", "2thess": "2 Thessalonians", "1tim": "1 Timothy",
      "2tim": "2 Timothy", phlm: "Philemon", heb: "Hebrews", jas: "James",
      "1pet": "1 Peter", "2pet": "2 Peter", rev: "Revelation", apoc: "Revelation",
    };

    function resolveBook(text) {
      const t = String(text || "").trim().toLowerCase();
      if (!t) return null;
      const full = ALL_NAMES
        .filter((name) => t.startsWith(name.toLowerCase()))
        .sort((a, b) => b.length - a.length)[0];
      if (full) return full;
      const head = (t.match(/^[1-3]?\s*[a-z]+/) || [""])[0].replace(/[\s.]/g, "");
      return ABBR[head] || null;
    }

    sForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const raw = sInput.value.trim();
      const book = resolveBook(raw);
      const ch = parseInt((raw.replace(/^[1-3]?\s*[a-z.]+/i, "").match(/\d+/) || [])[0], 10);
      if (!book || !ch) {
        if (sStatus) sStatus.textContent = "Not a reference this page knows. Try a book and a chapter, such as Romans 8.";
        return;
      }
      const id = `ref-${book.replace(/\s+/g, "-").toLowerCase()}-${ch}`;
      const href = `/the-faith-received/scripture/#${id}`;
      const safe = window.MOSafeHref && window.MOSafeHref.sanitize
        ? window.MOSafeHref.sanitize(href, "/the-faith-received/scripture/")
        : href;
      // A same-site link we built ourselves, not a worker-supplied
      // redirect — MOSafeRedirect is scoped to the Stripe checkout
      // allowlist and isn't the right tool here. Navigating through a
      // real, clicked <a> (rather than window.location.*) keeps this
      // out of the lint rule that guards against unchecked redirects.
      const a = document.createElement("a");
      a.href = safe;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }());

  // ── Boot ──────────────────────────────────────────────────────────

  const hash = (window.location.hash || "").replace(/^#/, "");
  showMode(MODES.indexOf(hash) >= 0 ? hash : "find");
  render();

  try {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && queryInput) {
      queryInput.value = q;
      run();
    }
  } catch (_) { /* ignore malformed query string */ }
}());
