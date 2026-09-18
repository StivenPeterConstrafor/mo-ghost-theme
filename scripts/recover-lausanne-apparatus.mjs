#!/usr/bin/env node
/*
 * Recover the Lausanne Covenant's Scripture apparatus.
 *
 * THE BUG. scripts/import-faith-received.mjs reads the covenant out of
 * cvs4bz49sb-oss/heidelberg (data/lausanne.ts) through extractArticles():
 *
 *     return list.map((a) => ({ number: a.number, title: a.title, text: a.text }));
 *
 * Every article in that file also carries a `references` string — the
 * covenant's own printed proof texts, e.g. for Article I:
 *
 *     "Isaiah 40:28; Matthew 28:19; Ephesians 1:11; Acts 15:14; ..."
 *
 * The map drops the field, so the published pages carry the affirmation
 * and none of its Scripture. This reads the field back.
 *
 * It is the only one of the fifty unpublished works whose upstream
 * source still holds an apparatus: the Westminster catechisms, the
 * Thirty-Nine Articles, the Didache, Diognetus, the four creeds, the
 * Imitation and Rerum Novarum all arrive from that repo as bare prose,
 * with no reference field and no footnotes to recover.
 *
 * PAGE ATTRIBUTION is exact, not fuzzy: source article `number: N` is
 * published page N+1 (article 0 is the preface, page 1), and this script
 * verifies the titles agree before it will emit anything.
 *
 * KNOWN UNDERCOUNT. The covenant abbreviates continuations — "Ephesians
 * 1:17,18; 3:10,18" means Ephesians 3 in its second half. The corpus
 * parser requires a book name, so bookless continuations are not
 * counted. Missing a real citation is a smaller wrong than inventing
 * the book it belonged to.
 *
 *   node scripts/recover-lausanne-apparatus.mjs [--out DIR]
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { extractRefs } from "./build-scripture-index.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const BASE = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
const SRC =
  "https://raw.githubusercontent.com/cvs4bz49sb-oss/heidelberg/main/data/lausanne.ts";
const UA = { "user-agent": "TFR-Apparatus-Recovery/1.0 (Mere Orthodoxy; ian@mereorthodoxy.com)" };

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

/* The repo is private to the browser but readable to the gh CLI. Prefer
 * a raw fetch and fall back to `gh api`, so this runs either way. */
async function source() {
  const r = await fetch(SRC, { headers: UA });
  if (r.ok) {
    const t = await r.text();
    if (t.includes("references")) return t;
  }
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const { stdout } = await run("gh", [
    "api",
    "repos/cvs4bz49sb-oss/heidelberg/contents/data/lausanne.ts",
    "--jq",
    ".content",
  ], { maxBuffer: 1 << 26 });
  return Buffer.from(stdout.trim(), "base64").toString("utf8");
}

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

const ts = await source();
// Each article is `{ number, title, text, references }` in that order.
const articles = [];
const re =
  /number:\s*(\d+),[\s\S]*?title:\s*"([^"]*)"[\s\S]*?references:\s*"([^"]*)"/g;
let m;
while ((m = re.exec(ts))) {
  articles.push({ number: Number(m[1]), title: m[2], references: m[3] });
}
if (!articles.length) throw new Error("no articles parsed from lausanne.ts");

const doc = await json(`${BASE}/v1/works/lausanne/work.json`);
const pages = doc.pages || [];

// Refuse to guess. If article N does not line up with page N+1 by title,
// the offset assumption is wrong and the page numbers would be lies.
for (const a of articles) {
  const page = pages[a.number];
  if (!page || page.title !== a.title) {
    throw new Error(
      `article ${a.number} "${a.title}" does not match page ${a.number + 1} "${page ? page.title : "(none)"}"`
    );
  }
}
console.log(`   ${articles.length} articles aligned to ${pages.length} pages by title`);

const segments = [];
for (const p of pages) {
  segments.push({ text: p.en || "", en: p.en || "", loc: p.n });
  const a = articles.find((x) => x.number === p.n - 1);
  if (a && a.references) segments.push({ text: a.references, en: a.references, loc: p.n });
}

const books = booksFor(segments);
const total = books.reduce((a, b) => a + b.n, 0);
if (!total) {
  console.log("   no Scripture found — writing nothing");
  process.exit(0);
}

const mo = await json(`${BASE}/v1/mo/index.json`);
const meta = (mo.works || []).find((w) => w.slug === "lausanne") || {};

await mkdir(OUT, { recursive: true });
await writeFile(
  path.join(OUT, "lausanne.json"),
  JSON.stringify({
    w: "lausanne",
    t: meta.title || "The Lausanne Covenant",
    a: meta.author || "",
    np: pages.length,
    ncit: total,
    topics: [],
    books,
  }),
  "utf8"
);
console.log(`   ok    lausanne  ${total} citations  ${books.length} books`);
