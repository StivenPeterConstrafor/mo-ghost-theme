#!/usr/bin/env node
/*
 * Recover the citation apparatus the ANF import threw away.
 *
 * THE BUG. scripts/import-anf.mjs fetches the Ante-Nicene Fathers from
 * Wikisource and, in cleanWikitext(), does this:
 *
 *     text = text.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
 *
 * In the ANF, <ref> IS the Scripture apparatus. Wikisource
 * Ante-Nicene_Fathers/Volume_III/Apologetic/Apology/Chapter_XXXI carries
 * exactly two of them, "Matt. v. 44." and "1 Tim. ii. 2.", and both were
 * deleted before the text was ever written to disk. That is why
 * build-curated-research.mjs found zero references in these works: the
 * body prose genuinely contains none, because in this edition the
 * references never lived in the body.
 *
 * WHAT THIS DOES. Re-walks the same Wikisource pages the import walked,
 * keeps the <ref> content instead of dropping it, attributes each ref to
 * a page of the published work by matching the prose that immediately
 * precedes it, and runs the corpus Scripture parser over the result.
 *
 * PAGE ATTRIBUTION. Each <ref> is replaced by a sentinel before the text
 * is cleaned, so after cleaning we know exactly what prose ran up to the
 * reference mark. That tail is normalised and looked up in the published
 * pages. The shortest anchor that matches exactly ONE page wins. If no
 * anchor is unique the row is still emitted, without a `p`: the citation
 * is real even when we cannot say which page it sits on, and a wrong
 * link is worse than no link.
 *
 * TOPICS. Untouched and empty. Nothing in this script reads a work and
 * forms a position about it, so it claims none.
 *
 * REUSES: extractRefs from build-scripture-index.mjs (the corpus parser,
 * not a new one) and the books[] shape of build-curated-research.mjs.
 * cleanWikitext is copied from import-anf.mjs rather than imported,
 * because that file runs its whole import on load. It must stay
 * byte-identical in behaviour to the import's, or the anchors stop
 * matching the text that was published.
 *
 *   node scripts/recover-anf-apparatus.mjs [--slug X] [--out DIR]
 *                                          [--cache DIR] [--limit N]
 *
 * Writes v1/mine/work/<slug>.json files for upload to LIBRARY. It does
 * not upload. A work that yields no citations gets NO file.
 */
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { extractRefs } from "./build-scripture-index.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const BASE = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
const UA = { "user-agent": "TFR-Apparatus-Recovery/1.0 (Mere Orthodoxy; ian@mereorthodoxy.com)" };
const WIKI_DELAY_MS = 1100;

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ONLY = argOf("--slug", null);
const OUT = argOf("--out", path.join(ROOT, "build", "anf-apparatus"));
const CACHE = argOf("--cache", path.join(ROOT, "build", "anf-wikitext"));
const LIMIT = Number(argOf("--limit", "0")) || 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── The manifest, read out of import-anf.mjs ──────────────────────
 * Not re-typed here. If the import's page list changes, this follows
 * it; a second copy would drift and silently scrape the wrong pages. */
async function loadManifest() {
  const src = await readFile(path.join(ROOT, "scripts", "import-anf.mjs"), "utf8");
  const start = src.indexOf("const MANIFEST = [");
  if (start < 0) throw new Error("MANIFEST not found in import-anf.mjs");
  const open = src.indexOf("[", start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "[") depth += 1;
    else if (src[i] === "]") {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end < 0) throw new Error("MANIFEST array never closed");
  // The literal is pure data: objects, strings, arrays. No calls.
  return new Function(`return ${src.slice(open, end)};`)();
}

/* ── Wikisource ───────────────────────────────────────────────── */
async function fetchWikitext(pageTitle) {
  const key = pageTitle.replace(/[^\w.-]+/g, "_") + ".txt";
  const cached = path.join(CACHE, key);
  if (existsSync(cached)) return readFile(cached, "utf8");

  const url =
    "https://en.wikisource.org/w/api.php?action=parse&page=" +
    encodeURIComponent(pageTitle) +
    "&prop=wikitext&format=json";
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const r = await fetch(url, { headers: UA });
      const j = await r.json();
      if (j.parse && j.parse.wikitext) {
        const wt = j.parse.wikitext["*"];
        await mkdir(CACHE, { recursive: true });
        await writeFile(cached, wt, "utf8");
        await sleep(WIKI_DELAY_MS);
        return wt;
      }
      throw new Error(j.error ? j.error.info : `no wikitext for ${pageTitle}`);
    } catch (e) {
      lastErr = e;
      await sleep(WIKI_DELAY_MS * attempt * 2);
    }
  }
  throw lastErr;
}

