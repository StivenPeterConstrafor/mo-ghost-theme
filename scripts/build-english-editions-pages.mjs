/*
 * English Editions -> the page-native reader's own format.
 *
 *   node scripts/build-english-editions-pages.mjs <out-dir> [slug] [--local <dir>]
 *
 * --local reads v1/mo/<slug>.json from <dir> instead of R2, so a work
 * rebuilt on disk (scripts/restructure-bcp.mjs) can be paged and checked
 * before anything is uploaded.
 *
 * WHY. /the-faith-received/read/ reads a work as v1/works/<slug>/meta.json
 * plus a page file. The 69 English Editions works exist only as
 * v1/mo/<slug>.json, a section/row shape our own reader understands, so
 * the ported reader had nothing to open and Augustine's Confessions
 * rendered an empty page. This writes the same text in the shape the
 * ported reader already reads, so no reader code changes.
 *
 * ADDITIVE ONLY. Every key written is new: v1/works/<slug>/ does not
 * exist for these slugs today. Nothing is overwritten, and the corpus
 * owner's export does not touch per-work files.
 *
 * A SECTION BECOMES A PAGE. These are born-digital English editions with
 * no printed pagination, so there is no folio to honour; the chapter is
 * the unit the text actually has, and it is what our section reader has
 * always shown. `flow: true` keeps them reading continuously rather than
 * as discrete leaves.
 *
 * A LITURGY IS SET AS A PRAYER BOOK. A work marked `liturgy: true` (the
 * 1928 BCP) carries typed rows and a three-level outline; see
 * liturgyPage() below. Every other work takes the plain path unchanged.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
const args = process.argv.slice(2);
const li = args.indexOf("--local");
const LOCAL = li >= 0 ? args.splice(li, 2)[1] : "";
const OUT = args[0] || "./out";
const ONLY = args[1] || "";

const get = async (u) => {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${r.status} ${u}`);
  return r.json();
};
const getWork = async (slug) => {
  if (LOCAL) {
    try { return JSON.parse(await readFile(path.join(LOCAL, "v1", "mo", `${slug}.json`), "utf8")); } catch (e) { if (e.code !== "ENOENT") throw e; }
  }
  return get(`${BASE}/v1/mo/${encodeURIComponent(slug)}.json`);
};

// ── The prayer book ──────────────────────────────────────────────────
// The reader's page text is markdown (reader-core.js blocks() and inl()):
// "##"/"###"/"####" heads, "| " verse lines ("|   " indents one), *italic*
// and **bold** pairs of at most 200 characters on one line. So a rubric is
// italic in chunks under that limit, the people's part is bold, and
// psalms, canticles and versicles are verse lines.
const noStop = (t) => t.replace(/\.\s*$/, "");
const plain = (t) => (t.match(/\*/g) || []).length >= 2 ? t.replace(/\*/g, "∗") : t;
function italic(t) {
  if (t.includes("*")) return t;
  const parts = t.split(/(?<=[.;:,)])\s+/), out = [];
  let cur = "";
  for (const p of parts) {
    if (cur && (cur + " " + p).length > 190) { out.push(cur); cur = p; } else cur = cur ? cur + " " + p : p;
  }
  if (cur) out.push(cur);
  return out.flatMap((c) => {
    if (c.length <= 190) return [c];
    const w = c.split(" "), o = []; let s = "";
    for (const x of w) { if (s && (s + " " + x).length > 190) { o.push(s); s = x; } else s = s ? s + " " + x : x; }
    if (s) o.push(s);
    return o;
  }).map((c) => `*${c}*`).join(" ");
}
const bold = (t) => (t.length <= 200 && !t.includes("*")) ? `**${t}**` : t;
const LEAD_LABEL = /^(Antiphon|Minister|Answer|People|Priest|Bishop|Question|Catechist)\.\s+/;
function spoken(line) {
  const people = line.who === "people" || line.who === "all";
  const text = people ? bold(line.text) : plain(line.text);
  return (line.label ? `*${line.label}* ` : "") + text;
}
function liturgyRow(r) {
  switch (r.kind) {
    case "heading": return `#### ${noStop(r.en)}`;
    case "rubric": return italic(r.en);
    case "verse": {
      const lines = r.en.split("\n").map(plain);
      return lines.length > 1 ? lines.map((l) => `| ${l}`).join("\n") : lines[0];
    }
    case "dialogue": {
      const L = r.lines || [{ text: r.en, who: null }];
      // Short exchanges are set line by line; long question and answer
      // (the catechisms) as paragraphs, each with its speaker.
      if (L.length > 1 && L.every((x) => x.text.length <= 240)) {
        return L.map((x) => (x.who === "people" && !x.label ? "|   " : "| ") + spoken(x)).join("\n");
      }
      return L.map(spoken).join("\n\n");
    }
    default: {
      const m = r.en.match(LEAD_LABEL);
      return m ? `*${m[1]}.* ${plain(r.en.slice(m[0].length))}` : plain(r.en);
    }
  }
}
function liturgyPages(src) {
  const pages = [], structure = [];
  let part = null;
  (src.sections || []).forEach((s, i) => {
    const n = i + 1, head = [];
    if (s.part !== part) {
      part = s.part;
      head.push(`## ${s.part}`);
      if (s.part_sub) head.push(italic(s.part_sub));
      structure.push({ title: s.part, page: n, depth: 1, navDepthExact: true });
    }
    if (s.depth === 2) {
      head.push(`### ${s.title}`);
      structure.push({ title: s.title, page: n, depth: 2, navDepthExact: true });
    }
    for (const r of s.rows || []) if (r.kind === "heading" && r.toc) structure.push({ title: noStop(r.en), page: n, depth: 3, navDepthExact: true });
    const en = [...head, ...(s.rows || []).map(liturgyRow)].filter(Boolean).join("\n\n");
    const title = s.depth === 2 ? s.title : s.part;
    pages.push({ n, la: "", en, title, loc: s.depth === 2 ? `${s.part_short || s.part} · ${s.title}` : (s.part_short || s.part) });
  });
  return { pages, structure };
}

