#!/usr/bin/env node
// The Patrologia Latina reader must not print the source edition's note and
// page numerals as if they were prose (owner reports on pld-5640 and pld-4951).
//
// The Migne export keeps the printed edition's running numerals as loose
// tokens inside the text ("quisquam 341 bene proferre"), in both lanes, and
// puts a bare page number in a paragraph of its own. FRPldReading.cleanPrintMarks
// removes them by sequence: a numeral between words that continues a run, or
// opens one the next numerals prove. This check pins both halves: the marks
// go, and a real numeral ("epistolam 51 ad Joannem", "cap. 3", "1.", "(Abac. 3. 3)")
// stays. The fixture text is copied from the live TEI.
//
// Run: node scripts/check-pld-print-marks.mjs

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { cleanPrintMarks } = require(path.join(here, "../assets/js/port/pld-reading.js"));

// Just enough DOM for head/p/hi text: elements, text nodes, attributes.
function parse(xml) {
  const root = { nodeType: 1, name: "#root", attrs: {}, childNodes: [], parentNode: null };
  let cur = root;
  for (const tok of xml.match(/<[^>]+>|[^<]+/g) || []) {
    if (tok[0] !== "<") { const t = { nodeType: 3, data: tok, parentNode: cur }; cur.childNodes.push(t); continue; }
    if (tok[1] === "/") { cur = cur.parentNode; continue; }
    const name = /^<([\w:]+)/.exec(tok)[1], attrs = {};
    for (const m of tok.matchAll(/([\w:]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
    const el = { nodeType: 1, name, attrs, childNodes: [], parentNode: cur };
    cur.childNodes.push(el);
    if (!tok.endsWith("/>")) cur = el;
  }
  const text = n => n.nodeType === 3 ? n.data : n.childNodes.map(text).join("");
  const wrap = n => {
    if (n.nodeType !== 1) return n;
    n.getAttribute = k => n.attrs[k] ?? null;
    Object.defineProperty(n, "textContent", { get: () => text(n) });
    n.removeChild = c => { n.childNodes.splice(n.childNodes.indexOf(c), 1); };
    n.childNodes.forEach(wrap);
    return n;
  };
  wrap(root);
  const all = (n, out = []) => { for (const c of n.childNodes) if (c.nodeType === 1) { out.push(c); all(c, out); } return out; };
  root.querySelectorAll = sel => all(root).filter(e => sel.split(",").includes(e.name));
  root.createTreeWalker = undefined;
  return root;
}
const lane = (doc, l) => doc.querySelectorAll("p,head").filter(e => (e.attrs["xml:lang"] === "en") === (l === "en")).map(e => e.textContent.replace(/\s+/g, " ").trim());

let failed = 0;
const eq = (got, want, label) => { if (JSON.stringify(got) !== JSON.stringify(want)) { failed++; console.error("FAIL " + label + "\n  got:  " + JSON.stringify(got) + "\n  want: " + JSON.stringify(want)); } };

// pld-4951 (Fulgentius, PL 65 col. 507): a page number as a paragraph, then one inline at a time.
{
  const doc = parse(`<body>
<p xml:lang="la"><hi rend="bold">340</hi></p><p xml:lang="en">340</p>
<p xml:lang="la">CAPUT PRIMUM.</p>
<p xml:lang="la">non possit. Illud quo nos arguendos putavit ita male protulit, ut hoc quisquam 341 bene proferre non possit. Quis est, qui est Dei 342 virtus, et sapientia? Quisquis Trinitatem separabilem</p>
<p xml:lang="la">Quid 343 Deo enim nostro? Hic 344 est. Et eorum Deus 1 de longinquo. Is 2 et asserere. Splendor 3 , et figura.</p>
<p xml:lang="en">no one 341 could bring this forth well. The 342 power of God, 343 and 344 more.</p></body>`);
  const n = cleanPrintMarks(doc);
  eq(lane(doc, "la"), ["CAPUT PRIMUM.", "non possit. Illud quo nos arguendos putavit ita male protulit, ut hoc quisquam bene proferre non possit. Quis est, qui est Dei virtus, et sapientia? Quisquis Trinitatem separabilem", "Quid Deo enim nostro? Hic est. Et eorum Deus de longinquo. Is et asserere. Splendor, et figura."], "4951 Latin");
  eq(lane(doc, "en"), ["no one could bring this forth well. The power of God, and more."], "4951 English");
  eq(n, 2 + 7 + 4, "4951 count");
}

// pld-5640 (Jerome): a letter title carrying its marks, and real numerals that must stay.
{
  const doc = parse(`<body>
<p xml:lang="la"><hi rend="bold">305</hi></p>
<p xml:lang="la">EPISTOLA LVII 785 . AD PAMMACHIUM. De optimo genere interpretandi.</p>
<p xml:lang="en">LETTER LVII 785 . TO PAMMACHIUS. On the best method of translating.</p>
<p xml:lang="en">Rufinus 786 cavilled, and 787 then 788 more.</p>
<p xml:lang="la">Cum, quod Epiphanii superiorem epistolam 51 ad Joannem Episcopum non recte transtulisset, Ruffinus 786 cavillaretur, de Abacuc (Abac. 3. 3) : unde 787 et sponsa, 788 dicens, 789 in capite 3 libri.</p>
<p xml:lang="la">Lib. 2 Cap. 4 et Ps. 118 sunt versus 5 quidam 119 tantum.</p>
<head xml:lang="la">EPISTOLA XLVIII 591 , SEU LIBER 592 APOLOGETICUS 593 .</head></body>`);
  cleanPrintMarks(doc);
  eq(lane(doc, "la"), [
    "EPISTOLA LVII. AD PAMMACHIUM. De optimo genere interpretandi.",
    "Cum, quod Epiphanii superiorem epistolam 51 ad Joannem Episcopum non recte transtulisset, Ruffinus cavillaretur, de Abacuc (Abac. 3. 3) : unde et sponsa, dicens, in capite 3 libri.",
    "Lib. 2 Cap. 4 et Ps. 118 sunt versus 5 quidam 119 tantum.",
    "EPISTOLA XLVIII, SEU LIBER APOLOGETICUS."], "5640 Latin");
  eq(lane(doc, "en"), ["LETTER LVII. TO PAMMACHIUS. On the best method of translating.", "Rufinus cavilled, and then more."], "5640 English");
}

// An index-style run of lone numbers is left to the caller's gate, but a single numeral never moves.
{
  const doc = parse(`<body><p xml:lang="la">Anno 1500 natus est, et anno 1560 mortuus; capitulum 12 est.</p></body>`);
  cleanPrintMarks(doc);
  eq(lane(doc, "la"), ["Anno 1500 natus est, et anno 1560 mortuus; capitulum 12 est."], "isolated numerals stay");
}

if (failed) { console.error(failed + " print-mark check(s) failed"); process.exit(1); }
console.log("pld print marks: ok");
