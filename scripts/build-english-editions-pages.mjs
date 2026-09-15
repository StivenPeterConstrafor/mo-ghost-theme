/*
 * English Editions -> the page-native reader's own format.
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
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
const OUT = process.argv[2] || "./out";
const ONLY = process.argv[3] || "";

const get = async (u) => {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${r.status} ${u}`);
  return r.json();
};

const idx = await get(`${BASE}/v1/mo/index.json`);
let works = idx.works || [];
if (ONLY) works = works.filter((w) => String(w.slug) === ONLY);
console.log(`English Editions: ${works.length} work(s)`);

let pagesTotal = 0;
for (const w of works) {
  const slug = String(w.slug);
  const src = await get(`${BASE}/v1/mo/${encodeURIComponent(slug)}.json`);
  const sections = src.sections || [];

  const pages = [];
  const structure = [];
  sections.forEach((s, i) => {
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

  const dir = path.join(OUT, "v1", "works", slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "meta.json"), JSON.stringify(meta));
  await writeFile(path.join(dir, "work.json"), JSON.stringify({ pages }));
  pagesTotal += pages.length;
  console.log(`  ${slug}: ${pages.length} pages`);
}
console.log(`done: ${pagesTotal} pages total`);
