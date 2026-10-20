#!/usr/bin/env node
/*
 * Which creed, confession or catechism proof-texts which verse.
 *
 * Ian, 2026-10-19: "On Commentary, we need to add Creeds, Confessions, and
 * Catechisms whenever a verse is proof texted or if a concept is alluded to
 * in them that is pertinent to a certain passage." This is the first half:
 * the citations the documents themselves print.
 *
 * WHERE THE TEXT IS. The 260 creeds, confessions and catechisms are works in
 * the library worker (v1/confessions-index.json lists them; the text of each
 * is v1/works/<slug>/work.json, one entry per page). The Westminster
 * Confession prints its proofs in parentheses ("(Rom. 2:14-15; Ps. 19:1-3)"),
 * the Augsburg Confession in brackets ("[Romans 5:12]"), and Trent in the
 * running sentence. All of them are verse-level in the text, though the
 * site's scripture-index.json is chapter-level only.
 *
 * HOW A CITATION IS READ. By the reader's own linker, lifted out of
 * assets/js/port/reader-core.js (the way check-scripture-linker.mjs lifts it),
 * so "Gen. 1:1-3", "John 1:1, 14", "Ps. 19:1ff" and "Rom. 2:14-15; 1:19-20"
 * read as the reader reads them. A Catholic document numbers the Psalms by the
 * Vulgate, and the linker maps those to the Hebrew numbering the Bible text
 * uses (DATA.tradition, as the reader sets it). Only a citation that names a
 * verse is kept: "Matthew 22" alone proves nothing about a verse. "Ps. 19:1ff"
 * keeps verse 1, because "and following" names no verse.
 *
 * WHAT IS RECORDED. For each verse, each article (a chapter section of the
 * Westminster Confession, a question of the Heidelberg Catechism, an article
 * of the Augsburg Confession) that cites it, and the words of that article
 * the citation stands behind: the clause just before the citation, verbatim.
 * Nothing is inferred. A verse is linked to an article only because the
 * article prints the citation.
 *
 * OUTPUT (assets/data/faith-received/confession-proofs/):
 *   index.json     the documents that cite anything, and the totals
 *   <book>.json    one file per book, keyed by the library's book slug
 *                  { v: { "1:1": [[article, clause], ...] },
 *                    a: [[doc, label, page, title], ...], x: ["clause", ...] }
 *                  (article and clause are indexes into a and x)
 *
 *   node scripts/build-confession-proofs.mjs            fetch the library, write
 *   node scripts/build-confession-proofs.mjs --check    offline: the committed
 *                                                        data is well formed
 *                                                        and the parser still
 *                                                        reads known cases
 *   node scripts/build-confession-proofs.mjs --report   also print what could not
 *                                                        be read, per document
 *   --src <dir>   cache of the library's work.json files (default: the OS temp
 *                 dir); --refresh fetches them again.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets/data/faith-received/confession-proofs");
const READER = join(ROOT, "assets/js/port/reader-core.js");
const CORPORA = join(ROOT, "assets/js/faith-corpora.js");
const SD_CORE = join(ROOT, "assets/js/page/scripture-dev-core.js");
const LIBRARY = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
const UA = { "User-Agent": "curl/8.7.1" };

const argv = process.argv.slice(2);
const has = (k) => argv.includes(k);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };

/* ── The reader's linker and the catalogue's church labels, lifted ───────── */

