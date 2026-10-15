/* How the library's authors read the passage, on the Scripture reader and the Verse Desk.
 *   Reader (/the-faith-received/scripture/?ref=<book>.<chapter>[.<verse>], scripture-dev.js)
 *     chapter  in the overview beside the text (wide screens only, as the overview is): how the library reads the
 *              chapter and its key verses straight under the counts, then the most-cited verses, then the verses read
 *              through the centuries (five, and the rest on a click);
 *     verse    at the top of the verse panel, under its count: the verse's note, how the library reads it (open on a
 *              wide screen) and through the centuries; then the panel's commentaries and citations; then the verses read
 *              with it, beside Similar passages. A commentary with its own comment on the verse says so on its row.
 *   Desk (/the-faith-received/scripture/desk/?ref=<book>.<c>.<v>, scripture-dev-desk.js)
 *     the same verse notes as a section after the translations, and the verses read with it under Similar passages.
 * ORDER (2026-10-15, the owner: "the correct things shown for each surface, ordering intuitively"): what the passage
 * means to the library first, then the evidence (commentaries, citations), then the other verses. The 09-25 order of
 * the evidence (commentaries, citations, similarity) is kept as it was.
 * Data: v1/enrich/scripture/<library slug>.json on the library worker (the book's lib slug: i-john for 1 John).
 * Machine-written from the library's pages, every page link checked; each block says so. A passage without notes shows
 * nothing, and the page's own panels are left as they are.
 */
