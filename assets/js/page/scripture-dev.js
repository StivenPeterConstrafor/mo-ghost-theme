/*
 * /the-faith-received/scripture/ — the chapter reader with a verse sidebar.
 *
 * The chapter is typeset exactly as the old /bible/ page set it (the
 * .bible-* rules still ship in screen.css), and every verse is a
 * button. Clicking one opens the sidebar: the verse's address, a link
 * to its Verse Desk, how many times the library cites it, filters by
 * tradition, author and century, a search over its citations, and the
 * five works that cite it most, each previewable in place.
 *
 * Address: ?ref=john.3 or ?ref=john.3.16 (&t=NIV). A verse in the
 * address opens with the sidebar showing it, so a Verse Desk's "Back to
 * the chapter" lands where the reader left.
 *
 * Wide screens: the sidebar is a column beside the text that scrolls on
 * its own (the recorded sidebar exception). Below 900px there is no room
 * for a column, so the same panel is moved into the text directly after
 * the block holding the verse, and the page scrolls (Ian, 2026-09-22:
 * "Expand under the verse").
 */
(function () {
  "use strict";
  const S = window.MOScriptureDev;
  if (!S) return;
  const { esc, fmt, plural } = S;

  const $root = document.querySelector("[data-sd-reader]");
  if (!$root) return;
  const $book = $root.querySelector("[data-sd-book]");
  const $chapter = $root.querySelector("[data-sd-chapter]");
  const $trans = $root.querySelector("[data-sd-translation]");
  const $prev = $root.querySelector("[data-sd-prev]");
  const $next = $root.querySelector("[data-sd-next]");
  const $commToggle = $root.querySelector("[data-sd-comm-toggle]");
  const $commCount = $root.querySelector("[data-sd-comm-count]");
  const $commPanel = $root.querySelector("[data-sd-comm-panel]");
  const $layout = $root.querySelector("[data-sd-layout]");
  const $text = $root.querySelector("[data-sd-text]");
  const $side = $root.querySelector("[data-sd-side]");
  const $attr = $root.querySelector("[data-sd-attribution]");

  const narrow = window.matchMedia("(max-width: 899px)");

  // The sidebar sticks under the bar, whose height changes as it wraps.
  const $bar = $root.querySelector(".sd-bar");
  // The site header is fixed over the page; sticky things park under it
  // (the CSS drops the offset while header-behaviors.js has it hidden).
  const $header = document.querySelector(".site-header");
  const measureBar = () => {
    $root.style.setProperty("--sd-bar-h", `${Math.ceil($bar.getBoundingClientRect().height)}px`);
    const fixed = $header && getComputedStyle($header).position === "fixed";
    $root.style.setProperty("--sd-nav-h", fixed ? `${$header.offsetHeight}px` : "0px");
  };
  if ($bar) {
    measureBar();
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(measureBar);
      ro.observe($bar);
      if ($header) ro.observe($header);
    }
  }
  const state = { book: null, c: 0, v: 0, t: S.recalledTranslation() };
  let loadRun = 0;
  let hinted = false;
  let comm = null;

  // ── Controls ──────────────────────────────────────────────────
  $trans.innerHTML = S.TRANSLATIONS.map((t) => `<option value="${t[0]}">${esc(t[1])} · ${esc(t[2])}</option>`).join("");
  $book.innerHTML = S.BOOKS.map((b) => `<option value="${b.slug}">${esc(b.name)}</option>`).join("");
  function fillChapters(book) {
    let h = "";
    for (let n = 1; n <= book.chapters; n++) h += `<option value="${n}">${n}</option>`;
    $chapter.innerHTML = h;
  }

  // ── The chapter ───────────────────────────────────────────────
  function load(book, c, v, push) {
    const my = ++loadRun;
    const changedChapter = !state.book || state.book !== book || state.c !== c;
    state.book = book; state.c = c; state.v = v || 0;
    $book.value = book.slug;
    fillChapters(book);
    $chapter.value = String(c);
    $trans.value = state.t;
    $prev.disabled = book.num === 1 && c === 1;
    $next.disabled = book.num === 66 && c === book.chapters;
    writeUrl(push);
    document.title = `${S.refLabel(book, c)} | Scripture | The Faith Received | Mere Orthodoxy`;

    // closePanel() clears state.v, so the verse asked for is held here
    // and reopened once the chapter has arrived.
    const wantVerse = state.v;
    // Same chapter, new translation: keep the open panel and whatever
    // the reader had filtered or typed. Read before the text is replaced,
    // because on a phone the panel lives inside the text.
    const keepPanel = !changedChapter && Boolean(wantVerse) && $panel.isConnected;
    if (changedChapter) closePanel(true);
    $text.innerHTML = `<p class="bible-status" role="status">Loading ${esc(S.refLabel(book, c))}…</p>`;
    const info = S.translationInfo(state.t);
    $attr.textContent = info ? `${info.name} (${info.short}), served through bolls.life.` : "";

    if (changedChapter || !comm) loadCommentaries();

    return S.fetchChapterHtml(state.t, book, c).then((html) => {
      if (my !== loadRun) return;
      const clean = S.cleanChapter(html);
      if (clean === null) throw new Error("sanitiser unavailable");
      $text.innerHTML =
        `<header class="bible-chapter-header">` +
          `<h2 class="sd-chapter-h1"><span class="bible-chapter-eyebrow">${esc(book.name)}</span> ` +
          `<span class="bible-chapter-heading">Chapter ${c}</span></h2>` +
        `</header>` +
        `<p class="sd-hint sd-muted"${hinted ? " hidden" : ""}>Select any verse to see where the library cites it.</p>` +
        `<div class="bible-chapter-content sd-chapter-content">${clean}</div>`;
      S.markVerses($text.querySelector(".sd-chapter-content"));
      if (wantVerse) openVerse(wantVerse, { scroll: true, keep: keepPanel });
    }).catch(() => {
      if (my !== loadRun) return;
      $text.innerHTML = `<p class="bible-status is-error" role="alert">${esc(S.refLabel(book, c))} could not be loaded in the ${esc(info ? info.short : state.t)}. Try another translation or reload the page.</p>`;
    });
  }

  function writeUrl(push) {
    const url = S.readerHref(state.book, state.c, state.v, state.t === "ESV" ? "" : state.t);
    if (location.pathname + location.search === url) return;
    history[push ? "pushState" : "replaceState"](null, "", url);
  }

  function step(delta) {
    let b = state.book;
    let n = state.c + delta;
    if (n < 1) { b = S.BOOKS[b.num - 2]; if (!b) return; n = b.chapters; }
    else if (n > b.chapters) { b = S.BOOKS[b.num]; if (!b) return; n = 1; }
    load(b, n, 0, true);
  }

  // ── Commentaries dropdown ─────────────────────────────────────
  function loadCommentaries() {
    $commCount.textContent = "";
    comm = S.commentaryStrip($commPanel.querySelector("[data-sd-comm-host]"), { book: state.book, c: state.c }, (n) => {
      $commCount.textContent = n ? `(${fmt(n)})` : "";
    });
  }
  $commToggle.addEventListener("click", () => {
    const open = $commToggle.getAttribute("aria-expanded") !== "true";
    $commToggle.setAttribute("aria-expanded", String(open));
    $commPanel.hidden = !open;
  });

  // ── The verse panel ───────────────────────────────────────────
  const $panel = document.createElement("section");
  $panel.className = "sd-panel";
  let panelRun = 0;
  let bar = null;
  let rowsOffset = 0;

  function placePanel(v) {
    if (narrow.matches) {
      // bolls sends a whole prose chapter as one <p> (and Psalm 23 as
      // one <p> too), so "after the paragraph" was the end of the
      // chapter. Straight after the verse's own last span instead.
      const spans = $text.querySelectorAll(`.bible-verse[data-v="${v}"]`);
      if (spans.length) spans[spans.length - 1].after($panel);
      $side.hidden = true;
      $layout.classList.remove("has-side");
    } else {
      $side.appendChild($panel);
      $side.hidden = false;
      $layout.classList.add("has-side");
    }
  }

  function closePanel(silent) {
    state.v = 0;
    $text.querySelectorAll(".bible-verse.is-active").forEach((el) => el.classList.remove("is-active"));
    $panel.remove();
    $side.hidden = true;
    $layout.classList.remove("has-side");
    if (!silent) writeUrl(false);
  }

  function openVerse(v, opts) {
    const spans = $text.querySelectorAll(`.bible-verse[data-v="${v}"]`);
    if (!spans.length) return;
    state.v = v;
    $text.querySelectorAll(".bible-verse.is-active").forEach((el) => el.classList.remove("is-active"));
    spans.forEach((el) => el.classList.add("is-active"));
    writeUrl(false);
    if (!(opts && opts.keep)) renderPanel(v);
    placePanel(v);
    hinted = true;
    const $hint = $text.querySelector(".sd-hint");
    if ($hint) $hint.hidden = true;
    if (opts && opts.scroll) spans[0].scrollIntoView({ block: "center" });
    else if (narrow.matches) $panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
    // Keyboard users land in the panel rather than behind every verse.
    if (opts && opts.focus) {
      const $ref = $panel.querySelector(".sd-panel-ref");
      if ($ref) $ref.focus({ preventScroll: true });
    }
  }

  function renderPanel(v) {
    const {book} = state;
    const {c} = state;
    const t = state.t === "ESV" ? "" : state.t;
    $panel.innerHTML =
      `<header class="sd-panel-head">` +
        `<p class="sd-eyebrow">Verse</p>` +
        `<h2 class="sd-panel-ref" tabindex="-1">${esc(S.refLabel(book, c, v))}</h2>` +
        `<a class="sd-desk-link" href="${esc(S.deskHref(book, c, v, t))}">Open the Verse Desk</a>` +
        `<button type="button" class="sd-close" aria-label="Close verse panel">Close</button>` +
      `</header>` +
      `<p class="sd-count" data-sd-count role="status"><span class="sd-muted">Counting citations…</span></p>` +
      `<div data-sd-filters></div>` +
      `<h3 class="sd-h3">Most-cited sources</h3>` +
      `<ol class="sd-sources sd-top" data-sd-top></ol>` +
      `<div data-sd-matches hidden>` +
        `<h3 class="sd-h3">Matching citations</h3>` +
        `<ol class="sd-sources" data-sd-rows></ol>` +
        `<button type="button" class="sd-more" data-sd-more hidden>Show more</button>` +
      `</div>` +
      `<p class="sd-panel-foot"><a href="${esc(S.deskHref(book, c, v, t))}">Every citation of ${esc(S.refLabel(book, c, v))} on the Verse Desk</a></p>`;
    $panel.querySelector(".sd-close").addEventListener("click", () => {
      const span = $text.querySelector(`.bible-verse[data-v="${v}"]`);
      closePanel();
      if (span) span.focus({ preventScroll: true });
    });
    bar = S.filterBar($panel.querySelector("[data-sd-filters]"), {
      search: true,
      searchLabel: "Search this verse's citations",
      onChange: () => query(v, false),
    });
    $panel.querySelector("[data-sd-more]").addEventListener("click", () => query(v, true));
    query(v, false);
  }

  function query(v, more) {
    // A search typed on the previous verse can fire after this one opens.
    if (v !== state.v) return;
    const my = more ? panelRun : ++panelRun;
    const {book} = state;
    const {c} = state;
    const f = bar.filters;
    if (!more) rowsOffset = 0;
    const filtered = S.activeCount(f) > 0;
    const $count = $panel.querySelector("[data-sd-count]");
    const $top = $panel.querySelector("[data-sd-top]");
    const $matches = $panel.querySelector("[data-sd-matches]");
    const $rows = $panel.querySelector("[data-sd-rows]");
    const $more = $panel.querySelector("[data-sd-more]");
    if (!more) $top.innerHTML = `<li class="sd-muted">Loading…</li>`;
    $more.disabled = true;
    S.fetchVerse(book, c, v, f, rowsOffset, 10).then((d) => {
      if (my !== panelRun || state.v !== v) return;
      $more.disabled = false;
      if (!d || !d.total) {
        $count.innerHTML = `The library does not cite ${esc(S.refLabel(book, c, v))} yet.`;
        $top.innerHTML = "";
        $panel.querySelectorAll(".sd-h3, [data-sd-filters]").forEach((el) => { el.hidden = true; });
        return;
      }
      bar.update(d.facets);
      $count.innerHTML = filtered
        ? `<strong>${fmt(d.matched)}</strong> of ${plural(d.total, "citation", "citations")} match`
        : `<strong>${fmt(d.total)}</strong> ${d.total === 1 ? "citation" : "citations"} in the library`;
      const ctx = { book, c, v };
      if (!more) {
        $top.innerHTML = "";
        (d.top_works || []).forEach((w) => {
          $top.appendChild(S.sourceItem(w, ctx, { count: w.n, pickRow: () => firstRowOf(w.w, v) }));
        });
        if (!(d.top_works || []).length) $top.innerHTML = `<li class="sd-muted">Nothing matches these filters.</li>`;
        $rows.innerHTML = "";
      }
      $matches.hidden = !filtered;
      if (filtered) {
        (d.rows || []).forEach((r) => $rows.appendChild(S.sourceItem(r, ctx)));
        rowsOffset = d.next_offset || 0;
        $more.hidden = !d.next_offset;
      }
    }).catch(() => {
      if (my !== panelRun) return;
      $more.disabled = false;
      $count.innerHTML = `<span class="sd-muted">Citations did not load.</span> <button type="button" class="sd-clear" data-sd-retry>Try again</button>`;
      $count.querySelector("[data-sd-retry]").addEventListener("click", () => query(v, false));
      $top.innerHTML = "";
    });
  }

  // A top work is an aggregate; previewing it means previewing one real
  // citation from it. Ask the worker for that work's first row under the
  // current filters, which is the builder's best-ranked one.
  function firstRowOf(w, v) {
    const f = bar ? bar.filters : S.emptyFilters();
    return S.fetchVerse(state.book, state.c, v, { ...f, w }, 0, 1)
      .then((d) => ((d && d.rows) || [])[0] || null)
      .catch(() => null);
  }

  // ── Events ────────────────────────────────────────────────────
  $text.addEventListener("click", (e) => {
    if (e.target.closest(".sd-panel")) return;
    const span = e.target.closest(".bible-verse");
    if (!span) return;
    const v = parseInt(span.dataset.v, 10);
    if (state.v === v && $panel.isConnected) { closePanel(); return; }
    openVerse(v);
  });
  $text.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const span = e.target.closest && e.target.closest(".bible-verse");
    if (!span || e.target.closest(".sd-panel")) return;
    e.preventDefault();
    openVerse(parseInt(span.dataset.v, 10), { focus: true });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !$panel.isConnected) return;
    if (e.target.closest && e.target.closest("input, select, textarea")) return;
    const span = $text.querySelector(`.bible-verse[data-v="${state.v}"]`);
    closePanel();
    if (span) span.focus({ preventScroll: true });
  });
  narrow.addEventListener("change", () => { if ($panel.isConnected && state.v) placePanel(state.v); });

  $book.addEventListener("change", () => load(S.BOOK_BY_SLUG.get($book.value), 1, 0, true));
  $chapter.addEventListener("change", () => load(state.book, parseInt($chapter.value, 10), 0, true));
  $trans.addEventListener("change", () => {
    state.t = $trans.value;
    S.rememberTranslation(state.t);
    load(state.book, state.c, state.v, false);
  });
  $prev.addEventListener("click", () => step(-1));
  $next.addEventListener("click", () => step(1));
  window.addEventListener("popstate", () => {
    const qs = new URLSearchParams(location.search);
    const r = S.parseRef(qs.get("ref"));
    const t = qs.get("t");
    state.t = t && S.translationInfo(t) ? t : "ESV";
    if (r) load(r.book, r.c, r.v, false);
  });

  const start = S.parseRef(new URLSearchParams(location.search).get("ref")) || S.legacyRef();
  load(start ? start.book : S.BOOK_BY_SLUG.get("genesis"), start ? start.c : 1, start ? start.v : 0, false);
})();
