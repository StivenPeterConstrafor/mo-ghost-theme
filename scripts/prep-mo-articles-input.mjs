// One-off preparation of scripts/mo-articles-input.json (2026-10-20). Not part of the build chain: it reads the
// catalogue folder produced by the MO article scan (review.csv, matches.json, articles.jsonl, mo-articles.draft.json,
// docs.json) and the library's works-index.json, and writes the small checked-in input the build script reads.
//
//   node scripts/prep-mo-articles-input.mjs <catalogue-dir> <works-index.json>
//
// Nothing of an article's body is kept except a 240-character excerpt and up to 12 TF-IDF keywords.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [dir, worksPath] = process.argv.slice(2);
if (!dir || !worksPath) { console.error("usage: prep-mo-articles-input.mjs <catalogue-dir> <works-index.json>"); process.exit(2); }

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] || ""])));
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", mdash: "—", ndash: "–", hellip: "…" };
const plain = (html) => String(html || "")
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? " ")
  .replace(/\s+/g, " ").trim();

const excerptOf = (text, max = 240) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  return `${cut.slice(0, at > 120 ? at : max).replace(/[\s,;:.\-–—]+$/, "")}…`;
};

const fold = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const STOP = new Set(("a about above across after again against all almost also although always am among an and another any are around as at away back be " +
  "because been before being between both but by can cannot could did do does doing done down during each either else even ever every few for from further get " +
  "gets got had has have having he her here hers herself him himself his how however i if in into is it its itself just know like made make makes many may me " +
  "might more most much must my myself never no nor not now of off often on once one only or other others our ours out over own per perhaps quite rather said " +
  "same say says see seems she should since so some such than that the their theirs them themselves then there these they this those though through thus to " +
  "too toward towards under until up upon us use used uses using very was way we well were what when where whether which while who whom whose why will with " +
  "within without would yet you your yours don doesn isn aren wasn weren won wouldn couldn shouldn didn hasn haven hadn ain ").split(/\s+/).filter(Boolean));
const tokens = (s) => (fold(s).match(/[a-z]{3,}/g) || []).filter((t) => !STOP.has(t));

// ── corpus: document frequency over all posts ──
const lines = fs.readFileSync(path.join(dir, "articles.jsonl"), "utf8").split("\n").filter(Boolean);
const df = new Map();
const bodyById = new Map();
for (const line of lines) {
  const a = JSON.parse(line);
  const text = plain(a.body);
  const toks = tokens(text);
  for (const t of new Set(toks)) df.set(t, (df.get(t) || 0) + 1);
  bodyById.set(a.id, { text, toks });
}
const N = lines.length;

const rows = parseCsv(fs.readFileSync(path.join(dir, "review.csv"), "utf8"));
const matches = readJson(path.join(dir, "matches.json"));
const draft = readJson(path.join(dir, "mo-articles.draft.json"));
const docsMeta = readJson(path.join(dir, "docs.json")).docs;
const works = readJson(worksPath).works;
const workBySlug = new Map(works.map((w) => [w.slug, w]));

const invert = (m) => {
  const out = new Map();
  for (const [k, ids] of Object.entries(m)) for (const id of ids) { if (!out.has(id)) out.set(id, []); out.get(id).push(k); }
  return out;
};
const byWork = invert(draft.works), byAuthor = invert(draft.authors), byDoc = invert(draft.docs), byTopic = invert(draft.topics), byVerse = invert(draft.verses);

// "romans.8" stays; verse keys of one chapter collapse into ranges: romans.8.28-30, romans.8.35
const compressVerses = (keys) => {
  const chapters = new Set(), verses = new Map();
  for (const k of keys) {
    const m = /^(.+)\.(\d+)(?:\.(\d+))?$/.exec(k);
    if (!m) continue;
    if (!m[3]) { chapters.add(`${m[1]}.${m[2]}`); continue; }
    const ch = `${m[1]}.${m[2]}`;
    if (!verses.has(ch)) verses.set(ch, []);
    verses.get(ch).push(+m[3]);
  }
  const out = [...chapters];
  for (const [ch, vs] of verses) {
    vs.sort((a, b) => a - b);
    let i = 0;
    while (i < vs.length) {
      let j = i;
      while (j + 1 < vs.length && vs[j + 1] === vs[j] + 1) j++;
      out.push(j > i ? `${ch}.${vs[i]}-${vs[j]}` : `${ch}.${vs[i]}`);
      i = j + 1;
    }
  }
  return out;
};

