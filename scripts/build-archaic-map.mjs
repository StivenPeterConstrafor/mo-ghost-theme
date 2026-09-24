#!/usr/bin/env node
/*
 * Build assets/data/faith-received/archaic-map.txt, the Modernizer's
 * spelling map: Early Modern spellings that occur in this library, each
 * with its modern form.
 *
 * SOURCE. MorphAdorner (Northwestern University), whose Early Modern
 * English spelling pairs and lexicon were built from the same EEBO-TCP
 * texts our "eebo" collection comes from. NCSA licence (permissive; the
 * copyright notice and disclaimer travel in the output header):
 *   https://github.com/travisbrown/morphadorner  data/ememergedspellingpairs.tab
 *                                               data/emelexicon.lex
 * VARD 2 (Lancaster) was considered and NOT used: its data is CC BY-NC-SA,
 * and a ShareAlike file cannot sit in this repository's asset tree.
 *
 * NOTHING IS IMPORTED UNCHECKED. A MorphAdorner pair becomes a map line
 * only if all of these hold:
 *   - the variant occurs at least MIN_TF times in our English corpus
 *     (EEBO + curated + confessions), so the file only carries what our
 *     readers can meet;
 *   - the variant is not a grammar word (thou, ye, hath, then, art...),
 *     which the engine decides in context, and not an -eth/-est verb,
 *     which the engine's morphology handles and this script checks;
 *   - the modern form is a word: every part of it is in SCOWL (size 70)
 *     or in the library's own lexicon;
 *   - inflection agrees: a plural stays plural, -ing stays -ing;
 *   - if the variant is ALSO a modern word (SCOWL size 70, American or
 *     British: doe, wee, hole, honor, allegorize), it is left as printed
 *     unless it is on OVERLAP_OK, a short list read through by hand; the
 *     two that are modern nouns carry flag "n" and the engine leaves
 *     them alone after a determiner ("a doe");
 *   - the engine's rules do not already produce the same answer (those
 *     lines would only cost bytes).
 * Second-person verbs ("knowest" -> "know") ship with flag "2" when
 * MorphAdorner's lexicon tags them second person at least 90% of the
 * time; the engine converts those without needing "thou" in view.
 *
 *   node scripts/build-archaic-map.mjs --ma <morphadorner data dir>
 *        --scowl <scowl final/ dir> --archive /Users/ianharber/tfr-archive
 *        [--freq f.json] [--latin-freq l.json] [--caps-freq c.json]
 *        [--report report.txt]
 *
 * The three --*-freq files cache the corpus counts (English words, Latin
 * words, mid-sentence capitals); each takes a few minutes to count.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "assets/data/faith-received/archaic-map.txt");
const LEX = path.join(ROOT, "assets/data/faith-received/modern-words.txt");
const ENGINE = path.join(ROOT, "assets/js/faith-modernize.js");

const MIN_TF = 5;
const SECOND_SHARE = 0.9;

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const MA = arg("ma");
const SCOWL = arg("scowl");
const ARCHIVE = arg("archive", "/Users/ianharber/tfr-archive");
const FREQ = arg("freq");
const LATIN_FREQ = arg("latin-freq");
const CAPS_FREQ = arg("caps-freq");
const REPORT = arg("report");
if (!MA || !SCOWL) {
  console.error("usage: build-archaic-map.mjs --ma <dir> --scowl <dir> [--archive dir] [--freq file]");
  process.exit(2);
}

// ── corpus frequencies ────────────────────────────────────────────────
function countArchive() {
  const tf = Object.create(null);
  const WORD = /[A-Za-zÀ-ɏ̀-ͯꝭꝯ]+(?:['’][A-Za-z]+)*/g;
  for (const coll of ["eebo", "mo", "confessions"]) {
    const dir = path.join(ARCHIVE, coll);
    for (const f of fs.readdirSync(dir)) {
      if (coll !== "eebo" && !f.endsWith(".en.md")) continue;
      let t = fs.readFileSync(path.join(dir, f), "utf8");
      t = t.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/\*/g, "").normalize("NFC");
      for (const m of t.matchAll(WORD)) {
        const w = m[0].toLowerCase().replace(/’/g, "'");
        tf[w] = (tf[w] || 0) + 1;
      }
    }
  }
  return tf;
}
let tf;
if (FREQ && fs.existsSync(FREQ)) tf = Object.assign(Object.create(null), JSON.parse(fs.readFileSync(FREQ, "utf8")).tf);
else {
  tf = countArchive();
  if (FREQ) fs.writeFileSync(FREQ, JSON.stringify({ tf }));
}

