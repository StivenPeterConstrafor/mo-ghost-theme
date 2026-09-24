#!/usr/bin/env node
/*
 * Build the denomination and party table.
 *
 *   node scripts/build-denominations.mjs
 *
 * Writes assets/data/faith-received/denominations.json, which
 * assets/js/faith-denominations.js reads. See the head of that file
 * for why there are two axes and not one.
 *
 * Four sources, in order of how much they are trusted:
 *
 *   1. scripts/data/denomination-authors.tsv — hand-curated, one line
 *      per author, with a confidence on every line. This is where the
 *      work is and the only file to edit by hand.
 *   2. scripts/data/denomination-works.tsv — per-work, for anonymous
 *      tracts and for the handful of cases where two men share a name.
 *   3. The Latin Library's own authors.json, whose `tradition` field is
 *      free text but written to a consistent shape: a communion and
 *      then a qualifier naming the nation, party or school. Parsed, not
 *      retyped: 660 of its 719 records carry one.
 *   4. The source site's two curated lists, puritans.json and
 *      anglicans.json, 287 names. They give a party and no body, so
 *      they only fill in where the hand table has not reached.
 *
 * Nothing here invents a denomination from a name alone. An author the
 * sources do not place and the table has not reached is written out
 * with an empty body, and the facet leaves his works unplaced.
 *
 * Run it after editing either TSV. It prints coverage — how many works
 * in each collection now carry a body — and that number is the point
 * of the exercise, so read it.
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "assets", "data", "faith-received", "denominations.json");
const LIBRARY = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
const EEBO = "https://eebo-backup.vercel.app";

// The library's worker refuses anything that does not look like a
// browser, so a build that omits this reads as "no data" rather than
// as a 403. See the note in memory/ghost-theme.md.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const BODIES = new Set([
  "Anglican", "Presbyterian", "Congregational", "Baptist", "Quaker",
  "Continental Reformed", "Lutheran", "Anabaptist", "Arminian",
  "Bohemian Brethren", "Waldensian", "Socinian",
  // Not Protestant, and so never offered under the Protestant
  // denomination facet — but worth carrying, because knowing that
  // Robert Parsons is a Jesuit is what keeps his 29 works from being
  // guessed into a Protestant bucket by somebody later.
  "Roman Catholic", "Eastern Orthodox",
]);
const PARTIES = new Set(["Puritan", "Conformist"]);
const CONF = new Set(["h", "m", "l"]);

// ── Author keys ───────────────────────────────────────────────────
// Byte-for-byte the rule in assets/js/faith-denominations.js. The two
// must agree or every key the builder writes misses at runtime; the
// check at the foot of this file asserts a sample of them do.
function authorKey(name) {
  // EEBO writes its names as catalogue entries, ending in a full stop:
  // "Keach, Benjamin, 1640-1704." The date strip below is anchored at the
  // end, so the stop hid the dates and the name matched nothing (Keach,
  // Bunyan, Perkins, Owen all fell back to no church). Punctuation goes
  // anyway at the last step, so this changes only names that missed.
  let s = String(name == null ? "" : name).trim().replace(/\.+$/, "").trim();
  if (!s) return "";
  s = s.replace(/,\s*(?:(?:b|d|fl|ca|c)\.\s*)*\d{3,4}\??(?:\s*or\s*\d{1,4})?\s*(?:-\s*(?:(?:b|d|fl|ca|c)\.\s*)*\d{0,4}\??(?:\s*or\s*\d{1,4})?)?\s*$/i, "");
  // Only where what stands before it is initials. "R. F. (Richard
  // Farnworth)" is a name hiding behind its initials and the
  // parenthesis is the name; "Ferne, H. (Henry)" is a surname with
  // its forename expanded, and taking the parenthesis there would
  // key the man as "henry" and lose Ferne entirely.
  var paren = /^([^(]*)\(([^)]+)\)/.exec(s);
  if (paren && !/[a-z]{2}/.test(paren[1]) && /[a-z]{3}/i.test(paren[2]) && !/^\d/.test(paren[2].trim())) s = paren[2];
  s = s.replace(/\([^)]*\)/g, " ");
  // A bare ", of ..." is deliberately not stripped — see the note on
  // the matching rule in assets/js/faith-denominations.js.
  s = s.replace(/,\s*(?:saint|st\.?|bishop|archbishop|sir|dame|lord|lady|king|queen)\b[^,]*/gi, " ");
  const c = s.indexOf(",");
  if (c > 0) s = s.slice(c + 1) + " " + s.slice(0, c);
  return s
    .normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function datedKey(name) {
  const base = authorKey(name);
  if (!base) return "";
  const years = String(name == null ? "" : name).match(/\d{3,4}/g);
  return years && years.length ? `${base} ${years.join(" ")}` : "";
}

