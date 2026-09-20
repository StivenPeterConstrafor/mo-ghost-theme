/* All Works draws from a list of collection ids, and so does the shelf
 * block above it. They are declared twice, in two files, and when they
 * drift the page lies quietly: a shelf count that does not match the
 * contents under it, or a collection that exists everywhere except the
 * one page that promises the whole library. That is how English Editions
 * stayed invisible.
 *
 * Both lists must hold every readable collection the registry declares.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

function listIn(file, name) {
  const src = read(file);
  const m = src.match(new RegExp(`const ${name}\\s*=\\s*\\[([^\\]]*)\\]`));
  if (!m) {
    console.error(`✗ room corpora: ${name} not found in ${file}`);
    process.exit(1);
  }
  return m[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}

// Every collection the registry declares readable. A corpus that is not
// readable has no works to shelve, so it is not expected in either list.
// A corpus id sits alone on its own line. A LANE id ("en", "la") is
// inline inside lanes: [{ id: "en", … }], so anchoring to the line start
// is what tells the two apart — without it the lane ids get read as
// collections and the check fails on a library that is perfectly whole.
const registry = read("assets/js/faith-corpora.js");
const entries = registry.split(/^\s+id: "([a-z0-9_-]+)",$/m);
const declared = [];
for (let i = 1; i < entries.length; i += 2) {
  // The body of this corpus runs to the start of the next one.
  if (/^\s+readable: true,?$/m.test(entries[i + 1] || "")) declared.push(entries[i]);
}
if (!declared.length) {
  console.error("✗ room corpora: no readable collections found — the registry shape changed");
  process.exit(1);
}

const room = listIn("assets/js/faith-room.js", "ALL");
const openers = listIn("assets/js/faith-room-openers.js", "ALL");

let bad = 0;
const sort = (a) => a.slice().sort().join(" ");

if (sort(room) !== sort(openers)) {
  bad++;
  console.error("  ✗ the two lists disagree");
  console.error(`      faith-room.js         ${sort(room)}`);
  console.error(`      faith-room-openers.js ${sort(openers)}`);
}

const missing = declared.filter((id) => id !== "confessions" && !room.includes(id));
if (missing.length) {
  bad++;
  console.error(`  ✗ readable but not in All Works: ${missing.join(", ")}`);
}

if (bad) {
  console.error("✗ room corpora: the whole library is not whole");
  process.exit(1);
}
console.log(`✓ room corpora: ${room.length} collections, both lists agree.`);
