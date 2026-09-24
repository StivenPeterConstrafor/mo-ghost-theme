/*
 * The 1928 Book of Common Prayer, rebuilt as a prayer book.
 *
 *   node scripts/restructure-bcp.mjs <source-texts-dir> <out-dir>
 *
 * Writes <out-dir>/v1/mo/1928-bcp.json. Then run
 *   node scripts/build-english-editions-pages.mjs <out-dir> 1928-bcp --local <out-dir>
 * to write the reader's page files from it.
 *
 * WHY. The curated work on R2 was a flattened scrape: every office but the
 * Daily Office was one section called "The Rite", Prayers and Thanksgivings
 * had been swallowed into the Litany with every one of its titles gone,
 * the Daily Office had lost its rubrics ("Then the Minister shall say,"),
 * and the text still carried the scan's hard line breaks and the source
 * site's navigation ("Go to 1928 Book of Common Prayer", "Book V",
 * "1 chapter"). This rebuilds it from the upstream text files the import
 * was made from (MOCA website/source-texts/1928-bcp-*.txt, scraped from
 * episcopalnet.org), keeping every word of the BCP and nothing else.
 *
 * WHAT IT PRODUCES.
 *   - Offices in the order the 1928 book prints them, each named as the
 *     book names it, divided where the book divides them.
 *   - The Psalter by day and office ("Day 1: Morning Prayer, Psalms 1 to 5"),
 *     each psalm a heading with its Latin incipit.
 *   - Rows that say what they are: rubric, heading, verse (psalms and
 *     canticles, one line per verse), dialogue (versicles and responses,
 *     litany petitions, question and answer, with the people's part marked),
 *     body (prose, unwrapped).
 *   - A coverage check against the live curated work: any live row whose
 *     words do not survive into the new text is printed, so nothing is lost
 *     silently.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = process.argv[2];
const OUT = process.argv[3] || "./out";
if (!SRC) { console.error("usage: node scripts/restructure-bcp.mjs <source-texts-dir> <out-dir>"); process.exit(1); }

const BASE = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };

// ── The book, in the 1928 book's own order ─────────────────────────
// `sub` is the BCP's own subtitle where the source carries one.
const OFFICES = [
  { file: "morning-prayer", part: "The Order for Daily Morning Prayer", short: "Morning Prayer" },
  { file: "evening-prayer", part: "The Order for Daily Evening Prayer", short: "Evening Prayer" },
  { file: "prayers-thanksgivings", part: "Prayers and Thanksgivings", short: "Prayers and Thanksgivings" },
  { file: "litany", part: "The Litany, or General Supplication", short: "The Litany" },
  { file: "penitential-office", part: "A Penitential Office for Ash Wednesday", short: "A Penitential Office" },
  { file: "holy-communion", part: "The Order for the Administration of the Lord’s Supper or Holy Communion", short: "Holy Communion" },
  { file: "baptism", part: "The Ministration of Holy Baptism", short: "Holy Baptism" },
  { file: "offices-instruction", part: "Offices of Instruction", short: "Offices of Instruction" },
  { file: "confirmation", part: "The Order of Confirmation", short: "Confirmation",
    sub: "Or Laying on of Hands upon Those that are Baptized, and come to Years of Discretion" },
  { file: "matrimony", part: "The Form of Solemnization of Matrimony", short: "Matrimony" },
  { file: "churching-women", part: "The Thanksgiving of Women after Child-birth", short: "The Churching of Women",
    sub: "Commonly called the Churching of Women" },
  { file: "visitation-sick", part: "The Order for the Visitation of the Sick", short: "Visitation of the Sick" },
  { file: "communion-sick", part: "The Communion of the Sick", short: "Communion of the Sick" },
  { file: "burial", part: "The Order for the Burial of the Dead", short: "Burial of the Dead" },
  { file: "burial-child", part: "The Burial of a Child", short: "Burial of a Child" },
  { file: "psalter", part: "The Psalter, or Psalms of David", short: "The Psalter" },
  { file: "ordination-deacons", part: "The Form and Manner of Making Deacons", short: "Making of Deacons" },
  { file: "ordination-priests", part: "The Form and Manner of Ordering Priests", short: "Ordering of Priests" },
  { file: "ordination-bishops", part: "The Form of Ordaining or Consecrating a Bishop", short: "Consecrating a Bishop" },
  { file: "litany-ordination", part: "The Litany and Suffrages for Ordinations", short: "Litany for Ordinations" },
  { file: "consecration-church", part: "The Form of Consecration of a Church or Chapel", short: "Consecration of a Church" },
  { file: "institution-ministers", part: "An Office of Institution of Ministers into Parishes or Churches", short: "Institution of Ministers" },
  { file: "catechism", part: "A Catechism", short: "A Catechism",
    sub: "That is to say, an Instruction, to be Learned by Every Person before he be brought to be Confirmed by the Bishop" },
  { file: "family-prayer", part: "Forms of Prayer to be Used in Families", short: "Family Prayer" },
];

// ── Text helpers ────────────────────────────────────────────────────
const curly = (s) => s
  .replace(/(^|[\s(\[—-])"/g, "$1“").replace(/"/g, "”")
  .replace(/(^|[\s(\[—-])'/g, "$1‘").replace(/'/g, "’");
const letters = (s) => s.replace(/[^A-Za-z]/g, "");
const capsRatio = (s) => { const l = letters(s); if (l.length < 3) return 0; let u = 0; for (const c of l) if (c === c.toUpperCase()) u++; return u / l.length; };
const SMALL = new Set(["of", "the", "and", "or", "for", "to", "in", "a", "an", "at", "by", "on", "with", "from", "unto", "upon", "be", "as", "es", "est"]);
// ALL-CAPS source heads to the book's title case. A mixed-case tail
// ("BENEDICTUS. St. Luke i. 68.") is printed that way and kept.
function titleCase(s) {
  let first = true;
  return s.replace(/[A-Za-z’']+/g, (w) => {
    const isFirst = first; first = false;
    if (w !== w.toUpperCase()) return w;
    if (/^(II|III|IV|VI|VII|VIII|IX|XI|XII)$/.test(w)) return w;
    const lw = w.toLowerCase();
    if (!isFirst && SMALL.has(lw)) return lw;
    return w.charAt(0) + w.slice(1).toLowerCase();
  }).replace(/\bSt\. /g, "St. ");
}
const clean = (s) => curly(s.replace(/[ \t]+/g, " ").trim());

// Speaker labels the book prints before a line. V. and R. are handled
// apart: in the catechisms "V." is the fifth commandment.
const LABEL = /^(Minister and People|Priest and People|Bishop and People|Minister|Answer|People|Priest|Bishop|Question|Catechist)\.\s+/;
const LABEL_ALONE = /^(Minister and People|Priest and People|Bishop and People|Minister|Answer|People|Priest|Bishop)\.$/;
const VR = /^(V|R)\.\s+/;
// A response the people make, printed without a label.
const RESPONSE = /^(Have mercy upon (us|him|her|them|the soul of thy servant)\.|Good Lord, deliver (us|him|her|them)\.|Spare (us|him|her|them), good Lord\.|We beseech thee to hear us, good Lord\.|Grant (us|him|her|them) thy peace\.|Lord, have mercy upon us, and (incline|write)\b|And with thy spirit\.|I (do|will)\.$|I will, by God['’]s help\.$|That is my desire\.$)/;
const KYRIE = /^(Lord|Christ), have mercy( upon us)?\.$/;
// "Dixi, custodiam. Psalm xxxix." "Dominus regit me. Psalm xxiii."
const PSALM_HEAD = /^[A-Z][a-z]+(,? [A-Za-z]+)*[.,!?]? Psalm [clxvi]+\.$/;
// "MAGNIFICAT. St. Luke i. 46." "JUBILATE DEO. Psalm c."
const CANTICLE_HEAD = /^([A-Z][A-Z ,]+[A-Z])\. ((?:St\.|Psalm) .+)$/;
const CITATION = /^(\d )?(St\. )?[A-Z][a-z]+\.? [clxvi]+\. \d+(, \d+)*\.$/;

// ── Rubrics ─────────────────────────────────────────────────────────
// A rubric is the book talking about the service, not the service
// itself: third person, about who does what. Decided by its opening and
// its verbs; a sentence of Scripture or a prayer never opens this way.
const RUBRIC_OPEN = new RegExp("^(" + [
  "Then\\b", "Here\\b", "After\\b", "When\\b", "While\\b", "Where\\b", "Whereas\\b", "If\\b", "Upon\\b", "At\\b", "On\\b",
  "This\\b", "That (ended|done)\\b", "But NOTE", "And NOTE", "NOTE\\b", "Note\\b", "In the absence\\b", "Being\\b",
  "During\\b", "Immediately\\b", "Before\\b", "Or\\b", "There (shall|is|may)\\b", "You may\\b", "A (Priest|Deacon|Bishop) shall\\b",
  "(Morning|Evening) Prayer shall\\b",
  "And (then|after|at|when|if|immediately|all|every|the|also|whensoever|here|before|so|being)\\b",
  "And, (before|after|if|when)\\b",
  "The (Minister|Priest|Bishop|Presiding Bishop|Man|Woman|People|same|Deacons?|Sermon|Epistle ended|Decalogue may|following|Master|Family|Institutor|Instituted|Wardens|Senior|new Incumbent|Clerk|Letter|Candidates?|Persons|Sentence|Order|Office|Psalm|Child|laws|Gospel, the Questions|Communion (ended|being done))\\b",
  "All\\b", "Every\\b", "It is\\b", "As occasion\\b", "These (Prayers|Psalms)\\b", "But if\\b", "Inasmuch as it may\\b",
  "And another\\b", "In any\\b", "So soon\\b", "Let (him|her|them|the|one|every)\\b", "Forasmuch as all mortal",
  "Whensoever\\b", "Should\\b", "No\\b", "One of\\b", "Each\\b", "Any\\b", "Unless\\b", "Provided\\b", "In (cases?|places|the time)\\b",
].join("|") + ")");
const RUBRIC_VERB = /\b(shall|may|is to be|are to be|to be (said|used|sung|read|made|given|received)|followeth|follows|following|omitted|appointed|say|saying|answer|kneeling|standing|NOTE|begin|is left)\b/;
const SPOKEN = /\b(thee|thou|thy|thine|ye|we|us|our)\b/;
const RUBRIC_EXACT = new Set([
  "Or this.", "Or this:", "Or else.", "Or this Canticle.", "Or this Psalm.", "Or else this Psalm.", "Or this Prayer.",
  "Then follows,", "Priest and People.", "Minister and People.", "Bishop and People.", "The Bishop.", "The Bishop",
  "The End of the Psalter.", "Or the Creed commonly called the Nicene.",
]);
// Seasons and occasions over a group of sentences or an antiphon, and
// the book's own italic labels.
const OCCASION = /^(Advent|Christmas|Epiphany|Lent|Good Friday|Easter|Ascension|Whitsunday|Trinity Sunday|Thanksgiving Day|MORNING|EVENING|Morning|Evening|In the Morning|At Night|Sunday Morning)\.$/;

function isRubric(t) {
  if (RUBRIC_EXACT.has(t) || OCCASION.test(t)) return true;
  if (/^\[(Here|The)\b.*\]$/.test(t)) return true;             // [Here follows the Second Lesson.]
  if (/^To be (used|said|sung|read|made)\b/.test(t)) return true;
  if (/^Here endeth\b/.test(t)) return true;
  if (CITATION.test(t)) return true;                             // "2 Cor. xiii. 14." under The Grace
  if (/^(On|Upon) [^.]{3,120}\.$/.test(t) && !SPOKEN.test(t)) return true;   // "On Trinity Sunday."
  if (/^(Hear the words of|Hear what comfortable|Hear also what|Let us|The Lord be with you|The Lord’s Name)/.test(t)) return false;
  if (!RUBRIC_OPEN.test(t)) return false;
  if (/\b[IVXL]+\.\s+\d+\.$|\b[ivxl]+\.\s+\d+(,\s*\d+)*\.$/.test(t)) return false; // ends on a citation: a sentence of Scripture
  if (!RUBRIC_VERB.test(t)) return /^(Or|Here|Then|After|When)\b/.test(t) && t.length < 90;
  // Spoken text that opens like a rubric ("If we say that we have no
  // sin"). Rubrics quote incipits ("beginning, We yield thee hearty
  // thanks"), but only after they have said who does what.
  if (SPOKEN.test(t.slice(0, 50))) return false;
  return true;
}

// ── Reading a source file ──────────────────────────────────────────
async function readSource(file) {
  let raw = await readFile(path.join(SRC, `1928-bcp-${file}.txt`), "utf8");
  raw = raw.replace(/([;:,.])(Answer|Minister|People)\. /g, "$1\n$2. ");   // "servant;Answer. Who putteth"
  raw = raw.replace(/Dominus illuininatio\./g, "Dominus illuminatio.");       // scan error in the burial psalm title
  raw = raw.replace(/Psalm\nIxviii\., or/g, "Psalm lxviii., or");                // OCR: "Exsurgat Deus, Psalm Ixviii."
  raw = raw.replace(/the Diocese \* present/g, "the Diocese is present");           // OCR: "*" for "is"
  raw = raw.replace(/([a-z])- ([a-z])/g, "$1$2");                              // print hyphenation: "tem- poral", "out- ward"
  raw = raw.replace(/([a-z]\.|\d\.)(?=[A-Z]{2,}\b)/g, "$1\n");                  // "The Collect.MOST glorious God"
  // Everything through the long rule under the "Source:" line is header.
  const body = raw.replace(/^[\s\S]*?\n={40,}\s*\n/, "");
  const paras = body.split(/\n\s*\n/).map((p) => p.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim()))
    .filter((p) => p.length);
  // Wrapped files were hard-wrapped near 65 columns by the scan; in the
  // others a newline inside a paragraph is the book's own line.
  const lines = body.split("\n").filter((l) => l.trim());
  const mid = lines.filter((l) => l.length >= 55 && l.length <= 75).length / Math.max(1, lines.length);
  return { paras, wrapped: mid > 0.3 };
}

const CRUFT = (t) =>
  /\(1928 BCP\)$/.test(t) || /^1928 BCP\b/.test(t) || /CyberHymnal/.test(t) || /^KALENDAR$/.test(t) ||
  /^Go to 1928 Book of Common/.test(t) || /Copyright|All Rights Reserved|episcopalnet\.org/.test(t);

// Join the scan's hard wraps inside one paragraph, keep the book's lines.
function logicalLines(lines, wrapped) {
  lines = lines.map((l) => l.trim());
  // "Minister." alone on its line speaks the line that follows.
  for (let i = 0; i < lines.length - 1; i++) if (LABEL_ALONE.test(lines[i])) { lines[i] = lines[i] + " " + lines[i + 1]; lines.splice(i + 1, 1); }
  if (!wrapped) return lines;
  // Short lines throughout are the book's own (a hymn, a litany): only a
  // lower-case start continues the line before.
  const short = lines.every((l) => l.length <= 48);
  const out = [];
  for (const l of lines) {
    if (!out.length) { out.push(l); continue; }
    const prev = out[out.length - 1];
    let join;
    if (short) { if (/^[a-z]/.test(l)) out[out.length - 1] = prev + " " + l; else out.push(l); continue; }
    if (LABEL.test(l) || VR.test(l)) join = false;
    else if (l === "Amen.") join = true;
    else if (/^[a-z*]/.test(l)) join = true;
    else if (RESPONSE.test(l)) join = false;
    else if (PROPER_HEAD.test(l)) join = false;
    else if (!/[.;:?!,]$/.test(prev)) join = true;       // the line stopped mid-phrase
    // A prayer opens on a word in capitals ("GREAT and mighty God"),
    // so a title line above it is its own line.
    else if (/[.:]$/.test(prev) && /^(O )?(?!LORD\b)[A-Z]{2,}\b/.test(l)) join = false;
    else join = prev.length >= 45;
    if (join) out[out.length - 1] = prev + " " + l; else out.push(l);
  }
  return out;
}

// Psalm verses from a paragraph. Numbered verses (the Psalter) start at
// their number; elsewhere a verse ends where its second half (after the
// pointing asterisk) ends on a stop and the next line opens a sentence.
function psalmVerses(lines, wrapped, numbered) {
  lines = lines.map((l) => l.trim());
  if (!wrapped) return lines;
  if (numbered) {
    const out = [];
    for (const l of lines) if (!out.length || /^\d+ /.test(l)) out.push(l); else out[out.length - 1] += " " + l;
    return out;
  }
  const star = lines.some((l) => l.includes("*"));
  const out = [];
  for (const l of lines) {
    if (!out.length) { out.push(l); continue; }
    const cur = out[out.length - 1];
    const next = l !== "Amen." && (/^\d+ /.test(l) ||
      (/^[A-Z]/.test(l) && /[.;:?!]$/.test(cur) && (star ? cur.includes("*") : !/^(LORD|God|Lord)\b/.test(l))));
    if (next) out.push(l); else out[out.length - 1] = cur + " " + l;
  }
  return out;
}

// ── Rows ────────────────────────────────────────────────────────────
function labelled(l) {
  const m = l.match(LABEL) || l.match(VR);
  if (!m) return null;
  const label = m[1];
  const who = /^(Answer|People|R)$/.test(label) ? "people" : /and People/.test(label) ? "all" : /^(Question|Catechist)$/.test(label) ? null : "minister";
  return { label: label + ".", text: l.slice(m[0].length), who };
}
function dialogue(L, alternate) {
  const lines = L.map((l, i) => labelled(l) || { text: l, who: alternate ? (i % 2 ? "people" : "minister") : (RESPONSE.test(l) ? "people" : "minister") });
  return { kind: "dialogue", en: L.join("\n"), lines };
}
// "The Collect." "The Epistle. Hebrews xii. 5." "For the Epistle. Acts xx. 17."
const PROPER_HEAD = /^(For the|The) (Collect|Epistle|Gospel|Confession|Absolution)\.(\s|$)/;
// A first line that heads the text under it: the propers, the titles of
// the occasional prayers, a proper preface's feast in capitals.
const LEAD_HEAD = /^((For the|The) (Collect|Epistle|Gospel|Confession|Absolution)\.(\s.*)?|Benediction\.|(A |An )?(Prayer|Thanksgiving|Commendatory Prayer|Absolution|Commendation)\b[^.]*\.|[A-Z][A-Z ]{3,40}[A-Z]\.|Veni, Creator Spiritus\.|(PURIFICATION|CHRISTMAS|EPIPHANY|EASTER|ASCENSION|WHITSUNTIDE|TRINITY SUNDAY|ALL SAINTS)\b.*)$/;

function classifyParagraph(L, ctx) {
  // L: logical lines of one source paragraph (already cleaned).
  if (L.length === 1) {
    const t = L[0];
    if ((PROPER_HEAD.test(t) || /^Benediction\.$/.test(t)) && t.length < 70) return [{ kind: "heading", en: t }];
    if (isRubric(t)) return [{ kind: "rubric", en: t }];
    if (LABEL.test(t)) return [dialogue([t])];
    if (RESPONSE.test(t)) return [{ kind: "dialogue", en: t, lines: [{ text: t, who: "people" }] }];
    if (/ \*( |$)/.test(t)) return [{ kind: "verse", en: t }];
    return [{ kind: "body", en: t }];
  }
  const first = L[0], rest = L.slice(1);
  const at = L.findIndex((l, i) => i > 0 && PROPER_HEAD.test(l));
  if (at > 0) return [...classifyParagraph(L.slice(0, at), ctx), ...classifyParagraph(L.slice(at), ctx)];
  if (LEAD_HEAD.test(first) && first.length < 130) {
    const h = /^[A-Z ,]+\.$/.test(first) ? titleCase(first) : first;
    const toc = /^((A |An )?(Prayer|Thanksgiving|Commendatory|Commendation)|LITANY)/.test(first);
    return [{ kind: "heading", en: h, ...(toc ? { toc } : {}) }, ...classifyParagraph(rest, ctx)];
  }
  if (isRubric(first) && !LABEL.test(first)) return [{ kind: "rubric", en: first }, ...classifyParagraph(rest, ctx)];
  if (L.every((l) => KYRIE.test(l))) {
    // "Lord, have mercy upon us. / Lord, have mercy upon us." is said and
    // answered; the threefold Lord, Christ, Lord is said by all.
    return L.length === 2 && L[0] === L[1] ? [dialogue(L, true)] : [{ kind: "verse", en: L.join("\n") }];
  }
  if (L.some((l) => VR.test(l)) && L.some((l) => /^R\. /.test(l))) return [dialogue(L)];
  if (L.some((l) => LABEL.test(l))) {
    // "Let us pray." and then the prayer itself: the prayer is its own row.
    const cut = L.findIndex((l, i) => i > 0 && !LABEL.test(l) && l.length > 100 && /^(O )?(?!LORD\b)[A-Z]{2,}\b/.test(l));
    return cut > 0 ? [dialogue(L.slice(0, cut)), ...classifyParagraph(L.slice(cut), ctx)] : [dialogue(L)];
  }
  if (L.filter((l) => / \*( |$)/.test(l)).length >= Math.ceil(L.length / 2)) return [{ kind: "verse", en: L.join("\n") }];
  // Litany petitions, suffrages and the anthem: said and answered in turn.
  if (L.length % 2 === 0 && L.every((l, i) => i % 2 === 0 || RESPONSE.test(l))) return [dialogue(L, true)];
  if (L.length === 2 && L[1].length <= 100 && !/^(O )?[A-Z]{2,}\b/.test(L[1])) return [dialogue(L, true)];
  if (ctx.litany && L.length > 2 && L.every((l) => /[.;:]$/.test(l))) return [dialogue(L, true)];
  // A prayer after "Let us pray.", a title over its text: each line its own row.
  if (L.some((l) => /^(O )?(?!LORD\b)[A-Z]{2,}\b/.test(l) && l.length > 100)) {
    const out = [];
    let buf = [];
    const flush = () => { if (buf.length) out.push(...classifyParagraph(buf, ctx)); buf = []; };
    for (const l of L) { if (l.length <= 60) buf.push(l); else { flush(); out.push(...classifyParagraph([l], ctx)); } }
    flush();
    return out;
  }
  return [{ kind: "verse", en: L.join("\n") }];
}

// Rows that belong together in the book's setting: a versicle and its
// response printed as separate paragraphs, a commandment and the people's
// answer, a question and its answer.
function knit(rows, ctx) {
  const out = [];
  for (const r of rows) {
    const prev = out[out.length - 1];
    // "[for the LORD will not hold him guiltless ...]": the inset half of
    // a commandment, not a rubric.
    if (r.kind === "body" && /^\[[a-z]/.test(r.en) && prev) { prev.en += " " + r.en; if (prev.lines) prev.lines[prev.lines.length - 1].text += " " + r.en; continue; }
    if (r.kind === "dialogue" && prev) {
      if (prev.kind === "dialogue") { prev.lines.push(...r.lines); prev.en += "\n" + r.en; continue; }
      const f = r.lines[0];
      if (prev.kind === "body" && f.who === "people" && (prev.en.length <= 90 || RESPONSE.test(f.text))) {
        out.pop();
        r.lines.unshift({ text: prev.en, who: /\?$/.test(prev.en) && ctx.catechism ? null : "minister" });
        r.en = prev.en + "\n" + r.en;
        const pp = out[out.length - 1];
        if (pp && pp.kind === "dialogue") { pp.lines.push(...r.lines); pp.en += "\n" + r.en; continue; }
      }
    }
    if (r.kind === "dialogue" && prev && prev.kind === "body" && ctx.catechism && /\?$/.test(prev.en) && r.lines[0].label === "Answer.") r.lines[0].who = null;
    if (r.kind === "body" && prev && prev.kind === "dialogue" && /^Let us pray\.$/.test(r.en)) {
      prev.lines.push({ text: r.en, who: "minister" }); prev.en += "\n" + r.en; continue;
    }
    if (r.kind === "verse" && prev && prev.kind === "verse" && !r.en.includes("\n")) { prev.en += "\n" + r.en; continue; }
    out.push(r);
  }
  // The catechumen's answers are not the people's responses.
  for (const r of out) if (r.kind === "dialogue") r.lines.forEach((x, i) => {
    const p = r.lines[i - 1];
    if (x.label === "Answer." && p && (p.label === "Question." || p.label === "Catechist." || (!p.label && /\?$/.test(p.text) && ctx.catechism))) x.who = null;
    if (x.label === "Question." || x.label === "Catechist.") x.who = null;
  });
  return out;
}

// ── Offices ─────────────────────────────────────────────────────────
// Decorative title blocks at the head of an office print its name, which
// the page heading already carries.
const TITLE_BLOCK = new Set([
  "THE MINISTRATION", "OF", "HOLY BAPTISM", "THE ORDER FOR THE BURIAL OF THE DEAD", "AT THE BURIAL OF A CHILD.",
  "COMMUNION OF THE SICK", "LITANY AND SUFFRAGES FOR ORDINATIONS", "OFFICES OF INSTRUCTION", "PRAYERS AND THANKSGIVINGS",
  "The Form of Solemnization of Matrimony", "An Office of Institution of Ministers into Parishes or Churches",
  "The Thanksgiving of Women after Child-birth", "Commonly called the Churching of Women",
  "THE FORM AND MANNER OF MAKING DEACONS", "THE FORM AND MANNER OF ORDERING PRIESTS",
  "THE FORM OF ORDAINING OR CONSECRATING A BISHOP", "The Form of Consecration of a Church or Chapel",
]);
// Capitals that head a passage inside a division rather than a division.
const INNER_CAPS = new Set(["MORNING.", "EVENING."]);
// Headings inside a page that the outline lists: the occasional prayers.
const TOC_HEADS = {
  "prayers-thanksgivings": /^(A Prayer|For |In Time|Memorial|A Bidding|A Thanksgiving|The Thanksgiving)/,
  "family-prayer": /^(For |A General Intercession|Acknowledgment|Dedication of|Prayer for|Confession of|The Intercession\.|The Thanksgiving\.|Sunday Morning\.|In the Morning\.|At Night\.)/,
};

// A rubric that points at what comes next: "Or this Canticle.",
// "Then follows,", "... say as followeth."
const LEADS_ON = /([,:]|\b(following|followeth)\.?)$|^(Or (this|else)\b|Then follows|\[Here follows|And after that)/;

async function office(o) {
  const { paras, wrapped } = await readSource(o.file);
  const sections = [];
  let sec = null, pendingSep = false, inPsalm = false;
  const open = (title) => {
    // Rubrics standing between two divisions ("Or this Canticle.",
    // "Then follows,") introduce the one that follows.
    const carry = [];
    if (sec && sec.rows.some((r) => r.kind !== "rubric"))
      while (sec.rows[sec.rows.length - 1].kind === "rubric" && LEADS_ON.test(sec.rows[sec.rows.length - 1].en)) carry.unshift(sec.rows.pop());
    sec = { title, rows: carry }; sections.push(sec); inPsalm = false;
  };
  open(o.part);
  const ctx = { file: o.file, catechism: /catechism|offices-instruction/.test(o.file), litany: /litany|penitential/.test(o.file) };
  let lead = true;   // still inside the decorative title block
  const push = (r) => sec.rows.push(r);
  for (let p of paras) {
    p = p.filter((l) => !CRUFT(l.trim()));
    if (!p.length) continue;
    const joined = p.map((l) => l.trim()).join(" ");
    if (/^=+$/.test(joined)) { pendingSep = true; continue; }
    if (lead && (TITLE_BLOCK.has(joined) || joined === o.sub)) continue;
    lead = false;
    const L0 = p.map((l) => l.trim());
    // A psalm inside an office: its Latin title, then its verses.
    if (PSALM_HEAD.test(clean(L0[0]))) {
      const h = clean(L0[0]);
      if (pendingSep) open(h); else push({ kind: "heading", en: h });
      pendingSep = false; inPsalm = true;
      if (L0.length > 1) push({ kind: "verse", en: psalmVerses(L0.slice(1), wrapped).map(clean).join("\n") });
      continue;
    }
    let L = logicalLines(L0, wrapped).map(clean);
    // A rubric wrapped over short lines, with nothing of the service inside it.
    if (L.length > 1 && isRubric(clean(joined)) && !L.some((l, i) => i > 0 && (PROPER_HEAD.test(l) || LABEL.test(l) || /^(O )?(?!LORD\b)[A-Z]{2,}\b/.test(l)))) L = [clean(joined)];
    const one = L.join(" ");
    if (inPsalm) {
      if (!isRubric(L[0]) && !LABEL.test(L[0]) && capsRatio(one) < 0.85 && !LEAD_HEAD.test(L[0]) && !/^(Antiphon|Let us pray)\b/.test(L[0])) {
        push({ kind: "verse", en: psalmVerses(L0, wrapped).map(clean).join("\n") });
        continue;
      }
      inPsalm = false;
    }
    // A canticle: its name in capitals with its place in Scripture.
    const cm = L.length === 1 && one.match(CANTICLE_HEAD);
    if (cm) { open(titleCase(cm[1])); push({ kind: "rubric", en: cm[2] }); pendingSep = false; continue; }
    // Division heads.
    const caps = L.length <= 2 && one.length < 120 && capsRatio(one) > 0.85 && letters(one).length >= 4;
    if (caps && !INNER_CAPS.has(one)) {
      const t = titleCase(one.replace(/\.$/, ""));
      if (sec.title === o.part && sec.rows.every((r) => r.kind === "rubric")) { sec.title = t; }
      else open(t);
      pendingSep = false;
      continue;
    }
    pendingSep = false;
    if (caps) { push({ kind: "heading", en: titleCase(one) }); continue; }
    const tocRe = TOC_HEADS[o.file];
    if (tocRe && tocRe.test(one) && one.length < 130 && /\.$/.test(one) && !/^(O )?[A-Z]{2,}\b/.test(one)) {
      push({ kind: "heading", en: one, toc: true });
      continue;
    }
    if (o.file === "holy-communion" && /^The (Oblation|Invocation)$/.test(one)) { push({ kind: "heading", en: one }); continue; }
    if (/^At the Burial of the Dead at Sea\.$/.test(one)) { open(one.replace(/\.$/, "")); continue; }
    for (const r of classifyParagraph(L, ctx)) push(r);
  }
  return sections.filter((s) => s.rows.length).map((s) => ({ ...s, rows: knit(s.rows, ctx) }));
}

// ── The Psalter ─────────────────────────────────────────────────────
const ORD = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth",
  "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth", "Twenty-first",
  "Twenty-second", "Twenty-third", "Twenty-fourth", "Twenty-fifth", "Twenty-sixth", "Twenty-seventh", "Twenty-eighth",
  "Twenty-ninth", "Thirtieth"];
async function psalter(o) {
  let raw = await readFile(path.join(SRC, "1928-bcp-psalter.txt"), "utf8");
  // The scrape caught a page-counter script in the middle of Psalm 109.12
  // ("and in the NEXT /* You may give each page ... */ ... generation"),
  // and the live text still carries it. The verse reads "and in the next
  // generation let his name be clean put out."
  raw = raw.replace(/ NEXT \/\*[\s\S]*?document\.write\(' '\); \}\n/, " next\n");
  // Scan errors in the pointing and numbering, checked against the verse
  // numbers either side: 109.21 "~" and 114.8 "':" for the asterisk, a
  // stray "~" after 147.11, and 119.90's number read as "go".
  raw = raw.replace("helpless and poor, ~ and", "helpless and poor, * and")
    .replace("in his mercy. ~\n", "in his mercy.\n")
    .replace("a standing water, ': and the", "a standing water, * and the")
    .replace("ever in heaven. go Thy truth", "ever in heaven.\n90 Thy truth");
  const days = raw.split(/\n={20,}\nDAY (\d+)\n={20,}\n/);
  const sections = [];
  let curPsalm = null;
  for (let i = 1; i < days.length; i += 2) {
    const day = +days[i], text = days[i + 1];
    const paras = text.split(/\n\s*\n/).map((p) => p.split("\n").filter((l) => l.trim())).filter((p) => p.length);
    let sec = null;
    for (const p of paras) {
      const one = p.join(" ").trim();
      if (/^The \S+ Day\.$/.test(one) || CRUFT(one)) continue;
      if (/^(Morning|Evening) Prayer\.?$/i.test(one)) {
        const office = /^m/i.test(one) ? "Morning Prayer" : "Evening Prayer";
        sec = { day, office, rows: [], psalms: [], depth: 2 };
        sections.push(sec); continue;
      }
      if (/^The End of the Psalter\.$/.test(one)) { sec.rows.push({ kind: "rubric", en: one }); continue; }
      // A psalm (or a section of 119) is its heading line then its verses.
      const head = p[0].trim();
      let title = null;
      const pm = head.match(/^Psalm (\d+)\.\s*(.*)$/);
      if (pm) { curPsalm = +pm[1]; title = head; sec.psalms.push({ n: curPsalm, part: (pm[2].match(/^([IVXL]+)\./) || [])[1] || null }); }
      else if (/^[IVXL]+\. \S/.test(head) && curPsalm === 119) {
        title = `Psalm 119. ${head}`; sec.psalms.push({ n: 119, part: head.match(/^([IVXL]+)\./)[1] });
      }
      if (!title) throw new Error(`Psalter day ${day}: unexpected paragraph "${one.slice(0, 60)}"`);
      sec.rows.push({ kind: "heading", en: title, toc: true, psalm: true });
      const verses = psalmVerses(p.slice(1), true, true).map(clean);
      sec.rows.push({ kind: "verse", en: verses.join("\n") });
    }
  }
  const range = (ps) => {
    const nums = [...new Set(ps.map((x) => x.n))];
    if (nums.length === 1 && nums[0] === 119) {
      const parts = ps.map((x) => x.part);
      return `Psalm 119, ${parts[0]} to ${parts[parts.length - 1]}`;
    }
    if (nums.length === 1) return `Psalm ${nums[0]}`;
    return `Psalms ${nums[0]} to ${nums[nums.length - 1]}`;
  };
  return sections.map((s) => ({
    title: `Day ${s.day}: ${s.office}, ${range(s.psalms)}`,
    bcp: `The ${ORD[s.day - 1]} Day. ${s.office}.`,
    depth: 2, rows: s.rows, part: o.part, short: o.short,
  }));
}

