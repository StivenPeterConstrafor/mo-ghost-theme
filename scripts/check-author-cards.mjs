// Checks the shared author-card library (assets/js/lib/faith-author-cards.js).
import assert from "node:assert/strict";
import { createRequire } from "node:module";
globalThis.window = {};
createRequire(import.meta.url)("../assets/js/lib/faith-author-cards.js");
const C = window.MOAuthorCards;

const works = [
  { author: "John Chrysostom" }, { author: ["John Chrysostom", "Savile"] }, { author: "John Calvin" },
  { author: "Calvin, John" }, { author: "Unknown author (John?)" }, { author: "Anonymous" }, { author: "Augustine" },
];
const names = (t) => C.match(works, t).map((x) => x[0]);
assert.deepEqual(C.match(works, "john")[0], ["John Chrysostom", 2], "work counts, authors listed once per work");
assert.ok(names("john").includes("Calvin, John") && names("john").includes("John Calvin"));
assert.deepEqual(names("calvin john").sort(), ["Calvin, John", "John Calvin"], "all words, any order");
assert.deepEqual(names("anonymous"), [], "Anonymous skipped");
assert.deepEqual(names("unknown"), [], "Unknown skipped");
assert.deepEqual(C.match(works, ""), []);

window.MOFaithCatalogue = { shelved: (w) => w.app !== "apparatus" };
assert.equal(C.match([{ author: "Jerome" }, { author: "Jerome", app: "apparatus" }], "jerome")[0][1], 1, "shelved filter");
delete window.MOFaithCatalogue;

const evil = C.block([['<img src=x onerror=alert(1)>"', 1]], 1).html;
assert.ok(!evil.includes("<img") && evil.includes("&lt;img"), "hostile name escaped");

const many = Array.from({ length: 60 }, (_, i) => ["Author " + i, 1]);
const b = C.block(many, 2);
assert.equal(b.pages, 3);
assert.equal(b.page, 2);
assert.ok(b.html.includes('data-bs-apage="3"') && b.html.includes("Author 24") && !b.html.includes("Author 0<"));
for (const bad of [NaN, undefined, 0, 99, "x"]) assert.equal(C.block(many, bad).page, 1, "bad page -> 1: " + bad);
assert.equal(C.block([], 1).html, "");
console.log("✓ author cards: matching, filter, escaping, paging");