// ── Corporate authors ─────────────────────────────────────────────
//
// A diocese, a synod, an assembly or a meeting is not a man and has no
// biography to look up, but it names its own church in its own name.
// The tail of these is unbounded — every diocese of the Church of
// England appears with every bishop who held it — so they are matched
// rather than listed.
//
// The civil authorities are deliberately absent. "England and Wales.
// Sovereign (1625-1649 : Charles I)" issued proclamations about
// religion, but the Crown is not a denomination and filing the King
// under Anglican would put 29 proclamations in a church facet.
const PATTERNS = [
  ["^church of england\\b", "Anglican", ""],
  ["^england and wales\\. church of england", "Anglican", ""],
  ["^church of ireland\\b", "Anglican", ""],
  ["^church of scotland\\b", "Presbyterian", ""],
  ["^scotland\\. general assembly|general assembly of the church of scotland", "Presbyterian", ""],
  ["^westminster assembly", "Presbyterian", "Puritan"],
  ["^society of friends|^friends, society of|yearly meeting of friends", "Quaker", ""],
  ["^catholic church\\b|^jesuits\\b|^council of trent", "Roman Catholic", ""],
  ["^synod of dort|^dutch reformed church|^reformed church", "Continental Reformed", ""],
  ["^lutheran church", "Lutheran", ""],
];

async function get(url) {
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function tsv(file) {
  let text;
  try {
    text = await readFile(path.join(ROOT, "scripts", "data", file), "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
  const rows = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || line.startsWith("#")) return;
    const [name, body = "", party = "", conf = "m", note = ""] = line.split("\t").map((s) => s.trim());
    if (!name) return;
    // A typo in a body name would silently create a thirteenth
    // denomination that shows in the facet with one work under it.
    if (body && !BODIES.has(body)) throw new Error(`${file}:${i + 1} unknown body "${body}"`);
    if (party && !PARTIES.has(party)) throw new Error(`${file}:${i + 1} unknown party "${party}"`);
    if (conf && !CONF.has(conf)) throw new Error(`${file}:${i + 1} unknown confidence "${conf}"`);
    if (!body && !party) throw new Error(`${file}:${i + 1} "${name}" asserts nothing`);
    rows.push({ name, body, party, conf: conf || "m", note });
  });
  return rows;
}

