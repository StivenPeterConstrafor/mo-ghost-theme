/* THE VERSE RAIL, ORGANIZED (2026-10-21; owner: "this whole thing needs a pass for design UI organization around author and tradition
 * and actual relevance to the text", "too many methodology eyebrows", "no repeated rows for one work"). Three renderers the Scripture
 * page's rail calls (commentary-pane.js on both sites, the verse panel on The Faith Received, scripture-dev-core.js on Mere Orthodoxy),
 * each a pure function of its data and a routes object, so one file serves both sites:
 *
 *   picker      the Commentary picker: the commentaries on the chapter in four groups by what they hold for THIS verse (a note on the
 *               verse; a note on the chapter; the whole Bible; works on other books that cite the chapter, one row per author however
 *               many volumes), the curated key commentaries first in the order their authors wrote, then by tradition; a find box.
 *   reception   the verse's history: one line of counts, the century strip, the commentaries on the verse (each author once, keys
 *               first, then by tradition), then each period's witnesses by standing, the page's gist behind the row, and the rest
 *               of a period one click away in Citations. One methodology line for the whole rail.
 *   citations   every use of the verse grouped by author (one row an author: his works and pages inline, his kinds as counts, the
 *               gists behind the row), tradition and kind chips.
 *
 * Standing, never counts, orders authors (rank.json: cfg.rankOf). Rows link to the page (cfg.read(slug, page)).
 */
