/* A citation in an Ask answer opens the work AT THE QUOTE, and the quote
 * is lifted from the answer itself: the worker's source objects carry no
 * `quote` field, so the text immediately before the citation is the only
 * place the exact words exist.
 *
 * That makes this a parser, and parsers rot. The cases below are the ones
 * that matter:
 *
 *  - It must find the quotation when there is one, through straight
 *    quotes, curly quotes, and a stray "he says," between the close and
 *    the citation.
 *  - It must find NOTHING when there is no quotation, rather than
 *    grabbing an earlier one from further up the paragraph. A highlight
 *    on the wrong sentence is worse than no highlight: it tells the
 *    reader the author said something they did not.
 *  - It must skip anything under 24 characters, because reader-core's
 *    markPhrase() ignores those and an &hl= it will not act on is noise
 *    in the URL.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "assets/js/port/ask-workspace.js"), "utf8");

const block = src.match(/const QUOTE_CHARS[\s\S]*?\n {2}}\n/);
if (!block) {
  console.error("✗ ask cite quote: quoteBefore() not found in ask-workspace.js");
  process.exit(1);
}
const { quoteBefore } = new Function(`${block[0]}; return { quoteBefore };`)();

const CASES = [
  ["He explains that the opening proposition is the consolation:\n> “There is now no condemnation to those who are in Christ Jesus, that is, those justified by faith are pleasing to God” [pld-1/p311]",
    "There is now no condemnation"],
  ["Bucer writes \"Therefore, brothers, we are debtors, not to the flesh, that we should live according to the flesh\" [eebo-266/p364]",
    "Therefore, brothers"],
  // A few words between the closing quote and the citation are still it.
  ["“Thus far we have learned from the law what kind of people we are, now even if”, he says, [x/p63]",
    "Thus far we have learned"],
  // No quotation: must not reach back and invent one.
  ["Melanchthon frames Romans 8 around the definition of grace as gratuitous acceptance [pld-1/p311]", ""],
  // Under markPhrase's 24-character floor.
  ["He says “no condemnation” [x/p1]", ""],
  // A real quotation, but a whole sentence away: not this citation's.
  ["“This is a long enough quotation to pass the length test easily”. Then several more words of commentary follow here, well past the tolerance, and only then [x/p9]", ""],
  // Nothing at all.
  ["", ""],
];

let bad = 0;
for (const [text, want] of CASES) {
  const at = text.lastIndexOf("[");
  const got = quoteBefore(text, at < 0 ? 0 : at);
  const ok = want ? got.startsWith(want) : got === "";
  if (!ok) {
    bad++;
    console.error(`  ✗ ${JSON.stringify(text.slice(-56))} -> ${JSON.stringify(got)}, wanted ${want ? "a quote starting " + JSON.stringify(want) : "no quote"}`);
  }
}

/* The page a citation opens (2026-11-10). The worker gives a page as it files it, "0166": the link said #b0166-0, no block has that id,
 * and the reader opened the work at its first page. readURL() writes the page as the reader names it, and the reader reads an address
 * already written with the zeros (a link copied from an older answer) as the page it means. A Migne "vol:col" id is no plain number
 * and stays as it is. */
const urlLine = src.match(/const readURL = [^\n]+\n/);
const core = readFileSync(join(root, "assets/js/port/reader-core.js"), "utf8");
const plainFn = core.match(/function frPlainBlockId\(id\)\{[^\n]+\}\n/);
if (!urlLine || !plainFn) {
  console.error("✗ ask cite quote: readURL() or frPlainBlockId() not found");
  process.exit(1);
}
const { readURL } = new Function("CFG", `${urlLine[0]}; return { readURL };`)({ readPath: "/the-faith-received/read/" });
const { frPlainBlockId } = new Function(`${plainFn[0]}; return { frPlainBlockId };`)();
const PAGES = [["0166", "#b166-0"], ["166", "#b166-0"], ["0520–0521", "#b520-0"], ["12-15", "#b12-0"], ["0", "#b0-0"], ["52:0183A", "#b52%3A0183A-0"], ["0183A", "#b0183A-0"]];
for (const [page, want] of PAGES) {
  const got = readURL("a-work", page).replace(/^[^#]*/, "");
  if (got !== want) { bad++; console.error(`  ✗ readURL page ${JSON.stringify(page)} -> ${got}, wanted ${want}`); }
}
const IDS = [["b0166-0", "b166-0"], ["b166-0", "b166-0"], ["b0-0", "b0-0"], ["b52:0183A-0", "b52:0183A-0"], ["b0183A-0", "b0183A-0"], ["heading-3", "heading-3"]];
for (const [id, want] of IDS) {
  const got = frPlainBlockId(id);
  if (got !== want) { bad++; console.error(`  ✗ frPlainBlockId ${JSON.stringify(id)} -> ${got}, wanted ${want}`); }
}

if (bad) {
  console.error(`✗ ask cite quote: ${bad} of ${CASES.length} cases failing`);
  process.exit(1);
}
console.log(`✓ ask cite quote: ${CASES.length} shapes, all correct.`);
