/* The page window (owner 2026-10-06: the preview "should allow for changing text and … only show the page before and
 * after, or something that makes it easy to see what we're talking about").
 *
 * "Preview source" used to frame the whole reader. This shows the cited page itself with the passage marked, the page
 * before and the page after, and a switch between the English, the source text (Latin, Greek or French) and both side by
 * side. Earlier and later pages add one page at a time.
 *
 * It reads what the reader reads: the work's TEI (tei.en.xml and tei.la.xml, or tei.fr.xml; the canonical text, cut here at
 * its <pb n> page breaks, notes and running heads left out), and for a work without TEI its page files (meta.json →
 * pages/NNNN.json, {n, la, en}). Each text is fetched once, and only when its lane is shown. A work with neither returns
 * false and the caller keeps the framed reader.
 */
(function (root) {
  "use strict";

  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const base = () => root.__FR_BLOB_BASE__ || "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const getText = (url) => fetch(url).then((r) => (r.ok ? r.text() : "")).catch(() => "");
  const workURL = (slug, file) => `${base()}/v1/works/${encodeURIComponent(slug)}/${file}`;
  const metas = new Map(), shards = new Map(), teis = new Map();
  const LANE_KEY = "fr_pw_lane";
  const laneSaved = () => { try { return localStorage.getItem(LANE_KEY) || "en"; } catch (_) { return "en"; } };
  const laneSave = (v) => { try { localStorage.setItem(LANE_KEY, v); } catch (_) {} };
  const num = (v) => Number(String(v).replace(/^0+(?=\d)/, ""));

  function meta(slug) {
    if (!metas.has(slug)) metas.set(slug, getJSON(workURL(slug, "meta.json")));
    return metas.get(slug);
  }

  // ── the TEI: page n → its blocks ({t, h}) ──────────────────────────────────────────────────────────────────────────
  const BLOCK = new Set(["p", "head", "item", "l", "label", "ab", "quote", "trailer", "byline", "dateline", "salute", "signed", "closer", "opener"]);
  const SKIP = new Set(["note", "fw", "teiHeader", "figDesc"]);
  function teiPages(xml) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) return null;
    const pages = new Map();
    let page = 0, buf = null;
    const flush = () => {
      if (!buf) return;
      const t = buf.t.replace(/\s+/g, " ").trim();
      if (t) { if (!pages.has(buf.page)) pages.set(buf.page, []); pages.get(buf.page).push({ t, h: buf.h }); }
      buf = null;
    };
    (function walk(node) {
      for (let c = node.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { if (buf) buf.t += c.nodeValue; continue; }
        if (c.nodeType !== 1) continue;
        const name = c.localName;
        if (name === "pb") {
          const n = num(c.getAttribute("n") || "");
          if (!Number.isFinite(n)) continue;
          if (buf) { const h = buf.h; flush(); page = n; buf = { page, t: "", h }; } else page = n;
          continue;
        }
        if (SKIP.has(name)) continue;
        if (name === "lb") { if (buf) buf.t += " "; continue; }
        if (BLOCK.has(name) && !buf) { buf = { page, t: "", h: name === "head" }; walk(c); flush(); continue; }
        walk(c);
      }
    })(doc.documentElement);
    return pages;
  }
  // lane "en" is tei.en.xml; lane "src" is tei.la.xml (Latin, or Greek on a Greek work), else tei.fr.xml
  function teiLane(slug, lane, m) {
    const key = `${slug}|${lane}`;
    if (!teis.has(key)) teis.set(key, (async () => {
      for (const f of lane === "en" ? ["en"] : ["la", "fr"]) {
        const xml = await getText(`${workURL(slug, `tei.${f}.xml`)}?v=${encodeURIComponent(m.tei_v || 0)}`);
        const pages = xml && teiPages(xml);
        if (pages && pages.size) return { pages, file: f };
      }
      return null;
    })());
    return teis.get(key);
  }

  // ── the page files, for a work without TEI ─────────────────────────────────────────────────────────────────────────
  async function pageAt(slug, n, m) {
    let file = null;
    if (Array.isArray(m.shards) && m.shards.length) {
      const s = m.shards.find((x) => n >= Number(x.from) && n <= Number(x.to));
      if (!s) return null;
      file = s.file;
    } else if (m.single) file = m.single;
    if (!file) return null;
    const key = `${slug}/${file}`;
    if (!shards.has(key)) shards.set(key, getJSON(workURL(slug, file)));
    const d = await shards.get(key);
    return ((d && d.pages) || []).find((p) => num(p.n) === n) || null;
  }

  async function blocksAt(slug, lane, n) {
    const m = await meta(slug);
    if (!m) return null;
    if (m.has_tei) {
      const t = await teiLane(slug, lane, m);
      if (t) return t.pages.get(n) || [];
    }
    const p = await pageAt(slug, n, m);
    const text = p && p[lane === "en" ? "en" : "la"];
    return text && text.trim() ? text.split(/\n{2,}/).map((t) => ({ t: t.trim(), h: false })).filter((b) => b.t) : null;
  }

  // The passage: the claim's opening words found in the text (spacing and case ignored), marked; otherwise nothing.
  const fold = (s) => s.toLowerCase().replace(/[^a-z0-9Ͱ-Ͽἀ-῿]+/g, " ").trim();
  function marked(text, hl) {
    const plain = String(text || "");
    const want = fold(String(hl || ""));
    if (!want || want.length < 12) return esc(plain);
    const head = want.split(" ").slice(0, 8).join(" ");
    const idx = [], chars = [];
    let last = " ";
    for (let i = 0; i < plain.length; i++) {
      const c = plain[i].toLowerCase(), ok = /[a-z0-9Ͱ-Ͽἀ-῿]/.test(c);
      const out = ok ? c : " ";
      if (out === " " && last === " ") continue;
      chars.push(out); idx.push(i); last = out;
    }
    const folded = chars.join("");
    const at = folded.indexOf(head);
    if (at < 0) return esc(plain);
    const end = Math.min(folded.length - 1, at + Math.max(head.length, want.length) - 1);
    const a = idx[at], b = idx[end] + 1;
    return `${esc(plain.slice(0, a))}<mark>${esc(plain.slice(a, b))}</mark>${esc(plain.slice(b))}`;
  }

  const SRC = { la: "Latin", grc: "Greek", fr: "French", de: "German", nl: "Dutch" };

  async function fill(box, o) {
    const slug = o.slug, n = num(o.page);
    if (!slug || !Number.isFinite(n)) return false;
    const m = await meta(slug);
    if (!m || !(m.has_tei || m.has_pages || m.shards || m.single)) return false;
    const srcName = SRC[m.src_lang] || "Latin";
    const both = !m.en_only;
    let lane = both ? laneSaved() : "en";
    if (!["en", "src", "both"].includes(lane)) lane = "en";
    // the cited page must have text in the lane shown first, else the other lane, else the framed reader
    const firstLane = lane === "both" ? "en" : lane;
    let first = await blocksAt(slug, firstLane, n);
    if ((!first || !first.length) && both) {
      const other = firstLane === "en" ? "src" : "en";
      const alt = await blocksAt(slug, other, n);
      if (alt && alt.length) { lane = other; first = alt; }
    }
    if (!first || !first.length) return false;
    let lo = n - 1, hi = n + 1;
    box.classList.add("pw");
    box.innerHTML = `<div class="pw-bar">
        ${both ? `<div class="pw-lanes" role="group" aria-label="Text">
          <button type="button" data-lane="en">English</button><button type="button" data-lane="src">${srcName}</button><button type="button" data-lane="both">Both</button></div>` : ""}
        <span class="pw-span" role="status"></span>
        <span class="pw-more"><button type="button" data-more="-1">Earlier page</button><button type="button" data-more="1">Later page</button></span>
      </div><div class="pw-pages"></div>`;
    const pagesEl = box.querySelector(".pw-pages"), spanEl = box.querySelector(".pw-span");
    let drawing = 0;
    async function draw(scroll) {
      const token = ++drawing;
      box.querySelectorAll("[data-lane]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lane === lane)));
      const lanes = lane === "both" ? ["en", "src"] : [lane];
      const rows = [];
      for (let k = Math.max(1, lo); k <= hi; k++) {
        const cols = await Promise.all(lanes.map((l) => blocksAt(slug, l, k)));
        if (cols.some((c) => c && c.length)) rows.push({ k, cols });
      }
      if (token !== drawing) return;
      spanEl.textContent = rows.length > 1 ? `pp. ${rows[0].k}–${rows[rows.length - 1].k}` : `p. ${n}`;
      const col = (blocks, l, cited) => {
        const lang = l === "en" ? "en" : (m.src_lang || "la");
        const body = (blocks || []).map((b) => (b.h ? `<h5>${cited ? marked(b.t, o.hl) : esc(b.t)}</h5>` : `<p>${cited ? marked(b.t, o.hl) : esc(b.t)}</p>`)).join("");
        return `<div class="pw-col" lang="${esc(lang)}">${body || `<p class="pw-none">No ${l === "en" ? "English" : srcName} on this page.</p>`}</div>`;
      };
      pagesEl.innerHTML = rows.map(({ k, cols }) => {
        const cited = k === n;
        const body = cols.length > 1 ? `<div class="pw-two">${col(cols[0], "en", cited)}${col(cols[1], "src", cited)}</div>` : col(cols[0], lanes[0], cited);
        return `<section class="pw-page${cited ? " pw-cited" : ""}" data-n="${k}"><h4>p. ${k}${cited ? " <span>cited</span>" : ""}</h4>${body}</section>`;
      }).join("");
      // the cited passage (or page) in view; after "Earlier page" the new first page, after "Later page" the new last
      const to = (el, pad) => { if (el) pagesEl.scrollTop += el.getBoundingClientRect().top - pagesEl.getBoundingClientRect().top - pad; };
      if (scroll === "first") { pagesEl.scrollTop = 0; return; }
      if (scroll === "last") { to(pagesEl.lastElementChild, 8); return; }
      if (o.scroll === false) return;
      const c = pagesEl.querySelector(".pw-cited");
      const mk = c && c.querySelector("mark");
      if (mk) to(mk, 60); else to(c, 8);
    }
    box.addEventListener("click", (e) => {
      const l = e.target.closest("[data-lane]");
      if (l) { lane = l.dataset.lane; laneSave(lane); draw(); return; }
      const mo = e.target.closest("[data-more]");
      if (mo) { if (mo.dataset.more === "-1") { lo = Math.max(1, lo - 1); draw("first"); } else { hi += 1; draw("last"); } }
    });
    await draw();
    return true;
  }

  root.FRPageWindow = { fill, teiPages };
})(typeof window === "undefined" ? globalThis : window);
