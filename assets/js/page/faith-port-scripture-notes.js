/* The live Scripture reader (/the-faith-received/scripture/?ref=<book>.<chapter>[.<verse>], scripture-dev.js):
 * how the library's authors read the passage, in the reader's own panels.
 *   chapter  in the overview beside the text ("This chapter in the library", wide screens only, as the
 *            overview is): how the library reads the chapter, its key verses, and the verses read through the
 *            centuries, each a row in the overview's own style that opens its verse (.sd-ov-verse);
 *   verse    three more folds in the verse panel, after its commentaries: how the library reads the verse
 *            (readings with their pages), through the centuries (for the verses the most works use), and
 *            passages read with it. Closed to start and remembered when opened, like the panel's own folds.
 * Data: v1/enrich/scripture/<library slug>.json on the library worker (the book's lib slug: i-john for 1 John).
 * Machine-written from the library's pages, every page link checked; each block says so. A passage without
 * notes shows nothing, and the reader's own panels are left as they are.
 */
(function () {
  "use strict";

  const S = window.MOScriptureDev;
  if (!S) return;
  const $root = document.querySelector("[data-sd-reader]");
  if (!$root) return;
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
  // The passage on screen, from the reader's own pickers: load() sets them for every route (an address, an old link, a
  // picker change, the history), so they always name what the reader is showing.
  const $book = $root.querySelector("[data-sd-book]");
  const $chapter = $root.querySelector("[data-sd-chapter]");
  const here = () => {
    const book = $book && S.BOOK_BY_SLUG.get($book.value);
    const c = $chapter ? Number($chapter.value) : 0;
    return book && c > 0 ? { book, c, v: 0 } : null;
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

  // ── The chapter, in the overview ──
  function chapterBlock(d, book, c) {
    const ch = d && d.chapters && d.chapters[String(c)];
    if (!ch) return "";
    const row = (v, label, text) => `<li><button type="button" class="sd-ov-verse fr-sn-row" data-v="${v}">
      <span class="sd-ov-ref">${esc(label)}</span><span class="sd-ov-snip">${esc(snip(text))}</span></button></li>`;
    const keys = (ch.key_verses || []).map((k) => {
      const v = parseInt(String(k.ref || "").split(":")[1], 10);
      return v > 0 ? row(v, S.refLabel(book, c, v), k.why) : "";
    }).join("");
    const told = Object.entries(ch.verses || {}).filter(([, x]) => x && x.history && (x.history.periods || []).length)
      .map(([v, x]) => [Number(v), x]).sort((a, b) => a[0] - b[0]);
    if (!ch.card && !keys && !told.length) return "";
    return `<div class="fr-sn-chapter" data-fr-sn="chapter">
      <h3 class="sd-h3">How the library reads it</h3>
      ${ch.card ? `<p class="fr-sn-card">${esc(ch.card)}</p>` : ""}
      ${keys ? `<h3 class="sd-h3">Key verses</h3><ol class="sd-ov-top">${keys}</ol>` : ""}
      ${told.length ? `<h3 class="sd-h3">Through the centuries</h3><ol class="sd-ov-top">${told.map(([v, x]) => row(v, S.refLabel(book, c, v), unformula(x.history.summary) || x.card)).join("")}</ol>` : ""}
      <p class="sd-muted fr-sn-note">${NOTE}</p></div>`;
  }

  // ── The verse, in the verse panel ──
  const recalled = (key) => { try { return window.localStorage.getItem(`sd_panel_fold_${key}`) === "1"; } catch (e) { return false; } };
  const remember = (key, open) => { try { window.localStorage.setItem(`sd_panel_fold_${key}`, open ? "1" : "0"); } catch (e) { /* not remembered */ } };
  const fold = (key, title, count, body) => `<details class="sd-panel-fold" data-fr-sn-fold="${key}"${recalled(key) ? " open" : ""}>
    <summary>${esc(title)}${count == null ? "" : ` <span data-sd-summary-count>(${fmt(count)})</span>`}</summary><div class="sd-panel-fold-body">${body}</div></details>`;

  function verseBlock(x) {
    if (!x) return "";
    const rd = x.readings || [];
    const h = x.history && (x.history.periods || []).length ? x.history : null;
    const cn = x.connections || [];
    const parts = [
      rd.length ? fold("fr_readings", "How the library reads it", rd.length, `<ul class="fr-sn-list">${rd.map((r) => `<li><p><strong>${esc(r.label)}.</strong> ${esc(r.summary)}</p>${pages(r.refs)}</li>`).join("")}</ul>`) : "",
      h ? fold("fr_history", "Through the centuries", null, `${h.summary ? `<p class="fr-sn-lede">${esc(h.summary)}</p>` : ""}<ol class="fr-sn-timeline">${h.periods.map((p) => `<li>
        <h4>${esc(p.period)}</h4><p>${esc(p.text)}</p>${pages(p.refs)}</li>`).join("")}</ol>`) : "",
      cn.length ? fold("fr_with", "Read with", Math.min(cn.length, 8), `<ul class="fr-sn-list">${cn.slice(0, 8).map((c) => `<li><p><strong>${esc(c.ref)}.</strong> ${esc(c.why)}</p></li>`).join("")}</ul>`) : "",
    ].join("");
    return parts ? `<div class="fr-sn-verse" data-fr-sn="verse">${parts}<p class="sd-muted fr-sn-note">${NOTE}</p></div>` : "";
  }

  // ── Placing them as the reader draws its panels ──
  let busy = false;
  async function place() {
    if (busy) return;
    busy = true;
    try {
      const r = here();
      if (!r || !r.book) return;
      // The reader keeps its two panel elements and replaces what is inside them, so the test is whether OUR
      // block is there for this chapter or verse; a passage known to have no notes is marked so it is not refetched.
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
      if (!needOv && !needVerse) return;
      const d = await bookFile(r.book);
      if (needOv && $ov.isConnected) {
        $ov.querySelectorAll('[data-fr-sn="chapter"]').forEach((el) => el.remove());
        const html = chapterBlock(d, r.book, r.c);
        if (html) {
          $ov.insertAdjacentHTML("beforeend", html);
          $ov.querySelector('[data-fr-sn="chapter"]').dataset.key = ovKey;
        } else $ov.dataset.frSnNone = ovKey;
      }
      if (needVerse && $panel.isConnected) {
        $panel.querySelectorAll('[data-fr-sn="verse"]').forEach((el) => el.remove());
        const m = vKey.match(/:(\d+)$/);
        const v = (m ? Number(m[1]) : 0) || r.v; // the panel's own heading first: it is what the reader is showing
        const ch = d && d.chapters && d.chapters[String(r.c)];
        const html = v && ch ? verseBlock((ch.verses || {})[String(v)]) : "";
        if (html) {
          const $after = $panel.querySelector("[data-sd-panel-commentaries]");
          if ($after) $after.insertAdjacentHTML("afterend", html); else $panel.insertAdjacentHTML("beforeend", html);
          $panel.querySelector('[data-fr-sn="verse"]').dataset.key = vKey;
        } else $panel.dataset.frSnNone = vKey;
      }
    } finally {
      busy = false;
    }
  }

  $root.addEventListener("toggle", (e) => {
    const f = e.target.closest && e.target.closest("[data-fr-sn-fold]");
    if (f) remember(f.dataset.frSnFold, f.open);
  }, true);
  // The reader redraws the overview and the verse panel on its own schedule (fetches, route changes, a phone
  // folding the side away); watch what it draws rather than racing it.
  new MutationObserver(() => { place(); }).observe($root, { childList: true, subtree: true });
  window.addEventListener("popstate", () => { place(); });
  place();
})();