async function loadModules() {
  const lines = readFileSync(READER, "utf8").split(/^/m);
  const start = lines.findIndex((l) => l.includes("XREF_CAP="));
  const fn = lines.findIndex((l) => l.startsWith("function scriptureReferences"));
  if (start < 0 || fn < 0) throw new Error(`scripture linker not found in ${READER}`);
  let depth = 0; let end = -1;
  for (let i = fn; i < lines.length; i++) {
    depth += (lines[i].match(/{/g) || []).length - (lines[i].match(/}/g) || []).length;
    if (depth === 0 && i > fn) { end = i + 1; break; }
  }
  if (end < 0) throw new Error("scriptureReferences() never closes");
  const dir = join(tmpdir(), `mo-confession-proofs-lift-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const linkerPath = join(dir, "linker.mjs");
  writeFileSync(linkerPath, `${lines.slice(start, end).join("")}\nexport {scriptureReferences, XREF_CAP};\n`);

  // The church a document belongs to, by the same patterns the confessions page uses
  const src = readFileSync(CORPORA, "utf8");
  const a = src.indexOf("const CONFESSION_TRADITION = [");
  const f = src.indexOf("function confessionTradition");
  if (a < 0 || f < 0) throw new Error(`confessionTradition not found in ${CORPORA}`);
  let d = 0; let b = -1; let seen = false;
  for (let i = src.indexOf("{", f); i < src.length; i++) {
    if (src[i] === "{") { d++; seen = true; } else if (src[i] === "}") d--;
    if (seen && d === 0) { b = i + 1; break; }
  }
  const churchPath = join(dir, "church.mjs");
  writeFileSync(churchPath, `${src.slice(a, b)}\nexport {confessionTradition};\n`);
  const linker = await import(pathToFileURL(linkerPath).href);
  const church = await import(pathToFileURL(churchPath).href);
  rmSync(dir, { recursive: true, force: true });
  return { ...linker, ...church };
}

/* ── Books: the linker's names to the library's slugs ────────────────────── */

// [address slug, name, chapters, library slug], from the Scripture page itself
function canonFromCore() {
  const s = readFileSync(SD_CORE, "utf8");
  const books = [];
  for (const blockName of ["const CANON = [", "const APOCRYPHA = ["]) {
    const a = s.indexOf(blockName);
    const b = s.indexOf("].map(", a);
    const body = s.slice(a + blockName.length, b);
    for (const m of body.matchAll(/\[\s*"([a-z0-9-]+)"\s*,\s*"([^"]+)"\s*,\s*(\d+)(?:\s*,\s*"([a-z0-9-]+)")?\s*\]/g)) {
      books.push({ slug: m[1], name: m[2], chapters: +m[3], lib: m[4] || m[1] });
    }
  }
  return books;
}
const libSlugOf = (name, canon) => {
  const n = String(name).replace(/^Song of Songs$/, "Song of Solomon").replace(/^Ecclesiasticus$/, "Sirach");
  const hit = canon.find((b) => b.name === n);
  return hit ? hit.lib : null;
};

/* ── The library ─────────────────────────────────────────────────────────── */

async function getJSON(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) return r.json();
    if (r.status === 404) return null;
    await new Promise((res) => setTimeout(res, 600 * (attempt + 1)));
  }
  throw new Error(`could not fetch ${url}`);
}

async function loadWork(slug, dir, refresh) {
  const file = join(dir, `${slug}.json`);
  if (!refresh && existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const w = await getJSON(`${LIBRARY}/v1/works/${slug}/work.json`);
  if (w) writeFileSync(file, JSON.stringify(w));
  return w;
}

/* ── Reading a document into articles ────────────────────────────────────── */

const ROMAN = /^[IVXLCDM]+$/;
const fromRoman = (s) => {
  const v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let n = 0;
  for (let i = 0; i < s.length; i++) n += (v[s[i]] < (v[s[i + 1]] || 0) ? -1 : 1) * v[s[i]];
  return n;
};
const numOf = (s) => (/^\d+$/.test(s) ? +s : ROMAN.test(s.toUpperCase()) ? fromRoman(s.toUpperCase()) : null);
const plain = (s) => String(s).replace(/[*_]+/g, "").replace(/\s+/g, " ").trim();
const cap = (s, n) => (s.length <= n ? s : `${s.slice(0, n).replace(/\s+\S*$/, "")}`);

// "Westminster Confession of Faith (1646)" -> "Westminster Confession of Faith"
const shortTitle = (t) => plain(t).replace(/\s*\((?:\d{3,4}|[^)]*\d{4}[^)]*)\)\s*$/, "").replace(/^The\s+(?=\S)/, "").trim();

// A document that numbers its articles as plain paragraphs ("1. That there is but one God ..."): six in a row, counting from 1.
function numberedParagraphs(work) {
  let want = 1; let best = 0;
  for (const page of work.pages || []) {
    for (const b of String(page.en || "").split(/\n\s*\n/)) {
      const m = /^(\d{1,3})\.\s+\S/.exec(plain(b));
      if (m && plain(b).length >= 60 && +m[1] === want) { want++; best = Math.max(best, want - 1); }
    }
  }
  return best >= 6;
}

/**
 * The blocks of a work, each with the article it belongs to.
 * An article is a section the document itself numbers (a chapter section, a
 * question, an article); a document that numbers nothing is read by its heads.
 */
function* articles(work, entries) {
  const st = { kind: "Art.", chap: null, chapTitle: "", art: null, artTitle: "", para: null, q: null, qText: "", topic: "", dz: null, seq: 0, artSeq: false };
  const reset = { para: null, q: null, qText: "", seq: 0, artSeq: false, kind: "Art." };
  const seqOk = numberedParagraphs(work);
  for (const page of work.pages || []) {
    const blocks = String(page.en || "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    for (const b of blocks) {
      const flat = plain(b);
      const head = /^#{1,6}\s+(.*)$/.exec(b);
      if (head) {
        const h = plain(head[1]);
        let m;
        if ((m = /^(article|art\.|part)\s+([IVXLCDM]+|\d+)\b[\s.:\-–—]*(.*)$/i.exec(h)) && numOf(m[2])) {
          Object.assign(st, reset, { art: numOf(m[2]), kind: /^part/i.test(m[1]) ? "Part" : "Art.", artTitle: cap(m[3].replace(/^[.:\-–—\s]+/, ""), 70), topic: "" });
        } else if ((m = /^(?:chap(?:ter)?\.?)\s+([IVXLCDM]+|\d+)\b[\s.:\-–—]*(.*)$/i.exec(h)) && numOf(m[1])) {
          Object.assign(st, reset, { chap: numOf(m[1]), chapTitle: cap(m[2].replace(/^[.:\-–—\s]+/, ""), 70), art: null, artTitle: "", topic: "" });
        } else if ((m = /^([IVXLCDM]+|\d+)\.?$/.exec(h)) && numOf(m[1])) {
          Object.assign(st, reset, { art: numOf(m[1]), artTitle: "", topic: "" });
        } else if ((m = /^(\d+)\.\s+(.+)$/.exec(h))) {
          Object.assign(st, reset, { art: +m[1], artTitle: cap(m[2], 70), topic: "" });
        } else if (!/^lord.s day\b/i.test(h)) {
          st.topic = cap(h, 70);
        }
        continue;
      }
      // a chapter named in a plain paragraph: "CHAP. I.—Of the Holy Scripture."
      let m = /^(?:CHAP(?:TER)?\.?)\s+([IVXLCDM]+|\d+)\b[\s.:\-–—]*(.*)$/.exec(flat);
      if (m && numOf(m[1]) && flat.length < 140) {
        Object.assign(st, reset, { chap: numOf(m[1]), chapTitle: cap(m[2].replace(/[.\s]+$/, ""), 70), art: null, artTitle: "", topic: "" });
        continue;
      }
      const wrapped = /^[*_]/.test(b);
      if (!entries) {
        // a question: "**Q. 1.** *What is ...?*", "*1. What ...?*", "*2. M. Why ...?*"; "Q. Who made ...? (Matt. 19:4)" has no number
        m = /^Q(?:uestion|\.)?\s*(\d+)\.?\s*(.*)$/i.exec(flat) || /^(\d+)\.?\s*(?:M\.|Minister\.)\s*(.*)$/.exec(flat)
          || (wrapped ? /^(\d+)\.\s+(.*\?)\s*$/.exec(flat) : null);
        if (m) {
          st.q = +m[1]; st.qText = cap(m[2].replace(/\s*\(.*$/, ""), 110); st.para = null;
          yield { page: page.n, text: b, label: `Q.${st.q}`, title: st.qText };
          continue;
        }
        if (/^Q\.\s/.test(flat)) {
          yield { page: page.n, text: b, label: st.topic || `p. ${page.n}`, title: cap(flat.replace(/^Q\.\s*/, "").replace(/\s*\(.*$/, ""), 110) };
          continue;
        }
        // an article head set as a line of its own: "*1. God*"
        m = wrapped && flat.length < 90 && !/[.!?]$/.test(flat) ? /^(\d+)\.\s+(.+)$/.exec(flat) : null;
        if (m) { Object.assign(st, reset, { art: +m[1], artTitle: cap(m[2], 70), topic: "" }); continue; }
        // an italic line of its own names the part: "*Of the Holy Scriptures*"
        if (wrapped && flat.length < 90 && /[*_]$/.test(b) && !/\d:\d/.test(flat)) {
          if (st.chap != null && !st.chapTitle && st.para == null) st.chapTitle = cap(flat, 70); else st.topic = cap(flat, 70);
          continue;
        }
      }
      // a numbered paragraph inside a chapter or article: "1. The Holy Scripture ...", "I. ALTHOUGH ..."
      m = flat.length >= 60 ? /^(\d{1,3}|[IVXL]{1,6})\.\s+\S/.exec(flat) : null;
      if (m) {
        const n = numOf(m[1]);
        if (n && seqOk && !entries && st.chap == null && st.q == null && (st.art == null || st.artSeq) && (n === st.seq + 1 || n === 1)) {
          // a document that numbers its articles as paragraphs ("1. That there is but one God ...")
          Object.assign(st, { art: n, artTitle: "", seq: n, artSeq: true, para: null });
        } else if (n && (st.chap != null || st.art != null)) { if (st.para == null || n === st.para + 1 || n <= 2) st.para = n; }
      }
      // Denzinger: a paragraph opens with its number ("787. That our Catholic faith ...")
      const dm = /^(\d{1,4})[a-z]?\.\s/.exec(flat);
      if (entries && dm) st.dz = +dm[1];
      let label; let title = "";
      if (entries) {
        label = `Denz. ${st.dz == null ? entries[0].lo : st.dz}`;
      } else if (st.q != null && st.chap == null && st.art == null) {
        label = `Q.${st.q}`; title = st.qText;
      } else if (st.chap != null && st.para != null) {
        label = `${st.chap}.${st.para}`; title = st.chapTitle;
      } else if (st.art != null) {
        label = `${st.kind} ${st.art}`; title = st.artTitle || st.topic;
      } else if (st.chap != null) {
        label = `Ch. ${st.chap}`; title = st.chapTitle;
      } else if (st.topic) {
        label = `p. ${page.n}`; title = st.topic;
      } else {
        label = `p. ${page.n}`;
      }
      yield { page: page.n, text: b, label, title, dz: st.dz };
    }
  }
}

/* ── The clause a citation stands behind ─────────────────────────────────── */

const GAP = /^(?:[\s;,.:()[\]&]|and\b|et\b|ch\b|chap\b|cap\b|c\b|see\b|cf\b|also\b|ibid\b|ff?\b)*$/i;

function tidy(s) {
  let t = String(s).replace(/\[\d+\]/g, " ").replace(/[*_]+/g, "").replace(/\s+/g, " ").trim();
  t = t.replace(/\s+([,;:.])/g, "$1").replace(/^(?:[IVXL]{1,6}|\d{1,3})\.\s+/, "").replace(/^(?:Proofs?|A)\.\s*/, "").replace(/^[,;:.)\]\s]+/, "").replace(/[,;:\s("“”]+$/, "").trim();
  // a clause that opens in capitals ("ALTHOUGH the light of nature") is set as a sentence
  t = t.replace(/^([A-Z]{2,})(?=\s|,|$)/, (w) => w[0] + w.slice(1).toLowerCase());
  return t;
}

function cutClause(t) {
  if (t.length <= 230) return t;
  const tail = t.slice(-230);
  const k = tail.search(/[.;:?!]\s+(?=\S)/);
  if (k >= 0 && tail.length - k > 40) return tail.slice(k + 1).trim();
  return `…${tail.replace(/^\S*\s+/, "")}`;
}

// the text with its citations taken out, and their empty brackets
function withoutRefs(text, refs) {
  let out = ""; let at = 0;
  for (const r of refs) { out += text.slice(at, r.start); at = r.end; }
  out += text.slice(at);
  return out.replace(/[([]\s*(?:[;,.\s]|cf\.?|see|etc\.?)*[)\]]/gi, " ").replace(/\s+/g, " ");
}
// a block that is only a list of proofs ("Proofs. Genesis 1:1; Psalm 33:6.", "(Deut. 4:35; 6:4; ...)")
const citeOnly = (text, refs) => withoutRefs(text, refs).replace(/\b(?:proofs?|scripture|scriptures|see|cf|etc|and|also|ibid)\b/gi, "").replace(/[^\p{L}]/gu, "").length < 12;
// the opening of a block, for the list of proofs that follows it
const leadOf = (text, refs) => {
  const t = tidy(withoutRefs(text, refs));
  const stop = t.slice(0, 260).search(/[.?!]["”’)]?\s+(?=[A-Z“"])/);
  return cutClause(stop > 40 ? t.slice(0, stop + 1) : cap(t, 220));
};
const DANGLING = /\b(?:is|are|was|were|be|been|the|a|an|of|and|that|who|which|whom|to|in|by|for|with|as|from|his|her|their|our|have|has|had|not|but|or|it|they|he|we|on|at|into|unto|upon)$/i;

/** Groups of references that stand behind one clause, each with that clause. */
function citedClauses(text, refs, lead) {
  const groups = [];
  for (const r of refs) {
    const g = groups[groups.length - 1];
    if (g && GAP.test(text.slice(g.refs[g.refs.length - 1].end, r.start))) g.refs.push(r);
    else groups.push({ refs: [r] });
  }
  if (lead && citeOnly(text, refs)) {
    // the proofs stand apart from the sentence they prove: they prove the block before
    for (const g of groups) g.clause = lead;
    return groups;
  }
  let boundary = 0;
  for (const g of groups) {
    const first = g.refs[0]; const last = g.refs[g.refs.length - 1];
    const open = /[([]\s*(?:cf\.?|see|compare)?\s*$/i.exec(text.slice(0, first.start));
    const clauseEnd = open ? first.start - open[0].length : first.start;
    let clause = tidy(text.slice(boundary, clauseEnd));
    // a block that opens with its citations ("Exodus 20:2; Isaiah 40:18.") or with the word "Proofs" proves the statement before it
    if (lead && (clause.length < 16 || /^proofs?\b/i.test(clause)) && boundary === 0) clause = lead;
    if (clause.length < 16) {
      // "No (Gen. 1:31)": too little to stand alone, so the opening of the block, without its citations
      const own = leadOf(text, refs);
      clause = own.length >= clause.length ? own : clause;
    }
    clause = cutClause(clause);
    const close = /^\s*[)\]]/.exec(text.slice(last.end));
    boundary = last.end + (close ? close[0].length : 0);
    // a clause that breaks off mid-sentence ("the eternal Son of God, who is (John 1:1)") is finished with what follows the citation
    if (DANGLING.test(clause)) {
      const rest = text.slice(boundary).replace(/^\s*[([][^)\]]*[)\]]/, "");
      const stop = rest.search(/[,;:.?!([]/);
      const tail = tidy(stop >= 0 ? rest.slice(0, stop) : rest);
      if (tail && tail.length <= 110) clause = `${clause}\t${tail}`;
    }
    g.clause = clause;
  }
  return groups;
}

/* ── Verses ──────────────────────────────────────────────────────────────── */

function versesOf(query) {
  const c = /^(.+?)\s+(\d{1,3})$/.exec(String(query));
  if (c) return { chapterOnly: true, book: c[1], chapter: +c[2] };
  const m = /^(.+?)\s+(\d{1,3}):([\d,-]+)$/.exec(String(query));
  if (!m) return null;
  const verses = [];
  for (const part of m[3].split(",")) {
    const r = /^(\d{1,3})(?:-(\d{1,3}))?$/.exec(part);
    if (!r) return null;
    const lo = +r[1]; const hi = +(r[2] || r[1]);
    if (hi < lo || hi - lo > 59) return { big: true, book: m[1], chapter: +m[2] };
    for (let v = lo; v <= hi; v++) verses.push(v);
  }
  return { book: m[1], chapter: +m[2], verses };
}

/* ── Build ───────────────────────────────────────────────────────────────── */

async function build() {
  const { scriptureReferences, confessionTradition } = await loadModules();
  const canon = canonFromCore();
  const dir = opt("--src") || join(tmpdir(), "mo-confession-proofs");
  mkdirSync(dir, { recursive: true });

  const idx = await getJSON(`${LIBRARY}/v1/confessions-index.json`);
  if (!idx || !Array.isArray(idx.confessions)) throw new Error("confessions-index.json unreadable");
  const bySlug = new Map();
  for (const r of idx.confessions) {
    if (!bySlug.has(r.slug)) bySlug.set(r.slug, []);
    bySlug.get(r.slug).push(r);
  }
  const slugs = [...bySlug.keys()].sort();

  const docs = []; const docIx = new Map();
  const docFor = (slug, row, title) => {
    const key = `${slug}|${title}`;
    if (docIx.has(key)) return docIx.get(key);
    docs.push({ s: slug, t: title, y: row.year || 0, c: confessionTradition(row.title, row.tradition, slug) || row.tradition || "", k: row.type || "" });
    docIx.set(key, docs.length - 1);
    return docs.length - 1;
  };

  const books = new Map(); // lib slug -> { arts, artIx, xs, xIx, v }
  const report = { documents: slugs.length, withProofs: 0, noProofs: [], refs: 0, chapterOnly: 0, unreadable: 0, bigRanges: 0, unknownBook: 0, noText: [] };
  const per = new Map();
  const bookOf = (lib) => {
    if (!books.has(lib)) books.set(lib, { arts: [], artIx: new Map(), xs: [], xIx: new Map(), v: new Map(), c: new Map() });
    return books.get(lib);
  };

  let done = 0;
  const pool = 8; let next = 0;
  const works = new Map();
  await Promise.all(Array.from({ length: pool }, async () => {
    while (next < slugs.length) {
      const slug = slugs[next++];
      works.set(slug, await loadWork(slug, dir, has("--refresh")));
      if (++done % 50 === 0) process.stderr.write(`  fetched ${done}/${slugs.length}\n`);
    }
  }));

  for (const slug of slugs) {
    const rows = bySlug.get(slug);
    const work = works.get(slug);
    if (!work || !Array.isArray(work.pages)) { report.noText.push(slug); continue; }
    const first = rows[0];
    const multi = rows.length > 1 && rows.some((r) => r.dz);
    const entries = multi ? rows.map((r) => {
      const nums = String(r.dz || "").match(/\d+/g) || [];
      return { row: r, lo: +(nums[0] || 0), hi: +(nums[nums.length - 1] || nums[0] || 0) };
    }).filter((e) => e.lo) : null;
    globalThis.DATA = { tradition: first.tradition, slug };
    let got = 0; let lead = "";
    for (const blk of articles(work, entries)) {
      let refs;
      try { refs = scriptureReferences(blk.text) || []; } catch { refs = []; }
      if (!refs.length) { if (!/^#/.test(blk.text)) { const l = leadOf(blk.text, []); if (l.length >= 40 && !/^proofs?\b/i.test(l)) lead = l; } continue; }
      const only = citeOnly(blk.text, refs);
      const entry = entries ? (entries.find((e) => blk.dz >= e.lo && blk.dz <= e.hi) || entries[0]) : null;
      const row = entry ? entry.row : first;
      const title = entry ? plain(row.title) : shortTitle(first.title);
      const d = docFor(slug, row, title);
      for (const g of citedClauses(blk.text, refs, lead)) {
        for (const r of g.refs) {
          report.refs++;
          const v = versesOf(r.query);
          if (!v) { report.unreadable++; continue; }
          if (v.big) { report.bigRanges++; continue; }
          const lib = libSlugOf(v.book, canon);
          if (!lib) { report.unknownBook++; continue; }
          const bk = bookOf(lib);
          const akey = `${d}|${blk.label}|${blk.page}`;
          if (!bk.artIx.has(akey)) { bk.arts.push([d, blk.label, blk.page, blk.title || ""]); bk.artIx.set(akey, bk.arts.length - 1); }
          if (!bk.xIx.has(g.clause)) { bk.xs.push(g.clause); bk.xIx.set(g.clause, bk.xs.length - 1); }
          const a = bk.artIx.get(akey); const x = bk.xIx.get(g.clause);
          if (v.chapterOnly) {
            // "Gen. 1", "Isa. 53": the document cites the chapter as a whole, which is kept apart from a verse it names
            report.chapterOnly++;
            const ck = String(v.chapter);
            if (!bk.c.has(ck)) bk.c.set(ck, []);
            if (!bk.c.get(ck).some((e) => e[0] === a)) bk.c.get(ck).push([a, x]);
            got++;
            continue;
          }
          for (const n of v.verses) {
            const key = `${v.chapter}:${n}`;
            if (!bk.v.has(key)) bk.v.set(key, []);
            const list = bk.v.get(key);
            if (!list.some((e) => e[0] === a)) list.push([a, x]); // one clause per article per verse
          }
          got++;
        }
      }
      if (!only && refs[0].start > 40) { const l = leadOf(blk.text, refs); if (l.length >= 40 && !/^proofs?\b/i.test(l)) lead = l; }
    }
    delete globalThis.DATA;
    per.set(slug, got);
    if (got) report.withProofs++; else report.noProofs.push(slug);
  }

  // write, in a stable order, and sweep what a smaller run no longer produces
  mkdirSync(OUT, { recursive: true });
  const written = new Set(["index.json"]);
  let verseCount = 0; let chapterCount = 0; const bookCounts = {};
  const used = new Set();
  for (const bk of books.values()) for (const m of [bk.v, bk.c]) for (const list of m.values()) for (const [a] of list) used.add(bk.arts[a][0]);
  // keep only documents that are cited, renumbering them in catalogue order
  const order = [...used].sort((x, y) => (docs[x].y - docs[y].y) || docs[x].t.localeCompare(docs[y].t));
  const remap = new Map(order.map((o, i) => [o, i]));
  for (const [lib, bk] of [...books].sort((a, b) => a[0].localeCompare(b[0]))) {
    const keys = [...bk.v.keys()].sort((p, q) => {
      const [pc, pv] = p.split(":").map(Number); const [qc, qv] = q.split(":").map(Number);
      return pc - qc || pv - qv;
    });
    const sortList = (list) => list.sort((p, q) => remap.get(bk.arts[p[0]][0]) - remap.get(bk.arts[q[0]][0]) || bk.arts[p[0]][2] - bk.arts[q[0]][2]);
    const v = {};
    for (const k of keys) v[k] = sortList(bk.v.get(k));
    const c = {};
    for (const k of [...bk.c.keys()].sort((p, q) => p - q)) c[k] = sortList(bk.c.get(k));
    const out = { v, c, a: bk.arts.map(([d, label, page, title]) => [remap.get(d), label, page, title]), x: bk.xs };
    writeFileSync(join(OUT, `${lib}.json`), `${JSON.stringify(out)}\n`);
    written.add(`${lib}.json`);
    verseCount += keys.length; bookCounts[lib] = keys.length;
    chapterCount += Object.keys(c).length;
  }
  const index = {
    v: 1,
    note: "Built by scripts/build-confession-proofs.mjs from the library's creeds, confessions and catechisms. Do not edit by hand.",
    docs: order.map((o) => docs[o]),
    totals: { documents: order.length, verses: verseCount, chapters: chapterCount, citations: report.refs },
    books: bookCounts,
  };
  writeFileSync(join(OUT, "index.json"), `${JSON.stringify(index)}\n`);
  for (const f of readdirSync(OUT)) if (!written.has(f)) unlinkSync(join(OUT, f));

  console.log(`confession proofs: ${order.length} documents cite ${verseCount} verses in ${books.size} books (${report.refs} citations read)`);
  console.log(`  of ${report.documents} documents, ${report.withProofs} print a verse-level citation`);
  console.log(`  ${report.chapterOnly} citations name a chapter only (kept apart, ${chapterCount} chapters); ${report.bigRanges} ranges over 60 verses and ${report.unreadable} unreadable skipped; ${report.unknownBook} outside the canon the page reads`);
  if (report.noText.length) console.log(`  no text in the library: ${report.noText.join(", ")}`);
  if (has("--report")) {
    console.log(`\nDocuments with no verse-level citation (${report.noProofs.length}):`);
    for (const s of report.noProofs) console.log(`  ${s}`);
    console.log("\nCitations per document:");
    for (const [s, n] of [...per].filter(([, n]) => n).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${s}`);
  }
}

