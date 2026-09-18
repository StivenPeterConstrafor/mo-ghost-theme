#!/usr/bin/env node
/*
 * Publish the Scripture half of the Research panel for the BULK corpora.
 *
 * Sibling of build-curated-research.mjs, which did the 69 curated `mo`
 * works. This one does the rest: roughly 4,900 works across Migne's
 * Latin (pld) and Greek (pg) patrologies, Patrologia Orientalis (po),
 * Early English Books (eebo) and the native slugs, whose
 * v1/mine/work/<slug>.json key 404s and so renders "A work topic
 * overview has not been published for this edition."
 *
 *   node scripts/build-bulk-research.mjs --corpus pld --shard 0 --of 8
 *   node scripts/build-bulk-research.mjs --only pld-95,pg-3 --out /tmp/x
 *
 * Writes files for upload to LIBRARY (mo-tfr-library) under
 * v1/mine/work/. It does not upload; that is a separate, deliberate step.
 *
 * WHAT IT PRODUCES AND WHAT IT REFUSES TO.
 *
 *   books  — real, built here by running the corpus citation parser
 *            over the work's own text, page by page, so every row
 *            carries the locator it was found at and can link back.
 *   topics — mined positions: a paraphrase, a stance verb and a page,
 *            produced by an LLM that read the work. Nothing in this
 *            process read the work in that sense, so this writes an
 *            empty list. The panel then says the overview carries no
 *            topic entries, which is true. Inventing them would not be.
 *
 * And a work with no citations gets NO FILE. A 404 says "not
 * published"; an empty file says "published, and this work cites no
 * Scripture", which for a Latin father is almost always a lie about
 * the indexer rather than a fact about the work.
 *
 * WHY IT REUSES extractRefs. There are already three Scripture parsers
 * in this codebase and they disagree with each other. This imports the
 * corpus one — the same code that built every other collection's
 * index — rather than adding a fourth that would drift from it.
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { promisify } from "node:util";
import { extractRefs } from "./build-scripture-index.mjs";

const gunzip = promisify(zlib.gunzip);
const BASE = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
// The library worker 403s non-browser user agents; urllib and bare
// fetch both get a 403 everywhere, which reads as "this work has no
// text" rather than "you were turned away at the door".
const UA = { "user-agent": "Mozilla/5.0" };

/* ── Arguments ──────────────────────────────────────────────────── */

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (flag) => args.includes(flag);

const CORPUS = argOf("--corpus", "all");
const SHARD = Number(argOf("--shard", "-1"));
const OF = Number(argOf("--of", "0"));
const LIMIT = Number(argOf("--limit", "0")) || 0;
const OUT = argOf("--out", "build/bulk-research");
const ONLY = (argOf("--only", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
const FORCE = has("--force");
const CONCURRENCY = Number(argOf("--concurrency", "8")) || 8;

const CORPORA = ["pld", "pg", "po", "eebo", "native"];
if (CORPUS !== "all" && !CORPORA.includes(CORPUS)) {
  console.error(`--corpus must be one of ${CORPORA.join("|")}|all`);
  process.exit(1);
}
if (OF && !(SHARD >= 0 && SHARD < OF)) {
  console.error("--shard I must satisfy 0 <= I < --of N");
  process.exit(1);
}

/* ── Fetch ──────────────────────────────────────────────────────── */

async function withRetry(fn, tries = 3) {
  let last;
  for (let i = 0; i < tries; i += 1) {
    try { return await fn(); } catch (e) {
      last = e;
      // A 404 is an answer, not a flake. Retrying it three times over
      // 19,450 works is 40,000 pointless requests at the source.
      if (/^404 /.test(e.message)) throw e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last;
}

async function body(url) {
  return withRetry(async () => {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return Buffer.from(await r.arrayBuffer());
  });
}
const text = async (url) => (await body(url)).toString("utf8");
const json = async (url) => JSON.parse(await text(url));

/* ── XML ────────────────────────────────────────────────────────────
 *
 * A real token walk, not a tag strip. `.replace(/<[^>]+>/g, " ")` over
 * these files is what makes a 400 KB work read as nine characters: the
 * TEI header alone carries angle brackets inside attribute values, and
 * a work whose text collapses to nothing is indistinguishable from a
 * work with no text at all. This tokenizer handles comments, CDATA,
 * processing instructions, self-closing tags and entities, and keeps a
 * stack so xml:lang can be resolved against the nearest ancestor that
 * declares it.
 */

const ENTS = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s) {
  if (s.indexOf("&") < 0) return s;
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTS[e.toLowerCase()] ?? m;
  });
}

const ATTR_RE = /([A-Za-z_:][-\w.:]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
function attrs(raw) {
  const out = {};
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(raw))) out[m[1]] = decode(m[3] ?? m[4] ?? "");
  return out;
}

