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
 *   - RELEVANCE (2026-10-20), for the eight marquee topics (Trinity, Justification, Christ and the Atonement, Baptism, Predestination,
 *     the Church, Scripture, the Lord's Supper): every shown article is about its topic (its title or text names it, Predestination
 *     through the Topics page's own predestinationArticle), no document or work on the deny list of known bad picks is shown, every
 *     vetted pick in the marquee file resolved, every work and document resolves, the early-church column and "the earliest
 *     treatments" hold nothing dated after 1054 and are in date order, every key verse is cited by two or more of the topic's articles,
 *     the Christ desk carries passion texts, and no Orthodox column or Cyril Lukaris count appears. It prints what each column shows.
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
  const locus = { id: "x", label: "God", t2: "x", children: [] };
  const empty = D.buildDeskModel({ locus, part: { n: "I", label: "X" }, topic: null, conf: null, scr: null, treat: [], data: {}, books: BOOKS, loci: LOCI, principal: {} });
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
    principal: { lu: ["lc-1"], rf: ["rc-1"], an: ["rc-2"] }, vettedOnly: false, // the generic rules are tested; production passes nothing and so shows only vetted topics
    marquee: { dek: "A dek.", fault: { question: "Q?", rows: [{ church: "Lutheran", doc: "d", w: "lc-1", p: 1, quote: "a sentence the article does not contain" }, { church: "Reformed", doc: "d", w: "rc-1", p: 1, quote: "one God" }, { church: "Anglican", doc: "d", w: "rc-2", p: 1, quote: "one God" }] } },
  });
  const cols = (m.modules.traditions || { columns: [] }).columns.map((c) => c.id);
  ok(cols.includes("lu") && cols.includes("rf") && cols.includes("an"), `synthetic: columns are the churches of the documents (${cols})`);
  ok(!cols.includes("or"), "synthetic: no Orthodox column without a mapped Orthodox document");
  ok(JSON.stringify(m.modules.traditions.columns).indexOf("Waldensian") === -1, "synthetic: a Waldensian document is not filed under a church that is not its own");
  ok(m.modules.traditions.withheld.some((x) => /Waldensian/.test(x.label)), "synthetic: a document no column takes in is named, not counted");
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
  const blocks = [["light", /\.td-desk \.tdk-cent \{\s*(--cn-bg[^}]*)\}/], ["dark (attribute)", /html\[data-sd-theme="dark"\] \.td-desk \.tdk-cent \{\s*([^}]*)\}/]];
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  for (const f of ["topic-desk.css", "topic-ways-in.css"]) ok(!/prefers-color-scheme/.test(readFileSync(path.join(root, "assets/css", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "")), `light only: ${f} does not read the system color scheme`);
  const tabCss = readFileSync(path.join(root, "assets/css/topic-desk.css"), "utf8");
  const tabRules = [...tabCss.matchAll(/\.td-desk \.tdk-tab(?::[a-z-]+|\[[^\]]+\])? \{([^}]*)\}/g)].map((m) => m[1]);
  ok(tabRules.length >= 3 && tabRules.every((r) => !/(^|;)\s*background:(?!\s*none)/.test(r) && !/border-radius:\s*[1-9]/.test(r) && !/(^|;)\s*border:\s*1px/.test(r)), "the section tabs are plain labels: no box, no fill, no rounded segment");
  ok(/\.tdk-tab\[aria-selected="true"\][^}]*border-bottom-color:\s*var\(--cn-accent\)/.test(tabCss), "the active tab is underlined in the accent");
  ok(!/tdk-period-btn|Read this period/.test(tabCss + readFileSync(path.join(root, "assets/js/page/topic-desk-model.js"), "utf8")), "no 'Read this period' button remains");
  const waysCss = readFileSync(path.join(root, "assets/css/topic-ways-in.css"), "utf8");
  const wnBlocks = [["ways-in light", /\.fr-dn \{\s*(--wn-bg[^}]*)\}/], ["ways-in dark (attribute)", /html\[data-sd-theme="dark"\] \.fr-dn \{\s*([^}]*)\}/]];
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
let libAuthors = null;
if (live) {
  try { const wi = await get(`${LIB}/v1/works-index.json`, "works-index.json", 24); worksIndex = new Set(wi.works.map((w) => w.slug)); libAuthors = new Set(wi.works.map((w) => w.author)); } catch (e) { console.log(`skip  live checks: the library is not reachable (${e.message})`); live = false; }
}

const DEBUG = process.env.DEBUG_STANCE;
const STANCE = /\b(hold|holds|held|holding|teach|teaches|taught|deny|denies|denied|affirm|affirms|affirmed|reject|rejects|rejected|believe|believes|believed|maintain|maintains|maintained|dissent|dissents|heresy|heretic|heretical|heterodox|Sabellian\w*|Arian\w*|Nestorian\w*|orthodox view|wrong|error)\b/i;
const BRITISH = /\b(colour|honour|favour|centre|defence|organis|neighbour|judgement|labour|grey|programme)\w*/i;

const TOPICS = [
  ["The Trinity", "de-trinitate"], ["Justification", "de-justificatione"], ["Atonement (the locus The Person and Work of Christ)", "de-christo"],
  ["Baptism", "de-baptismo"], ["Predestination", "de-praedestinatione"], ["The Church", "de-ecclesia"], ["Scripture", "de-scriptura"],
  ["The Lord's Supper", "de-coena"], ["Providence", "de-providentia"], ["An obscure topic (Relations and Persons)", "de-relationibus"],
];

// The page's own predestinationArticle (topics-dev.js), read from the file and run, so the check cannot drift from the page.
const predestinationArticle = (() => {
  const src = readFileSync(path.join(root, "assets/js/page/topics-dev.js"), "utf8");
  const a = src.indexOf("const PREDESTINATION_TERMS");
  const b = src.indexOf("const relevantSections");
  return new Function("state", `${src.slice(a, b)}; return predestinationArticle;`)({ id: "de-praedestinatione" });
})();

