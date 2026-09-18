#!/usr/bin/env node
/*
 * Recover Rerum Novarum's Scripture apparatus.
 *
 * THE BUG. The encyclical was scraped by the upstream repo's
 * scripts/fetch-rerum-novarum.cjs from papalencyclicals.net, which
 * prints the notes as a plain "REFERENCES:" list at the foot of the
 * page with no markers in the body. The scraper kept the 64 numbered
 * sections and left the list behind, so the published text carries
 * Leo XIII's argument and none of the Scripture under it.
 *
 * WHY A DIFFERENT SOURCE. papalencyclicals.net cannot be repaired: with
 * no marker in the body there is nothing to attach note 5 to, and
 * guessing would be inventing. The Vatican's own edition of the same
 * English translation does carry inline markers (<a href="#_ftnrefN">),
 * so the note can be attached to the sentence that cites it and from
 * there to a published section.
 *
 * That makes this a cross-source repair, and it is only legitimate
 * because the anchors prove the two texts are the same translation: 39
 * of the 41 notes land on a published section by matching the prose
 * that precedes them, in strictly increasing section order across all
 * 64 sections. A mismatched translation would not do that. The two that
 * do not match are emitted without a page rather than guessed at.
 *
 *   node scripts/recover-rerum-novarum-apparatus.mjs [--out DIR]
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { extractRefs } from "./build-scripture-index.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const BASE = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
const VATICAN =
  "https://www.vatican.va/content/leo-xiii/en/encyclicals/documents/hf_l-xiii_enc_15051891_rerum-novarum.html";
const UA = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
};

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf("--out", path.join(ROOT, "build", "anf-apparatus"));

async function json(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

const ENTITIES = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };
const unescape = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, k) => ENTITIES[k.toLowerCase()] ?? m);
const strip = (s) => unescape(s.replace(/<[^>]+>/g, " ")).replace(/ /g, " ");
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const html = await (await fetch(VATICAN, { headers: UA })).text();

// The note block begins at the definition of note 1; everything before
// it is body prose carrying the reference marks.
const split = html.indexOf('name="_ftn1"');
if (split < 0) throw new Error("Vatican page has no footnote block");
const bodyHtml = html.slice(0, split);

const marks = [];
const marked = bodyHtml.replace(
  /<a[^>]*href="#_ftn(\d+)"[^>]*>[\s\S]*?<\/a>/gi,
  (_, n) => {
    marks.push(Number(n));
    return ` QQF${n}QQ `;
  }
);
const bodyText = strip(marked);

const notes = new Map();
const noteRe = /name="_ftn(\d+)"[^>]*>\s*<\/a>\s*\((\d+)\)\s*([\s\S]*?)<\/p>/gi;
let m;
while ((m = noteRe.exec(html))) notes.set(Number(m[1]), strip(m[3]).trim());

if (!marks.length || !notes.size) throw new Error("no notes parsed");
console.log(`   ${marks.length} inline marks, ${notes.size} note texts`);

const doc = await json(`${BASE}/v1/works/rerum-novarum/work.json`);
const pages = doc.pages || [];
const index = pages.map((p) => ({ n: p.n, hay: ` ${norm(p.en || "")} ` }));

function locate(prefix) {
  const w = norm(prefix).split(" ").filter(Boolean);
  for (const k of [14, 10, 7, 5]) {
    if (w.length < k) continue;
    const a = ` ${w.slice(-k).join(" ")}`;
    const hits = index.filter((p) => p.hay.includes(a));
    if (hits.length === 1) return hits[0].n;
  }
  return null;
}

const placement = [];
for (const n of marks) {
  const at = bodyText.indexOf(`QQF${n}QQ`);
  const page = at < 0 ? null : locate(bodyText.slice(0, at).replace(/QQF\d+QQ/g, " "));
  placement.push({ n, page });
}

// The marks appear in reading order; their sections must not go
// backwards. An inversion means the anchor matched the wrong section
// and the whole mapping is suspect, so refuse rather than publish it.
const seq = placement.map((p) => p.page).filter((p) => p != null);
let inversions = 0;
for (let i = 1; i < seq.length; i += 1) if (seq[i] < seq[i - 1]) inversions += 1;
if (inversions) throw new Error(`${inversions} out-of-order placements — mapping rejected`);
console.log(`   ${seq.length}/${marks.length} notes placed, 0 inversions, sections ${seq[0]}..${seq[seq.length - 1]} of ${pages.length}`);

const byPage = new Map();
const loose = [];
for (const { n, page } of placement) {
  const text = notes.get(n);
  if (!text) continue;
  if (page == null) loose.push(text);
  else {
    if (!byPage.has(page)) byPage.set(page, []);
    byPage.get(page).push(text);
  }
}

const segments = [];
for (const p of pages) {
  segments.push({ text: p.en || "", en: p.en || "", loc: p.n });
  for (const t of byPage.get(p.n) || []) segments.push({ text: t, en: t, loc: p.n });
}
for (const t of loose) segments.push({ text: t, en: t, loc: null });

const display = (canon) =>
  String(canon)
    .split(/[\s_-]+/)
    .map((w) => (/^[ivx]+$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

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
const books = [...byBook.entries()]
  .map(([canon, e]) => ({
    b: display(canon),
    name: display(canon),
    n: [...e.chapters.values()].reduce((a, b) => a + b, 0),
    chs: [...e.chapters.entries()].sort((a, b) => a[0] - b[0]),
    rows: e.rows.sort((a, b) => a.c - b.c || (a.v || 0) - (b.v || 0)),
  }))
  .sort((a, b) => b.n - a.n);

const total = books.reduce((a, b) => a + b.n, 0);
if (!total) {
  console.log("   no Scripture found — writing nothing");
  process.exit(0);
}

const mo = await json(`${BASE}/v1/mo/index.json`);
const meta = (mo.works || []).find((w) => w.slug === "rerum-novarum") || {};

await mkdir(OUT, { recursive: true });
await writeFile(
  path.join(OUT, "rerum-novarum.json"),
  JSON.stringify({
    w: "rerum-novarum",
    t: meta.title || "Rerum Novarum",
    a: meta.author || "",
    np: pages.length,
    ncit: total,
    topics: [],
    books,
  }),
  "utf8"
);
console.log(`   ok    rerum-novarum  ${total} citations  ${books.length} books`);
