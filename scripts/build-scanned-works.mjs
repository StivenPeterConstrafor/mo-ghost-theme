#!/usr/bin/env node
/* Rebuild assets/data/faith-received/scanned-works.json: every work whose
 * reader shows page scans. Read by faith-room.js for ?scans=1 and for
 * /the-faith-received/scans/. Run when the catalogue changes:
 *
 *   node scripts/build-scanned-works.mjs
 *
 * The catalogue's has_pages cannot answer this (every PG row claims pages),
 * so each collection is asked the question the reader itself asks:
 *   tfr  meta.json img_base (v1/works/<slug>/p/<n>.webp), or, for a TEI-only
 *        work with no shards and no single file, more than three <pb facs>
 *        images in tei.en.xml / tei.la.xml (reader-core loadTEI)
 *   pg   the TEI v1/tei/pg/<id>.xml carries a <pb facs> image (loadPgCanon)
 *   po   a v1/pofacs or v1/pofacs2 sidecar exists (loadPoCanon hasF)
 *   pld, eebo, mo, confessions: the reader sets has_pages false; no scans.
 * The worker 403s non-browser user agents, so a browser UA is sent.
 */
import fs from "node:fs";

const LIB = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36";
const OUT = new URL("../assets/data/faith-received/scanned-works.json", import.meta.url);
const WITHDRAWN = new Set(["westminster-assembly-minutes-vol-1"]);
const get = (path) => fetch(LIB + path, { headers: { "user-agent": UA } });
const json = async (path) => { const r = await get(path); return r.ok ? r.json() : null; };

// Reads a text response only until `re` matches, then drops the rest: a PG
// TEI can be 20 MB and the first <pb> answers the question.
async function streamHas(path, re, need = 1) {
  const r = await get(path);
  if (!r.ok || !r.body) return false;
  const dec = new TextDecoder();
  let tail = "", n = 0;
  for await (const chunk of r.body) {
    const text = tail + dec.decode(chunk, { stream: true });
    n += (text.match(re) || []).length;
    if (n >= need) { r.body.cancel?.().catch(() => {}); return true; }
    tail = text.slice(-400);
    n -= (tail.match(re) || []).length;
  }
  return false;
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

const corpusOf = (slug) => /^(pg|pld|po|eebo)-\d+$/.exec(slug)?.[1] || "tfr";
const FACS = /<pb[^>]*\bfacs="https?:[^"]*\.(?:jpe?g|png|webp)/g;
const index = (await json("/v1/works-index.json")).works;

const tfr = index.filter((w) => corpusOf(w.slug) === "tfr" && !WITHDRAWN.has(w.slug));
const tfrHas = await pool(tfr, 16, async (w) => {
  if (w.img_base) return true;
  const meta = await json(`/v1/works/${encodeURIComponent(w.slug)}/meta.json`).catch(() => null);
  if (!meta) return false;
  if (meta.img_base) return true;
  if (meta.single || (meta.shards && meta.shards.length) || !meta.has_tei) return false;
  for (const lane of ["en", "la"]) {
    if (await streamHas(`/v1/works/${encodeURIComponent(w.slug)}/tei.${lane}.xml`, FACS, 4)) return true;
  }
  return false;
});
const pg = index.filter((w) => corpusOf(w.slug) === "pg");
const pgHas = await pool(pg, 24, (w) => streamHas(`/v1/tei/pg/${w.slug.slice(3)}.xml`, FACS));
const po = index.filter((w) => corpusOf(w.slug) === "po");
const poHas = await pool(po, 24, async (w) => {
  const id = w.slug.slice(3);
  const a = await json(`/v1/pofacs/${id}.json`).catch(() => null);
  if (a && (a.full || a.base)) return true;
  const b = await json(`/v1/pofacs2/${id}.json`).catch(() => null);
  return !!(b && b.pages);
});

const num = (s) => Number(s.split("-")[1]);
const pick = (list, has) => list.filter((_, k) => has[k]).map((w) => w.slug);
const t = pick(tfr, tfrHas).sort(), g = pick(pg, pgHas).sort((a, b) => num(a) - num(b)),
  o = pick(po, poHas).sort((a, b) => num(a) - num(b));
const out = {
  generated: new Date().toISOString().slice(0, 10),
  note: "Works whose reader shows page scans. Built by scripts/build-scanned-works.mjs; see its header for the rule per collection.",
  counts: { tfr: t.length, pg: g.length, po: o.length },
  works: [...t, ...g, ...o],
};
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(out.counts, out.works.length);