// The eight marquee topics the relevance test covers, and the known bad picks the independent review found (2026-10-20).
const MARQUEE_ALL = new Set(Object.entries(marqueeFile.topics).filter(([, v]) => v.articles || v.works).map(([k]) => k));
const MARQUEE8 = ["de-trinitate", "de-justificatione", "de-christo", "de-baptismo", "de-praedestinatione", "de-ecclesia", "de-scriptura", "de-coena"];
const DENY_WORK = [
  ["luther-wa-schriften-12", 16, "Leisnig ordinance, not a treatment of the Trinity"], ["pld-359", null, "Ambrose, On the Duties of Ministers"],
  ["pld-2824", 1443, "Augustine, Tractates on John, for Scripture"], ["pld-5581", null, "Jerome, Apology against Rufinus"],
  ["duns-scotus-in-librum-primum-sententiarum", null, "Scotus on enjoying versus using, for the Trinity"],
  ["albertus-magnus-albert-the-great-commentaries-on-the-four-books-of-the-sentences", 520, "Albert on miraculous works, for Justification"],
  ["eebo-44393", null, "Stillingfleet, the Trinity and Transubstantiation compared"], ["pld-7607", null, "Lombard (1136), after the early church"], ["pld-436", null, "Anselm (1073), after the early church"],
];
const DENY_WORK_PREFIX = ["davenant-treatise-on-justification-vol-2"]; // Justification's own treatise is vol-1; vol 2 stood in for four other topics
const DENY_ARTICLE = [
  ["cf-094-julius-iii-1550-1555", /Difference Between/i, "Trent on Penance, under Baptism"], ["cf-013-council-of-nicea-i-325", /Baptism of Heretics/i, "Nicaea canon on the Cathari, under Baptism"],
  ["rc-113-benjamin-coxs-baptist-appendix-1646", null, "a title-page quotation"], ["rc-127-baptist-catechism-1693", /^Q\. 28\./, "Christ's priestly office, under the Church"],
  ["lc-006-small-catechism-1529", /For Bishops|What the Hearers Owe/i, "a table of duties, under the Church"], ["cf-060-lateran-council-1102", null, "a fragment"], ["cf-061-council-of-guastalla-1106", null, "a fragment"],
  ["rc-001-sixty-seven-articles-of-huldryc-zwingli-1523", null, "Zwingli on remission of sin, under Justification"], ["rc-005-william-farels-summary-1529", null, "Farel on merit, under Justification"],
  ["rc-009-zwingli-fidei-expositio-1531", null, "Zwingli's Exposition, under the Lord's Supper"], ["rc-007-tetrapolitan-confession-1530", null, "the Tetrapolitan Confession, under the Lord's Supper"],
];
const PASSION = ["isaiah.53", "i-peter.2.24", "galatians.3.13", "ii-corinthians.5.21", "romans.3.25", "hebrews.9.14", "john.3.16", "philippians.2.8", "i-corinthians.15.3", "romans.5.8", "i-john.2.2", "hebrews.2.17"];

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
    const conf2 = { ...conf, articles: (conf.articles || []).filter((a) => id !== "de-praedestinatione" || predestinationArticle(a)), timeline: conf.timeline || [] };
    let hist = null;
    for (const slug of [l.t2, ...(l.aliases || [])]) {
      let d = null;
      try { d = await get(`${LIB}/v1/enrich/topics/${encodeURIComponent(slug.toLowerCase())}.json`, `enrich-${slug}.json`); } catch (_) { d = null; }
      if (d && d.guide && (d.guide.history || []).length) { hist = d.guide; break; }
    }
    const model = D.buildDeskModel({
      locus: l, part: hit.part, parent: hit.parent, topic, conf: conf2, scr, treat: treatments[id] || [], data: deskData, marquee: marqueeFile.topics[id] || null,
      books: BOOKS, loci: LOCI, bodyOf: () => "", history: hist, principal: marqueeFile.principal,
    });
    const out = D.renderDesk(model);
    // The History summaries are the page's existing machine-written text, relocated unchanged: counted above, not judged here.
    const html = (out.hero + out.body).replace(/<div class="tdk-period"[\s\S]*?<\/div>/g, "").replace(/<p class="tdk-lede tdk-hist-lede">[\s\S]*?<\/p>/g, "");
    seenTiers.add(model.tier);
    const present = Object.entries(model.modules).filter(([k, v]) => k !== "hero" && v).map(([k]) => k);
    console.log(`      ${name}: tier ${model.tier}; modules ${present.join(", ") || "none"}; omitted ${model.omitted.map((o) => o.module).join(", ") || "none"}`);

    // 1. no empty module, minimums met
    const sections = [...out.body.matchAll(/<section class="tdk-mod[^"]*" id="tdk-([a-z]+)"[^>]*>([\s\S]*?)<\/section>/g)];
    ok(sections.length === present.length, `${name}: the page draws exactly the modules the model holds (${sections.length})`);
    const need = { traditions: ['<article class="tdk-card"', D.MIN.columns], treatments: ["<li><a class=\"tw\"", D.MIN.treatments], chron: ['<li class="tdk-row', D.MIN.ruler], verses: ['<li class="tdk-verse"', D.MIN.verses],
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
      const periodsIn = [...sect.matchAll(/data-period="(\d+)"/g)].map((m) => Number(m[1]));
      const rowCs = [...sect.matchAll(/class="tdk-row[^"]*" data-c="(\d+)"/g)].map((m) => Number(m[1]));
      let want = 0;
      let loose = 0;
      hist.history.forEach((h) => {
        const nums = (h.period.match(/\d+/g) || []).map(Number);
        const cov = rowCs.filter((c) => nums[0] && c >= nums[0] && c <= (nums[1] || nums[0])).length;
        if (cov) want += cov; else { want += 1; loose += 1; }
      });
      ok(periodsIn.length === want && new Set(periodsIn).size === hist.history.length, `${name}: all ${hist.history.length} History periods appear under every century row they cover (${want} places, ${loose} under Other periods)`);
      const covers = hist.history.filter((h) => { const n = (h.period.match(/\d+/g) || []).map(Number); return n[1] > n[0]; }).length;
      ok((sect.match(/class="tdk-small tdk-covers"/g) || []).length >= covers, `${name}: a period that spans centuries says which it covers`);
      ok(hist.history.every((h, i) => !h.refs.length || (sect.match(new RegExp(`id="tdk-pd-${i}-notes"`, "g")) || []).length === 1), `${name}: each period's notes list appears once`);
      const toggles = [...sect.matchAll(/<button type="button" class="tdk-row-h" aria-expanded="false" aria-controls="(tdk-pn-\d+)"/g)].map((m) => m[1]);
      ok(toggles.length > 0 && toggles.every((id) => sect.includes(`id="${id}" hidden`)), `${name}: every century toggle is a button with aria-expanded and aria-controls to a hidden panel (${toggles.length})`);
      ok(!/<button[^>]*class="tdk-row-h"[^>]*>[\s\S]*?<\/button>/.test(sect.replace(/<button type="button" class="tdk-row-h"[\s\S]*?<\/button>/g, "")) , `${name}: no stray toggle`);
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
    const confDocsAll = confDocs;
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

    // 5. RELEVANCE (the eight marquee topics): what each column shows, and that it is about the topic
    if (MARQUEE8.includes(id)) {
      const T = D.topicTerms(l, marqueeFile.topics[id]);
      const arts = conf2.articles;
      const trad = model.modules.traditions;
      ok(Boolean(trad) && trad.columns.length >= 3, `${name}: relevance: the church columns are on (${trad ? trad.columns.length : 0} columns)`);
      ok(model.omitted.every((o) => o.module !== "vetted-pick"), `${name}: relevance: every vetted pick in the marquee file resolved (${model.omitted.filter((o) => o.module === "vetted-pick").map((o) => o.reason).join("; ") || "none"})`);
      ok(model.modules.treatments && model.modules.verses && model.modules.path, `${name}: relevance: classic works, key verses, and the reading path are on`);
      const lines = [];
      for (const c of (trad ? trad.columns : [])) {
        lines.push(`        ${c.name}`);
        for (const q of c.quotes) {
          const art = arts.find((a) => a.w === q.w && (a.article_display || a.article || "").replace(/\s*—\s*/g, ": ") === q.article);
          lines.push(`          article  ${q.year || "undated"}  ${q.doc}, ${q.article.slice(0, 50)}`);
          ok(Boolean(art), `${name}: ${c.name}: ${q.doc} resolves to a mapped article`);
          ok(Boolean(art) && T.lead.test(`${q.article} ${art.text}`), `${name}: ${c.name}: ${q.doc}, ${q.article.slice(0, 40)}: the article's title or text names the topic`);
          ok(T.lead.test(`${q.article} ${q.text}`), `${name}: ${c.name}: ${q.doc}: the words shown name the topic`);
          ok(q.text.length >= 60, `${name}: ${c.name}: ${q.doc}: a full statement, not a fragment`);
          if (id === "de-praedestinatione") ok(Boolean(art) && predestinationArticle(art), `${name}: ${c.name}: ${q.doc}: passes the Topics page's predestinationArticle`);
          const bad = DENY_ARTICLE.find(([w, re]) => w === q.w && (!re || re.test(q.article)));
          ok(!bad, `${name}: ${c.name}: ${q.doc}: not on the deny list${bad ? ` (${bad[2]})` : ""}`);
          ok(confDocsAll.has(q.w), `${name}: ${c.name}: confession id ${q.w} resolves`);
          if (c.id === "early") ok(q.year === 0 || q.year < D.EARLY_END, `${name}: early column: ${q.doc} is dated before 1054`);
        }
        for (const w of c.works) {
          lines.push(`          work     ${w.y || "undated"}  ${w.author}, ${w.title.slice(0, 44)}`);
          const bad = DENY_WORK.find(([slug, p]) => slug === w.w && (p == null || p === Number(w.p))) || (DENY_WORK_PREFIX.some((x) => w.w.startsWith(x)) ? ["", 0, "Davenant vol 2"] : null);
          ok(!bad, `${name}: ${c.name}: ${w.author}, ${w.title.slice(0, 30)}: not on the deny list${bad ? ` (${bad[2]})` : ""}`);
          ok(worksIndex.has(w.w), `${name}: ${c.name}: work ${w.w} is in the live works index`);
          const entry = (treatments[id] || []).find((e) => e.w === w.w);
          ok(Boolean(entry) && D.workAbout(entry, T), `${name}: ${c.name}: ${w.author}: a treatments.json entry whose title or section heading names the topic`);
          if (c.id === "early") ok(Number(w.y) > 0 && Number(w.y) <= D.EARLY_END, `${name}: early column: ${w.author} (${w.y}) is dated 1054 or earlier`);
        }
        if (c.id === "early") {
          const ys = c.quotes.map((q) => q.year || 9999);
          const ws = c.works.map((w) => Number(w.y) || 9999);
          ok(ys.every((y, i) => i === 0 || y >= ys[i - 1]) && ws.every((y, i) => i === 0 || y >= ws[i - 1]), `${name}: early column: articles and works are in date order`);
        }
      }
      // the classic works module holds only works that pass the same rule
      const tw = model.modules.treatments ? model.modules.treatments.groups.flatMap((g) => g.rows) : [];
      ok(tw.every((r) => { const e = (treatments[id] || []).find((x) => x.w === r.w); return e && D.workAbout(e, T) && !DENY_WORK.some(([slug, p]) => slug === r.w && (p == null || p === Number(r.p))); }), `${name}: classic works: all ${tw.length} pass the title-or-heading rule and none is on the deny list`);
      // "the earliest treatments" step
      const src = model.modules.path ? model.modules.path.steps.find((st) => st.name === "To the sources") : null;
      if (src) {
        const ys = src.items.map((it) => Number(((treatments[id] || []).find((e) => e.w === it.w) || {}).y));
        ok(ys.every((y) => y > 0 && y <= D.EARLY_END) && ys.every((y, i) => i === 0 || y >= ys[i - 1]), `${name}: the earliest treatments are dated 1054 or earlier, oldest first (${ys.join(", ")})`);
        lines.push(`        earliest treatments: ${src.items.map((it) => it.title).join("; ")}`);
      }
      // key verses: each cited by two or more of the topic's own articles
      const aboutArts = arts.filter((a) => D.articleAbout(a, T, id));
      const nCite = (b, c, v) => aboutArts.filter((a) => (a.scripture || []).some((r) => r.b === b && r.c === c && v >= r.v && v <= (r.v2 || r.v))).length;
      const vitems = model.modules.verses ? model.modules.verses.items : [];
      const vrefs = vitems.map((x) => x.href.split("ref=")[1]);
      ok(vrefs.length >= 5 && vrefs.every((r) => { const [b, c, v] = r.split("."); const key = [...BOOKS.entries()].find(([, o]) => o.slug === b); return key && nCite(key[0], Number(c), Number(v)) >= 2; }), `${name}: key verses: all ${vrefs.length} are cited by two or more of the topic's articles`);
      lines.push(`        key verses: ${vitems.map((x) => x.ref).join(", ")}`);
      if (id === "de-christo") ok(PASSION.filter((r) => vrefs.some((v) => v.startsWith(r))).length >= 2, `${name}: key verses include passion and atonement texts (${PASSION.filter((r) => vrefs.some((v) => v.startsWith(r))).join(", ")})`);
      // churches: no Orthodox column, no Lukaris counted, the notice once
      ok(!trad.columns.some((c) => c.id === "or"), `${name}: no Orthodox column`);
      const trHtml = out.body.split('id="tdk-traditions"')[1].split("</section>")[0];
      ok((trHtml.match(/maps no Orthodox document/g) || []).length === 1, `${name}: the missing Orthodox document is stated once`);
      ok(!trad.columns.some((c) => c.quotes.some((q) => /lukar/i.test(q.w))), `${name}: Cyril Lukaris is not counted in any column`);
      // the fault-line: the Trinity and the Filioque only
      ok(Boolean(trad.fault) === (id === "de-trinitate"), `${name}: the fault-line row is drawn for the Trinity and not for other topics`);
      if (trad.fault) {
        ok(/appears only in the 381 text above/.test(trHtml), `${name}: the fault-line carries the line about the Eastern view`);
        ok(vitems.every((x) => !/i-john\.5\.7/.test(x.href)) || /few late Greek manuscripts/.test(out.body), `${name}: the 1 John 5:7 note mentions the late Greek manuscripts`);
      }
      // quotations are whole sentences; the early column holds no undated entry
      for (const c of trad.columns) for (const q of c.quotes) {
        ok(/^["\u201c\u2018]?[A-Z0-9]/.test(q.text) && /[.!?]["\u201d\u2019)\]]?$/.test(q.text) && !/^\u2026/.test(q.text), `${name}: ${c.name}: ${q.doc}: the quotation starts at a sentence start and ends at a sentence end`);
        if (c.id === "early") ok(q.year > 0, `${name}: early column: ${q.doc} is dated`);
      }
      if (id === "de-coena") ok(trad.columns.find((c) => c.id === "rf").quotes.some((q) => /Heidelberg/.test(q.doc) && /feeds and nourishes my soul/.test(q.text)), `${name}: the Heidelberg quotation is complete, through "feeds and nourishes my soul"`);
      if (trad.lukaris) ok(/Cyril Lukaris \(1629\) is listed separately; it is not counted under Reformed/.test(trHtml), `${name}: the Lukaris note is printed where he is mapped`);
      // LINK LANDING: every vetted work link opens on the discussion, not a contents page, an index, or a preface
      const pins = Object.values((marqueeFile.topics[id] || {}).works || {}).flat();
      let landed = 0; let unchecked = 0;
      for (const pin of pins) {
        const e = (treatments[id] || []).find((x) => x.w === pin.w);
        const pg = Number(pin.at != null ? pin.at : (e && e.p));
        let m;
        try { m = await get(`${LIB}/v1/works/${pin.w}/meta.json`, `meta-${pin.w}.json`, 24 * 7); } catch (_) { m = null; }
        const shards = m && m.shards && m.shards.length ? m.shards : null;
        if (!shards) { unchecked += 1; continue; }
        const pageText = async (n) => {
          const sh = shards.find((x) => n >= x.from && n <= x.to);
          if (!sh) return "";
          const d = await get(`${LIB}/v1/works/${pin.w}/${sh.file}`, `shard-${pin.w}-${sh.file.replace(/\W/g, "_")}.json`, 24 * 7);
          const row = (d.pages || []).find((r) => r.n === n);
          return row ? String(row.en || row.la || "").replace(/\s+/g, " ") : "";
        };
        const here = await pageText(pg);
        const text = `${here} ${await pageText(pg + 1)}`;
        const head = here.slice(0, 200);
        const words = here.split(/\s+/).filter(Boolean).length || 1;
        const nums = (here.match(/\b\d{1,4}\b/g) || []).length;
        const looksLikeFront = /^\W*(?:table of )?contents\b|^\W*index\b|^\W*preface\b|^\W*to the reader|^\W*praefatio|^\W*dedicat|\.{5,}/i.test(head) || (nums / words > 0.2 && words > 40) || (here.match(/\.{4,}/g) || []).length > 3;
        const T2 = D.topicTerms(l, marqueeFile.topics[id]);
        const good = !looksLikeFront && T2.title.test(text) && here.length > 300;
        ok(good, `${name}: link landing: ${pin.w} p.${pg} opens on text that names the topic and is not a contents page, index, or preface${good ? "" : ` (${here.slice(0, 90)})`}`);
        if (good) landed += 1;
      }
      console.log(`      ${name}: ${landed} work links verified by page text, ${unchecked} not checkable here (no page shards, e.g. EEBO texts)`);
      console.log(`      ${name}, what each column shows:\n${lines.join("\n")}`);
    }
  }
  ok(seenTiers.has("marquee") && (seenTiers.has("full") || seenTiers.has("thin")), `tiers seen: ${[...seenTiers].join(", ")}`);

  // the trinity fault-line row verified against the live articles
  const t = await get(`${VERSE}/v1/topic/confessions?id=de-trinitate&limit=500`, "conf-de-trinitate.json");
  const tm = D.buildDeskModel({ locus: LOCI.get("de-trinitate"), part: INDEX.get("de-trinitate").part, topic: await get(`${VERSE}/v1/topic?id=de-trinitate&t2=the-trinity`, "topic-de-trinitate.json"), conf: t, scr: null, treat: [], data: deskData, marquee: marqueeFile.topics["de-trinitate"], books: BOOKS, loci: LOCI, principal: marqueeFile.principal });
  ok(!tm.omitted.some((o) => o.module === "fault-line"), "the Trinity's fault-line row verifies all six quotations against the live articles");
  ok(Object.entries(D.MODULES_ON).every(([k, on]) => on || [tm.modules[k === "chron" ? "chron" : k]].every((v) => v === null)), "a module switched off in MODULES_ON is omitted whole");

  // every locus builds without throwing and without an empty module
  let built = 0;
  for (const [id, hit] of INDEX) {
    const l = hit.locus;
    const [topic, conf, scr] = await Promise.all([get(`${VERSE}/v1/topic?id=${id}&t2=${l.t2}`, `topic-${id}.json`), get(`${VERSE}/v1/topic/confessions?id=${id}&limit=500`, `conf-${id}.json`), get(`${VERSE}/v1/topic/scripture?id=${id}&t2=${l.t2}&limit=60`, `scr-${id}.json`)]);
    const model = D.buildDeskModel({ locus: l, part: hit.part, parent: hit.parent, topic, conf, scr, treat: treatments[id] || [], data: deskData, marquee: marqueeFile.topics[id] || null, books: BOOKS, loci: LOCI, principal: marqueeFile.principal });
    const out = D.renderDesk(model);
    const html = out.hero + out.body;
    const empties = [...out.body.matchAll(/<section class="tdk-mod[^"]*" id="tdk-([a-z]+)"[^>]*>([\s\S]*?)<\/section>/g)].filter(([, , inner]) => !/<li|<article|<tr/.test(inner));
    if (!MARQUEE_ALL.has(id)) {
      const m = model.modules;
      if (m.traditions || m.treatments || m.verses || m.path) ok(false, `${id}: a non-marquee topic shows a module that has not been hand-vetted`);
    }
    if (empties.length || /undefined|NaN/.test(html)) ok(false, `${id}: an empty module or an undefined value was drawn`);
    built += 1;
  }
  ok(MARQUEE8.every((k) => MARQUEE_ALL.has(k)) && MARQUEE_ALL.size === MARQUEE8.length, `scope: exactly the eight marquee topics are hand-vetted (${[...MARQUEE_ALL].join(", ")})`);
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
  ok(good.hero && good.desk >= 6 && good.has, `glue: the desk draws its hero and its modules (${good.desk})`);
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
    const cards = html.split('<li class="tsc-card"').slice(1);
    const dupWord = cards.some((cd) => [...cd.matchAll(/<li><a href="[^"]+">(?:<b>[^<]*<\/b> )?([^<]*)/g)].some((m) => /\b([A-Za-z]{4,}) \1\b/.test(m[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "))));
    ok(!dupWord && !/<b>([^<]+)<\/b> \1\b/.test(html), `Scripture tab ${l.label}: no repeated-word label ("Waldensian Waldensian")`);
    const sameRows = cards.some((cd) => { const rows = [...cd.matchAll(/<ul class="tsc-chips">([\s\S]*?)<\/ul>/g)].flatMap((m) => [...m[1].matchAll(/<li><a href="[^"]+">([\s\S]*?)<\/a>/g)].map((x) => x[1].replace(/<[^>]+>/g, "").trim())); return new Set(rows).size !== rows.length; });
    ok(!sameRows, `Scripture tab ${l.label}: no two rows in a card read the same (repeats are one row with "N places")`);
    ok(cards.every((cd) => /class="tsc-text" data-tsc-vk="[a-z0-9-]+\|\d+\|\d+\|\d+" hidden/.test(cd)) && html.indexOf('class="tsc-text"') < html.indexOf('class="tsc-row"'), `Scripture tab ${l.label}: every card has a verse-text slot above its confessions row`);
    const counts = [...html.matchAll(/Cited in ([\d,]+) confession article/g)].map((m) => Number(m[1].replace(/,/g, "")));
    ok(model.cards.every((x, i) => x.articles === counts[i]) && counts.every((n, i) => i === 0 || n <= counts[i - 1]), `Scripture tab ${l.label}: counts are the data's and the order is by article count`);
  }
}

// ── Key works under each century: eight topics, printed and checked ──
if (live) {
  const K = require(path.join(root, "assets/js/page/topic-key-works.js"));
  for (const id of ["de-trinitate", "de-justificatione", "de-christo", "de-baptismo", "de-praedestinatione", "de-ecclesia", "de-scriptura", "de-coena"]) {
    const l = LOCI.get(id);
    const topic = await get(`${VERSE}/v1/topic?id=${id}&t2=${l.t2}`, `topic-${id}.json`);
    const map = K.buildKeyWorks({ locus: l, treat: treatments[id] || [], works: topic.works || [], authors: topic.authors || [], pins: (marqueeFile.topics[id] && marqueeFile.topics[id].works) || null });
    const rows = [...map.entries()].sort((a, b) => a[0] - b[0]);
    console.log(`      Key works, ${l.label}:`);
    rows.forEach(([c, list]) => console.log(`        ${c}: ${list.map((w) => `${w.author}, ${w.title.slice(0, 44)}`).join(" | ")}`));
    const flat = rows.flatMap(([, list]) => list);
    const names = K.namer(l);
    const treatKey = new Set((treatments[id] || []).map((e) => e.w));
    const byW = new Map((topic.works || []).map((w) => [w.w, w]));
    ok(flat.length > 0 && flat.every((w) => worksIndex.has(w.w)), `Key works ${l.label}: ${flat.length} rows in ${rows.length} centuries, every slug is in the works index`);
    ok(new Set(flat.map((w) => w.w)).size === flat.length, `Key works ${l.label}: each work stands in exactly one century`);
    ok(rows.every(([, list]) => list.length <= K.PER_CENTURY), `Key works ${l.label}: at most ${K.PER_CENTURY} to a century`);
    const pins = new Set(Object.values((marqueeFile.topics[id] && marqueeFile.topics[id].works) || {}).flatMap((v) => v.map((x) => `${x.w}|${x.p}`)));
    ok(flat.every((w) => w.src === "treatment" ? pins.has(`${w.w}|${w.p}`) : (byW.get(w.w) || {}).secs.some((sc) => names.strong(sc.t))), `Key works ${l.label}: each row is a hand-vetted pick or a work with a section heading that is about the topic`);
    ok(flat.filter((w) => w.src === "trace").every((w) => K.treatise(w.title)), `Key works ${l.label}: no collection, history, commentary, or general-works title among the filler`);
    const BAD = [/Twelve Minor Prophets/i, /decretals/i, /Councils/i, /Constanzer/i, /Duties of Ministers/i, /Hexa[eë]meron/i, /Acts of the Council/i, /Handbuch/i, /Moral Theology/i, /Complete Works/i, /^Works$/i, /Trinity and Transubstantiation/i];
    ok(flat.every((w) => !BAD.some((re) => re.test(w.title))), `Key works ${l.label}: none of the titles the owner named as wrong`);
    ok(flat.every((w) => !K.denied(id, w.w, w.title, w.author)), `Key works ${l.label}: no deny-listed work`);
    ok(rows.every(([c, list]) => list.every((w) => w.cen === c)), `Key works ${l.label}: each work is in the century of its own date`);
    ok(flat.every((w) => w.src === "treatment" ? treatKey.has(w.w) : (byW.get(w.w) || {}).weight >= K.MIN_WEIGHT), `Key works ${l.label}: classic treatments or works with at least ${K.MIN_WEIGHT} passages`);
  }
  ok(K.buildKeyWorks({ locus: LOCI.get("de-providentia"), treat: treatments["de-providentia"] || [], works: [], authors: [], pins: null }).size === 0, "a topic the marquee file has not vetted gets no key works");
  ok(K.denied("de-trinitate", "x", "The Trinity and Transubstantiation Compared", "Stillingfleet") && K.denied("de-coena", "pld-359", "De officiis", "Ambrose") && K.denied("de-trinitate", "luther-wa-schriften-12", "x", "Luther"), "the deny list catches the picks the owner named");
}

// ── Verse text on the cards: a stubbed Scripture page, a range, a failure ──
if (JSDOM) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="host"></div></body></html>`, { url: "https://mereorthodoxy.com/", runScripts: "outside-only" });
  const { window } = dom;
  const calls = [];
  const verses = { 1: "In the beginning, God created the heavens and the earth.", 2: "The earth was without form and void.", 3: "And God said, Let there be light." };
  const node = () => { const d = window.document.createElement("div"); Object.entries(verses).forEach(([n, t]) => { const sp = window.document.createElement("span"); sp.className = "bible-verse"; sp.dataset.v = n; sp.textContent = `${n} ${t}`; d.appendChild(sp); }); return d; };
  window.MOScriptureDev = {
    BOOKS: [{ lib: "genesis", slug: "genesis", name: "Genesis", chapters: 50 }, { lib: "john", slug: "john", name: "John", chapters: 21 }], recalledTranslation: () => "ESV", translationInfo: () => ({ short: "ESV" }), textShort: () => "ESV",
    chapterNode: (code, book, c) => { calls.push(`${code}|${book.lib}|${c}`); return book.lib === "john" ? Promise.reject(new Error("down")) : Promise.resolve(node()); },
    verseTextFrom: (root, n) => { const el = root.querySelector(`.bible-verse[data-v="${n}"]`); return el ? el.textContent.replace(/^\d+\s*/, "").trim() : ""; },
    api: async () => ({ top_works: [{ w: "w1", t: "On the Hexameron", a: "Basil", n: 2, cen: 4, h: "/read?w=w1" }] }), sourceHref: (h) => h,
  };
  window.FRVerseDeskModel = { parts: { confessModel: () => ({ n: 1, docs: 1, groups: [{ church: "Lutheran", rows: [{ title: "Small Catechism", label: "p. 8", year: "1529", href: "/the-faith-received/read/?w=x#b8-0" }] }] }) } };
  window.Response = globalThis.Response;
  window.fetch = async () => new window.Response("{}", { status: 404 });
  window.eval(readFileSync(path.join(root, "assets/js/page/topic-scripture-tab.js"), "utf8"));
  const host = window.document.getElementById("host");
  window.document.body.appendChild(host);
  const prepared = { rows: [{ b: "genesis", c: 1, v: 1, v2: 3, n: 5 }, { b: "genesis", c: 1, v: 2, n: 4 }, { b: "john", c: 1, v: 1, n: 3 }], topicRows: [] };
  await window.MOTopicScripture.fill(host, "x", prepared);
  await new Promise((r) => setTimeout(r, 300));
  const bqs = [...host.querySelectorAll(".tsc-text")];
  ok(bqs.length === 3 && !bqs[0].hidden && bqs[0].querySelectorAll("sup").length === 3 && /Let there be light/.test(bqs[0].textContent) && bqs[0].querySelector(".tsc-tr").textContent === "ESV", "verse text: a range shows each verse with a small number and the translation label");
  ok(!bqs[1].hidden && bqs[1].querySelectorAll("sup").length === 0 && /without form/.test(bqs[1].textContent), "verse text: a single verse shows its text with no number");
  ok(calls.filter((c) => c === "ESV|genesis|1").length === 1, "verse text: one request per chapter, reused by every card in it");
  ok(bqs[2].hidden && bqs[2].textContent === "" && host.querySelectorAll(".tsc-card").length === 3, "verse text: when the text cannot load nothing extra is shown and the card stays");
  window.close();
}

// ── One About section: five tabs, one tablist, real flow in a DOM ──
if (JSDOM && live) {
  const id = "de-ecclesia";
  const l = LOCI.get(id);
  const hit = INDEX.get(id);
  const cached = (n) => json(path.join(CACHE, n));
  let enrich = null;
  for (const slug of [l.t2, ...(l.aliases || [])]) { try { const x = await get(`${LIB}/v1/enrich/topics/${encodeURIComponent(slug.toLowerCase())}.json`, `enrich-${slug}.json`); if (x && x.guide && (x.guide.history || []).length) { enrich = x; break; } } catch (_) { /* next */ } }
  if (enrich) {
    await Promise.all([get(`${VERSE}/v1/topic?id=${id}&t2=${l.t2}`, `topic-${id}.json`), get(`${VERSE}/v1/topic/confessions?id=${id}&limit=500`, `conf-${id}.json`), get(`${VERSE}/v1/topic/scripture?id=${id}&t2=${l.t2}&limit=60`, `scr-${id}.json`), get(`${VERSE}/v1/topic/confessions?id=${id}&limit=1`, `confs1-${id}.json`)]);
    const dom = new JSDOM(`<!doctype html><html><head><meta name="tfr-library-base" content="${LIB}"></head><body><main class="sd"><div class="container td-root" data-td-root><p>Loading</p></div></main></body></html>`, { url: `https://mereorthodoxy.com/the-faith-received/topics/?t=${id}`, runScripts: "outside-only", pretendToBeVisual: true });
    const { window } = dom;
    window.console = { log() {}, info() {}, warn() {}, error() {} };
    window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
    window.Element.prototype.scrollIntoView = function scrollIntoView() {};
    window.scrollTo = () => {};
    window.IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} };
    window.fetch = async (u) => {
      const url = new URL(String(u), "https://mereorthodoxy.com");
      const body = (o) => new window.Response(JSON.stringify(o), { status: 200 });
      if (url.pathname.startsWith("/assets/data/faith-received/")) { const f = path.join(DATA, url.pathname.replace("/assets/data/faith-received/", "")); return existsSync(f) ? new window.Response(readFileSync(f, "utf8"), { status: 200 }) : new window.Response("", { status: 404 }); }
      if (url.pathname === "/v1/topic") return body(cached(`topic-${id}.json`));
      if (url.pathname === "/v1/topic/confessions") return body(cached(url.searchParams.get("limit") === "1" ? `confs1-${id}.json` : `conf-${id}.json`));
      if (url.pathname === "/v1/topic/scripture") return body(cached(`scr-${id}.json`));
      if (url.pathname.includes("/v1/enrich/topics/")) return body(enrich);
      return new window.Response("{}", { status: 404 });
    };
    for (const k of ["Response", "Blob", "TextDecoder", "Uint8Array", "URL", "URLSearchParams", "CustomEvent"]) if (!window[k]) window[k] = globalThis[k];
    const ev = (f) => window.eval(readFileSync(path.join(root, f), "utf8"));
    ["assets/js/page/scripture-dev-core.js", "assets/js/page/topic-key-works.js", "assets/js/page/topic-desk-model.js", "assets/js/page/topic-desk.js", "assets/js/page/topics-dev.js", "assets/js/page/verse-desk-model.js", "assets/js/page/topic-scripture-tab.js", "assets/js/page/faith-port-topic-dev-notes.js"].forEach(ev);
    const doc = window.document;
    const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 100)); } return false; };
    await until(() => doc.querySelectorAll("[data-about-tabs] [role=tab]").length >= 4, 15000);
    const tabs = [...doc.querySelectorAll("[data-about-tabs] [role=tab]")];
    const labels = tabs.map((t) => t.textContent);
    const want = ["History", "Scripture", "A course of reading", "Traditions compared", "Concept guides"];
    ok(doc.querySelectorAll('[role="tablist"]').length === 1, "one section: exactly one tablist on the page");
    ok(JSON.stringify(labels) === JSON.stringify(want.filter((w) => labels.includes(w))) && labels[0] === "History" && labels.length >= 4, `one section: the tabs are in order (${labels.join(" | ")})`);
    ok(tabs[0].getAttribute("aria-selected") === "true" && tabs.slice(1).every((t) => t.getAttribute("aria-selected") === "false" && t.tabIndex === -1), "one section: History is the default tab, the others have tabindex -1");
    const panels = tabs.map((t) => doc.getElementById(t.getAttribute("aria-controls")));
    ok(panels.every((p) => p && p.getAttribute("role") === "tabpanel" && p.getAttribute("aria-labelledby")) && panels.slice(1).every((p) => p.hidden) && !panels[0].hidden, `one section: each tab has one labeled panel, hidden except History (${panels.length})`);
    ok(new Set(panels.map((p) => p.id)).size === panels.length, "one section: no panel appears twice");
    const heads = [...doc.querySelectorAll("h3")].map((h) => h.textContent);
    ok(heads.filter((h) => /^About /.test(h)).length === 1 && !heads.some((h) => /Ways into this topic|doctrine through the centuries/i.test(h)), `one section: one 'About' heading and no 'Ways into this topic' (${heads.filter((h) => /^About /.test(h)).join("")})`);
    tabs[0].focus();
    tabs[0].dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    ok(doc.activeElement === tabs[1] && tabs[1].getAttribute("aria-selected") === "true" && !panels[1].hidden && panels[0].hidden, "one section: the arrow key moves selection, focus, and the visible panel");
    tabs[1].dispatchEvent(new window.KeyboardEvent("keydown", { key: "End", bubbles: true }));
    ok(doc.activeElement === tabs[tabs.length - 1], "one section: End goes to the last tab");
    window.location.hash = "#about-course";
    await new Promise((r) => setTimeout(r, 300));
    const course = tabs.find((t) => t.dataset.k === "course");
    ok(course && course.getAttribute("aria-selected") === "true", "one section: #about-course opens the course tab");
    ok(Boolean(doc.getElementById("about-history")) && Boolean(doc.getElementById("tdk-chron")), "one section: the tab ids and #tdk-chron anchors exist");
    window.close();
  } else console.log("skip  one section: no enrich data for the test topic");
}