const idx = await get(`${BASE}/v1/mo/index.json`);
let works = idx.works || [];
if (ONLY) works = works.filter((w) => String(w.slug) === ONLY);
console.log(`English Editions: ${works.length} work(s)`);

let pagesTotal = 0;
for (const w of works) {
  const slug = String(w.slug);
  const src = await getWork(slug);
  const sections = src.sections || [];

  let pages = [];
  let structure = [];
  if (src.liturgy === true) ({ pages, structure } = liturgyPages(src));
  else sections.forEach((s, i) => {
    const n = i + 1;
    const title = (s.title || "").trim();
    // Rows carry the prose. `kind` distinguishes body from heads and
    // notes upstream; the reader wants one markdown blob per page, and a
    // head is already expressed by the section title above it.
    const body = (s.rows || [])
      .map((r) => String(r.en || "").trim())
      .filter(Boolean)
      .join("\n\n");
    const sub = (s.subtitle || "").trim();
    const en = [title ? `### ${title}` : "", sub ? `*${sub}*` : "", body]
      .filter(Boolean).join("\n\n");
    if (!en) return;
    pages.push({ n, la: "", en, title, loc: title });
    if (title) structure.push({ title, page: n, depth: 1 });
  });
  if (!pages.length) { console.log(`  skip (no text): ${slug}`); continue; }

  const meta = {
    v: 1,
    slug,
    title: src.title || w.title || slug,
    author: (src.author || w.author || "").trim(),
    volume: src.eyebrow || w.eyebrow || "",
    tradition: src.tradition || w.tradition || "",
    group: src.tradition || w.tradition || "",
    n_pages: pages.length,
    has_pages: false,
    en_only: true,
    flow: true,
    spine_nav: true,
    title_page: 0,
    single: "work.json",
    structure,
  };
  if (src.liturgy === true) meta.liturgy = true;

  const dir = path.join(OUT, "v1", "works", slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "meta.json"), JSON.stringify(meta));
  await writeFile(path.join(dir, "work.json"), JSON.stringify({ pages }));
  pagesTotal += pages.length;
  console.log(`  ${slug}: ${pages.length} pages`);
}
console.log(`done: ${pagesTotal} pages total`);
