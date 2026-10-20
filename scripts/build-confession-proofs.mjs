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
 *   index.json          the documents that cite anything, the totals, and which chapters have a file
 *   <book>/<ch>.json    one file per chapter, keyed by the library's book slug
 *                       { v: { "1": [[article, clause], ...] }, c: [[article, clause], ...],
 *                         a: [[doc, label, page, title, paragraph], ...], x: ["clause", ...] }
 *                       (article and clause are indexes into a and x; c holds the articles that
 *                       cite the chapter as a whole; paragraph is the reader's b<page>-<n>)
 *
 *   node scripts/build-confession-proofs.mjs            fetch the library, write
 *   node scripts/build-confession-proofs.mjs --check    offline: the committed
 *                                                        data is well formed
 *                                                        and the parser still
 *                                                        reads known cases
 *   node scripts/build-confession-proofs.mjs --report   also print what could not
 *                                                        be read, per document
 *   --audit  every row of the committed data against its source page (clause on the page, paragraph cites the verse)
 *   --src <dir>   cache of the library's work.json files (default: the OS temp
 *                 dir); --refresh fetches them again.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
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
const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
// a heading that opens the errors a document rejects ("Rejection of Errors", "Errors rejected concerning election", "Separate rejection of accusations")
const REJECTION = /\brejection\b|\berrors?\s+rejected|\banathemas?\b|\bcondemnations?\b/i;

