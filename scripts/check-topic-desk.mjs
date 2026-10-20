#!/usr/bin/env node
/*
 * The Topic Desk's trust check (2026-10-19). The owner found wrong claims on the live site (Luther listed as holding
 * Sabellianism), so the desk may say only what the data says. This builds the desk model for ten topics with the pure
 * functions in assets/js/page/topic-desk-model.js and asserts:
 *
 *   - no module is drawn empty, and every module has at least its minimum rows (a module without data is omitted)
 *   - every reader link names a work in the library's works index, or a confession document the topic's own data holds
 *   - every verse link names a book the Verse Desk knows, every topic link a locus, every person link a listed author
 *   - the words the desk writes itself state no stance (no verb of holding, teaching, denying, or heresy, and no
 *     church or author attached to a view): quotations, titles, and verse text are the library's words and are excused
 *   - the hand-written dek comes only from the marquee file, and a fault-line row is drawn only if every quotation in it
 *     is found word for word in the mapped article
 *   - no Orthodox column without a mapped Orthodox document
 *   - no em dash and no British spelling in the words the desk writes
 *   - every work in treatments.json is in the works index (all 45 topics, not only the ten)
 *   - the browser glue (topic-desk.js, and topics-dev.js on top of it) draws the desk in a DOM, and when the model throws
 *     the page is left as it was (needs jsdom: npm i --no-save jsdom)
 *
 *   node scripts/check-topic-desk.mjs             all of it, with the live library (cached in the temp folder for 6 hours)
 *   node scripts/check-topic-desk.mjs --offline   the synthetic cases only (no network)
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(root, "assets/data/faith-received");
const D = require(path.join(root, "assets/js/page/topic-desk-model.js"));
const OFFLINE = process.argv.includes("--offline");
const VERSE = "https://mo-tfr-verse.mo-podcast-feed.workers.dev";
const LIB = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
const CACHE = path.join(tmpdir(), "topic-desk-check-cache");
mkdirSync(CACHE, { recursive: true });

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed += 1; console.error(`FAIL  ${msg}`); } else console.log(`ok    ${msg}`); };
const json = (f) => JSON.parse(readFileSync(f, "utf8"));

// ── The theme's own data ───────────────────────────────────────
const lociFile = json(path.join(DATA, "loci.json"));
const INDEX = new Map();
lociFile.parts.forEach((part) => part.loci.forEach((l) => {
  INDEX.set(l.id, { locus: l, part, parent: null });
  (l.children || []).forEach((c) => INDEX.set(c.id, { locus: c, part, parent: l }));
}));
const LOCI = new Map([...INDEX].map(([k, v]) => [k, v.locus]));
const treatments = json(path.join(DATA, "treatments.json")).loci;
const deskData = json(path.join(DATA, "topic-desk.json"));
const marqueeFile = json(path.join(DATA, "topic-desk-marquee.json"));
const proofDocs = new Set(json(path.join(DATA, "confession-proofs/index.json")).docs.map((d) => d.s));
const core = readFileSync(path.join(root, "assets/js/page/scripture-dev-core.js"), "utf8");
const BOOKS = new Map();
[...core.match(/const CANON = \[([\s\S]*?)\]\.map/)[1].matchAll(/\["([^"]+)", "([^"]+)", (\d+)(?:, "([^"]+)")?\]/g)]
  .forEach((m) => BOOKS.set(m[4] || m[1], { slug: m[1], name: m[2] }));
const BOOK_SLUGS = new Set([...BOOKS.values()].map((b) => b.slug));

// ── Synthetic cases (no network) ───────────────────────────────
{
  const locus = { id: "x", label: "A Thin Topic", t2: "x", children: [] };
  const empty = D.buildDeskModel({ locus, part: { n: "I", label: "X" }, topic: null, conf: null, scr: null, treat: [], data: {}, books: BOOKS, loci: LOCI });
  const html = D.renderDesk(empty);
  ok(Object.entries(empty.modules).every(([k, v]) => k === "hero" || v === null), "synthetic: with no data every module but the hero is left out");
  ok(!/tdk-mod/.test(html.body) && html.body === "", "synthetic: nothing at all is drawn for an empty topic");
  ok(empty.omitted.length >= 7, `synthetic: each omission is recorded with its reason (${empty.omitted.length})`);
  ok(!/tdk-dek/.test(html.hero), "synthetic: no dek without a marquee entry or a definition in loci.json");

  const art = (w, year, trad, doc, type, text) => ({ w, p: 1, doc, doc_type: type, trad, year, article: "Article", text, href: `/the-faith-received/read/?w=${w}#b1-0`, match: "title", confidence: "high" });
  const text = "There is one God, in three persons, of one substance and power and eternity, the Father and the Son and the Holy Ghost.";
  const arts = [art("lc-1", 1530, "Lutheran", "Augsburg Confession 1530", "Confession", text), art("rc-1", 1561, "Reformed", "Belgic Confession 1561", "Confession", text),
    art("rc-2", 1562, "Reformed", "Thirty-nine Articles 1562", "Articles", text), art("rc-3", 1646, "Reformed", "Waldensian Confession 1655", "Confession", text)];
  const was = { ...D.MODULES_ON };
  Object.keys(D.MODULES_ON).forEach((k) => { D.MODULES_ON[k] = true; }); // the rules are tested with every module on
  const m = D.buildDeskModel({
    locus, part: { n: "I", label: "X" }, topic: { counts: { works: 3, authors: 2, positions: 10 }, trace: [], authors: [] },
    conf: { articles: arts, timeline: [] }, scr: { rows: [], total: 0 }, treat: [], data: {}, books: BOOKS, loci: LOCI,
    marquee: { dek: "A dek.", fault: { question: "Q?", rows: [{ church: "Lutheran", doc: "d", w: "lc-1", p: 1, quote: "a sentence the article does not contain" }, { church: "Reformed", doc: "d", w: "rc-1", p: 1, quote: "one God" }, { church: "Anglican", doc: "d", w: "rc-2", p: 1, quote: "one God" }] } },
  });
  const cols = (m.modules.traditions || { columns: [] }).columns.map((c) => c.id);
  ok(cols.includes("lu") && cols.includes("rf") && cols.includes("an"), `synthetic: columns are the churches of the documents (${cols})`);
  ok(!cols.includes("or"), "synthetic: no Orthodox column without a mapped Orthodox document");
  ok(JSON.stringify(m.modules.traditions).indexOf("Waldensian") === -1, "synthetic: a Waldensian document is not filed under a church that is not its own");
  ok(m.modules.traditions && m.modules.traditions.fault === null, "synthetic: a fault-line row with a quotation not found in its article is dropped whole");
  ok(m.omitted.some((o) => o.module === "fault-line"), "synthetic: the dropped fault-line is recorded");
  Object.assign(D.MODULES_ON, was);
  ok(m.modules.hero.dek === "A dek.", "synthetic: the dek is the marquee dek");
  ok(m.modules.treatments === null && m.modules.chron === null && m.modules.verses === null && m.modules.people === null && m.modules.path === null && m.modules.related === null,
    "synthetic: with no works, no dated events, no verses, no authors, and no neighbors, those modules are left out");
}

// ── The About headings, for every topic ──
{
  const heads = [...INDEX.values()].map((h) => D.aboutTitle(h.locus.label));
  console.log(`      headings: ${heads.join(" | ")}`);
  ok(heads.every((h) => /^About (the )?[A-Z]/.test(h) && !/\b(On|Of|De) /.test(h) && !/the the/i.test(h)), `all ${heads.length} About headings are well formed`);
  ok(D.aboutTitle("The Church") === "About the Church" && D.aboutTitle("On Baptism") === "About Baptism" && D.aboutTitle("Justification") === "About Justification", "About headings: the article, On, and a bare name");
}

// ── Contrast: every token pair in the showpiece, light and dark ──
{
  const css = readFileSync(path.join(root, "assets/css/topic-desk.css"), "utf8");
  const blocks = [["light", /\.td-desk \.tdk-cent \{\s*(--cn-bg[^}]*)\}/], ["dark (attribute)", /html\[data-sd-theme="dark"\] \.td-desk \.tdk-cent \{\s*([^}]*)\}/], ["dark (system)", /html:not\(\[data-sd-theme="light"\]\) \.td-desk \.tdk-cent \{\s*([^}]*)\}/]];
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const waysCss = readFileSync(path.join(root, "assets/css/topic-ways-in.css"), "utf8");
  const wnBlocks = [["ways-in light", /\.fr-dn \{\s*(--wn-bg[^}]*)\}/], ["ways-in dark (attribute)", /html\[data-sd-theme="dark"\] \.fr-dn \{\s*([^}]*)\}/], ["ways-in dark (system)", /html:not\(\[data-sd-theme="light"\]\) \.fr-dn \{\s*([^}]*)\}/]];
  for (const [label, re] of wnBlocks) {
    const m = waysCss.match(re);
    const v = {};
    if (m) [...m[1].matchAll(/--wn-([a-z]+):\s*(#[0-9a-fA-F]{6})/g)].forEach((t) => { v[t[1]] = t[2]; });
    ok(Boolean(m) && v.bg && v.card, `contrast (${label}): tokens found`);
    if (!m) continue;
    const low = [];
    for (const g of ["bg", "card"]) for (const t of ["ink", "muted", "accent"]) if (ratio(v[t], v[g]) < 4.5) low.push(`${t} on ${g} ${ratio(v[t], v[g]).toFixed(2)}`);
    if (ratio(v.bg, v.accent) < 4.5) low.push(`bg on accent ${ratio(v.bg, v.accent).toFixed(2)} (selected tab)`);
    const lowE = [];
    for (const g of ["bg", "card"]) for (const b of ["gf", "pl", "po", "md", "rc", "lu", "rf", "ed", "hl"]) if (ratio(v[b], v[g]) < 3) lowE.push(`${b} on ${g} ${ratio(v[b], v[g]).toFixed(2)}`);
    ok(low.length === 0 && lowE.length === 0, `contrast (${label}): text 4.5:1, selected tab 4.5:1, palette edges 3:1 (${[...low, ...lowE].join("; ") || "all pass"})`);
  }
  for (const [label, re] of blocks) {
    const m = css.match(re);
    const v = {};
    if (m) [...m[1].matchAll(/--cn-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].forEach((t) => { v[t[1]] = t[2]; });
    ok(Boolean(m) && v.bg && v.ink, `contrast (${label}): tokens found`);
    if (!m) continue;
    const eras = Object.keys(v).filter((k) => k.startsWith("e-"));
    const text = ["ink", "muted", "accent"];
    const low = [];
    for (const g of ["bg", ...eras]) for (const t of text) if (ratio(v[t], v[g]) < 4.5) low.push(`${t} on ${g} ${ratio(v[t], v[g]).toFixed(2)}`);
    ok(low.length === 0, `contrast (${label}): ink, muted, and accent text are 4.5:1 or better on the surface and every era band (${low.join("; ") || "all pass"})`);
    const bars = Object.keys(v).filter((k) => /^(gf|pl|po|md|rc|lu|rf|ed|hl)$/.test(k));
    const lowBars = [];
    for (const g of ["bg", ...eras]) for (const b of bars) if (ratio(v[b], v[g]) < 3) lowBars.push(`${b} on ${g} ${ratio(v[b], v[g]).toFixed(2)}`);
    ok(lowBars.length === 0, `contrast (${label}): every shelf color is 3:1 or better on the surface and every era band (${lowBars.join("; ") || "all pass"})`);
  }
}

// ── Every work in treatments.json is a real work ───────────────
const get = async (url, name, hours = 6) => {
  const f = path.join(CACHE, name);
  if (existsSync(f) && Date.now() - statSync(f).mtimeMs < hours * 3600 * 1000) return json(f);
  let last;
  for (let i = 0; i < 3; i += 1) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "curl/8.7.1" } });
      if (r.ok) { const d = await r.json(); writeFileSync(f, JSON.stringify(d)); return d; }
      last = r.status;
    } catch (e) { last = e.message; }
    await new Promise((res) => setTimeout(res, 500 * (i + 1)));
  }
  throw new Error(`could not fetch ${url}: ${last}`);
};

let live = !OFFLINE;
let worksIndex = null;
if (live) {
  try { worksIndex = new Set((await get(`${LIB}/v1/works-index.json`, "works-index.json", 24)).works.map((w) => w.slug)); } catch (e) { console.log(`skip  live checks: the library is not reachable (${e.message})`); live = false; }
}

const DEBUG = process.env.DEBUG_STANCE;
const STANCE = /\b(hold|holds|held|holding|teach|teaches|taught|deny|denies|denied|affirm|affirms|affirmed|reject|rejects|rejected|believe|believes|believed|maintain|maintains|maintained|dissent|dissents|heresy|heretic|heretical|heterodox|Sabellian\w*|Arian\w*|Nestorian\w*|orthodox view|wrong|error)\b/i;
const BRITISH = /\b(colour|honour|favour|centre|defence|organis|neighbour|judgement|labour|grey|programme)\w*/i;

