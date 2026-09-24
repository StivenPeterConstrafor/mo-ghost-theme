#!/usr/bin/env node
/*
 * Topics for the curated creeds, confessions and catechisms, read off the
 * documents' OWN article, chapter and question headings.
 *
 * The Research panel's "Topics in this work" reads `topics` from
 * v1/mine/work/<slug>.json. For the Migne, EEBO and confessions corpora an
 * LLM miner wrote those: paraphrased positions filed under a closed list of
 * loci. It never ran over the curated `mo` set (see build-curated-research.mjs),
 * so the Belgic, the Heidelberg and the rest said "no topic entries".
 *
 * WHAT THIS PRODUCES. Each topic entry is one of the site's registry topic
 * labels (v1/mine/topic2-all/index.json, the same labels the mined files use)
 * and the list of pages -- one article or question each -- filed under it.
 *   { t, n, pos: [], pp: [page...], src: "heading", ph: { page: heading } }
 * `pos` is always empty: positions are mined statements and nothing here
 * mined any. `ph` carries the heading the document itself prints on that
 * page ("Q. 60 · How are you righteous before God?") so the panel can show
 * it as the location. The file is marked `topics_src: "headings"`.
 *
 * HOW PAGES ARE FILED. By hand, per work, in MAPS below: every article and
 * question was read and filed under the loci its heading (and, for the
 * three-clause creeds, the clause's own words) names. Topic keys follow the
 * /topics-dev/ loci (assets/data/faith-received/loci.json), so Adoption files
 * under Justification and Assurance under Faith, as they do there. A page the
 * map leaves out fails the build; nothing is filed by guesswork.
 *
 * SCRIPTURE. When a work has no overview yet, `books` is built with the same
 * extractRefs walk build-curated-research.mjs uses. When one exists, its
 * books/ncit/np are kept exactly.
 *
 * REFUSES to replace mined topics: a work whose overview already carries
 * non-heading topics is skipped.
 *
 *   node scripts/build-heading-topics.mjs [--only belgic,heidelberg] [--out DIR]
 *
 * Writes files for upload to LIBRARY (mo-tfr-library) under v1/mine/work/.
 * It does not upload.
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { extractRefs } from "./build-scripture-index.mjs";

const BASE = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
// The library worker 403s non-browser user agents.
const UA = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" };

const args = process.argv.slice(2);
const argOf = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const OUT = argOf("--out", "build/heading-topics");
const ONLY = (argOf("--only", "") || "").split(",").map((s) => s.trim()).filter(Boolean);

async function get(url) {
  const r = await fetch(url, { headers: UA });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

/* ── Registry labels: must exist in topic2-all or the build stops ───── */
const T = {
  method: "Prolegomena / Theological Method", scripture: "Scripture", god: "God",
  existence: "The Existence of God", attributes: "The Divine Attributes & their Distinction",
  trinity: "The Trinity", predestination: "Predestination", creation: "Creation",
  angels: "Angels", providence: "Providence", man: "Man / Anthropology",
  freewill: "Free Will", sin: "Sin", covenant: "Covenant", law: "The Law",
  gospel: "The Gospel", christ: "Christ / Christology", spirit: "The Holy Spirit",
  grace: "Grace", faith: "Faith", repentance: "Repentance", justification: "Justification",
  sanctification: "Sanctification", liberty: "Christian Liberty", church: "The Church",
  sacraments: "Sacraments", baptism: "Baptism", supper: "The Lord's Supper",
  magistrate: "The Civil Magistrate", worship: "Religion / True Worship",
  virtues: "Virtues / Moral Theology", prayer: "Prayer", marriage: "Marriage",
  last: "Last Things", resurrection: "Resurrection", life: "Eternal Life",
};

