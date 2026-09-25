#!/usr/bin/env node
/*
 * Check the denomination resolver against the live catalogues.
 *
 *   node scripts/check-denominations.mjs
 *
 * The browser file is loaded as written — not reimplemented here —
 * with a window object and a fetch that reads the built table off
 * disk. Reimplementing it is how the two key rules drift apart, and a
 * drift in authorKey() silently unplaces the whole library.
 *
 * Asserts the things that would be wrong quietly:
 *   · the cases where two men share a name and must not share a row
 *   · a handful of men whose church is not in question
 *   · that no work ends up under a body the taxonomy does not have
 *   · that "English Divines" is gone from the Protestant facet
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.join(import.meta.dirname, "..");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const table = JSON.parse(await readFile(path.join(ROOT, "assets", "data", "faith-received", "denominations.json"), "utf8"));
const source = await readFile(path.join(ROOT, "assets", "js", "faith-denominations.js"), "utf8");

const sandbox = {
  window: {},
  fetch: async () => ({ ok: true, json: async () => table }),
  console,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const MODenom = sandbox.window.MODenom;
await MODenom.ready();

let failures = 0;
function is(label, got, want) {
  const ok = got === want;
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}: ${JSON.stringify(got)}${ok ? "" : ` (wanted ${JSON.stringify(want)})`}`);
}

const work = (author, extra = {}) => ({ corpus: "eebo", id: "x", author, ...extra });

console.log("── two men, one name ──");
// The pair that made the two-key scheme necessary: a Particular
// Baptist and the cardinal who ran the English mission from Douai.
is("Allen, William, d. 1686", MODenom.body(work("Allen, William, d. 1686")), "Baptist");
// The cardinal, now placed in his own church. What matters is that
// he is not the Baptist.
is("Allen, William, 1532-1594", MODenom.body(work("Allen, William, 1532-1594")), "Roman Catholic");
// A Presbyterian of the ejection and Mary's Bishop of Lincoln.
is("Watson, Thomas, d. 1686", MODenom.body(work("Watson, Thomas, d. 1686")), "Presbyterian");
is("Watson, Thomas, 1513-1584 (not the Presbyterian)", MODenom.body(work("Watson, Thomas, 1513-1584")) === "Presbyterian" ? "Presbyterian" : "not the Presbyterian", "not the Presbyterian");
// A Puritan of the 1620s and the Elizabethan bishop the Marprelate
// tracts were aimed at.
is("Cooper, Thomas, fl. 1626", MODenom.party(work("Cooper, Thomas, fl. 1626")), "Puritan");
is("Cooper, Thomas, 1517?-1594", MODenom.party(work("Cooper, Thomas, 1517?-1594")), "Conformist");

console.log("\n── one man, three catalogues ──");
// The same row has to answer to the Latin Library's spelling and to
// Early English Books' spelling of the same man.
is("Owen, John, 1616-1683", MODenom.body(work("Owen, John, 1616-1683")), "Congregational");
// Scoped: the Latin Library's undated "John Owen" is the
// Congregationalist, and the same bare name in a catalogue nobody has
// scoped stays unplaced rather than borrowing his row.
is("John Owen (Latin Library form)", MODenom.body(work("John Owen", { corpus: "tfr" })), "Congregational");
is("John Owen, unscoped catalogue", MODenom.body(work("John Owen", { corpus: "eebo" })), "");
is("Owen party", MODenom.party(work("Owen, John, 1616-1683")), "Puritan");

console.log("\n── the parties are not the bodies ──");
is("Prynne body", MODenom.body(work("Prynne, William, 1600-1669")), "Presbyterian");
is("Prynne party", MODenom.party(work("Prynne, William, 1600-1669")), "Puritan");
is("Keach body", MODenom.body(work("Keach, Benjamin, 1640-1704")), "Baptist");
is("Keach party", MODenom.party(work("Keach, Benjamin, 1640-1704")), "Puritan");
// A Puritan who never left is Reformed, not Anglican (Stiven, 2026-09-24):
// Anglican is kept for the clear conformists.
is("Perkins body (Puritan, never left)", MODenom.body(work("Perkins, William, 1558-1602")), "Reformed");
is("Hooker body (conformist)", MODenom.body(work("Hooker, Richard, 1553 or 4-1600")), "Anglican");
is("Westminster Assembly body", MODenom.body(work("Westminster Assembly (1643-1652)")), "Presbyterian");
is("Perkins party", MODenom.party(work("Perkins, William, 1558-1602")), "Puritan");
is("Laud body", MODenom.body(work("Laud, William, 1573-1645")), "Anglican");
is("Laud party", MODenom.party(work("Laud, William, 1573-1645")), "Conformist");
is("Fox body", MODenom.body(work("Fox, George, 1624-1691")), "Quaker");
is("Fox party", MODenom.party(work("Fox, George, 1624-1691")), "");

console.log("\n── corporate authors ──");
is("Church of England", MODenom.body(work("Church of England")), "Anglican");
is("a diocese", MODenom.body(work("Church of England. Diocese of Ely. Bishop (1559-1581 : Cox)")), "Anglican");
is("the Crown is not a church", MODenom.body(work("England and Wales. Sovereign (1625-1649 : Charles I)")), "");

console.log("\n── the tradition string as a floor ──");
is("a Lutheran work with no author row", MODenom.body({ corpus: "tfr", id: "y", author: "Nobody At All", tradition: "Lutheran" }), "Lutheran");
is("English Divines is not a denomination", MODenom.body({ corpus: "tfr", id: "y", author: "Nobody At All", tradition: "English Divines" }), "");

console.log("\n── every value is in the taxonomy ──");
const allowed = new Set([...MODenom.bodies, "Roman Catholic", "Eastern Orthodox", ""]);
const strays = new Set();
Object.keys(table.authors).forEach((k) => {
  const [body, party] = table.authors[k];
  if (!allowed.has(body)) strays.add(body);
  if (party && MODenom.parties.indexOf(party) < 0) strays.add(`party:${party}`);
});
is("values outside the taxonomy", [...strays].join(", "), "");

// The whole point of the exercise, measured on the live catalogue.
console.log("\n── coverage ──");
const cat = await (await fetch("https://eebo-backup.vercel.app/data/catalogue.json", { headers: { "user-agent": UA } })).json();
const keep = JSON.parse(await readFile(path.join(ROOT, "assets", "data", "faith-received", "eebo-theological.json"), "utf8"));
const ids = new Set((keep.ids || keep).map(String));
const list = (Array.isArray(cat) ? cat : cat.works || []).filter((w) => ids.has(String(w.i)));
const byBody = new Map();
list.forEach((w) => {
  const b = MODenom.body({ corpus: "eebo", id: String(w.i), author: w.a || "" }) || "(unplaced)";
  byBody.set(b, (byBody.get(b) || 0) + 1);
});
[...byBody.entries()].sort((a, b) => b[1] - a[1])
  .forEach(([b, n]) => console.log(`  ${String(n).padStart(6)}  ${b}`));

console.log(failures ? `\n${failures} FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