// ── Build ───────────────────────────────────────────────────────────
const live = await (await fetch(`${BASE}/v1/mo/1928-bcp.json`, { headers: UA })).json();
const out = {
  slug: live.slug, title: live.title, author: live.author, subtitle: live.subtitle, description: live.description,
  intro: live.intro, tags: live.tags, tradition: live.tradition, eyebrow: live.eyebrow,
  liturgy: true,
  sections: [],
};
let bookNo = 0;
for (const o of OFFICES) {
  bookNo++;
  const secs = o.file === "psalter" ? await psalter(o) : await office(o);
  secs.forEach((s, j) => {
    const id = `book-${bookNo}-chapter-${j + 1}`;
    // depth 1: the office's own opening, which the book does not head
    // apart from the office title; depth 2: a division the book names.
    const sec = { id, title: s.title, part: o.part, part_short: o.short, depth: s.title === o.part ? 1 : 2 };
    if (j === 0 && o.sub) sec.part_sub = o.sub;
    if (s.bcp) sec.bcp_title = s.bcp;
    sec.rows = s.rows.map((r, k) => {
      const row = { kind: r.kind, id: `${id}-${k + 1}`, en: r.en };
      if (r.lines) row.lines = r.lines;
      if (r.toc) row.toc = true;
      return row;
    });
    out.sections.push(sec);
  });
}