/*
 * Emits { type: "open"|"close"|"text", name, attrs, value }.
 * Self-closing tags emit an open immediately followed by a close, so a
 * consumer only has to understand two shapes.
 */
function* tokenize(src) {
  let i = 0;
  const n = src.length;
  while (i < n) {
    const lt = src.indexOf("<", i);
    if (lt < 0) {
      if (i < n) yield { type: "text", value: decode(src.slice(i)) };
      return;
    }
    if (lt > i) yield { type: "text", value: decode(src.slice(i, lt)) };

    if (src.startsWith("<!--", lt)) {
      const end = src.indexOf("-->", lt + 4);
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (src.startsWith("<![CDATA[", lt)) {
      const end = src.indexOf("]]>", lt + 9);
      const stop = end < 0 ? n : end;
      yield { type: "text", value: src.slice(lt + 9, stop) };
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (src.startsWith("<?", lt)) {
      const end = src.indexOf("?>", lt + 2);
      i = end < 0 ? n : end + 2;
      continue;
    }
    if (src.startsWith("<!", lt)) {
      const end = src.indexOf(">", lt + 2);
      i = end < 0 ? n : end + 1;
      continue;
    }

    // Find the tag's closing '>', skipping any inside quoted attributes.
    let j = lt + 1;
    let quote = "";
    while (j < n) {
      const c = src[j];
      if (quote) { if (c === quote) quote = ""; }
      else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
      j += 1;
    }
    if (j >= n) { i = n; break; }

    let inner = src.slice(lt + 1, j);
    i = j + 1;

    if (inner[0] === "/") {
      yield { type: "close", name: inner.slice(1).trim().toLowerCase() };
      continue;
    }
    const selfClosing = inner.endsWith("/");
    if (selfClosing) inner = inner.slice(0, -1);
    const sp = inner.search(/[\s/]/);
    const name = (sp < 0 ? inner : inner.slice(0, sp)).toLowerCase();
    if (!name) continue;
    const a = sp < 0 ? {} : attrs(inner.slice(sp));
    yield { type: "open", name, attrs: a };
    if (selfClosing) yield { type: "close", name };
  }
}

/* ── TEI → segments ─────────────────────────────────────────────────
 *
 * One segment per printed locator, so `loc` is the page (or Migne
 * column) the citation physically sits on and every row in the output
 * can link back to it. The locator must come from the source; counting
 * as you walk produces numbers the reader cannot resolve.
 */

// Migne column milestones are written volume-qualified and
// edition-lettered: n="122:1259A" is column 1259 of PL 122. The bare
// n="122" that opens each pld file is the volume, not a column, and
// taking it as one puts every early citation on a page that does not
// exist. Only the qualified form yields a locator.
function columnOf(raw, corpus) {
  const s = String(raw || "");
  if (s.includes(":")) {
    const n = parseInt(s.slice(s.indexOf(":") + 1), 10);
    return Number.isFinite(n) ? n : null;
  }
  // pg writes its columns bare: n="9". pld never does.
  if (corpus === "pld") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

const LANG_OF = (a) => a["xml:lang"] || a.lang || null;
const ENGLISH = (l) => !!l && /^en\b/i.test(l);
// Structural elements whose text is not the work: the header is
// cataloguing metadata, and figure/graphic descriptions are captions
// from the scanner, not the author.
const SKIP = new Set(["teiheader", "graphic", "figdesc", "script", "style"]);

export function teiSegments(xml, corpus) {
  const segs = [];
  let loc = null;
  let src = [];
  let en = [];
  const langs = [];
  let skipDepth = 0;

  // Two lanes kept apart on purpose. These editions print the original
  // beside a translation, and "Joan. XXI" in the Latin and "John 21"
  // in the English are one citation seen twice, not two. Counting them
  // separately and then merging is what lets the count say so.
  const flush = () => {
    const s = src.join(" ").replace(/\s+/g, " ").trim();
    const e = en.join(" ").replace(/\s+/g, " ").trim();
    if (s || e) segs.push({ loc, src: s, en: e, text: `${s} ${e}`.trim() });
    src = [];
    en = [];
  };

  for (const tok of tokenize(xml)) {
    if (tok.type === "open") {
      if (skipDepth || SKIP.has(tok.name)) { skipDepth += 1; continue; }
      const lang = LANG_OF(tok.attrs);
      langs.push(lang || langs[langs.length - 1] || null);
      if (tok.name === "pb") {
        const n = parseInt(tok.attrs.n, 10);
        if (Number.isFinite(n)) { flush(); loc = n; }
      } else if (tok.name === "milestone" && /column|page/i.test(tok.attrs.unit || "")) {
        const n = columnOf(tok.attrs.n, corpus);
        if (n != null) { flush(); loc = n; }
      }
      continue;
    }
    if (tok.type === "close") {
      if (skipDepth) { skipDepth -= 1; continue; }
      langs.pop();
      continue;
    }
    if (skipDepth) continue;
    const v = tok.value;
    if (!v || !v.trim()) continue;
    // Unmarked text goes to the source lane, so a TEI file that
    // declares no language anywhere is still read rather than dropped.
    if (ENGLISH(langs[langs.length - 1])) en.push(v);
    else src.push(v);
  }
  flush();
  return segs;
}

/* ── Corpus text sources ────────────────────────────────────────────
 *
 * Established by experiment against the live worker, not assumed. The
 * works-index fields la_chars / en_chars / has_pages do NOT answer
 * "does this work have text": pld-95 reports en_chars 0 and has_pages
 * false and its TEI is 406 KB of parallel Latin and English. They are
 * never consulted here.
 *
 *   pld   /v1/tei/pld/<id>.xml     TEI, column milestones, la+en lanes
 *   pg    /v1/tei/pg/<id>.xml      TEI, <pb> and column milestones
 *   po    /v1/tei/po/<id>.xml      TEI, <pb>, grc + la + en lanes
 *   eebo  /eebo/<id>.json.gz       JSON toc of HTML with pb spans
 *                                  (/v1/tei/eebo/<id>.xml is a 404)
 *   native /v1/works/<slug>/…      page JSON shards, TEI as fallback
 */

async function teiText(corpus, id) {
  const xml = await text(`${BASE}/v1/tei/${corpus}/${id}.xml`);
  return teiSegments(xml, corpus);
}

async function eeboText(id) {
  const buf = await body(`${BASE}/eebo/${id}.json.gz`);
  // The name says .json.gz and the body very often is not gzipped: the
  // worker serves these with content-encoding br and fetch undoes the
  // transport encoding, so what lands here is plain JSON under a gzip
  // extension. Sniffing the two-byte magic is the only reliable test;
  // trusting the extension made all 53,832 EEBO works fail silently
  // once already.
  const gz = buf.length > 1 && buf[0] === 0x1f && buf[1] === 0x8b;
  const doc = JSON.parse((gz ? await gunzip(buf) : buf).toString("utf8"));

  // The page boundary is <span class="pb" data-n="N"></span> inside the
  // node HTML, so the locator survives the walk. Concatenating the toc
  // first keeps a page that straddles two toc nodes as one page.
  const html = [];
  (function walk(nodes) {
    (nodes || []).forEach((nd) => {
      if (nd.html) html.push(nd.html);
      walk(nd.kids);
    });
  })(doc.toc);

  const segs = [];
  let loc = null;
  let buf2 = [];
  // EEBO is English throughout: one lane, so `src` is left empty and
  // the merge below runs the parser once rather than twice.
  const flush = () => {
    const t = buf2.join(" ").replace(/\s+/g, " ").trim();
    if (t) segs.push({ loc, src: "", en: t, text: t });
    buf2 = [];
  };
  for (const tok of tokenize(html.join(" "))) {
    if (tok.type === "open") {
      if (tok.name === "span" && /\bpb\b/.test(tok.attrs.class || "")) {
        const n = parseInt(tok.attrs["data-n"], 10);
        if (Number.isFinite(n)) { flush(); loc = n; }
      }
      continue;
    }
    if (tok.type === "text" && tok.value.trim()) buf2.push(tok.value);
  }
  flush();
  return segs;
}

async function nativeText(slug) {
  let meta = null;
  try { meta = await json(`${BASE}/v1/works/${slug}/meta.json`); } catch (_) { meta = null; }
  const segs = [];
  if (meta) {
    const files = meta.shards && meta.shards.length
      ? meta.shards.map((s) => s.file)
      : [meta.single || "work.json"];
    for (const f of files) {
      let d;
      try { d = await json(`${BASE}/v1/works/${slug}/${f}`); } catch (_) { continue; }
      for (const p of d.pages || (Array.isArray(d) ? d : [])) {
        const la = p.la || "";
        const en = p.en || "";
        if (!la && !en) continue;
        segs.push({ loc: p.n ?? null, src: la, en, text: `${la} ${en}`.trim() });
      }
    }
  }
  if (segs.length) return segs.filter((s) => s.text);
  // Some native works publish TEI only. One segment for the lot,
  // because that TEI carries no page milestone to land on; the reader
  // falls back to the heading.
  const xml = await text(`${BASE}/v1/works/${slug}/tei.en.xml`);
  const t = teiSegments(xml, "native");
  return t.length ? t : [];
}

export async function textFor(slug) {
  const m = /^(pld|pg|po|eebo)-(\d+)$/.exec(slug);
  if (!m) return nativeText(slug);
  if (m[1] === "eebo") return eeboText(m[2]);
  return teiText(m[1], m[2]);
}

/* ── Output shape ───────────────────────────────────────────────────
 * Identical to build-curated-research.mjs. The reader reads b through
 * an abbreviation table with a fallback to b itself, so the full name
 * in both fields renders correctly; this is the shape already live for
 * the curated works and it is not diverged from here.
 */

const display = (canon) =>
  String(canon)
    .split(/[\s_-]+/)
    .map((w) => (/^[ivx]+$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

/*
 * Merge the two lanes. The same citation printed in Latin and again in
 * the facing translation is ONE citation, so the count per chapter is
 * the larger of the two witnesses, not their sum. Summing them doubled
 * every heat number on every parallel edition — on pld-95, 115 where
 * the mined file says 70 — and the doubling was invisible in the
 * output, because the linkable rows deduplicate and only the totals
 * lied. Verse locators are unioned: a verse either lane names is a
 * verse the reader should be able to reach.
 */
function mergeRefs(a, b) {
  const out = new Map(a);
  for (const [k, hit] of b) {
    const prev = out.get(k);
    if (!prev) { out.set(k, hit); continue; }
    const verses = new Map(prev.verses || []);
    for (const [v, loc] of hit.verses || []) if (!verses.has(v)) verses.set(v, loc);
    out.set(k, {
      n: Math.max(prev.n || 0, hit.n || 0),
      loc: prev.loc == null ? hit.loc : prev.loc,
      excerpt: prev.excerpt || hit.excerpt,
      verses,
    });
  }
  return out;
}

export function booksFor(segments) {
  const lane = (pick) => segments
    .map((s) => ({ text: pick(s) || "", en: s.en || "", loc: s.loc }))
    .filter((s) => s.text);
  const en = lane((s) => s.en);
  const src = lane((s) => s.src);
  const refs = src.length
    ? (en.length ? mergeRefs(extractRefs(en), extractRefs(src)) : extractRefs(src))
    : extractRefs(en);
  const byBook = new Map();

  for (const [key, hit] of refs) {
    const [canon, chapter] = String(key).split("|");
    const ch = Number(chapter);
    if (!canon || !Number.isFinite(ch)) continue;
    if (!byBook.has(canon)) byBook.set(canon, { rows: [], chapters: new Map() });
    const entry = byBook.get(canon);

    const verses = [...(hit.verses || new Map()).entries()];
    if (verses.length) {
      for (const [v, loc] of verses) {
        entry.rows.push({ c: ch, v: Number(v), ...(loc == null ? {} : { p: loc }), how: "explicit" });
      }
    } else {
      entry.rows.push({ c: ch, ...(hit.loc == null ? {} : { p: hit.loc }), how: "explicit" });
    }
    entry.chapters.set(ch, (entry.chapters.get(ch) || 0) + (hit.n || 1));
  }

  return [...byBook.entries()]
    .map(([canon, e]) => ({
      b: display(canon),
      name: display(canon),
      n: [...e.chapters.values()].reduce((a, b) => a + b, 0),
      chs: [...e.chapters.entries()].sort((a, b) => a[0] - b[0]),
      rows: e.rows.sort((a, b) => a.c - b.c || (a.v || 0) - (b.v || 0)),
    }))
    .sort((a, b) => b.n - a.n);
}

/* ── Work selection ─────────────────────────────────────────────── */

const corpusOf = (slug) => {
  const m = /^(pld|pg|po|eebo)-\d+$/.exec(slug || "");
  return m ? m[1] : "native";
};

async function alreadyIndexed(slug) {
  const r = await fetch(`${BASE}/v1/mine/work/${slug}.json`, { method: "GET", headers: UA });
  // Drain so the socket is released; the body is not wanted.
  if (r.body) { try { await r.arrayBuffer(); } catch (_) { /* ignore */ } }
  return r.ok;
}

/* ── Run ────────────────────────────────────────────────────────────
 * Guarded, so the parsers above can be imported and checked without
 * the import launching a run against the live worker.
 */
if (process.argv[1] && process.argv[1].endsWith("build-bulk-research.mjs")) await main();

async function main() {
const index = await json(`${BASE}/v1/works-index.json`);
let works = (index.works || []).filter((w) => w && w.slug);

if (ONLY.length) {
  const want = new Set(ONLY);
  const found = works.filter((w) => want.has(w.slug));
  // A slug named explicitly but absent from the index is still worth
  // attempting; the index is not the only place a work can exist.
  const seen = new Set(found.map((w) => w.slug));
  works = [...found, ...ONLY.filter((s) => !seen.has(s)).map((slug) => ({ slug }))];
} else {
  if (CORPUS !== "all") works = works.filter((w) => corpusOf(w.slug) === CORPUS);
  // Deterministic sharding by position in the filtered list, so shard I
  // of N always covers the same works no matter which machine runs it
  // or in what order the shards finish.
  if (OF) works = works.filter((_, i) => i % OF === SHARD);
  if (LIMIT) works = works.slice(0, LIMIT);
}

await mkdir(OUT, { recursive: true });

const stats = {
  processed: 0, written: 0, citations: 0,
  skippedIndexed: 0, skippedNoCitations: 0, noText: 0, errors: 0,
};
const errors = [];

async function one(w) {
  const slug = w.slug;
  stats.processed += 1;
  try {
    if (!FORCE && await alreadyIndexed(slug)) {
      stats.skippedIndexed += 1;
      return;
    }
    let segs;
    try {
      segs = await textFor(slug);
    } catch (e) {
      stats.noText += 1;
      console.log(`   notext ${slug.padEnd(38)} ${e.message}`);
      return;
    }
    if (!segs || !segs.length) {
      stats.noText += 1;
      console.log(`   notext ${slug.padEnd(38)} parsed to zero segments`);
      return;
    }

    const books = booksFor(segs);
    const total = books.reduce((a, b) => a + b.n, 0);
    if (!total) {
      // No file. A 404 honestly says "not published". An empty file
      // would claim this work was read and cites nothing.
      stats.skippedNoCitations += 1;
      console.log(`   none   ${slug.padEnd(38)} ${String(segs.length).padStart(5)} segments, no citations`);
      return;
    }

    const out = {
      w: slug,
      t: w.title || "",
      a: w.author_en || w.author || "",
      np: Number(w.n_pages) || segs.length,
      ncit: total,
      topics: [],
      books,
    };
    await writeFile(path.join(OUT, `${slug}.json`), JSON.stringify(out), "utf8");
    stats.written += 1;
    stats.citations += total;
    console.log(`   ok     ${slug.padEnd(38)} ${String(segs.length).padStart(5)} segments  ${String(total).padStart(5)} citations  ${books.length} books`);
  } catch (e) {
    stats.errors += 1;
    errors.push(`${slug}: ${e.message}`);
    console.log(`   ERROR  ${slug.padEnd(38)} ${e.message}`);
  }
}

// Fixed pool of workers pulling from one cursor. Resumable in the sense
// that matters: every run re-checks the published key first, so a run
// that dies halfway is restarted by running the same command again.
let cursor = 0;
await Promise.all(
  Array.from({ length: Math.max(1, Math.min(CONCURRENCY, works.length || 1)) }, async () => {
    while (cursor < works.length) {
      const w = works[cursor];
      cursor += 1;
      await one(w);
    }
  }),
);

console.log("");
console.log(`corpus              ${CORPUS}${OF ? `  shard ${SHARD}/${OF}` : ""}`);
console.log(`works considered    ${works.length}`);
console.log(`works processed     ${stats.processed}`);
console.log(`skipped, indexed    ${stats.skippedIndexed}`);
console.log(`skipped, no text    ${stats.noText}`);
console.log(`skipped, 0 citations ${stats.skippedNoCitations}`);
console.log(`files written       ${stats.written}  ->  ${OUT}`);
console.log(`citations found     ${stats.citations.toLocaleString()}`);
console.log(`errors              ${stats.errors}`);
if (errors.length) console.log(errors.slice(0, 10).map((e) => `  ${e}`).join("\n"));
}
