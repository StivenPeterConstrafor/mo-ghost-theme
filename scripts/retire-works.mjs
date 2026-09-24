#!/usr/bin/env node
/*
 * Takes the works in assets/data/faith-received/work-forwards.json out of
 * the three R2 objects that LIST them, without deleting anything else:
 *
 *   v1/mo/index.json            the English Editions catalogue: the row
 *                               goes, so rooms, All Works, the Confessions
 *                               page, browse and room extras stop showing it
 *   v1/index/works-titles.json  title search (GET /v1/titles): the row goes,
 *                               and the old title and the entry's `search`
 *                               words are added to the new copy's `alt`
 *                               (matched, never shown), so "1689" still
 *                               finds the London Baptist Confession
 *   v1/index/term-works.json    keyword search: the retired work's slot in
 *                               the manifest is re-pointed at the new copy,
 *                               so its postings count for the new copy
 *
 * The works' own files (v1/mo/<slug>.json, v1/works/<slug>/) are NOT
 * touched: forwards and the quoted daily readings still read them, and
 * putting a row back undoes the retirement.
 *
 * Reads the three objects from files (download them first, and keep those
 * downloads: they are the backup), writes patched copies to OUT:
 *
 *   node scripts/retire-works.mjs <in-dir> <out-dir>
 *     in-dir holds index.json, works-titles.json, term-works.json
 *
 * Then upload each with
 *   wrangler r2 object put mo-tfr-library/<key> --remote --file <out>/<name>
 * (v1/index/ is read from mo-tfr-library first; v1/mo/ lives only there).
 * Idempotent: running it on its own output changes nothing.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [IN, OUT] = process.argv.slice(2);
if (!IN || !OUT) { console.error("usage: retire-works.mjs <in-dir> <out-dir>"); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const F = JSON.parse(readFileSync(path.join(root, "assets/data/faith-received/work-forwards.json"), "utf8")).works;
const retired = new Set(Object.keys(F).filter((k) => (F[k].corpus || "mo") === "mo"));

// The catalogue a new copy is listed in, and its id there. The prefixed
// collections carry the bare number in their catalogues (pg 105).
function listed(w) {
  const m = /^(eebo|pld|pg|po)-(.+)$/.exec(w.to);
  if (m) return [m[1], m[2]];
  if (/^aq-/.test(w.to)) return ["augustine", w.to.slice(3)];
  return [w.toCorpus || "tfr", w.to];
}

const read = (n) => JSON.parse(readFileSync(path.join(IN, n), "utf8"));
const save = (n, d) => writeFileSync(path.join(OUT, n), JSON.stringify(d));

{ // English Editions catalogue
  const d = read("index.json");
  const before = d.works.length;
  d.works = d.works.filter((w) => !retired.has(w.slug));
  save("index.json", d);
  console.log(`index.json: ${before} -> ${d.works.length} works`);
}

{ // title index: rows [corpus, id, title, author, year, alt]
  const d = read("works-titles.json");
  const before = d.rows.length;
  const extra = new Map();
  for (const [old, w] of Object.entries(F)) {
    if (!retired.has(old)) continue;
    const [c, id] = listed(w);
    const words = [w.title, w.search, old.replace(/-/g, " ")].filter(Boolean).join(" ");
    extra.set(`${c}|${id}`, (extra.get(`${c}|${id}`) || []).concat(words));
  }
  d.rows = d.rows.filter((r) => !(r[0] === "mo" && retired.has(r[1])));
  let touched = 0;
  for (const r of d.rows) {
    const add = extra.get(`${r[0]}|${r[1]}`);
    if (!add) continue;
    const have = String(r[5] || "");
    const more = add.filter((a) => !have.includes(a));
    if (more.length) { r[5] = [have, ...more].filter(Boolean).join(" "); touched++; }
    extra.delete(`${r[0]}|${r[1]}`);
  }
  d.n = d.rows.length;
  save("works-titles.json", d);
  console.log(`works-titles.json: ${before} -> ${d.rows.length} rows, ${touched} new copies given the old names`);
  if (extra.size) console.log(`  WARNING: no title row for ${[...extra.keys()].join(", ")}`);
}

{ // term index manifest: works [[corpus, id], ...]; postings index into it
  const d = read("term-works.json");
  let n = 0;
  d.works = d.works.map((w) => {
    if (w[0] !== "mo" || !retired.has(w[1])) return w;
    n++;
    return listed(F[w[1]]);
  });
  save("term-works.json", d);
  console.log(`term-works.json: ${n} manifest slots re-pointed`);
}
