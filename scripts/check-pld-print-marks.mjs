#!/usr/bin/env node
// The Patrologia Latina reader must not print the source edition's note and
// page numerals as if they were prose (owner reports on pld-5640 and pld-4951).
//
// The Migne export keeps the printed edition's running numerals as loose
// tokens inside the text ("quisquam 341 bene proferre"), in both lanes, and
// puts a bare page number in a paragraph of its own. FRPldReading.cleanPrintMarks
// removes them by sequence: a numeral between words that continues a run, or
// opens one the next four prove across two paragraphs. This check pins both halves: the marks
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
    n.setAttribute = (k, v) => { n.attrs[k] = v; };
    n.removeAttribute = k => { delete n.attrs[k]; };
    n.childNodes.forEach(wrap);
    return n;
  };
  wrap(root);
  const all = (n, out = []) => { for (const c of n.childNodes) if (c.nodeType === 1) { out.push(c); all(c, out); } return out; };
  root.querySelectorAll = sel => all(root).filter(e => sel.split(",").includes(e.name));
  root.createTreeWalker = undefined;
  root.documentElement = root;
  root.querySelector = sel => all(root).find(e => e.name === sel.split(">").pop().trim()) || null;
  return root;
}


const lane = (doc, l) => doc.querySelectorAll("p,head").filter(e => (e.attrs["xml:lang"] === "en") === (l === "en")).map(e => e.textContent.replace(/\s+/g, " ").trim());
const all = doc => lane(doc, "la").concat(lane(doc, "en"));
let failed = 0;
const eq = (got, want, label) => { if (JSON.stringify(got) !== JSON.stringify(want)) { failed++; console.error("FAIL " + label + "\n  got:  " + JSON.stringify(got) + "\n  want: " + JSON.stringify(want)); } };
const clean = (xml) => { const d = parse(xml); const n = cleanPrintMarks(d); return { d, n }; };
const unchanged = (xml, label) => { const d = parse(xml); const before = all(d); cleanPrintMarks(d); eq(all(d), before, label); };

// pld-4951 (Fulgentius, PL 65 col. 507): a page number paragraph, then marks 341.. and notes 1..5.
{
  const { d } = clean(`<body>
<p xml:lang="la"><hi rend="bold">340</hi></p><p xml:lang="en">340</p>
<p xml:id="a" xml:lang="la">ut hoc quisquam 341 bene proferre. Quis est, qui est Dei 342 virtus, et sapientia? Quid 343 Deo enim nostro? Hic 344 est. Et eorum Deus 1 de longinquo. Is 2 et asserere.</p>
<p corresp="#a" xml:lang="en">no one 341 could bring this forth well. The 342 power of God, 343 and 344 more. And 1 far off.</p>
<p xml:id="b" xml:lang="la">Splendor 3 , et figura. Deus 345 ait 346 sic 347 itaque. Rursus 4 dicit, 5 etiam.</p></body>`);
  eq(lane(d, "la"), ["340", "ut hoc quisquam bene proferre. Quis est, qui est Dei virtus, et sapientia? Quid Deo enim nostro? Hic est. Et eorum Deus de longinquo. Is et asserere.", "Splendor, et figura. Deus ait sic itaque. Rursus dicit, etiam."], "4951 Latin");
  eq(lane(d, "en")[1], "no one could bring this forth well. The power of God, and more. And far off.", "4951 English");
  // the page number stays as a hidden placeholder: block ids count paragraphs
  eq(d.querySelectorAll("p").filter(p => p.attrs.rend === "pagemark").length, 2, "page numbers kept as placeholders");
}

