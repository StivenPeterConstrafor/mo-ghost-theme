/*
 * The reader's inline Scripture linker, held to the corpus owner's behaviour.
 *
 * This is the linker that finds citations in the READING TEXT and makes them
 * hoverable. It is not the Daily Liturgy parser (that one is check:refs) and
 * it is not the mine: the mine is a build-time research layer, this is inline
 * detection at read time, and the two have nothing to do with each other.
 *
 * WHY A GUARD. The linker is ported from the owner's reader-core.js, and a
 * port drifts silently — nothing throws when a citation quietly stops linking,
 * it just stops being a link and no one notices. When this file was ported on
 * 2026-09-16 the first attempt replaced the constants and the location parser
 * but stopped short of scriptureReferences(), so the backtracking fix was left
 * behind. Every case below passed except two, and without them the port would
 * have shipped looking correct.
 *
 * Each case is one of the owner's own documented examples, and the comment
 * says what early-modern printing habit it stands for. Update these only
 * against his reader-core.js, never to match whatever ours happens to do.
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SRC = "assets/js/port/reader-core.js";

// The linker is a block inside a browser file with no exports, so the block is
// lifted into a temporary module rather than the file being loaded whole.
function loadLinker() {
  const lines = readFileSync(SRC, "utf8").split(/^/m);
  const start = lines.findIndex((l) => l.includes("XREF_CAP="));
  const fn = lines.findIndex((l) => l.startsWith("function scriptureReferences"));
  if (start < 0 || fn < 0) throw new Error("scripture linker not found in " + SRC);
  let depth = 0, end = -1;
  for (let i = fn; i < lines.length; i++) {
    depth += (lines[i].match(/{/g) || []).length - (lines[i].match(/}/g) || []).length;
    if (depth === 0 && i > fn) { end = i + 1; break; }
  }
  if (end < 0) throw new Error("scriptureReferences() never closes");
  const path = join(tmpdir(), `mo-scripture-linker-${process.pid}.mjs`);
  writeFileSync(path, lines.slice(start, end).join("") + "\nexport {scriptureReferences};\n");
  return { path };
}

const CASES = [
  // dotted verse lists: "Rom. 2. 14. 15." is chapter 2, verses 14 and 15 —
  // 983 such citations in a 200-work sample (owner, 2026-09-16)
  ["Rom. 2. 14. 15.", "Romans 2:14,15"],
  ["Psal. 19. v. 1. 8.", "Psalms 19:1,8"],
  // a small number before a book that TAKES an ordinal belongs to that book
  ["Kor. XIII. 4. 5. Mos. VI. 4.", "Deuteronomy 6:4"],
  // ...and only then. Exodus keeps its verse 5 because Rom takes no ordinal
  ["Exod. xx. 5. Rom. viii. 7.", "Exodus 20:5 | Romans 8:7"],
  // after a colon verse the period is the sentence's, so the verse stands
  ["Ps. 23:1. Ioh. I.1.", "Psalms 23:1 | John 1:1"],
  // a descending dotted number is the next chapter, not a verse
  ["Ps. 9. 10. 18. 3.", "Psalms 9:10"],
  // a failed match gives back the boundary the next citation needs
  ["Hebrews 1 Sam. 17:43", "1 Samuel 17:43"],
  ["the church at Corinth. Romans 16:", "Romans 16"],
  ["5. Levit. 5.", "Leviticus 5"],
  // a chapter that is really the next book's ordinal
  ["John. 1 John 4:18", "1 John 4:18"],
  ["I.Iohan. 1 John 5:7", "1 John 5:7"],
  // an impossible citation stays unlinked rather than linking wrongly
  ["2 John 15:2", ""],
  // prose that merely looks like a citation
  ["in Matthew 3 John said", "Matthew 3"],
  ["mark 3 items", ""],
  // bare "num." is a numbered passage in scholarly prose; spelled out it is the book
  ["num. 5", ""],
  ["Numbers 5:2", "Numbers 5:2"],
];

const { path } = loadLinker();
let pass = 0, fail = 0;
try {
  const { scriptureReferences } = await import(`file://${path}`);
  for (const [text, want] of CASES) {
    let got;
    try { got = (scriptureReferences(text) || []).map((r) => r.query).join(" | "); }
    catch (e) { got = `THREW ${e.message}`; }
    if (got === want) { pass++; }
    else {
      fail++;
      console.log(`  FAIL ${JSON.stringify(text)}\n       got:  ${got || "(none)"}\n       want: ${want || "(none)"}`);
    }
  }
} finally { try { unlinkSync(path); } catch { /* best effort */ } }

if (fail) { console.log(`\n✗ scripture linker: ${pass} passed, ${fail} failed.`); process.exit(1); }
console.log(`✓ scripture linker: ${pass} citation forms, all correct.`);