/* ── COPIED VERBATIM from import-anf.mjs, minus the <ref> strip ───
 * The <ref> removal is the bug this script exists to undo; by the time
 * this runs, the refs have already been swapped for sentinels, so the
 * two lines that used to delete them are simply gone. Everything else
 * must stay identical or the anchors will not match the published text. */
function cleanWikitext(wt) {
  let text = wt;
  text = text.replace(/\{\{header[\s\S]*?\}\}\s*/i, "");
  text = text.replace(/\{\{small-caps\|([^}]+)\}\}/gi, "$1");
  text = text.replace(/\{\{lang\|[^|]*\|([^}]+)\}\}/gi, "$1");
  text = text.replace(/\{\{[^}]*\}\}/g, "");
  text = text.replace(/<\/?[^>]+>/g, "");
  text = text.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, "$1");
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");
  text = text.replace(/^(={2,4})\s*(.+?)\s*\1\s*$/gm, "$2");
  text = text.replace(/'{2,5}/g, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/* Sub-page discovery, also from import-anf.mjs. Same regexes, so the
 * same set of chapters is visited in the same order. */
function extractTocLinks(wikitext, basePage) {
  const bodyText = wikitext.replace(/\{\{header[\s\S]*?\}\}\s*/i, "");
  const links = [];
  const seen = new Set();
  const re = /\[\[\/([\w\s:,.''?!—–-]+?)(?:\/?\|[^\]]*|\/?)\]\]/g;
  let m;
  while ((m = re.exec(bodyText)) !== null) {
    const label = m[1].trim();
    const sub = label.replace(/ /g, "_");
    if (/^(Elucidation|Introductory|Title[_ ]Page|Footnote)/i.test(sub)) continue;
    const fullPath = basePage + "/" + sub;
    if (seen.has(fullPath)) continue;
    seen.add(fullPath);
    links.push({ label, path: fullPath });
  }
  return links;
}