// ── Coverage: every live row's words must survive ───────────────────
const fold = (s) => String(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[^A-Za-z0-9]+/g, " ").trim().toLowerCase();
const all = fold(out.sections.map((s) => [s.title, s.bcp_title || "", s.part_sub || "", ...s.rows.map((r) => r.en)].join(" ")).join(" "));
const LIVE_CRUFT = /^(Book [IVXL]+|\d+ chapters?|=+|Go to 1928 Book of Common Prayer|All Rights Reserved.*|Copyright.*)$/;
let missing = 0;
for (const s of live.sections) for (const r of s.rows) {
  const t = String(r.en || "").replace(/\s+/g, " ").replace(/([a-z])- ([a-z])/g, "$1$2").replace(/illuininatio/g, "illuminatio").replace("Psalm Ixviii.", "Psalm lxviii.").replace("Diocese * present", "Diocese is present").replace("heaven. go Thy truth", "heaven. 90 Thy truth").trim();
  if (!t || LIVE_CRUFT.test(t)) continue;
  if (!all.includes(fold(t))) { missing++; console.log(`  NOT CARRIED: ${r.id}: ${t.slice(0, 110)}`); }
}
const rows = out.sections.reduce((n, s) => n + s.rows.length, 0);
const kinds = {};
out.sections.forEach((s) => s.rows.forEach((r) => { kinds[r.kind] = (kinds[r.kind] || 0) + 1; }));
console.log(`1928-bcp: ${out.sections.length} sections, ${rows} rows`, kinds, `; live rows not carried: ${missing}`);

const dir = path.join(OUT, "v1", "mo");
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, "1928-bcp.json"), JSON.stringify(out));
