/* The shelf list prints author names, and the catalogues do not agree on
 * what a name looks like. Early English Books files "Prynne, William,
 * 1600-1669" — a sort key with dates attached. Migne files "John
 * Chrysostom". The Syriac catalogue files "Jacques d'Édesse, traductions
 * syriaques", where the comma introduces a descriptor rather than a
 * forename, so a blind swap prints "traductions syriaques Jacques
 * d'Édesse".
 *
 * These cases are the reason displayName has rules rather than a split on
 * the comma, and they are cheap to break. Fails the build if any of them
 * stops holding.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "assets/js/faith-room-openers.js"), "utf8");

const m = src.match(/function displayName\(raw\) \{[\s\S]*?\n  \}/);
if (!m) {
  console.error("✗ author display: displayName not found in faith-room-openers.js");
  process.exit(1);
}
const displayName = new Function(`${m[0]}; return displayName;`)();

const CASES = [
  // Early English Books: inverted, with dates.
  ["Prynne, William, 1600-1669", "William Prynne"],
  ["Baxter, Richard, 1615-1691", "Richard Baxter"],
  ["Taylor, Jeremy, 1613-1667", "Jeremy Taylor"],
  ["Calvin, Jean, 1509-1564", "Jean Calvin"],
  // Conjectural attribution: the brackets are the cataloguer's.
  ["[Brothyel, Mathias]", "Mathias Brothyel"],
  // Already a name. Must not be touched.
  ["John Chrysostom", "John Chrysostom"],
  ["Augustine of Hippo", "Augustine of Hippo"],
  ["Thomas Aquinas", "Thomas Aquinas"],
  // A comma that is not an inversion: descriptor after the name.
  ["Jacques d'Édesse, traductions syriaques", "Jacques d'Édesse"],
  ["Gregory Abu'l-Faraj, called Bar Hebraeus", "Gregory Abu'l-Faraj"],
  // Dates only after the surname leaves nothing to swap with.
  ["Someone, fl. 1600", "Someone"],
  ["Hus, 1372?-1415", "Hus"],
  // Nothing at all.
  ["", ""],
  [null, ""],
];

let bad = 0;
for (const [input, want] of CASES) {
  const got = displayName(input);
  if (got !== want) {
    bad++;
    console.error(`  ✗ ${JSON.stringify(input)} -> ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}

if (bad) {
  console.error(`✗ author display: ${bad} of ${CASES.length} cases failing`);
  process.exit(1);
}
console.log(`✓ author display: ${CASES.length} name shapes, all correct.`);