function isTocPage(wikitext) {
  const hasContents = /==\s*Contents\s*==/i.test(wikitext);
  const subLinkCount = (wikitext.match(/\[\[\//g) || []).length;
  const stripped = wikitext
    .replace(/\{\{header[\s\S]*?\}\}\s*/i, "")
    .replace(/==\s*Contents\s*==[\s\S]*$/i, "")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[[^\]]*\]\]/g, "")
    .trim();
  return (hasContents || subLinkCount > 3) && stripped.length < 1000;
}

function hasChapterSubPages(wikitext) {
  if (!/==\s*Contents\s*==/i.test(wikitext)) return false;
  const contentsSection = wikitext.replace(/^[\s\S]*?==\s*Contents\s*==/i, "");
  return (contentsSection.match(/\[\[\//g) || []).length >= 3;
}

/* Every leaf wikitext of a work, in reading order. Leaves are what
 * carry prose and therefore what carry refs; TOC pages carry neither. */
async function collectLeaves(pageTitle, depthLeft = 3) {
  const wt = await fetchWikitext(pageTitle);
  const isToc = isTocPage(wt);
  if (depthLeft > 0 && (isToc || hasChapterSubPages(wt))) {
    const links = extractTocLinks(wt, pageTitle);
    const out = [];
    // A mixed page (Apology) has real prose above its Contents section.
    if (!isToc) out.push({ title: pageTitle, wt });
    for (const link of links) {
      try {
        out.push(...(await collectLeaves(link.path, depthLeft - 1)));
      } catch (e) {
        console.error(`      MISS ${link.path}: ${e.message}`);
      }
    }
    if (out.length) return out;
  }
  return [{ title: pageTitle, wt }];
}

/* ── Page attribution ─────────────────────────────────────────── */
const norm = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function buildPageIndex(pages) {
  return pages.map((p) => ({ n: p.n, hay: ` ${norm(p.en || "")} ` }));
}

/* Longest-first: a long tail is unambiguous but brittle (a stray entity
 * or a dropped bracket breaks it), a short one is robust but can match
 * several chapters. Take the first length that lands on exactly one. */
const ANCHOR_WORDS = [14, 10, 7, 5];

function locateAnchor(prefix, index) {
  const words = norm(prefix).split(" ").filter(Boolean);
  if (!words.length) return null;
  for (const w of ANCHOR_WORDS) {
    if (words.length < w) continue;
    const anchor = ` ${words.slice(-w).join(" ")}`;
    const hits = index.filter((p) => p.hay.includes(anchor));
    if (hits.length === 1) return hits[0].n;
  }
  return null;
}

/* ── books[]: the shape build-curated-research.mjs already publishes ── */
const display = (canon) =>
  String(canon)
    .split(/[\s_-]+/)
    .map((w) => (/^[ivx]+$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

function booksFor(segments) {
  const refs = extractRefs(segments.filter((s) => s.text));
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

/* ── Per work ─────────────────────────────────────────────────── */
async function json(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

const SENT = (i) => `QQREFMARK${i}QQ`;

async function recover(manifest, meta) {
  const slug = manifest.slug;
  const doc = await json(`${BASE}/v1/works/${slug}/work.json`);
  const pages = doc.pages || [];
  const index = buildPageIndex(pages);

  const leaves = [];
  for (const p of manifest.pages) {
    try {
      leaves.push(...(await collectLeaves(p)));
    } catch (e) {
      console.error(`      MISS ${p}: ${e.message}`);
    }
  }

  // refs, attributed to a page where the prose lets us
  const found = []; // {text, page|null}
  let placed = 0;
  for (const leaf of leaves) {
    const raws = [];
    const marked = leaf.wt.replace(/<ref[^>]*>([\s\S]*?)<\/ref>/gi, (_, inner) => {
      raws.push(inner);
      return ` ${SENT(raws.length - 1)} `;
    });
    if (!raws.length) continue;
    const cleaned = cleanWikitext(marked);
    for (let i = 0; i < raws.length; i += 1) {
      const at = cleaned.indexOf(SENT(i));
      const prefix = at < 0 ? "" : cleaned.slice(0, at).replace(/QQREFMARK\d+QQ/g, " ");
      const page = at < 0 ? null : locateAnchor(prefix, index);
      if (page != null) placed += 1;
      found.push({ text: cleanWikitext(raws[i]), page });
    }
  }

  // One combined segment list in page order: the work's own prose (for
  // parity with the published curated files) followed, per page, by the
  // references that page carried. Unplaced refs trail with no locator.
  const byPage = new Map();
  for (const f of found) {
    if (f.page == null) continue;
    if (!byPage.has(f.page)) byPage.set(f.page, []);
    byPage.get(f.page).push(f.text);
  }
  const segments = [];
  for (const p of pages) {
    segments.push({ text: p.en || "", en: p.en || "", loc: p.n });
    for (const t of byPage.get(p.n) || []) segments.push({ text: t, en: t, loc: p.n });
  }
  for (const f of found) {
    if (f.page == null) segments.push({ text: f.text, en: f.text, loc: null });
  }

  const books = booksFor(segments);
  const total = books.reduce((a, b) => a + b.n, 0);

  return {
    slug,
    leaves: leaves.length,
    refs: found.length,
    placed,
    total,
    file: {
      w: slug,
      t: meta.title || manifest.title || "",
      a: meta.author || manifest.author || "",
      np: pages.length,
      ncit: total,
      topics: [],
      books,
    },
  };
}

/* ── Main ─────────────────────────────────────────────────────── */
const MANIFEST = await loadManifest();
const mo = await json(`${BASE}/v1/mo/index.json`);
const metaBySlug = new Map((mo.works || []).map((w) => [w.slug, w]));

// Only works the panel currently 404s on. A work that already has a
// published file is left alone; this is a repair, not a rebuild.
const missing = [];
for (const m of MANIFEST) {
  if (ONLY && m.slug !== ONLY) continue;
  if (!metaBySlug.has(m.slug)) continue;
  const r = await fetch(`${BASE}/v1/mine/work/${m.slug}.json`, { headers: UA, method: "HEAD" });
  if (r.ok && !ONLY) continue;
  missing.push(m);
}

const targets = LIMIT ? missing.slice(0, LIMIT) : missing;
console.log(`\n${targets.length} works to repair\n`);

await mkdir(OUT, { recursive: true });
let written = 0;
let citations = 0;
const empty = [];

for (const m of targets) {
  try {
    const r = await recover(m, metaBySlug.get(m.slug) || {});
    if (!r.total) {
      empty.push(r.slug);
      console.log(`   none  ${r.slug.padEnd(40)} ${String(r.leaves).padStart(4)} leaves  ${String(r.refs).padStart(4)} refs  no Scripture`);
      continue;
    }
    await writeFile(path.join(OUT, `${r.slug}.json`), JSON.stringify(r.file), "utf8");
    written += 1;
    citations += r.total;
    const pct = r.refs ? Math.round((r.placed / r.refs) * 100) : 0;
    console.log(
      `   ok    ${r.slug.padEnd(40)} ${String(r.leaves).padStart(4)} leaves  ${String(r.refs).padStart(4)} refs  ` +
      `${String(r.total).padStart(4)} cites  ${r.file.books.length} books  ${pct}% placed`
    );
  } catch (e) {
    console.error(`   ERR   ${m.slug.padEnd(40)} ${e.message}`);
  }
}

console.log(`\n${written} files in ${OUT}`);
console.log(`${citations.toLocaleString()} citations recovered`);
if (empty.length) console.log(`${empty.length} works still with no Scripture: ${empty.join(", ")}`);