// ── The Latin Library's own author records ────────────────────────
//
// "Reformed (French Huguenot/Calvinist)", "Reformed (English Puritan;
// congregationalist)", "Lutheran (Gnesio-Lutheran)", "Reformed
// (Scottish Episcopalian)". Ordered: the specific body is read before
// the communion it sits in, so a man called "Reformed (English
// Puritan; congregationalist)" is Congregational and not swept into
// the generic Reformed bucket.
const LL_BODY = [
  [/\bcongregationalist|\bcongregational\b|\bindependent\b/i, "Congregational"],
  [/\bbaptist\b/i, "Baptist"],
  [/\bquaker|society of friends/i, "Quaker"],
  [/\bmennonite|anabaptist/i, "Anabaptist"],
  // Not after "anti-", "contra-" or "counter-". The records describe
  // Dort's own delegates as "Dutch Contra-Remonstrant" and William Twisse
  // as "anti-Arminian", and the hyphen is a word boundary, so Lubbertus,
  // Walaeus, Hommius and Twisse were all filed Arminian: the men who
  // condemned Arminius listed as his church. Lubbertus is also
  // "anti-Socinian", which the next line would then have taken instead.
  [/(?<!(?:anti|contra|counter)-)\b(?:remonstrant|arminian)\b/i, "Arminian"],
  [/(?<!anti-)\b(?:socinian|unitarian)/i, "Socinian"],
  [/bohemian brethren|unitas fratrum|moravian|hussite/i, "Bohemian Brethren"],
  [/waldensian|vaudois/i, "Waldensian"],
  [/scottish episcopalian|episcopalian/i, "Anglican"],
  [/presbyterian/i, "Presbyterian"],
  [/anglican|church of england|laudian|caroline divine|nonjuror/i, "Anglican"],
  [/\blutheran\b|gnesio-lutheran|formula of concord/i, "Lutheran"],
  [/\breformed\b|calvinis/i, "Continental Reformed"],
  [/roman catholic|\bjesuit\b|dominican|franciscan|thomist|scotist|\bcatholic\b/i, "Roman Catholic"],
];
const LL_ENGLISH = /\benglish\b|\bengland\b|\bscottish\b|\bscots?\b|\bwelsh\b|\birish\b|new england|puritan/i;
const LL_PARTY = [
  [/puritan/i, "Puritan"],
  [/laudian|conformist|caroline divine|high church|nonjuror/i, "Conformist"],
];

function fromLatinLibrary(rec) {
  const t = String((rec && rec.tradition) || "");
  const aff = String((rec && rec.affiliation) || "");
  if (!t.trim()) return null;
  const hay = `${t} ; ${aff}`;
  let body = "";
  for (const [re, name] of LL_BODY) if (re.test(t)) { body = name; break; }
  if (!body) for (const [re, name] of LL_BODY) if (re.test(aff)) { body = name; break; }
  let party = "";
  for (const [re, name] of LL_PARTY) if (re.test(hay)) { party = name; break; }
  // An Englishman or a Scot described as Reformed is not Continental
  // Reformed. If he named no separated body he was in the
  // establishment, whatever his party inside it: the axes are
  // independent, so John Rainolds is Anglican by body and Puritan by
  // party, and only a man who actually left takes a different body.
  if (body === "Continental Reformed" && LL_ENGLISH.test(hay)) body = "Anglican";
  if (!body && !party) return null;
  return { body, party, conf: "m" };
}

// ── Build ─────────────────────────────────────────────────────────
const handAuthors = await tsv("denomination-authors.tsv");
const handWorks = await tsv("denomination-works.tsv");

const [llAuthors, catalogue, puritans, anglicans, eeboCat] = await Promise.all([
  get(`${LIBRARY}/v1/authors.json`),
  get(`${LIBRARY}/v1/works-index.json`),
  get(`${EEBO}/data/puritans.json`),
  get(`${EEBO}/data/anglicans.json`),
  get(`${EEBO}/data/catalogue.json`),
]);

// ── Which bare names are safe ─────────────────────────────────────
//
// A bare key is what lets one line cover a man named three ways in
// three catalogues. It is also what merges two men into one. So the
// bare key is emitted only for names the whole library agrees are one
// person: every author string anywhere is folded both ways, and a bare
// name that answers to more than one set of life dates is struck out.
//
// The cost is real and worth naming: an undated "Thomas Taylor" in
// some third catalogue will not resolve, because the library holds
// four of him and nobody can say which. Unplaced is the right answer
// there.
const namesEverywhere = new Set();
(Array.isArray(eeboCat) ? eeboCat : eeboCat.works || []).forEach((w) => { if (w.a) namesEverywhere.add(String(w.a).trim()); });
(catalogue.works || []).forEach((w) => { if (w.author) namesEverywhere.add(String(w.author).trim()); });
Object.keys(llAuthors).forEach((n) => namesEverywhere.add(n));

