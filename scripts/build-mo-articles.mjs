#!/usr/bin/env node
/*
 * Builds assets/data/faith-received/mo-articles.json: the Mere Orthodoxy essays that serve the library, and the
 * indexes that tell a page which of them belong on it (2026-10-20).
 *
 *   node scripts/build-mo-articles.mjs          write the file and print the coverage report
 *   node scripts/build-mo-articles.mjs --check  exit 1 if the file is stale or any entity does not resolve
 *   node scripts/build-mo-articles.mjs --live   also check every work slug against the live works index
 *
 * Input: scripts/mo-articles-input.json (prepared by scripts/prep-mo-articles-input.mjs; Ian approved all 493 rows).
 * Only a 240-character excerpt and keywords of each essay are kept. Every entry links to mereorthodoxy.com.
 *
 * Entities are checked against the library as it is checked in: loci.json (topics, with children), the
 * confession-proofs index and the councils guide (documents), the works index recorded in the input (works) and
 * the author names recorded there (authors). An entity that does not resolve is dropped and reported; the
 * --check run fails on any, so a bad row cannot ship quietly.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) => path.join(root, p);
const readJson = (p) => JSON.parse(readFileSync(rel(p), "utf8"));
const OUT = "assets/data/faith-received/mo-articles.json";
const MAX_BYTES = 400 * 1024;

const KIND = {
  "CREED-CONFESSION": "doc",
  "RESOURCE-FOR-WORK/AUTHOR": "work",
  "RETRIEVAL-GENERAL": "retrieval",
  "DOCTRINE/TEXT-ENGAGEMENT": "topic",
};

const input = readJson("scripts/mo-articles-input.json");

// ── what the library has ──
const loci = new Map();
for (const part of readJson("assets/data/faith-received/loci.json").parts) {
  for (const l of part.loci) {
    loci.set(l.id, l.label);
    for (const c of l.children || []) loci.set(c.id, c.label);
  }
}
const docTitle = new Map(readJson("assets/data/faith-received/confession-proofs/index.json").docs.map((d) => [d.s, d.t]));
const councils = JSON.stringify(readJson("assets/data/faith-received/guides/councils.json"));
const DOC_SLUG = /^(cf|rc|lc)-\d{3}-[a-z0-9-]+$/;
const docKnown = (s) => DOC_SLUG.test(s) && (docTitle.has(s) || councils.includes(`"${s}"`));
const books = new Map();
{
  const core = readFileSync(rel("assets/js/page/scripture-dev-core.js"), "utf8");
  const canon = core.slice(core.indexOf("const CANON = ["), core.indexOf("const APOCRYPHA = ["));
  for (const m of canon.matchAll(/\["([a-z0-9-]+)", "[^"]+", (\d+)/g)) books.set(m[1], +m[2]);
  if (books.size !== 66) throw new Error(`mo-articles: expected 66 canon books in scripture-dev-core.js, found ${books.size}`);
}

const problems = [];
const dropped = [];
const drop = (id, kind, v, why) => dropped.push(`${id} ${kind} ${v}: ${why}`);

// "romans.8", "romans.8.28", "romans.8.28-30" -> {book, c, from, to}; null when it is not a verse of the canon.
const parseVerse = (ref) => {
  const m = /^([a-z0-9-]+)\.(\d{1,3})(?:\.(\d{1,3})(?:-(\d{1,3}))?)?$/.exec(ref);
  if (!m || !books.has(m[1])) return null;
  const c = +m[2];
  if (c < 1 || c > books.get(m[1])) return null;
  const from = m[3] ? +m[3] : 0;
  const to = m[4] ? +m[4] : from;
  if (to < from) return null;
  return { book: m[1], c, from, to };
};

const articles = [];
const labels = { docs: {}, works: {}, topics: {} };
for (const a of input.articles) {
  const kind = KIND[a.class];
  if (!kind) { problems.push(`${a.id}: unknown class ${a.class}`); continue; }
  const o = { id: a.id, t: a.title, u: a.url, d: a.date, a: a.byline, k: kind, f: a.confidence, x: a.excerpt, w: a.keywords };
  if (!/^https:\/\/mereorthodoxy\.com\//.test(a.url)) problems.push(`${a.id}: url is not on mereorthodoxy.com`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) problems.push(`${a.id}: bad date ${a.date}`);
  if (a.excerpt.length > 241) problems.push(`${a.id}: excerpt is ${a.excerpt.length} characters`);

  const works = [];
  for (const s of a.works) {
    if (input.workTitles[s]) { works.push(s); labels.works[s] = input.workTitles[s]; } else drop(a.id, "work", s, "not in the works index");
  }
  const authors = [];
  for (const s of a.authors) {
    if (input.authorWorks[s] > 0) authors.push(s); else drop(a.id, "author", s, "no works under that name in the library");
  }
  const docs = [], names = [];
  for (const s of a.docs) {
    if (docKnown(s)) { docs.push(s); labels.docs[s] = docTitle.get(s) || input.docLabels[s]; }
    else if (/^(x|umb):/.test(s)) names.push(input.docLabels[s] || s);
    else drop(a.id, "doc", s, "not in the confession-proofs index or the councils guide");
  }
  const topics = [];
  for (const s of a.topics) {
    if (loci.has(s)) { topics.push(s); labels.topics[s] = loci.get(s); } else drop(a.id, "topic", s, "not in loci.json");
  }
  const verses = [];
  for (const s of a.verses) {
    if (parseVerse(s)) verses.push(s); else drop(a.id, "verse", s, "not a verse of the canon");
  }
  if (works.length) o.works = works;
  if (authors.length) o.authors = authors;
  if (docs.length) o.docs = docs;
  if (verses.length) o.verses = verses;
  if (topics.length) o.topics = topics;
  if (names.length) o.n = names;
  o.about = a.about; // consumed below, removed before writing
  articles.push(o);
}
for (const d of dropped) problems.push(`dropped ${d}`);

// ── indexes: about-the-subject first, then newest ──
const idx = { verse: {}, topic: {}, work: {}, author: {}, doc: {} };
const add = (table, key, o, about) => {
  const t = idx[table];
  (t[key] ||= []).push([about ? 0 : 1, o]);
};
for (const o of articles) {
  const about = new Set(o.about || []);
  for (const s of o.works || []) add("work", s, o, about.has(`work:${s}`));
  for (const s of o.authors || []) add("author", s, o, about.has(`author:${s}`));
  for (const s of o.docs || []) add("doc", s, o, about.has(`doc:${s}`));
  for (const s of o.topics || []) add("topic", s, o, about.has(`topic:${s}`));
  const seen = new Set();
  for (const ref of o.verses || []) {
    const v = parseVerse(ref);
    const isAbout = about.has(`verse:${ref}`) || about.has(`verse:${v.book}.${v.c}`);
    const keys = [`${v.book}.${v.c}`];
    if (v.from) for (let n = v.from; n <= v.to; n++) keys.push(`${v.book}.${v.c}.${n}`);
    for (const k of keys) if (!seen.has(k)) { seen.add(k); add("verse", k, o, isAbout); }
  }
}
const sortKey = (a, b) => a[0] - b[0] || (a[1].d < b[1].d ? 1 : a[1].d > b[1].d ? -1 : a[1].id < b[1].id ? -1 : 1);
for (const t of Object.values(idx)) {
  for (const k of Object.keys(t).sort()) t[k] = t[k].sort(sortKey).map((p) => p[1].id);
}
const sortedIdx = {};
for (const [name, t] of Object.entries(idx)) sortedIdx[name] = Object.fromEntries(Object.keys(t).sort().map((k) => [k, t[k]]));

for (const o of articles) delete o.about;
articles.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : a.id < b.id ? -1 : 1));
const sortLabels = (m) => Object.fromEntries(Object.keys(m).sort().map((k) => [k, m[k]]));
const out = {
  v: 1,
  generated: input.generated,
  note: "Built by scripts/build-mo-articles.mjs from scripts/mo-articles-input.json. Do not edit by hand. Essays from Mere Orthodoxy that serve the library. Each entry links to the original. Keys: t title, u url, d date, a author, k kind, f confidence, x excerpt, w keywords.",
  articles,
  lab: { docs: sortLabels(labels.docs), works: sortLabels(labels.works), topics: sortLabels(labels.topics) },
  idx: sortedIdx,
};
const text = `${JSON.stringify(out)}\n`;
const bytes = Buffer.byteLength(text);
if (bytes > MAX_BYTES) problems.push(`${OUT} is ${(bytes / 1024).toFixed(0)} KB, over the ${MAX_BYTES / 1024} KB target`);

// ── coverage ──
const ids = new Set(articles.map((o) => o.id));
for (const [name, t] of Object.entries(sortedIdx)) for (const [k, list] of Object.entries(t)) for (const id of list) if (!ids.has(id)) problems.push(`idx.${name}.${k} names unknown article ${id}`);
const kinds = {};
for (const o of articles) kinds[o.k] = (kinds[o.k] || 0) + 1;
const report = [
  `mo-articles: ${articles.length} articles, ${(bytes / 1024).toFixed(0)} KB (target under ${MAX_BYTES / 1024} KB)`,
  `  kinds: ${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(", ")}`,
  ...Object.entries(sortedIdx).map(([name, t]) => `  idx.${name}: ${Object.keys(t).length} keys, ${Object.values(t).reduce((n, l) => n + l.length, 0)} entries`),
  `  without any entity: ${articles.filter((o) => !o.works && !o.authors && !o.docs && !o.verses && !o.topics).length}`,
  `  unresolved or dropped: ${dropped.length}`,
];

const check = process.argv.includes("--check");
if (process.argv.includes("--live")) {
  const r = await fetch("https://mo-tfr-library.mo-podcast-feed.workers.dev/v1/works-index.json", { headers: { "User-Agent": "curl/8.7.1" } });
  if (!r.ok) problems.push(`live works index: HTTP ${r.status}`);
  else {
    const slugs = new Set((await r.json()).works.map((w) => w.slug));
    for (const s of Object.keys(labels.works)) if (!slugs.has(s)) problems.push(`work ${s} is not in the live works index`);
    report.push(`  live works index: ${slugs.size} works, ${Object.keys(labels.works).length} used`);
  }
}
console.log(report.join("\n"));
for (const p of problems) console.error(`  ! ${p}`);
if (check) {
  let current = "";
  try { current = readFileSync(rel(OUT), "utf8"); } catch { /* missing */ }
  if (current !== text) { console.error(`mo-articles: ${OUT} is stale. Run node scripts/build-mo-articles.mjs`); process.exit(1); }
  if (problems.length) process.exit(1);
  console.log("mo-articles: file current");
} else {
  writeFileSync(rel(OUT), text);
  if (problems.length) process.exit(1);
}
