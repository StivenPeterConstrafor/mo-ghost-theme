#!/usr/bin/env node
/*
 * Checks for the Mere Orthodoxy articles data and its loader (assets/js/lib/mo-articles.js).
 *
 *   node scripts/check-mo-articles.mjs
 *
 * 1. The loader, on a small fixture: AND across words, diacritics, prefix on the last word, kind filter, ordering, lookups.
 * 2. The built file: shape, attribution (every entry links to mereorthodoxy.com), no body text beyond the excerpt, every
 *    index entry names a real article and agrees with the article's own entity arrays, and the lookups answer from it.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const MOArticles = require(path.join(root, "assets/js/lib/mo-articles.js"));

let failed = 0;
const test = (name, fn) => {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}\n     ${e.message}`); }
};

// ── 1. the loader on a fixture ──
const art = (id, t, d, k, extra) => ({ id, t, u: `https://mereorthodoxy.com/${id}/`, d, a: "A. Writer", k, f: "high", x: "", w: [], ...extra });
const fixture = {
  v: 1,
  articles: [
    art("a1", "Augustine and the Restless Heart", "2020-01-01", "work", { authors: ["Augustine of Hippo"], works: ["pld-2722"], w: ["confessions", "memory"], x: "A reading of the Confessions." }),
    art("a2", "The Résumé of Hooker", "2021-05-05", "work", { authors: ["Richard Hooker"], x: "Hooker on order." }),
    art("a3", "Nicaea at 1700", "2025-03-03", "doc", { docs: ["cf-013-council-of-nicea-i-325"], x: "The creed and the council, with Augustine in the margin.", verses: ["john.1.1-3"] }),
    art("a4", "Why God Hides", "2019-02-02", "topic", { topics: ["de-christo"], verses: ["romans.8", "romans.8.28"], w: ["veil", "covering"] }),
    art("a5", "Romans 8 for Weary People", "2018-08-08", "topic", { verses: ["romans.8"], a: "Zoë Müller" }),
    art("a6", "Ressourcement Again", "2022-02-02", "retrieval", { n: ["Book of Common Prayer"], x: "Retrieval, ressourcement, and the sources." }),
  ],
  lab: { works: { "pld-2722": "Confessions" }, docs: { "cf-013-council-of-nicea-i-325": "Council of Nicaea I (325)" }, topics: { "de-christo": "The Person and Work of Christ" } },
  idx: {
    verse: { "john.1": ["a3"], "john.1.1": ["a3"], "john.1.2": ["a3"], "john.1.3": ["a3"], "romans.8": ["a5", "a4"], "romans.8.28": ["a4"] },
    topic: { "de-christo": ["a4"] }, work: { "pld-2722": ["a1"] },
    author: { "Augustine of Hippo": ["a1"], "Richard Hooker": ["a2"] }, doc: { "cf-013-council-of-nicea-i-325": ["a3"] },
  },
};
const M = MOArticles.create();
test("answers [] before the data loads", () => {
  assert.deepEqual(M.search("augustine"), []);
  assert.deepEqual(M.forTopic("de-christo"), []);
  assert.deepEqual(M.forVerse("romans.8"), []);
});
M.use(fixture);
const ids = (l) => l.map((a) => a.id);
test("single word: title outranks keyword outranks excerpt", () => {
  assert.deepEqual(ids(M.search("augustine")), ["a1", "a3"]); // a1 title and entity; a3 excerpt only
  assert.deepEqual(ids(M.search("confessions")), ["a1"]);
});
test("AND across words", () => {
  assert.deepEqual(ids(M.search("augustine confessions")), ["a1"]);
  assert.deepEqual(ids(M.search("augustine hooker")), []);
  assert.deepEqual(ids(M.search("creed council")), ["a3"]);
});
test("folds diacritics and case, both ways", () => {
  assert.deepEqual(ids(M.search("RESUME")), ["a2"]);
  assert.deepEqual(ids(M.search("résumé")), ["a2"]);
  assert.deepEqual(ids(M.search("zoe muller")), ["a5"]);
  assert.deepEqual(ids(M.search("Müller")), ["a5"]);
});
test("prefix matches the last word only", () => {
  assert.deepEqual(ids(M.search("ressour")), ["a6"]);
  assert.deepEqual(ids(M.search("augustine conf")), ["a1"]);
  assert.deepEqual(ids(M.search("conf augustine")), []); // "conf" is not the last word, so it must be a whole word
});
test("searches names of what the essay serves", () => {
  assert.deepEqual(ids(M.search("person work")), ["a4"]); // topic label
  assert.deepEqual(ids(M.search("nicaea council")), ["a3"]);
  assert.deepEqual(ids(M.search("common prayer")), ["a6"]); // a non-linkable document name
  assert.deepEqual(ids(M.search("richard")), ["a2"]);
});
test("kind filter and limit", () => {
  assert.deepEqual(ids(M.search("", { kind: "doc" })), ["a3"]);
  assert.deepEqual(ids(M.search("augustine", { kind: "doc" })), ["a3"]);
  assert.deepEqual(ids(M.search("augustine", { kind: "retrieval" })), []);
  assert.equal(M.search("", { limit: 2 }).length, 2);
});
test("empty query lists everything, newest first", () => {
  assert.deepEqual(ids(M.search("")), ["a3", "a6", "a2", "a1", "a4", "a5"]);
  assert.deepEqual(ids(M.search("   ")), ids(M.search("")));
});
test("ties break by date, newest first", () => {
  assert.deepEqual(ids(M.search("romans")), ["a5"]);
  const T = MOArticles.create();
  T.use({ articles: [art("o", "Grace", "2001-01-01", "topic"), art("n", "Grace", "2024-01-01", "topic")], idx: {} });
  assert.deepEqual(ids(T.search("grace")), ["n", "o"]);
});
test("kinds() counts in display order", () => {
  assert.deepEqual(M.kinds().map((k) => [k.k, k.n]), [["doc", 1], ["work", 2], ["retrieval", 1], ["topic", 2]]);
  assert.equal(M.kinds()[0].label, "Creeds and confessions");
});
test("lookups keep the build's order", () => {
  assert.deepEqual(ids(M.forTopic("de-christo")), ["a4"]);
  assert.deepEqual(ids(M.forWork("pld-2722")), ["a1"]);
  assert.deepEqual(ids(M.forDoc("cf-013-council-of-nicea-i-325")), ["a3"]);
  assert.deepEqual(ids(M.forAuthor("Augustine of Hippo")), ["a1"]);
  assert.deepEqual(ids(M.forAuthor("augustine  of hippo")), ["a1"]);
  assert.deepEqual(ids(M.forAuthor("Nobody")), []);
  assert.deepEqual(ids(M.forVerse("romans.8")), ["a5", "a4"]);
});
test("forVerse: a verse, a range, and the chapter-wide essays", () => {
  assert.deepEqual(ids(M.forVerse("romans.8.28")), ["a4", "a5"]); // a4 names the verse, a5 is on the whole chapter
  assert.deepEqual(ids(M.forVerse("romans.8.29")), ["a5", "a4"]); // both are on the whole chapter
  assert.deepEqual(ids(M.forVerse("john.1.2-3")), ["a3"]);
  assert.deepEqual(ids(M.forVerse("Romans 8:28")), []); // not the address form
  assert.deepEqual(ids(M.forVerse("nonsense")), []);
});
test("entities() lists documents first and labels them", () => {
  const e = M.entities(fixture.articles[2]);
  assert.deepEqual(e.map((x) => x.type), ["doc", "verse"]);
  assert.equal(e[0].label, "Council of Nicaea I (325)");
});

// ── 2. the built file ──
const file = path.join(root, "assets/data/faith-received/mo-articles.json");
const text = readFileSync(file, "utf8");
const data = JSON.parse(text);
const B = MOArticles.create();
B.use(data);
const byId = new Map(data.articles.map((a) => [a.id, a]));

test("size under 400 KB", () => assert.ok(Buffer.byteLength(text) < 400 * 1024, `${text.length} bytes`));
test("all 493 approved essays are present, once", () => {
  assert.equal(data.articles.length, 493);
  assert.equal(byId.size, 493);
});
test("every entry is attributed: title, author, date, a link back to mereorthodoxy.com", () => {
  for (const a of data.articles) {
    assert.ok(a.t && a.a && /^\d{4}-\d{2}-\d{2}$/.test(a.d), `${a.id} lacks title, author or date`);
    assert.match(a.u, /^https:\/\/mereorthodoxy\.com\/[^\s]+$/, a.id);
    assert.ok(["doc", "work", "retrieval", "topic"].includes(a.k), `${a.id} kind ${a.k}`);
  }
});
test("no body text beyond a 240-character excerpt; at most 12 keywords", () => {
  for (const a of data.articles) {
    assert.ok(a.x.length <= 241, `${a.id} excerpt is ${a.x.length}`);
    assert.ok(!/<[a-z/][^>]*>/i.test(a.x), `${a.id} excerpt has markup`);
    assert.ok(a.w.length <= 12, `${a.id} has ${a.w.length} keywords`);
  }
});
test("the index agrees with the articles, both ways", () => {
  const field = { work: "works", author: "authors", doc: "docs", topic: "topics" };
  for (const [table, key] of Object.entries(field)) {
    for (const [k, list] of Object.entries(data.idx[table])) {
      assert.equal(new Set(list).size, list.length, `${table} ${k} repeats an article`);
      for (const id of list) assert.ok((byId.get(id)[key] || []).includes(k), `${table} ${k} lists ${id}, which does not carry it`);
    }
    for (const a of data.articles) for (const k of a[key] || []) assert.ok(data.idx[table][k].includes(a.id), `${a.id} carries ${table} ${k} but the index lacks it`);
  }
  for (const [k, list] of Object.entries(data.idx.verse)) for (const id of list) assert.ok(byId.has(id), `verse ${k} names unknown ${id}`);
  for (const a of data.articles) for (const v of a.verses || []) {
    const [book, c] = v.split(".");
    assert.ok(data.idx.verse[`${book}.${c}`].includes(a.id), `${a.id} ${v} missing from its chapter`);
  }
});
test("verse keys are book.chapter or book.chapter.verse", () => {
  for (const k of Object.keys(data.idx.verse)) assert.match(k, /^[a-z0-9]+(-[a-z0-9]+)*\.\d{1,3}(\.\d{1,3})?$/, k);
});
test("no index list is empty", () => {
  for (const table of ["author", "work", "doc", "topic"]) for (const [k, list] of Object.entries(data.idx[table])) {
    assert.ok(list.length >= 1, `${table} ${k} is empty`);
  }
});
test("labels exist for every work, document and topic used", () => {
  for (const a of data.articles) {
    for (const s of a.works || []) assert.ok(data.lab.works[s], s);
    for (const s of a.docs || []) assert.ok(data.lab.docs[s], s);
    for (const s of a.topics || []) assert.ok(data.lab.topics[s], s);
  }
});
test("the lookups answer from the built file", () => {
  assert.ok(B.forAuthor("Augustine of Hippo").length >= 30, "Augustine's essays");
  assert.ok(B.forWork("pld-2722").length >= 20, "Confessions");
  assert.ok(B.forTopic("de-trinitate").length >= 10);
  assert.ok(B.forDoc("cf-001-apostolic-and-ancient-creeds").length >= 20);
  assert.ok(B.forVerse("genesis.1").length >= 3);
  assert.ok(B.search("heidelberg catechism").some((a) => /Heidelberg/.test(a.t)));
  assert.ok(B.search("augustin").length >= 30, "prefix on the last word");
  assert.equal(B.search("zzzqqq").length, 0);
});

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log("\nmo-articles: all checks passed");