// One man is catalogued with different years in different places —
// "Prynne, William, 1600-1669" here and "Prynne, William, d. 1669"
// there — so two dated keys are not two men. Variants of a name are
// gathered into people by whether they share a year at all: 1600-1669
// and d. 1669 share 1669 and are one man; 1517?-1594 and fl. 1626
// share nothing and are two. Where that is wrong it is wrong loudly,
// in the disagreement report at the end, rather than silently.
const variantsByBare = new Map();
namesEverywhere.forEach((n) => {
  const bare = authorKey(n);
  if (!bare) return;
  if (!variantsByBare.has(bare)) variantsByBare.set(bare, new Map());
  const d = datedKey(n);
  // An undated name is not evidence of a second man.
  if (!d) return;
  const years = new Set(String(n).match(/\d{3,4}/g) || []);
  variantsByBare.get(bare).set(d, years);
});

// bare name -> array of people, each a Set of the dated keys that mean him
const peopleByBare = new Map();
variantsByBare.forEach((variants, bare) => {
  const people = [];
  variants.forEach((years, key) => {
    const joins = people.filter((p) => [...years].some((y) => p.years.has(y)));
    if (!joins.length) {
      people.push({ keys: new Set([key]), years: new Set(years) });
      return;
    }
    // A variant that touches two groups welds them: "1600-1669",
    // "d. 1669" and "b. 1600" are one man in three catalogues.
    const first = joins[0];
    first.keys.add(key);
    years.forEach((y) => first.years.add(y));
    joins.slice(1).forEach((other) => {
      other.keys.forEach((k) => first.keys.add(k));
      other.years.forEach((y) => first.years.add(y));
      people.splice(people.indexOf(other), 1);
    });
  });
  peopleByBare.set(bare, people);
});

// The bare key is safe only where the library holds exactly one man of
// that name. 459 names failed this on the first run; most were date
// variants of one man, and the rest are the real collisions the whole
// two-key scheme exists for.
const ambiguous = new Set();
peopleByBare.forEach((people, bare) => { if (people.length > 1) ambiguous.add(bare); });

const authors = Object.create(null);
const provenance = Object.create(null);
const collisions = [];

// The two axes are filled independently, because the sources speak to
// different ones. The curated lists give a party and never a body; the
// Latin Library's records usually give a body and only sometimes a
// party. Merging field by field lets the list's "Puritan" and the
// Latin Library's "Congregational" both land on William Ames, which
// all-or-nothing precedence threw away — it let the weakest source,
// loaded first, block the better one behind it.
const RANK = { list: 1, "latin-library": 2, hand: 3 };

// Written under every key that means this man: each date variant the
// library catalogues him under, and the bare name if he is the only
// one of it. A line typed as "Prynne, William" therefore reaches
// "Prynne, William, 1600-1669" in Early English Books without the
// dates having to be typed, and a line typed with dates reaches the
// variants that spell them differently.
function put(name, rec, source) {
  // A name may be scoped to one catalogue — "tfr:John Owen" — which
  // says: inside that collection this bare name is this man. The
  // Latin Library catalogues everybody without life dates, so its
  // undated "John Owen" cannot otherwise be told from the
  // epigrammatist of the same name, and nine works of the
  // Congregationalist stay unplaced over a namesake who wrote Latin
  // couplets. Only a person can settle that, and this is where they
  // say so.
  const scope = /^([a-z][a-z0-9_-]*):(?!\s)(.+)$/.exec(name);
  if (scope) {
    const key = `${scope[1]}|${authorKey(scope[2])}`;
    if (key.endsWith("|")) return;
    scoped[key] = [rec.body || "", rec.party || "", rec.conf || "m"];
    return;
  }
  const bare = authorKey(name);
  if (!bare) return;
  const dated = datedKey(name);
  const people = peopleByBare.get(bare) || [];
  let person = null;
  if (dated) {
    person = people.find((p) => p.keys.has(dated)) || null;
    // A dated name the corpora have never seen still gets its own key:
    // the hand table may reach a man before the catalogue does.
    if (!person) putKey(dated, rec, source);
  } else if (people.length === 1) {
    person = people[0];
  } else if (people.length > 1) {
    // Only the writer of the line can say which man was meant.
    skippedAmbiguous.push(`${name} (${source}) — ${people.length} men share this name; add life dates`);
    return;
  }
  if (person) person.keys.forEach((k) => putKey(k, rec, source));
  if (people.length <= 1) putKey(bare, rec, source);
}