/* ── Hand-filed pages. "a-b": "key key" covers pages a..b inclusive. ── */
const MAPS = {
  belgic: {
    "1": "god", "2": "method scripture", "3-7": "scripture", "8-9": "trinity",
    "10": "christ trinity", "11": "spirit trinity", "12": "creation", "13": "providence",
    "14": "man sin freewill", "15": "sin", "16": "predestination", "17-21": "christ",
    "22": "justification faith", "23": "justification", "24": "sanctification", "25": "law",
    "26": "christ", "27-32": "church", "33": "sacraments", "34": "baptism", "35": "supper",
    "36": "magistrate", "37": "last",
  },
  // Lord's Day heading pages and their questions, 1-181.
  heidelberg: {
    "1-2": "christ faith", "3": "sin grace sanctification", "4": "sin", "5": "sin law",
    "6": "law", "7": "sin law", "8": "sin", "9": "creation man", "10": "sin",
    "11": "sin freewill grace", "12": "attributes sin", "13": "law sin", "14": "attributes sin",
    "15": "attributes", "16-17": "christ", "18": "sin christ", "19-24": "christ", "25": "gospel",
    "26": "faith", "27": "faith christ", "28-30": "faith", "31-33": "trinity",
    "34": "god creation", "35": "god creation providence", "36-37": "providence",
    "38": "creation providence", "39-43": "christ", "44": "christ faith", "45": "christ",
    "46": "christ justification", "47-57": "christ", "58": "christ last",
    "59": "christ sanctification", "60": "christ", "61-62": "christ resurrection",
    "63-70": "christ", "71": "christ last", "72-73": "spirit", "74-76": "church",
    "77": "justification", "78": "life", "79": "resurrection", "80": "life",
    "81-84": "justification faith", "85": "justification sanctification",
    "86-87": "justification", "88": "sanctification", "89": "sacraments",
    "90": "faith spirit sacraments", "91": "sacraments", "92": "sacraments christ",
    "93": "sacraments", "94-100": "baptism", "101": "baptism covenant", "102-111": "supper",
    "112": "supper church", "113-114": "church", "115": "church gospel", "116": "church",
    "117-118": "sanctification", "119": "sanctification repentance", "120-123": "repentance",
    "124": "sanctification law", "125-127": "law", "128": "law worship", "129": "worship law",
    "130-136": "law worship", "137-139": "worship", "140-141": "law worship",
    "142-147": "law virtues", "148-150": "law marriage", "151-155": "law virtues",
    "156-157": "law", "158-159": "law sanctification", "160-181": "prayer",
  },
  "westminster-shorter": {
    "1": "man", "2-3": "scripture", "4": "god attributes", "5": "god", "6": "trinity",
    "7": "predestination", "8": "predestination creation providence", "9": "creation",
    "10": "creation man", "11": "providence", "12": "providence covenant", "13": "sin",
    "14": "sin law", "15-18": "sin", "19": "sin last", "20": "predestination covenant",
    "21-28": "christ", "29": "christ spirit", "30": "spirit grace", "31": "grace",
    "32": "grace justification sanctification", "33-34": "justification", "35": "sanctification",
    "36": "faith sanctification", "37": "last life", "38": "resurrection last life",
    "39-44": "law", "45-62": "law worship", "63-69": "law virtues", "70-72": "law marriage",
    "73-81": "law virtues", "82": "law sin", "83": "sin law", "84": "sin last",
    "85": "faith repentance", "86": "faith christ", "87": "repentance",
    "88": "scripture sacraments prayer", "89-90": "scripture", "91-93": "sacraments",
    "94-95": "baptism", "96-97": "supper", "98-107": "prayer",
  },
  "westminster-larger": {
    "1": "man god", "2": "existence", "3-5": "scripture", "6": "scripture god",
    "7": "god attributes", "8": "god", "9-11": "trinity", "12": "predestination",
    "13": "predestination angels", "14": "predestination creation providence", "15": "creation",
    "16": "creation angels", "17": "creation man", "18": "providence", "19": "providence angels",
    "20": "providence covenant man", "21-23": "sin", "24": "sin law", "25-28": "sin",
    "29": "sin last", "30-31": "covenant grace", "32": "covenant grace faith", "33-35": "covenant",
    "36-51": "christ", "52": "christ resurrection", "53-55": "christ", "56": "christ last",
    "57": "christ", "58": "christ spirit", "59": "christ predestination",
    "60": "gospel predestination", "61": "church gospel", "62-64": "church",
    "65": "church christ", "66": "spirit christ", "67": "grace", "68": "grace predestination",
    "69": "grace justification sanctification", "70-71": "justification",
    "72-73": "faith justification", "74": "justification", "75": "sanctification",
    "76": "repentance", "77": "justification sanctification", "78-79": "sanctification",
    "80-81": "faith", "82-83": "life", "84-85": "last", "86": "last life", "87": "resurrection",
    "88-89": "last", "90": "last life", "91-100": "law", "101-121": "law worship",
    "122-136": "law virtues", "137-139": "law marriage", "140-148": "law virtues",
    "149": "law sin", "150-151": "sin law", "152": "sin last", "153": "faith repentance",
    "154": "scripture sacraments prayer", "155-157": "scripture", "158-159": "scripture church",
    "160": "scripture", "161-164": "sacraments", "165-167": "baptism", "168-172": "supper",
    "173": "supper church", "174-175": "supper", "176-177": "sacraments baptism supper",
    "178-179": "prayer", "180-181": "prayer christ", "182": "prayer spirit", "183-196": "prayer",
  },
  augsburg: {
    "1": "church magistrate", "2": "god trinity", "3": "sin", "4": "christ",
    "5": "justification faith", "6": "church gospel", "7": "sanctification", "8-9": "church",
    "10": "baptism", "11": "supper", "12-13": "repentance", "14": "sacraments faith",
    "15": "church", "16": "church worship", "17": "magistrate", "18": "christ last",
    "19": "freewill", "20": "sin", "21": "sanctification faith", "22": "worship", "23": "supper",
    "24": "marriage church", "25": "supper", "26": "repentance", "27": "liberty",
    "28": "worship virtues", "29": "church magistrate", "30": "church",
  },
  "1689": {
    "1": "scripture", "2": "god trinity", "3": "predestination", "4": "creation",
    "5": "providence", "6": "sin", "7": "covenant", "8": "christ", "9": "freewill",
    "10": "grace", "11-12": "justification", "13": "sanctification", "14": "faith",
    "15": "repentance", "16-17": "sanctification", "18": "faith", "19": "law", "20": "gospel",
    "21": "liberty", "22-23": "worship", "24": "magistrate", "25": "marriage", "26-27": "church",
    "28": "sacraments baptism supper", "29": "baptism", "30": "supper",
    "31": "last resurrection", "32": "last",
  },
  // Page 1 is Schaff's introductory note, not an article, and is filed
  // under nothing on purpose. Perseverance files under Sanctification as
  // in the 1689; the Sabbath under worship, as the 1689's chapter 22.
  "new-hampshire-confession": {
    "1": "", "2": "scripture", "3": "god trinity", "4": "man sin", "5": "grace christ",
    "6": "justification", "7": "gospel", "8": "grace spirit", "9": "repentance faith",
    "10": "predestination", "11-12": "sanctification", "13": "law gospel", "14": "church",
    "15": "sacraments baptism supper", "16": "worship", "17": "magistrate",
    "18": "justification last", "19": "last resurrection life",
  },
  "thirty-nine-articles": {
    "1": "trinity god", "2-3": "christ", "4": "christ resurrection", "5": "spirit",
    "6": "scripture", "7": "scripture law", "8": "method", "9": "sin", "10": "freewill",
    "11": "justification faith", "12": "sanctification", "13": "justification grace",
    "14": "justification", "15": "christ sin", "16": "sin repentance", "17": "predestination",
    "18": "christ", "19-21": "church", "22": "last worship", "23": "church", "24": "worship",
    "25": "sacraments", "26": "sacraments church", "27": "baptism", "28-30": "supper",
    "31": "christ supper", "32": "marriage church", "33": "church", "34": "church worship",
    "35-36": "church", "37": "magistrate", "38": "virtues", "39": "worship",
  },
  lausanne: {
    "1": "church", "2": "god providence", "3": "scripture", "4": "christ", "5": "gospel",
    "6": "virtues", "7": "church gospel", "8-9": "church", "10": "gospel",
    "11": "gospel church", "12": "church", "13": "angels", "14": "magistrate church",
    "15": "spirit", "16": "christ last", "17": "gospel",
  },
  // Creeds: filed by what each clause says, since the headings are only
  // "God the Father" / "Jesus Christ" / "The Holy Spirit".
  "apostles-creed": {
    "1": "god creation", "2": "christ last",
    "3": "spirit church justification resurrection life",
  },
  "nicene-creed": {
    "1": "god creation", "2": "christ trinity last",
    "3": "spirit trinity church baptism resurrection life",
  },
  athanasian: { "1-2": "trinity", "3": "christ last resurrection life" },
  chalcedonian: { "1-4": "christ" },
};