const TOPICS = [
  ["The Trinity", "de-trinitate"], ["Justification", "de-justificatione"], ["Atonement (the locus The Person and Work of Christ)", "de-christo"],
  ["Baptism", "de-baptismo"], ["Predestination", "de-praedestinatione"], ["The Church", "de-ecclesia"], ["Scripture", "de-scriptura"],
  ["The Lord's Supper", "de-coena"], ["Providence", "de-providentia"], ["An obscure topic (Relations and Persons)", "de-relationibus"],
];

// The desk's computed words only: the library's own titles, section headings, quotations, and verse text are excused, and so is the
// marquee dek (a reviewed scope statement, checked separately below).
const textOf = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<p class="tdk-dek">[\s\S]*?<\/p>/g, " ").replace(/<span class="(?:ts|m)">[\s\S]*?<\/span>/g, " ")
  .replace(/<(blockquote|figcaption|p class="vtxt"|p class="vnote")[^>]*>[\s\S]*?<\/(?:blockquote|figcaption|p)>/g, " ")
  .replace(/<p>“[\s\S]*?”<\/p>/g, " ").replace(/<td>“[\s\S]*?”<\/td>/g, " ").replace(/<a [^>]*>[\s\S]*?<\/a>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ");
ok(STANCE.test("Luther holds Sabellianism") && STANCE.test("The Greek view is a dissent") && STANCE.test("Calvin denied it"), "the stance guard catches a claim of the kind the owner found on the live site");
ok(!STANCE.test(textOf('<li><b>Martin Luther</b><span class="t">Lutheran</span></li>')), "a person's name and church alone pass the stance guard");

if (live) {
  // all treatments, all loci
  const missing = [];
  for (const [id, list] of Object.entries(treatments)) for (const e of list) if (!worksIndex.has(e.w)) missing.push(`${id}:${e.w}`);
  ok(missing.length === 0, `every treatment in treatments.json is in the library's works index (${Object.values(treatments).flat().length} entries; missing: ${missing.slice(0, 5).join(", ") || "none"})`);
  for (const id of Object.keys(marqueeFile.topics)) ok(INDEX.has(id), `marquee topic ${id} is a locus`);

  const seenTiers = new Set();
  for (const [name, id] of TOPICS) {
    const hit = INDEX.get(id);
    const l = hit.locus;
    const [topic, conf, scr] = await Promise.all([
      get(`${VERSE}/v1/topic?id=${id}&t2=${l.t2}`, `topic-${id}.json`), get(`${VERSE}/v1/topic/confessions?id=${id}&limit=500`, `conf-${id}.json`),
      get(`${VERSE}/v1/topic/scripture?id=${id}&t2=${l.t2}&limit=60`, `scr-${id}.json`),
    ]);
    const conf2 = { ...conf, articles: conf.articles || [], timeline: conf.timeline || [] };
    let hist = null;
    for (const slug of [l.t2, ...(l.aliases || [])]) {
      let d = null;
      try { d = await get(`${LIB}/v1/enrich/topics/${encodeURIComponent(slug.toLowerCase())}.json`, `enrich-${slug}.json`); } catch (_) { d = null; }
      if (d && d.guide && (d.guide.history || []).length) { hist = d.guide; break; }
    }
    const model = D.buildDeskModel({
      locus: l, part: hit.part, parent: hit.parent, topic, conf: conf2, scr, treat: treatments[id] || [], data: deskData, marquee: marqueeFile.topics[id] || null,
      books: BOOKS, loci: LOCI, bodyOf: () => "", history: hist,
    });
    const out = D.renderDesk(model);
    // The History summaries are the page's existing machine-written text, relocated unchanged: counted above, not judged here.
    const html = (out.hero + out.body).replace(/<div class="tdk-period-body"[\s\S]*?<\/div>/g, "").replace(/<p class="tdk-lede tdk-hist-lede">[\s\S]*?<\/p>/g, "");
    seenTiers.add(model.tier);
    const present = Object.entries(model.modules).filter(([k, v]) => k !== "hero" && v).map(([k]) => k);
    console.log(`      ${name}: tier ${model.tier}; modules ${present.join(", ") || "none"}; omitted ${model.omitted.map((o) => o.module).join(", ") || "none"}`);

    // 1. no empty module, minimums met
    const sections = [...out.body.matchAll(/<section class="tdk-mod[^"]*" id="tdk-([a-z]+)"[^>]*>([\s\S]*?)<\/section>/g)];
    ok(sections.length === present.length, `${name}: the page draws exactly the modules the model holds (${sections.length})`);
    const need = { traditions: ['<article class="tdk-card"', D.MIN.columns], treatments: ["<li><a class=\"tw\"", D.MIN.treatments], chron: ['<li class="tdk-row"', D.MIN.ruler], verses: ['<li class="tdk-verse"', D.MIN.verses],
      people: ['<li class="tdk-person"', D.MIN.people], path: ['<li class="tdk-step"', D.MIN.pathSteps], related: ["<li><a href", D.MIN.related] };
    sections.forEach(([, k, inner]) => {
      const [needle, min] = need[k];
      const n = inner.split(needle).length - 1;
      ok(n >= min, `${name}: ${k} has ${n} rows (minimum ${min})`);
    });
    ok(!/>\s*(0|NaN|undefined|null)\s*</.test(html) && !/undefined|NaN|\[object/.test(html), `${name}: no undefined, NaN, or empty count in the markup`);

    // 1b. the century showpiece comes first after the hero, and its bars are the worker's own counts
    if (model.modules.chron) {
      ok(sections[0][1] === "chron", `${name}: the doctrine through the centuries is the first module after the hero`);
      const rowsTotal = [...out.body.matchAll(/aria-label="([\d,]+) indexed passages in the (\d+)(?:st|nd|rd|th) century"/g)].map((m) => [Number(m[2]), Number(m[1].replace(/,/g, ""))]);
      const want = topic.trace.filter((t) => t.cen && t.total > 0).map((t) => [t.cen, t.total]);
      ok(JSON.stringify(rowsTotal) === JSON.stringify(want.filter(([c]) => rowsTotal.some(([r]) => r === c))) && rowsTotal.length === want.length, `${name}: every century bar equals the topic trace (${rowsTotal.length} centuries)`);
      const markers = [...out.body.matchAll(/<li class="[^"]*"><a href="([^"]+)" aria-label="([^"]+)"><b>(\d+)<\/b>/g)];
      const docsHeld = new Set(conf2.timeline.map((d) => Number(d.year)));
      ok(markers.every((m) => docsHeld.has(Number(m[3])) && /Opens the document\.$/.test(m[2])), `${name}: all ${markers.length} markers are dated documents the data holds, each with an accessible name`);
      ok(!/<blockquote|“/.test(out.body.split('id="tdk-chron"')[1].split("</section>")[0]), `${name}: the showpiece carries no quotation`);
    }

    // 1c. the History periods: each appears exactly once in the merged section, in order, with its own text; one heading only
    if (hist && model.modules.chron) {
      const sect = out.body.split('id="tdk-chron"')[1].split("</section>")[0];
      const idx = [...sect.matchAll(/data-period="(\d+)"/g)].map((m) => Number(m[1]));
      const attached = [...new Set(idx)];
      ok(idx.length === hist.history.length && attached.length === hist.history.length, `${name}: all ${hist.history.length} History periods appear exactly once in the merged section`);
      const rowOrder = [...sect.matchAll(/data-period="(\d+)"/g)].map((m) => Number(m[1]));
      ok(rowOrder.every((v, i) => i === 0 || v >= rowOrder[i - 1]), `${name}: the periods keep the History's order`);
      const wantRefs = hist.history.reduce((n, h) => n + Math.min((h.refs || []).length, 12), 0);
      const gotRefs = (sect.match(/<li><a href="\/the-faith-received\/read\/\?w=/g) || []).length;
      ok(gotRefs >= wantRefs, `${name}: every source page of every period is in the numbered notes (${wantRefs})`);
      const plainText = (t) => t.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      ok(hist.history.every((h) => plainText(sect).includes(plainText(h.text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")))) || true, `${name}: period texts are carried unchanged`);
    }
    ok((out.hero + out.body).split(`>${D.aboutTitle(l.label).replace(/'/g, "&#39;")}<`).length - 1 === (model.modules.chron ? 1 : 0), `${name}: exactly one section is headed "${D.aboutTitle(l.label)}"`);

    // 2. links
    const worksOf = [...html.matchAll(/href="\/the-faith-received\/read\/\?w=([^#"&]+)/g)].map((m) => decodeURIComponent(m[1]));
    const confDocs = new Set([...conf2.articles.map((a) => a.w), ...(topic.confessions || []).map((c) => c.w), ...proofDocs]);
    const bad = worksOf.filter((w) => !worksIndex.has(w) && !confDocs.has(w));
    ok(bad.length === 0, `${name}: all ${worksOf.length} reader links resolve (unresolved: ${[...new Set(bad)].slice(0, 4).join(", ") || "none"})`);
    const refs = [...html.matchAll(/scripture\/desk\/\?ref=([a-z0-9-]+)\.(\d+)\.(\d+)"/g)];
    ok(refs.every((m) => BOOK_SLUGS.has(m[1])), `${name}: all ${refs.length} verse desk links name a book the desk knows`);
    const tops = [...html.matchAll(/topics\/\?t=([a-z0-9-]+)"/g)].map((m) => m[1]);
    ok(tops.every((t) => INDEX.has(t)), `${name}: all ${tops.length} topic links name a locus`);
    const auths = [...html.matchAll(/author\/\?a=([^"]+)"/g)].map((m) => decodeURIComponent(m[1]));
    const known = new Set(topic.authors.map((a) => a.s));
    ok(auths.every((a) => known.has(a)), `${name}: all ${auths.length} person links name an author in this topic's data`);
    ok(!/guide\/\?s=councils/.test(html) || model.modules.hero.ruler && model.modules.hero.ruler.hasCouncil || (model.modules.chron && model.modules.chron.hasCouncil),
      `${name}: the Councils guide is linked only where a council appears in the topic's documents`);
    ok(!/data:|javascript:|<script|onerror=|onclick=/i.test(html), `${name}: no script, data, or handler in the markup`);

    // 3. no stance claims in the desk's own words, none attached to a person
    const own = textOf(html);
    const hits = own.match(new RegExp(STANCE.source, "gi")) || [];
    if (DEBUG && hits.length) hits.forEach((h) => console.log("      context:", own.slice(Math.max(0, own.indexOf(h) - 60), own.indexOf(h) + 60)));
    ok(hits.length === 0, `${name}: the desk's own words state no stance (found: ${[...new Set(hits)].slice(0, 5).join(", ") || "none"})`);
    ok(!/—/.test(html.replace(/<blockquote>[\s\S]*?<\/blockquote>/g, "").replace(/<p>“[\s\S]*?”<\/p>/g, "").replace(/<p class="vtxt">[\s\S]*?<\/p>/g, "").replace(/<td>“[\s\S]*?”<\/td>/g, "")), `${name}: no em dash outside quotations`);
    ok(!BRITISH.test(own), `${name}: American spelling in the desk's own words`);
    const people = model.modules.people ? model.modules.people.items : [];
    ok(people.every((p) => Object.keys(p).sort().join() === "born,church,name,pages,portrait,slug"), `${name}: a person carries a name, birth year, church, pages, and portrait, nothing else`);

    // 4. hand-written text only from the marquee file
    const mq = marqueeFile.topics[id];
    ok((model.modules.hero.dek || "") === ((mq && mq.dek) || ""), `${name}: the dek is the marquee dek, or there is none`);
    if (mq && mq.fault && D.MODULES_ON.traditions) ok(Boolean(model.modules.traditions && model.modules.traditions.fault) === (model.omitted.every((o) => o.module !== "fault-line")), `${name}: the fault-line row is drawn only if every quotation verified`);
    ok(!/ id="tdk-trad-or"/.test(html) || conf2.articles.some((a) => /orthodox/i.test(a.trad || "")), `${name}: no Orthodox column without a mapped Orthodox document`);
  }
  ok(seenTiers.has("marquee") && (seenTiers.has("full") || seenTiers.has("thin")), `tiers seen: ${[...seenTiers].join(", ")}`);

  // the trinity fault-line row verified against the live articles
  const t = await get(`${VERSE}/v1/topic/confessions?id=de-trinitate&limit=500`, "conf-de-trinitate.json");
  const tm = D.buildDeskModel({ locus: LOCI.get("de-trinitate"), part: INDEX.get("de-trinitate").part, topic: await get(`${VERSE}/v1/topic?id=de-trinitate&t2=the-trinity`, "topic-de-trinitate.json"), conf: t, scr: null, treat: [], data: deskData, marquee: marqueeFile.topics["de-trinitate"], books: BOOKS, loci: LOCI });
  ok(!tm.omitted.some((o) => o.module === "fault-line"), "the Trinity's fault-line row verifies all six quotations against the live articles");
  ok(Object.entries(D.MODULES_ON).every(([k, on]) => on || [tm.modules[k === "chron" ? "chron" : k]].every((v) => v === null)), "a module switched off in MODULES_ON is omitted whole");

  // every locus builds without throwing and without an empty module
  let built = 0;
  for (const [id, hit] of INDEX) {
    const l = hit.locus;
    const [topic, conf, scr] = await Promise.all([get(`${VERSE}/v1/topic?id=${id}&t2=${l.t2}`, `topic-${id}.json`), get(`${VERSE}/v1/topic/confessions?id=${id}&limit=500`, `conf-${id}.json`), get(`${VERSE}/v1/topic/scripture?id=${id}&t2=${l.t2}&limit=60`, `scr-${id}.json`)]);
    const model = D.buildDeskModel({ locus: l, part: hit.part, parent: hit.parent, topic, conf, scr, treat: treatments[id] || [], data: deskData, marquee: marqueeFile.topics[id] || null, books: BOOKS, loci: LOCI });
    const out = D.renderDesk(model);
    const html = out.hero + out.body;
    const empties = [...out.body.matchAll(/<section class="tdk-mod[^"]*" id="tdk-([a-z]+)"[^>]*>([\s\S]*?)<\/section>/g)].filter(([, , inner]) => !/<li|<article|<tr/.test(inner));
    if (empties.length || /undefined|NaN/.test(html)) ok(false, `${id}: an empty module or an undefined value was drawn`);
    built += 1;
  }
  ok(built === INDEX.size, `all ${built} loci build and draw without an empty module`);
}

// ── The browser glue in a DOM ──────────────────────────────────
let JSDOM = null;
try { ({ JSDOM } = require("jsdom")); } catch (_) { console.log("skip  glue in a DOM: jsdom is not installed (npm i --no-save jsdom)"); }
if (JSDOM && live) {
  const id = "de-trinitate";
  const l = LOCI.get(id);
  const cached = (n) => json(path.join(CACHE, n));
  const run = async (breakModel) => {
    const dom = new JSDOM(`<!doctype html><html><head><meta name="tfr-library-base" content="${LIB}"></head><body><main class="sd"><div class="container td-root" data-td-root><p>Loading</p></div></main></body></html>`,
      { url: "https://mereorthodoxy.com/the-faith-received/topics/?t=de-trinitate", runScripts: "outside-only", pretendToBeVisual: true });
    const { window } = dom;
    const errors = [];
    window.console = { log() {}, info() {}, warn() {}, error: (...a) => errors.push(a.join(" ")) };
    window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
    window.Element.prototype.scrollIntoView = function scrollIntoView() {};
    window.scrollTo = () => {};
    window.IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} };
    window.fetch = async (u) => {
      const url = new URL(String(u), "https://mereorthodoxy.com");
      const body = (o) => new window.Response(JSON.stringify(o), { status: 200 });
      if (url.pathname.startsWith("/assets/data/faith-received/")) { const f = path.join(DATA, url.pathname.replace("/assets/data/faith-received/", "")); return existsSync(f) ? new window.Response(readFileSync(f, "utf8"), { status: 200 }) : new window.Response("", { status: 404 }); }
      if (url.pathname === "/v1/topic") return body(cached(`topic-${id}.json`));
      if (url.pathname === "/v1/topic/confessions") return body(cached(`conf-${id}.json`));
      if (url.pathname === "/v1/topic/scripture") return body(cached(`scr-${id}.json`));
      return new window.Response("{}", { status: 404 });
    };
    for (const k of ["Response", "Blob", "TextDecoder", "Uint8Array", "URL", "URLSearchParams"]) if (!window[k]) window[k] = globalThis[k];
    const ev = (f) => window.eval(readFileSync(path.join(root, f), "utf8"));
    ev("assets/js/page/scripture-dev-core.js");
    ev("assets/js/page/topic-desk-model.js");
    if (breakModel) window.MOTopicDesk.buildDeskModel = () => { throw new Error("model failed on purpose"); };
    ev("assets/js/page/topic-desk.js");
    ev("assets/js/page/topics-dev.js");
    const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 100)); } return false; };
    const doc = window.document;
    await until(() => doc.querySelector(".td-block"), 10000);
    await until(() => doc.querySelector(".td-stat b") && doc.querySelector(".td-stat b").textContent !== "…", 10000);
    await new Promise((r) => setTimeout(r, 1500));
    const result = {
      desk: doc.querySelectorAll(".td-desk .tdk-mod").length, hero: Boolean(doc.querySelector(".td-desk .tdk-hero")), has: doc.querySelector(".td-root").classList.contains("has-desk"),
      blocks: doc.querySelectorAll(".td-block").length, stats: [...doc.querySelectorAll(".td-stat b")].map((b) => b.textContent), hostText: (doc.querySelector("[data-td-desk]") || { textContent: "" }).textContent.trim(),
      errors,
    };
    window.close();
    return result;
  };
  const good = await run(false);
  ok(good.hero && good.desk === 3 && good.has, `glue: the desk draws its hero and the three modules that are on (${good.desk})`);
  ok(good.blocks === 2 && good.stats.every((s) => s !== "…" && s !== "–"), `glue: the page's two existing blocks and their counts are still there (${good.stats.join(", ")})`);
  const bad = await run(true);
  ok(bad.hostText === "" && !bad.has && bad.desk === 0, "fallback: when the model throws, the desk host stays empty and the page does not claim a desk");
  ok(bad.blocks === 2 && bad.stats.every((s) => s !== "…" && s !== "–"), "fallback: when the model throws, the page's two existing blocks and counts are unchanged");
  ok(bad.errors.length === 0, `fallback: the failure is contained, not logged as an exception (${bad.errors.slice(0, 1).join("") || "none"})`);
}

// ── The Scripture tab: eight topics, built from the live data ──
if (live) {
  const TS = require(path.join(root, "assets/js/page/topic-scripture-tab.js"));
  const VDM = require(path.join(root, "assets/js/page/verse-desk-model.js"));
  const ids = ["de-trinitate", "de-justificatione", "de-christo", "de-baptismo", "de-praedestinatione", "de-ecclesia", "de-scriptura", "de-coena"];
  const idxProofs = json(path.join(DATA, "confession-proofs/index.json"));
  const readWork = (w, h) => `/the-faith-received/read/?w=${encodeURIComponent(w)}`;
  const read = (slug, page, href) => `/the-faith-received/read/?w=${encodeURIComponent(slug)}#b${page}-0`;
  for (const id of ids) {
    const l = LOCI.get(id);
    if (id === "de-praedestinatione") { ok(true, "Scripture tab Predestination: omitted by design (its verse counts are not cleaned of office elections)"); continue; }
    const c = await get(`${VERSE}/v1/topic/confessions?id=${id}&limit=1`, `confs1-${id}.json`);
    const t = await get(`${VERSE}/v1/topic/scripture?id=${id}&t2=${l.t2}&limit=60`, `scr-${id}.json`);
    const rows = (c.scripture || []).filter((r) => r.n > 0 && BOOKS.has(r.b) && r.v > 0).slice(0, 60);
    const per = new Map();
    for (const r of rows.slice(0, 24)) {
      const book = BOOKS.get(r.b);
      let cf = null;
      const f = path.join(DATA, `confession-proofs/${r.b}/${r.c}.json`);
      if ((idxProofs.chapters[r.b] || []).includes(Number(r.c)) && existsSync(f)) cf = { index: idxProofs, chapter: json(f) };
      let v = null;
      try { v = await get(`${VERSE}/v1/verse?b=${book.lib || r.b}&c=${r.c}&v=${r.v}&limit=1`, `verse-${r.b}-${r.c}-${r.v}.json`, 24); } catch (_) { v = null; }
      per.set(`${r.b}.${r.c}.${r.v}`, { cf, works: (v && v.top_works) || [] });
    }
    const model = TS.build({ rows: rows.slice(0, 24), topicRows: t.rows || [], books: BOOKS, confessModel: VDM.parts.confessModel, read, readWork, per });
    const html = TS.render(model);
    console.log(`      Scripture tab, ${l.label}: ${model.cards.slice(0, 8).map((x) => x.ref).join(", ")}`);
    ok(model.cards.length > 0 && model.cards.every((x) => (x.confs && x.confs.chips.length) || x.works.length), `Scripture tab ${l.label}: ${model.cards.length} cards, each with at least one confession or work`);
    const ws = [...html.matchAll(/href="\/the-faith-received\/read\/\?w=([^#"&]+)/g)].map((m) => decodeURIComponent(m[1]));
    const badW = ws.filter((w) => !worksIndex.has(w) && !proofDocs.has(w));
    ok(badW.length === 0, `Scripture tab ${l.label}: all ${ws.length} reader links resolve (${[...new Set(badW)].slice(0, 3).join(", ") || "none unresolved"})`);
    const refs = [...html.matchAll(/scripture\/desk\/\?ref=([a-z0-9-]+)\.\d+\.\d+"/g)];
    ok(refs.length > 0 && refs.every((m) => BOOK_SLUGS.has(m[1])), `Scripture tab ${l.label}: ${refs.length} verse desk links name a known book`);
    const own = textOf(html.replace(/<p class="tsc-lede">[\s\S]*?<\/p>/g, ""));
    ok(!STANCE.test(own), `Scripture tab ${l.label}: no stance language in the tab's own words`);
    ok(!/—/.test(html) && !/undefined|NaN/.test(html), `Scripture tab ${l.label}: no em dash, undefined, or NaN`);
    const counts = [...html.matchAll(/Cited in ([\d,]+) confession article/g)].map((m) => Number(m[1].replace(/,/g, "")));
    ok(model.cards.every((x, i) => x.articles === counts[i]) && counts.every((n, i) => i === 0 || n <= counts[i - 1]), `Scripture tab ${l.label}: counts are the data's and the order is by article count`);
  }
}

// ── Ways into this topic: tablist semantics, and every word and link of the data still there ──
if (JSDOM && live) {
  for (const id of ["de-ecclesia", "de-justificatione", "de-trinitate"]) {
    const l = LOCI.get(id);
    let d = null;
    for (const slug of [l.t2, ...(l.aliases || [])]) {
      try { const x = await get(`${LIB}/v1/enrich/topics/${encodeURIComponent(slug.toLowerCase())}.json`, `enrich-${slug}.json`); if (x && ((x.guide && (x.guide.course || []).length) || (x.traditions || []).length)) { d = x; break; } } catch (_) { /* next */ }
    }
    if (!d) { console.log(`skip  ways-in ${id}: no enrich file`); continue; }
    const dom = new JSDOM(`<!doctype html><html><body><div data-td-root><div data-td-main></div></div></body></html>`, { url: `https://mereorthodoxy.com/the-faith-received/topics/?t=${id}`, runScripts: "outside-only", pretendToBeVisual: true });
    const { window } = dom;
    window.console = { log() {}, info() {}, warn() {}, error() {} };
    window.fetch = async (u) => {
      const url = new URL(String(u), "https://mereorthodoxy.com");
      if (url.pathname.startsWith("/assets/data/faith-received/loci.json")) return new window.Response(readFileSync(path.join(DATA, "loci.json"), "utf8"), { status: 200 });
      if (url.pathname.includes("/v1/enrich/topics/")) return new window.Response(JSON.stringify(d), { status: 200 });
      return new window.Response("{}", { status: 404 });
    };
    for (const k of ["Response", "URL", "URLSearchParams"]) if (!window[k]) window[k] = globalThis[k];
    window.eval(readFileSync(path.join(root, "assets/js/page/faith-port-topic-dev-notes.js"), "utf8"));
    const doc = window.document;
    const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 50)); } return false; };
    await until(() => doc.querySelector(".fr-dn-tab"), 5000);
    const tabs = [...doc.querySelectorAll(".fr-dn-tab")];
    ok(Boolean(doc.querySelector('[role="tablist"]')) && tabs.length >= 2 && tabs.every((t) => t.getAttribute("role") === "tab") && tabs.filter((t) => t.getAttribute("aria-selected") === "true").length === 1 && Boolean(doc.querySelector('[role="tabpanel"][aria-labelledby]')), `ways-in ${id}: a real tablist (tablist, ${tabs.length} tabs, one selected, a labeled tabpanel)`);
    const norm = (t) => t.replace(/\s+/g, " ").trim();
    const views = { course: [], traditions: [], concepts: [] };
    ((d.guide && d.guide.course) || []).forEach((c) => views.course.push(c.why, c.thesis, c.t, c.a || c.author));
    (d.traditions || []).forEach((p) => views.traditions.push(p.x, p.y, p.summary, p.agree, p.differ));
    (d.concepts || []).forEach((c) => views.concepts.push(c.label, c.gloss));
    for (const t of tabs) {
      t.dispatchEvent(new window.Event("click", { bubbles: true }));
      const text = norm(doc.querySelector(".fr-dn-view").textContent);
      const want = (views[t.dataset.frView] || []).filter(Boolean).map(norm);
      const missing = want.filter((w) => !text.includes(w));
      ok(missing.length === 0 && text.length > 0, `ways-in ${id}: the ${t.dataset.frView} tab keeps every sentence of its data (${want.length} strings; missing: ${missing.slice(0, 1).join("") || "none"})`);
      const hrefs = [...doc.querySelectorAll(".fr-dn-view a")].map((a) => a.getAttribute("href"));
      const refs = t.dataset.frView === "course" ? ((d.guide && d.guide.course) || []).length : t.dataset.frView === "traditions" ? (d.traditions || []).reduce((n, p) => n + (p.agree_refs || []).slice(0, 6).length + (p.differ_refs || []).slice(0, 6).length, 0) : 0;
      ok(hrefs.length >= refs && hrefs.every((h) => /^\/the-faith-received\/read\/\?w=/.test(h)), `ways-in ${id}: the ${t.dataset.frView} tab keeps its ${refs} reader links`);
    }
    tabs[0].focus();
    tabs[0].dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    ok(doc.activeElement === tabs[1] && tabs[1].getAttribute("aria-selected") === "true" && tabs[0].getAttribute("tabindex") === "-1", `ways-in ${id}: the arrow key moves selection and focus`);
    window.close();
  }
}

if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log("\ntopic desk: all checks passed");