(function (root) {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const ord = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th")}`;
  const DOT = " · ";
  const VERB = { quotation: "quotes it", explicit: "cites it", allusion: "alludes to it", exegesis: "expounds it" };
  const KIND = { exegesis: "expounds", quotation: "quotes", explicit: "cites", allusion: "alludes" };
  const KIND_ORDER = ["exegesis", "quotation", "explicit", "allusion"];
  // the reception periods against the rows' era letters (E before 500, L to 800, C to 1100, H to 1500, R the Reformation, P the 17th century, M later, U undated)
  const ERA_CODES = { fathers: "EL", "early-medieval": "LC", scholastic: "H", reformation: "R", "17th": "P", "18th": "M", modern: "M" };
  const ERA_NAME = { fathers: "The Fathers", "early-medieval": "Early Middle Ages", scholastic: "High and late Middle Ages", reformation: "Reformation", "17th": "Seventeenth century", "18th": "Eighteenth century", modern: "Since 1800" };
  // the shelves as the lists name them; a Latin writer from the 8th century on reads as Medieval, a Greek from the 9th as Byzantine
  const TRADS = [["gf", "Greek Fathers"], ["pl", "Latin Fathers"], ["po", "Eastern Fathers"], ["by", "Byzantine"], ["md", "Medieval"],
    ["lu", "Lutheran"], ["rf", "Continental Reformed"], ["rc", "Roman Catholic"], ["ed", "English Divines"], ["hl", "Humanism and Law"]];
  const TRAD_NAME = Object.assign(Object.fromEntries(TRADS), { x: "Other", "": "Other" });
  const tradIndex = (k) => { const i = TRADS.findIndex(([x]) => x === k); return i < 0 ? TRADS.length : i; };
  // a page's gist is cut at a fixed length; a cut one ends in an ellipsis
  const gist = (g) => { const t = String(g || "").trim(); if (!t) return ""; return /[.!?)\]"'”’]$/.test(t) ? t : `${t.replace(/\s+\S*$/, "")}…`; };
  const years = (x) => x.d || (x.y ? `fl. c. ${x.y}` : "");
  // a byline set right for a row: the catalogue's title-first strings ("Archbishop of Bulgaria Theophylact") turned about, a guessed
  // attribution ("Uncertain author (Bede?)") read as "Bede (uncertain)"
  const NAMES = {};
  const properName = (a) => {
    const s = String(a || "").trim(); if (!s) return s;
    if (NAMES[s]) return NAMES[s];
    const m = /^((?:Arch)?bishop of [A-Z][\w\- ]+?)\s+([A-Z][\w\-]+)$/.exec(s); if (m) return `${m[2]}, ${m[1]}`;
    return s.replace(/^Uncertain author\s*\((.+?)\??\)(?:;.*)?$/i, "$1 (uncertain)");
  };
  // standing from rank.json (curated, never counts): a work's importance, else its author's; loaded once a page
  const RANK = { works: {}, authors: {}, books: {} };
  let rankP = null;
  const loadRank = (base) => rankP || (rankP = fetch(`${String(base).replace(/\/$/, "")}/v1/scripture/rank.json`).then((r) => (r.ok ? r.json() : null))
    .then((d) => { if (d) { Object.assign(RANK.works, d.works || {}); Object.assign(RANK.authors, d.authors || {}); Object.assign(RANK.books, d.books || {}); } }).catch(() => {}));
  const standing = (a, w) => { const r = RANK.works[w]; return -(r ? r[0] : (RANK.authors[a] || 0)); };

  // ── the picker ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  /* rows: the pane's S.list entries {slug, a, t, vol, notes {v: p}, open, hit {v, n}, sh, wb, score}; keys: the curated key
   * commentaries in the order their authors wrote; verse: the verse in view. cfg: {cur, bookName, ch, tradOf, volShort, rankOf}. */
  function picker(rows, keys, verse, cfg) {
    const keySet = new Set(keys.map((c) => c.slug)), keyAt = (c) => keys.findIndex((k) => k.slug === c.slug);
    const rel = (c) => (c.wb === 2 ? "cites" : verse && c.notes && String(verse) in c.notes ? "verse" : (c.notes && Object.keys(c.notes).length) || c.open != null ? "chapter" : "other");
    const byAuthor = (list) => {
      const by = new Map();
      for (const c of list) { const k = c.a || c.slug; if (!by.has(k)) by.set(k, []); by.get(k).push(c); }
      return [...by.values()].map((cs) => { const main = cs.find((c) => keySet.has(c.slug)) || cs[0]; return { main, more: cs.filter((c) => c !== main) }; });
    };
    const order = (xs) => xs.sort((p, q) => {
      const kp = keySet.has(p.main.slug), kq = keySet.has(q.main.slug);
      if (kp !== kq) return kp ? -1 : 1;
      if (kp && kq) return keyAt(p.main) - keyAt(q.main);
      return tradIndex(cfg.tradOf(p.main)) - tradIndex(cfg.tradOf(q.main)) || (q.main.score || 0) - (p.main.score || 0);
    });
    const mark = (c) => {
      const r = rel(c);
      if (r === "verse") return `v. ${esc(verse)}`;
      if (r === "cites") return c.hit ? `cites ${c.hit.v && c.hit.v.length ? `v. ${c.hit.v.slice(0, 3).join(", ")}` : "the chapter"}` : "cites it";
      const n = c.notes ? Object.keys(c.notes).length : 0;
      return n ? `${n} ${n === 1 ? "note" : "notes"} in ch. ${esc(cfg.ch)}` : `ch. ${esc(cfg.ch)}`;
    };
    const li = (c, sub) => `<li role="option" data-slug="${esc(c.slug)}" data-find="${esc(`${c.a || ""} ${c.t || ""}`.toLowerCase())}" aria-selected="${!!(cfg.cur && cfg.cur.slug === c.slug)}"${sub ? ' class="vr-sub"' : ""}>`
      + `${sub ? "" : `<span class="vr-a">${esc(properName(c.a) || c.t)}</span>`}<span class="vr-t">${esc(c.t)}${cfg.volShort(c.vol) ? `${DOT}${esc(cfg.volShort(c.vol))}` : ""}</span>`
      + `<span class="vr-n">${mark(c)}</span></li>`;
    // a tradition's name once above its first author, inside a group that mixes traditions
    const group = (title, xs, opts) => {
      if (!xs.length) return "";
      let out = `<li class="vr-h" role="presentation" data-group="${esc(title)}">${esc(title)}<small>${xs.length}</small></li>`, last = null;
      for (const r of xs) {
        const isKey = keySet.has(r.main.slug), t = isKey ? "key" : cfg.tradOf(r.main);
        if (!opts.flat && t !== last) { out += `<li class="vr-trad" role="presentation">${esc(isKey ? "Key commentaries" : TRAD_NAME[t] || "Other")}</li>`; last = t; }
        out += li(r.main, false) + r.more.map((c) => li(c, true)).join("");
      }
      return out;
    };
    const onBook = rows.filter((c) => c.wb === 0), whole = rows.filter((c) => c.wb === 1), cited = rows.filter((c) => c.wb === 2);
    const onVerse = order(byAuthor(onBook.filter((c) => rel(c) === "verse")));
    const onChapter = order(byAuthor(onBook.filter((c) => rel(c) !== "verse")));
    const wholeRows = order(byAuthor(whole));
    // works on other books that cite the chapter: one row an author, his volumes folded, the whole group shut until asked
    const citedRows = byAuthor(cited).sort((p, q) => cfg.rankOf(p.main.slug, p.main.a) - cfg.rankOf(q.main.slug, q.main.a) || (p.main.a || "").localeCompare(q.main.a || ""));
    const citedLi = (r) => {
      const n = r.more.length + 1;
      return `<li role="option" data-slug="${esc(r.main.slug)}" data-find="${esc(`${r.main.a || ""} ${r.main.t || ""}`.toLowerCase())}" aria-selected="${!!(cfg.cur && cfg.cur.slug === r.main.slug)}" class="vr-cited">`
        + `<span class="vr-a">${esc(properName(r.main.a) || r.main.t)}</span><span class="vr-t">${n > 1 ? `${n} volumes${DOT}` : ""}${esc(r.main.t)}${cfg.volShort(r.main.vol) ? `${DOT}${esc(cfg.volShort(r.main.vol))}` : ""}</span>`
        + `<span class="vr-n">${mark(r.main)}</span>${n > 1 ? `<button type="button" class="vr-vols" aria-expanded="false" aria-label="Show the other ${n - 1} volumes">+${n - 1}</button>` : ""}</li>${
         r.more.map((c) => li(c, true).replace('class="vr-sub"', 'class="vr-sub vr-vol" hidden')).join("")}`;
    };
    const v = verse ? `${esc(cfg.bookName)} ${esc(cfg.ch)}:${esc(verse)}` : `${esc(cfg.bookName)} ${esc(cfg.ch)}`;
    const find = `<li class="vr-find" role="presentation"><input type="search" placeholder="Find a commentator or work" aria-label="Find a commentary on ${esc(cfg.bookName)} ${esc(cfg.ch)}" autocomplete="off" spellcheck="false"></li>`;
    const body = group(`Notes on ${v}`, onVerse, {}) + group(`On ${esc(cfg.bookName)} ${esc(cfg.ch)}`, onChapter, {}) + group("On the whole Bible", wholeRows, { flat: true })
      + (citedRows.length ? `<li class="vr-h vr-h-fold" role="presentation"><button type="button" class="vr-fold" aria-expanded="false">Also cite this chapter<small>${citedRows.length} ${citedRows.length === 1 ? "author" : "authors"}</small></button></li>`
        + `<li class="vr-folded" role="presentation" hidden><ul role="group" aria-label="Works on other books that cite this chapter">${citedRows.map(citedLi).join("")}</ul></li>` : "");
    return find + (body || `<li class="vr-h" role="presentation">No commentary on this chapter yet</li>`);
  }

  // the picker's own behaviour: the find box filters, the folded group opens, an author's volumes unfold
  function wirePicker(list) {
    if (list.dataset.vrWired) return; list.dataset.vrWired = "1";
    list.addEventListener("input", (e) => {
      const box = e.target.closest(".vr-find input"); if (!box) return;
      const q = box.value.trim().toLowerCase();
      const folded = list.querySelector(".vr-folded"), fold = list.querySelector(".vr-fold");
      if (q && folded) { folded.hidden = false; if (fold) fold.setAttribute("aria-expanded", "true"); }
      list.querySelectorAll("[data-slug]").forEach((li) => { li.hidden = q ? !(li.dataset.find || "").includes(q) : li.classList.contains("vr-vol"); });
      list.querySelectorAll(".vr-h, .vr-trad").forEach((h) => {
        let el = h.nextElementSibling, any = false;
        while (el && !el.classList.contains("vr-h") && !(h.classList.contains("vr-trad") && el.classList.contains("vr-trad"))) { if (el.matches("[data-slug]") && !el.hidden) { any = true; break; } el = el.nextElementSibling; }
        h.hidden = q ? !any : false;
      });
    });
    list.addEventListener("click", (e) => {
      const fold = e.target.closest(".vr-fold");
      if (fold) { e.stopPropagation(); const box = list.querySelector(".vr-folded"), open = fold.getAttribute("aria-expanded") !== "true"; fold.setAttribute("aria-expanded", String(open)); if (box) box.hidden = !open; return; }
      const vols = e.target.closest(".vr-vols");
      if (vols) {
        e.stopPropagation(); const open = vols.getAttribute("aria-expanded") !== "true"; vols.setAttribute("aria-expanded", String(open));
        let el = vols.closest("li").nextElementSibling;
        while (el && el.classList.contains("vr-vol")) { el.hidden = !open; el = el.nextElementSibling; }
      }
    });
    list.addEventListener("keydown", (e) => { if (e.key === "Escape" && e.target.closest(".vr-find")) { e.target.value = ""; e.target.dispatchEvent(new Event("input", { bubbles: true })); } });
    const box = list.querySelector(".vr-find input"); if (box) box.addEventListener("click", (e) => e.stopPropagation());
  }

  // ── reception ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const reception = {
    /* rv: the verse's record {works, strip, notes, eras}; notes: [{slug, p, a, t, sh}] already resolved; cfg: {name, ch, v, read,
     * rankOf, tradOf, keySet, era: {id: [label, years]}, more(eraId): the Citations view for that period} */
    head(rv, ns, cfg) {
      const strip = rv.strip || [], span = strip.length ? `${DOT}${ord(strip[0][0])} to ${ord(strip[strip.length - 1][0])} century` : "";
      return `<header class="vr-rec-head"><h3>${esc(cfg.name)} ${esc(cfg.ch)}:${esc(cfg.v)}</h3><p class="vr-count"><b>${fmt(rv.works)}</b> ${rv.works === 1 ? "work cites it" : "works cite it"}`
        + `${ns.length ? `${DOT}<b>${fmt(ns.length)}</b> ${ns.length === 1 ? "expounds it" : "expound it"}` : ""}${span}</p></header>`;
    },
    strip(strip) {
      if (!strip || strip.length < 2) return "";
      const max = Math.max(...strip.map(([, k]) => k)), by = new Map(strip), cols = [];
      for (let c = strip[0][0]; c <= strip[strip.length - 1][0]; c += 1) {
        const k = by.get(c) || 0, tip = `${ord(c)} century: ${fmt(k)} ${k === 1 ? "work" : "works"}`;
        cols.push(`<li${k ? "" : ' class="is-zero"'} style="--k:${k ? Math.max(0.08, Math.sqrt(k / max)).toFixed(3) : 0}" title="${tip}"><span class="cp-bar"></span><small aria-hidden="true">${c}</small><span class="cp-sr">${tip}</span></li>`);
      }
      return `<figure class="cp-rec-strip vr-strip"><ol>${cols.join("")}</ol><figcaption>Works citing it, by century</figcaption></figure>`;
    },
    // the commentaries with a note on the verse: each author once (his key work), keys first in the order they wrote, then by tradition
    notes(ns, cfg) {
      if (!ns.length) return "";
      const by = new Map();
      for (const c of ns) { const k = c.a || c.slug; if (!by.has(k) || (cfg.keySet.has(c.slug) && !cfg.keySet.has(by.get(k).slug))) by.set(k, c); }
      const keyAt = (c) => cfg.keyOrder ? cfg.keyOrder.indexOf(c.slug) : 0;
      const rows = [...by.values()].sort((p, q) => {
        const kp = cfg.keySet.has(p.slug), kq = cfg.keySet.has(q.slug);
        if (kp !== kq) return kp ? -1 : 1;
        if (kp && kq) return keyAt(p) - keyAt(q);
        return tradIndex(cfg.tradOf(p)) - tradIndex(cfg.tradOf(q)) || cfg.rankOf(p.slug, p.a) - cfg.rankOf(q.slug, q.a) || (p.a || "").localeCompare(q.a || "");
      });
      let last = null, out = "";
      for (const c of rows) {
        const t = cfg.keySet.has(c.slug) ? "key" : cfg.tradOf(c);
        if (t !== last && rows.length > 6) { out += `<li class="vr-trad" role="presentation">${esc(t === "key" ? "Key commentaries" : TRAD_NAME[t] || "Other")}</li>`; last = t; }
        out += `<li class="vr-row"><button type="button" class="vr-open" data-cp-open="${esc(c.slug)}" data-cp-p="${esc(c.p)}" title="Read the note beside the text"><span class="vr-a">${esc(properName(c.a) || c.t)}</span><span class="vr-t">${esc(c.t)}</span></button>`
          + `<a class="vr-pg" href="${esc(cfg.read(c.slug, c.p))}" aria-label="${esc(`${c.a || c.t}, page ${c.p}, in the reader`)}">p. ${esc(c.p)}</a></li>`;
      }
      return `<section class="vr-sec"><h4>Commentaries on this verse<small>${rows.length}</small></h4><ul class="vr-rows">${out}</ul></section>`;
    },
    // each period's witnesses by standing, six shown, the rest of the period in Citations; the page's gist behind the row
    eras(eras, cfg) {
      const SHOW = cfg.show || 6;
      const items = (eras || []).map((e) => {
        const [label, span] = (cfg.era && cfg.era[e.id]) || [e.label, ""];
        const xs = (e.top || []).slice().sort((p, q) => cfg.rankOf(p.w, p.a) - cfg.rankOf(q.w, q.a) || (p.y || 9999) - (q.y || 9999));
        const rows = xs.map((x, j) => {
          const g = gist(x.g && !(x.commentary && x.how === "exegesis") ? x.g : "");
          return `<li class="vr-row vr-wit"${j >= SHOW ? " hidden" : ""}><p class="vr-line"><a class="vr-a" href="${esc(cfg.read(x.w, x.p))}">${esc(properName(x.a) || x.w)}</a>${years(x) ? ` <span class="vr-y">${esc(years(x))}</span>` : ""}`
            + `<span class="vr-what"><cite>${esc(x.t || "")}</cite>, <a href="${esc(cfg.read(x.w, x.p))}">p. ${esc(x.p)}</a>${DOT}${esc(VERB[x.how] || "cites it")}</span>`
            + `${g ? `<button type="button" class="vr-gbtn" aria-expanded="false" aria-label="What the page says">gist</button>` : ""}</p>${g ? `<p class="vr-g" hidden>${esc(g)}</p>` : ""}</li>`;
        }).join("");
        const rest = Math.max(0, xs.length - SHOW), more = Number(e.more || 0);
        return `<li class="vr-era"><h5>${esc(label)}<small>${span ? `${esc(span)}${DOT}` : ""}${fmt(e.works)} ${e.works === 1 ? "work" : "works"}</small></h5><ul class="vr-rows">${rows}</ul>`
          + `<p class="vr-era-foot">${rest ? `<button type="button" class="vr-more">Show ${fmt(rest)} more</button>` : ""}${more ? `<button type="button" class="vr-all" data-era="${esc(e.id)}">All ${fmt(e.works)} in Citations</button>` : ""}</p></li>`;
      }).join("");
      return items ? `<section class="vr-sec"><h4>Through the centuries</h4><ol class="vr-eras">${items}</ol></section>` : "";
    },
    foot(text) { return `<p class="vr-foot">${esc(text)}</p>`; },
  };

  // ── citations, by author ─────────────────────────────────────────────────────────────────────────────────────────────────
  /* rows: the chapter file's rows for the verse {a, e, sh, w, t, how, p, g}; cfg: {read, rankAuthor(a, w), tradOf(row), state
   * {trad, kind}, open: Set of authors whose pages are shown}. */
  function citations(rows, cfg) {
    const st = cfg.state || {}, rankAuthor = cfg.rankAuthor || standing, tradOf = cfg.tradOf || ((r) => r.sh || "");
    const codes = st.era && ERA_CODES[st.era], eraOf = cfg.eraOf || ((r) => r.e || "U");
    const all = rows; rows = codes ? rows.filter((r) => codes.includes(eraOf(r))) : rows;
    const by = new Map();
    for (const r of rows) { const k = r.a || r.w; if (!by.has(k)) by.set(k, { a: k, rows: [], trads: new Set(), kinds: {} }); const g = by.get(k); g.rows.push(r); g.trads.add(tradOf(r)); g.kinds[r.how] = (g.kinds[r.how] || 0) + 1; }
    const groups = [...by.values()];
    const tradCount = {}, kindCount = {};
    for (const g of groups) { for (const t of g.trads) tradCount[t] = (tradCount[t] || 0) + 1; for (const [k, n] of Object.entries(g.kinds)) kindCount[k] = (kindCount[k] || 0) + n; }
    const shown = groups.filter((g) => (!st.trad || g.trads.has(st.trad)) && (!st.kind || g.kinds[st.kind]))
      .sort((p, q) => (p.kinds.exegesis ? 0 : 1) - (q.kinds.exegesis ? 0 : 1) || rankAuthor(p.a, p.rows[0].w) - rankAuthor(q.a, q.rows[0].w) || q.rows.length - p.rows.length || p.a.localeCompare(q.a));
    const chips = (name, counts, order, label, cur) => `<p class="vr-chips" role="group" aria-label="${label}"><button type="button" data-vr-${name}="" aria-pressed="${!cur}">All</button>${
       order.filter((k) => counts[k]).map((k) => `<button type="button" data-vr-${name}="${esc(k)}" aria-pressed="${cur === k}">${esc(name === "kind" ? KIND[k] : TRAD_NAME[k] || k)}<small>${fmt(counts[k])}</small></button>`).join("")}</p>`;
    const tradOrder = TRADS.map(([k]) => k).concat(Object.keys(tradCount).filter((k) => !TRADS.some(([t]) => t === k)));
    const authorRow = (g) => {
      const works = new Map();
      for (const r of g.rows.slice().sort((p, q) => KIND_ORDER.indexOf(p.how) - KIND_ORDER.indexOf(q.how) || Number(p.p) - Number(q.p))) { if (!works.has(r.w)) works.set(r.w, { t: r.t, rows: [] }); works.get(r.w).rows.push(r); }
      const kinds = KIND_ORDER.filter((k) => g.kinds[k]).map((k) => `${KIND[k]} ${fmt(g.kinds[k])}`).join(DOT);
      const first = g.rows[0], trad = [...g.trads].map((t) => TRAD_NAME[t]).filter(Boolean)[0] || "";
      const open = cfg.open && cfg.open.has(g.a);
      const pages = [...works.entries()].map(([w, x]) => `<li class="vr-work"><cite>${esc(x.t || w)}</cite> <span class="vr-pp">${x.rows.slice(0, 12).map((r) => `<a href="${esc(cfg.read(w, r.p))}" title="${esc(KIND[r.how] || "")}">${esc(r.p)}</a>`).join(" ")}${x.rows.length > 12 ? ` <span class="vr-k">+${x.rows.length - 12}</span>` : ""}</span>`
        + `${x.rows.some((r) => r.g) ? `<ul class="vr-gl">${x.rows.filter((r) => r.g).slice(0, 6).map((r) => `<li><a href="${esc(cfg.read(w, r.p))}">p. ${esc(r.p)}</a> ${esc(gist(r.g))}</li>`).join("")}</ul>` : ""}</li>`).join("");
      return `<li class="vr-row vr-au${open ? " is-open" : ""}" data-author="${esc(g.a)}"><button type="button" class="vr-aubtn" aria-expanded="${!!open}"><span class="vr-a">${esc(properName(g.a))}</span>`
        + `<span class="vr-meta">${[years(first), trad].filter(Boolean).map(esc).join(DOT)}</span><span class="vr-n">${fmt(g.rows.length)} ${g.rows.length === 1 ? "page" : "pages"}${kinds ? `${DOT}${kinds}` : ""}</span></button>`
        + `<ul class="vr-works"${open ? "" : " hidden"}>${pages}</ul></li>`;
    };
    const LIMIT = cfg.limit || 40, list = shown.slice(0, LIMIT);
    const period = codes ? `<p class="vr-period">${esc(ERA_NAME[st.era] || st.era)} only${DOT}<button type="button" data-vr-era="">Every period</button></p>` : "";
    return `<div class="vr-cit"><p class="vr-count"><b>${fmt(rows.length)}</b>${codes ? ` of ${fmt(all.length)}` : ""} ${rows.length === 1 ? "page" : "pages"} by <b>${fmt(groups.length)}</b> ${groups.length === 1 ? "author" : "authors"}</p>${period}${
       chips("trad", tradCount, tradOrder, "Tradition", st.trad)}${chips("kind", kindCount, KIND_ORDER, "Kind of citation", st.kind)
       }<ol class="vr-rows vr-authors">${list.map(authorRow).join("")}</ol>${shown.length > LIMIT ? `<button type="button" class="vr-more" data-vr-limit="${LIMIT + 40}">Show ${fmt(Math.min(40, shown.length - LIMIT))} more authors</button>` : ""}`
      + `${!shown.length ? '<p class="vr-empty">No citation of that kind in that tradition.</p>' : ""}</div>`;
  }

  // the rail's shared behaviour inside a rendered block: gist toggles, Show more, author rows; chips and "all in Citations" are the host's
  function wire(host, on) {
    if (host.dataset.vrWired) return; host.dataset.vrWired = "1";
    host.addEventListener("click", (e) => {
      const g = e.target.closest(".vr-gbtn");
      if (g) { const p = g.closest("li").querySelector(".vr-g"), open = g.getAttribute("aria-expanded") !== "true"; g.setAttribute("aria-expanded", String(open)); if (p) p.hidden = !open; return; }
      const more = e.target.closest(".vr-more");
      if (more && !more.dataset.vrLimit) { more.closest(".vr-era, .vr-cit").querySelectorAll("li[hidden]").forEach((li) => { li.hidden = false; }); more.remove(); return; }
      const au = e.target.closest(".vr-aubtn");
      if (au) { const li = au.closest(".vr-au"), ul = li.querySelector(".vr-works"), open = au.getAttribute("aria-expanded") !== "true"; au.setAttribute("aria-expanded", String(open)); ul.hidden = !open; li.classList.toggle("is-open", open); if (on && on.author) on.author(li.dataset.author, open); return; }
      const all = e.target.closest(".vr-all");
      if (all && on && on.era) { on.era(all.dataset.era); return; }
      const chip = e.target.closest("[data-vr-trad], [data-vr-kind], [data-vr-limit], [data-vr-era]");
      if (chip && on && on.filter) on.filter(chip.dataset.vrTrad !== undefined ? { trad: chip.dataset.vrTrad } : chip.dataset.vrKind !== undefined ? { kind: chip.dataset.vrKind } : chip.dataset.vrEra !== undefined ? { era: chip.dataset.vrEra } : { limit: +chip.dataset.vrLimit });
    });
  }

  root.FRVerseRail = { picker, wirePicker, reception, citations, wire, loadRank, standing, properName, RANK, ERA_CODES, ERA_NAME, TRADS, TRAD_NAME, KIND, VERB, esc, fmt, ord, gist };
})(typeof window === "undefined" ? globalThis : window);
