/*
 * /the-faith-received/scripture-dev/desk/?ref=john.3.16 — the Verse Desk.
 *
 * One template serves every verse in the Bible: the verse is the query
 * string, not the path, so no page exists per verse and none has to be
 * generated. A malformed or missing ref falls back to a chooser rather
 * than a guess.
 *
 * On the page, top to bottom (Ian, 2026-09-22):
 *   - the verse in the reader's translation, with its neighbours;
 *   - the verse in all five translations;
 *   - every citation: the count, charts by century and tradition that
 *     double as filters, the filters and a search, the top five works,
 *     and the full list twenty at a time;
 *   - the commentaries on the book that cover this chapter;
 *   - Ask, handed the verse as its question.
 *
 * Ask HANDS OFF to /the-faith-received/ask/?ask= rather than running
 * here. The member gate, the monthly meter and the quote check all live
 * with Ask; a second copy on a public page would be a worse version of
 * the same gate. Same reasoning as mo-bible.js's verse tools.
 */
(function () {
  "use strict";
  const S = window.MOScriptureDev;
  if (!S) return;
  const { esc, fmt, plural } = S;
  const $root = document.querySelector("[data-sd-desk]");
  if (!$root) return;

  const params = new URLSearchParams(location.search);
  // ?ref=john.3.16, or the chooser's own GET form (?b=john&c=3&v=16).
  const ref = S.parseRef(params.get("ref")) ||
    S.parseRef(`${params.get("b") || ""}.${params.get("c") || ""}.${params.get("v") || ""}`);
  const t = S.recalledTranslation();
  const tParam = t === "ESV" ? "" : t;

  if (!ref || !ref.v) {
    renderChooser();
    return;
  }
  const { book, c, v } = ref;
  const label = S.refLabel(book, c, v);
  document.title = `${label} | Verse Desk (dev) | Mere Orthodoxy`;

  $root.innerHTML =
    `<header class="sd-desk-head">` +
      `<h2 class="sd-desk-title">${esc(label)}</h2>` +
      `<blockquote class="sd-desk-verse" data-sd-verse><span class="sd-muted">Loading the verse…</span></blockquote>` +
      `<p class="sd-desk-trans sd-muted" data-sd-verse-trans></p>` +
      `<nav class="sd-desk-nav" aria-label="Verse navigation">` +
        `<a data-sd-prev hidden>Previous verse</a>` +
        `<a href="${esc(S.readerHref(book, c, v, tParam))}">Back to ${esc(S.refLabel(book, c))}</a>` +
        `<a data-sd-next hidden>Next verse</a>` +
      `</nav>` +
    `</header>` +

    `<section class="sd-desk-sec" aria-labelledby="sd-h-trans">` +
      `<h2 class="sd-h2" id="sd-h-trans">In five translations</h2>` +
      `<dl class="sd-parallel" data-sd-parallel></dl>` +
    `</section>` +

    `<section class="sd-desk-sec" aria-labelledby="sd-h-cite">` +
      `<h2 class="sd-h2" id="sd-h-cite">Citations</h2>` +
      `<p class="sd-count" data-sd-count><span class="sd-muted">Counting citations…</span></p>` +
      `<div class="sd-charts" data-sd-charts></div>` +
      `<div data-sd-filters></div>` +
      `<h3 class="sd-h3">Most-cited sources</h3>` +
      `<ol class="sd-sources sd-top" data-sd-top></ol>` +
      `<p class="sd-jump"><a href="#sd-h-all">Every citation, below the commentaries</a></p>` +
    `</section>` +

    `<section class="sd-desk-sec" aria-labelledby="sd-h-comm">` +
      `<h2 class="sd-h2" id="sd-h-comm">Commentaries on ${esc(book.name)} ${c}</h2>` +
      `<div data-sd-comm></div>` +
    `</section>` +

    `<section class="sd-desk-sec" aria-labelledby="sd-h-ask">` +
      `<h2 class="sd-h2" id="sd-h-ask">Ask about this verse</h2>` +
      `<form class="sd-ask" data-sd-ask action="/the-faith-received/ask/" method="get">` +
        `<label class="sd-filter-label" for="sd-ask-q">Your question</label>` +
        `<textarea id="sd-ask-q" name="ask" rows="3"></textarea>` +
        `<p class="sd-muted sd-ask-note">Ask opens in the library's research workspace. It is open to members.</p>` +
        `<button type="submit" class="sd-btn">Ask</button>` +
      `</form>` +
    `</section>` +

    // The full list is last: every "Show more" lengthens it, and nothing
    // should sit below something that grows (UX review, 2026-09-22).
    `<section class="sd-desk-sec" aria-labelledby="sd-h-all">` +
      `<h2 class="sd-h2" id="sd-h-all" data-sd-all-h>All citations</h2>` +
      `<ol class="sd-sources" data-sd-rows></ol>` +
      `<button type="button" class="sd-more" data-sd-more hidden>Show more</button>` +
    `</section>`;

  // ── The verse, its neighbours, and five translations ──────────
  const $verse = $root.querySelector("[data-sd-verse]");
  const $verseTrans = $root.querySelector("[data-sd-verse-trans]");
  const info = S.translationInfo(t);
  S.fetchChapterHtml(t, book, c).then((html) => {
    const box = document.createElement("div");
    const clean = S.cleanChapter(html);
    if (clean === null) throw new Error("sanitiser unavailable");
    box.innerHTML = clean;
    S.markVerses(box);
    const text = S.verseTextFrom(box, v);
    const last = Math.max(0, ...Array.prototype.map.call(box.querySelectorAll(".bible-verse"), (el) => Number(el.dataset.v) || 0));
    $verse.textContent = text || `${label} is not in the ${info ? info.short : t}.`;
    $verseTrans.textContent = info ? info.name : "";
    const $ask = $root.querySelector("#sd-ask-q");
    if (!$ask.value) {
      const quote = text.length > 240 ? `${text.slice(0, 240).replace(/\s+\S*$/, "")}…` : text;
      $ask.value = `What does the historic Christian tradition say about ${label}${quote ? ` (“${quote}”)` : ""}?`;
    }
    neighbours(last);
  }).catch(() => {
    $verse.innerHTML = `<span class="sd-muted">The verse did not load in the ${esc(info ? info.short : t)}.</span>`;
    neighbours(0);
  });

  // Previous and next cross chapter and book boundaries the same way the
  // reader's arrows do. The last verse of a chapter is only known once
  // the chapter has loaded; without it, Next steps to the next verse and
  // the page there says if it does not exist.
  function neighbours(last) {
    const $p = $root.querySelector("[data-sd-prev]");
    const $n = $root.querySelector("[data-sd-next]");
    let prev = null;
    if (v > 1) prev = [book, c, v - 1];
    else if (c > 1) prev = [book, c - 1, 0];
    else if (book.num > 1) { const b = S.BOOKS[book.num - 2]; prev = [b, b.chapters, 0]; }
    let next = null;
    if (!last || v < last) next = [book, c, v + 1];
    else if (c < book.chapters) next = [book, c + 1, 1];
    else if (book.num < 66) next = [S.BOOKS[book.num], 1, 1];
    // The last verse of the previous chapter is not known here, so that
    // step goes to the chapter in the reader rather than to a guess.
    if (prev) {
      window.MOSafeHref.set($p, prev[2] ? S.deskHref(prev[0], prev[1], prev[2], tParam) : S.readerHref(prev[0], prev[1], 0, tParam));
      $p.textContent = prev[2] ? `Previous: ${S.refLabel(prev[0], prev[1], prev[2])}` : `Previous: ${S.refLabel(prev[0], prev[1])}`;
      $p.hidden = false;
    }
    if (next) {
      window.MOSafeHref.set($n, S.deskHref(next[0], next[1], next[2], tParam));
      $n.textContent = `Next: ${S.refLabel(next[0], next[1], next[2])}`;
      $n.hidden = false;
    }
  }

  const $parallel = $root.querySelector("[data-sd-parallel]");
  $parallel.innerHTML = S.TRANSLATIONS.map((x) =>
    `<div class="sd-parallel-row"><dt title="${esc(x[2])}">${esc(x[1])}</dt><dd data-code="${esc(x[0])}"><span class="sd-muted">Loading…</span></dd></div>`,
  ).join("");
  S.TRANSLATIONS.forEach((x) => {
    const $dd = $parallel.querySelector(`dd[data-code="${x[0]}"]`);
    S.fetchVerseText(x[0], book, c, v)
      .then((txt) => { $dd.textContent = txt || "Not in this translation."; })
      .catch(() => { $dd.innerHTML = `<span class="sd-muted">Did not load.</span>`; });
  });

  // ── Citations ─────────────────────────────────────────────────
  const $count = $root.querySelector("[data-sd-count]");
  const $charts = $root.querySelector("[data-sd-charts]");
  const $top = $root.querySelector("[data-sd-top]");
  const $rows = $root.querySelector("[data-sd-rows]");
  const $more = $root.querySelector("[data-sd-more]");
  const $allH = $root.querySelector("[data-sd-all-h]");
  const ctx = { book, c, v };
  const grouped = S.groupedSources($rows, ctx);
  let run = 0;
  let offset = 0;
  const bar = S.filterBar($root.querySelector("[data-sd-filters]"), {
    search: true,
    searchLabel: `Search the citations of ${label}`,
    onChange: () => query(false),
  });
  $more.addEventListener("click", () => query(true));

  function query(more) {
    const my = more ? run : ++run;
    if (!more) {
      offset = 0;
      $top.innerHTML = `<li class="sd-muted" role="status">Loading…</li>`;
      grouped.set([], 0);
    }
    $more.disabled = true;
    S.fetchVerse(book, c, v, bar.filters, offset, 20).then((d) => {
      if (my !== run) return;
      $more.disabled = false;
      if (!d || !d.total) {
        $count.textContent = `The library does not cite ${label} yet.`;
        $top.innerHTML = "";
        $root.querySelectorAll("[data-sd-filters], .sd-top, .sd-jump, #sd-h-cite ~ .sd-h3").forEach((el) => { el.hidden = true; });
        const $all = $root.querySelector("#sd-h-all");
        if ($all) $all.closest("section").hidden = true;
        return;
      }
      bar.update(d.facets);
      const filtered = S.activeCount(bar.filters) > 0;
      $allH.textContent = filtered ? "Matching citations" : "All citations";
      $count.innerHTML = filtered
        ? `<strong>${fmt(d.matched)}</strong> of ${plural(d.total, "citation", "citations")} match`
        : `<strong>${fmt(d.total)}</strong> ${d.total === 1 ? "citation" : "citations"} of ${esc(label)} in the library`;
      if (!more) {
        charts(d.facets);
        $top.innerHTML = "";
        (d.top_works || []).forEach((w) => {
          $top.appendChild(S.sourceItem(w, ctx, {
            count: w.n,
            pickRow: () => S.fetchVerse(book, c, v, { ...bar.filters, w: w.w }, 0, 1)
              .then((x) => ((x && x.rows) || [])[0] || null).catch(() => null),
          }));
        });
        if (!(d.top_works || []).length) $top.innerHTML = `<li class="sd-muted">Nothing matches these filters.</li>`;
      }
      if (more) grouped.append(d.rows || [], d.matched);
      else grouped.set(d.rows || [], d.matched);
      offset = d.next_offset || 0;
      $more.hidden = !d.next_offset;
      $more.textContent = d.next_offset ? `Show more (${fmt(d.matched - d.next_offset)} left)` : "Show more";
    }).catch(() => {
      if (my !== run) return;
      $more.disabled = false;
      $count.innerHTML = `<span class="sd-muted">Citations did not load.</span> <button type="button" class="sd-clear" data-sd-retry>Try again</button>`;
      $count.querySelector("[data-sd-retry]").addEventListener("click", () => query(false));
      $top.innerHTML = "";
    });
  }

  /* Two small bar charts: by century (in order) and by tradition (by
   * size). Each bar is a button that applies that filter, so the chart
   * is also the quickest way in. The counts are the facet counts, which
   * already honour the OTHER filters, so choosing a century leaves the
   * tradition chart showing that century's traditions. */
  function charts(facets) {
    const block = (title, k, list) => {
      // Every century (they are the story); traditions are few anyway.
      const rows = list || [];
      if (!rows.length) return "";
      const max = Math.max(...rows.map((x) => x.n)) || 1;
      const cur = bar.filters[k][0] || "";
      return `<figure class="sd-chart"><figcaption>${esc(title)}${k === "cen" ? ` <span class="sd-muted">· select a bar to filter</span>` : ""}</figcaption><ul>${ 
        rows.map((x) =>
          `<li><button type="button" class="sd-cbar${String(x.k) === cur ? " is-on" : ""}" data-k="${k}" data-val="${esc(x.k)}" aria-pressed="${String(x.k) === cur}">` +
            `<span class="sd-cbar-label">${esc(x.label || x.k)}</span>` +
            `<span class="sd-cbar-track"><span class="sd-cbar-fill" style="width:${Math.max(2, Math.round((x.n / max) * 100))}%"></span></span>` +
            `<span class="sd-cbar-n">${fmt(x.n)}</span>` +
          `</button></li>`,
        ).join("") 
        }</ul></figure>`;
    };
    $charts.innerHTML =
      block("By century", "cen", facets && facets.century) +
      block("By tradition", "tr", facets && facets.tradition);
  }
  $charts.addEventListener("click", (e) => {
    const b = e.target.closest(".sd-cbar");
    if (!b) return;
    const {k} = b.dataset;
    bar.set(k, bar.filters[k][0] === b.dataset.val ? "" : b.dataset.val);
  });

  query(false);

  // ── Commentaries ──────────────────────────────────────────────
  S.commentaryStrip($root.querySelector("[data-sd-comm]"), { book, c });

  // ── The chooser, for a Desk opened without a verse ────────────
  function renderChooser() {
    const opts = S.BOOKS.map((b) => `<option value="${b.slug}">${esc(b.name)}</option>`).join("");
    $root.innerHTML =
      `<header class="sd-desk-head"><h2 class="sd-desk-title">Choose a verse</h2></header>` +
      `<form class="sd-chooser" action="/the-faith-received/scripture-dev/desk/" method="get">` +
        `<label class="sd-filter"><span class="sd-filter-label">Book</span><select name="b">${opts}</select></label>` +
        `<label class="sd-filter"><span class="sd-filter-label">Chapter</span><input name="c" type="number" min="1" max="150" value="1" inputmode="numeric" required></label>` +
        `<label class="sd-filter"><span class="sd-filter-label">Verse</span><input name="v" type="number" min="1" max="176" value="1" inputmode="numeric" required></label>${ 
        tParam ? `<input type="hidden" name="t" value="${esc(tParam)}">` : "" 
        }<button type="submit" class="sd-btn">Open</button>` +
      `</form>`;
  }
})();