// pld-5640 (Jerome): a letter title carrying its marks.
{
  const { d } = clean(`<body>
<p xml:lang="la">EPISTOLA LVII 785 . AD PAMMACHIUM. De optimo genere interpretandi. Ruffinus 786 cavillaretur.</p>
<p xml:lang="la">Et sponsa 787 dicens, 788 in monte, 789 domus 790 fine. Simile 791 rursus 792 quod 793 aliud 794 sequitur.</p>
<p xml:lang="en">LETTER LVII 785 . TO PAMMACHIUS. Rufinus 786 carped.</p>
<p xml:lang="en">And 787 saying, 788 on the hill, 789 of the house 790 end.</p></body>`);
  eq(lane(d, "la").slice(0, 2), ["EPISTOLA LVII. AD PAMMACHIUM. De optimo genere interpretandi. Ruffinus cavillaretur.", "Et sponsa dicens, in monte, domus fine. Simile rursus quod aliud sequitur."], "5640 Latin");
  eq(lane(d, "en"), ["LETTER LVII. TO PAMMACHIUS. Rufinus carped.", "And saying, on the hill, of the house end."], "5640 English");
}

// Real numerals stay: years in annals, short runs, citations, words that name a reference.
unchanged(`<body><title>Annals</title><p xml:lang="la">Anno 976 destruxit. Anno 977 venit. Anno 978 obiit. Anno 979 mansit. Anno 980 rediit. Anno 981 fuit.</p><p xml:lang="la">Anno 982 e. Anno 983 f.</p></body>`, "annals title: nothing touched");
unchanged(`<body><p xml:lang="la">Anno 976 destruxit. Anno 977 venit. Anno 978 obiit. Anno 979 mansit. Anno 980 rediit. Anno 981 fuit.</p><p xml:lang="la">Anno 982 e. Anno 983 f. Anno 984 g.</p></body>`, "years after 'Anno'");
unchanged(`<body><p xml:lang="la">Hoc libro 1 dicitur, et libro 2 dicitur, et libro 3 dicitur.</p><p xml:lang="la">Psalmo 50, 51, 52 dicitur.</p></body>`, "libro 1/2/3 and psalmo 50, 51, 52");
unchanged(`<body><p xml:lang="en">In Book 1 Amor. we read, and in Book 2 too, and Book 3, chapter 5 and ch. 2 and ch. 3.</p><p xml:lang="en">See epistle 2 of book XI and epistle 3 and letter 4 and verse 5.</p></body>`, "English references");
unchanged(`<body><p xml:lang="la">Una 1 Pater 2 Filius 3 Spiritus.</p><p xml:lang="la">Et iterum 1 Pater 2 Filius 3 Spiritus.</p></body>`, "short enumeration");
unchanged(`<body><p xml:lang="la">in qua (Coloss. II, 20 et 21) dicit, et (Psal. CXXXVIII, 7) item, Joan. XIX, 26 sic, et (Matth. V, 22 et 23).</p><p xml:lang="la">Alia (Ibid. 24) (Luc. 25 et 26).</p></body>`, "citation numerals");
unchanged(`<body><p xml:lang="la">Gussanv., caecum quippe. 2 Carnot. et 3 Gemet. 4 Alii 5 Bened. 6 Vat.</p></body>`, "apparatus line keeps its keys");
unchanged(`<body><p xml:lang="la">Anno 1500 natus est, et anno 1560 mortuus; capitulum 12 est.</p></body>`, "isolated numerals stay");

// Atomic: a failure part-way leaves every node as printed.
{
  const d = parse(`<body><p xml:lang="la">a 1 b 2 c 3 d 4 e 5 f 6 g</p><p xml:lang="la">h 7 i 8</p></body>`);
  const before = all(d);
  const p = d.querySelectorAll("p")[0];
  p.setAttribute = () => { throw new Error("boom"); };
  d.querySelectorAll("p")[1].textContent;               // exercise getter
  const bare = parse(`<body><p xml:lang="la">340</p><p xml:lang="la">a 1 b 2 c 3 d 4 e 5 f 6 g</p><p xml:lang="la">h 7 i 8</p></body>`);
  const ps = bare.querySelectorAll("p");ps[0].setAttribute = () => { throw new Error("boom"); };
  const was = all(bare);
  eq(cleanPrintMarks(bare), 0, "failure returns 0");
  eq(all(bare), was, "failure restores every node");
}

if (failed) { console.error(failed + " print-mark check(s) failed"); process.exit(1); }
console.log("pld print marks: ok");
