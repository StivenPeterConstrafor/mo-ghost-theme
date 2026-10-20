#!/usr/bin/env node
/*
 * Builds assets/data/faith-received/topic-desk.json, the three computed lists the Topic Desk reads
 * (assets/js/page/topic-desk-model.js). Nothing in it is written by hand.
 *
 *   portraits  the slugs that have an engraving in guides/portraits/ (a name's slug + ".jpg")
 *   councils   the ecumenical councils (name, year) from guides/councils.json
 *   related    for each locus, the eight loci whose most particular proof-texts overlap most with its own
 *              (the first 60 rows of /v1/topic/scripture, the library's "specific" order), with the
 *              overlap counted; overlaps under MIN_SHARED are dropped
 *
 *   node scripts/build-topic-desk-data.mjs           fetch and write
 *   node scripts/build-topic-desk-data.mjs --check   offline: portraits and councils match the files
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(root, "assets/data/faith-received");
const OUT = path.join(DATA, "topic-desk.json");
const VERSE = "https://mo-tfr-verse.mo-podcast-feed.workers.dev";
const MIN_SHARED = 4;
const KEEP = 8;

const portraits = readdirSync(path.join(DATA, "guides/portraits")).filter((f) => f.endsWith(".jpg")).map((f) => f.slice(0, -4)).sort();
const councils = JSON.parse(readFileSync(path.join(DATA, "guides/councils.json"), "utf8")).ecumenical.map((c) => ({ name: c.name, y: c.y }));

if (process.argv.includes("--check")) {
  const have = JSON.parse(readFileSync(OUT, "utf8"));
  const same = JSON.stringify(have.portraits) === JSON.stringify(portraits) && JSON.stringify(have.councils) === JSON.stringify(councils);
  if (!same) { console.error("topic-desk.json is stale: run node scripts/build-topic-desk-data.mjs"); process.exit(1); }
  console.log("ok    topic-desk.json portraits and councils are current");
  process.exit(0);
}

const loci = JSON.parse(readFileSync(path.join(DATA, "loci.json"), "utf8"));
const all = [];
loci.parts.forEach((p) => p.loci.forEach((l) => { all.push(l); (l.children || []).forEach((c) => all.push(c)); }));

const getJson = async (url) => {
  for (let i = 0; i < 3; i += 1) {
    const r = await fetch(url, { headers: { "User-Agent": "curl/8.7.1" } });
    if (r.ok) return r.json();
    await new Promise((res) => setTimeout(res, 400 * (i + 1)));
  }
  throw new Error(`could not fetch ${url}`);
};

const verses = new Map();
for (const l of all) {
  const d = await getJson(`${VERSE}/v1/topic/scripture?id=${encodeURIComponent(l.id)}&t2=${encodeURIComponent(l.t2)}&limit=60`);
  verses.set(l.id, new Set((d.rows || []).slice(0, 60).map((r) => `${r.b}.${r.c}.${r.v}`)));
}

const related = {};
for (const l of all) {
  const mine = verses.get(l.id);
  const rows = [];
  for (const o of all) {
    if (o.id === l.id) continue;
    let n = 0;
    for (const v of verses.get(o.id)) if (mine.has(v)) n += 1;
    if (n >= MIN_SHARED) rows.push({ id: o.id, n });
  }
  rows.sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : 1));
  related[l.id] = rows.slice(0, KEEP);
}

const out = {
  v: 1,
  note: "Built by scripts/build-topic-desk-data.mjs. Do not edit by hand. related: loci that share the most of their 60 most particular proof-texts (n = verses shared).",
  portraits,
  councils,
  related,
};
writeFileSync(OUT, `${JSON.stringify(out)}\n`);
console.log(`wrote ${path.relative(root, OUT)}: ${portraits.length} portraits, ${councils.length} councils, related for ${Object.keys(related).length} loci`);