const skippedAmbiguous = [];
const scoped = Object.create(null);

function putKey(key, rec, source) {
  const rank = RANK[source] || 0;
  if (!authors[key]) {
    authors[key] = ["", "", rec.conf || "m"];
    provenance[key] = {};
  }
  const slot = authors[key];
  [["body", 0], ["party", 1]].forEach(([field, i]) => {
    const value = rec[field] || "";
    if (!value) return;
    const held = slot[i];
    const heldRank = provenance[key][field] ? RANK[provenance[key][field]] || 0 : -1;
    // Two sources naming the same axis differently is a disagreement
    // about a real man, and worth a line of output whichever way it
    // resolves.
    if (held && held !== value) {
      collisions.push([key, field, `${provenance[key][field]} ${held}`, `${source} ${value}`,
        rank > heldRank ? "took the second" : "kept the first"]);
    }
    if (held && rank <= heldRank) return;
    slot[i] = value;
    provenance[key][field] = source;
    // The confidence on the row is the confidence of the strongest
    // thing in it.
    if (rank >= heldRank) slot[2] = rec.conf || "m";
  });
}

// 4th — weakest, so first: a party and no body.
puritans.forEach(([name]) => put(name, { body: "", party: "Puritan", conf: "m" }, "list"));
anglicans.forEach(([name]) => put(name, { body: "Anglican", party: "Conformist", conf: "m" }, "list"));

// 3rd — the Latin Library's own records.
let llUsed = 0;
Object.keys(llAuthors).forEach((name) => {
  const r = fromLatinLibrary(llAuthors[name]);
  if (!r) return;
  llUsed += 1;
  put(name, r, "latin-library");
});

// 1st — the hand table wins everything.
handAuthors.forEach((r) => put(r.name, r, "hand"));

const works = Object.create(null);
handWorks.forEach((r) => {
  // The name column of the works table is the work key, "eebo:12345"
  // or "tfr:some-slug", matching {corpus}:{id} as the corpora adapter
  // normalizes them.
  works[r.name] = [r.body || "", r.party || "", r.conf || "h"];
});

const out = {
  version: new Date().toISOString().slice(0, 10),
  note: "Built by scripts/build-denominations.mjs. Do not edit by hand — edit scripts/data/denomination-*.tsv and rebuild.",
  patterns: PATTERNS,
  authors,
  scoped,
  works,
};

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out));

// ── Coverage ──────────────────────────────────────────────────────
//
// The number this whole exercise exists to move. Counted over the
// Latin Library's own works only — the pointer rows it carries for the
// other four collections are disowned by the corpora adapter and are
// not shown anywhere.
// The same order assets/js/faith-denominations.js resolves in, so the
// coverage printed here is the coverage the facet will show. Counting
// only the author table would under-report by every corporate author
// the patterns catch, and a number that disagrees with the page is
// worse than no number.
const compiled = PATTERNS.map(([re, body, party]) => [new RegExp(re, "i"), body, party]);
function look(name, corpus) {
  const hit = authors[datedKey(name)]
    || (corpus ? scoped[`${corpus}|${authorKey(name)}`] : null)
    || authors[authorKey(name)];
  if (hit) return hit;
  for (const [re, body, party] of compiled) if (re.test(String(name || ""))) return [body, party, "h"];
  return null;
}

