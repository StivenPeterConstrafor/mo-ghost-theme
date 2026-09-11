/* Slim title index for GET /v1/titles.
 * Row: [corpus, id, title, author, year, alt]
 * `alt` is extra text that should MATCH but never DISPLAY: the Latin
 * title, and the slug's own words. Two real misses drove it:
 *   "de civitate dei"    — the Latin title was not indexed at all, in a
 *                          library that is mostly Latin.
 *   "ninety-five theses" — the work is titled "The 95 Theses"; only its
 *                          slug spells the number out. */
import { writeFileSync, readFileSync } from "node:fs";
const B="https://mo-tfr-library.mo-podcast-feed.workers.dev";
const j = async (u) => { const r=await fetch(u,{headers:{"user-agent":"curl/8.7.1"}}); if(!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
const EX=/^(pld|pg|po|eebo)-\d+$/;

/* Author names, canonicalised across the shelves.
 *
 * The same person is spelled differently by different catalogues, and
 * an author scope that does not know that finds a fraction of a
 * writer's work. Athanasius is the case that exposed it: the native
 * catalogue was folded to "Athanasius of Alexandria" on 2026-09-11, but
 * Patrologia Graeca's own nav still says "Athanasius", so 110 of his
 * works sat under a name the author page never asks for.
 *
 * Two sources, and neither alone is enough:
 *   v1/author_aliases.json  the corpus owner's 42 rulings (Petau, Beza,
 *                           Photius, Mansi and the rest).
 *   FOLDS below             the two folds applied directly to the
 *                           native catalogue and recorded only in
 *                           docs/faith-received/CATALOGUE-CHANGES-2026-09-11.md,
 *                           so they are nowhere a machine can read.
 */
const FOLDS = {
  "Athanasius": "Athanasius of Alexandria",
  "Bede": "Bede the Venerable",
};
const ALIASES = { ...FOLDS, ...(await j(`${B}/v1/author_aliases.json`).catch(() => ({}))) };
const canonAuthor = (a) => ALIASES[String(a || "").trim()] || String(a || "").trim();
const rows=[];
const slugWords = (id) => /^[a-z0-9-]+$/.test(String(id)) ? String(id).replace(/-/g," ") : "";
function push(c,id,t,a,y,latin){
  t=String(t||"").trim(); if(!t) return;
  const alt=[String(latin||"").trim(), slugWords(id)].filter(Boolean).join(" ");
  rows.push([c,String(id),t,canonAuthor(a),y||0,alt]);
}
const ll=await j(`${B}/v1/works-index.json`);
for (const w of ll.works) if(!EX.test(w.slug||"")) push("tfr",w.slug,w.title,w.author,0,w.title_la);
const cf=await j(`${B}/v1/confessions-index.json`);
for (const c of (cf.confessions||[])) push("confessions",c.slug,c.title,"",c.year||0,"");
const mo=await j(`${B}/v1/mo/index.json`);
for (const w of (mo.works||[])) push("mo",w.slug,w.title,w.author,0,"");
const ee=await j("https://eebo-backup.vercel.app/data/catalogue.json");
const keep=new Set(JSON.parse(readFileSync(process.env.THEO,"utf8")).ids.map(String));
for (const w of ee) if(keep.has(String(w.i))) push("eebo",w.i,w.t,w.a,w.y||0,"");
for (const [c,host,en] of [["pld","pld-patrologia-latina","te"],["pg","patrologia-graeca","e"],["po","patrologia-orientalis","te"]]) {
  const nav=await j(`https://${host}.vercel.app/data/nav.json`);
  for (const [id,v] of Object.entries(nav.docs||{})) {
    const eng = v[en] || v.t;
    const latin = (v.t && v.t !== eng) ? v.t : "";
    push(c,id,eng,v.ae||v.a,v.v||0,latin);
  }
}
/* Augustine. Left out of every earlier build of this index, so none of
 * his 124 works could be found by name and /v1/titles answered "no such
 * work" for the City of God's own author. The catalogue is the second
 * half of the aquinas-studies nav — the first half was Thomas Aquinas
 * and was pulled on 2026-07-28 — and the cut is the same file-number
 * floor faith-corpora.js uses (AUGUSTINE_FROM = 151). Kept in step with
 * that constant: if it moves there it must move here. */
const AUGUSTINE_FROM = 151;
const au = await j("https://aquinas-studies.vercel.app/data/nav.json").catch(() => []);
for (const group of (Array.isArray(au) ? au : [])) {
  for (const sec of (group.s || [])) {
    const f = String(sec.f || "");
    const n = parseInt((f.match(/_(\d+)\.html$/) || [])[1], 10);
    if (!(n >= AUGUSTINE_FROM)) continue;
    push("augustine", f.replace(/\.html$/, ""), sec.n, "Augustine of Hippo", 0, "");
  }
}

const body=JSON.stringify({ v:2, n:rows.length, rows });
writeFileSync(process.env.OUT, body);
const { gzipSync } = await import("node:zlib");
console.log(`${rows.length.toLocaleString()} works, ${(body.length/1048576).toFixed(2)} MB raw, ${(gzipSync(Buffer.from(body)).length/1024).toFixed(0)} KB gz`);
