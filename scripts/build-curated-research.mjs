#!/usr/bin/env node
/*
 * Publish the Scripture half of the Research panel for the curated works.
 *
 * The reader's Research panel reads ONE key per work,
 * v1/mine/work/<slug>.json, and shows "A work topic overview has not
 * been published for this edition" when it 404s. For all 69 works in
 * the curated `mo` corpus -- Charnock, Calvin's Institutes, Augustine's
 * Confessions, the whole Ante-Nicene set, the works this site actually
 * links to from its own pages -- it 404s. Their text is all present;
 * they were simply never seen by the mining pipeline that wrote that
 * key for the Migne and EEBO corpora.
 *
 * WHAT THIS DOES AND DOES NOT PRODUCE. The file has two halves.
 *
 *   books  — Scripture cited in the work. Real, and built here, by
 *            running the corpus citation parser over each page of the
 *            work's own text. Page numbers come out of the walk, so
 *            every row can link back to the page it was found on.
 *   topics — mined positions: a paraphrased statement, a stance verb
 *            and a page, produced by an LLM reading the work. Nothing
 *            here can invent those, so this writes an empty list and
 *            the panel says the overview carries no topic entries.
 *            That is a true statement about the data; the alternative
 *            was a false one.
 *
 * WHY IT REUSES extractRefs. There are already three Scripture parsers
 * in this codebase and they disagree with each other. This imports the
 * corpus one -- the same code that built every other collection's
 * index -- rather than adding a fourth that would drift from it.
 *
 *   node scripts/build-curated-research.mjs [--limit N] [--out DIR]
 *
 * Writes files for upload to LIBRARY (mo-tfr-library) under
 * v1/mine/work/. It does not upload; that is a separate, deliberate step.
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { extractRefs } from "./build-scripture-index.mjs";

const BASE = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
const UA = { "user-agent": "Mozilla/5.0" };

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const LIMIT = Number(argOf("--limit", "0")) || 0;
const OUT = argOf("--out", "build/curated-research");

async function json(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

/* The panel prints book names as given. extractRefs returns its own
 * canonical key, so the display name is derived from it rather than
 * from a second table that could disagree about "Song of Songs". */
const display = (canon) =>
  String(canon)
    .split(/[\s_-]+/)
    .map((w) => (/^[ivx]+$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

function booksFor(pages) {
  // One segment per page, so `loc` is the page the citation sits on and
  // every row can carry a link back to it.
  const segments = pages
    .map((p) => ({ text: p.en || "", en: p.en || "", loc: p.n }))
    .filter((s) => s.text);

  const refs = extractRefs(segments);
  const byBook = new Map();

  for (const [key, hit] of refs) {
    const [canon, chapter] = String(key).split("|");
    const ch = Number(chapter);
    if (!canon || !Number.isFinite(ch)) continue;
    if (!byBook.has(canon)) byBook.set(canon, { rows: [], chapters: new Map() });
    const entry = byBook.get(canon);

    const verses = [...(hit.verses || new Map()).entries()];
    if (verses.length) {
      // A citation that named a verse is recorded at the verse.
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

const mo = await json(`${BASE}/v1/mo/index.json`);
let works = mo.works || [];
if (LIMIT) works = works.slice(0, LIMIT);

await mkdir(OUT, { recursive: true });
let written = 0;
let citations = 0;
const empty = [];

for (const w of works) {
  const slug = w.slug;
  let doc;
  try {
    doc = await json(`${BASE}/v1/works/${slug}/work.json`);
  } catch (e) {
    console.log(`   SKIP  ${slug.padEnd(42)} ${e.message}`);
    continue;
  }
  const pages = doc.pages || [];
  const books = booksFor(pages);
  const total = books.reduce((a, b) => a + b.n, 0);
  citations += total;
  if (!books.length) empty.push(slug);

  const out = {
    w: slug,
    t: w.title || "",
    a: w.author || "",
    np: pages.length,
    ncit: total,
    // Honest: nothing here mined positions, so none are claimed.
    topics: [],
    books,
  };
  await writeFile(path.join(OUT, `${slug}.json`), JSON.stringify(out), "utf8");
  written += 1;
  console.log(`   ok    ${slug.padEnd(42)} ${String(pages.length).padStart(4)} pages  ${String(total).padStart(5)} citations  ${books.length} books`);
}

console.log(`\n${written} files in ${OUT}`);
console.log(`${citations.toLocaleString()} citations found`);
if (empty.length) console.log(`${empty.length} works with no Scripture found: ${empty.slice(0, 8).join(", ")}`);