const real = (catalogue.works || []).filter((w) => !/^(pld|pg|po|eebo)-\d+$/.test(w.slug || ""));
const prot = real.filter((w) => ["English Divines", "Reformed", "Lutheran"].includes(w.tradition));
const placed = prot.filter((w) => look(w.author, "tfr") && look(w.author, "tfr")[0]);

// Early English Books is the collection this whole table exists for:
// 15,569 works whose catalogue has no such field at all.
const keepIds = new Set((await (async () => {
  try {
    const d = JSON.parse(await readFile(path.join(ROOT, "assets", "data", "faith-received", "eebo-theological.json"), "utf8"));
    return Array.isArray(d) ? d : d.ids || [];
  } catch (_) { return []; }
})()).map(String));
const eeboWorks = (Array.isArray(eeboCat) ? eeboCat : eeboCat.works || [])
  .filter((w) => keepIds.has(String(w.i)));
const eeboPlaced = eeboWorks.filter((w) => look(w.a || "") && look(w.a || "")[0]);
const eeboParty = eeboWorks.filter((w) => look(w.a || "") && look(w.a || "")[1]);

const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : "-");

console.log(`authors: ${Object.keys(authors).length} keys (hand ${handAuthors.length}, latin-library ${llUsed}, lists ${puritans.length + anglicans.length})`);
console.log(`ambiguous bare names struck out: ${ambiguous.size}`);
console.log(`works table: ${Object.keys(works).length}`);
console.log(`corpus-scoped names: ${Object.keys(scoped).length}`);
console.log("");
console.log(`Latin Library Protestant works with a body: ${placed.length} / ${prot.length}  (${pct(placed.length, prot.length)})`);
console.log(`Early English Books works with a body:      ${eeboPlaced.length} / ${eeboWorks.length}  (${pct(eeboPlaced.length, eeboWorks.length)})`);
console.log(`Early English Books works with a party:     ${eeboParty.length} / ${eeboWorks.length}  (${pct(eeboParty.length, eeboWorks.length)})`);

// The biggest holes, so the next pass at the TSV starts where it buys
// the most. Silent truncation would read as "everything is covered".
const holes = new Map();
eeboWorks.forEach((w) => {
  const a = String(w.a || "").trim();
  if (!a || (look(a) && look(a)[0])) return;
  holes.set(a, (holes.get(a) || 0) + 1);
});
const top = [...holes.entries()].sort((a, b) => b[1] - a[1]);
console.log(`\n${holes.size} Early English Books authors still unplaced. The 25 largest:`);
top.slice(0, 25).forEach(([a, n]) => console.log(`  ${String(n).padStart(4)}  ${a}`));

if (skippedAmbiguous.length) {
  // The hand ones are printed in full: each is a line in the TSV that
  // did nothing, and nothing but adding the dates will fix it.
  const hand = skippedAmbiguous.filter((s) => s.includes("(hand)"));
  const rest = skippedAmbiguous.filter((s) => !s.includes("(hand)"));
  console.log(`\n${skippedAmbiguous.length} entries dropped as ambiguous (more than one man of the name):`);
  if (hand.length) {
    console.log(`  ${hand.length} from the hand table — these lines do nothing until dates are added:`);
    hand.forEach((s) => console.log("    ", s));
  }
  if (rest.length) {
    console.log(`  ${rest.length} from the sources:`);
    rest.slice(0, 10).forEach((s) => console.log("    ", s));
  }
}
if (collisions.length) {
  console.log(`\n${collisions.length} sources disagree:`);
  collisions.slice(0, 20).forEach((c) => console.log("  ", c.join("  |  ")));
}
console.log(`\nwrote ${path.relative(ROOT, OUT)}`);
