/*
 * Where a commentary opens on a verse (assets/js/page/commentary-anchor.js), and what the Scripture page's rail is built from.
 *
 * WHY THIS EXISTS. 2026-10-19, the owner, on /the-faith-received/scripture/?ref=genesis.1: choosing Lapide opened "Chapter 1 opens
 * here (no verse notes found), p. 75", a page that begins with the text of Genesis 1:24 to 28, not his comment on 1:1. Two causes:
 *   1. the library indexed no "note on this verse" row for Lapide, so the pane fell to the devotion map's chapter opening, p. 75,
 *      which is the first page of an essay on the six days printed in his first volume (his own Genesis begins at p. 196);
 *   2. a search for "the paragraph that starts with the verse's number" lands on the commentary's reprint of the chapter (the lemma:
 *      "1. In the beginning God created …", "2. And the earth was void …") before it reaches the note ("Vers. 1. 1. IN THE BEGINNING").
 * The texts below are short excerpts of vol. 1 of Lapide (the Mossman translation) at the pages the live library prints them on.
 *
 * Run: node scripts/check-commentary-anchor.mjs
 * Also asserts the rail's markup order and that the stylesheet carries the 50/50 split, so a later edit cannot quietly undo them.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = createRequire(import.meta.url)(path.join(root, 'assets/js/page/commentary-anchor.js'));
let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed += 1; console.error(`FAIL  ${msg}`); } else console.log(`ok    ${msg}`); };

// ── pages ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const paras = (t) => t.split(/\n+/).map((s) => s.trim()).filter(Boolean);
const P75 = paras(`ventia according to their kind, cattle (or tame animals, or herbivorous animals), and reptiles, and the wild beasts of the earth according to their kind. And it was so.
25. And God made the wild beasts of the earth according to their kind, and cattle according to their kind, and every reptile of the earth according to its kind. And God saw that it (was) good.
26. And God said: Let us make man to our image, according to our likeness, and let him have dominion over the fishes of the sea.
27. And God created man to his own image, to the image of God he created him, male and female.
28. And God blessed them, and God said to them: generate children, and multiply, and fill the earth.`);
const P196 = paras(`CHAPTER ONE.
The creation of the world and the work of the six days is described, namely, on the first day heaven, earth, and light were made.
1. In the beginning God created the heaven and the earth.
2. And the earth was void and empty, and darkness was upon the face of the deep; and the Spirit of God moved over the waters.
3. And God said: Be light made, and light was made.
4. And God saw the light that it was good; and he divided the light from the darkness.
5. And he called the light Day, and the darkness Night: and there was evening and morning one day.
6. And God also said: Let there be a firmament made amidst the waters: and let it divide the waters from the waters.
7. And God made a firmament, and divided the waters that were under the firmament, from those that were above the firmament.`);
const P197 = paras(`multiply, and replenish the earth, and subdue it. 29. And God said: Behold I have given you every herb bearing seed upon the earth; 30. and to all beasts of the earth, and to every fowl of the air; 31. And God saw all the things that he had made, and they were very good.
Vers. 1. 1. IN THE BEGINNING. - First, St. Augustine, lib. I De Genesi ad litter., cap. 1; Ambrose and Basil, hom. 1 Hexam.: "In the beginning," they say, that is, in the Son.
(1) Patritius, in the work titled De Interpretatione Scripturarum Sacrarum, says that the beginning is the first moment.
Vers. 2. 2. AND THE EARTH WAS VOID AND EMPTY. - Hebrew: tohu wa-bohu.`);
// a commentary that numbers its notes with no "Vers." (Poole): the notes are bare numbered lines, but they are notes
const LONG = ' He doth not confess his sin but lays it upon God, and so adds sin to sin, as Adam did before him, and as all his sons do after; the excuse is old and the fault is older.';
const POOLE = paras(`11. And he said, who told thee that thou wast naked? Hast thou eaten of the tree?${LONG}${LONG}
12. The woman whom thou gavest to be with me, she gave me of the tree.${LONG}${LONG}
13. The serpent beguiled me. The woman, in her turn, lays it upon the serpent.${LONG}${LONG}`);

ok(A.findNote(P196, 1) === -1, 'the reprinted chapter is never taken for the note on verse 1');
ok(A.lemmaIndexes(P196).has(2) && A.lemmaIndexes(P196).has(5), 'a run of numbered lines counting up is the lemma');
ok(A.findNote(P75, 25) === -1, 'p. 75 (an essay opening with verses 24 to 28 reprinted) has no note on verse 25');
ok(A.lemmaIndexes(P197).has(0), 'a paragraph with several verse marks inside it is the lemma');
ok(A.findNote(P197, 1) === 1, 'the note is the "Vers. 1." paragraph, not the lemma before it');
ok(A.findNote(P197, 2) === 3, '"Vers. 2." is found');
ok(A.noteEnd(P197, 1, 1, 14) === 3, 'the note on verse 1 ends where the note on verse 2 begins');
ok(A.findNote(POOLE, 12) === 1, 'bare numbered notes are still notes when they are not a run of short reprinted verses');
ok(A.noteEnd(POOLE, 1, 12, 14) === 2, 'and the note ends at the next numbered note');

// ── the library's own one-line gists ───────────────────────────────────────────────────────────────────────────────────────
ok(A.gistClaims('A commentary on Genesis 1:1 enumerating eight senses of in the beginning', 'Genesis', 1, 1) === 'yes', 'a gist naming the verse claims it');
ok(A.gistClaims("A Lapide surveys four interpretations of 'heaven and earth' in Gen 1:1", 'Genesis', 1, 1) === 'yes', 'an abbreviated book name counts');
ok(A.gistClaims('A commentary on Genesis 1:3-4 arguing that the first light', 'Genesis', 1, 1) === 'no', 'a gist naming other verses does not');
ok(A.gistClaims('A commentary on Genesis 1:3-4 arguing that the first light', 'Genesis', 1, 4) === 'yes', 'a range holds its last verse');
ok(A.gistClaims('A lapidary commentary on 2 Peter 1:1 and the faith', 'Genesis', 1, 1) === 'no', 'a gist about another book does not');
ok(A.gistClaims('The author discusses reconciling geological time with the account', 'Genesis', 1, 1) === 'unknown', 'a gist naming nothing is unknown');

ok(A.gistClaims('Ps 22:1 My God', 'Psalms', 22, 1) === 'yes' && A.gistClaims('Mt 5:3', 'Matthew', 5, 3) === 'yes', 'short forms (Ps, Mt) name their books');
ok(A.gistClaims('1 John 2:1', '1 John', 2, 1) === 'yes' && A.gistClaims('1 John 2:1', 'John', 2, 1) === 'no' && A.gistClaims('John 2:1', '1 John', 2, 1) === 'no', 'numbered books are told apart');

const rows = [
  { w: 'lapide', how: 'quotation', p: 196, g: 'This page presents the Vulgate text of the chapter' },
  { w: 'lapide', how: 'explicit', p: 94, g: "A philological discussion of 'bereshith' in Genesis 1:1" },
  { w: 'lapide', how: 'explicit', p: 198, g: 'A commentary on Genesis 1:1 enumerating eight senses' },
  { w: 'lapide', how: 'explicit', p: 109, g: 'A defense of the literal sense of Genesis 1:3 (light)' },
  { w: 'lapide', how: 'allusion', p: 580, g: 'A devotional doxology' },
  { w: 'lapide', how: 'explicit', p: 486, g: 'A lapidary commentary on 2 Peter 1:1' },
  { w: 'lapide', how: 'explicit', p: 76, g: 'The author discusses reconciling geological time' },
  { w: 'other', how: 'explicit', p: 5, g: 'A commentary on Genesis 1:1' },
];
const cands = A.candidatePages(rows, 'lapide', 'Genesis', 1, 1);
ok(!cands.some((c) => c.p === 196 || c.p === 580), 'pages that only print or allude to the verse are not candidates');
ok(!cands.some((c) => c.p === 109 || c.p === 486 || c.p === 5), 'pages about other verses, other books or other works are not candidates');
ok(cands.map((c) => c.p).join() === '94,198,76', 'pages that name the verse come first, then by page');

// ── the whole search, on a stand-in for Lapide's volume ─────────────────────────────────────────────────────────────────────
const pagesText = {
  75: P75, 196: P196, 197: P197,
  198: paras('strife, or of a corporeal creature, by which future things would succeed past things.'),
  205: paras('St. Basil and Bede think that heaven and earth were created a little before the first day.'),
  206: paras('the Spirit of the Lord carried over the waters.\n3. AND GOD SAID - by word, not of the mouth, but of the mind.'),
};
const getParas = async (_slug, n) => [pagesText[n] || [], []];
const R = A.createResolver(getParas);
const lapide = {
  slug: 'lapide', notes: {}, open: 75, close: 235, pv: {},
  rows: {
    1: rows.filter((r) => r.w === 'lapide'),
    2: [{ w: 'lapide', how: 'explicit', p: 205, g: "A Lapide's commentary on Genesis 1:2, arguing" }],
    3: [{ w: 'lapide', how: 'explicit', p: 206, g: 'A lapidary commentary on Genesis 1:3 (Fiat lux)' }],
  },
};
const W = { name: 'Genesis', ch: '1' };
const sec = await R.section(lapide, W);
ok(sec.lo === 196 && sec.hi === 235, `his own chapter begins where the chapter's text is reprinted, p. 196, not at the map's p. 75 (got ${JSON.stringify(sec)})`);
const r1 = await R.resolve(lapide, 1, W);
ok(r1.how === 'note' && r1.p === 197 && r1.v === 1, `Lapide on Genesis 1:1 opens at his note, p. 197 (got ${JSON.stringify(r1)})`);
ok(r1.p !== 75, 'and not at the devotion map\'s chapter opening, p. 75');
const r2 = await R.resolve(lapide, 2, W);
ok(r2.how === 'note' && r2.p === 197, `1:2 has its heading ("Vers. 2.") on p. 197 (got ${JSON.stringify(r2)})`);
const r4 = await R.resolve({ ...lapide, rows: { 4: [{ w: 'lapide', how: 'explicit', p: 207, g: 'A commentary on Genesis 1:4 on the division of light' }] } }, 4, W);
ok(r4.how === 'page' && r4.p === 207, `1:4, with no heading found, opens at the page the library files as on it (got ${JSON.stringify(r4)})`);
const r3 = await R.resolve(lapide, 3, W);
ok(r3.how === 'note' && r3.p === 206, `1:3 opens at its note, p. 206 (got ${JSON.stringify(r3)})`);
const r9 = await R.resolve({ ...lapide, rows: {} }, 9, W);
ok(r9.how === 'nearest' && r9.v === 3 && r9.p === 206, `1:9, with nothing on it, opens at the closest located note, 1:3 (got ${JSON.stringify(r9)})`);
const rNone = await R.resolve({ slug: 'x', notes: {}, rows: {}, open: 400, pv: {} }, 1, W);
ok(rNone.how === 'chapter' && rNone.p === 400, 'a commentary with no located note at all opens at its chapter page, and says only that');
const indexed = await R.resolve({ slug: 'poole', notes: { 12: 301 }, rows: {}, open: 300, pv: {} }, 12, W);
ok(indexed.how === 'note' && indexed.p === 301 && indexed.indexed, 'a note the library indexed is trusted as it is');
const later = await R.resolve({ slug: 'poole2', notes: { 14: 305 }, rows: {}, open: 300, pv: {} }, 12, W);
ok(later.how === 'later' && later.v === 14 && later.p === 305, 'with no note on the verse, the NEXT note is opened, within four verses');


// ── real excerpts from Lapide vol. 1 (pp. 81-143 are Pianciani's essay, full of footnote lines; his Genesis 1 is pp. 196-234) ────
const FOOT = paras(`(6) Virago does not indicate sex, but a male soul.
(7) De Opif. lib. II, cap. VIII, § 11.
(8) Quaest. hebr. in Genes.
(9) Cf. Augustine, De Genesi ad litteram, lib. V.
(10) Ibid., cap. IX.`);
ok(A.lemmaIndexes(FOOT).size === 0, 'footnote lines "(6) ..." are not numbered text and make no reprint');
ok(A.findNote(FOOT, 6) === -1, 'and are not the note on verse 6');
const LISTED = ['Vers. 5. 5. AND HE CALLED THE LIGHT DAY. The Fathers give three senses: 1. the literal day. 2. the mystical day. 3. the eternal day.', 'Vers. 6. 6. AND GOD SAID.'];
ok(A.findNote(LISTED, 5) === 0, 'a note under a "Vers. N." heading is found though it lists 1. 2. 3. inside it');
ok(A.capsNum('3. AND GOD SAID - by word, not of the mouth') === 3 && A.capsNum('1. In the beginning God created') === null, 'a capitals heading is told from a reprinted verse');
const ESSAY = (n) => paras(`Pianciani, on the days of creation, page ${n}.\n(1) Footnote one to a work cited.\n(2) Footnote two to a work cited.\n(3) Footnote three.\n(4) Footnote four.\n(5) Footnote five.\n(6) Footnote six.`);
const LEM = paras(Array.from({ length: 12 }, (_, i) => `${i + 1}. And God said, verse ${i + 1} of the chapter, in the words of the Vulgate.`).join('\n'));
const book = {
  81: ESSAY(81), 143: ESSAY(143), 145: ESSAY(145), 196: LEM,
  197: paras('Vers. 1. 1. IN THE BEGINNING. - First, St. Augustine.\nVers. 2. 2. AND THE EARTH.'),
  200: paras('9. LET THE WATERS WHICH ARE UNDER THE HEAVEN BE GATHERED TOGETHER. - Here Moses.'),
  201: paras('Verse 20. 20.\nLET THE WATERS BRING FORTH THE CREEPING THING.\nVers. 20. Are birds made from matter?'),
  198: paras('AND GOD SAW THE LIGHT THAT IT WAS GOOD. - Saw, that is, He made us see.'),
};
const R2 = A.createResolver(async (_s, n) => [book[n] || [], []], { verseText: (v) => ({ 4: 'And God saw the light, that it was good: and God divided the light from the darkness.' }[v] || '') });
const L = { slug: 'l', notes: { 20: 145 }, rows: {}, open: 80, close: 235, pv: {} };
const sec2 = await R2.section(L, W);
ok(sec2.lo === 196, `the section starts where the chapter's text is reprinted, not in the footnotes before it (got ${sec2.lo})`);
const h = async (v) => (await R2.resolve(L, v, W));
ok((await h(1)).p === 197 && (await h(1)).how === 'note', 'a "Vers. 1." heading is indexed');
ok((await h(9)).p === 200 && (await h(9)).how === 'note', 'a numbered capitals heading is indexed (9. LET THE WATERS)');
ok((await h(20)).p === 201 && (await h(20)).how === 'note', 'a "Verse 20." heading beats a library index row that points into the essay (p. 145)');
ok((await h(4)).p === 198 && (await h(4)).how === 'note', 'an unnumbered capitals heading is matched to the verse by its words');
const last = await A.createResolver(async (_s, n) => [book[n] || [], []]).resolve({ slug: 'l', notes: {}, rows: {}, open: 80, pv: {} }, 1, W);
ok(last.how === 'note' && last.p === 197, 'with no next chapter on the map, the section is bounded and still found');

// ── the rail's markup and stylesheet ────────────────────────────────────────────────────────────────────────────────────────
const js = readFileSync(path.join(root, 'assets/js/page/commentary-pane.js'), 'utf8');
const css = readFileSync(path.join(root, 'assets/css/commentary-pane.css'), 'utf8');
const hbs = readFileSync(path.join(root, 'custom-scripture-dev.hbs'), 'utf8');
const tabsMo = /tabs\.innerHTML = SITE\.name === 'mo'\s*\? '([^']+)'/.exec(js);
ok(tabsMo && /data-tab="c">Commentary<.*data-tab="s">Citations<.*data-tab="r">Reception</.test(tabsMo[1]), 'tabs read Commentary, Citations, Reception');
ok(!/data-tab="s"\] \{ display: none/.test(css), 'the Citations tab is kept on phones');
ok(/const firstTab = \(\) => 'c';/.test(js), 'the rail opens on the Commentary, wide or phone');
ok(/\.cp-tabs button\[aria-pressed="true"\] \{ color: var\(--cp-ink\); border-bottom-color: var\(--cp-accent\); \}/.test(css), 'the pressed tab changes colour and underline only, never weight or face');
ok(/\.cp-tabs button, \.cp-tabs button:hover[^{]*\{[^}]*font-weight: 400/.test(css), 'all three tabs are one face and one weight in every state');
const sd = readFileSync(path.join(root, 'assets/css/scripture-dev.css'), 'utf8');
ok(/\.sd-panel-fold > summary \{\s*display: grid;\s*grid-template-columns: minmax\(0, 1fr\) 10em 1\.25em;/.test(sd), 'every fold row is one grid: label, a fixed count column, the +/- at the right');
ok(/\[data-sd-summary-count\], \.sd-panel-fold > summary > \.sd-comm-fold-n \{[^}]*font-variant-numeric: tabular-nums/.test(sd) && /grid-column: 2;[^}]*justify-self: end/.test(sd), 'every fold count sits in the one count column, right-aligned in tabular figures');
ok(!/store\.(get|set)\('fr_cp_tab'/.test(js), 'no last-tab preference is read or written');
ok(/grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\) !important/.test(css), 'text and rail split the width 50/50');
ok(!/overflow:\s*auto/.test(css.slice(css.indexOf('.cp-pane {'), css.indexOf('/* the verse panel (the Citations view)'))
  .replace(/\.cp-pane \{[^}]*\}/, '')), 'nothing inside the rail has its own scroll box');
ok(!/--cp-display|var\(--display|font-family:[^;]*(IM Fell|EB Garamond)/.test(css.slice(css.indexOf('.cp-pane {'))), 'no display face on the rail');
ok(hbs.indexOf('commentary-anchor.js') > 0 && hbs.indexOf('commentary-anchor.js') < hbs.indexOf('commentary-pane.js'), 'the template loads the anchor before the pane');

if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\ncommentary anchor: all checks passed');