(function () {
  "use strict";

  const S = window.MOScriptureDev;
  if (!S) return;
  const $root = document.querySelector("[data-sd-reader]");
  const $desk = document.querySelector("[data-sd-desk]");
  if (!$root && !$desk) return;
  const BASE = window.__FR_BLOB_BASE__ || "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  const { esc, fmt } = S;
  const cache = new Map();
  const bookFile = (book) => {
    if (!cache.has(book.lib)) {
      cache.set(book.lib, fetch(`${BASE}/v1/enrich/scripture/${encodeURIComponent(book.lib)}.json`, { credentials: "omit" })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null));
    }
    return cache.get(book.lib);
  };
  const link = (w, p, label) => `<a href="${esc(S.sourceHref("", w, p))}">${esc(label)}</a>`;
  // A page names whose words it carries; a compiled page names its compiler ("Augustine of Hippo, via Eugippius").
  const who = (x) => `${x.a || x.author || "page"}${x.via ? `, via ${x.via}` : ""}`;
  const pages = (rs, n) => ((rs || []).length
    ? `<p class="fr-sn-pages">${rs.slice(0, n || 5).map((x) => link(x.w || x.work, x.p || x.page, `${who(x)}, p. ${x.p || x.page}`)).join(" · ")}</p>` : "");
  const NOTE = "Machine-written from the library's pages; every page link is checked.";
  // A history opens "Across the centuries, John 4:21 was read mainly as …"; its row already names the verse.
  const unformula = (t) => String(t || "").replace(/^Across the centuries,\s+[^,]+?\s+was\s+(read|understood|taken)\s+/i, (m, w) => `${w[0].toUpperCase()}${w.slice(1)} `);
  const snip = (t) => {
    const s = String(t || "");
    return s.length > 110 ? `${s.slice(0, 108).replace(/\s+\S*$/, "")}…` : s;
  };
  /* A long note reads in two sentences and opens on a click (the chapter's ran seventeen lines in the 360px column).
   * Plain text throughout: the rest is a sibling span, shown by the button, never parsed as markup. */
  function lede(text, cls) {
    const t = String(text || "").trim();
    if (!t) return "";
    const parts = t.match(/[^.!?]+(?:[.!?]+["'’”)]*|$)\s*/g) || [t];
    const head = parts.slice(0, 2).join("").trim();
    const rest = parts.slice(2).join("").trim();
    return `<div class="fr-sn-lede-wrap ${cls || ""}"><p class="fr-sn-card">${esc(head)}${rest ? `<span class="fr-sn-rest" hidden> ${esc(rest)}</span>` : ""}</p>` +
      `${rest ? `<button type="button" class="fr-sn-readon" aria-expanded="false">Read the whole note</button>` : ""}</div>`;
  }
  // "I Corinthians 15:22" (the library's names) -> a link to that verse on this page's kind of page.
  function verseHref(ref, desk) {
    const m = String(ref || "").match(/^(.+?)\s+(\d{1,3}):(\d{1,3})/);
    const book = m && S.bookFrom(m[1]);
    if (!book || !(Number(m[2]) >= 1 && Number(m[2]) <= book.chapters)) return "";
    return desk ? S.deskHref(book, Number(m[2]), Number(m[3])) : S.readerHref(book, Number(m[2]), Number(m[3]));
  }
  const readWithList = (cn, desk) => `<ul class="fr-sn-list fr-sn-with">${cn.slice(0, 8).map((c) => {
    const href = verseHref(c.ref, desk);
    const ref = href ? `<a href="${esc(href)}">${esc(c.ref)}</a>` : esc(c.ref);
    return `<li><p><strong>${ref}.</strong> ${esc(c.why)}</p></li>`;
  }).join("")}</ul>`;

  /* Folds remember only what the reader chose: a click on the summary marks the toggle that follows, as the panel's own
   * folds do (bindPanelFolds in scripture-dev.js). A fold opened by a script or by default is not a choice. */
  const recalled = (key) => { try { return window.localStorage.getItem(`sd_panel_fold_${key}`); } catch (e) { return null; } };
  const remember = (key, open) => { try { window.localStorage.setItem(`sd_panel_fold_${key}`, open ? "1" : "0"); } catch (e) { /* not remembered */ } };
  const narrow = window.matchMedia("(max-width: 640px)");
  const isOpen = (key, wide) => {
    const r = recalled(key);
    if (r === "1") return true;
    if (r === "0") return false;
    return Boolean(wide) && !narrow.matches;
  };
  const fold = (key, title, count, body, wideOpen) => `<details class="sd-panel-fold" data-fr-sn-fold="${key}"${isOpen(key, wideOpen) ? " open" : ""}>
    <summary>${esc(title)}${count == null ? "" : ` <span data-sd-summary-count>(${fmt(count)})</span>`}</summary><div class="sd-panel-fold-body">${body}</div></details>`;
  document.addEventListener("click", (e) => {
    const sum = e.target.closest && e.target.closest("[data-fr-sn-fold] > summary");
    if (sum) sum.parentElement.dataset.frSnChosen = "1";
    const more = e.target.closest && e.target.closest(".fr-sn-readon");
    if (more) {
      const wrap = more.closest(".fr-sn-lede-wrap");
      const rest = wrap && wrap.querySelector(".fr-sn-rest");
      if (!rest) return;
      const open = more.getAttribute("aria-expanded") !== "true";
      rest.hidden = !open;
      more.setAttribute("aria-expanded", String(open));
      more.textContent = open ? "Show less" : "Read the whole note";
    }
    const all = e.target.closest && e.target.closest(".fr-sn-all");
    if (all) {
      all.closest("[data-fr-sn]").querySelectorAll(".fr-sn-told > li[hidden]").forEach((li) => { li.hidden = false; });
      all.remove();
    }
  });
  document.addEventListener("toggle", (e) => {
    const f = e.target;
    if (!f || !f.dataset || !f.dataset.frSnFold || f.dataset.frSnChosen !== "1") return;
    delete f.dataset.frSnChosen;
    remember(f.dataset.frSnFold, f.open);
  }, true);

  // ── The chapter, in the overview ──
  const ovRow = (v, label, text, hidden) => `<li${hidden ? " hidden" : ""}><button type="button" class="sd-ov-verse fr-sn-row" data-v="${v}">
      <span class="sd-ov-ref">${esc(label)}</span><span class="sd-ov-snip">${esc(snip(text))}</span></button></li>`;
  function chapterReading(ch, book, c) {
    // Key verses in verse order: they are a reading guide to the chapter, not a ranking.
    const keys = (ch.key_verses || []).map((k) => [parseInt(String(k.ref || "").split(":")[1], 10), k])
      .filter(([v]) => v > 0).sort((a, b) => a[0] - b[0])
      .map(([v, k]) => ovRow(v, S.refLabel(book, c, v), k.why)).join("");
    if (!ch.card && !keys) return "";
    return `<div class="fr-sn-chapter" data-fr-sn="chapter">
      <h3 class="sd-h3">How the library reads it</h3>
      ${lede(ch.card)}
      ${keys ? `<h3 class="sd-h3">Key verses</h3><ol class="sd-ov-top">${keys}</ol>` : ""}</div>`;
  }
  function chapterCenturies(ch, book, c) {
    const told = Object.entries(ch.verses || {}).filter(([, x]) => x && x.history && (x.history.periods || []).length)
      .map(([v, x]) => [Number(v), x]).sort((a, b) => a[0] - b[0]);
    if (!told.length) return "";
    const SHOW = 5;
    return `<div class="fr-sn-chapter" data-fr-sn="chapter">
      <h3 class="sd-h3">Through the centuries</h3>
      <ol class="sd-ov-top fr-sn-told">${told.map(([v, x], i) => ovRow(v, S.refLabel(book, c, v), unformula(x.history.summary) || x.card, i >= SHOW)).join("")}</ol>
      ${told.length > SHOW ? `<button type="button" class="sd-commentary-more fr-sn-all">Show all ${fmt(told.length)} verses</button>` : ""}
      <p class="sd-muted fr-sn-note">${NOTE}</p></div>`;
  }

  // ── The verse ──
  function verseParts(x, desk) {
    if (!x) return null;
    const rd = x.readings || [];
    const h = x.history && (x.history.periods || []).length ? x.history : null;
    const cn = x.connections || [];
    const readings = rd.length ? `<ul class="fr-sn-list">${rd.map((r) => `<li><p><strong>${esc(r.label)}.</strong> ${esc(r.summary)}</p>${pages(r.refs)}</li>`).join("")}</ul>` : "";
    const history = h ? `${h.summary ? `<p class="fr-sn-lede">${esc(h.summary)}</p>` : ""}<ol class="fr-sn-timeline">${h.periods.map((p) => `<li>
        <h4>${esc(p.period)}</h4><p>${esc(p.text)}</p>${pages(p.refs)}</li>`).join("")}</ol>` : "";
    // The Desk sets the history as the Topics page sets a doctrine's: the period beside its paragraph (.fr-dn-timeline).
    const deskHistory = h ? `${h.summary ? `<p class="fr-dn-lede">${esc(h.summary)}</p>` : ""}<ol class="fr-dn-timeline">${h.periods.map((p) => `<li>
        <h4>${esc(p.period)}</h4><div><p>${esc(p.text)}</p>${pages(p.refs).replace("fr-sn-pages", "fr-dn-pages")}</div></li>`).join("")}</ol>` : "";
    return { card: x.card || "", readings, nReadings: rd.length, history, deskHistory, with: cn.length ? readWithList(cn, desk) : "", nWith: Math.min(cn.length, 8), commentaries: x.commentaries || [] };
  }

  /* A commentary row says when the commentary has its own comment on this verse, with the page (the notes'
   * `commentaries` for the verse). Rows carry their work's slug (data-w, scripture-dev-core.js). */
  function markCommentaries($host, list, label) {
    if (!$host || !list.length) return;
    const byW = new Map(list.map((x) => [x.w, x]));
    $host.querySelectorAll(".sd-commentary[data-w]").forEach((li) => {
      const hit = byW.get(li.dataset.w);
      const $meta = li.querySelector(".sd-source-meta");
      if (!hit || !$meta || li.querySelector(".fr-sn-has")) return;
      // The verse's own note says more than "Comment on Romans 5", so it takes that place.
      const $on = $meta.querySelector(".sd-comm-on");
      if ($on) $on.remove();
      $meta.insertAdjacentHTML("beforeend", ` <span class="fr-sn-has">· ${link(hit.w, hit.p, `its note on ${label}, p. ${hit.p}`)}</span>`);
    });
  }

  // ── Placing them as the reader draws its panels ──
  const $book = $root && $root.querySelector("[data-sd-book]");
  const $chapter = $root && $root.querySelector("[data-sd-chapter]");
  const here = () => {
    const book = $book && S.BOOK_BY_SLUG.get($book.value);
    const c = $chapter ? Number($chapter.value) : 0;
    return book && c > 0 ? { book, c, v: 0 } : null;
  };
  let busy = false;
  let again = false;
  async function place() {
    if (busy) { again = true; return; }
    busy = true;
    try {
      const r = here();
      if (!r || !r.book) return;
      // The reader keeps its two panel elements and replaces what is inside them, so the test is whether OUR
      // blocks are there for this chapter or verse; a passage known to have no notes is marked so it is not refetched.
      const $ov = $root.querySelector("section.sd-overview");
      const ovKey = `${r.book.lib}/${r.c}`;
      const ovReady = $ov && $ov.isConnected && $ov.querySelector(".sd-panel-ref") && !/Counting citations/.test($ov.textContent);
      const ovHas = ovReady && $ov.querySelector('[data-fr-sn="chapter"]');
      const needOv = ovReady && !(ovHas && ovHas.dataset.key === ovKey) && $ov.dataset.frSnNone !== ovKey;
      const $panel = $root.querySelector("section.sd-panel");
      const $ref = $panel && $panel.isConnected && $panel.querySelector(".sd-panel-ref");
      const vKey = $ref ? $ref.textContent.trim() : "";
      const vHas = $ref && $panel.querySelector('[data-fr-sn="verse"]');
      const needVerse = $ref && !(vHas && vHas.dataset.key === vKey) && $panel.dataset.frSnNone !== vKey;
      const $comm = $panel && $panel.querySelector("[data-sd-panel-commentaries]");
      const needMarks = $ref && $comm && $comm.querySelector(".sd-commentary[data-w]") && !$comm.dataset.frSnMarked;
      if (!needOv && !needVerse && !needMarks) return;
      const d = await bookFile(r.book);
      const ch = d && d.chapters && d.chapters[String(r.c)];
      if (needOv && $ov.isConnected) {
        $ov.querySelectorAll('[data-fr-sn="chapter"]').forEach((el) => el.remove());
        const top = ch ? chapterReading(ch, r.book, r.c) : "";
        const end = ch ? chapterCenturies(ch, r.book, r.c) : "";
        if (top || end) {
          // Under the counts and before the most-cited verses: what the chapter means, then how often it is cited.
          const $mostH = Array.prototype.find.call($ov.querySelectorAll(".sd-h3"), (el) => /most-cited/i.test(el.textContent));
          if (top) { if ($mostH) $mostH.insertAdjacentHTML("beforebegin", top); else $ov.insertAdjacentHTML("beforeend", top); }
          if (end) $ov.insertAdjacentHTML("beforeend", end);
          $ov.querySelectorAll('[data-fr-sn="chapter"]').forEach((el) => { el.dataset.key = ovKey; });
        } else $ov.dataset.frSnNone = ovKey;
      }
      const m = vKey.match(/:(\d+)$/);
      const v = (m ? Number(m[1]) : 0) || r.v; // the panel's own heading first: it is what the reader is showing
      const x = v && ch ? (ch.verses || {})[String(v)] : null;
      if (needVerse && $panel.isConnected) {
        $panel.querySelectorAll('[data-fr-sn="verse"]').forEach((el) => el.remove());
        const parts = verseParts(x, false);
        if (parts && (parts.card || parts.readings || parts.history || parts.with)) {
          const lead = `${parts.card ? lede(parts.card, "fr-sn-verse-card") : ""}<p class="sd-muted fr-sn-note">${NOTE}</p>` +
            `${parts.readings ? fold("fr_readings", "How the library reads it", parts.nReadings, parts.readings, true) : ""}` +
            `${parts.history ? fold("fr_history", "Through the centuries", null, parts.history) : ""}`;
          const $count = $panel.querySelector("[data-sd-count]");
          if (parts.card || parts.readings || parts.history) {
            const html = `<div class="fr-sn-verse" data-fr-sn="verse">${lead}</div>`;
            if ($count) $count.insertAdjacentHTML("afterend", html); else $panel.insertAdjacentHTML("beforeend", html);
          }
          if (parts.with) {
            const html = `<div class="fr-sn-verse" data-fr-sn="verse">${fold("fr_with", "Read with", parts.nWith, parts.with)}</div>`;
            const $similar = $panel.querySelector('[data-sd-panel-section="similar"]');
            if ($similar) $similar.insertAdjacentHTML("beforebegin", html); else $panel.insertAdjacentHTML("beforeend", html);
          }
          $panel.querySelectorAll('[data-fr-sn="verse"]').forEach((el) => { el.dataset.key = vKey; });
        } else $panel.dataset.frSnNone = vKey;
      }
      if ($comm && $comm.isConnected && $comm.querySelector(".sd-commentary[data-w]")) {
        markCommentaries($comm, (x && x.commentaries) || [], vKey.replace(/^.*?(\d+:\d+)$/, "$1"));
        $comm.dataset.frSnMarked = "1";
      }
    } finally {
      busy = false;
      if (again) { again = false; place(); }
    }
  }

  // ── The Verse Desk ──
  async function placeDesk() {
    const ref = S.parseRef(new URLSearchParams(location.search).get("ref"));
    if (!ref || !ref.v) return;
    const d = await bookFile(ref.book);
    const ch = d && d.chapters && d.chapters[String(ref.c)];
    const parts = verseParts(ch && (ch.verses || {})[String(ref.v)], true);
    if (!parts) return;
    const label = S.refLabel(ref.book, ref.c, ref.v);
    if (parts.card || parts.readings || parts.history) {
      const $trans = $desk.querySelector('[aria-labelledby="sd-h-trans"]');
      const html = `<section class="sd-desk-sec fr-sn-desk" aria-labelledby="sd-h-reads" data-fr-sn="verse">
        <h2 class="sd-h2" id="sd-h-reads">How the library reads ${esc(label)}</h2>
        ${parts.card ? lede(parts.card, "fr-sn-verse-card") : ""}
        ${parts.readings ? `<h3 class="sd-h3">The readings</h3><div class="fr-sn-desk-readings">${parts.readings}</div>` : ""}
        ${parts.deskHistory ? `<h3 class="sd-h3">Through the centuries</h3>${parts.deskHistory}` : ""}
        <p class="sd-muted fr-sn-note">${NOTE}</p></section>`;
      if ($trans) $trans.insertAdjacentHTML("afterend", html); else $desk.insertAdjacentHTML("beforeend", html);
    }
    if (parts.with) {
      const $grid = $desk.querySelector(".sd-similar-grid");
      if ($grid) $grid.insertAdjacentHTML("afterbegin", `<div class="sd-similar-block" data-fr-sn="verse"><h3 class="sd-h3">Read with</h3><p class="sd-muted">Verses the library reads alongside ${esc(label)}.</p>${parts.with}</div>`);
    }
    // The commentaries open later, on a click: mark them as they are drawn.
    const $panels = $desk.querySelectorAll("[data-sd-commentary-panel]");
    const short = `${ref.c}:${ref.v}`;
    const mark = () => $panels.forEach((p) => markCommentaries(p, parts.commentaries, short));
    mark();
    $panels.forEach((p) => new MutationObserver(mark).observe(p, { childList: true, subtree: true }));
  }

  if ($root) {
    // The reader redraws the overview and the verse panel on its own schedule (fetches, route changes, a phone
    // folding the side away); watch what it draws rather than racing it.
    new MutationObserver(() => { place(); }).observe($root, { childList: true, subtree: true });
    window.addEventListener("popstate", () => { place(); });
    place();
  }
  if ($desk) placeDesk();
})();