// How often each word is printed with a capital in mid-sentence. A
// spelling that is capitalized there more often than not is a name
// ("Mary", "Moore", "Lawrence", "Denny"), and no map line or rule may
// respell it; "poore" (2%) is not.
function countCaps() {
  const caps = Object.create(null);
  const WORD = /[A-Za-zÀ-ɏ\u0300-\u036fꝭꝯ]+(?:['’][A-Za-z]+)*/g;
  for (const coll of ["eebo", "mo", "confessions"]) {
    const dir = path.join(ARCHIVE, coll);
    for (const f of fs.readdirSync(dir)) {
      if (coll !== "eebo" && !f.endsWith(".en.md")) continue;
      let t = fs.readFileSync(path.join(dir, f), "utf8");
      t = t.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/\*/g, "").normalize("NFC");
      for (const m of t.matchAll(WORD)) {
        const w = m[0];
        if (!/^[A-Z]/.test(w) || w === w.toUpperCase()) continue;
        const before = t.slice(Math.max(0, m.index - 3), m.index).replace(/ +$/, "");
        if (!before || /[.!?\n¶"(]$/.test(before)) continue;
        const k = w.toLowerCase().replace(/’/g, "'");
        caps[k] = (caps[k] || 0) + 1;
      }
    }
  }
  return caps;
}
let caps;
if (CAPS_FREQ && fs.existsSync(CAPS_FREQ)) caps = Object.assign(Object.create(null), JSON.parse(fs.readFileSync(CAPS_FREQ, "utf8")).caps);
else {
  caps = countCaps();
  if (CAPS_FREQ) fs.writeFileSync(CAPS_FREQ, JSON.stringify({ caps }));
}
// Early Modern printers capitalize nouns ("the Lorde", "the Churche"),
// so a capital alone does not make a name: the spelling must also be a
// name in SCOWL's name lists.
const isName = (w) => (caps[w] || 0) >= 0.5 * (tf[w] || 1) && (caps[w] || 0) >= 3 && scowlNames.has(w);

// The Latin originals (Patrologia Latina, the native Latin works,
// Augustine), counted the same way. MorphAdorner's pairs carry Latin:
// "sua" -> "suam", "causa" -> "causam", "sed" -> "said", "panis" ->
// "paris", because EEBO quotes Latin and prints its endings with a
// macron. A form proportionally commoner in our Latin than in our
// English is Latin, and is left alone.
function countLatin() {
  const counts = Object.create(null);
  const WORD = /[A-Za-zÀ-ɏ]+/g;
  for (const coll of ["pld", "augustine"]) {
    const dir = path.join(ARCHIVE, coll);
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".orig.md")) continue;
      const t = fs.readFileSync(path.join(dir, f), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").normalize("NFC");
      for (const m of t.matchAll(WORD)) {
        const w = m[0].toLowerCase();
        counts[w] = (counts[w] || 0) + 1;
      }
    }
  }
  return counts;
}
let latin;
if (LATIN_FREQ && fs.existsSync(LATIN_FREQ)) latin = Object.assign(Object.create(null), JSON.parse(fs.readFileSync(LATIN_FREQ, "utf8")).tf);
else {
  latin = countLatin();
  if (LATIN_FREQ) fs.writeFileSync(LATIN_FREQ, JSON.stringify({ tf: latin }));
}
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const N_EN = sum(tf);
const N_LA = sum(latin);
const isLatin = (w) => ((latin[w] || 0) / N_LA) >= ((tf[w] || 0) / N_EN);

// ── word lists ────────────────────────────────────────────────────────
const scowl = new Map(); // word -> smallest size it appears at
const scowlLower = new Set(); // common nouns and the rest, not names
const scowlNames = new Set();
for (const f of fs.readdirSync(SCOWL)) {
  const m = /^(english|american|british|british_z|canadian)-(words|upper|proper-names)\.(\d+)$/.exec(f);
  if (!m) continue;
  const size = +m[3];
  for (const w of fs.readFileSync(path.join(SCOWL, f), "latin1").split("\n")) {
    if (!w) continue;
    const k = w.toLowerCase();
    // Names do not make a spelling modern: "Harte" is a surname and
    // "harte" is still heart.
    if (m[2] === "words" && (!scowl.has(k) || size < scowl.get(k))) scowl.set(k, size);
    if (m[2] === "words" && size <= 70 && w === k) scowlLower.add(k);
    if (m[2] !== "words") scowlNames.add(k);
  }
}
const lexText = fs.readFileSync(LEX, "utf8").split("\n---\n");
const COMMON = new Set(lexText[0].split("\n").filter(Boolean));
const isModern = (w, size = 70) => (scowl.get(w) || 999) <= size;
// The modern form has to be modern English. The library's own lexicon is
// not asked: it is harvested from translations that quote Latin.
const isWord = (s) => s.split(/[ -]/).every((p) => isModern(p.toLowerCase(), 80) || (/^[A-Z]/.test(p) && scowlNames.has(p.toLowerCase())));

/* The consonants of a word, in order, with the letters Early Modern
 * printing swapped folded together. A respelling keeps them; a
 * different word does not: "laye" -> "say" and "hir" -> "his" are
 * MorphAdorner errors, "cary" -> "carry" is not. */
function skeleton(w) {
  return w.toLowerCase().replace(/e$/, "").replace(/(.)\1+/g, "$1")
    .replace(/^ae/, "e").replace(/^i(?=[aeiou])/, "j").replace(/^v(?=[^aeiou])/, "u")
    .replace(/^gh/, "g").replace(/^quh/, "wh").replace(/tch/g, "ch")
    .replace(/e$/, "").replace(/(e?d|t)$/, "t").replace(/c(?=[eiy])/g, "s")
    .replace(/ph/g, "f").replace(/ck/g, "k").replace(/[ck]/g, "k").replace(/gh/g, "")
    .replace(/[vu]/g, "u").replace(/[yij]/g, "i").replace(/[^a-z]/g, "")
    .replace(/[aeiouwh]/g, "").replace(/(.)\1+/g, "$1");
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}
const sameWord = (v, s) => {
  const a = skeleton(v);
  const b = skeleton(s.replace(/'s$/, "s"));
  if (a === b || a + "s" === b) return true;
  return lev(a, b) <= 1 && a.charAt(0) === b.charAt(0) && Math.min(a.length, b.length) >= 3;
};

// Respellings the consonant test is too strict for, read and admitted.
const SKELETON_OK = new Set((
  "choyse twise twyse vitious ayenst dout syon eyen reioyse auctoritie " +
  "aucthoritie auctorite auctoryte ilande ilandes wifes coelestial seised " +
  "seise seased choise"
).split(" "));

// Two- and three-letter forms are abbreviations, Latin or fragments far
// more often than words ("rom." is Romans, "ver." is verse, "sed" is
// Latin). Only these are taken.
const SHORT_OK = new Set("al yn wil wel yf ys ful fal fel cal tel wer wyl thi ech fil byn syn thre".split(" "));

// ── MorphAdorner ──────────────────────────────────────────────────────
const pairs = new Map();
for (const line of fs.readFileSync(path.join(MA, "ememergedspellingpairs.tab"), "utf8").replace(/^﻿/, "").split("\n")) {
  const [v, s] = line.split("\t");
  if (!v || !s) continue;
  const k = v.toLowerCase();
  if (!pairs.has(k)) pairs.set(k, s.trim());
}
const lexicon = new Map(); // word -> {total, readings:[{pos, lemma, n}]}
for (const line of fs.readFileSync(path.join(MA, "emelexicon.lex"), "utf8").replace(/^﻿/, "").split("\n")) {
  const p = line.split("\t");
  if (p.length < 5) continue;
  const readings = [];
  for (let i = 2; i + 2 < p.length + 1; i += 3) readings.push({ pos: p[i], lemma: p[i + 1], n: +p[i + 2] || 0 });
  lexicon.set(p[0].toLowerCase(), { total: +p[1] || 0, readings });
}

// ── the engine, without a map, to see what the rules already do ──────
const win = {};
new Function("window", fs.readFileSync(ENGINE, "utf8"))(win);
const FM = win.FaithModernize;
const known = new Set(lexText[0].split("\n").concat((lexText[1] || "").split("\n")).filter(Boolean));
FM.setLexicon(new Set(COMMON), known);
const ruled = (w) => FM.modernizeText(w).toLowerCase();

// Words the engine decides in context. The map must never speak for them.
const CONTEXT = new Set((
  "ye yee yt wt wc wch yu then than art mine thine myne thy thee thou " +
  "hast wast wert lye lyes lyeth lyed dye dyes dyed dyeth quod wherefore " +
  "wherfore the tho thro altho hath doth doeth doest dost shall shal " +
  "shalt will wilt lo nay yea an and bee dy"
).split(" "));

/* Variants that are ALSO modern words, admitted one by one after reading
 * them in context. The automatic test this replaced (share of the
 * variant's readings that are not itself) admitted "named" -> "nam",
 * "slain" -> "slave" and "heard" -> "herd", because an inflected form's
 * lemma is never the form itself. Everything not on this list that is a
 * modern word (SCOWL size 50) is left as printed: "hart" is a deer in
 * the Psalms, "stile" a stile, "hole" a hole. */
const OVERLAP_OK = new Set((
  "al bin brest cary deere donne howe hyde lowe maine moe paine payne " +
  "payed staid steele sterne waite wee wilde yong greene sharpe townes " +
  "troupe troupes slue sate doe"
).split(" "));

/* Pairs where MorphAdorner and the rules disagree and MorphAdorner is
 * wrong for this library, or the form is genuinely two words. Read
 * through, highest frequency first. Left to the rules or left as
 * printed. */
const MA_REJECT = new Set((
  "tis sayth shalbe seing sone hote implyed ile iles gyue othe noone " +
  "fowle floure dyde fyned mettall leaste heeles withall happely " +
  "widdowes brede barne tyde argueth eche ilands wyt councels councel " +
  "worldes warres saythe twere thow thyne thyn myn fulnesse fulnes " +
  "maruellous hathe dothe dooth diddest haddest wouldest shouldest " +
  "couldest maist maiest mayst peraduenture anone therof therin therby " +
  "therwith therunto therupon foorthwith forasmuche oftentymes sondry " +
  "vnto untoo faine fayne shalte wylt doost whilest thorow viz glose " +
  "comen seyng heer laye hir ger gif powre tha hier sone ond il panis " +
  "une tion celle apolog cont serm rem observ liu octob westm aquin " +
  "hundreth thame eue ave af fre dat bu wi ve ue su ym je ae co qu fy " +
  "ly da eu te sed bene del mis inde ch sam ver rom pag maior aswel " +
  "lifes seinge pease comyn catcht"
).split(" "));

const report = [];
const accepted = new Set(); // variants whose MorphAdorner pair passed every gate
const lines = [];
let stats = { pairs: 0, tf: 0, context: 0, verb: 0, notword: 0, inflect: 0, overlap: 0, ruled: 0, kept: 0, overlapKept: 0, second: 0 };

const plural = (w) => /[^su]s$/.test(w) && !/(ss|us|is|ous)$/.test(w);
for (const [v, s0] of pairs) {
  stats.pairs += 1;
  const n = tf[v] || 0;
  if (n < MIN_TF) { stats.tf += 1; continue; }
  if (!/^[a-z]+$/.test(v)) continue;
  if (v.length <= 3 && !SHORT_OK.has(v) && !OVERLAP_OK.has(v)) { stats.short = (stats.short || 0) + 1; continue; }
  if (isLatin(v)) { stats.latin = (stats.latin || 0) + 1; continue; }
  const s1 = s0;
  const sl = s1.toLowerCase();
  if (sl === v) continue;
  if (CONTEXT.has(v) || MA_REJECT.has(v)) { stats.context += 1; continue; }
  // -eth verbs: MorphAdorner's "-s" answers are checked below instead;
  // a pure respelling ("fealeth" -> "feeleth") is kept, and the engine
  // inflects it. -est: a respelling ("beleeuest" -> "believest") or a
  // participle ("exprest" -> "expressed") is kept; a base form is not.
  // ...and never a base form: MorphAdorner has "remembreth" -> "remember".
  // Only a noun that ends in -th ("moneth" -> "month") is taken.
  if (/(eth|yth)$/.test(v) && (/s$/.test(sl) || !/th$/.test(sl))) { stats.verb += 1; continue; }
  if (/(e?st)$/.test(v) && !/(st|ed)$/.test(sl)) { stats.verb += 1; continue; }
  if (!/^[A-Za-z][A-Za-z' .-]*$/.test(s1) || !isWord(s1.replace(/\.$/, "").replace(/'s$/, ""))) { stats.notword += 1; continue; }
  // MorphAdorner capitalizes some standards ("Poor", "War"); only names
  // keep their capital.
  const s = scowlLower.has(sl.replace(/'s$/, "")) || COMMON.has(sl) ? sl : s1;
  if (plural(v) && (!/s$/.test(sl) || /ss$/.test(sl))) { stats.inflect += 1; continue; }
  // A spelling printed as a name is left alone: "Mary" -> "marry",
  // "Moore" -> "more", "Lawrence" -> "Laurence" are all MorphAdorner's.
  // The few names whose old spelling is not in doubt ("Paule") are in
  // the engine's SETTLED list instead.
  if (isName(v) && !OVERLAP_OK.has(v)) { stats.name = (stats.name || 0) + 1; continue; }
  // "contentments" is a plural, not "contentment's"; only a form that
  // is no modern word ("mens", "womans") gets an apostrophe
  if (/'s$/.test(sl) && isModern(v, 80)) { stats.inflect += 1; continue; }
  // A name keeps its own spelling ("Xantippe", "Hierome"); the few whose
  // modern form is not in doubt are in the engine's SETTLED list.
  if (/^[A-Z]/.test(s) && !OVERLAP_OK.has(v)) { stats.name = (stats.name || 0) + 1; continue; }
  // an abbreviation expanded ("serm" -> "sermon") is not a respelling
  if (sl.startsWith(v) && sl.length - v.length >= 3) { stats.expand = (stats.expand || 0) + 1; continue; }
  if (!sameWord(v, sl) && !SKELETON_OK.has(v)) { stats.skeleton = (stats.skeleton || 0) + 1; report.push(`skeleton ${v} -> ${s1} (tf ${n})`); continue; }
  if (/(ing|yng|inge|ynge)$/.test(v) && !/ing$/.test(sl)) { stats.inflect += 1; continue; }
  let flag = "";
  // Any modern spelling, American or British, is left alone: MorphAdorner
  // standardizes to British forms ("allegorize" -> "allegorise"), and a
  // reader's modern word is not ours to respell.
  if (isModern(v, 70)) {
    if (!OVERLAP_OK.has(v)) { stats.overlap += 1; continue; }
    // Only a modern NOUN needs guarding from "a"/"the": "a doe".
    if (v === "doe" || v === "bin") flag = "n";
    stats.overlapKept += 1;
  }
  // A name in SCOWL, and printed with a capital in mid-sentence often
  // enough to be one here ("Donne" is done, and John Donne): flag c, and
  // the engine leaves the capitalized form alone. ("Lorde" and "Jewes"
  // are capitalized as often, but they are not names.)
  if ((caps[v] || 0) >= 0.05 * n && (caps[v] || 0) >= 3 && scowlNames.has(v)) flag += "c";
  accepted.add(v);
  const r = ruled(v);
  if (!flag && r === sl) { stats.ruled += 1; continue; }
  if (r !== v && r !== sl) report.push(`rule-differs ${v}: rules "${r}", MorphAdorner "${s}" (tf ${n})`);
  lines.push([v, s, flag, n]);
  stats.kept += 1;
}

// Second-person verbs.
for (const [v, lx] of lexicon) {
  if (!/^[a-z]+$/.test(v) || !/(e?st)$/.test(v) || CONTEXT.has(v)) continue;
  if ((tf[v] || 0) < MIN_TF || lx.total < 5) continue;
  if (isModern(v, 70)) continue;
  const second = lx.readings.filter((r) => /2$/.test(r.pos) && /^v/.test(r.pos)).reduce((a, r) => a + r.n, 0);
  if (second / lx.total < SECOND_SHARE) continue;
  const lemma = lx.readings[0].lemma.toLowerCase();
  const past = /^v.d2|^vvd2/.test(lx.readings[0].pos);
  // A present-tense second person IS its lemma: "weenest" -> "ween".
  let out = !past && /^[a-z]+$/.test(lemma) && (COMMON.has(lemma) || isModern(lemma)) ? lemma : FM.modernizeText(`thou ${v}`).replace(/^you /, "");
  if (lemma === "be" || lemma === "have" || lemma === "do") out = FM.modernizeText(`thou ${v}`).replace(/^you /, "");
  if (!out || out === v || out.indexOf(" ") >= 0) {
    report.push(`second-unresolved ${v} (lemma ${lx.readings[0].lemma}, tf ${tf[v]})`);
    continue;
  }
  lines.push([v, out, "2", tf[v]]);
  stats.second += 1;
}

// Third person: check the engine's -eth rule against MorphAdorner.
let ethAgree = 0;
let ethChecked = 0;
for (const [v, s] of pairs) {
  if (!/^[a-z]+eth$/.test(v) || (tf[v] || 0) < MIN_TF || !/s$/.test(s)) continue;
  const lx = lexicon.get(v);
  if (lx && lx.readings.length && !/^v.z|^vvz/.test(lx.readings[0].pos)) continue;
  ethChecked += 1;
  const r = ruled(v);
  if (r === s.toLowerCase()) ethAgree += 1;
  else {
    report.push(`eth-differs ${v}: engine "${r}", MorphAdorner "${s}" (tf ${tf[v]})`);
    // The engine could not place it and MorphAdorner can: ship theirs.
    // Where both answer and disagree the engine's answer stands; those
    // were read through (MorphAdorner has "lendeth" -> "dares").
    if (r === v && isWord(s.toLowerCase())) lines.push([v, s.toLowerCase(), "", tf[v]]);
  }
}

/* Vetoes. The spelling rules only land on words the library's lexicon
 * knows, but that lexicon is harvested from translations and knows
 * names and Latin: "denise" -> "denis", "sanae" -> "sana", "hete" ->
 * "het". Every corpus form the rules would rewrite into something that
 * is not modern English (SCOWL), and every Latin form they would touch
 * at all, gets a "=" line: leave it as printed. */
const mapped = new Set(lines.map((l) => l[0]));
let vetoes = 0;
// Two words in one spelling, read in context and left as printed:
// "pease" is peace and peas, "comyn" is common and cumin.
for (const v of ["pease", "comyn", "sone", "hote", "othe", "fowle", "floure", "brede", "barne", "mettall", "harde", "preste", "lordes", "chese", "prest",
  "happely", "whyther", "noone", "mene", "mone", "herde", "lede", "fonde", "bote",
  "wald", "vyne", "rotes", "comen", "pryse", "pryce"]) {
  const at = lines.findIndex((l) => l[0] === v);
  if (at >= 0) lines.splice(at, 1);
  lines.push([v, "=", "", tf[v] || 0]);
  mapped.add(v);
  vetoes += 1;
}
for (const v of Object.keys(tf)) {
  if ((tf[v] || 0) < MIN_TF || !/^[a-z]+$/.test(v) || mapped.has(v) || accepted.has(v) || v.length < 3) continue;
  const r = ruled(v);
  if (r === v || /\s/.test(r) || !/^[a-z]+$/.test(r)) continue;
  // a modern spelling the rules would still rewrite ("baptise" ->
  // "baptis", because the lexicon happens not to hold it) is vetoed too
  if (isModern(v, 70) || !isWord(r) || isLatin(v) || isName(v)) {
    lines.push([v, "=", "", tf[v]]);
    vetoes += 1;
  }
}
stats.vetoes = vetoes;

lines.sort((a, b) => (a[0] < b[0] ? -1 : 1));
const header = [
  "# The Modernizer's spelling map: Early Modern spelling <TAB> modern spelling [<TAB> flag]",
  "# flag n: the old spelling is also a modern word; left alone after a determiner.",
  "# flag c: often printed as a name; left alone when capitalized in mid-sentence.",
  "# flag 2: a second-person verb (\"knowest\"); converted without \"thou\" in view.",
  "# \"=\" as the modern form: leave the word as printed (the spelling rules would err).",
  "# Built by scripts/build-archaic-map.mjs from MorphAdorner's Early Modern English",
  "# spelling data, filtered to forms that occur in The Faith Received and checked",
  "# against the library's lexicon. MorphAdorner licence (NCSA):",
  "#   Copyright (c) 2006-2013 by Northwestern University. All rights reserved.",
  "#   Developed by: Academic and Research Technologies, Northwestern University.",
  "#   Redistributions must retain this notice, this list of conditions and the",
  "#   following disclaimers. Neither the names of Academic and Research Technologies,",
  "#   Northwestern University, nor the names of its contributors may be used to",
  "#   endorse or promote products derived from this Software without specific",
  "#   prior written permission.",
  "#   THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR",
  "#   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS",
  "#   FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE CONTRIBUTORS",
  "#   OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,",
  "#   WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN",
  "#   CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS WITH THE SOFTWARE.",
];
fs.writeFileSync(OUT, `${header.join("\n")}\n${lines.map((l) => l.slice(0, 3).filter((x, i) => i < 2 || x).join("\t")).join("\n")}\n`);
console.log(JSON.stringify(stats));
console.log(`vetoes: ${stats.vetoes}`);
console.log(`eth check: engine agrees with MorphAdorner on ${ethAgree}/${ethChecked}`);
console.log(`wrote ${lines.length} lines, ${fs.statSync(OUT).size} bytes`);
if (REPORT) fs.writeFileSync(REPORT, report.join("\n"));