function* articles(work, entries) {
  const st = { kind: "Art.", head: "", rej: false, chap: null, chapTitle: "", art: null, artTitle: "", para: null, q: null, qText: "", topic: "", dz: null, seq: 0, artSeq: false };
  const reset = { para: null, q: null, qText: "", seq: 0, artSeq: false, kind: "Art.", rej: false };
  const seqOk = numberedParagraphs(work);
  for (const page of work.pages || []) {
    const blocks = String(page.en || "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    // the reader numbers a page's paragraphs b<page>-<n>, counting every row but the heads
    let bi = 0;
    for (const b of blocks) {
      const flat = plain(b);
      const head = /^#{1,6}\s+(.*)$/.exec(b);
      const idx = head ? -1 : bi++;
      if (head) {
        const h = plain(head[1]);
        let m;
        if ((m = /^(?:the\s+)?((?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)(?:\s+and\s+(?:first|second|third|fourth|fifth|sixth))?)\s+(heads?|parts?|main points?)\b/i.exec(h))) {
          const ns = m[1].toLowerCase().split(/\s+and\s+/).map((w) => ORD[w]);
          const noun = /^head/i.test(m[2]) ? "Head" : /^part/i.test(m[2]) ? "Part" : "Point";
          Object.assign(st, reset, { head: ns.length > 1 ? `${noun}s ${ns.join(" and ")}` : `${noun} ${ns[0]}`, art: null, artTitle: "", topic: "" });
        } else if (/^conclusion$/i.test(h)) {
          Object.assign(st, reset, { head: "", art: null, artTitle: "", chap: null, chapTitle: "", topic: cap(h, 70) });
        } else if (h.length < 70 && REJECTION.test(h) && !/^\[?conclusion/i.test(h)) {
          Object.assign(st, reset, { rej: true, art: null, artTitle: "", topic: "", chap: null, chapTitle: "" });
        } else if ((m = /^(article|art\.|part)\s+([IVXLCDM]+|\d+)\b[\s.:\-–—]*(.*)$/i.exec(h)) && numOf(m[2])) {
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
      // "Paragraph 6" opens the sixth paragraph of the part (Dort's rejections)
      let m = /^paragraph\s+(\d+)$/i.exec(flat);
      if (m) { st.para = +m[1]; continue; }
      // a chapter named in a plain paragraph: "CHAP. I.—Of the Holy Scripture."
      m = /^(?:CHAP(?:TER)?\.?)\s+([IVXLCDM]+|\d+)\b[\s.:\-–—]*(.*)$/.exec(flat);
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
          yield { page: page.n, idx, text: b, label: `Q.${st.q}`, title: st.qText };
          continue;
        }
        if (/^Q\.\s/.test(flat)) {
          yield { page: page.n, idx, text: b, label: st.topic ? `p. ${page.n}` : `p. ${page.n}`, title: cap(flat.replace(/^Q\.\s*/, "").replace(/\s*\(.*$/, ""), 110) };
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
        if (n && seqOk && !entries && st.chap == null && st.q == null && !st.rej && (st.art == null || st.artSeq) && (n === st.seq + 1 || n === 1)) {
          // a document that numbers its articles as paragraphs ("1. That there is but one God ...")
          Object.assign(st, { art: n, artTitle: "", seq: n, artSeq: true, para: null });
        } else if (n && (st.chap != null || st.art != null || st.rej)) { if (st.para == null || n === st.para + 1 || n <= 2) st.para = n; }
      }
      // Denzinger: a paragraph opens with its number ("787. That our Catholic faith ...")
      const dm = /^(\d{1,4})[a-z]?\.\s/.exec(flat);
      if (entries && dm) st.dz = +dm[1];
      const pre = st.head ? `${st.head}, ` : "";
      let label; let title = "";
      if (entries) {
        label = `Denz. ${st.dz == null ? entries[0].lo : st.dz}`;
      } else if (st.rej) {
        label = `${pre}Rejection${st.para != null ? `, par. ${st.para}` : ""}`;
      } else if (st.q != null && st.chap == null && st.art == null) {
        label = `Q.${st.q}`; title = st.qText;
      } else if (st.chap != null && st.para != null) {
        label = `${st.chap}.${st.para}`; title = st.chapTitle;
      } else if (st.art != null) {
        label = `${pre}${st.kind} ${st.art}`; title = st.artTitle || st.topic;
      } else if (st.chap != null) {
        label = `Ch. ${st.chap}`; title = st.chapTitle;
      } else if (st.topic) {
        label = `p. ${page.n}`; title = st.topic;
      } else {
        label = `p. ${page.n}`;
      }
      yield { page: page.n, idx, text: b, label, title, dz: st.dz };
    }
  }
}

/* ── The clause a citation stands behind ─────────────────────────────────── */

const GAP = /^(?:[\s;,.:()[\]&]|and\b|et\b|ch\b|chap\b|cap\b|c\b|see\b|cf\b|also\b|ibid\b|ff?\b)*$/i;

// brackets that held a citation the linker took out leave "(; ; )" or "(;1-6;;; )": a bracket with no word of its own goes
const dropEmptyBrackets = (t) => {
  let out = String(t); let prev;
  do {
    prev = out;
    out = out.replace(/[([]([^()[\]]*)[)\]]/g, (m, inner) => (/[A-Za-z]{4,}/.test(inner.replace(/\b(?:ibid|etc|see|and)\b\.?/gi, "")) ? m : " "));
  } while (out !== prev);
  return out;
};
const DEBRIS = /[;,]\s*[;,]|\(\s*[;,]|[;,]\s*\)/;

function tidy(s) {
  let t = dropEmptyBrackets(s).replace(/\[\d+\]/g, " ").replace(/[*_]+/g, "").replace(/\s+/g, " ").trim();
  t = t.replace(/\s+([,;:.])/g, "$1").replace(/^(?:[IVXL]{1,6}|\d{1,3})\.\s+/, "").replace(/^(?:Proofs?|A)\.\s*/, "").replace(/^[,;:.)\]\s]+/, "").replace(/[,;:\s("“”]+$/, "").trim();
  // a clause that opens in capitals ("ALTHOUGH the light of nature") is set as a sentence
  t = t.replace(/^([A-Z]{2,})(?=\s|,|$)/, (w) => w[0] + w.slice(1).toLowerCase());
  return t;
}

const MAXQ = 140;
function cutClause(t) {
  if (t.length <= MAXQ) return t;
  const tail = t.slice(-MAXQ);
  const k = tail.search(/[.;:?!]\s+(?=\S)/);
  if (k >= 0 && tail.length - k > 40) return tail.slice(k + 1).trim();
  return `…${tail.replace(/^\S*\s+/, "")}`;
}

// the text with its citations taken out, and their empty brackets
function withoutRefs(text, refs) {
  let out = ""; let at = 0;
  for (const r of refs) { out += text.slice(at, r.start); at = r.end; }
  out += text.slice(at);
  return dropEmptyBrackets(out).replace(/\s+/g, " ");
}
// a block that is only a list of proofs ("Proofs. Genesis 1:1; Psalm 33:6.", "(Deut. 4:35; 6:4; ...)")
const citeOnly = (text, refs) => withoutRefs(text, refs).replace(/\b(?:proofs?|scripture|scriptures|see|cf|etc|and|also|ibid)\b/gi, "").replace(/[^\p{L}]/gu, "").length < 12;
// the opening of a block, for the list of proofs that follows it
const leadOf = (text, refs) => {
  const t = tidy(withoutRefs(text, refs));
  const stop = t.slice(0, 260).search(/[.?!]["”’)]?\s+(?=[A-Z“"])/);
  return cap(stop > 40 ? t.slice(0, stop + 1) : t, MAXQ);
};
const DANGLING = /\b(?:is|are|was|were|be|been|the|a|an|of|and|that|who|which|whom|to|in|by|for|with|as|from|his|her|their|our|have|has|had|not|but|or|it|they|he|we|on|at|into|unto|upon)$/i;

/** Groups of references that stand behind one clause, each with that clause. */
const nrm = (t) => String(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
function citedClauses(text, refs, lead, leadSrc, leadOnPage) {
  const groups = [];
  for (const r of refs) {
    const g = groups[groups.length - 1];
    if (g && GAP.test(text.slice(g.refs[g.refs.length - 1].end, r.start))) g.refs.push(r);
    else groups.push({ refs: [r] });
  }
  if (lead && citeOnly(text, refs)) {
    // the proofs stand apart from the sentence they prove: they prove the block before
    for (const g of groups) g.clause = leadOnPage && leadSrc && nrm(leadSrc).includes(nrm(lead.split("\t")[0].replace(/^…\s*/, ""))) ? lead : `\u0001${lead}`;
    return groups;
  }
  let boundary = 0;
  for (const g of groups) {
    const first = g.refs[0]; const last = g.refs[g.refs.length - 1];
    const open = /[([]\s*(?:cf\.?|see|compare)?\s*$/i.exec(text.slice(0, first.start));
    const clauseEnd = open ? first.start - open[0].length : first.start;
    let clause = tidy(text.slice(boundary, clauseEnd));
    // a block that opens with its citations ("Exodus 20:2; Isaiah 40:18.") or with the word "Proofs" proves the statement before it
    if (lead && boundary === 0 && (first.start < 4 || /^proofs?\b/i.test(clause))) clause = lead;
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
      if (tail && tail.length <= 60 && clause.length + tail.length <= MAXQ + 40) clause = `${clause}\t${tail}`;
    }
    // a quote with the debris of a citation, or no words, is not shown: the row keeps its link
    if (DEBRIS.test(clause) || clause.replace(/[^\p{L}]/gu, "").length < 12) clause = "";
    // words that are not one run on the page (a block's opening with its citations taken out) are quoted but not marked in the reader
    const base = nrm(clause.split("\t")[0].replace(/^…\s*/, ""));
    if (clause && !nrm(text).includes(base) && !(leadOnPage && leadSrc && nrm(leadSrc).includes(base))) clause = `\u0001${clause}`;
    g.clause = clause;
  }
  return groups;
}

// "Eph. 2:8, 9 and 10": the linker keeps 8 and 9; the "and 10" that closes the list is read here
function andMore(r, text) {
  if (/^Psalms /.test(r.query)) return r.query;
  const m = /:([\d,-]+)$/.exec(r.query);
  if (!m) return r.query;
  let q = r.query; let last = Number(m[1].split(/[,-]/).pop());
  let at = r.end;
  for (;;) {
    const n = /^\s*(?:,\s*)?(?:and|&)\s+(\d{1,3})(?=\s*(?:[.;,)\]]|$))/.exec(text.slice(at));
    if (!n || Number(n[1]) <= last || Number(n[1]) > 200) break;
    last = Number(n[1]); q += `,${last}`; at += n[0].length;
  }
  return q;
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

/* ── Titles, dates and churches ──────────────────────────────────────────── */

const WORDCUT = (t, n) => (t.length <= n ? t : `${t.slice(0, n).replace(/\s+\S*$/, "")}…`);
const CONCILIAR = /^(?:Session\b|Chap\.?\s*\d|Canons?\b)|Council|Synod/i;

/**
 * What a reader is shown for a document. A Denzinger title reads "Session XXV (dec. 3 and 4, 1563) Decree Concerning Purgatory
 * — Pope Pius IV, 1559": the document is the decree and its own date is 1563; the pope is where the library filed it, not its author.
 */
function describe(row, slug, entry, confessionTradition) {
  const raw = plain(row.title);
  let main = raw; let src = "";
  const denz = entry || /^cf-/.test(slug);
  if (denz) { const parts = raw.split(/\s+—\s+/); main = parts[0]; src = parts.slice(1).join(" — "); }
  main = main.replace(/^Then follows:\s*/i, "").replace(/(Chap\.?\s*\d+)\s*\.?\s*\[\s*([^\]]*?)\s*\]/i, "$1. $2")
    .replace(/\s*\[\s*([^\]]*?)\s*\]/g, " ($1)").replace(/[[\]]/g, "").replace(/\s+\./g, ".").replace(/\.(?=[A-Z])/g, ". ").replace(/\s+/g, " ").trim();
  if (!denz) main = shortTitle(raw);
  const own = /\((?:[^)]*?\b)?(\d{4})\)/.exec(main);
  let year = own ? +own[1] : row.year || 0;
  src = src.replace(/,?\s*\d{2,4}\b.*$/, "").replace(/^Pope\s+(?=The\b)/, "").trim();
  if (denz && CONCILIAR.test(main) && /^Pope\b/.test(src) && year >= 1545 && year <= 1563) src = "Council of Trent";
  if (/Vatican Council/.test(src)) src = "Vatican Council I";
  let church = confessionTradition(row.title, row.tradition, slug) || row.tradition || "";
  if (church === "Roman Catholic" && year < 1054) church = "Early church";
  const papal = row.type === "Papal" && !CONCILIAR.test(`${main} ${src}`);
  return { t: WORDCUT(main, 90), y: year, u: src, c: church, k: row.type || "", ...(papal ? { p: 1 } : {}) };
}

// two rows of one article (the same document, label and page) are one row of a verse's list
const same = (bk, a, b) => { const p = bk.arts[a]; const q = bk.arts[b]; return p[0] === q[0] && p[1] === q[1] && p[2] === q[2]; };

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
  const docFor = (slug, row, entry) => {
    const info = describe(row, slug, entry, confessionTradition);
    const key = `${slug}|${info.t}`;
    if (docIx.has(key)) return docIx.get(key);
    docs.push({ s: slug, ...info });
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
    let got = 0; let lead = ""; let leadSrc = ""; let leadPage = null;
    for (const blk of articles(work, entries)) {
      // Denz. 882 prints "1Samuel 19:8" for Elijah's bread, which is 1 Kings 19:8 (3 Kings in the Vulgate)
      if (slug === "cf-093-julius-iii-1550-1555") blk.text = blk.text.replace(/\b1Samuel 19:8/g, "1 Kings 19:8");
      let refs;
      try { refs = scriptureReferences(blk.text) || []; } catch { refs = []; }
      if (!refs.length) { if (!/^#/.test(blk.text)) { const l = leadOf(blk.text, []); if (l.length >= 40 && !/^proofs?\b/i.test(l)) { lead = l; leadSrc = blk.text; leadPage = blk.page; } } continue; }
      const only = citeOnly(blk.text, refs);
      const entry = entries ? (entries.find((e) => blk.dz >= e.lo && blk.dz <= e.hi) || entries[0]) : null;
      const row = entry ? entry.row : first;
      const d = docFor(slug, row, !!entry);
      for (const g of citedClauses(blk.text, refs, lead, leadSrc, leadPage === blk.page)) {
        for (const r of g.refs) {
          report.refs++;
          const v = versesOf(andMore(r, blk.text));
          if (!v) { report.unreadable++; continue; }
          if (v.big) { report.bigRanges++; continue; }
          const lib = libSlugOf(v.book, canon);
          if (!lib) { report.unknownBook++; continue; }
          const bk = bookOf(lib);
          // a row is one paragraph of an article, so its link goes to the paragraph that cites the verse
          const akey = `${d}|${blk.label}|${blk.page}|${blk.idx}`;
          if (!bk.artIx.has(akey)) { bk.arts.push([d, blk.label, blk.page, cap(blk.title || "", 60), blk.idx]); bk.artIx.set(akey, bk.arts.length - 1); }
          if (!bk.xIx.has(g.clause)) { bk.xs.push(g.clause); bk.xIx.set(g.clause, bk.xs.length - 1); }
          const a = bk.artIx.get(akey); const x = bk.xIx.get(g.clause);
          if (v.chapterOnly) {
            // "Gen. 1", "Isa. 53": the document cites the chapter as a whole, which is kept apart from a verse it names
            report.chapterOnly++;
            const ck = String(v.chapter);
            if (!bk.c.has(ck)) bk.c.set(ck, []);
            if (!bk.c.get(ck).some((e) => same(bk, e[0], a))) bk.c.get(ck).push([a, x]);
            got++;
            continue;
          }
          for (const n of v.verses) {
            const key = `${v.chapter}:${n}`;
            if (!bk.v.has(key)) bk.v.set(key, []);
            const list = bk.v.get(key);
            if (!list.some((e) => same(bk, e[0], a))) list.push([a, x]); // one clause per article per verse
          }
          got++;
        }
      }
      if (!only && refs[0].start > 40) { const l = leadOf(blk.text, refs); if (l.length >= 40 && !/^proofs?\b/i.test(l)) { lead = l; leadSrc = blk.text; leadPage = blk.page; } }
    }
    delete globalThis.DATA;
    per.set(slug, got);
    if (got) report.withProofs++; else report.noProofs.push(slug);
  }

  // write one file per chapter (a book such as Romans is 300 KB, a chapter of it is a few), in a stable order
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  let verseCount = 0; let chapterCount = 0; let files = 0; let biggest = 0;
  const chapters = {}; const bookCounts = {};
  const used = new Set();
  for (const bk of books.values()) for (const m of [bk.v, bk.c]) for (const list of m.values()) for (const [a] of list) used.add(bk.arts[a][0]);
  // keep only documents that are cited, renumbering them in catalogue order
  const order = [...used].sort((x, y) => (docs[x].y - docs[y].y) || docs[x].t.localeCompare(docs[y].t));
  const remap = new Map(order.map((o, i) => [o, i]));
  for (const [lib, bk] of [...books].sort((a, b) => a[0].localeCompare(b[0]))) {
    const sortList = (list) => list.slice().sort((p, q) => remap.get(bk.arts[p[0]][0]) - remap.get(bk.arts[q[0]][0]) || bk.arts[p[0]][2] - bk.arts[q[0]][2] || bk.arts[p[0]][4] - bk.arts[q[0]][4]);
    const chs = new Set([...bk.v.keys()].map((k) => +k.split(":")[0]).concat([...bk.c.keys()].map(Number)));
    bookCounts[lib] = 0; chapters[lib] = [];
    for (const ch of [...chs].sort((x, y) => x - y)) {
      const aIx = new Map(); const xIx = new Map(); const arts = []; const xs = [];
      const take = (list) => sortList(list).map(([a, x]) => {
        if (!aIx.has(a)) { const r = bk.arts[a]; arts.push([remap.get(r[0]), r[1], r[2], r[3], r[4]]); aIx.set(a, arts.length - 1); }
        if (!xIx.has(x)) { xs.push(bk.xs[x]); xIx.set(x, xs.length - 1); }
        return [aIx.get(a), xIx.get(x)];
      });
      const v = {};
      const keys = [...bk.v.keys()].filter((k) => +k.split(":")[0] === ch).sort((p, q) => +p.split(":")[1] - +q.split(":")[1]);
      for (const k of keys) v[k.split(":")[1]] = take(bk.v.get(k));
      const c = bk.c.has(String(ch)) ? take(bk.c.get(String(ch))) : [];
      const text = `${JSON.stringify({ v, c, a: arts, x: xs })}\n`;
      mkdirSync(join(OUT, lib), { recursive: true });
      writeFileSync(join(OUT, lib, `${ch}.json`), text);
      files++; biggest = Math.max(biggest, text.length);
      chapters[lib].push(ch);
      verseCount += keys.length; bookCounts[lib] += keys.length;
      if (c.length) chapterCount++;
    }
  }
  const index = {
    v: 2,
    note: "Built by scripts/build-confession-proofs.mjs from the library's creeds, confessions and catechisms. Do not edit by hand.",
    docs: order.map((o) => docs[o]),
    totals: { documents: order.length, verses: verseCount, chapters: chapterCount, citations: report.refs },
    chapters,
  };
  writeFileSync(join(OUT, "index.json"), `${JSON.stringify(index)}\n`);

  console.log(`confession proofs: ${order.length} documents cite ${verseCount} verses in ${books.size} books, ${files} chapter files, largest ${Math.round(biggest / 1024)} KB (${report.refs} citations read)`);
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
    const canon = canonFromCore();
    let verses = 0; let files = 0;
    const read = (lib, ch) => JSON.parse(readFileSync(join(OUT, lib, `${ch}.json`), "utf8"));
    for (const [lib, chs] of Object.entries(index.chapters)) {
      const book = canon.find((b) => b.lib === lib);
      if (!book) { bad(`${lib}: not a book the Scripture page reads`); continue; }
      for (const ch of chs) {
        if (!(ch >= 1 && ch <= book.chapters)) { bad(`${lib}: chapter ${ch} does not exist`); continue; }
        const f = join(OUT, lib, `${ch}.json`);
        if (!existsSync(f)) { bad(`${lib}/${ch}.json is listed in index.json and missing`); continue; }
        files++;
        const d = read(lib, ch);
        if (readFileSync(f).length > 150 * 1024) bad(`${lib}/${ch}.json is over 150 KB`);
        const point = (a, x, where) => {
          if (!d.a[a]) bad(`${where}: article ${a} is not in the table`);
          else if (!index.docs[d.a[a][0]]) bad(`${where}: document ${d.a[a][0]} is not in index.json`);
          else if (!Number.isInteger(d.a[a][4]) || d.a[a][4] < 0) bad(`${where}: article ${a} has no paragraph index`);
          if (typeof d.x[x] !== "string") bad(`${where}: clause ${x} is not a string`);
          else if (DEBRIS.test(d.x[x])) bad(`${where}: clause carries the debris of a citation: ${d.x[x].slice(0, 50)}`);
        };
        for (const [k, list] of Object.entries(d.v)) { verses++; for (const [a, x] of list) point(a, x, `${lib} ${ch}:${k}`); }
        for (const [a, x] of d.c) point(a, x, `${lib} ${ch}`);
      }
    }
    const onDisk = readdirSync(OUT).filter((f) => f !== "index.json").flatMap((dname) => readdirSync(join(OUT, dname)));
    if (onDisk.length !== files) bad(`index.json lists ${files} chapter files, ${onDisk.length} exist`);
    for (const doc of index.docs) {
      if (doc.t.length > 91 || /Pope The|Then follows|[[\]]/.test(doc.t)) bad(`document title needs cleaning: ${doc.t}`);
    }
    if (index.totals.verses !== verses) bad(`index.json says ${index.totals.verses} verses, the files hold ${verses}`);
    // known answers, read against the documents' own text
    const at = (lib, ch, tier, key) => { const d = read(lib, ch); const list = tier === "v" ? d.v[key] || [] : d.c; return list.map(([a]) => { const r = d.a[a]; return `${index.docs[r[0]].s}|${r[1]}`; }); };
    const WCF = "rc-111-westminster-confession-of-faith-1646"; const HC = "rc-061-heidelberg-catechism-1563"; const DORT = "rc-105-canons-of-dort-1618";
    // each read against the document's own text: the Confession's 1.1 cites Ps. 19:1-3, 8.2 cites John 1:1, 14, 11.3 cites Isa. 53:4-6,
    // and 4.1 cites Gen. 1 whole; the Catechism's Q.5 cites Rom. 3:10-12, 23 and Q.71 cites Matt. 28:19; Dort's rejections of the
    // Third and Fourth Heads cite Eph. 2:3 and are not Article 9 of anything
    const MUST = [
      ["psalms", 19, "v", "1", `${WCF}|1.1`],
      ["john", 1, "v", "1", `${WCF}|8.2`],
      ["isaiah", 53, "v", "5", `${WCF}|11.3`],
      ["romans", 3, "v", "23", `${HC}|Q.5`],
      ["matthew", 28, "v", "19", `${HC}|Q.71`],
      ["genesis", 1, "c", "", `${WCF}|4.1`],
    ];
    for (const [lib, ch, tier, key, want] of MUST) {
      try { if (!at(lib, ch, tier, key).includes(want)) bad(`${lib} ${ch}:${key} should cite ${want}`); } catch { bad(`${lib}/${ch}.json is unreadable`); }
    }
    try {
      const eph = at("ephesians", 2, "v", "3").filter((x) => x.startsWith(DORT));
      if (!eph.some((x) => /Rejection/.test(x))) bad(`Eph. 2:3 should be cited in a Dort Rejection of Errors, got ${eph.join("; ")}`);
      if (eph.some((x) => /\|Art\. 9$/.test(x) || /\|Art\. 1[0-9]$/.test(x))) bad("Eph. 2:3 in Dort's rejections wears an article number it does not have");
    } catch { bad("ephesians/2.json is unreadable"); }
  }
  if (problems.length) {
    console.error(`confession proofs: ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log("confession proofs: data well formed, parser holds");
}


/* ── Audit: every row against its source page ────────────────────────────── */

// For each row of the committed data: the clause is on the page it names, and the paragraph it links to cites the verse.
async function audit() {
  const { scriptureReferences } = await loadModules();
  const dir = opt("--src") || join(tmpdir(), "mo-confession-proofs");
  const index = JSON.parse(readFileSync(join(OUT, "index.json"), "utf8"));
  const norm = (t) => String(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const idxRows = (await getJSON(`${LIBRARY}/v1/confessions-index.json`)).confessions;
  const tradition = new Map(idxRows.map((r) => [r.slug, r.tradition]));
  const works = new Map(); const pages = new Map();
  let rows = 0; let quoteOk = 0; let quoteEmpty = 0; let quoteLoose = 0; let citeOk = 0; const fails = [];
  for (const [lib, chs] of Object.entries(index.chapters)) {
    for (const ch of chs) {
      const d = JSON.parse(readFileSync(join(OUT, lib, `${ch}.json`), "utf8"));
      const check = (a, x, verse) => {
        rows++;
        const r = d.a[a]; const doc = index.docs[r[0]];
        if (!works.has(doc.s)) works.set(doc.s, JSON.parse(readFileSync(join(dir, `${doc.s}.json`), "utf8")));
        const pg = works.get(doc.s).pages.find((p) => String(p.n) === String(r[2]));
        const where = `${doc.s} p${r[2]}#${r[4]} ${lib} ${ch}:${verse || "whole"}`;
        if (!pg) { fails.push(`${where}: no such page`); return; }
        const key = `${doc.s}|${r[2]}`;
        if (!pages.has(key)) pages.set(key, String(pg.en || "").split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b && !/^#{1,6}\s/.test(b)));
        const blocks = pages.get(key);
        let text = blocks[r[4]];
        if (text == null) { fails.push(`${where}: no paragraph ${r[4]}`); return; }
        if (doc.s === "cf-093-julius-iii-1550-1555") text = text.replace(/\b1Samuel 19:8/g, "1 Kings 19:8");
        globalThis.DATA = { tradition: tradition.get(doc.s), slug: doc.s };
        let refs = []; try { refs = scriptureReferences(text) || []; } catch { refs = []; }
        delete globalThis.DATA;
        const hit = refs.some((q) => {
          const v = versesOf(andMore(q, text));
          const book = v && libSlugOf(v.book, canonFromCore());
          if (!v || book !== lib || v.chapter !== ch) return false;
          return verse ? !v.chapterOnly && !v.big && v.verses.includes(+verse) : !!v.chapterOnly;
        });
        if (hit) citeOk++; else fails.push(`${where}: the paragraph does not cite it`);
        const marked = String(d.x[x] || "").startsWith("\u0001");
        const clause = String(d.x[x] || "").replace(/^\u0001/, "").split("\t")[0].replace(/^…\s*/, "");
        if (!clause) quoteEmpty++;
        else if (marked) quoteLoose++;
        else if (norm(pg.en).includes(norm(clause).slice(0, 120))) quoteOk++;
        else fails.push(`${where}: clause not on the page: ${clause.slice(0, 60)}`);
      };
      for (const [k, list] of Object.entries(d.v)) for (const [a, x] of list) check(a, x, k);
      for (const [a, x] of d.c) check(a, x, "");
    }
  }
  const pct = (n, of) => `${((100 * n) / of).toFixed(2)}%`;
  console.log(`audit: ${rows} rows; paragraph cites the verse: ${citeOk} (${pct(citeOk, rows)}); clause on its page: ${quoteOk} (${pct(quoteOk, rows - quoteEmpty - quoteLoose)} of the verbatim ones), ${quoteLoose} quotes are an opening with its citations taken out (not marked in the reader), ${quoteEmpty} rows carry no quote`);
  if (fails.length) { console.log(`${fails.length} failing:`); for (const f of fails.slice(0, 40)) console.log(`  ${f}`); }
}

if (has("--audit")) await audit();
else if (has("--check")) await check();
else await build();