const articles = [];
const workTitles = {}, docLabels = {}, authorWorks = {};
for (const r of rows) {
  const m = matches[r.id];
  const b = bodyById.get(r.id);
  if (!m || !b) throw new Error(`no match or body for ${r.id}`);
  const tf = new Map();
  for (const t of b.toks) tf.set(t, (tf.get(t) || 0) + 1);
  const titleToks = new Set(tokens(r.title));
  const scored = [];
  for (const [t, c] of tf) {
    const d = df.get(t);
    if (d < 2 || d > N * 0.15 || titleToks.has(t) || c < 2) continue;
    scored.push([t, (1 + Math.log(c)) * Math.log(N / d)]);
  }
  scored.sort((a, b2) => b2[1] - a[1] || (a[0] < b2[0] ? -1 : 1));
  const about = [];
  const w = byWork.get(r.id) || [];
  const au = byAuthor.get(r.id) || [];
  const dc = byDoc.get(r.id) || [];
  const tp = (byTopic.get(r.id) || []);
  for (const a of m.authors || []) if (au.includes(a.name) && (a.in_title || a.in_heading || a.conf === "high")) about.push(`author:${a.name}`);
  for (const x of m.works || []) for (const s of [...(x.public_slugs || []), ...(x.slugs || [])]) if (w.includes(s) && (x.in_title || x.in_heading || x.conf === "high")) about.push(`work:${s}`);
  for (const x of m.creed || []) if (dc.includes(x.slug) && (x.about || x.conf === "high")) about.push(`doc:${x.slug}`);
  for (const x of m.topics || []) if (tp.includes(x.id) && (x.in_title || x.in_heading || x.conf === "high")) about.push(`topic:${x.id}`);
  const vkeys = byVerse.get(r.id) || [];
  for (const x of m.scripture || []) if (x.in_title || x.in_heading || x.conf === "high") about.push(`verse:${x.ref}`);
  for (const s of w) if (!workBySlug.has(s)) console.warn(`work slug not in works index: ${s}`);
  for (const s of w) { const x = workBySlug.get(s); if (x) workTitles[s] = x.title; }
  for (const s of dc) docLabels[s] = docsMeta[s]?.label || s;
  for (const a of au) authorWorks[a] = works.filter((x) => (Array.isArray(x.author) ? x.author : [x.author]).includes(a)).length;
  articles.push({
    id: r.id, title: r.title, url: r.url, date: r.date, byline: r.byline, class: r.class, confidence: r.confidence,
    works: w, authors: au, docs: dc, verses: compressVerses(vkeys), topics: tp.filter((t) => !["catechisms", "confessions", "councils", "creeds", "retrieval"].includes(t)),
    retrieval: Boolean(m.retrieval && (m.retrieval.conf === "high" || m.retrieval.conf === "medium")),
    reason: r.reason, about, excerpt: excerptOf(b.text), keywords: scored.slice(0, 12).map((x) => x[0]),
  });
}
articles.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? -1 : 1));

const out = {
  v: 1,
  generated: "2026-10-20",
  note: "Input to scripts/build-mo-articles.mjs. Prepared by scripts/prep-mo-articles-input.mjs from the 2026-10-20 MO article scan; Ian approved all 493 rows. Excerpts are the first 240 characters of each article; keywords are TF-IDF over 5,084 posts. No other body text is kept.",
  corpus: N,
  worksIndexGenerated: readJson(worksPath).generated,
  workTitles, docLabels, authorWorks,
  articles,
};
fs.writeFileSync(path.join(ROOT, "scripts", "mo-articles-input.json"), `${JSON.stringify(out, null, 1)}\n`);
console.log(`wrote ${articles.length} articles`);
