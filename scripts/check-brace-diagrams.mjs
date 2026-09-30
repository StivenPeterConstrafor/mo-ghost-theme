/*
 * The reader's brace diagrams (Baxter's Methodus), held to the corpus owner's
 * edition: its facsimile pages are the reference.
 *
 * WHY A GUARD. On 2026-09-29 the owner copied a diagram across pp. 257-258 and
 * got "2. Intellect: 3. Will: II. Sensitive animal nature …" in one run. On the
 * page, '3. Will:' stood alone above the next tree, although the edition prints
 * it at the depth of '2. Intellect:', with the braces of its ancestors running
 * on down the margin. The line a diagram hangs from ('I. Principles in
 * himself') was set as a paragraph above it. Nothing throws when a diagram
 * loses its shape, so these cases hold the parser to the printed pages.
 *
 * The block is ported from the owner's reader-core.js; update these cases only
 * against it and the facsimile.
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SRC = "assets/js/port/reader-core.js";
const src = readFileSync(SRC, "utf8");
const block = src.slice(src.indexOf("function ramIsList("), src.indexOf("// Detect a run-on table-of-contents"));
const ctx = { inl: (s) => String(s) };
vm.createContext(ctx);
vm.runInContext(block, ctx);

let failed = 0;
const check = (name, ok) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) failed++; };
const depths = (nodes, d = 0, out = []) => { for (const n of nodes) { out.push([d, n.text]); depths(n.children, d + 1, out); } return out; };
const at = (tree, text) => (depths(tree).find(([, t]) => t === text) || [])[0];

// pp. 257-258 as the reading text holds them
const P257 = "I. Principles in himself: which are,\n    - I. Active, viz.:\n        - I. Mental nature,\n            - 2. As to form: Essential Virtue; viz.:\n                - 1. The most active vital virtue:\n                - 2. Intellect:";
const P258 = "                - 3. Will:\n        - II. Sensitive animal nature: which formally is Virtue:\n            - 1. More active,\n        - III. Fiery vegetative nature:\n            - Which is:";

const a = ctx.ramTeiParts(P257), b = ctx.ramTeiParts(P258);
const t257 = ctx.ramParse(a.list), t258 = ctx.ramParse(b.list);
check("p. 257: the line the diagram hangs from is its root", a.lead === "" && t257.length === 1 && t257[0].text === "I. Principles in himself: which are,");
check("p. 258: '3. Will:' at the depth of '2. Intellect:'", at(t258, "3. Will:") === at(t257, "2. Intellect:") && at(t258, "3. Will:") === 4);
check("p. 258: 'II. Sensitive animal nature' at the depth of 'I. Mental nature'", at(t258, "II. Sensitive animal nature: which formally is Virtue:") === at(t257, "I. Mental nature,"));
const html = ctx.ramHTML(b.list);
check("p. 258: the four ancestors run on as plain rules (.rcont), unlabelled", (html.match(/rnode rcont/g) || []).length === 4 && !/rlabel rparent"><\/div>/.test(html));
const p7 = ctx.ramTeiParts("1. The slothful, the hasty, the weary.\n- 2. The dull.\n- 3. The proud.");
check("p. 7: a numbered first member without its dash joins its siblings", p7.lead === "" && ctx.ramParse(p7.list).length === 3);
const p215 = ctx.ramTeiParts("we are ignorant:) and both he appointed them.\n    - 5. On the fifth day.\n    - 7. God loves himself: to be observed by men. -");
const t215 = ctx.ramParse(p215.list);
check("p. 215: a member's carried-over end stays with the members; a stray end dash goes",
  at(t215, "we are ignorant:) and both he appointed them.") === 1 && at(t215, "7. God loves himself: to be observed by men.") === 1);
const prose = ctx.ramTeiParts("For the most part (yet to be corrected.) Not for: -\n- 1. The slothful.\n- 2. The dull.");
check("a prose line above a list at its own depth stays a paragraph", prose.lead === "For the most part (yet to be corrected.) Not for:");
check("an ordinary diagram is unchanged", !ctx.ramHTML("- I. Active\n    - 1. Readiness.\n    - 2. Fortitude.").includes("rcont"));

if (failed) { console.error(`${failed} brace-diagram check(s) failed`); process.exit(1); }
console.log("brace diagrams: all checks pass");