// ── Principal writers: the curated file, the row, and the Gospel regression ──
{
  const PW = require(path.join(root, "assets/js/page/topic-principal-writers.js"));
  const pw = json(path.join(DATA, "principal-writers.json"));
  const names = Object.values(pw.traditions).flat();
  ok(names.length > 30 && Boolean(pw.provenance) && /Curated by Claude/.test(pw.provenance), `principal-writers.json: ${names.length} names with provenance`);
  const rows = PW.principalRows(["Alpha", "Beta", "Gamma"], [{ a: "Gamma", s: "gamma", n: 5 }, { a: "Alpha", s: "alpha", n: 0 }, { a: "Beta", s: "beta", n: 9 }], [{ a: "Beta", w: "w1", t: "T1", weight: 5, secs: [] }, { a: "Beta", w: "w2", t: "T2", weight: 50, secs: [{ t: "On x", p: 12 }] }], 8);
  ok(rows.length === 2 && rows[0].name === "Beta" && rows[1].name === "Gamma", "principal rows: the curated order, and a writer with no passages is left out");
  ok(rows[0].href === "/the-faith-received/read/?w=w2#b12-0" && rows[1].href === "/the-faith-received/author/?a=gamma", "principal rows: the work with the most passages gives the link, at its section; no work gives the author page");
  ok(PW.principalRows(names, Array.from({ length: 30 }, (_, i) => ({ a: names[i], s: `s${i}`, n: 3 })), [], 8).length === 8, "principal rows: at most eight");
  if (live) {
    const missing = names.filter((n) => !libAuthors.has(n));
    ok(missing.length === 0, `principal-writers.json: every name is an author the library spells that way (missing: ${missing.join(", ") || "none"})`);
    const l = LOCI.get("de-evangelio");
    const t = await get(`${VERSE}/v1/topic?id=de-evangelio&t2=${l.t2}`, "topic-de-evangelio.json");
    const ref = PW.principalRows(pw.traditions.Reformed, t.authors, t.works, 8).map((r) => r.name);
    console.log(`      The Gospel, Reformed principal writers with passages: ${ref.join(", ") || "none"}`);
    const hasData = ["John Calvin", "Amandus Polanus", "Gisbertus Voetius"].filter((n) => t.authors.some((a) => a.a === n && Number(a.n) > 0));
    ok(hasData.every((n) => ref.includes(n)), `The Gospel: Calvin, Polanus, and Voetius all appear on the Reformed side when the data has passages for them (${hasData.join(", ") || "none have"})`);
    // Every comparison in every topic: after the cleaning no source token is left (the same pattern the page uses).
    let left = 0; let pairs = 0;
    const cl = (t) => String(t || "").replace(/\s*[(\[]\s*[XY]\d+(?:\s*[–—-]\s*[XY]?\d+)?(?:\s*[,;]\s*[XY]\d+(?:\s*[–—-]\s*[XY]?\d+)?)*\s*[)\]]/g, "").replace(/(^|[.!?]\s+)[XY]\d+\b/g, "$1A sampled source").replace(/\s+[XY]\d+\b/g, "");
    for (const [lid, hit] of INDEX) {
      for (const slug of [hit.locus.t2, ...(hit.locus.aliases || [])]) {
        let e = null;
        try { e = await get(`${LIB}/v1/enrich/topics/${encodeURIComponent(slug.toLowerCase())}.json`, `enrich-${slug}.json`); } catch (_) { e = null; }
        if (!e || !(e.traditions || []).length) continue;
        e.traditions.forEach((p) => { pairs += 1; ["summary", "agree", "differ"].forEach((k) => { if (/[(\[]\s*[XY]\d|\b[XY]\d+\b/.test(cl(p[k]))) left += 1; }); });
        break;
      }
    }
    ok(pairs > 100 && left === 0, `source tokens: none survive the cleaning in ${pairs} comparisons across every topic (${left} left)`);
    for (const id of ["de-trinitate", "de-justificatione", "de-christo", "de-baptismo", "de-praedestinatione", "de-ecclesia", "de-scriptura", "de-coena"]) {
      const lc = LOCI.get(id);
      const tt = await get(`${VERSE}/v1/topic?id=${id}&t2=${lc.t2}`, `topic-${id}.json`);
      const have = Object.entries(pw.traditions).map(([k, v]) => `${k}: ${PW.principalRows(v, tt.authors, tt.works, 20).map((r) => r.name).length}/${v.length}`).join("; ");
      const gaps = Object.entries(pw.traditions).flatMap(([k, v]) => v.filter((n) => !tt.authors.some((a) => a.a === n && Number(a.n) > 0)).map((n) => `${n}`)).slice(0, 6);
      console.log(`      ${lc.label}: ${have}. No passages in the top 400 for: ${gaps.join(", ") || "none"}`);
    }
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
    const topicData = await get(`${VERSE}/v1/topic?id=${id}&t2=${l.t2}`, `topic-${id}.json`);
    window.eval(readFileSync(path.join(root, "assets/js/page/topic-principal-writers.js"), "utf8"));
    window.MOTopicDeskData = { columns: [{ id: "rf", quotes: [{ doc: "Heidelberg Catechism", article: "Q. 1", year: 1563, href: "/the-faith-received/read/?w=rc-001-heidelberg" }] }, { id: "lu", quotes: [] }], topic: { authors: topicData.authors, works: topicData.works }, principal: json(path.join(DATA, "principal-writers.json")) };
    window.eval(readFileSync(path.join(root, "assets/js/page/faith-port-topic-dev-notes.js"), "utf8"));
    const doc = window.document;
    const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 50)); } return false; };
    await until(() => doc.querySelector(".fr-dn-tab"), 5000);
    const tabs = [...doc.querySelectorAll(".fr-dn-tab")];
    ok(Boolean(doc.querySelector('[role="tablist"]')) && tabs.length >= 2 && tabs.every((t) => t.getAttribute("role") === "tab") && tabs.filter((t) => t.getAttribute("aria-selected") === "true").length === 1 && Boolean(doc.querySelector('[role="tabpanel"][aria-labelledby]')), `ways-in ${id}: a real tablist (tablist, ${tabs.length} tabs, one selected, a labeled tabpanel)`);
    const norm = (t) => t.replace(/\s+/g, " ").trim();
    const views = { course: [], traditions: [], concepts: [] };
    ((d.guide && d.guide.course) || []).forEach((c) => views.course.push(c.why, c.thesis, c.t, c.a || c.author));
    const clean = (t) => String(t || "").replace(/\s*[(\[]\s*[XY]\d+(?:\s*[–—-]\s*[XY]?\d+)?(?:\s*[,;]\s*[XY]\d+(?:\s*[–—-]\s*[XY]?\d+)?)*\s*[)\]]/g, "").replace(/(^|[.!?]\s+)[XY]\d+\b/g, "$1A sampled source").replace(/\s+[XY]\d+\b/g, "").replace(/\s+([.,;:])/g, "$1");
    (d.traditions || []).forEach((p) => views.traditions.push(p.x, p.y, clean(p.summary), clean(p.agree), clean(p.differ)));
    (d.concepts || []).forEach((c) => views.concepts.push(c.label, c.gloss));
    for (const t of tabs) {
      t.dispatchEvent(new window.Event("click", { bubbles: true }));
      const text = norm(doc.querySelector(".fr-dn-view").textContent);
      const want = (views[t.dataset.frView] || []).filter(Boolean).map(norm);
      const missing = want.filter((w) => !text.includes(w));
      ok(missing.length === 0 && text.length > 0, `ways-in ${id}: the ${t.dataset.frView} tab keeps every sentence of its data (${want.length} strings; missing: ${missing.slice(0, 1).join("") || "none"})`);
      const hrefs = [...doc.querySelectorAll(".fr-dn-view a")].map((a) => a.getAttribute("href"));
      const refs = t.dataset.frView === "course" ? ((d.guide && d.guide.course) || []).length : t.dataset.frView === "traditions" ? (d.traditions || []).reduce((n, p) => n + (p.agree_refs || []).slice(0, 6).length + (p.differ_refs || []).slice(0, 6).length, 0) : 0;
      ok(hrefs.length >= refs && hrefs.every((h) => /^\/the-faith-received\/(?:read\/\?w=|author\/\?a=)/.test(h)), `ways-in ${id}: the ${t.dataset.frView} tab keeps its ${refs} reader links`);
    }
    const trad = tabs.find((t) => t.dataset.frView === "traditions");
    if (trad && (d.traditions || []).length) {
      trad.dispatchEvent(new window.Event("click", { bubbles: true }));
      const view = doc.querySelector(".fr-dn-view");
      const text = norm(view.textContent);
      ok(!/[(\[]\s*[XY]\d/.test(text) && !/\b[XY]\d+\b/.test(text), `traditions ${id}: no raw (X1, Y7) source token survives in the text`);
      const cards = [...view.querySelectorAll(".fr-dn-card")];
      ok(cards.every((c) => /Drawn from a sample of \d+ cited pages? by \d+ authors?/.test(c.textContent) && /Not every author in a tradition is represented/.test(c.textContent)), `traditions ${id}: each card says what its sample was (${cards.length} cards)`);
      const heads = [...view.querySelectorAll(".fr-dn-half")].map((h) => [...h.querySelectorAll("h5")].map((x) => x.textContent));
      ok(heads.every((h) => h.indexOf("Confessions and catechisms") < 0 || h.indexOf("Confessions and catechisms") < h.indexOf("Principal writers on this topic in the library") || h.indexOf("Principal writers on this topic in the library") < 0), `traditions ${id}: confessions come before principal writers in each half`);
      const writerNames = [...view.querySelectorAll(".fr-dn-half")].flatMap((h) => [...h.querySelectorAll(".fr-dn-row")].filter((r) => /Principal writers/.test(r.textContent)).flatMap((r) => [...r.querySelectorAll("li a")].map((a) => a.textContent)));
      const haveN = new Set(topicData.authors.filter((a) => Number(a.n) > 0).map((a) => a.a));
      ok(writerNames.every((n) => haveN.has(n)), `traditions ${id}: principal writers shown only where the topic has passages for them (${writerNames.length} names)`);
      ok(view.querySelectorAll(".fr-dn-half .fr-dn-row").length > 0 && [...view.querySelectorAll(".fr-dn-half")].every((h) => h.children.length <= 3), `traditions ${id}: halves carry rows`);
    }
    tabs[0].focus();
    tabs[0].dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    ok(doc.activeElement === tabs[1] && tabs[1].getAttribute("aria-selected") === "true" && tabs[0].getAttribute("tabindex") === "-1", `ways-in ${id}: the arrow key moves selection and focus`);
    window.close();
  }
}

if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log("\ntopic desk: all checks passed");