/* ── Check (offline) ─────────────────────────────────────────────────────── */

async function check() {
  const problems = [];
  const bad = (m) => problems.push(m);
  const { scriptureReferences } = await loadModules();

  // the parser still reads the forms the confessions print
  const CASES = [
    ["(Rom. 2:14–15; 1:19–20; Ps. 19:1–3; Rom. 1:32; 2:1)", "Romans 2:14-15 | Romans 1:19-20 | Psalms 19:1-3 | Romans 1:32 | Romans 2:1"],
    ["(Gen. 1:1; Heb. 11:3)", "Genesis 1:1 | Hebrews 11:3"],
    ["(John 1:1, 14)", "John 1:14,1"],
    ["(Matt. 4:4, 7, 10; Isa. 8:19–20)", "Matthew 4:4,7,10 | Isaiah 8:19-20"],
    ["[Romans 5:12], all who", "Romans 5:12"],
    ["(Ps. 19:1ff)", "Psalms 19:1"],
    ["(1 Cor. 6:19; 1 Peter 1:18–19)", "1 Corinthians 6:19 | 1 Peter 1:18-19"],
  ];
  globalThis.DATA = { tradition: "Reformed" };
  for (const [text, want] of CASES) {
    const got = (scriptureReferences(text) || []).map((r) => r.query).join(" | ");
    // "John 1:1, 14" is one citation with two verses; the linker's own order is what is held
    if (text.includes("John 1:1, 14")) { if (!/^John 1:1,14$/.test(got)) bad(`parser: ${text} gave ${got}`); continue; }
    if (got !== want) bad(`parser: ${text}\n    got  ${got}\n    want ${want}`);
  }
  globalThis.DATA = { tradition: "Roman Catholic" };
  const rc = (scriptureReferences("(Ps. XVIII, 2)") || []).map((r) => r.query).join(" | ");
  if (!/^Psalms 19:/.test(rc)) bad(`parser: a Catholic document's Psalm XVIII should read as Psalm 19, got ${rc}`);
  delete globalThis.DATA;

  // the committed data
  if (!existsSync(join(OUT, "index.json"))) { bad("index.json is missing: run node scripts/build-confession-proofs.mjs"); }
  else {
    const index = JSON.parse(readFileSync(join(OUT, "index.json"), "utf8"));
    const libs = new Set(canonFromCore().map((b) => b.lib));
    const files = readdirSync(OUT).filter((f) => f !== "index.json");
    if (files.length !== Object.keys(index.books).length) bad(`index.json lists ${Object.keys(index.books).length} books, ${files.length} files exist`);
    let verses = 0;
    for (const f of files) {
      const lib = f.replace(/\.json$/, "");
      if (!libs.has(lib)) { bad(`${f}: not a book the Scripture page reads`); continue; }
      const d = JSON.parse(readFileSync(join(OUT, f), "utf8"));
      const max = canonFromCore().find((b) => b.lib === lib).chapters;
      for (const [k, list] of Object.entries(d.v)) {
        const m = /^(\d+):(\d+)$/.exec(k);
        if (!m || +m[1] < 1 || +m[1] > max) { bad(`${f}: bad verse key ${k}`); continue; }
        verses++;
        for (const [a, x] of list) {
          if (!d.a[a]) bad(`${f} ${k}: article ${a} is not in the table`);
          else if (!index.docs[d.a[a][0]]) bad(`${f} ${k}: document ${d.a[a][0]} is not in index.json`);
          if (typeof d.x[x] !== "string" || !d.x[x]) bad(`${f} ${k}: clause ${x} is empty`);
        }
      }
      for (const [k, list] of Object.entries(d.c || {})) {
        if (!(+k >= 1 && +k <= max)) { bad(`${f}: bad chapter key ${k}`); continue; }
        for (const [a, x] of list) if (!d.a[a] || !index.docs[d.a[a][0]] || !d.x[x]) bad(`${f} chapter ${k}: a row points at nothing`);
      }
    }
    if (index.totals.verses !== verses) bad(`index.json says ${index.totals.verses} verses, the files hold ${verses}`);
    // known answers, read against the documents' own text
    const read = (lib) => JSON.parse(readFileSync(join(OUT, `${lib}.json`), "utf8"));
    const at = (lib, tier, key) => { const d = read(lib); return (d[tier][key] || []).map(([a]) => { const r = d.a[a]; return `${index.docs[r[0]].s}|${r[1]}`; }); };
    const WCF = "rc-111-westminster-confession-of-faith-1646"; const HC = "rc-061-heidelberg-catechism-1563";
    // each read against the document's own text: the Confession's 1.1 cites Ps. 19:1-3, 8.2 cites John 1:1, 14, 11.3 cites Isa. 53:4-6,
    // and 4.1 cites Gen. 1 whole; the Catechism's Q.5 cites Rom. 3:10-12, 23 and Q.71 cites Matt. 28:19
    const MUST = [
      ["psalms", "v", "19:1", `${WCF}|1.1`],
      ["john", "v", "1:1", `${WCF}|8.2`],
      ["isaiah", "v", "53:5", `${WCF}|11.3`],
      ["romans", "v", "3:23", `${HC}|Q.5`],
      ["matthew", "v", "28:19", `${HC}|Q.71`],
      ["genesis", "c", "1", `${WCF}|4.1`],
    ];
    for (const [lib, tier, key, want] of MUST) {
      try { if (!at(lib, tier, key).includes(want)) bad(`${lib} ${key} should cite ${want}`); } catch { bad(`${lib}.json is unreadable`); }
    }
  }
  if (problems.length) {
    console.error(`confession proofs: ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log("confession proofs: data well formed, parser holds");
}

if (has("--check")) await check();
else await build();