/* A mined edition of the same text in the confessions collection. The
 * panel links to it; its page splits differ, so its topics are NOT copied. */
const TWINS = {
  belgic: "rc-057-belgic-confession-1561",
  heidelberg: "rc-061-heidelberg-catechism-1563",
  "thirty-nine-articles": "rc-060-thirty-nine-articles-1562",
  "westminster-larger": "rc-114-westminster-larger-catechism-1647",
  "westminster-shorter": "rc-115-westminster-shorter-catechism-1647",
  augsburg: "lc-002-augsburg-confession-1530",
  "1689": "rc-126-london-baptist-confession-1677",
  "apostles-creed": "lc-001-three-ecumenical-creeds",
  "nicene-creed": "lc-001-three-ecumenical-creeds",
  athanasian: "lc-001-three-ecumenical-creeds",
  chalcedonian: "cf-025-council-of-chalcedon-451",
};

function expand(map) {
  const out = new Map();
  for (const [range, keys] of Object.entries(map)) {
    const [a, b = a] = range.split("-").map(Number);
    for (let n = a; n <= b; n += 1) {
      if (out.has(n)) throw new Error(`page ${n} filed twice`);
      out.set(n, keys.split(/\s+/).filter(Boolean));
    }
  }
  return out;
}

/* The number the document prints under its heading: "*Article XXII*",
 * "*Q. 60*", "*Lord's Day 23*", "*Chapter XI*", or a bare "*III*". */
function numberLabel(page) {
  const m = String(page.en || "").match(/\*\s*(Article|Chapter|Q\.|Lord['’]s Day|Preface)?\s*([IVXLC]+|\d+)?\s*\*/);
  if (!m || (!m[1] && !m[2])) return "";
  if (m[1] === "Preface") return "Preface · ";
  const word = m[1] === "Article" ? "Art." : m[1] ? m[1].replace("’", "'") : "";
  return `${[word, m[2]].filter(Boolean).join(" ")} · `;
}

/* Same walk as build-curated-research.mjs's booksFor(). */
const display = (canon) => String(canon).split(/[\s_-]+/)
  .map((w) => (/^[ivx]+$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
function booksFor(pages) {
  const segments = pages.map((p) => ({ text: p.en || "", en: p.en || "", loc: p.n })).filter((s) => s.text);
  const byBook = new Map();
  for (const [key, hit] of extractRefs(segments)) {
    const [canon, chapter] = String(key).split("|");
    const ch = Number(chapter);
    if (!canon || !Number.isFinite(ch)) continue;
    if (!byBook.has(canon)) byBook.set(canon, { rows: [], chapters: new Map() });
    const e = byBook.get(canon);
    const verses = [...(hit.verses || new Map()).entries()];
    if (verses.length) for (const [v, loc] of verses) e.rows.push({ c: ch, v: Number(v), ...(loc == null ? {} : { p: loc }), how: "explicit" });
    else e.rows.push({ c: ch, ...(hit.loc == null ? {} : { p: hit.loc }), how: "explicit" });
    e.chapters.set(ch, (e.chapters.get(ch) || 0) + (hit.n || 1));
  }
  return [...byBook.entries()].map(([canon, e]) => ({
    b: display(canon), name: display(canon),
    n: [...e.chapters.values()].reduce((a, b) => a + b, 0),
    chs: [...e.chapters.entries()].sort((a, b) => a[0] - b[0]),
    rows: e.rows.sort((a, b) => a.c - b.c || (a.v || 0) - (b.v || 0)),
  })).sort((a, b) => b.n - a.n);
}

/* ── Main ───────────────────────────────────────────────────────────── */
const registry = await get(`${BASE}/v1/mine/topic2-all/index.json`);
const known = new Set((registry?.topics || []).map((t) => t.t));
for (const [k, label] of Object.entries(T)) if (!known.has(label)) throw new Error(`"${label}" (${k}) is not a registry topic`);
const mo = await get(`${BASE}/v1/mo/index.json`);
const meta = new Map((mo?.works || []).map((w) => [w.slug, w]));
const confessions = await get(`${BASE}/v1/confessions-index.json`);
const twinTitle = new Map((confessions?.confessions || []).map((c) => [c.slug, c.title]));

await mkdir(OUT, { recursive: true });
const slugs = ONLY.length ? ONLY : Object.keys(MAPS);
for (const slug of slugs) {
  if (!MAPS[slug]) throw new Error(`no map for ${slug}`);
  const doc = await get(`${BASE}/v1/works/${slug}/work.json`);
  if (!doc) throw new Error(`no work.json for ${slug}`);
  const prior = await get(`${BASE}/v1/mine/work/${encodeURIComponent(slug)}.json`);
  if (prior?.topics?.length && prior.topics_src !== "headings") { console.log(`  SKIP ${slug}: carries ${prior.topics.length} mined topics`); continue; }

  const pages = doc.pages || [];
  const map = expand(MAPS[slug]);
  const unfiled = pages.filter((p) => !map.has(p.n)).map((p) => p.n);
  const extra = [...map.keys()].filter((n) => !pages.some((p) => p.n === n));
  if (unfiled.length || extra.length) throw new Error(`${slug}: unfiled pages ${unfiled.join(",") || "-"}; map names missing pages ${extra.join(",") || "-"}`);

  const by = new Map();
  const review = [];
  for (const p of pages) {
    const keys = map.get(p.n);
    for (const k of keys) if (!T[k]) throw new Error(`${slug} p${p.n}: unknown key ${k}`);
    const heading = `${numberLabel(p)}${String(p.title || "").trim()}`.slice(0, 160);
    review.push(`${String(p.n).padStart(4)}  ${keys.map((k) => T[k]).join(" + ").padEnd(60)}  ${heading}`);
    for (const k of keys) {
      if (!by.has(T[k])) by.set(T[k], { pp: [], ph: {} });
      const e = by.get(T[k]);
      e.pp.push(p.n);
      e.ph[p.n] = heading;
    }
  }
  const topics = [...by.entries()]
    .map(([t, e]) => ({ t, n: e.pp.length, pos: [], pp: e.pp, src: "heading", ph: e.ph }))
    .sort((a, b) => b.n - a.n || a.pp[0] - b.pp[0]);

  const w = meta.get(slug) || {};
  let base = prior;
  if (!base) {
    const books = booksFor(pages);
    base = { w: slug, t: w.title || "", a: w.author || "", np: pages.length, ncit: books.reduce((a, b) => a + b.n, 0), books };
  }
  const twin = TWINS[slug];
  const out = {
    ...base,
    topics,
    topics_src: "headings",
    ...(twin && twinTitle.has(twin) ? { twin: { w: twin, t: twinTitle.get(twin) } } : {}),
  };
  await writeFile(path.join(OUT, `${slug}.json`), JSON.stringify(out), "utf8");
  await writeFile(path.join(OUT, `${slug}.review.txt`), review.join("\n") + "\n", "utf8");
  console.log(`  ok   ${slug.padEnd(22)} ${String(pages.length).padStart(4)} pages  ${String(topics.length).padStart(3)} topics  ${String(out.books.length).padStart(3)} books  ${prior ? "(overview existed: books kept)" : "(new overview)"}${out.twin ? "  twin " + twin : ""}`);
}
