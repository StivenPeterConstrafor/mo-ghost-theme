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
// (2026-11-08, the survey) with no next chapter on the map, the section is the forty pages from the map's page and does not move: a
// reprinted text 116 pages on no longer starts it (the Westminster Annotations opened Revelation for verses of the Gospels so)
const last = await A.createResolver(async (_s, n) => [book[n] || [], []]).resolve({ slug: 'l', notes: {}, rows: {}, open: 80, pv: {} }, 1, W);
ok(last.how === 'chapter' && last.p === 80, `with no next chapter on the map, the section is bounded: nothing 116 pages on is taken (got ${JSON.stringify(last)})`);
const near = await A.createResolver(async (_s, n) => [({ 100: LEM, 101: book[197] })[n] || [], []]).resolve({ slug: 'l2', notes: {}, rows: {}, open: 80, pv: {} }, 1, W);
ok(near.how === 'note' && near.p === 101, `and a note within it is still found (got ${JSON.stringify(near)})`);

// ── the editors' apparatus (2026-10-19) ──────────────────────────────────────────────────────────────────────────────────
// Weimar Edition, Writings vol. 24 (luther-wa-schriften-24), pp. 25 to 28: Luther's 1527 Genesis lectures, with the editors' variant
// readings of the early printings (sigla A to D, "r" for Rorer's manuscript) printed after each page's text. The pane opened p. 25 for
// Genesis 1:1 and set 14 paragraphs, the greater part of them the editors' lines, as if they were the commentary.
const L25 = paras(`As you wish to contemplate God, you must necessarily go outside of every creature. He who now clings to those vicissitudes and things cannot see God.
In things, there is novelty. Time, the hour, and creatures have a beginning, which God created, not in a moment, but in time. But the earth was void and empty.
13 zu Inanis et vacua id est was ungeschickt und rohe . r
[zu Bl. A5 a Terra quae bis A6 a tenens et conservans vgl. R 99, 32 – 101, 24]
16 zu Zeit fuer (vor B ) Gott ungemessen . r ABCD zu 18 2. Pet. 3 Psal. 90. r ABCD 15 woelchs B Druemb D 16 hanget C gedencken C ewickeit D Vor B
17 jha B
18 letste B würdt B
20 ynn] jhn B augenplick B sag C
21 ein C
25 wuest BC laere B hab C almechtig C
26 darů BC
27 genum̄en C
31 Arestoteles B`);
const L26 = paras(`26b Heaven and earth you should take simply, but not yet adorned. The earth was formless, like a fetus in the womb.
10 zu Erde war wüst und leer . r ABCD zu
20 Anfang der schepffung (schoepffung C ) der welt. r ABCD zu 23 2. Pet. (Pe. C) 3. r ABCD zu
31 Erde. r ABCD 11 als] wie C 12 nit (2) C 13 solte B nit C 14 hynfert C weder BC keinen C
32 thiere C`);
const L28 = paras(`A great question is raised here, whether what has been said is to be referred to this first day. I understand it thus.
9 zu Liecht . r ABCD zu
12 Nacht . r ABCD zu
31 Gottheit . r ABCD 7 tag C nur BD nůr C ein B 8 klingt B tage C`);
const appIdx = (ps) => [...A.apparatusIndexes(ps)];
ok(appIdx(L25).join() === '2,3,4,5,6,7,8,9,10,11,12', 'Luther WA 24 p. 25: every apparatus line is recognized, and the three paragraphs of Luther are not');
ok(appIdx(L26).join() === '1,2,3,4' && appIdx(L28).join() === '1,2,3', 'Luther WA 24 pp. 26 and 28: the same');
ok(A.apparatusShare(L25) > 0.5 && A.apparatusShare(L25) < 0.8, 'p. 25 is a page of commentary with its apparatus, not a page of apparatus alone');
ok(A.findNote(L25, 13) === -1 && A.findNote(L26, 10) === -1 && A.findNote(L25, 17, true) === -1, '"13 zu Inanis et vacua" and "17 jha B" are not the notes on verses 13 and 17');
ok(A.noteEnd(L25, 0, 1, 14) === L25.length, 'a note on a page followed by the apparatus runs on over it and is not cut by its line numbers');
ok(A.lemmaIndexes(paras('20 ynn] jhn B augenplick B sag C\n21 ein C\n22 anfange B gewest C daz B\n23 Woellichs B nit C\n25 wuest BC')).size === 0, 'a run of apparatus line numbers is not the reprinted text of a chapter');
const LEMMA = paras('1. In the beginning God created the heaven and the earth.\n2. And the earth was void.');
ok(!appIdx(LEMMA).length, 'a numbered verse ("1. In the beginning") is not apparatus');
for (const real of ['13 And God said, Let there be light: and there was light.', '1 Cor. 15, 3 C. Thomas has it so.', 'Vers. 2. A great question is raised here.',
  'In Genesis 1 B C and D are named by the Fathers as the letters of the plan, but the sense is plain.', '3 Peter A. Lapide, on this place.', 'zu Hause ist es am besten, sagt das Sprichwort.']) {
  ok(!A.isApparatus(real), `prose is not apparatus: ${real.slice(0, 50)}`);
}
// an apparatus-only page cannot be chosen as the note on a verse
{
  const only = { 40: paras('13 zu Inanis et vacua . r\n17 jha B\n18 letste B würdt B\n20 ynn] jhn B sag C\n21 ein C'), 41: paras('1. IN THE BEGINNING. Luther here says that the beginning is time.') };
  const r = A.createResolver(async (_s, n) => [only[n] || [], []]);
  const got = await r.located({ slug: 'x', notes: {}, rows: { 1: [{ w: 'x', how: 'explicit', g: '', p: 40 }, { w: 'x', how: 'explicit', g: '', p: 41 }] }, open: 40, close: 43, pv: {} }, 1, { name: 'Genesis', ch: 1 });
  ok(got && got.p === 41, 'a page that is all apparatus is passed over for the page with the note');
}

// ── 2026-11-08, QA of the Scripture desk on MereO ───────────────────────────────────────────────────────────────────────────
// Calvin (the Calvin Translation Society) prints a section's verses ahead of his notes, each in English and then in his Latin, and
// the notes start the count again: the English verse used to be marked as his note at Hebrews 12:1, 12:5, 12:14 and Romans 3:23.
const MORE = ' He shows to what end the examples were brought forward, that every one of us might be encouraged to follow them, and that we might not grow weary in the course which God has set before us, since so many have run it before us and have finished it. For as the sight of a great company makes a soldier bolder, so the remembrance of the fathers who went before should take away from us every excuse for sloth; and he calls them a cloud, because they surround us on every side, and their number is such that it may well hide from us whatever might turn us aside from the race.';
const CALVIN = paras(`Hebrews Chapter 12:1-3
1. Wherefore seeing we also are compassed about with so great a cloud of witnesses, let us lay aside every weight, and the sin which doth so easily beset us, and let us run with patience the race that is set before us,
1. Proinde nos quoque tantam habentes circumpositam nubem testium, deposito omni onere et peccato quod nos circumstat, per patientiam curramus ad certamen nobis propositum;
2. Looking unto Jesus the author and finisher of our faith; who for the joy that was set before him endured the cross, despising the shame.
2. Intuentes in fidei ducem et perfectorem Iesum; qui proposito sibi gaudio sustinuit crucem, ignominia contempta.
3. For consider him that endured such contradiction of sinners against himself, lest ye be wearied and faint in your minds.
3. Reputate itaque quis talem adversus se peccatorum contradictionem sustinuerit, ne fatigemini animis vestris deficientes.
1. Wherefore, seeing we also, etc. This conclusion is, as it were, the epilogue of the former chapter.${MORE}
2. Looking unto Jesus, etc. Here is the highest example of all, set before us.${MORE}
3. For consider him, etc. He enforces the example by comparing the two.${MORE}
4. Ye have not yet resisted unto blood, striving against sin.
4. Nondum usque ad sanguinem restitistis adversus peccatum certantes.
5. And ye have forgotten the exhortation which speaketh unto you as unto children.
5. Et oblitae estis consolationis quae vobis tanquam filiis loquitur.
4. Ye have not yet, etc. He goes farther, and reminds them that they had not yet been brought to the last contest.${MORE}`);
ok([1, 2, 3, 4, 5, 6, 10, 11, 12, 13].every((k) => A.lemmaParts(CALVIN).ahead.has(k)), "Calvin's verses printed twice ahead of his notes are the text");
ok(A.findNote(CALVIN, 1) === 7, 'his note on verse 1 is his comment, not the English verse');
ok(A.noteEnd(CALVIN, 7, 1, 14) === 8, 'and it ends at his note on verse 2');
ok(A.findNote(CALVIN, 3) === 9 && A.noteEnd(CALVIN, 9, 3, 14) === 10, 'the note on verse 3 ends where the next section prints verses 4 and 5');
ok(A.findNote(CALVIN, 4) === 14, 'the note on verse 4 follows that section');
// some of the Society's volumes number the notes with no stop ("12 Wherefore as, etc.")
const CALVIN_RO5 = paras(`12. Wherefore, as by one man sin entered into the world, and death by sin; and so death passed upon all men, for that all have sinned:
12. Quamobrem sicut per unum hominem peccatum in mundum introiit, et per peccatum mors; atque ita in omnes homines mors pervasit:
13. For until the law sin was in the world: but sin is not imputed when there is no law.
13. Nam usque ad Legem peccatum erat in mundo; peccatum autem non imputatur, quum non est Lex.
12 Wherefore as, etc. He now begins to enlarge on the same doctrine, by comparing what is opposite to it.${MORE}
13 For until the law, etc. This parenthesis meets an objection which might have been made.${MORE}`);
ok(A.findNote(CALVIN_RO5, 12) === 4 && A.noteEnd(CALVIN_RO5, 4, 12, 14) === 5, 'a note numbered with no stop is found after the text, and ends at the next one');
// what is not that shape: a verse with its paraphrase (Baxter), an outline's repeated heads (Gouge)
const BAXTER = paras(`5. And ye have forgotten the exhortation which speaketh unto you as unto children, My son, despise not thou the chastening of the Lord.
5. Have ye forgotten the Lord's gentle words to you as to his children, that you should not make light of his correction?
6. For whom the Lord loveth he chasteneth, and scourgeth every son whom he receiveth.
6. For it is in love that the Lord corrects his own, and every son whom he owns he chastens.`);
const GOUGE = paras(`2. The parties resembled.
2. His brethren.
2. The extent of that evidence.
3. The manner of setting it out.`);
ok(A.lemmaParts(BAXTER).ahead.size === 0 && A.lemmaParts(GOUGE).ahead.size === 0, "a verse with its paraphrase, or an outline's heads, is not the text printed ahead of notes");
// a verse and its paraphrase may share next to no word, and are still one tongue: Baxter's Revelation 1:8 was taken for a verse and its
// Latin, and the reader lost the mark on it
const BAXTER_RV1 = paras(`8. I am Alpha and Omega, the beginning and the ending, saith the Lord, which is, and which was, and which is to come, the Almighty.
8. I am everlasting, before all Worlds and without end, and he who hath Power over all.
9. I John, who also am your brother and companion in tribulation, and in the Kingdom and patience of Jesus Christ, was in the isle that is called Patmos.
9. I John, who was your brother and companion, undergo the like sufferings as you do, in the same belief and subjection to Christ.`);
ok(A.lemmaParts(BAXTER_RV1).ahead.size === 0 && A.findNote(BAXTER_RV1, 8) === 0, "Baxter's \"8. I am Alpha and Omega …\" and \"8. I am everlasting …\" are no verse and its translation");
// Poole's Synopsis and the Critici Sacri quote the verse and close it with a bracket: a run of such notes is notes, not the text
// (Poole's notes on John 1:32-43 at p. 595 started his section there, and his note on 1:1 at p. 584 was passed over)
const P595 = paras(`32. And John bare record, saying, I saw the Spirit descending from heaven like a dove] Either in the form of a dove, or with a motion like that of a dove.
33. And I knew him not] That is, not by face, or not so as to be sure that he was the Messiah until the sign was given.
34. And I saw, and bare record] That this is the Son of God, the Messiah promised to the fathers.
35. Again the next day after John stood] With two of his disciples, waiting for Christ's passing by.
36. And looking upon Jesus as he walked] Fixing his eyes upon him, he saith, Behold the Lamb of God.`);
ok(A.lemmaParts(P595).text.size === 0 && A.findNote(P595, 33) === 1, "a run of notes that quote their verses is not the chapter's text");
ok(!A.quotesVerse('42. So also is the resurrection of the dead. It is sown in corruption; it is raised in incorruption.]')
  && !A.quotesVerse('21. But now the righteousness of God without the law [109] is manifested, being witnessed by the law and the prophets;'),
  "a bracket that only ends the verse (Hammond), or closes a footnote's number, is not a note's");
// a lecture headed by the verses it takes (Aquinas: "L. 3 (3:21–26)")
ok(JSON.stringify(A.rangeOf('L. 3 (3:21–26) Christ the redemption for all', 3)) === '{"a":21,"b":26}', 'a lecture heading gives its verses');
ok(JSON.stringify(A.rangeOf('Lecture 5 (2:28–3:8) The Jews', 3)) === '{"a":1,"b":8}' && A.rangeOf('Lecture 5 (2:28–3:8) The Jews', 2).a === 28, 'a range across two chapters gives each its part');
ok(JSON.stringify(A.rangeOf('Homily 10 (5:12)', 5)) === '{"a":12,"b":12}' && A.rangeOf('L. 3 (3:21–26)', 4) === null && A.rangeOf('21. (3:21) But now', 3) === null, 'one verse; another chapter; a verse is no lecture');
{
  const lec = { 16: paras('L. 1 (3:1–8) What advantage then hath the Jew? The Apostle answers the objection.'), 17: paras('L. 2 (3:9–20) What then? are we better than they?'),
    18: paras('L. 3 (3:21–26) Christ the redemption for all who believe.'), 19: paras('L. 4 (3:27–31) Where is boasting then?') };
  const r = A.createResolver(async (_s, n) => [lec[n] || [], []]);
  const got = await r.resolve({ slug: 'aquinas-romans', notes: {}, open: 16, close: 20, pv: {}, rows: {} }, 23, { name: 'Romans', ch: '3' });
  ok(got && got.how === 'range' && got.p === 18 && got.a === 21 && got.b === 26, `Aquinas on Romans 3:23 opens at the lecture on 3:21-26, p. 18, said to be that, not the chapter's first page (got ${JSON.stringify(got)})`);
}
// Migne's heads give a tractate's chapter and verses after its subject (Augustine on John: Tractate I, col. 35)
ok(JSON.stringify(A.rangeOf('TRACTATE I. On that of John, In the beginning was the Word, etc., up to that, And the darkness did not comprehend it. Chap. I, V. 1-5.', 1)) === '{"a":1,"b":5}'
  && JSON.stringify(A.rangeOf('TRACTATUS I. In illud Joannis, In principio erat Verbum, etc. Cap. I, V\\. 1-5.', 1)) === '{"a":1,"b":5}', "a tractate's heading names its chapter and verses, Latin or English");
ok(A.rangeOf('Chap. I, V. 1-5 is cited here', 1) === null && A.rangeOf('TRACTATE II. … Chap. I, V. 6-14.', 2) === null, 'only a heading that opens with its division names them, and only for its own chapter');
{
  const aug = { 35: paras('In Joannis evangelium tractatus CXXIV\nTRACTATE I. On that of John, In the beginning was the Word … Chap. I, V. 1-5.\n1. Seeing what we have just heard from the reading of the Apostle.\n2. Who then shall speak?\n3. Brethren, how shall we speak?\n4. Lift up your hearts.\n5. For the Word of God is not seen.\n6. Let none of you think.') };
  const r = A.createResolver(async (_s, n) => [aug[n] || [], []]);
  const got = await r.resolve({ slug: 'augustine-tractates', notes: {}, open: 35, close: 60, pv: {}, rows: {} }, 1, { name: 'John', ch: '1' });
  ok(got && got.how === 'range' && got.p === 35 && got.a === 1 && got.b === 5, `Augustine on John 1:1 opens at Tractate I, on 1:1-5, not "No note found" (got ${JSON.stringify(got)})`);
  ok(A.findNote(aug[35], 1) === -1, "the tractate's own sections, 1. 2. 3., are never taken for verses");
  // the library indexed Tractate I's §13 (col. 1385, on 1:3) as "his note on John 1:13"; Tractate II, on 1:6-14, begins at col. 1388
  const tr = { 1379: aug[35], 1385: paras('13. Truly, brethren, what follows, All things were made by him.'), 1388: paras('TRACTATE II. From that which is written, There was a man sent from God … Chap. I, V. 6-14.\n1. It is good, brethren.') };
  const r2 = A.createResolver(async (_s, n) => [tr[n] || [], []]);
  const g13 = await r2.resolve({ slug: 'augustine-tractates', notes: { 13: 1385 }, open: 1379, close: 1400, pv: {}, rows: {} }, 13, { name: 'John', ch: '1' });
  ok(g13 && g13.how === 'range' && g13.p === 1388, `an indexed "note" outside the tractate that holds the verse gives way to that tractate (got ${JSON.stringify(g13)})`);
}
// the Weimar edition prints a verse's chapter and number in the run of the text (Luther on Galatians 2:16, WA 40 I p. 217)
ok(JSON.stringify(A.cvMarks('… non solum ceremonias cavillatur. 2, 16Scientes autem, quod non iustificatur homo ex operibus legis.', 2)) === '[{"v":16,"at":34}]'
  && A.cvMarks('… and he does not cavil at ceremonies only. 2, 16 Knowing that a man is not justified by the works of the law.', 2)[0].v === 16, 'a verse marked "2, 16" after a sentence, Latin or English');
ok(!A.cvMarks('as Paul says, Gal. 2, 16 Knowing that a man', 2).length && !A.cvMarks('… and ceremonies only. 2, 16 Knowing', 3).length && !A.cvMarks('… vgl. 2, 16 Scientes', 2).length,
  "a citation (Gal. 2, 16), another chapter's verse or an editor's abbreviation is no marker");
{
  const wa = { 150: paras('Caput II.\n2, 1 Then after fourteen years I went up again to Jerusalem. He relates his journey.'),
    217: paras('He is an Apostle, a minister of the word. Paul therefore speaks roundly against all things which are opposed to faith, and he does not cavil at ceremonies only. 2, 16 Knowing that a man is not justified by the works of the law. These words are to be taken most widely.\nFor the work of the law is all that is done by the law.\nTherefore he says, not by the works of the law. 2, 17 But if, while we seek to be justified by Christ, we ourselves also are found sinners.') };
  const r = A.createResolver(async (_s, n) => [wa[n] || [], []]);
  const got = await r.resolve({ slug: 'luther-wa-40-1', notes: {}, open: 150, close: 300, pv: {}, rows: {} }, 16, { name: 'Galatians', ch: '2' });
  ok(got && got.how === 'note' && got.p === 217, `Luther on Galatians 2:16 opens at p. 217, where "2, 16" stands, not the chapter's first page (got ${JSON.stringify(got)})`);
  ok(A.findNote(wa[217], 16, false, 2) === 0 && A.noteEnd(wa[217], 0, 16, 14, 2) === 3, 'the note is the paragraph with "2, 16", and it runs to the one that marks 2:17, which is kept');
}
// an index row at the page that prints the verse ahead of the notes gives way to the note itself (Calvin, Galatians 2:16: p. 29 to p. 34)
{
  const gal = {
    29: ['11. But when Peter was come to Antioch, I withstood him to the face, because he was to be blamed.', '11. Quum autem venisset Petrus Antiochiam, in faciem ei restiti, quia reprehensibilis erat.',
      '12. For before that certain came from James, he did eat with the Gentiles.', '12. Nam antequam venirent quidam a Iacobo, cum Gentibus edebat.',
      '13. And the other Jews dissembled likewise with him.', '13. Et simulabant cum eo reliqui Iudaei.',
      '14. But when I saw that they walked not uprightly, I said unto Peter before them all.', '14. Sed quum viderem quod non recte incederent, dixi Petro coram omnibus.',
      '15. We who are Jews by nature, and not sinners of the Gentiles,', '15. Nos natura Iudaei, et non ex Gentibus peccatores,',
      '16. Knowing that a man is not justified by the works of the law, but by the faith of Jesus Christ.', '16. Scientes quod non iustificatur homo ex operibus Legis, sed per fidem Iesu Christi.',
      `11. But when Peter, etc. This passage is the strongest of all against the primacy which the Romanists claim.${MORE}`],
    30: [`12. For before that certain came, etc. He shows what was blamed in Peter.${MORE}`],
    34: [`16. But by the faith of Jesus Christ, etc. He states the doctrine he had preached.${MORE}`],
  };
  const r = A.createResolver(async (_s, n) => [gal[n] || [], []]);
  const cg = { slug: 'calvin-galatians', notes: { 16: 29, 12: 30 }, open: 28, close: 40, pv: {}, rows: {} }, G = { name: 'Galatians', ch: '2' };
  const g16 = await r.resolve(cg, 16, G), g12 = await r.resolve(cg, 12, G);
  ok(g16 && g16.p === 34 && g16.indexed, `Calvin on Galatians 2:16 opens at his note, p. 34, not the indexed page that prints the verse (got ${JSON.stringify(g16)})`);
  ok(g12 && g12.p === 30, `an indexed page that carries the note is kept (got ${JSON.stringify(g12)})`);
}

// ── 2026-11-08, the survey (owner: "do more testing and then fix"; 2,674 landings over 80 verses) ─────────────────────────────
// THE VERSE A HEADING NAMES: in brackets after a section's or a column's number, as a list or a range, or with its chapter in Roman
// numerals. None of these was read: Jerome, the default commentary on the Prophets, opened with nothing marked.
const VH = (s) => { const h = A.verseHead(s); return h ? `${h.chap != null ? `${h.chap}:` : ''}${h.list.join(',')}` : 'none'; };
ok(VH('(Vers. 14.) Therefore the Lord himself shall give you a sign.') === '14' && VH('305 (Chap. I.--Ver. 1.) In the beginning God created heaven and earth.') === '1:1'
  && VH('2. [vers. 2, 3.] O Lord, why are they multiplied that afflict me?') === '2,3' && VH('28. (Vers. 13, 14). As regards the persuasion of a credible testimony') === '13,14',
  'Jerome\'s "(Vers. 14.)" and "305 (Chap. I.--Ver. 1.)", Augustine\'s "2. [vers. 2, 3.]" and Bonaventure\'s "28. (Vers. 13, 14)." name their verses, never the number before them');
ok(VH('Chap. IX.-- (Vers. 8 seqq.) The Lord sent a word into Jacob') === '9:8' && VH('(Vers. 3, 4 et seq.) And the Lord said to Isaiah') === '3,4' && VH('(Ver. 23-25.) Now it was not written') === '23,24,25',
  'a chapter ahead of the bracket; "seqq." names the first verse only; a range names each');
ok(VH('VERS. 2-3.-- « And I will make of thee a great nation »') === '2,3' && VH('Verses 13, 14. And he said, Hear now, O house of David') === '13,14'
  && VH('VERSES 6, 7. "For I desire mercy and not sacrifice') === '6,7' && VH('Verses 1–3. I will love thee') === '1,2,3' && VH('PART II. VERS. 2.-- « He hath brought me up »') === '2',
  'a list or a range (the Gloss, Benson, Theodoret), and Lombard\'s "PART II. VERS. 2.--"');
ok(VH('LII. [Ib. XXI, 13.] It is to be noted that Ishmael') === '21:13' && VH('[Gen. XV, 6.] Abraham believed God') === '15:6' && VH('TO GENESIS CHAP. I. v. I. of things, comprehending the author of the world') === '1:1',
  "Augustine's Questions and Calov name the chapter in Roman numerals (Calov's verse too)");
ok(VH('CHAP. XVII.') === 'none' && VH('V. 3, 1 Cor. 2:9 shows it') === '3' && VH('(1) Patritius, in the work titled') === 'none' && VH('[T. X, C. XXIV, Cap. XVII.] And the Lord spoke') === 'none',
  "a chapter's heading, a citation after the verse, a footnote's mark and a volume's place name no verse");
// Augustine on Psalm 2 (cols. 69-70): "7. [vers. 8.]" was marked as his note on 2:7, by its section's number
const AUG_PS2 = paras(`5. [vers. 6.] But I am appointed king by him over Sion his holy mountain, preaching his commandment: these things are manifest.
6. [vers. 7.] The Lord hath said to me: Thou art my son, this day have I begotten thee. Although that day spoken of in prophecy can also be understood.
7. [vers. 8.] Ask of me, and I will give thee the Gentiles for thy inheritance. This now temporally according to the man assumed.
8. [vers. 9, 10.] Thou shalt rule them with a rod of iron: in inflexible justice.`);
ok(A.findNote(AUG_PS2, 7) === 1 && A.noteEnd(AUG_PS2, 1, 7, 14) === 2, 'Augustine on Psalm 2:7 is his "6. [vers. 7.]", and it ends at "7. [vers. 8.]"');
ok(A.findNote(AUG_PS2.slice(2), 7) === -1 && A.findNote(AUG_PS2, 10) === 3, '"7. [vers. 8.]" alone is not his note on verse 7; "[vers. 9, 10.]" is his note on verse 10');
// Jerome's Hebrew Questions name the chapter: "(Chap. XIV.--Ver. 3.)" is no note on Genesis 12:3 (the survey took it for one)
const JER_GEN = paras(`(Chap. XI.--Ver. 28.) And Haran died before his father in the land of his nativity, in the region of the Chaldeans.
(Chap. XIV.--Ver. 3.) And the king of Bela, which is Zoar. All these were joined together in the vale of Siddim.
(Ver. 5.) And they smote the giants in Astaroth Karnaim.`);
ok(A.findNote(JER_GEN, 3, false, 12) === -1 && A.findNote(JER_GEN, 3, false, 14) === 1 && A.findNote(JER_GEN, 5, false, 12) === -1,
  "a heading of another chapter, and those under it, are that chapter's");
ok(A.findNote(paras('LII. [Ib. XXI, 13.] It is to be noted that Ishmael is called the seed of Abraham.\nLIII. [Ib. XXI, 14.] Hagar is sent away.'), 13, false, 21) === 0
  && A.findNote(paras('LII. [Ib. XXI, 13.] It is to be noted that Ishmael is called the seed of Abraham.'), 52, false, 21) === -1, "Augustine's Questions: \"LII. [Ib. XXI, 13.]\" is on Genesis 21:13; LII is the question's number");
// the narrowest heading of a verse is its note (the Gloss prints a section's verses, then glosses them one by one)
const NARROW = paras(`VERS. 1-8.-- « What then shall we say that Abraham our father found according to the flesh? »
VERS. 3.-- « For what saith the Scripture? Abraham believed God, and it was counted unto him for righteousness. » (AUG.) Faith alone.`);
ok(A.findNote(NARROW, 3) === 1 && A.findNote(NARROW, 5) === 0, 'a heading of verse 3 before one of verses 1 to 8; a range holds each verse it names');
// Aquinas's "31:35 Thus says the Lord" is Jeremiah 31:35, and it was marked as his note on 31:31
ok(!A.bareRx(31).test('31:35 Thus says the Lord, who gives the sun as the light of the day') && A.findNote(paras('31:35 Thus says the Lord, who gives the sun as the light of the day, the order of the moon.'), 31) === -1,
  'a chapter and its verse ("31:35") is not a bare verse 31');
// Piscator numbers his notes with no stop and closes the verse's words with a bracket
const PISC = paras(`6 But I have anointed my king] That is, I have constituted Christ as king, which is signified by anointing.
7 I will declare the decree] Namely, the decree of Jehovah God the Father. For here Christ is introduced speaking.
8 Ask of me] Namely, by prayer: for Christ as man obtains by prayer the kingdom from the Father.`);
ok(A.findNote(PISC, 7) === 1 && A.noteEnd(PISC, 1, 7, 14) === 2, 'Piscator\'s "7 I will declare the decree] Namely …" is his note on Psalm 2:7, ending at his note on verse 8');
ok(A.findNote(paras('10 Because thou hast made the Lord thy refuge, no evil shall befall thee.\n11 For he shall give his angels charge over thee.'), 10) === -1
  && A.findNote(paras('5 Iustitiam] Iu cf P[romissionem] 5 /6 quia bis mundi in kleinerm Duktus eingeschoben\n6 credenti] glaubt B\n17 jha B'), 5) === -1,
  "with no bracket a number with no stop is left alone (Denys); nor is a bracket on a page of the editors' apparatus a note (Weimar)");
// Hammond prints the verse and then his paraphrase of it: the paraphrase is his comment
const HAMMOND = paras(`Paraphrase. 9. This is full matter of joy to my heart, and of boasting to my tongue, and of all kind of assurance to every part of me.
10. For thou wilt not leave my soul in hell; neither wilt thou suffer thine holy one to see corruption.
Paraphrase. 10. For thy promises to me are firm, and oblige thee not to forsake me so, as that I shall be either killed by Saul, or opprest by any enemy.`);
ok(A.findNote(HAMMOND, 10) === 2, 'Hammond on Psalm 16:10 opens at his Paraphrase, not at the verse he prints');
ok(A.findNote(paras('Lecture 7\n26. And as they were eating, Jesus took bread, and blessed it, and brake it, and gave it to the disciples.\nJerome When the typical Passover was concluded, and He had partaken of the Lamb with His Apostles, He comes to the true paschal sacrament.'), 26) === 1
  && A.findNote(BAXTER, 5) === 0, "a verse followed by prose is left as it is (the Catena), and so is Baxter's verse with his paraphrase");
// Calvin (the Society): the verses in English and Latin are the text with no note in sight; a section's verses under their reference
const CAL_IS40 = paras(`Isaiah 40:1-31
1. Comfort ye, comfort ye my people, saith your God.
1. Consolamini, consolamini populum meum, dicit Deus vester.
2. Speak ye comfortably to Jerusalem, and cry unto her, that her warfare is accomplished, that her iniquity is pardoned.
2. Loquimini secundum cor Ierusalem, et clamate ad eam, quod impleta sit militia ejus, quod remissa sit iniquitas ejus.`);
ok(A.findNote(CAL_IS40, 2) === -1 && [1, 2, 3, 4].every((k) => A.lemmaParts(CAL_IS40).ahead.has(k)), "Calvin on Isaiah 40:8: the text in both tongues over pp. 108-110 is the text, with the first note pages on");
const CAL_JN1 = paras(`John 1:14
14. And the Speech was made flesh, and dwelt among us, (and we beheld his glory, the glory as of the only-begotten of the Father,) full of grace and truth.
14. And the Speech was made flesh. The Evangelist shows what was that coming of Christ which he had mentioned; namely, that having been clothed with our flesh, he showed himself openly to the world.`);
ok(A.findNote(CAL_JN1, 14) === 2, 'a section of one verse: the verse under its reference, then the note that restates it (John 1:14)');
const CAL_DN7 = paras(`Daniel 7:13
13. I saw in the night-visions, and, behold, one like the Son of man came with the clouds of heaven, and came to the Ancient of days.
13. Videbam in visionibus noctis: et ecce in nubibus coeli tanquam Filius hominis veniebat, et usque ad Antiquum dierum pervenit.
After Daniel has narrated how he saw God on the throne of judgment, openly exercising his power and laying open the books, he now adds a second vision.`);
ok(A.findNote(CAL_DN7, 13) === 3, "a section's text with no numbered note after it: the comment that follows is the note on its first verse (Daniel 7:13)");
ok(A.findNote(paras(`Micah 5:1-2
1. Now gather thyself in troops, O daughter of troops: he hath laid siege against us: they shall smite the judge of Israel.
1. Nunc colligas te filia congregationis; obsidionem posuit contra nos; virga percutient in maxillam judicem Israel.
2. But thou, Bethlehem Ephratah, though thou be little among the thousands of Judah, yet out of thee shall he come forth.
2. Et tu Beth-lehem Ephrata, parva ad essendum inter millia Jehudah; ex te mihi egredietur qui sit dominator in Israel.
To encourage the faithful to patience, the Prophet again reminds them that hard and severe time was nigh; for he had before spoken of the restoration.`), 2) === -1,
  'but not on its second verse (Micah 5:2): that comment opens on 5:1');
{
  // the next chapter's page is read up to the next chapter's heading (Grotius on Numbers 21:9, at p. 139 where chapter 22 begins)
  const g = { 138: paras('CHAPTER XXI.\n1. WHEN THE KING ARAD HEARD] Arad is the name of a city of the Canaanites.\n5. LIGHT BREAD] Manna, so called by those who loathed it.'),
    139: paras('9. BRONZE SERPENT] Bronze naturally harms those who are reptilian. But when God wishes to heal, he heals by contraries.\nCHAPTER XXII.\n1. AND THE CHILDREN OF ISRAEL SET FORWARD] From the mountains of Abarim.') };
  const r = A.createResolver(async (_s, n) => [g[n] || [], []]), cg = { slug: 'grotius', notes: {}, open: 138, close: 139, pv: {}, rows: {} }, W21 = { name: 'Numbers', ch: '21' };
  const s21 = await r.section(cg, W21), g9 = await r.resolve(cg, 9, W21);
  ok(s21.hi === 139 && s21.heads[1].p === 138 && g9.how === 'note' && g9.p === 139, `Grotius on Numbers 21:9 is on the next chapter's page, p. 139, and chapter 22's "1." is not chapter 21's (got ${JSON.stringify(g9)})`);
  // with the next chapter on the same page, the section is that page, and does not move to a reprinted text twenty pages on (the
  // Westminster Annotations on Hebrews 1, p. 456, opened Revelation, p. 476)
  const wa = { 456: paras('CHAP. I.\nV. 3. the brightnesse] The beaming forth of the light of his Fathers glory.\nCHAP. II.\nV. 1. the more earnest heed] Seeing Christ is so excellent.'),
    476: LEM };
  const rw = A.createResolver(async (_s, n) => [wa[n] || [], []]), H1 = { name: 'Hebrews', ch: '1' }, cw = { slug: 'wa', notes: {}, open: 456, close: 456, pv: {}, rows: {} };
  const sw = await rw.section(cw, H1), w3 = await rw.resolve(cw, 3, H1);
  ok(sw.lo === 456 && sw.hi === 456 && !sw.heads[1] && w3.p === 456 && w3.how === 'note', `the Westminster Annotations on Hebrews 1:3 open at p. 456, not at Revelation; Hebrews 2:1 is not 1:1 (got ${JSON.stringify(w3)})`);
  // the section starts at the chapter's own heading: Augustine's Psalm 1 ends above "ENARRATION ON PSALM II." (col. 69), and its "6. [vers.
  // 6.]" took the index's first numbers, so that his Psalm 2 headings were refused as going back
  const aug = { 69: paras('5. [vers. 5.] Therefore the ungodly shall not rise again in judgment.\n6. [vers. 6.] For the Lord knoweth the way of the just.\nENARRATION ON PSALM II.\n1. [vers. 1, 2.] Why have the Gentiles raged, and the people devised vain things?\n6. [vers. 7.] The Lord hath said to me: Thou art my son.') };
  const ra = A.createResolver(async (_s, n) => [aug[n] || [], []]), ca = { slug: 'aug-ps', notes: {}, open: 69, close: 72, pv: {}, rows: {} }, P2 = { name: 'Psalms', ch: '2' };
  const a7 = await ra.resolve(ca, 7, P2), a6 = await ra.resolve(ca, 6, P2);
  ok(a7.how === 'note' && a7.p === 69 && !(await ra.located(ca, 5, P2)) && a6.how !== 'note', `Augustine on Psalm 2:7 is found, and his Psalm 1's "[vers. 5.]" and "[vers. 6.]" are no notes on Psalm 2 (got ${JSON.stringify([a7, a6])})`);
}
{
  // Calvin prints Genesis 3 in both tongues over pp. 58-59; his first note is on p. 60, his note on 3:15 on p. 72. A page the library files
  // as on the verse, which prints it in that text, gives way to the note, the text read whole across its pages
  const two = (n, en, la) => `${n}. ${en}\n${n}. ${la}`;
  const cal = { 58: paras(`CHAPTER 3.\nGenesis 3:1-24\n${two(1, 'Now the serpent was more subtil than any beast of the field which the LORD God had made.', 'Porro serpens erat callidior omni bestia agri, quam fecerat Jehova Deus.')}\n${two(14, 'And the LORD God said unto the serpent, Because thou hast done this, thou art cursed above all cattle.', 'Et dixit Jehova ad serpentem, Quia fecisti hoc, maledictus eris prae omni animali.')}`),
    59: paras(`${two(15, 'And I will put enmity between thee and the woman, and between thy seed and her seed.', 'Et inimicitias ponam inter te et inter mulierem, et inter semen tuum et inter semen ejus.')}\n${two(16, 'Unto the woman he said, I will greatly multiply thy sorrow and thy conception.', 'Ad mulierem dixit, Multiplicando multiplicabo dolorem tuum, et conceptum tuum.')}`),
    60: paras(`1. Now the serpent was more subtil. In this chapter, Moses explains, that man, after he had been deceived by Satan, revolted from his Maker.${MORE}`),
    72: paras(`15. I will put enmity. I interpret this simply to mean that there should always be the hostile strife between the human race and serpents.${MORE}`) };
  const r = A.createResolver(async (_s, n) => [cal[n] || [], []]);
  const c3 = { slug: 'calvin-genesis', notes: {}, open: 58, close: 84, pv: {}, rows: { 15: [{ w: 'calvin-genesis', how: 'explicit', p: 59, g: "Calvin's comment on Genesis 3:15" }] } };
  const got = await r.resolve(c3, 15, { name: 'Genesis', ch: '3' });
  ok(got && got.how === 'note' && got.p === 72, `Calvin on Genesis 3:15 opens at his note, p. 72, not at the verse in his text, p. 59 (got ${JSON.stringify(got)})`);
}
// Calvin's Harmony of the Law heads a passage with its reference and his note with it again (Exodus 20:3, the default commentary)
const HARM = paras(`Exodus 20:3
3. Thou shalt have no other gods before me.
3. Non erunt tibi dii alieni coram facie mea.
Deuteronomy 5:7
7. Thou shalt have none other gods before me.
7. Non erunt tibi dii alieni coram facie mea.
Exodus 20:3 Thou shalt have no other gods before me. In this commandment God enjoins that He alone should be worshipped.
Deuteronomy 6:4, 13, 16
4. Hear, O Israel; The Lord our God is one Lord.
4. Audi, Israel, Jehova Deus noster Deus unus est.`);
ok(A.findNote(HARM, 3, true, 20) === 6 && A.noteEnd(HARM, 6, 3, 14, 20) === 8, "Calvin's Harmony: \"Exodus 20:3 Thou shalt have …\" is his note on Exodus 20:3, not the verse he prints, and it ends at the next passage's text");
ok(A.findNote(HARM, 3, true, 13) === -1, 'and it is no note on chapter 13');
// a chapter's heading closes the search for a narrower heading: Lombard's Philemon "VERS. 1-6.--" follows his Titus 3 "VERS. 1-15.--" on
// one page, under "CHAPTER ONE.", a number in words
ok(A.findNote(paras('CHAPTER III.\nVERS. 1-15.-- "Admonish them to be subject to princes and powers, to obey at a word."\nAdmonish. As if he were to say.\nARGUMENT.\nCHAPTER ONE.\nVERS. 1-6.-- "Paul, a prisoner of Christ Jesus, and Timothy, a brother, to Philemon."'), 5, false, 3) === 1,
  "Lombard on Titus 3:5 is his \"VERS. 1-15.--\", not Philemon's \"VERS. 1-6.--\"");
// Piscator's notes on Hosea 5 follow his analysis of chapters 5 to 7 ("ANALYSIS CHAP. V. VI. &"): they are no notes on Hosea 6
ok(A.verseHead('ANALYSIS CHAP. V. VI. &') == null && A.findNote(paras('ANALYSIS CHAP. V. VI. &\n5 And the pride of Israel] Heb. the excellency.\n6 That with flocks &c.] Heb. With their flocks and with their herds they shall go to seek the Lord.'), 6, false, 6) === -1,
  '"CHAP. V. VI." names chapters, and the bracketed notes under a heading of another chapter are not this chapter\'s');
{
  // the next chapter's page is read only above a heading of it: Calov's "Vers. 1. DOMINUS REGIT ME" (Psalm 23) on the map's page for
  // Psalm 23 is not his note on Psalm 22:1; the start does not move past the library's notes on the chapter (Bellarmine's Psalm 23)
  const cv = { 1017: paras('PSALM XXII.\nVers. 4. Our fathers hoped in thee) Namely the fathers of the Old Testament.'), 1025: paras('Vers. 1. DOMINUS REGIT ME) The Chaldee thinks it to be an ode composed in the name of the people.') };
  const r = A.createResolver(async (_s, n) => [cv[n] || [], []]), W22 = { name: 'Psalms', ch: '22' };
  const s22 = await r.section({ slug: 'calov', notes: {}, open: 1017, close: 1025, pv: {}, rows: {} }, W22);
  ok(s22.heads[4] && !s22.heads[1], `the next psalm's "Vers. 1." on its own map page is not indexed (got ${JSON.stringify(Object.keys(s22.heads))})`);
  const bel = { 136: paras('PSALM XXII.\nThe Lord ruleth me, and I shall want nothing.'), 137: paras('3. He hath converted my soul. He hath led me on the paths of justice, for his own name\'s sake.'),
    140: paras(Array.from({ length: 8 }, (_, i) => `${i + 1}. The earth is the Lord's, verse ${i + 1}.`).join('\n')) };
  const rb = A.createResolver(async (_s, n) => [bel[n] || [], []]);
  const sb = await rb.section({ slug: 'bel', notes: { 2: 138, 3: 137, 4: 137, 5: 137 }, open: 136, close: 142, pv: {}, rows: {} }, { name: 'Psalms', ch: '23' });
  ok(sb.lo === 136, `the section does not start at p. 140, past the library's notes at pp. 137-138 (got ${sb.lo})`);
  // with no next chapter on the map, a long exposition is read as far as most of the library's rows on it go: Taylor's Titus 3 runs from
  // p. 539 to p. 745, his note on 3:5 at p. 635; one stray row far off does not carry the read
  const tay = { 539: paras('CHAP. III. PVt them in remembrance that they be subiect to the principalities and powers.'), 558: paras('vers. 2. That they speake evil of no man.'),
    635: paras('Vers. 5. Not of the workes of righteousness,] The third and principal instruction in this principal efficient cause.') };
  const rt = A.createResolver(async (_s, n) => [tay[n] || [], []]), T3 = { name: 'Titus', ch: '3' };
  const rowsAt = (ps) => ({ 2: ps.map((p) => ({ w: 'taylor', how: 'explicit', p, g: '' })) });
  const t5 = await rt.resolve({ slug: 'taylor', notes: {}, open: 539, pv: {}, rows: rowsAt([558, 582, 600, 615, 622, 635, 640, 657, 665, 679]) }, 5, T3);
  const t5b = await A.createResolver(async (_s, n) => [tay[n] || [], []]).resolve({ slug: 'taylor2', notes: {}, open: 539, pv: {}, rows: rowsAt([541, 545, 550, 558, 560, 562, 565, 568, 570, 900]) }, 5, T3);
  ok(t5.how === 'note' && t5.p === 635 && !(t5b.how === 'note' && t5b.p === 635), `Taylor's note on Titus 3:5, 96 pages in, is found where the library's rows run so far, and not on one stray row (got ${JSON.stringify([t5, t5b])})`);
  // the Westminster Annotations print John 1, 2 and 3 on p. 399: the section starts at "CHAP. III.", and "CHAP. I." above it is no end
  const wj = { 399: paras('CHAP. I.\nVers. 1. IN the beginning] 1 John 1. 1. From eternity.\nCHAP. II.\nV. 1. a marriage] A wedding feast.\nV. 4. Woman] No disrespect.\nCHAP. III.\nVers. 1. PHarisees] See the note on Joh. 1. 24.\nV. 5. of water] Of baptisme the Sacrament of regeneration.\nCHAP. IIII.\nV. 5. Sychar] Called Sichem.') };
  const rj = A.createResolver(async (_s, n) => [wj[n] || [], []]), cj = { slug: 'wa-john', notes: {}, open: 399, close: 400, pv: {}, rows: {} }, J3 = { name: 'John', ch: '3' };
  const sj = await rj.section(cj, J3), j5 = await rj.resolve(cj, 5, J3);
  ok(sj.lo === 399 && sj.hi === 399 && sj.heads[1] && sj.heads[5] && j5.how === 'note' && j5.p === 399, `the Westminster Annotations on John 3:5: John 3's own notes are indexed, between "CHAP. III." and "CHAP. IIII." (got ${JSON.stringify([Object.keys(sj.heads), j5])})`);
  // a chapter's heading in capitals may run on into its argument; the note under it is that chapter's, not this one's (Poole's
  // Annotations, indexed at p. 445 for Psalm 32:1, where Psalm 33 begins)
  ok(A.chapterHead('PSAL. XXXIII. The ARGUMENT. This Psalm contains a Celebration of God, in respect of his Excellency, and of his works of Creation and Providence, both in general and in particular, toward his Church and People.', true) === 33
    && A.findNote(paras('11. Be glad in the LORD] For he is the fountain of your joy.\nPSAL. XXXIII. The ARGUMENT. This Psalm contains a Celebration of God, in respect of his Excellency, and of his works of Creation and Providence, both in general and in particular.\n1. REjoyce in the LORD Let his Excellency discovered in his works, be the Matter of your joy.'), 1, true, 32) === -1,
    "Psalm 33's \"1. REjoyce in the LORD\" is no note on Psalm 32:1");
}
{
  // a psalm's title counted as its first verses: Augustine's "[vers. 7.]" on Psalm 51 (his 50) is the English 51:5, and was about to be
  // marked as his note on 51:3 ("[vers. 5.]"); it opens at "[vers. 7.]", with nothing marked
  const aug = { 586: paras('ENARRATION ON PSALM L.\n2. [vers. 1, 2.] For its title is inscribed, A Psalm to David himself, when Nathan the prophet came to him.\n6. [vers. 3.] Hear these things, therefore, and say with him: Have mercy on me, O God.\n8. [vers. 5.] For I acknowledge my iniquity, and my sin is always before me.'),
    590: paras('10. [vers. 7.] To thee only have I sinned, and have done evil before thee: that thou mayest be justified in thy words. For behold I was conceived in iniquities.') };
  const r = A.createResolver(async (_s, n) => [aug[n] || [], []]);
  const got = await r.resolve({ slug: 'aug-ps', notes: {}, open: 586, close: 607, pv: {}, rows: {} }, 5, { name: 'Psalms', ch: '51' });
  ok(got.how === 'range' && got.p === 590 && got.a === 5 && got.b === 5, `Augustine on Psalm 51:5 opens at his "[vers. 7.]" with nothing marked (got ${JSON.stringify(got)})`);
}
// Hammond paraphrases verses 4 to 6 of Hebrews 6 together, under the three he prints: "Paraphrase 4, 5, 6." is his comment on 6:4
const HEB6 = paras(`4. For it is impossible for those who were once inlightned, and have tasted of the heavenly gift, and were made partakers of the holy Ghost,
5. And have tasted the good word of God, and the powers of the world to come,
6. If they shall fall away, to renew them again unto repentance, seeing they crucify to themselves the Son of God afresh.
Paraphrase 4, 5, 6. For as for those that have been received into the Church by Baptism, and so by oath obliged themselves to continue in the true faith.`);
ok(VH('Paraphrase 4, 5, 6. For as for those that have been received into the Church') === '4,5,6' && A.findNote(HEB6, 4) === 3 && A.findNote(HEB6, 6) === 3,
  'Hammond on Hebrews 6:4 is his "Paraphrase 4, 5, 6.", not the verse he prints');
{
  // the start of the chapter is not held at the library's first rows when they are keyed to another chapter: Clarke's rows on 2 Timothy
  // 3:7 and 3:10-17 stand at pp. 135-136, among his notes on chapter 1, and his "Verse 16. The Lord give mercy]" (1:16) was marked as
  // his note on 3:16 ("All scripture is given by inspiration of God", p. 145)
  const cl = { 135: paras('Verse 9. Who hath saved us] From sin.\nVerse 10. But is now made manifest] This purpose of God.\nVerse 11. Whereunto I am appointed a preacher] A herald.\nVerse 12. I am not ashamed] Though I suffer.'),
    136: paras('Verse 13. Hold fast the form of sound words] The sketch.\nVerse 14. That good thing] The everlasting gospel.\nVerse 15. All they which are in Asia] The Asiatic converts.\nVerse 16. The Lord give mercy] Onesiphorus had acknowledged him, and continued to do so.\nVerse 17. When he was in Rome] Onesiphorus was an Asiatic.'),
    141: paras(`Verse 26. And that they may recover themselves] The construction of this verse is difficult.
CHAPTER III.
1. This know also, that in the last days perilous times shall come.
2. For men shall be lovers of their own selves, covetous, boasters, proud, blasphemers.
3. Without natural affection, trucebreakers, false accusers, incontinent, fierce.
4. Traitors, heady, highminded, lovers of pleasures more than lovers of God.
5. Having a form of godliness, but denying the power thereof: from such turn away.
6. For of this sort are they which creep into houses, and lead captive silly women.`),
    142: paras('NOTES ON CHAP. III.\nVerse 1. In the last days] This often means the days of the Messiah.\nVerse 2. For men shall be] The description in this and the following verses.'),
    145: paras('Verse 14. But continue thou] No man, however well instructed.\nVerse 15. From a child thou hast known the holy scriptures] The early religious education of Timothy.\nVerse 16. All scripture is given by inspiration of God] This sentence is not well translated.\nVerse 17. That the man of God may be perfect] Complete.') };
  const r = A.createResolver(async (_s, n) => [cl[n] || [], []]);
  const notes = { 1: 142, 2: 142, 5: 143, 7: 135, 8: 144, 9: 144, 10: 135, 11: 135, 12: 135, 13: 144, 14: 145, 15: 145, 16: 136, 17: 136 };
  const got = await r.resolve({ slug: 'clarke', notes, open: 135, close: 146, pv: {}, rows: {} }, 16, { name: '2 Timothy', ch: '3' });
  ok(got.how === 'note' && got.p === 145, `Clarke on 2 Timothy 3:16 is at p. 145, not at his note on 1:16 (got ${JSON.stringify(got)})`);
  // a stray heading ahead of the count is no heading of the chapter's: Migne's footnote "v. 18." between his notes on 1 John 4:3 and 4:4
  // took the place of verses 4 to 17, and the reader was sent to 4:3 for 4:8
  const mg = { 467: paras('CHAPTER IV.'), 468: paras('VERSE 1. — BELOVED, BELIEVE NOT EVERY SPIRIT, but test the spirits.\nVERSE 2. — HEREBY KNOW YE THE SPIRIT OF GOD.\nVERSE 3. — AND EVERY SPIRIT THAT DISSOLVES JESUS.'),
    469: paras('v. 18. In similar language John the Baptist is called Elijah, Matthew 11:14, because he was going before Christ in the spirit and power of Elijah, Luke 1:17.\nVERSE 4. — YOU ARE OF GOD, BELOVED CHILDREN, and you have conquered.\nVERSE 5. — THEY ARE OF THE WORLD, those antichrists.\nVERSE 6. — WE ARE OF GOD.'),
    470: paras('VERSE 7. — BELOVED, LET US LOVE ONE ANOTHER.\nVERSE 8. — WHOEVER DOES NOT LOVE with fraternal charity his neighbor DOES NOT KNOW GOD.') };
  const rm = A.createResolver(async (_s, n) => [mg[n] || [], []]), J4 = { name: '1 John', ch: '4' };
  const m8 = await rm.resolve({ slug: 'migne', notes: {}, open: 467, close: 475, pv: {}, rows: {} }, 8, J4);
  ok(m8.how === 'note' && m8.p === 470, `Migne on 1 John 4:8 is his "VERSE 8.", past the footnote's "v. 18." (got ${JSON.stringify(m8)})`);
  // a note that lists "1. … 2." inside it is no line of the text: Poole's Synopsis on 1 John 4:8, indexed at p. 820, stays there
  const po = { 820: paras(`7. *Let us love one another*] As above 3:23, I draw it to all, on account of the argument which he will now bring concerning the Love of God.
8. *He that loveth not* (either, 1. a brother: or, 2. God, and neighbor on account of God,) *knoweth not God*] That is, Does not show that he so knows God.
¶ *For God is love*] Not only causally, but also essentially; as he is also wisdom, and power, goodness.
9. *The love of God toward*, etc. For, εἰς ἡμᾶς, by a frequent locution.`) };
  const rp = A.createResolver(async (_s, n) => [po[n] || [], []]);
  const p8 = await rp.resolve({ slug: 'poole', notes: { 7: 820, 8: 820, 9: 820 }, open: 819, close: 822, pv: {}, rows: {} }, 8, J4);
  ok(p8.how === 'note' && p8.p === 820 && p8.indexed, `Poole's Synopsis on 1 John 4:8 keeps the library's page (got ${JSON.stringify(p8)})`);
  // a tractate's numbered sections are no verses: Augustine's "3." in his Tractate CV on John 17:1-5 was marked as his note on 17:3
  const tr = { 1903: paras(`TRACTATE CV. From that which the Lord says, That thy Son may glorify thee; up to that, With the glory which I had, before the world was, with thee. Chap. XVII, V. 1-5.
1. The Lord could, if he would, have prayed in silence; but he willed so to show himself one who prays to the Father.
3. Some accept the Son glorified by the Father, in this that he spared him not, but delivered him for us all.`) };
  const rt = A.createResolver(async (_s, n) => [tr[n] || [], []]);
  const t3 = await rt.resolve({ slug: 'aug-jn', notes: {}, open: 1903, close: 1929, pv: {}, rows: { 3: [{ w: 'aug-jn', how: 'explicit', p: 1903, g: "Augustine's comment on John 17:3" }] } }, 3, { name: 'John', ch: '17' });
  ok(t3.how === 'range' && t3.p === 1903 && t3.a === 1 && t3.b === 5, `Augustine on John 17:3 opens at Tractate CV on 17:1-5, with nothing marked (got ${JSON.stringify(t3)})`);
  // the map gives Aquinas's Romans 10 on his Romans 9's first page: his lectures that name their verses are read on (9:6-13 at p. 51)
  const aq = { 50: paras('L. 1 (9:1–5) The Apostle shows his sorrow for the Jews.\n696. After showing the necessity and power of grace, the Apostle now inquires into its origin.'),
    51: paras('L. 2 (9:6–13) The word of God has not failed.\n752. After stating the dignity of the Jews, the Apostle shows that the promise does not fail.') };
  const ra = A.createResolver(async (_s, n) => [aq[n] || [], []]);
  const a13 = await ra.resolve({ slug: 'aq-rom', notes: {}, open: 50, close: 50, pv: {}, rows: {} }, 13, { name: 'Romans', ch: '9' });
  ok(a13.how === 'range' && a13.p === 51 && a13.a === 6 && a13.b === 13, `Aquinas on Romans 9:13 opens at his lecture on 9:6-13, p. 51 (got ${JSON.stringify(a13)})`);
  // a row on the next chapter's page, where its heading cannot be read, is taken only for the chapter's last verses: Coke's rows put Psalm
  // 18:1 at p. 53 ("PSA.L., XIX."), past his notes on 18:2-8; the note there is his on 19:1
  const ck = { 45: paras('PSAL. XVIII.\nVer. 2. The Lord is my rock] A rock of defence.'), 46: paras('Ver. 7. In my distress] When I was in danger of death.\nVer. 8. Then the earth shook] The figure of a great tempest.'),
    53: paras("### PSA.L., XIX.\nVer. 1. The heaven's declare] Tell, or preach, according to the force of the Hebrew.") };
  const rc = A.createResolver(async (_s, n) => [ck[n] || [], []]), P18 = { name: 'Psalms', ch: '18' };
  const k1 = await rc.resolve({ slug: 'coke', notes: { 1: 53, 9: 53 }, open: 45, close: 53, pv: {}, rows: {} }, 1, P18);
  const k9 = await rc.resolve({ slug: 'coke', notes: { 1: 53, 9: 53 }, open: 45, close: 53, pv: {}, rows: {} }, 9, P18);
  ok(k1.p !== 53 && k9.how === 'note' && k9.p === 53, `Coke on Psalm 18:1 is not his note on 19:1, p. 53; a row there for a verse after his last heading is kept (got ${JSON.stringify([k1, k9])})`);
  // the notes under another chapter's references are that chapter's: Calvin's Harmony of the Law prints Deuteronomy 9:1-6 within the
  // pages the map gives Deuteronomy 6, and his "4. Speak not thou in thine heart" is no note on 6:4; a run of references is read as one
  // (the Harmony of the Gospels: "Matthew 16:13-19", "Mark 8:27-29", "Luke 9:18-20", then the notes on all three)
  const hl = { 198: paras('Deuteronomy 6:6-9\n6. And these words, which I command thee this day, shall be in thine heart.\n6. Et erunt verba haec quae ego praecipio tibi hodie in corde tuo.\n6. And these words. He commands the law to be engraven on their hearts, that it may not be a dead letter.'),
    206: paras('Deuteronomy 9:1-6\n1. Hear, O Israel: Thou art to pass over Jordan this day, to go in to possess nations greater and mightier than thyself.\n1. Audi Israel, Tu transis hodie Jordanem, ut ingrediaris ad possidendum gentes magnas et robustas.\n4. Speak not thou in thine heart, after that the Lord thy God hath cast them out from before thee.\n4. Ne dicas in corde tuo, quum expulerit Jehova Deus tuus illos a facie tua.'),
    207: paras('4. Speak not thou in thine heart. He now more plainly warns the people not to exalt themselves in proud and foolish boasting.') };
  const rh = A.createResolver(async (_s, n) => [hl[n] || [], []]);
  const d4 = await rh.resolve({ slug: 'cal-law', notes: {}, open: 198, close: 193, pv: {}, rows: { 4: [{ w: 'cal-law', how: 'explicit', p: 207, g: "Calvin's comment on Deuteronomy 6:4" }] } }, 4, { name: 'Deuteronomy', ch: '6' });
  const hg = { 161: paras(`Matthew 16:13-19; Mark 8:27-29; Luke 9:18-20
Matthew 16:13-19
Mark 8:27-29
Luke 9:18-20
13. And when Jesus came to the coasts of Cesarea Philippi, he asked his disciples, saying, Who do men say that I the Son of man am?
16. Thou art the Christ. The confession is short, but it embraces all that is contained in our salvation, for the name Christ includes the kingly and priestly office.`) };
  const rg = A.createResolver(async (_s, n) => [hg[n] || [], []]);
  const g16 = await rg.resolve({ slug: 'cal-harm', notes: {}, open: 161, close: 170, pv: {}, rows: { 16: [{ w: 'cal-harm', how: 'explicit', p: 161, g: "Calvin's comment on Matthew 16:16" }] } }, 16, { name: 'Matthew', ch: '16' });
  ok(!(d4.how === 'note' && d4.p === 207) && g16.how === 'note' && g16.p === 161, `Calvin's note on Deuteronomy 9:4 is no note on 6:4, and the Harmony's notes after its three references are found (got ${JSON.stringify([d4, g16])})`);
  // (2026-11-09, pane3b; screen1's Bible-wide run) and a reference counts only for its own book: his "Leviticus 19:16, 17", a page before
  // "Deuteronomy 19:16-21", heads his note on Leviticus 19:17, no note on Deuteronomy 19:17
  const lv = { 100: paras('Leviticus 19\nLeviticus 19:16, 17\n16. Thou shalt not go up and down as a tale-bearer among thy people.\n16. Non incedes obtrectator in populis tuis.\n17. Thou shalt in any wise rebuke thy neighbor, and not suffer sin upon him.\n17. Corripiendo corripies proximum tuum, neque excitabis super eum crimen.\n16. Thou shalt not go up and down. The principle of the second clause is the same as that of the foregoing verse.\n17. Thou shalt in any wise rebuke thy neighbor. Because many, under the pretext of conscientiousness, are not careful to admonish.'),
    101: paras('Deuteronomy 19\nDeuteronomy 19:16-21\n16. If a false witness rise up against any man, to testify against him that which is wrong;\n16. Quum steterit testis mendax contra aliquem, ut testificetur contra eum verbum perversum:\n17. Then both the men, between whom the controversy is, shall stand before the Lord;\n17. Tunc stabunt duo illi homines quibus est lis, coram Jehova;\n16. If a false witness rise up against any man. Because the fear of God does not so prevail in all men, as that they abstain.') };
  const rl = A.createResolver(async (_s, n) => [lv[n] || [], []]);
  const dt17 = await rl.resolve({ slug: 'cal-law3', notes: {}, open: 100, close: 101, pv: {}, rows: { 17: [{ w: 'cal-law3', how: 'explicit', p: 101, g: "Calvin's comment on Deuteronomy 19:17" }] } }, 17, { name: 'Deuteronomy', ch: '19' });
  const lv17 = await A.createResolver(async (_s, n) => [lv[n] || [], []]).resolve({ slug: 'cal-law3b', notes: {}, open: 100, close: 101, pv: {}, rows: { 17: [{ w: 'cal-law3b', how: 'explicit', p: 100, g: "Calvin's comment on Leviticus 19:17" }] } }, 17, { name: 'Leviticus', ch: '19' });
  ok(!(dt17 && dt17.how === 'note' && dt17.p === 100) && lv17 && lv17.how === 'note' && lv17.p === 100,
    `a reference counts only for its own book: Calvin's note on Leviticus 19:17 is no note on Deuteronomy 19:17 (got ${JSON.stringify(dt17)}), and stays his note on Leviticus 19:17 (got ${JSON.stringify(lv17)})`);
  // a note on the verse follows the heading of the passage that holds it, where that heading is on the pages: his "8. And thou shalt say
  // unto them" (Leviticus 17:8) at the head of p. 147 is no note on Deuteronomy 17:8, whose "Deuteronomy 17:8-11" stands below it
  const p147 = ['8. And thou shalt say unto them. The law is now extended to strangers, not those who were heathens, but who had embraced the law.',
    '[204] "The open field," A. V.', 'Deuteronomy 17', 'Deuteronomy 17:8-11', '8. If there arise a matter too hard for thee in judgment, between blood and blood,',
    '8. Si quid latuerit te in judicio inter sanguinem et sanguinem,', '9. And thou shalt come unto the priests the Levites, and unto the judge',
    '9. Et venies ad sacerdotes, Levitas, et ad judicem qui fuerit in diebus illis,', '8 If there arise a matter too hard for thee. The principal office of the priests is here described under the sentence.'];
  const lv17p = ['Leviticus 17', 'Leviticus 17:8, 9', '8. And thou shalt say unto them, Whatsoever man there be of the house of Israel, or of the strangers which sojourn among you, that offereth a burnt offering or sacrifice,',
    '8. Dices praeterea illis, Quicunque e domo Israel, aut de peregrinis qui peregrinantur in medio vestri, obtulerit holocaustum aut sacrificium,',
    '9. And bringeth it not unto the door of the tabernacle of the congregation, to offer it unto the LORD;', '9. Et ad ostium tabernaculi conventionis non adduxerit illud Jehovae:',
    '8. And thou shalt say unto them. The law is now extended to strangers, not those who were heathens, but who had embraced the law.'];
  ok(A.findNote(p147, 8, false, 17) !== 0 && A.findNote(lv17p, 8, false, 17) === 6,
    `a note follows the heading of its passage: Calvin's note on Leviticus 17:8 above "Deuteronomy 17:8-11" is no note on Deuteronomy 17:8 (got ${A.findNote(p147, 8, false, 17)}); under its own "Leviticus 17:8, 9" it is found (got ${A.findNote(lv17p, 8, false, 17)})`);
  // the map gives Jerome's Zechariah 13 on the column of his Zechariah 12 (col. 1508): the library's rows on chapter 12, rising with its
  // verses to col. 1515, are taken, and his "(Vers. 10.)" is found at col. 1514
  const jz = { 1508: paras('(Vers. 1.) The burden of the word of the Lord upon Israel. Thus saith the Lord, which stretcheth forth the heavens.'),
    1514: paras('(Vers. 10.) And they shall look upon me whom they have pierced: and they shall mourn for him, as one mourneth for his only son.') };
  const rz = A.createResolver(async (_s, n) => [jz[n] || [], []]);
  const z10 = await rz.resolve({ slug: 'jer-zech', notes: { 8: 1512, 9: 1513, 10: 1514, 11: 1515 }, open: 1508, close: 1508, pv: {}, rows: {} }, 10, { name: 'Zechariah', ch: '12' });
  ok(z10.how === 'note' && z10.p === 1514 && z10.indexed, `Jerome on Zechariah 12:10 is at col. 1514, as the library's rows run (got ${JSON.stringify(z10)})`);
}

// ── 2026-11-08, the words a heading quotes (round 3 of the survey left 16 wrong marks among the 374 landings whose mark changed) ──
// A HEADING THAT QUOTES ANOTHER VERSE is no note on this one. Lombard divides the psalms as the Vulgate does: his "VERS. 6." on Psalm 45
// quotes 45:4b, and was marked as his note on 45:6; that note is his "VERS. 8." (cols. 439-441). The verses are the page's (ESV).
const L45 = paras(`VERS. 5.-- « With thy comeliness and thy beauty set out, proceed prosperously, and reign. »
With thy comeliness and thy beauty. [Cassiod., Hier., Aug., Cassiod.] Distinguish here, that is, according to humanity and divinity.
VERS. 6.-- « Because of truth and meekness and justice: and thy right hand shall conduct thee wonderfully. »
Because of truth, [Hier., Aug., Cassiod., Alcuin., Aug.] that is, because of this, that through thee and through thine own thou teachest truth.
VERS. 7.-- « Thy arrows are sharp: under thee shall people fall, into the hearts of the king's enemies. »
Thy arrows are sharp, [Aug., Cassiod., Aug.] that is, thy words, which penetrate the hearts of men, and reach swiftly where he wills.
VERS. 8.-- « Thy throne, O God, is for ever and ever: the sceptre of thy kingdom is a sceptre of uprightness. »
Thy throne. [Aug., Cassiod.] Here he commends Christ by his judgment. For a throne pertains to judgment.`);
const ESV45 = { 5: "5 Your arrows are sharp in the heart of the king's enemies; the peoples fall under you.", 6: '6 Your throne, O God, is forever and ever. The scepter of your kingdom is a scepter of uprightness;' };
ok(A.lemmaOf(L45[2]) === 'Because of truth and meekness and justice: and thy right hand shall conduct thee wonderfully.' && A.lemmaOf('V. 12. that comforteth you] Vers. 3.') === 'that comforteth you'
  && A.lemmaOf('VERSE 19. — AND, that is, afterward, when the supper had taken place') === 'AND' && A.lemmaOf('Paraphrase. 6. The kingdom of the Messias') === '' && A.lemmaOf('6. Thy throne, O God! is for ever and ever. In this verse') === '',
  'a heading\'s quoted words: in « », after "VERS. N.--" (Migne\'s in capitals), or before a bracket; a paraphrase or an unquoted note has none');
ok(A.findNote(L45, 6) === 2 && A.findNote(L45, 6, false, 45, null, ESV45[6]) === 6 && A.findNote(L45, 5, false, 45, null, ESV45[5]) === 4,
  'with the verse\'s words, Lombard\'s note on Psalm 45:6 is his "VERS. 8.-- « Thy throne »", and on 45:5 his "VERS. 7.-- « Thy arrows »"; without them, as before');
ok(A.findNote(L45.slice(0, 6), 6, false, 45, null, ESV45[6]) === A.REFUSED && A.REFUSED === -2,
  'with no heading that quotes the verse on the pages, nothing is marked, and the anchor says it refused one');
// the pane's chapter run took Lombard's Psalm 131 (his CXXX.) for Psalm 130, and marked its "VERS. 4." as his note on 130:4
ok(A.findNote(paras(`PSALM CXXX.
VERS. 3.-- « If I was not humbly minded: but exalted my soul. »
VERS. 4.-- « As a child that is weaned is towards his mother, so reward in my soul. »
If I was not humbly minded, [Gl. int., Aug.] as if he were saying: I did not walk in great things, but I was humble.`), 4, false, 130, null, '4 But with you there is forgiveness, that you may be feared.') === A.REFUSED,
  "Lombard's next psalm's \"VERS. 4.-- « As a child that is weaned »\" is no note on Psalm 130:4");
// what the guard leaves: a right note in an older English that shares few words with the page's (Psalm 3:1 in the ESV: "O LORD, how
// many are my foes!"), Latin words, a heading of several verses (its words are its first verse's), a psalm's title
const ESV3_1 = '1 O LORD, how many are my foes! Many are rising against me;';
ok(A.findNote(paras('VERS. 1.-- "O Lord, why are they multiplied that afflict me? many rise up against me."'), 1, false, 3, null, ESV3_1) === 0
  && A.findNote(paras('Vers. 1. HOw are they increased that trouble me?] This was a token of his stable faith, that for all his troubles he had his recourse to God.'), 1, false, 3, null, ESV3_1) === 0,
  "Lombard's and the English Annotations' notes on Psalm 3:1 are kept: two words that tell are too few to judge by");
ok(A.findNote(paras('9. Erat lux vera quae illuminat omnem hominem] Or, That light was the true light, which lighteth every man.'), 9, false, 1, null, '9 The true light, which gives light to everyone, was coming into the world.') === 0
  && A.findNote(paras('VERS. 2-3.-- « And I will make of thee a great nation, » etc. (ISID.) Two things are promised to Abram, namely, that his seed will possess the land of Chanaan.'), 3, false, 12, null,
    '3 I will bless those who bless you, and him who dishonors you I will curse, and in you all the families of the earth shall be blessed.') === 0
  && A.findNote(paras('VERS. 1.-- Unto the end, a psalm of David, when he fled from the face of Absalom his son. (AUG.) Christ speaks in the person of his body.'), 1, false, 3, null, ESV3_1) === 0,
  'Latin words (the Critici), a heading of verses 2-3 (the Gloss on Genesis 12:3) and a psalm\'s title are never refused');
// a heading that quotes another verse is dropped only on strong evidence: five or more words that tell, none of them the verse's, nor
// in the note's first words. A commentator who divides the verses otherwise quotes the end of the verse before and goes on to this one
// (the Gloss on Romans 9:13; Alcuin on the Song 7:1, the Vulgate's 7:1 being the English 6:13b and 7:1); the page's text may lack the
// words of an older one (Trapp's "Let us walk by the same rule]" on Philippians 3:16); Poole renders the Hebrew his own way
ok(A.findNote(paras(`VER. 13.-- The elder shall serve the younger. This is literal: because the Idumeans who were of Esau were subject to the sons of Israel.
Jacob I have loved, etc. In Jacob he finds nothing to love, except the gift of his own mercy. In Esau he hates nothing, except original sin.`), 13, false, 9, null, "13 As it is written, 'Jacob I loved, but Esau I hated.'") === 0
  && A.findNote(paras('VERS. 1.-- What will you see in the Shulamite, but the dances of the camps? You grieve for the hardened Synagogue. How beautiful are your steps in shoes, O daughter of the prince!'), 1, false, 7, null,
    '1 How beautiful are your feet in sandals, O noble daughter! Your rounded thighs are like jewels, the work of a master hand.') === 0
  && A.findNote(paras('Verse 16. Let us walk by the same rule] To wit of the Word: and then you may say, Lord, if I be deceived, thou hast deceived me.'), 16, false, 3, null, '16 Only let us hold true to what we have attained.') === 0
  && A.findNote(paras('13. And he prepared many works, \u05d5\u05bc\u05de\u05b0\u05dc\u05b8\u05d0\u05db\u05b8\u05d4 \u05e8\u05b7\u05d1\u05bc\u05b8\u05d4] And much work was to him, P. V. Ma. etc. That is, he fortified the cities.'), 13, false, 17, null,
    '13 and he had large supplies in the cities of Judah. He had soldiers, fighting men of valor, in Jerusalem.') === 0,
  "a short quotation, or one beside the Hebrew, that shares no word with the page's verse is kept");
const EST_PS = paras('v. 9. As wax, which melts, they shall be taken away, fire has fallen upon them, and they have not seen the sun . Jerome translates the former part: As a melting worm let it pass away.');
ok(A.findNote(EST_PS, 9, false, 2, null, ['9 You shall break them with a rod of iron and dash them in pieces like a potter\'s vessel.', '7 I will tell of the decree: The LORD said to me, \u201cYou are my Son; today I have begotten you.']) === A.REFUSED
  && A.findNote(paras('VERS. 6.-- « Because of truth and meekness and justice: and thy right hand shall conduct thee wonderfully. »\nBecause of truth. Here is the throne of his kingdom for ever, and the sceptre of uprightness.'), 6, false, 45, null, ESV45[6]) === 0,
  'Estius\'s Psalm 58 "v. 9.", taken for his next note after Psalm 2:7, is dropped; a heading whose note goes on in the verse\'s words is kept');
// a next note's heading is weighed against the verse chosen too: Migne's "VERSE 15." on Galatians 3 quotes 3:13, and was opened as his
// next note after 3:13; and a printer's dash may be followed by the note's own words (Lapide's "Ver. 15. — For the Son is the Word")
const GAL3 = paras('VERSE 15. — CHRIST HAS REDEEMED US FROM THE CURSE OF THE LAW, BEING MADE A CURSE FOR US... He sets Christ against the curse, by which all were bound.');
const ESV_GAL3 = { 13: '13 Christ redeemed us from the curse of the law by becoming a curse for us', 15: '15 To give a human example, brothers: even with a man-made covenant, no one annuls it or adds to it once it has been ratified.' };
ok(A.findNote(GAL3, 15, false, 3, null, ESV_GAL3[15]) === A.REFUSED && A.findNote(GAL3, 15, false, 3, null, [ESV_GAL3[15], ESV_GAL3[13]]) === 0
  && A.findNote(paras('Ver. 15. — For the Son is the Word of the Father, entirely similar and equal to the Father, and thus of the same essence as the Father.'), 15, false, 1, null,
    '15 He is the image of the invisible God, the firstborn of all creation.') === 0,
  'a heading that quotes the verse chosen is kept as the next note; a note\'s own words after a printer\'s dash are no quotation');
// HAMMOND'S ANNOTATION OVER HIS PARAPHRASE: "V. 6. Thy throne] The difficulty here is …" after the paraphrases of the whole psalm; his
// annotations' heads behind the margin's word ("⟨…⟩ Δικαιοσύνη V. 17.") or behind the head of the annotations
ok(VH('⟨…⟩ Δικαιοσύνη V. 17. Righteousness] For the explaining of this verse') === '17' && VH('〈 in non-Latin alphabet 〉 V. 1. Inditing] That 〈 in non-Latin alphabet 〉, used only in this one place') === '1'
  && VH('Annotations on Psalm LI. 〈 in non-Latin alphabet 〉 V. 4. Clear] The word is ordinarily used') === '4' && VH('Annotations on Psal. LII. V. 1. Goodness] The first verse is very distantly rendred') === '1'
  && VH('〈 in non-Latin alphabet 〉 for a price. The plain meaning is, that as things that are useless') === 'none',
  "Hammond's annotations are read behind the margin's word and the head of his annotations; a margin before anything else is not");
const H45 = paras(`6. Thy throne, O God, is for ever and ever: the scepter of thy kingdom is a right scepter.
Paraphrase. 6. The kingdom of the Messias is never to have an end: the Laws by which 'tis administred are admirably good and just.
7. Thou lovest righteousness and hatest wickedness; therefore God thy God hath anointed thee with the oyl of gladness above thy fellows.
Paraphrase. 7. He hath earnestly espoused the cause of all goodness & justice, hath wrought by his precepts and promises and grace.
Annotations on Psalm XLV. Tit. Shoshannim] Six, in all probability signify instruments of six strings.
V. 6. Thy throne] The difficulty here is, to whom this verse and the following are literally and primarily appliable.
V. 8. Made thee glad] The former part of v. 8. being read, as it lies in the Hebrew, Myrrhe and Aloes and Cassia all thy cloaths.`);
ok(A.findNote(H45, 6) === 5 && A.noteEnd(H45, 5, 6, 14) === 6 && A.findNote(H45, 7) === 3,
  'on one page, his annotation on Psalm 45:6 is his note, not his paraphrase; with no annotation on 45:7, the paraphrase is');
{
  // the section: an annotation that quotes its verse, as he prints it ("5. Behold, I was born. shapen in iniquity", which the page's
  // "brought forth" lacks) or as the page gives it, takes the verse from his paraphrase; only past the head of his annotations
  const hm = { 151: paras(`The Fifty First PSALM. TO the chief Musitian, A Psalm of David.
4. To thee, to thee only. Against thee only have I sinned, and done this evil in thy sight; that thou mightest be justified when thou speakest, and be clear when thou judgest.
Paraphrase. 4. And though the dignity and office wherein thou hast placed me over thy people leave me not liable to any punishment.
5. Behold, I was born. shapen in iniquity, and in sin did my mother conceive me.
6. Behold, thou delightest in truth in the reins. desirest truth in the inward parts.
Paraphrase. 5, 6. Lord, I am a most polluted creature: the corruption of my nature, the bare inclinations of my will.
7. Purge me with hyssop, and I shall be clean: wash me, and I shall be whiter than snow.
Paraphrase. 7. Lord, be thou pleased to absolve me, and solemnly to declare and seal to me thy reconciliation.`),
    152: paras('Annotations on Psalm LI. 〈 in non-Latin alphabet 〉 V. 4. Clear] The word 〈 in non-Latin alphabet 〉 is ordinarily used for victory, to overcome.'),
    153: paras('V. 5. Shapen] For the understanding of this verse, 3. things must be observed. 1. What is meant by the two verbs.') };
  const ESV51 = { 4: '4 Against you, you only, have I sinned and done what is evil in your sight, so that you may be justified in your words and blameless in your judgment.', 5: '5 Behold, I was brought forth in iniquity, and in sin did my mother conceive me.' };
  const r = A.createResolver(async (_s, n) => [hm[n] || [], []], { verseText: (v) => ESV51[v] || '' });
  const c51 = { slug: 'hammond-ps', notes: { 4: 152 }, open: 151, close: 158, pv: {}, rows: {} }, P51 = { name: 'Psalms', ch: '51' };
  const got = await Promise.all([4, 5, 6, 7].map((v) => r.resolve(c51, v, P51)));
  ok(got[0].p === 152 && got[1].p === 153 && got[1].how === 'note' && got[2].p === 151 && got[3].p === 151,
    `Hammond on Psalm 51:4 and 51:5 opens at his annotations (pp. 152, 153), on 51:6 and 51:7 at his paraphrase (got ${JSON.stringify(got)})`);
  // no head of the annotations: a heading that goes back is not taken (a stray "V. 4." among the paraphrases)
  const hs = { 151: hm[151], 152: paras('V. 4. Clear] The word is ordinarily used for victory.') };
  const rs = A.createResolver(async (_s, n) => [hs[n] || [], []]);
  const s4 = await rs.resolve({ slug: 'hammond-ps2', notes: {}, open: 151, close: 158, pv: {}, rows: {} }, 4, P51);
  ok(s4.p === 151, `with no "Annotations on", a heading that goes back is not taken over the paraphrase (got ${JSON.stringify(s4)})`);
  // Psalm 15's annotations at the top of Psalm 16's first page count apart from Psalm 16's; his "V. 10. Hell]" quotes the verse as he
  // prints it ("leave my soul in hell"), not as the page does ("to Sheol")
  const h16 = { 44: paras(`Annotations on Psal. XV. V. 4. To his own hurt] 〈 in non-Latin alphabet 〉 doth certainly signifie to do evil.
The Sixteenth PSALM. Michtam of David.
9. Therefore my heart is glad, and my glory rejoiceth: my flesh also shall rest in hope.
Paraphrase. 9. This is full matter of joy to my heart, and of boasting to my tongue.
10. For thou wilt not leave my soul in hell; neither wilt thou suffer thine holy one to see corruption.
Paraphrase. 10. For thy promises to me are firm, and oblige thee not to forsake me so.`),
    45: paras('Annotations on Psal. XVI. 〈 in non-Latin alphabet 〉 Tit. Michtam] From 〈 in non-Latin alphabet 〉 signifying gold.'),
    48: paras('〈 in non-Latin alphabet 〉 V. 10. Hell] That 〈 in non-Latin alphabet 〉 signifies the condition or state of the dead.') };
  const r16 = A.createResolver(async (_s, n) => [h16[n] || [], []], { verseText: (v) => ({ 10: '10 For you will not abandon my soul to Sheol, or let your holy one see corruption.' }[v] || '') });
  const g10 = await r16.resolve({ slug: 'hammond-ps3', notes: {}, open: 44, close: 49, pv: {}, rows: {} }, 10, { name: 'Psalms', ch: '16' });
  // his verse in capitals took the verse from his paraphrase in the index ("1. NOW Faith is …"); his note letter and the margin's word
  const h11 = { 820: paras(`CHAP. XI.
1. NOW Faith is the confident expectation, substance of things hoped for, the evidence of things not seen.]
Paraphrase 1. And that you may know to what your being Christians, and your professing the faith of Christ, obliges you.`),
    823: paras(`Annotations on Chap. XI.
⟨…⟩ a. Ὑπόστασις V. 1. Substance] The use of this word ὑπόστασις, both here and in the other places of the New Testament.`) };
  const r11 = A.createResolver(async (_s, n) => [h11[n] || [], []]);
  const g1 = await r11.resolve({ slug: 'hammond-nt', notes: {}, open: 820, close: 826, pv: {}, rows: {} }, 1, { name: 'Hebrews', ch: '11' });
  ok(g10.p === 48 && g1.p === 823 && VH('⟨…⟩ f. Πέτρος V. 18. Rock] The name of Πέτρος') === '18' && VH('σωτηρίας V. 3. Upholding] The Hebrew signifies') === '3',
    `Hammond on Psalm 16:10 and Hebrews 11:1 opens at his annotations, pp. 48 and 823 (got ${JSON.stringify([g10, g1])})`);
  // his marks scope his headings: Psalm 15's annotation heads Psalm 16's first page, Psalm 17's paraphrase follows Psalm 16's last
  // annotation, and a chapter's heading ends the marks before it ("CHAP. XVI." after "Annotations on S. MARK Chap. XV.")
  const P44 = paras(`Annotations on Psal. XV. V. 4. To his own hurt] 〈 in non-Latin alphabet 〉 doth certainly signifie to do evil.
The Sixteenth PSALM. Michtam of David.
4. Their sorrows shall be multiplied that hasten after another god.
Paraphrase. 4. Those that forsake the true God, and betake themselves to idols, shall find nothing but misery.`);
  const P48 = paras(`〈 in non-Latin alphabet 〉 V. 10. Hell] That 〈 in non-Latin alphabet 〉 signifies the condition or state of the dead.
The Seventeenth PSALM. A Prayer of David.
10. They are inclosed in their own fat: with their mouth they speak proudly.
Paraphrase. 10. Their greatness and prosperity makes them insolent.`);
  const MK = paras(`Annotations on S. MARK Chap. XV.
⟨…⟩ V. 6. A prisoner] The custom of releasing a prisoner at the feast.
CHAP. XVI.
5. And entring into the sepulchre, they saw a young man sitting on the right side.
Paraphrase 5. an Angel in the appearance of a young man.`);
  ok(A.findNote(P44, 4, false, 16) === 3 && A.findNote(P48, 10, false, 16) === 0 && A.findNote(P48, 10, false, 17) === 3 && A.findNote(MK, 5, false, 16) === 4,
    "Hammond's \"Annotations on Psal. XV.\" and \"The Seventeenth PSALM.\" keep those psalms' headings out of Psalm 16; Mark's \"CHAP. XVI.\" ends chapter 15's annotations");
  // where Matthew 28, the book's last chapter, runs on into Mark, Mark 10's annotation "V. 19. Defraud not]" is not taken for 28:19
  const mt = { 164: paras(`1. In the end of the Sabbath, as it began to dawn toward the first day of the week, came Mary Magdalene.
Paraphrase 1. After the Sabbath was ended, as the first day of the week began to dawn, came the women to the sepulchre.
10. Then said Jesus unto them, Be not afraid: go tell my brethren that they go into Galilee.
Paraphrase 10. Then said Jesus to them, Fear not, but go and tell my disciples.
19. Go ye therefore, and teach all nations, baptizing them in the Name of the Father.
Paraphrase 19. Teach all the Nations the Christian doctrine, and persuade them to embrace it.
20. Teaching them to observe all things whatsoever I have commanded you.
Paraphrase 20. And instruct them to live accordingly, and to continue in it.`),
    166: paras('Annotations on Chap. XXVIII.\n⟨…⟩ Ἔθνη V. 19. All nations] What is meant sometimes by the word ἔθνη nations hath been said.'),
    190: paras('19. Thou knowest the commandments, Do not commit adultery, Do not kill, Do not steal, Defraud not.\nParaphrase 19. Thou knowest the commandments of the second table.'),
    191: paras('Annotations on S. MARK Chap. X.\n⟨…⟩ Ἀποστερήσῃς V. 19. Defraud not] That our Savior reckons up here the six last precepts of the Decalogue.') };
  const rm = A.createResolver(async (_s, n) => [mt[n] || [], []]);
  const m19 = await rm.resolve({ slug: 'hammond-nt2', notes: {}, open: 164, pv: {}, rows: {} }, 19, { name: 'Matthew', ch: '28' });
  ok(m19.p === 166, `Hammond on Matthew 28:19 opens at his annotation, p. 166, not at Mark 10's, p. 191 (got ${JSON.stringify(m19)})`);
}

// ── 2026-11-08, the daily driver (owner: "iterate until scripture can be used as a daily driver for what were doing") ──────────────
{
  // Calvin on Hebrews 12 (the Calvin Translation Society): each section's verses in both tongues under its reference, then his notes on
  // some of them. "7. For what son is he, etc." (p. 186) runs on over verse 8, which has no note; "Hebrews Chapter 12:9-11" follows on p.
  // 187. The verse is in the earlier note's section: that note is its place, not the next one past the heading
  const two = (n, en, la) => `${n}. ${en}\n${n}. ${la}`;
  const heb = (next) => ({
    183: paras(`CHAPTER 12\nHebrews Chapter 12:1-3\n${two(1, 'Wherefore seeing we also are compassed about with so great a cloud of witnesses, let us lay aside every weight.', 'Proinde nos quoque tantam habentes circumpositam nubem testium, deposito omni onere.')}\n${two(2, 'Looking unto Jesus the author and finisher of our faith; who for the joy that was set before him endured the cross.', 'Intuentes in fidei ducem et perfectorem Iesum, qui pro gaudio sibi proposito sustinuit crucem.')}\n${two(3, 'For consider him that endured such contradiction of sinners against himself, lest ye be wearied.', 'Reputate certe quis talem sustinuerit a peccatoribus adversus se contradictionem, ne fatigemini.')}\n1. Wherefore, seeing we also, etc. This conclusion is, as it were, the application of the previous chapter.${MORE}`),
    184: paras(`Hebrews Chapter 12:4-8\n${two(4, 'Ye have not yet resisted unto blood, striving against sin.', 'Nondum ad sanguinem usque restitistis adversus peccatum certantes.')}\n${two(5, 'And ye have forgotten the exhortation which speaketh unto you as unto children.', 'Et obliti estis consolationis quae vobis tanquam filiis loquitur.')}\n${two(6, 'For whom the Lord loveth he chasteneth, and scourgeth every son whom he receiveth.', 'Nam quem diligit Dominus castigat, flagellat autem omnem filium quem recipit.')}\n${two(7, 'If ye endure chastening, God dealeth with you as with sons; for what son is he whom the father chasteneth not?', 'Si castigationem suffertis, tanquam filiis se vobis offert Deus; quis enim est filius quem non castiget pater?')}\n${two(8, 'But if ye be without chastisement, whereof all are partakers, then are ye bastards, and not sons.', 'Quod si extra castigationem estis, cujus participes facti sunt omnes, ergo spurii estis et non filii.')}\n4. Ye have not yet, etc. He goes farther, and says, that should we be called to shed our blood for the Gospel.${MORE}\n5. And ye have forgotten, etc. He means that we are not to complain when the Lord chastises us.${MORE}`),
    185: paras(`6. For whom the Lord loveth, etc. This seems not to be a well-founded reason; for God visits the elect as well as the reprobate.${MORE}`),
    186: paras(`7. For what son is he, etc. He reasons from the common practice of men, that it is by no means right or meet that God's children should be exempt from chastisement.${MORE}\nIt hence follows that the benefit of adoption is not valued by us as it ought to be, and that the grace of God is rejected when we shun his rod.${MORE}`),
    187: paras(`${next}${two(9, 'Furthermore we have had fathers of our flesh which corrected us, and we gave them reverence: shall we not much rather be in subjection unto the Father of spirits, and live?', 'Quum carnis nostrae patres habuerimus castigatores et reveriti simus illos, annon multo magis subjiciemur Patri spirituum et vivemus?')}\n${two(10, 'For they verily for a few days chastened us after their own pleasure; but he for our profit.', 'Et illi quidem ad paucos dies pro suo arbitratu nos castigarunt; hic vero ad utilitatem.')}\n9. Furthermore, etc. He again argues from the less to the greater, for if we bear chastisement from our fathers in the flesh.${MORE}`),
    188: paras(`10. For they verily, etc. Here is another comparison between God and men.${MORE}`),
  });
  const cal = (next) => ({ resolver: A.createResolver(async (_s, n) => [heb(next)[n] || [], []]), work: { slug: `calvin-hebrews-${next ? 'h' : 'n'}`, notes: {}, open: 183, close: 201, pv: {}, rows: {} } });
  const W12 = { name: 'Hebrews', ch: '12' };
  const a = cal('Hebrews Chapter 12:9-11\n'), g8 = await a.resolver.resolve(a.work, 8, W12), g9 = await a.resolver.resolve(a.work, 9, W12);
  ok(g8 && g8.how === 'nearest' && g8.v === 7 && g8.p === 186 && g8.owned, `Calvin on Hebrews 12:8 opens at his note on 12:7, p. 186, whose section holds it, not at 12:9 past "Hebrews Chapter 12:9-11" (got ${JSON.stringify(g8)})`);
  ok(g9 && g9.how === 'note' && g9.p === 187, `and 12:9 keeps its own note, p. 187 (got ${JSON.stringify(g9)})`);
  // with no heading between the two notes, nothing says where verse 8 belongs: the next note within four verses, as before
  const b = cal(''), h8 = await b.resolver.resolve(b.work, 8, W12);
  ok(h8 && h8.how === 'later' && h8.v === 9 && !h8.owned, `with no heading before 12:9, Hebrews 12:8 still opens at the next note (got ${JSON.stringify(h8)})`);
  // a heading that takes the verse itself puts it in the next section: the next note, as before
  const d = cal('Hebrews Chapter 12:8-11\n'), k8 = await d.resolver.resolve(d.work, 8, W12);
  ok(k8 && k8.how !== 'nearest', `a heading of 12:8-11 puts 12:8 in the next section (got ${JSON.stringify(k8)})`);
  // (2026-11-09) the next note within the earlier note's section, on a verse its heading does not take: Calvin prints Joel 2:14 under his
  // "Joel 2:12-13", with no heading of its own; 2:13 is in his comment on 12-13, not at his note on 2:14
  const joel = (head) => ({
    25: paras(`Lecture Forty-second\n${head}\n${two(12, 'Therefore also now, saith the Lord, turn ye even to me with all your heart, and with fasting, and with weeping, and with mourning.', 'Atque etiam nunc dicit Jehova, convertimini ad me in toto corde vestro, et in jejunio, et in fletu, et in planctu.')}\n${two(13, 'And rend your heart, and not your garments, and turn unto the Lord your God: for he is gracious and merciful.', 'Et scindite cor vestrum, et non vestimenta vestra, et convertimini ad Jehovam Deum vestrum, quia clemens et misericors.')}\nThe Prophet, having proclaimed the dreadful judgment which we have noticed, now shows that he did not denounce it in vain.${MORE}`),
    26: paras(`He then subjoins, Rend your heart, and not your garments, and turn to Jehovah your God; for the outward rite is nothing.${MORE}`),
    28: paras(`${two(14, 'Who knoweth if he will return and repent, and leave a blessing behind him; even a meat offering.', 'Quis novit an revertatur et poeniteat eum, et relinquat post se benedictionem, oblationem.')}\nThe Prophet seems at first sight to leave men here perplexed and doubtful; and yet in the last verse he had promised pardon.${MORE}`),
    31: paras(`Joel 2:15-17\n${two(15, 'Blow the trumpet in Zion, sanctify a fast, call a solemn assembly.', 'Clangite tuba in Sion, sanctificate jejunium, vocate conventum.')}\nHe repeats what he had said before of the fast and of the assembly of the people.${MORE}`),
  });
  const J2 = { name: 'Joel', ch: '2' }, jw = (x) => ({ slug: `calvin-joel-${x}`, notes: { 12: 25, 13: 25, 14: 28, 15: 31 }, open: 25, close: 40, pv: {}, rows: {} });
  const j13 = await A.createResolver(async (_s, n) => [joel('Joel 2:12-13')[n] || [], []]).resolve(jw('a'), 13, J2);
  ok(j13 && j13.how === 'nearest' && j13.v === 12 && j13.p === 25 && j13.owned, `Calvin on Joel 2:13 opens at his comment on 12-13, p. 25, under "Joel 2:12-13", not at his note on 2:14 within it (got ${JSON.stringify(j13)})`);
  const j13b = await A.createResolver(async (_s, n) => [joel('Joel 2:12')[n] || [], []]).resolve(jw('b'), 13, J2);
  ok(j13b && j13b.how === 'later' && j13b.v === 14, `a heading of 2:12 alone says nothing of 2:13: the next note, as before (got ${JSON.stringify(j13b)})`);
}
{
  // no next note past the chapter's last verse: Origen on Genesis 23:18-20 offered "his note on 23:22", which is 43:22's (data7); the
  // verse count is the page's, through verseText. Without it nothing changes
  const org = { 49: paras(`Vers. 10. And Ephron dwelt among the children of Heth: and Ephron the Hittite answered Abraham.${MORE}`),
    50: paras(`Vers. 18. Unto Abraham for a possession in the presence of the children of Heth.${MORE}\nVers. 19. And after this, Abraham buried Sarah his wife in the cave of the field of Machpelah.${MORE}`),
    51: paras(`Vers. 22. And the man took a golden earring of half a shekel weight, and two bracelets for her hands.${MORE}`) };
  const G23 = { name: 'Genesis', ch: '23' }, work = (x) => ({ slug: `origen-gen-${x}`, notes: {}, open: 49, close: 52, pv: {}, rows: {} });
  const twenty = (x) => (x >= 1 && x <= 20 ? `Verse ${x} of Genesis twenty-three.` : '');
  const g20 = await A.createResolver(async (_s, n) => [org[n] || [], []], { verseText: twenty }).resolve(work('a'), 20, G23);
  ok(g20 && !(g20.how === 'later' && g20.v > 20) && g20.how === 'nearest' && g20.v === 19, `Genesis 23:20, a chapter of 20 verses, is never sent to a "next note on 23:22" (got ${JSON.stringify(g20)})`);
  const u20 = await A.createResolver(async (_s, n) => [org[n] || [], []]).resolve(work('b'), 20, G23);
  ok(u20 && u20.how === 'later' && u20.v === 22, `with no verse count given the seek is as before (got ${JSON.stringify(u20)})`);
}
{
  // Stock heads his notes on Malachi "VERS. XII. And all Nations shall call you blessed", in Roman numbers from I to XVIII (data7: Malachi
  // 3:12, his note at p. 239, opened at the next note on 3:16). A Roman number after the verse word is read, as a heading only
  ok(A.verseHead('VERS. XII. And all Nations shall call you blessed: for ye shall be a pleasant land') && A.verseHead('VERS. XII. And all Nations shall call you blessed').a === 12
    && A.verseHead('VERSE IIII. Though Edom say, We are impoverished').a === 4 && A.verseHead('VERSE I. The burden of the Word of the Lord to Israel').a === 1,
    'a Roman verse number after VERS. or VERSE is read as the verse ("VERS. XII.", "VERSE IIII.")');
  ok(A.verseHead('Ver. I say unto you, that he will avenge them') === null && A.verseHead('Vers. I. e. the second part of the verse') === null && A.verseHead('Verse I think it best to read thus') === null,
    'never the pronoun or an abbreviation: "Ver. I say", "Vers. I. e.", "Verse I think"');
  const stock = { 236: paras(`VERS. XI. And I will rebuke the devourer for your sakes, and he shall not destroy the fruit of your ground.${MORE}`),
    239: paras(`VERS. XII. And all Nations shall call you blessed: for ye shall be a pleasant land, saith the Lord of Hosts.\nAND all Nations shall call you blessed, that is, the people round about shall see your prosperity.${MORE}`),
    243: paras(`VERS. XIII. Your words have been stout against me, saith the Lord: yet yee say, What have we spoken so much against thee?${MORE}`) };
  const MAL3 = { 11: 'And I will rebuke the devourer for your sakes, and he shall not destroy the fruits of your ground', 12: 'And all nations shall call you blessed: for ye shall be a delightsome land, saith the LORD of hosts.',
    13: 'Your words have been stout against me, saith the LORD. Yet ye say, What have we spoken so much against thee?' };
  const r = A.createResolver(async (_s, n) => [stock[n] || [], []], { verseText: (x) => MAL3[x] || (x >= 1 && x <= 18 ? `Malachi three verse ${x}` : '') });
  const s12 = await r.resolve({ slug: 'stock-malachi', notes: {}, open: 230, close: 250, pv: {}, rows: {} }, 12, { name: 'Malachi', ch: '3' });
  ok(s12 && s12.how === 'note' && s12.p === 239 && A.findNote(stock[239], 12, false, '3', null, [MAL3[12]]) === 0, `Stock on Malachi 3:12 opens at "VERS. XII.", p. 239, marked (got ${JSON.stringify(s12)})`);
  // a Roman heading is the note only where its words are the verse's: Rivet's Decalogue, which the map gives as his Exodus 3, heads
  // "VERSE II. I am the LORD thy God"; it is no note on Exodus 3:2 ("And the angel of the LORD appeared unto him in a flame of fire")
  const rivet = { 1253: paras(`VERSE II. I am the LORD thy God, who brought thee out of the land of Egypt, out of the house of bondage.${MORE}`),
    1272: paras(`VERSE IV. You shall not make for yourself a carved image, nor any likeness of anything that is in heaven above.${MORE}`) };
  const EX3 = { 2: 'And the angel of the LORD appeared unto him in a flame of fire out of the midst of a bush: and he looked, and, behold, the bush burned with fire, and the bush was not consumed.',
    4: 'And when the LORD saw that he turned aside to see, God called unto him out of the midst of the bush, and said, Moses, Moses. And he said, Here am I.' };
  const rv = A.createResolver(async (_s, n) => [rivet[n] || [], []], { verseText: (x) => EX3[x] || (x >= 1 && x <= 22 ? `Exodus three verse ${x}` : '') });
  const x2 = await rv.resolve({ slug: 'rivet', notes: {}, open: 1253, close: 1300, pv: {}, rows: {} }, 2, { name: 'Exodus', ch: '3' });
  ok(!(x2 && x2.how === 'note' && x2.v === 2) && A.findNote(rivet[1253], 2, false, '3', null, [EX3[2]]) === -1,
    `a Roman heading that quotes another verse is no note on this one: Rivet's "VERSE II. I am the LORD thy God" for Exodus 3:2 (got ${JSON.stringify(x2)})`);
  // one word in common is too few: Cocceius's Hebrews, listed on Psalm 110, heads 8:3 "VERS. III. FOR EVERY HIGH PRIEST IS APPOINTED TO OFFER
  // GIFTS", and the library's Psalm 110:3 reads "Thy people offer themselves willingly"
  ok(A.findNote(paras('VERS. III. FOR EVERY HIGH PRIEST IS APPOINTED TO OFFER GIFTS AND SACRIFICES: WHEREFORE IT IS NECESSARY THAT THIS ONE ALSO HAVE SOMETHING WHICH HE MAY OFFER.'), 3, false, '110', null,
    ['Thy people offer themselves willingly In the day of thy power, in holy array: Out of the womb of the morning Thou hast the dew of thy youth.']) === -1,
  'a Roman heading sharing one word with the verse is no note on it (Hebrews 8:3 in Cocceius, on Psalm 110:3)');
}

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
ok(/Editors\\u2019 textual notes \(variants of the early printings\)/.test(js) && /<details class="cp-app">/.test(js) && /\.cp-app\b/.test(css), 'the pane sets the editors\' apparatus under a closed disclosure');
ok(hbs.indexOf('commentary-anchor.js') > 0 && hbs.indexOf('commentary-anchor.js') < hbs.indexOf('commentary-pane.js'), 'the template loads the anchor before the pane');
// (2026-11-08) the pane gives the anchor the words of the verse whose note it marks and of the verse chosen, and its older reading never
// puts back a heading the anchor refused as quoting another verse
// (2026-11-09) the words given once, as `texts`, to findNote and to the label's retry
ok(/const texts = \[verseText\(t\.v\), verseText\(verse\)\];\s*const k0 = A \? A\.findNote\(part, printed, !!t\.indexed, w\.ch, null, texts\)/.test(js) && /h < 0 && t\.indexed && !\(A && k0 === A\.REFUSED\)/.test(js)
  && /texts = \[verseText\(t\.v\), verseText\(v\)\];\s*let k = A \? A\.findNote\(part, printed, !!t\.indexed, w\.ch, null, texts\)/.test(js) && /k < 0 && !\(A && k === A\.REFUSED\)/.test(js),
  "the pane passes the verses' words to findNote, in the Commentary view and the preview, and keeps a refused heading refused");
// one Close for all three tabs (2026-10-19, owner): the pane's asks the reader's script, which owns the verse; the list's toggle is not "Close"
const sdjs = readFileSync(path.join(root, 'assets/js/page/scripture-dev.js'), 'utf8');
ok(/class="sd-close cp-close"[^>]*>Close</.test(js) && /new Event\('sd:close-verse'\)/.test(js), 'the pane has a Close that asks the reader to close the verse');
ok(/addEventListener\("sd:close-verse", closeVerse\)/.test(sdjs) && /\.sd-close"\)\.addEventListener\("click", closeVerse\)/.test(sdjs), 'the Citations Close and the pane Close run one function');
ok(/pick\.textContent = open \? 'Hide list' : 'Change'/.test(js), "the commentary list's toggle says Hide list, so Close means one thing");
ok(/min-height: 44px/.test(sd.slice(sd.indexOf('.sd-close {'), sd.indexOf('.sd-close {') + 400)), 'Close has a 44px touch target');

// ── 2026-11-09, iteration 2 of the daily driver (owner: "iterate until scripture can be used as a daily driver for what were doing") ──
{
  // the Bible's chapter in brackets after the work's own (Procopius on the Books of Kings, PG 87); a bracketed page or column is none
  ok(A.chapterHead('CHAP. VII [VIII].', false) === 8 && A.chapterHead('CHAP. VI. [VII.]', false) === 7 && A.chapterHead('CHAP. VIII [X].', false) === 10,
    `a chapter's heading names the bracketed chapter ("CHAP. VII [VIII]." is 8; got ${A.chapterHead('CHAP. VII [VIII].', false)})`);
  ok(A.chapterHead('CHAPTER 2. [103]', false) === 2 && A.chapterHead('PSALM 146 [284]', true) === 0, 'a bracketed page or column after a chapter is no chapter');
  // Piscator's "SCHOLIA ON CH. VI.", "ANALYSIS CH. II."; Calov's "3. CHAPTER XVIII." after a stray number; a "ch." in a citation is none
  ok(A.chapterHead('SCHOLIA ON CH. VI.', false) === 6 && A.chapterHead('ANALYSIS CH. II.', false) === 2 && A.chapterHead('3. CHAPTER XVIII. The burdens of the Priests and Levites, and their stipends.', false) === 18
    && A.chapterHead('cf. ch. 5', false) === 0 && A.chapterHead('14. Chapter twelve of Matthew says', false) === 0, 'a chapter heading by "CH." and after a stray number; not a citation');
  const pro = paras(`ever? If these things are to be accepted concerning Christ: And, if his iniquity shall come, "I will chasten him with the rod of men"
VERSE 19. And these things seemed small in your sight, my Lord.
CHAP. VII [VIII].
VERSE 2. He measured with a line, etc. So great was the multitude of captives.
VERSE 14. In all Idumaea he placed garrisons. Now that was fulfilled which Isaac foretold to Jacob.`);
  ok(A.findNote(pro, 14, true, 7) < 0, 'Procopius\'s "VERSE 14." under "CHAP. VII [VIII]." is no note on 2 Samuel 7:14');

  // a verse printed in both tongues is never a note (the Calvin Translation Society: Philippians 2:3, Amos 7:11, Jonah 2:3)
  const phil = paras(`Philippians 2:1-4
1. If there be therefore any consolation in Christ, if any comfort of love, if any fellowship of the Spirit.
1. Si qua igitur consolatio in Christo, si quod solatium dilectionis, si qua communicatio Spiritus.
2. Fulfil ye my joy, that ye be likeminded, having the same love, being of one accord, of one mind.
2. Implete gaudium meum ut idem sentiatis, eandem habentes caritatem, unanimes, unum sentientes.
3 Let nothing be done through strife or vainglory; but in lowliness of mind let each esteem other better than themselves.
3. Nihil per contentionem, aut inanem gloriam, sed per humilitatem alii alios existiment se ipsis excellentiores.
4. Look not every man on his own things, but every man also on the things of others.
4. Non considerans quisque quod suum est, sed quisque quod est aliorum.
1 If there is therefore any consolation. There is an extraordinary tenderness in this exhortation, in which he entreats the Philippians.`);
  ok(A.twin(phil, 6) && A.twin(phil, 5) && A.findNote(phil, 3, true, 2) !== 6, `Calvin's Latin "3. Nihil per contentionem", beside his English "3 Let nothing be done", is not his note on Philippians 2:3 (got ${A.findNote(phil, 3, true, 2)})`);
  const amos = paras(`11. For thus Amos saith, Jeroboam shall die by the sword, and Israel shall surely be led away captive out of their own land.
11. Quia sic dicit Amos, Gladio morientur Jeroboam; et Israel migrando migrabit e terra sua.`);
  ok(A.twin(amos, 0) && A.twin(amos, 1), 'the names the two share do not hide the pair ("Amos", "Jeroboam", "Israel" in both)');
  const jon3 = paras(`3. For thou hadst cast me into the deep, in the midst of the seas; and the floods compassed me about: all thy billows and thy waves passed over me.
3. Atqui projeceras me in profundum, in cor marium, et fluvius circumdedit me; omnes conflictus tui (sed hac voce intelligit undas quae inter se confligunt; scimus enim esse varias collisiones, ideo vertunt aliqui, contritiones tui, nam schr significat proprie confligere et frangere; perinde est igitur ac si diceret) fluctus tui super me transierunt.
3. In this verse are set forth his difficulties: for Jonah, for the sake of amplifying, refers to his condition. It was a great thing that he cried to God from the bowels of the fish; but it was far more difficult for him to raise up his mind in prayer, when he knew or thought God to be angry with him: for had he been thrown into extreme evils, he might yet call upon God.`);
  ok(A.twin(jon3, 1) && !A.twin(jon3, 2), 'a Latin verse with the translator\'s long gloss in parentheses is still the English verse\'s twin; the note after it is not');
  const mal = paras(`4. Et gratia erit Iehovae oblatio Iehudah et Ierusalem, sicut a diebus antiquis.
This verse shows, that though he had just spoken of the sons of Levi, he yet had regard to the whole people.
5. And I will come near to you to judgment; and I will be a swift witness against the sorcerers, and against the adulterers.
5. Et appropinquabo ad vos in judicium, et ero testis velox contra praestigiatores, et adulteros.
Here the Prophet retorts the complaints which the Jews had previously made. There is here then a counter-movement, as they say.`);
  const lect = paras(`12. And the word of the Lord came unto me, saying, Arise, go to Nineveh.
12. Et fuit sermo Iehovae ad me, dicendo, Surge, vade in Nineve.
Lecture Fortieth`);
  const blk = paras(`Micah 5:1-2
1. Now gather thyself in troops, O daughter of troops: he hath laid siege against us: they shall smite the judge of Israel.
1. Nunc colligas te filia congregationis; obsidionem posuit contra nos; virga percutient in maxillam judicem Israel.
2. But thou, Bethlehem Ephratah, though thou be little among the thousands of Judah, yet out of thee shall he come forth.
2. Et tu Beth-lehem Ephrata, parva ad essendum inter millia Jehudah; ex te mihi egredietur qui sit dominator in Israel.
To encourage the faithful to patience, the Prophet again reminds them that hard and severe time was nigh; for he had before spoken of the restoration.`);
  ok(A.findNote(blk, 1, true, 5) === 5 && A.findNote(blk, 2, true, 5) === -1, 'the comment after several verses printed in both tongues is the note on the first of them, and no other');
  ok(A.findNote(mal, 5, true, 3) === 4 && A.findNote(lect, 12, true, 1) === -1, `the comment after a verse printed in both tongues, where it opens unnumbered, is the note (Calvin on Malachi 3:5; got ${A.findNote(mal, 5, true, 3)}); a lecture's heading is none`);

  // a section's reference heading scopes what follows (Calvin's Harmony of the Law: his note on Exodus 23:13 is no note on Deuteronomy 6:13)
  const harm = paras(`Deuteronomy 6:13
13. ... shalt swear by his name.
13. Per nomen ejus jurabis.
Leviticus 19:12. And ye shall not swear by my name falsely. Although Moses is treating of the duties of the Second Table, he here condemns perjury.
Exodus 23:13
13. ... and make no mention of the name of other gods, neither let it be heard out of thy mouth.
13. Nomen deorum alienorum non memorabitis, non audietur in ore tuo.
13. Make no mention of the name of other gods. There is no sort of doubt but that this declaration should be connected with the Third Commandment.`);
  ok(A.findNote(harm, 13, true, 6) < 0, `Calvin's "13. Make no mention of the name of other gods", under "Exodus 23:13", is not his note on Deuteronomy 6:13 (got ${A.findNote(harm, 13, true, 6)})`);
  ok(A.findNote(harm, 13, true, 23) === 7, 'and it is his note on Exodus 23:13');
  // another count of a chapter's verses (the English Jonah 2:1-10 are the Hebrew's, the Latin's and the Greek's 2:2-11)
  const jer = paras(`(Chap. II.--Ver. 1.) And the Lord prepared a great fish: to swallow up Jonas. LXX: And the Lord commanded a great whale, and it devoured Jonas.
(Ver. 2.) And Jonas was in the belly of the fish three days and three nights. LXX: And Jonas was in the belly of the whale three days and three nights.
And Jonas prayed to the Lord his God out of the belly of the fish: and he said: LXX similarly, only with the order changed.
(Ver. 3.) I cried out of my tribulation to the Lord, and he heard me.`);
  const j21 = 'Then Jonah prayed to the LORD his God from the belly of the fish,';
  const jonah2 = (x) => ({ 1: j21, 2: 'saying, “I called out to the LORD, out of my distress, and he answered me; out of the belly of Sheol I cried, and you heard my voice.' }[x] || '');
  const k0 = A.findNote(jer, 1, false, 2, null, [j21]);
  ok(k0 === 0 && A.otherCount(jer, k0, 1, 'jonah', 2, jonah2) === 2, `Jerome's note on the English Jonah 2:1 is "And Jonas prayed to the Lord his God", in his note headed "(Ver. 2.)" (got ${A.otherCount(jer, k0, 1, 'jonah', 2, jonah2)})`);
  const cal = paras(`1. Then Jonah prayed unto the LORD his God out of the fish's belly. When Jonah says that he prayed from the bowels of the fish, he shows first with what constancy of faith he was endued.
2. And said, I cried by reason of mine affliction unto the LORD, and he heard me; out of the belly of hell cried I.`);
  ok(A.otherCount(cal, 0, 1, 'jonah', 2, jonah2) === 0 && A.otherCount(jer, 0, 1, 'genesis', 2, jonah2) === 0, 'a work that counts as the English keeps its heading; a chapter whose count is one keeps it too');
  // neighbouring verses that open alike: Clarke counts Micah 5 as the English, and his "Verse 7. The remnant of Jacob" is no note on 5:8
  const mic = (x) => ({ 7: 'Then the remnant of Jacob shall be in the midst of many peoples like dew from the LORD, like showers on the grass,', 8: 'And the remnant of Jacob shall be among the nations, in the midst of many peoples, like a lion among the beasts of the forest,' }[x] || '');
  const clarke = paras(`Verse 7. The remnant of Jacob] From the reign of Darius Hystaspes the Jews had greatly multiplied.
Verse 8. As a lion] In this and the following verse the victories of the Maccabees are foretold.`);
  ok(A.otherCount(clarke, 1, 8, 'micah', 5, mic) === 1, `Clarke's "Verse 8. As a lion" stays his note on Micah 5:8, though his note on 5:7 opens with words 5:8 shares (got ${A.otherCount(clarke, 1, 8, 'micah', 5, mic)})`);
  // a paragraph inside the other count's note needs three of the verse's words; a heading that opens on two of them keeps its place
  const song7 = (x) => ({ 4: 'Your neck is like an ivory tower. Your eyes are pools in Heshbon, by the gate of Bath-rabbim. Your nose is like a tower of Lebanon, which looks toward Damascus.',
    9: 'and your mouth like the best wine. It goes down smoothly for my beloved, gliding over lips and teeth.', 10: 'I am my beloved’s, and his desire is for me.' }[x] || '');
  const poole = paras(`9. *The roof of thy mouth, &c.* חִכֵּךְ] *And thy palate* (supply, *from the preceding verse, let it be, I pray, Merc.*) *as the best wine*, Merc.
10. *I am my beloved’s*]
Or, *I am of my beloved*, P. Ti. The Bride, who had long kept silence, here speaks . Filled with the wine of grace and consolation from the Bridegroom, she testifies her certainty.`);
  const neck = paras(`Verse 4. Your neck is like an ivory tower.
Verses 4, 5. Your nose is like the tower of Lebanon, which looks toward Damascus.`);
  const gen32 = (x) => ({ 22: 'And he rose up that night, and took his two wives, and his two handmaids, and his eleven children, and passed over the ford of the Jabbok.',
    23: 'And he took them, and sent them over the stream, and sent over that which he had.' }[x] || '');
  const wa = paras(`Ver. 22. He rose up that night.] Before it was Day; in the last Watch of the Night.
Ver. 23. And he took them, and sent them over, etc.] Having tried the Ford, he returned; and caused them all to pass over the Jabbok.`);
  const cyr = paras(`VERSE 1. And the Lord commanded a great whale, and it swallowed Jonah. And Jonah was in the belly of the whale three days and three nights.
VERS. 2, 3. And Jonah prayed unto the Lord his God out of the belly of the sea monster, and said: I cried in my tribulation unto the Lord.`);
  const hos12 = (x) => ({ 11: 'Is Gilead iniquity? they are altogether false; in Gilgal they sacrifice bullocks; yea, their altars are as heaps in the furrows of the field.',
    12: 'And Jacob fled into the field of Aram, and Israel served for a wife, and for a wife he kept sheep.',
    13: 'And by a prophet Jehovah brought Israel up out of Egypt, and by a prophet was he preserved.' }[x] || '');
  const lut = paras(`V. 12.
If Gilead is an idol, etc. We must become accustomed to prophetic affections and tropes.
V. 13.
Again, he opposes the example of the father to these impious sons. For he served, he kept, namely, the flock or the covenant.`);
  ok(A.otherCount(lut, 0, 12, 'hosea', 12, hos12) === 3, `a heading that is its number only has its words in the paragraph after it (Luther's "V. 13." over "he served, he kept" is the English Hosea 12:12; got ${A.otherCount(lut, 0, 12, 'hosea', 12, hos12)})`);
  ok(A.otherCount(wa, 0, 22, 'genesis', 32, gen32) === 0 && A.otherCount(cyr, 0, 1, 'jonah', 2, jonah2) === 1,
    `a heading whose own quotation is the verse's keeps its place (Patrick's "Ver. 22. He rose up that night." on Genesis 32:22, got ${A.otherCount(wa, 0, 22, 'genesis', 32, gen32)}); Cyril's "VERSE 1. ... a great whale" gives way on the English Jonah 2:1 (got ${A.otherCount(cyr, 0, 1, 'jonah', 2, jonah2)})`);
  ok(A.otherCount(poole, 0, 9, 'song-of-solomon', 7, song7) === 0 && A.otherCount(neck, 0, 4, 'song-of-solomon', 7, song7) === 0,
    `Poole's "9. The roof of thy mouth" stays his note on the Song 7:9 (got ${A.otherCount(poole, 0, 9, 'song-of-solomon', 7, song7)}); "Verse 4. Your neck is like an ivory tower" on 7:4 (got ${A.otherCount(neck, 0, 4, 'song-of-solomon', 7, song7)})`);

  // the resolver: a psalm's title headed as verse 1 (Augustine on Psalm 32), a note numbered past the chapter's end that quotes the verse
  // (Damascene on 2 Corinthians 5:21), and a tractate's own sections at the library's page (Augustine on John 3:5)
  const ps32 = { 256: paras(`ENARRATION ON PSALM XXXI.
1. [vers. 1.] To David himself, for understanding, by which it is understood that a man is liberated not by the merits of his works, but by the grace of God, while confessing his sins.
2. [vers. 2.] Blessed are they whose iniquities are forgiven, and whose sins are covered: and whose sins have been consigned to oblivion.
3. [vers. 3.] Because I was silent, my bones have grown old.`) };
  const v32 = { 1: 'Blessed is the one whose transgression is forgiven, whose sin is covered.', 2: 'Blessed is the man against whom the LORD counts no iniquity, and in whose spirit there is no deceit.', 3: 'For when I kept silent, my bones wasted away through my groaning all day long.' };
  const R32 = A.createResolver(async (_s, n) => [ps32[n] || [], []], { verseText: (v) => v32[v] || '' });
  const aug = { slug: 'aug', notes: {}, rows: {}, open: 256, close: 275, pv: {} };
  const a1 = await R32.resolve(aug, 1, { name: 'Psalms', ch: '32' }), a3 = await R32.resolve(aug, 3, { name: 'Psalms', ch: '32' });
  ok(a1 && a1.how === 'note' && a1.pv === 2 && a3 && a3.how === 'note' && !a3.pv, `Augustine's note on Psalm 32:1 is his "2. [vers. 2.]", his title's "1. [vers. 1.]" is not; 32:3 keeps his "[vers. 3.]" (got ${JSON.stringify(a1)}, ${JSON.stringify(a3)})`);
  const dam = { 734: paras(`Verse 11. Knowing therefore the terror of the Lord, we persuade men.
Verse 14. For the love of Christ constraineth us.
Verse 17. Therefore if any man be in Christ, he is a new creature.
Verse 19. That God was in Christ, reconciling the world unto himself.
Verse 20. "For Christ therefore we are ambassadors, as though God did beseech you by us."
Verse 22. "Him that knew no sin, he made sin for us." He did not say, He made him a sinner.`) };
  const v5 = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i + 1, `verse ${i + 1}`]));
  Object.assign(v5, { 20: 'Therefore, we are ambassadors for Christ, God making his appeal through us. We implore you on behalf of Christ, be reconciled to God.', 21: 'For our sake he made him to be sin who knew no sin, so that in him we might become the righteousness of God.' });
  const d21 = await A.createResolver(async (_s, n) => [dam[n] || [], []], { verseText: (v) => v5[v] || '' }).resolve({ slug: 'dam', notes: {}, rows: {}, open: 734, close: 735, pv: {} }, 21, { name: '2 Corinthians', ch: '5' });
  ok(d21 && d21.how === 'note' && d21.p === 734 && d21.pv === 22, `Damascene's "Verse 22. Him that knew no sin" is his note on 2 Corinthians 5:21, numbered past the chapter's end (got ${JSON.stringify(d21)})`);
  const chr = { 1044: paras(`Verse 11. For he that said, Do not commit adultery, said also, Do not kill.
Verse 14. What doth it profit, my brethren, though a man say he hath faith.
Verse 17. Even so faith, if it hath not works, is dead, being alone.
Verse 19. Thou believest that there is one God; thou doest well.
Verse 21. Was not Abraham our father justified by works.
Verse 23. And the scripture was fulfilled.
Verse 27. "Faith without works is dead." For as the body without the spirit is dead, so faith without works is dead.`) };
  const jv = Object.fromEntries(Array.from({ length: 26 }, (_, i) => [i + 1, `verse ${i + 1}`]));
  Object.assign(jv, { 23: 'and the scripture was fulfilled which saith, And Abraham believed God, and it was reckoned unto him for righteousness', 24: 'Ye see that by works a man is justified, and not only by faith.',
    25: 'And in like manner was not also Rahab the harlot justified by works, in that she received the messengers?', 26: 'For as the body apart from the spirit is dead, even so faith apart from works is dead.' });
  const RJ = A.createResolver(async (_s, n) => [chr[n] || [], []], { verseText: (v) => jv[v] || '' }), cj = { slug: 'chr', notes: {}, rows: {}, open: 1044, close: 1045, pv: {} };
  const j24 = await RJ.resolve(cj, 24, { name: 'James', ch: '2' }), j26 = await RJ.resolve(cj, 26, { name: 'James', ch: '2' });
  ok(!(j24 && j24.pv === 27) && j26 && j26.pv === 27, `Chrysostom's "VERSE 27. Faith without works is dead" is his note on James 2:26, not on 2:24 (got ${JSON.stringify([j24, j26])})`);
  const tr = { 1474: paras(`13. We bless the Lord our God, who has gathered us for spiritual joy.
TRACTATE XI. From that which is written, Now when he was at Jerusalem at the Pasch; up to that, Unless a man be born again of water and the Spirit. Chap. II, V. 23-25, and chap. III, V. 1-5.
1. The Lord has opportunely provided for us this day the order of this reading.
2. Behold you have heard that when the Lord Jesus Christ was at Jerusalem at the Pasch, many believed in his name.`), 1475: paras(`3. There was a man of the Pharisees, named Nicodemus, a ruler of the Jews: this man came to Jesus by night.
4. Since, therefore, Nicodemus was of that number, he came to the Lord: but he came by night.
5. Therefore attend, my brethren, to what this man who came to Jesus by night answers.`) };
  const t5 = await A.createResolver(async (_s, n) => [tr[n] || [], []]).resolve({ slug: 'trac', notes: { 5: 1474 }, rows: {}, open: 1474, close: 1484, pv: {} }, 5, { name: 'John', ch: '3' });
  ok(t5 && t5.how === 'range' && t5.a === 1 && t5.b === 5 && t5.p === 1474, `Augustine on John 3:5 opens his Tractate XI on 3:1-5, nothing marked, not his section "5." (got ${JSON.stringify(t5)})`);
  // a paragraph whose first words are another verse's own, and none of this one's, is not its note (a work that numbers its sections)
  const rom1 = (x) => ({ 4: 'who was declared to be the Son of God with power, according to the spirit of holiness, by the resurrection from the dead; even Jesus Christ our Lord,',
    5: 'through whom we received grace and apostleship, unto obedience of faith among all the nations, for his name’s sake;', 6: 'among whom are ye also, called to be Jesus Christ’s:',
    7: 'to all that are in Rome, beloved of God, called to be saints: Grace to you and peace from God our Father and the Lord Jesus Christ.' }[x] || '');
  ok(A.onOther('6. Through whom we have received, he says, grace and apostleship. Grace with all the faithful, but apostleship not with all.', 6, rom1)
    && A.onOther('7. "Through whom we have received grace and apostleship for obedience to the faith in all nations for his name."', 7, rom1),
    'Augustine\'s section "6. Through whom we have received … grace and apostleship" (Romans 1:5) is no note on 1:6; Origen\'s "7." on 1:5 none on 1:7');
  ok(!A.onOther('5. Through whom we have received, etc. -- Having completed his definition of the gospel', 5, rom1)
    && !A.onOther('(Vers. 6.) Among whom are you also the called of Jesus Christ. This is, while we are', 6, rom1)
    && !A.onOther('6. Through whom we have received, he says, grace and apostleship.', 6, () => '')
    && !A.onOther('6. Per quem accepimus gratiam et apostolatum ad obediendum fidei in omnibus gentibus', 6, rom1)
    && !A.onOther('Verses 5-7. Through whom we have received grace and apostleship unto obedience of faith among all nations', 6, rom1)
    && !A.onOther('Having said that they received grace and apostleship for obedience to the faith, he adds the Romans', 6, rom1),
    "a note that quotes its verse keeps its mark; without the verses' words, or in Latin, nothing is refused; nor a heading of verses, nor prose");
  const isa6 = (x) => ({ 7: 'And he touched my mouth with it, and said, Lo, this hath touched thy lips; and thine iniquity is taken away, and thy sin forgiven.',
    12: 'and Jehovah have removed men far away, and the forsaken places be many in the midst of the land.' }[x] || '');
  const amos7 = (x) => ({ 3: 'Jehovah repented concerning this: It shall not be, saith Jehovah.', 6: 'Jehovah repented concerning this: This also shall not be, saith the Lord Jehovah.',
    11: 'For thus Amos saith, Jeroboam shall die by the sword, and Israel shall surely be led away captive out of his land.' }[x] || '');
  ok(A.onOther('12. Verse 7. AND THY INIQUITY SHALL BE TAKEN AWAY, AND THY SIN SHALL BE PURGED.', 12, isa6)
    && !A.onOther('6. This shall not be] It will not be permitted him to carry away all Israel. I will not utterly cut off the Israelite people', 6, amos7),
    'a section\'s number over a heading of another verse is no note on the verse ("12. Verse 7.", Calov on Isaiah 6); a lemma of small words is not judged ("6. This shall not be]", Poole on Amos 7:6)');
  const gen1 = (x) => ({ 1: 'In the beginning God created the heavens and the earth.', 2: 'And the earth was waste and void; and darkness was upon the face of the deep: and the Spirit of God moved upon the face of the waters.',
    3: 'And God said, Let there be light: and there was light.' }[x] || '');
  const luke2 = (x) => ({ 13: 'And suddenly there was with the angel a multitude of the heavenly host praising God, and saying,', 14: 'Glory to God in the highest, And on earth peace among men in whom he is well pleased.' }[x] || '');
  ok(!A.onOther('3. And God said Moses now, for the first time, introduces God in the act of speaking, as if he had created the mass of heaven and earth without speaking. Yet', 3, gen1),
    'a note that opens on the verse\'s own first words quotes it, though the stop after its lemma be lost (Calvin\'s "3. And God said Moses now ..." on Genesis 1:3)');
  ok(A.onOther('3. And the spirit of God moved over the waters. But the Spirit of God was already moving over our dark and fluid heart', 3, gen1)
    && !A.onOther('28. (Vers. 13, 14). As regards the persuasion of a credible testimony, it is added: And suddenly there was with the angel a multitude', 14, luke2)
    && !A.onOther('2. [vers. 2.] Blessed are they whose iniquities are forgiven, and whose sins are covered', 1, () => '', [2])
    && A.onOther('2. [vers. 2.] Blessed are they whose iniquities are forgiven, and whose sins are covered', 1, () => ''),
    'Isidore\'s "3. And the spirit of God moved over the waters" is no note on Genesis 1:3; Bonaventure\'s "28. (Vers. 13, 14)." is his note on Luke 2:14');
}

// ── 2026-11-08, the daily driver: the pane's side of it ───────────────────────────────────────────────────────────────────────────
{
  // a key's label is the name, never a title: the Oecumenius key on Acts 2 read "Bishop"
  const short = new Function(`${js.slice(js.indexOf('  const SHORT = {'), js.indexOf("  // Poole's sigla"))}; return short;`)();
  const names = { 'Œcumenius Bishop of Trikka': 'Œcumenius', 'Oecumenius, Bishop of Trikka': 'Oecumenius', 'Bishop of Trikka Oecumenius': 'Oecumenius',
    'Archbishop of Bulgaria Theophylact': 'Theophylact', 'Theophanes, Archbishop of Nicaea': 'Theophanes', 'Saint Nicephorus, Patriarch of Constantinople': 'Nicephorus',
    'Pope Siricius': 'Siricius', 'Abbot Pirmin': 'Pirmin', 'Pope Gregory I': 'Gregory the Great', 'William Burt Pope': 'Pope', 'Augustine of Hippo': 'Augustine',
    'John Calvin': 'Calvin', 'Richard of Saint Victor': 'Richard of St Victor', 'Anastasius I, Bishop of Antioch': 'Anastasius I' };
  const wrong = Object.entries(names).filter(([a, x]) => short(a) !== x).map(([a, x]) => `${a}: ${short(a)}, not ${x}`);
  ok(!wrong.length, `a key's label drops a title and keeps the name (${wrong.join('; ') || 'all as expected'})`);
  // the first commentary is the most important key that has the verse; the reader's own pick and an address's cp= come first
  // (2026-11-09) in two passes: its note on the verse (or a run of verses holding it, or its critics on it), then a place between its
  // notes or a page filed as discussing it
  ok(/const OWN = new Set\(\['note', 'range'\]\), NEAR = new Set\(\['between', 'page'\]\);/.test(js) && /let c = mine \|\| null;\s*if \(!c && keys\.length > 1\)/.test(js)
    && /c = await firstOnVerse\(keys, S\.verse, w,/.test(js), 'the first commentary is the first key, by rank, with its own note on the verse (else its place between notes or a page), after the reader\'s pick');
  ok(/if \(S\.seeking && !S\.cur\) return;/.test(js), 'nothing is drawn while the first commentary is looked for');
  // the earlier note whose section holds the verse is not traded for the chapter's opening
  ok(/\|\| t\.owned\) return t;/.test(js), "chapterFirst keeps the anchor's earlier note whose section holds the verse");
  // a Migne column is named and linked as the loader read it
  ok(/const shownAt = CANON\.test\(sh\.slug\) && pages\[0\] && pages\[0\]\.n != null \? pages\[0\]\.n : sh\.p;\s*setWhere\(shownAt, false\);/.test(js), 'a Migne column is said and linked as the column read');
  // the empty state names the work in its status line
  ok(/No page of \$\{esc\(name0\)\} is known for/.test(js), 'the empty state has a status line naming the work');
}

// ── 2026-11-09: the pane's side of iteration 2 ────────────────────────────────────────────────────────────────────────────────────
{
  // the first commentary in two passes: the first key with its note on the verse, else the first with its place between notes or a
  // page; the search stops at the first note, and looking on past a key with only such a place is bounded by time
  const src = js.slice(js.indexOf('  async function firstOnVerse('), js.indexOf('  // while it is looked for, nothing that would change'));
  const pass = js.match(/const PASS_ONE = (\d+)[,;]/), keysN = js.match(/PASS_ONE_KEYS = (\d+);/);
  // (2026-11-10, pane3c) st: the pane's S, where firstOnVerse leaves the key it opens unmarked (S.plain)
  const make = (cls, wait, st) => new Function('onVerse', 'volumeFor', 'S', `const PASS_ONE = ${pass ? pass[1] : 1000}, PASS_ONE_KEYS = ${keysN ? keysN[1] : 9}; ${src}; return firstOnVerse;`)(
    (c) => new Promise((res) => { setTimeout(() => res(cls[c.slug]), (wait && wait[c.slug]) || 5); }), (c) => ({ notes: {}, slug: c.slug }), st || {});
  const keys = ['a', 'b', 'c', 'd'].map((slug) => ({ slug })), yes = () => true;
  const f1 = await make({ a: 2, b: 0, c: 1, d: 1 })(keys, 3, {}, yes);
  const f2 = await make({ a: 2, b: 0, c: 0, d: 0 })(keys, 3, {}, yes);
  const f3 = await make({ a: 2, b: 0, c: 1, d: 0 }, { c: (pass ? +pass[1] : 1000) + 400 })(keys, 3, {}, yes);
  const f4 = await make({ a: 1, b: 1, c: 1, d: 1 }, { b: 5000 })(keys, 3, {}, yes);
  const f5 = await make({ a: 2, b: 0, c: 1, d: 1 })(keys, 3, {}, yes, true);
  ok(f1 && f1.slug === 'c' && f2 && f2.slug === 'a' && f3 && f3.slug === 'a' && f4 && f4.slug === 'a' && f5 && f5.slug === 'a',
    `the first commentary: a lower key's note before a higher key's place between notes (${f1 && f1.slug}), else that place (${f2 && f2.slug}); bounded by time (${f3 && f3.slug}); a note first in rank waits on none below (${f4 && f4.slug}); where the verses are counted otherwise, the first key with any place (${f5 && f5.slug})`);
  ok(/c = await firstOnVerse\(keys, S\.verse, w, \(\) => tok === S\.initTok && !S\.cur, !!\(A && A\.otherNumbers && A\.otherNumbers\(w\.book, w\.ch, Number\(S\.verse\)\)\.length\)\);/.test(js),
    'the first commentary is told when the chapter\'s verses are counted otherwise there');
  // (2026-11-09, the owner: "Look at most 3 places down") a note wins only from the first three keys; past them the first key with a
  // place opens, and none below a place in hand is waited for
  const keys5 = ['a', 'b', 'c', 'd', 'e'].map((slug) => ({ slug }));
  const t0 = Date.now(), f6 = await make({ a: 2, b: 0, c: 0, d: 1 }, { d: 5000 })(keys, 3, {}, yes), t6 = Date.now() - t0;
  const f7 = await make({ a: 0, b: 0, c: 0, d: 1 })(keys, 3, {}, yes);
  const f8 = await make({ a: 0, b: 0, c: 0, d: 2, e: 1 })(keys5, 3, {}, yes);
  ok(keysN && +keysN[1] === 3 && f6 && f6.slug === 'a' && t6 < 2000 && f7 && f7.slug === 'd' && f8 && f8.slug === 'd',
    `at most three places down: the fourth key's note does not win over the first key's place (${f6 && f6.slug}, ${t6} ms, not waited for); with no place in the first three, the first key with one, its note (${f7 && f7.slug}) or its place (${f8 && f8.slug})`);
  /* (2026-11-10, pane3c; the owner's rule in full: "A marked note may win only from the top 3 keys; otherwise the top key opens its right
   * page unmarked") the key opened for a place of the second kind is left in S.plain, with its chapter and verse, and paint marks nothing
   * there; a note of the first three, a note past them and the first key where the verses are counted otherwise open marked as before;
   * the reader's own pick of a work marks as the keys do, and a new chapter starts with none */
  const plainOf = async (cls, ks, shifted) => { const st = {}; const c = await make(cls, null, st)(ks, 3, { book: 'judges', ch: 8 }, yes, shifted); return `${c && c.slug}:${st.plain ? `${st.plain.slug}@${st.plain.key}:${st.plain.v}` : '-'}`; };
  const p1 = await plainOf({ a: 2, b: 0, c: 0, d: 0 }, keys), p2 = await plainOf({ a: 2, b: 0, c: 1, d: 1 }, keys), p3 = await plainOf({ a: 2, b: 0, c: 1, d: 1 }, keys, true);
  const p4 = await plainOf({ a: 0, b: 0, c: 0, d: 1 }, keys), p5 = await plainOf({ a: 0, b: 0, c: 0, d: 2, e: 1 }, keys5), p6 = await plainOf({ a: 0, b: 2, c: 0, d: 1 }, keys);
  ok(p1 === 'a:a@judges/8:3' && p2 === 'c:-' && p3 === 'a:-' && p4 === 'd:-' && p5 === 'd:d@judges/8:3' && p6 === 'b:b@judges/8:3',
    `the key opened for a place of the second kind opens unmarked (${p1}; past the first three ${p5}; the second key ${p6}); a note of the first three (${p2}), a note past them (${p4}) and the first key where the verses are counted otherwise (${p3}) are marked as before`);
  ok(/const plain = !!\(S\.plain && S\.plain\.slug === sh\.slug && S\.plain\.v === Number\(S\.verse\) && S\.plain\.key === `\$\{sh\.book\}\/\$\{sh\.ch\}`\);\s*const nm = plain \|\| /.test(js)
    && /if \(mine\) S\.plain = null;/.test(js) && /S\.dirSeeded = false; S\.plain = null;/.test(js),
    'paint marks nothing for the key the pane opened unmarked, on its verse; a pick of the reader\'s and a new chapter let it go');
  /* (2026-11-10, pane3c) THE NOTES OF THE PASSAGE BEFORE: the Harmony prints "Deuteronomy 8:7-10" and "Deuteronomy 11:10-12" with their
   * texts, then his notes on 8:7 and 8:10; "10. When thou hast eaten and art full" is no note on Deuteronomy 11:10. A note that opens as
   * the reference's own printed verse is the reference's again; where the reference's own note comes first, nothing changes */
  {
    const head = ['Deuteronomy 11:10-12', '10. For the land, whither thou goest in to possess it, is not as the land of Egypt, from whence ye came out, where thou sowedst thy seed.',
      '10. Terra enim quam tu ingrederis ut possideas eam, non est sicut terra Aegypti, ex qua egressi estis, in qua seminabas semen tuum.',
      '11. But the land, whither ye go to possess it, is a land of hills and valleys, and drinketh water of the rain of heaven.',
      '11. At terra ad quam vos transibitis ut possideatis eam, terra montium et vallium est: de pluvia coeli bibit aquas.'];
    const before = ['7. For the Lord thy God. We may shortly sum up the words and the matter. He almost sets before their eyes a habitation in the land of Canaan, that they may be the more ready to obey.',
      '10. When thou hast eaten and art full. In these words he admonishes them that they would be too senseless, unless they were led by so great an abundance to give thanks to God.'];
    const own = '11. But the land. He here compares it with Egypt, and commends it on the ground that it drinks in the rain of heaven, and so depends on the blessing of God alone, whereas the Egyptians water their fields by their own labor from the river, as men water a garden of herbs with the foot.';
    const h1 = [...head, ...before], h2 = [...head, ...before, own], h3 = [...head, own, '12. A land which the Lord thy God careth for. He adds that the eyes of God are always upon it.'];
    ok(A.findNote(h1, 10, true, 11) < 0 && A.findNote(h2, 10, true, 11) < 0 && A.findNote(h2, 11, true, 11) === 7 && A.findNote(h3, 11, true, 11) === 5 && A.findNote(h3, 12, true, 11) === 6,
      `the notes after a reference's text that open with a number below its first verse are the passage before's (his note on Deuteronomy 8:10 for 11:10: ${A.findNote(h1, 10, true, 11)}); one that opens as the reference's printed verse is its own again (${A.findNote(h2, 11, true, 11)}); the reference's own notes are found as before (${A.findNote(h3, 11, true, 11)}, ${A.findNote(h3, 12, true, 11)})`);
    ok(A.printedText(head, 10) && A.printedText(head, 11) && !A.printedText(h3, 12) && !A.printedText(before, 10), 'a verse printed in both tongues is the text, a numbered note is not (printedText)');
    // (only the paragraph next after the text, and only a number below the reference's first verse: Calvin's commentaries run on from
    // "Hosea 9:6" and his comment to the next verse with no heading of its own)
    const hos = ['Hosea 9:6', '6. For, lo, they are gone because of destruction: Egypt shall gather them up, Memphis shall bury them: the pleasant places for their silver, nettles shall possess them.',
      '6. Quia ecce abierunt a vastatione: Aegyptus colliget eos, Memphis sepeliet eos: desiderabile argenti eorum urtica possidebit, et non est spina in tabernaculis eorum.',
      'The Prophet confirms here what is contained in the last verse, that is, that the Israelites would at length be deprived of all their hope, and that Egypt would be their grave.',
      '7. The days of visitation are come. The Prophet, by saying that the days of visitation had come, intended to shake off from hypocrites that supine torpor in which they slept, and of which we have often spoken before.'];
    ok(A.findNote(hos, 7, true, 9) === 4 && A.findNote([...head, own.replace(/^11\./, '13.'), before[0]], 13, true, 11) === 5,
      'a numbered paragraph after the comment, or a number past the reference\'s verses, is read as before');
  }
  /* (2026-11-11, pane3c) A FOOTNOTE'S NUMBER INSIDE A LEMMA: "17. For [39] the righteousness of God, etc." was cut at "For" and could
   * not lead with Romans 1:17. The lemma is read both ways: on past the number, and cut at it, as where the number ends the lemma and
   * the comment runs on ("18. And Abram removed his tent [355] Here Moses relates"); a lemma of another verse leads with neither */
  {
    const rom = (n) => ({ 16: 'For I am not ashamed of the gospel: for it is the power of God unto salvation to every one that believeth; to the Jew first, and also to the Greek.',
      17: 'For therein is revealed a righteousness of God from faith unto faith: as it is written, But the righteous shall live by faith.',
      18: 'For the wrath of God is revealed from heaven against all ungodliness and unrighteousness of men, who hinder the truth in unrighteousness;' })[n] || '';
    const gen = (n) => ({ 17: 'Arise, walk through the land in the length of it and in the breadth of it; for unto thee will I give it.',
      18: 'And Abram moved his tent, and came and dwelt by the oaks of Mamre, which are in Hebron, and built there an altar unto Jehovah.' })[n] || '';
    const r17 = '17. For [39] the righteousness of God, etc. This is an explanation and a confirmation of the preceding clause, that the gospel is the power of God unto salvation.';
    const g18 = '18. And Abram removed his tent [355] Here Moses relates that the holy man, animated by the renewed promise of God, traverses the land with great courage.';
    ok(A.leads(r17, 17, rom) && A.quotes(r17, 17, rom) && A.leads(g18, 18, gen) && !A.leads('17. For [39] the wrath of God, etc. He reasons now by stating things of a contrary nature.', 17, rom) && !A.leads(r17, 18, rom),
      `a lemma with a footnote's number in it leads with its verse, read on past the number (${A.leads(r17, 17, rom)}) or cut at it (${A.leads(g18, 18, gen)}); another verse's lemma does not (${A.leads(r17, 18, rom)})`);
  }
  /* (2026-11-11, pane3f) A LEMMA WITH NO STOP AFTER IT: Calvin's "4 And God saw the light Here God is introduced by Moses" took in the
   * comment's words and could not lead with Genesis 1:4. The lemma is read a third way, cut where a capitalised word follows a lower-case
   * one, each such cut tried; a cut that leaves one word that tells ("unto Abram He now relates") verifies nothing */
  {
    const gen1 = (n) => ({ 3: 'And God said, Let there be light: and there was light.', 4: 'And God saw the light, that it was good: and God divided the light from the darkness.',
      5: 'And God called the light Day, and the darkness he called Night. And there was evening and there was morning, one day.',
      18: 'and to rule over the day and over the night, and to divide the light from the darkness: and God saw that it was good.' })[n] || '';
    const gen12 = (n) => ({ 1: "Now Jehovah said unto Abram, Get thee out of thy country, and from thy kindred, and from thy father's house, unto the land that I will show thee:",
      4: 'So Abram went, as Jehovah had spoken unto him; and Lot went with him: and Abram was seventy and five years old when he departed out of Haran.' })[n] || '';
    const g4 = '4 And God saw the light Here God is introduced by Moses as surveying his work, that he might take pleasure in it.';
    const a1 = '1. Now the Lord had said unto Abram He now relates that the holy man was called a second time.';
    ok(A.leads(g4, 4, gen1) && A.quotes(g4, 4, gen1) && !A.leads(g4, 3, gen1) && !A.leads(g4, 5, gen1) && !A.leads(a1, 4, gen12) && !A.leads(a1, 1, gen12),
      `a lemma with no stop after it leads with its verse, cut where a capital follows a lower-case word (${A.leads(g4, 4, gen1)}), and with no other (${A.leads(g4, 5, gen1)}); a cut of one telling word verifies nothing (${A.leads(a1, 4, gen12)})`);
    // every telling word before the cut must be the verse's: Cajetan's "Vers. 1. And Solomon began to build the house of the Lord in
    // Jerusalem on mount Moriah" (2 Chronicles 3:1), cut at the name, has three of 2:1's words and "began", which 2:1 has not; under
    // his margin labels it is not taken for the note on 2:1 (quotes: half of the whole lemma's words, or every word of a cut)
    const ch2 = (n) => ({ 1: 'Now Solomon purposed to build a house for the name of Jehovah, and a house for his kingdom.', 2: 'And Solomon counted out threescore and ten thousand men to bear burdens, and fourscore thousand men that were hewers in the mountains, and three thousand and six hundred to oversee them.' })[n] || '';
    const s31 = 'Vers. 1. And Solomon began to build the house of the Lord in Jerusalem on mount Moriah.] Read the twenty-second chapter of Genesis.';
    ok(!A.quotes(s31, 1, ch2) && A.quotes('1. Now Solomon purposed to build a house Here the sacred writer', 1, ch2), `a cut with a word the verse has not quotes nothing: 2 Chronicles 3:1 on 2:1 (${A.quotes(s31, 1, ch2)})`);
    // nor where a verse within two has as many of the cut's words: Calvin's "26. I will call them my people which are not a people" is
    // Romans 9:25's wording; a verse far off may have as many (Genesis 1:18 has "saw" and "light", and 1:4 still leads, above)
    const rom9 = (n) => ({ 25: 'As he saith also in Hosea, I will call that my people, which was not my people; And her beloved, that was not beloved.',
      26: 'And it shall be, that in the place where it was said unto them, Ye are not my people, There shall they be called sons of the living God.' })[n] || '';
    const r26 = '26. I will call them my people which are not a people This is said with respect to the divorce, which God had already made with the people, by depriving them of all honor.';
    ok(!A.leads(r26, 26, rom9) && !A.quotes(r26, 26, rom9) && A.leads(r26, 26, (n) => (n === 26 ? rom9(26) : '')),
      `a cut that a verse within two has as many words of is no lemma of this one: Romans 9:25's words under "26." (${A.leads(r26, 26, rom9)})`);
  }
  /* (2026-11-11, pane3f) THE DIVINE NAME: Calvin's "1. Jehovah is my shepherd." could not lead with Psalm 23:1 where the page prints "The
   * LORD is my shepherd". "Jehovah", "Yahweh" and "LORD" in capitals among lower-case words are one name; the name alone verifies nothing
   * ("Thus saith the LORD"), and Augustine's Vulgate lemma, "The Lord ruleth me", is left as it was */
  {
    const ps23 = (n) => ({ 1: 'The LORD is my shepherd; I shall not want.', 2: 'He makes me lie down in green pastures. He leads me beside still waters.',
      6: 'Surely goodness and mercy shall follow me all the days of my life, and I shall dwell in the house of the LORD forever.' })[n] || '';
    const c1 = '1. Jehovah is my shepherd. Although God, by his benefits, gently allures us to himself, as it were by a taste of his fatherly sweetness';
    ok(A.leads(c1, 1, ps23) && A.leads('1. Yahweh is my shepherd. A comment.', 1, ps23) && !A.leads(c1, 6, ps23) && !A.leads('1. Thus saith the LORD. A comment.', 1, ps23)
      && !A.leads('1. [vers. 1.] The Church speaks to Christ: The Lord ruleth me, and I shall want nothing. The Lord Jesus Christ is my Shepherd', 1, ps23),
    `"Jehovah is my shepherd" leads with "The LORD is my shepherd" (${A.leads(c1, 1, ps23)}), not with a verse that has the name alone (${A.leads(c1, 6, ps23)}); the name alone is no lemma (${A.leads('1. Thus saith the LORD. A comment.', 1, ps23)})`);
  }
  /* (2026-11-11, pane3g) THE VERSE IN THE COMMENTARIES' OWN BIBLE: the page prints a modern translation, the commentaries quote the
   * Authorised Version's wording. A note leads with its verse where it does so within the page's text or within the chapter file's own,
   * each read whole: Calvin's "1. And the Lord spake unto Moses." with Leviticus 17:1 as the file has it, not as the page does; a lemma
   * with one word of each text and two of neither leads with nothing */
  {
    const page = (n) => ({ 1: 'And the LORD spoke to Moses, saying,', 2: 'Speak to Aaron and his sons and to all the people of Israel and say to them, This is the thing that the LORD has commanded.' })[n] || '';
    const file = (n) => ({ 1: 'And Jehovah spake unto Moses, saying,', 2: 'Speak unto Aaron, and unto his sons, and unto all the children of Israel, and say unto them: This is the thing which Jehovah hath commanded, saying,' })[n] || '';
    const l1 = '1. And the Lord spake unto Moses. In this, and similar passages, God appoints the priests to offer the sacrifices.';
    const mixed = '2. The people and the children. A lemma with a word of each text.';
    ok(!A.leads(l1, 1, page) && A.leads(l1, 1, file) && !A.leads(l1, 2, file) && !A.leads(mixed, 2, page) && !A.leads(mixed, 2, file),
      `"And the Lord spake unto Moses." leads with Leviticus 17:1 in the chapter file's text (${A.leads(l1, 1, file)}), not in the page's (${A.leads(l1, 1, page)}); one word of each text is two of neither (${A.leads(mixed, 2, page)}, ${A.leads(mixed, 2, file)})`);
    ok(/const fileText = \(v\) => \(S\.ownText && S\.ownText\.get\(Number\(v\)\)\) \|\| '';\s*const either = \(f\) => !!f\(verseText\) \|\| \(!!\(S\.ownText && S\.ownText\.size\) && !!f\(fileText\)\);/.test(js)
      && /json\(`\$\{BASE\}\/v1\/bible\/all\/\$\{w\.book\}\/\$\{w\.ch\}\.json\.gz`\)\.catch\(\(\) => null\)\]\);/.test(js)
      && /S\.ownText = new Map\(\(\(own && own\.verses\) \|\| \[\]\)\.map\(\(x\) => \[Number\(x\.v\), String\(x\.t \|\| ''\)\]\)\);/.test(js)
      && (js.match(/either\(\(text\) => /g) || []).length === 7 && !/A\.(?:leads|quotes|harmonyNote)\([^;]*verseText\)/.test(js.replace(/\/\*[\s\S]*?\*\//g, '')),
    'the pane reads a note against the page\'s text or the chapter file\'s own, each whole, from the file the list\'s loader has read; no lemma test is left on the page\'s text alone');
  }
  /* (2026-11-11, pane3f) CALVIN'S HARMONIES IN THE FIRST PASS (harmonyNote): a note of theirs is the verse's own only where it is not the
   * passage's printed text, the nearest paragraph before it that names a book and chapter names the verse's, and it leads with the verse
   * by two words that tell, no other verse of the chapter as many */
  {
    const m19 = ['Matthew 19:13-15; Mark 10:13-16; Luke 18:15-17', 'Matthew 19:13-15', 'Mark 10:13-16', 'Luke 18:15-17',
      '13. Then were presented to him children, that he might lay hands on them, and pray; but the disciples rebuked them. 14. But Jesus said to them, Suffer children, and forbid them not to come to me.',
      '13. And they brought to him children, that he might touch them; but the disciples rebuked those who presented them. 14. And when Jesus saw it, he was displeased.',
      '15. And they presented to him also infants, that he might touch them; and when the disciples saw it, they rebuked them.',
      'This narrative is highly useful; for it shows that Christ receives not only those who, moved by holy desire and faith, freely approach to him, but those who are not yet of age to know how much they need his grace.',
      'Matthew 19:13. But the disciples rebuked them. If a diadem had been placed on his head, they would have admitted it willingly, and with approbation; for they did not yet comprehend his actual office.',
      '14. Suffer children. He declares that he wishes to receive children; and at length, taking them in his arms, he not only embraces, but blesses them by the laying on of hands.'];
    const mt19 = (n) => ({ 13: 'Then were there brought unto him little children, that he should lay his hands on them, and pray: and the disciples rebuked them.',
      14: 'But Jesus said, Suffer the little children, and forbid them not, to come unto me: for to such belongeth the kingdom of heaven.', 15: 'And he laid his hands on them, and departed thence.' })[n] || '';
    const mk10 = (n) => ({ 13: 'And they were bringing unto him little children, that he should touch them: and the disciples rebuked them.',
      14: 'But when Jesus saw it, he was moved with indignation, and said unto them, Suffer the little children to come unto me; forbid them not: for to such belongeth the kingdom of God.' })[n] || '';
    const H = (ps, h, v, text, book, ch) => A.harmonyNote(ps, h, v, text, book, ch);
    ok(!H(m19, 5, 13, mt19, 'matthew', 19) && !H(m19, 4, 13, mt19, 'matthew', 19) && !H(m19, 5, 13, mk10, 'mark', 10),
      `a Gospel's printed text under the passage's headings is no note: Mark's "13. And they brought to him children" on Matthew 19:13 (${H(m19, 5, 13, mt19, 'matthew', 19)}), nor on Mark 10:13 (${H(m19, 5, 13, mk10, 'mark', 10)})`);
    ok(H(m19, 9, 14, mt19, 'matthew', 19) && H(m19, 8, 13, mt19, 'matthew', 19) && !H(m19, 9, 14, mk10, 'mark', 10)
      && !H([...m19.slice(0, 8), 'Mark 10:14. And when Jesus saw it. Mark alone relates that Christ was displeased with his disciples.', m19[9]], 9, 14, mt19, 'matthew', 19) && !H(m19.slice(9), 0, 14, mt19, 'matthew', 19),
    `"14. Suffer children." after "Matthew 19:13. But the disciples rebuked them." is his note on Matthew 19:14 (${H(m19, 9, 14, mt19, 'matthew', 19)}), and that note his on 19:13 (${H(m19, 8, 13, mt19, 'matthew', 19)}); not on Mark 10:14, nor after "Mark 10:14.", nor with no reference on the pages read (${H(m19.slice(9), 0, 14, mt19, 'matthew', 19)})`);
    const d5 = ['Deuteronomy 5', 'THE REPETITION', 'Deuteronomy 5:1-6, 4:20', '3. The Lord made not this covenant with our fathers, but with us, even us, who are all of us here alive this day.',
      '3. Non cum patribus nostris percussit Deus foedus hoc, sed nobiscum, qui ipsi hodie omnes vivimus.', '4. The Lord talked with you face to face in the mount, out of the midst of the fire,',
      '4. Facie ad faciem loquutus est Jehova nobiscum in monte e medio ignis, coram vobis omnibus,', '3. The Lord made not this covenant. He does not here deny that the fathers had been included in the covenant; the comparison is of less and more.',
      '4. Face to face. Again he commends the Law by mentioning their certainty about it; for, when God openly manifests himself, there is no room for doubt.'];
    const ex20 = (n) => ({ 3: 'Thou shalt have no other gods before me.', 4: 'Thou shalt not make unto thee a graven image, nor any likeness of any thing that is in heaven above, or that is in the earth beneath, or that is in the water under the earth:' })[n] || '';
    const dt5 = (n) => ({ 2: 'Jehovah our God made a covenant with us in Horeb.', 3: 'Jehovah made not this covenant with our fathers, but with us, even us, who are all of us here alive this day.',
      4: 'Jehovah spake with you face to face in the mount out of the midst of the fire,' })[n] || '';
    const d7 = ['Deuteronomy 7', 'Deuteronomy 7:6-8', '6. For thou art an holy people unto the Lord thy God: the Lord thy God hath chosen thee to be a special people unto himself, above all people that are upon the face of the earth.',
      '6. Quia populus sanctus es Jehovae Deo tuo: te elegit Jehova Deus tuus ut sis ei in populum peculiarem ex omnibus populis qui sunt in superficie terrae.',
      "6. For thou art a holy people. He explains more distinctly what we have lately seen respecting God's gratuitous love; for the comparison of the fewness of the people with the whole world illustrates His grace. He proves it to be of God's gratuitous favor that He has exalted them to such high honor, because He had passed over all other nations, and deigned to embrace them alone.",
      "7. The Lord did not set his love upon you. He proves it to be of God's gratuitous favor, that He has exalted them to such high honor."];
    const dt7 = (n) => ({ 6: 'For thou art a holy people unto Jehovah thy God: Jehovah thy God hath chosen thee to be a people for his own possession, above all peoples that are upon the face of the earth.',
      7: 'Jehovah did not set his love upon you, nor choose you, because ye were more in number than any people; for ye were the fewest of all peoples:' })[n] || '';
    ok(!H(d5, 8, 4, ex20, 'exodus', 20) && !H(d5, 8, 4, dt5, 'deuteronomy', 5) && H(d7, 4, 6, dt7, 'deuteronomy', 7) && !H(d7, 2, 6, dt7, 'deuteronomy', 7)
      && !H(['Deuteronomy 9:1-6', ...d7.slice(2)], 3, 6, dt7, 'deuteronomy', 7) && !H(d7.slice(4), 0, 6, dt7, 'deuteronomy', 7),
    `under "Deuteronomy 5:1-6, 4:20" his "4. Face to face." is no note on Exodus 20:4 (${H(d5, 8, 4, ex20, 'exodus', 20)}), nor, by one word, on Deuteronomy 5:4 (${H(d5, 8, 4, dt5, 'deuteronomy', 5)}); under "Deuteronomy 7:6-8" his "6. For thou art a holy people." is his note on 7:6 (${H(d7, 4, 6, dt7, 'deuteronomy', 7)}), the verse printed in both tongues is not (${H(d7, 2, 6, dt7, 'deuteronomy', 7)}), nor the note under another chapter's heading or under none`);
    const l18 = ['Leviticus 18', 'Leviticus 18:5', '5. Ye shall therefore keep my statutes and my judgments; which if a man do, he shall live in them: I am the Lord.', '5. Custodite statuta mea, et judicia mea, quae homo si faciat, vivet in ipsis: ego Jehova.',
      '5. Ye shall therefore keep my statutes. Although Moses introduces this passage, where he exhorts the Israelites to cultivate chastity, it extends to the whole Law.'];
    const lv18 = (n) => ({ 4: 'Mine ordinances shall ye do, and my statutes shall ye keep, to walk therein: I am Jehovah your God.', 5: 'Ye shall therefore keep my statutes, and mine ordinances; which if a man do, he shall live in them: I am Jehovah.' })[n] || '';
    const e22 = ['Exodus 22:1-4', 'Thus far God has proclaimed Himself the avenger of iniquities; He now sets forth the punishments of theft.',
      '1. If a man shall steal an ox, or a sheep, and kill it, or sell it; he shall restore five oxen for an ox, and four sheep for a sheep.', '2. If a thief be found breaking up, and be smitten that he die, there shall no blood be shed for him.',
      '1. If a man shall steal. Thus far God has proclaimed Himself the avenger of iniquities, and, citing thieves before His tribunal, has threatened them with eternal death.',
      '2. If a thief be found breaking up. This clause is to be taken separately, and is inserted by way of parenthesis; for, after having decreed the punishment, He adds in connection that the thief should be slain.'];
    const ex22 = (n) => ({ 1: 'If a man shall steal an ox, or a sheep, and kill it, or sell it; he shall pay five oxen for an ox, and four sheep for a sheep.',
      2: 'If the thief be found breaking in, and be smitten so that he dieth, there shall be no bloodguiltiness for him.', 3: 'If the sun be risen upon him, there shall be bloodguiltiness for him; he shall make restitution: if he have nothing, then he shall be sold for his theft.' })[n] || '';
    ok(!H(l18, 4, 5, lv18, 'leviticus', 18) && !H(e22, 3, 2, ex22, 'exodus', 22) && H(e22, 5, 2, ex22, 'exodus', 22),
      `a lemma another verse of the chapter has as many words of is refused ("5. Ye shall therefore keep my statutes.", Leviticus 18:5 beside 18:4: ${H(l18, 4, 5, lv18, 'leviticus', 18)}); a printed line, the notes after it beginning again, is no note (${H(e22, 3, 2, ex22, 'exodus', 22)}), the note is (${H(e22, 5, 2, ex22, 'exodus', 22)})`);
    ok(/const harmony = HARMONY\.test\(vol\.slug\);\s*if \(!A \|\| !\(A\.leads \|\| A\.quotes\) \|\| vol\.nm \|\| t\.misfit \|\| \(harmony && !\(A\.harmonyNote && HARMONY_IN\.test\(vol\.slug\)\)\)\) return false;/.test(js)
      && /if \(harmony\) return either\(\(text\) => A\.harmonyNote\(m\.all, m\.h, v, text, w\.book, w\.ch\)\);/.test(js),
    'the pane takes a Harmony\'s note for the first pass only under the anchor\'s harmonyNote, on the pages its mark was looked for in');
  }
  /* (2026-11-10, pane3c) a place between its notes is a place in hand only where the pages bear it out: each side is looked for as paint
   * would mark it, and the place does not stand where a side is only the printed text or where one side's note is there and the other's
   * is not; and a next or closest note the pages do not show is said to be the comment on its verse, on this page */
  ok(/async function betweenStands\(vol, t, w\) \{/.test(js) && /const side = \(n\) => \{ const m = noteMark\(pages, lane, \{ p: t\.p, how: 'note', v: n, indexed: true \}, w, n, vol\); return m\.h >= 0 \? 1 : A\.printedText\(m\.all, n\) \? -1 : 0; \};/.test(js)
    && /return before >= 0 && after >= 0 && before === after;/.test(js) && /if \(t\.how === 'between'\) return \(await betweenStands\(vol, t, w\)\) \? 2 : 3;\s*return NEAR\.has\(t\.how\) \? 2 : 0;/.test(js),
    'a place between its notes that the pages do not bear out is no place in hand for the first commentary');
  // (3: such a place) the next key with a place that stands opens instead, a note of the first three or a place past it; with none, it
  // opens as it did, unmarked
  const w1 = await plainOf({ a: 0, b: 3, c: 0, d: 1 }, keys), w2 = await plainOf({ a: 3, b: 0, c: 2, d: 1 }, keys), w3 = await plainOf({ a: 0, b: 3, c: 0, d: 0 }, keys), w4 = await plainOf({ a: 3, b: 1, c: 0, d: 0 }, keys);
  const w5 = await plainOf({ a: 0, b: 3, c: 0, d: 1 }, keys, true);
  ok(w1 === 'd:-' && w2 === 'c:c@judges/8:3' && w3 === 'b:b@judges/8:3' && w4 === 'b:-' && w5 === 'b:-',
    `a place the pages do not bear out gives way to the next key with a place that stands (its note ${w1}, ${w4}; its place ${w2}); with none, it opens as it did (${w3}); so it does where the verses are counted otherwise (${w5})`);
  ok(/if \(h < 0 && \(t\.how === 'later' \|\| t\.how === 'nearest'\)\) \{ say = `No separate note on \$\{sh\.ch\}:\$\{S\.verse\}\. Its comment on \$\{ref\(t\.v\)\}, the \$\{t\.how === 'later' \? 'next after' : 'closest before'\} it, is on this page`;/.test(js),
    'a next or closest note the pages do not show under its number is said to be the comment on its verse, on this page');
  // a place between its notes says only what is known
  ok(/No separate note on \$\{sh\.ch\}:\$\{S\.verse\}\. Its notes on \$\{sh\.ch\}:\$\{t\.a\} and \$\{sh\.ch\}:\$\{t\.b\} are on/.test(js) && !/is on this page, between its notes on \$\{/.test(js),
    'a place between its notes says there is no separate note and where its notes either side are');
  // a lone label in a run of margin labels gives way to the numbered note whose first words are the verse's; the status names the mark's page
  ok(/if \(h >= 0 && !foot && labelRun\(all, h, pageOf\)\) \{\s*const k2 = A \? A\.findNote\(part, printed, !!t\.indexed, w\.ch, new Set\(part\.filter\(\(s\) => LABEL\.test\(s\)\)\), texts\)/.test(js)
    && /A\.quotes && either\(\(text\) => A\.quotes\(part\[k2\], t\.v, text\)\)/.test(js), 'a label in a run of margin labels gives way to the numbered note that quotes the verse');
  ok(/if \(h >= 0\) setWhere\(pages\[pageOf\[h\]\]\.n, false\);/.test(js), "the status line names the page the mark is on");
  // a bare margin number with another after it heads nothing (Cajetan's Deuteronomy 6, p. 490); one over the note's words heads it
  const lab = new Function(`${js.slice(js.indexOf('  const LABEL = '), js.indexOf("  // a verse's note opens its paragraph"))}; return labelRun;`)();
  const caj = ['Ver.', '"And you shall write them on the threshold, and on the doors of your house."', '8.', '15.', '6.', '7.', 'I.', '9.', 'It is a common custom of Scripture'];
  const one = (n) => Array.from({ length: n }, () => 295);
  ok(lab(caj, 2) && lab(caj, 5) && !lab(['Ver.', '22.', 'Saying: I will pass through your land'], 1) && !lab(['12. And the people', 'Vers. 13.'], 0) && lab(['VERS. 1.', 'Verf.2.'], 0)
    && lab(['Ver. 20.', 'Ver. 21.', 'Ver. 22.', 'Thus far the deserters to David.'], 2, [295, 295, 295, 296]) && !lab(['Rectius alii.', 'Vers. 10.', 'HELD THE PRINCIPALITY AMONG ALL THESE KINGDOMS)'], 1, one(3))
    && !lab(['V. 2', 'But they err plainly.', 'V. 4', 'V. 6', 'Answer me here, Jew, and whoever you are'], 3, one(5)),
    "a margin number standing alone among others is no note's head, nor the last of them at a page's foot; inside a page, over the note's words, it is one");
  // a paragraph whose first words are another verse's is not marked, in the Commentary view and the preview
  ok(/if \(h >= 0 && A && A\.onOther && A\.onOther\(all\[h\], t\.v, verseText, \[printed,/.test(js) && /if \(hit >= 0 && A && A\.onOther && A\.onOther\(all\[hit\], t\.v, verseText, \[printed,/.test(js),
    "a paragraph whose first words are another verse's is not marked as the note");
  // the older reading on a page the library indexed keeps to the chapter's and the passage's headings, and never takes a printed verse
  ok(/const mine = A && A\.inScope \? A\.inScope\(part, w\.ch\) : \(\) => true; const j = part\.findIndex\(\(s, i\) => noteRx\(printed\)\.test\(s\) && mine\(i\) && !\(A && A\.twin && A\.twin\(part, i\)\)\);/.test(js),
    "the indexed page's older reading keeps to the chapter's and passage's headings and skips a verse printed in both tongues");
  // the note's own number where the anchor gives one (a note numbered past the chapter's end, a psalm's title headed as verse 1)
  ok(/const printed = t\.pv \|\| \(c && c\.pv && c\.pv\[t\.v\]\) \|\| t\.v;/.test(js) && /const m = noteMark\(pages, lane, t, wr, S\.verse, S\.cur\);/.test(js) && /const printed = t\.pv \|\| \(c\.pv && c\.pv\[t\.v\]\) \|\| t\.v;/.test(js),
    'the pane marks a note by its own number where the anchor gives it (pv), in the Commentary view and the preview');
}

// ── 2026-11-09, pane3b: the coordinator's read of the node gate ──────────────────────────────────────────────────────────────────────
{
  const of = (o) => (n) => o[n] || '';
  // a numbered note under a run of margin labels is the verse's only where its lemma quotes the verse: not Lapide's Numbers 29:7 for 30:7
  const num30 = of({ 4: 'and her father heareth her vow, and her bond wherewith she hath bound her soul, and her father holdeth his peace at her; then all her vows shall stand, and every bond wherewith she hath bound her soul shall stand.',
    5: 'But if her father disallow her in the day that he heareth, none of her vows, or of her bonds wherewith she hath bound her soul, shall stand: and Jehovah will forgive her, because her father disallowed her.',
    6: 'And if she be married to a husband, while her vows are upon her, or the rash utterance of her lips, wherewith she hath bound her soul,',
    7: 'and her husband hear it, and hold his peace at her in the day that he heareth it; then her vows shall stand, and her bonds wherewith she hath bound her soul shall stand.',
    8: 'But if her husband disallow her in the day that he heareth it, then he shall make void her vow which is upon her, and the rash utterance of her lips, wherewith she hath bound her soul: and Jehovah will forgive her.' });
  const zeph2 = of({ 7: 'And the coast shall be for the remnant of the house of Judah; they shall feed their flocks thereupon; in the houses of Ashkelon shall they lie down in the evening.',
    8: 'I have heard the reproach of Moab, and the revilings of the children of Ammon, wherewith they have reproached my people, and magnified themselves against their border.',
    9: 'Therefore as I live, saith Jehovah of hosts, the God of Israel, Surely Moab shall be as Sodom, and the children of Ammon as Gomorrah.',
    10: 'This shall they have for their pride, because they have reproached and magnified themselves against the people of Jehovah of hosts.' });
  const john2 = of({ 3: 'And hereby we know that we know him, if we keep his commandments.', 4: 'He that saith, I know him, and keepeth not his commandments, is a liar, and the truth is not in him;',
    5: 'but whoso keepeth his word, in him verily hath the love of God been perfected. Hereby we know that we are in him:' });
  ok(!A.quotes('7. THE TENTH DAY ALSO OF THIS SEVENTH MONTH SHALL BE HOLY TO YOU. — For that was the feast of Expiation', 7, num30)
    && A.quotes('8. I HAVE HEARD THE REPROACH OF MOAB (whose metropolis is Areopolis, that is, the city of Ar)', 8, zeph2)
    && A.quotes('4. HE WHO SAYS HE KNOWS HIM (true and saving knowledge, that is, practical, which leads to love)', 4, john2),
  'a numbered note under margin labels is the verse\'s where its lemma quotes it: not Lapide\'s "7. THE TENTH DAY" (Numbers 29:7) for 30:7; his "8. I HAVE HEARD THE REPROACH OF MOAB" and "4. HE WHO SAYS HE KNOWS HIM" are');
  // a heading whose lemma is a neighbour verse's does not choose the first commentary: Cajetan's labels a line off his text
  const chr23 = of({ 24: 'These were the sons of Levi after their fathers’ houses, even the heads of the fathers’ houses of those of them that were counted, who did the work for the service of the house of Jehovah, from twenty years old and upward.',
    25: 'For David said, Jehovah, the God of Israel, hath given rest unto his people; and he dwelleth in Jerusalem for ever:',
    26: 'and also the Levites shall no more have need to carry the tabernacle and all the vessels of it for the service thereof.',
    27: 'For by the last words of David the sons of Levi were numbered, from twenty years old and upward.',
    28: 'For their office was to wait on the sons of Aaron for the service of the house of Jehovah, in the courts, and in the chambers, and in the purifying of all holy things;',
    29: 'for the showbread also, and for the fine flour for a meal-offering, whether of unleavened wafers, or of that which is baked in the pan;' });
  const deut4 = of({ 16: 'lest ye corrupt yourselves, and make you a graven image in the form of any figure, the likeness of male or female,',
    17: 'the likeness of any beast that is on the earth, the likeness of any winged bird that flieth in the heavens,',
    18: 'the likeness of anything that creepeth on the ground, the likeness of any fish that is in the water under the earth;',
    19: 'and lest thou lift up thine eyes unto heaven, and when thou seest the sun and the moon and the stars, even all the host of heaven, thou be drawn away and worship them,',
    20: 'But Jehovah hath taken you, and brought you forth out of the iron furnace, out of Egypt, to be unto him a people of inheritance, as at this day.' });
  ok(A.misfit('Ver. 26. According to the latest commands also of David, subjoined to the earlier ones', 26, chr23)
    && A.misfit('Ver. 27. And they were under the hand of the sons of Aaron.] In Hebrew: for their station', 27, chr23)
    && A.misfit('Verse 18. And lest perhaps with your eyes lifted up to the heavens you see the sun and the moon', 18, deut4)
    && !A.misfit('Ver. 28. For their office was to wait on the sons of Aaron] In the service of the house', 28, chr23)
    && !A.misfit('Ver. 26. And the Levites shall no more carry the tabernacle] Being now set in its place', 26, chr23)
    && !A.misfit('(Vers. 26, 27.) According to the latest commands also of David', 27, chr23) && !A.misfit('(Vers. 26 seqq.) According to the latest commands also of David', 26, chr23),
  'a heading whose lemma has more of a neighbour verse\'s words than of its own (Cajetan\'s labels a line off his text) is a misfit; one that quotes its verse, or names several verses, is not');
  // a numbered question that names its verse is that verse's (Willet's "12. Quest. v. 9." is on 1 Samuel 21:9)
  const sam21 = of({ 9: 'And the priest said, The sword of Goliath the Philistine, whom thou slewest in the vale of Elah, behold, it is here wrapped in a cloth behind the ephod.',
    12: 'And David laid up these words in his heart, and was sore afraid of Achish the king of Gath.', 13: 'And he changed his behavior before them, and feigned himself mad in their hands.' });
  ok(A.onOther('12. Quest. v. 9. Whether David sinned in taking Goliaths sword. 1. Some thinke that David offended', 12, sam21)
    && !A.onOther('13. Quest. v. 13. Of Davids chaunging of his behaviour before Achish, whether he offended in so dissembling.', 13, sam21),
  'Willet\'s numbered question names its verse: "12. Quest. v. 9." is no note on 21:12, "13. Quest. v. 13." is his on 21:13');
  // the other count by weighed words: names that run through the chapter do not outweigh a word of one verse
  const sam = ['Then came David to Nob to Ahimelech the priest: and Ahimelech came to meet David trembling, and said unto him, Why art thou alone?',
    'And David said unto Ahimelech the priest, The king hath commanded me a business, and hath said unto me, Let no man know anything of the business.',
    'Now therefore what is under thy hand? give me five loaves of bread in my hand, or whatsoever there is present.',
    'And the priest answered David, and said, There is no common bread under my hand, but there is holy bread.',
    'And David answered the priest, and said unto him, Of a truth women have been kept from us about these three days.',
    'So the priest gave him holy bread; for there was no bread there but the showbread, that was taken from before Jehovah.',
    'Now a certain man of the servants of Saul was there that day, detained before Jehovah; and his name was Doeg the Edomite.',
    'And David said unto Ahimelech, And is there not here under thy hand spear or sword? for I have neither brought my sword nor my weapons with me.',
    'And the priest said, The sword of Goliath the Philistine, whom thou slewest in the vale of Elah, behold, it is here wrapped in a cloth behind the ephod.',
    'And David arose, and fled that day for fear of Saul, and went to Achish the king of Gath.',
    'And the servants of Achish said unto him, Is not this David the king of the land? did they not sing one to another of him in dances?',
    'And David laid up these words in his heart, and was sore afraid of Achish the king of Gath.',
    'And he changed his behavior before them, and feigned himself mad in their hands, and scrabbled on the doors of the gate.',
    'Then said Achish unto his servants, Lo, ye see the man is mad; wherefore then have ye brought him to me?',
    'Do I lack madmen, that ye have brought this fellow to play the madman in my presence?'];
  const willet = ['12. Quest. v. 9. Whether David sinned in taking Goliaths sword. 1. Some thinke that David offended in taking that sword',
    '13. Quest. v. 13. Of Davids chaunging of his behaviour before Achish, whether he offended in so dissembling. 1. The word here used tagham'];
  ok(A.otherCount(willet, 0, 12, 'i-samuel', 21, (n) => sam[n - 1] || '') === 0,
    `the other count's heading is not taken on names the chapter is full of: Willet's "13. Quest. v. 13." stays off 1 Samuel 21:12 (got ${A.otherCount(willet, 0, 12, 'i-samuel', 21, (n) => sam[n - 1] || '')})`);
  // nor a paragraph of the other count's note whose own lemma is another verse's (Migne's "THIS IS THE GIFT OF GOD", the English
  // Ecclesiastes 5:19, inside his "VERSE 17.", the English 5:18)
  const ecc5 = (n) => ({ 17: 'All his days also he eateth in darkness, and he is sore vexed and hath sickness and wrath.',
    18: 'Behold, that which I have seen to be good and to be comely is for one to eat and to drink, and to enjoy good in all his labor, wherein he laboreth under the sun, all the days of his life which God hath given him: for this is his portion.',
    19: 'Every man also to whom God hath given riches and wealth, and hath given him power to eat thereof, and to take his portion, and to rejoice in his labor; this is the gift of God.',
    20: 'For he shall not much remember the days of his life; because God answereth him in the joy of his heart.' }[n] || '');
  const migEcc = ['VERSE 16. — ALL HIS DAYS, etc., that is, in sadness and anxiety of mind because of the acquisition of temporal things.',
    'VERSE 17. — THIS THEREFORE (1). Here from what precedes there is introduced a corollary, namely that a delightful life, although it is not man\'s good',
    'THIS IS THE GIFT OF GOD. In the sense that every good is given by God, temporal goods also, although they are the least among God\'s goods. Health of the body, and the life',
    'VERSE 19. — FOR HE WILL NOT BE REMEMBERED INDEED (3), that is, he will be remembered much.'];
  ok(A.otherCount(migEcc, -1, 18, 'ecclesiastes', 5, ecc5) !== 2,
    `the other count's note does not give way to its paragraph whose lemma is the next verse's (Migne's "THIS IS THE GIFT OF GOD" stays off Ecclesiastes 5:18; got ${A.otherCount(migEcc, -1, 18, 'ecclesiastes', 5, ecc5)})`);
  // the pane: the label run's note by quotes; the first commentary skips a misfit; the other count only where a source lane stands beside the English
  ok(/if \(t\.misfit\) return 2;/.test(js) && (js.match(/A\.quotes && either\(\(text\) => A\.quotes\(part\[k2\], t\.v, text\)\)/g) || []).length === 2
    && (js.match(/const others = \(x\) => \(A && A\.otherNumbers && pages\.some\(\(p\) => p\.la\) \? A\.otherNumbers\(/g) || []).length === 2
    && (js.match(/others\(printed\)\.length\) \{/g) || []).length === 2,
  'the pane takes the label run\'s note by its lemma, takes a misfit key as a place near the verse for the first commentary, and reads the other count only in a work with a source lane');
}

// ── 2026-11-09, pane3b: a work the map marks `nm` (the owner: "Unmark it until fixed") ──────────────────────────────────────────────
{
  // the Commentary view: no paragraph is the mark, a note or label found is said to be on its page; the preview the same; the first
  // commentary takes its note as a page (pass 2)
  // (2026-11-10, pane3c) and so is the key the pane opened unmarked (plain)
  ok(/const nm = plain \|\| !!\(\(S\.list \|\| \[\]\)\.find\(\(x\) => x\.slug === sh\.slug\) \|\| S\.cur \|\| \{\}\)\.nm;/.test(js)
    && /if \(h >= 0 && nm\) \{ nmAt = pages\[pageOf\[h\]\]\.n; h = -1; setWhere\(nmAt, false\); \}/.test(js)
    && /if \(m\.h >= 0 && !nm\) \{ h = m\.h; found = true;/.test(js)
    && /if \(u\.hit >= 0 && nm\) \{ nmAt = pages\[pageOf\[u\.hit\]\]\.n; if \(u\.head > 0\) top = u\.head; say = `Its comment on \$\{ref\(S\.verse\)\} is on this page`; setWhere\(nmAt, false\); \}/.test(js)
    && /if \(h < 0 && t\.how === 'note'\) \{ say = `Its comment on \$\{ref\(t\.v\)\} is on this page`; setWhere\(nmAt != null \? nmAt : shownAt, false\); \}/.test(js),
  'a work marked nm is painted with no mark, its note or label said to be "Its comment on ... is on this page", at the page it was found on');
  ok(/if \(hit >= 0 && c\.nm\) \{ nmAt = onPage\[hit\]; hit = -1; \}/.test(js) && /if \(u\.hit >= 0 && c\.nm\) \{ nmAt = onPage\[u\.hit\];/.test(js)
    && /nmAt != null && \(t\.how === 'head' \|\| t\.how === 'book'\) \? `Its comment on \$\{name\} \$\{w\.ch\}:\$\{v\} is on \$\{at\}`/.test(js),
  'the preview (the verse rail and the phone sheet) marks nothing in a work marked nm');
  ok(/if \(vol\.nm && \(OWN\.has\(t\.how\) \|\| \(t\.how === 'collected' && !t\.nearest\)\)\) return 2;/.test(js),
  "the first commentary takes a work marked nm's note as a page filed as discussing the verse (pass 2)");
}

// ── 2026-11-09, pane3b: the first pass takes a note that quotes the verse (the word judge over the whole Bible) ─────────────────────
{
  ok(/if \(OWN\.has\(t\.how\)\) return \(await ownNote\(vol, t, v, w\)\) \? 1 : 2;/.test(js)
    && /if \(m\.h < 0 \|\| m\.via === 'fallback' \|\| QUESTION\.test\(m\.all\[m\.h\]\)\) return false;/.test(js)
    && /return either\(\(text\) => \(A\.leads \|\| A\.quotes\)\(LABEL\.test\(s\) && m\.h \+ 1 < m\.all\.length \? m\.all\[m\.h \+ 1\] : s, v, text\)\);/.test(js)
    && /const HARMONY = \/harmony-of-the-\(\?:law\|evangelists\)\/;/.test(js),
  'the first pass takes a key only where the mark paint draws quotes the verse; never an indexed fallback, a numbered question, an nm work or Calvin\'s Harmonies');
  const num30b = (n) => ({ 4: 'and her father heareth her vow, and her bond wherewith she hath bound her soul, and her father holdeth his peace at her',
    5: 'But if her father disallow her in the day that he heareth, none of her vows shall stand', 7: 'and her husband hear it, and hold his peace at her in the day that he heareth it; then her vows shall stand' }[n] || '');
  const deut34 = (n) => ({ 2: 'and all Naphtali, and the land of Ephraim and Manasseh, and all the land of Judah, unto the hinder sea,', 3: 'and the South, and the Plain of the valley of Jericho the city of palm-trees, unto Zoar.' }[n] || '');
  const ex26 = (n) => ({ 1: 'Moreover thou shalt make the tabernacle with ten curtains; of fine twined linen, and blue, and purple, and scarlet.', 7: 'And thou shalt make curtains of goats\u2019 hair for a tent over the tabernacle: eleven curtains shalt thou make.' }[n] || '');
  ok(!A.leads('7. THE TENTH DAY ALSO OF THIS SEVENTH MONTH SHALL BE HOLY TO YOU. For that was the feast', 7, num30b) && !A.leads('Unto the utmost sea.', 3, deut34)
    && A.leads('CVIII. [Ib. XXVI, 1.] He orders the tabernacle to be made of ten curtains', 1, ex26),
  'the first pass takes a note that leads with its verse: not Lapide\'s Numbers 29:7 on 30:7 ("holy" is no "hold"), not Cajetan\'s 34:2 under "Verse 3."; Augustine\'s on Exodus 26:1, yes');
  const Q = new RegExp(js.match(/const QUESTION = \/(.+)\/i;/)[1], 'i');
  ok(Q.test('6. Quest. v. 5. Of the company of Prophets whome Saul should meete') && Q.test('19. Quest. v. 14. Of Davids daunsing.') && !Q.test('6. And when he came to the hill'),
  'a numbered question that names its verse is told apart from a numbered note');
  // the comment after a passage printed in both tongues is the note of the passage's first verse only (Calvin, Jeremiah 35:12-15), and
  // not where the paragraph after it turns to the verse (his Hosea 11:12, a new lecture closing the last); kept on Micah 5:4, Joel 2:30
  const jer35 = ['Jeremiah 35:12-15', '12. Then came the word of the LORD unto Jeremiah, saying,', '12. Et fuit sermo Jehovae ad Jeremiam, dicendo,',
    '13. Thus saith the LORD of hosts, the God of Israel; Go and tell the men of Judah and the inhabitants of Jerusalem, Will ye not receive instruction?',
    '13. Sic dicit Jehova exercituum, Deus Israel, Vade et dic viro Jehudah et incolis Jerusalem, Annon recipietis disciplinam?',
    '14. The words of Jonadab the son of Rechab, that he commanded his sons not to drink wine, are performed;',
    '14, Stabiliti sunt sermones Jonadab filii Rechab, quos mandavit filiis suis, ne biberent vinum;',
    '15. I have sent also unto you all my servants the prophets, rising up early and sending them,', '15. Et misi ad vos omnes servos meos Prophetas, mane surgendo et mittendo,',
    'Here Jeremiah applies the example which he had related; for subjoined is God\'s complaint'];
  const hos11p = ['Hosea 11:12', '12. Ephraim compasseth me about with lies, and the house of Israel with deceit: but Judah yet ruleth with God,',
    '12. Circumdedit me mendacio Ephraim, et fraude domus Israel: Judah autem adhuc dominatur cum Deo,',
    'I shall not stay now to recite the opinions of others; nor does it seem necessary. I might have indeed referred in the last verse to the roaring of God',
    'I come now to the last verse, in which the Lord complains, that he had been compassed with lies'];
  const mic5 = ['Micah 5:4', '4. And he shall stand and feed in the strength of the LORD, in the majesty of the name of the LORD his God;',
    '4. Et stabit et pascet in virtute Jehovae, in magnificentia nominis Jehovae Dei sui;', 'There is no doubt but that the Prophet continues here to speak of Christ',
    'He shall stand, he says, and feed in the power of Jehovah'];
  const joel2 = ['Joel 2:30-31', '30. And I will shew wonders in the heavens and in the earth, blood, and fire, and pillars of smoke.',
    '30. Et ponam prodigia in coelis et terra, sanguinem et ignem et columnas nubis.', '31. The sun shall be turned into darkness, and the moon into blood,',
    '31. Sol vertetur in tenebras et luna in sanguinem,', 'The Prophet seems here to contradict himself'];
  const nah2 = ['Grant, Almighty God, that as we are prone to every kind of sin', '2. He that dasheth in pieces is come up before thy face: keep the munition,',
    '2. Ascendit dispergens coram facie tua; custodi munitionem,', 'The waster spoken of here by the Prophet, some consider him to have been Sennacherib'];
  // (a heading whose book is numbered is no printed line: his "1 Peter 3:5-6", the comment after it his on 3:5)
  const pet3 = ['[36] The best construction is to regard "adorning," or ornament, as understood', '1 Peter 3:5-6',
    '5. For after this manner in the old time the holy women also, who trusted in God, adorned themselves,', '5. Sic enim aliquando et sanctae mulieres quae sperabant in Deum, ornabant seipsas,',
    '6. Even as Sara obeyed Abraham, calling him lord: whose daughters ye are,', '6. Quemadmodum et Sara obediebat Abrahae, dominum ipsum appellans,',
    'He sets before them the example of pious women, who sought for spiritual adorning'];
  // (and his "One thing, escaped me in the third verse", after his printed Jonah 3:5, before "I now return to the text"; not his "Since
  // interpreters do not agree about the sense of these words" before "I now return to the substance of the teaching", Daniel 4:27)
  const jon3 = ['He entered then the city a day\'s journey, and cried and said, etc.', '5. So the people of Nineveh believed God, and proclaimed a fast,',
    '5. Et crediderunt viri Ninevae Deo, et indixerunt jejunium,', 'One thing, escaped me in the third verse: Jonah said that Nineveh was a city great to God.',
    'I now return to the text: Jonah says, that the citizens of Nineveh believed God'];
  const dan4 = ['Daniel 4:27', '27. Wherefore, O king, let my counsel be acceptable unto thee, and break off thy sins by righteousness,',
    '27. Quamobrem, rex, consilium meum placeat tibi, et peccata tua justitia redime,', 'Since interpreters do not agree about the sense of these words',
    'I now return to the substance of the teaching. May my counsel please thee! says he.'];
  ok(!A.afterPassage(jer35, 9, 15, 35) && A.afterPassage(jer35, 9, 12, 35) && !A.afterPassage(hos11p, 3, 12, 11) && A.afterPassage(mic5, 3, 4, 5)
    && A.afterPassage(joel2, 5, 30, 2) && !A.afterPassage(joel2, 5, 31, 2) && A.afterPassage(nah2, 3, 1, 2) && A.afterPassage(pet3, 6, 5, 3) && !A.afterPassage(pet3, 6, 6, 3)
    && !A.afterPassage(jon3, 3, 5, 3) && A.afterPassage(dan4, 3, 27, 4),
  'the comment after a printed passage: its first verse\'s (Jeremiah 35:12, not 35:15 past "14, Stabiliti"; Joel 2:30, not 2:31; 1 Peter 3:5 under "1 Peter 3:5-6"), not a lecture\'s close of the verses before it (Hosea 11:12, Jonah 3:5); Micah 5:4, Daniel 4:27 and, with no heading, Calvin\'s "2." on the English Nahum 2:1 kept');
  ok(/A\.afterPassage && !\(c && HARMONY\.test\(c\.slug\)\) && !A\.afterPassage\(all, h, printed, w\.ch\)\) h = -1;/.test(js)
    && /A\.afterPassage && !HARMONY\.test\(slug\) && !A\.afterPassage\(all, hit, printed, w\.ch\)\) hit = -1;/.test(js) && !/A\.earlier/.test(js),
  'the pane and its preview do not mark the comment after a printed passage on a verse that is not its first, Calvin\'s Harmonies aside');
  // Aquinas's Job by the Vulgate's numbers: the range line by the other count, where its words quote the verse
  ok(JSON.stringify(A.otherNumbers('job', 40, 6)) === '[1]' && JSON.stringify(A.otherNumbers('job', 16, 21)) === '[22]'
    && /for \(const x of A\.otherNumbers\(w\.book, w\.ch, Number\(verse\)\)\) \{ const j = line\(x\); if \(j >= 0 && leads\(j\)\) \{ h = j; break; \} \}/.test(js),
  'Aquinas on Job: the English 40:6 is his 40:1, 16:21 his 16:22, and the lecture line is looked for by that number too');
}

{
  // (2026-11-09, pane3b) a reference with two verses by a comma heads a passage (Calvin's Harmony of the Law, "Deuteronomy 27:9, 10")
  ok(JSON.stringify(A.refHead('Deuteronomy 27:9, 10')) === '[[9,10]]' && JSON.stringify(A.refHead('Hebrews Chapter 12:9-11')) === '[[9,11]]',
    `a reference heading with two verses by a comma is read as their run (got ${JSON.stringify(A.refHead('Deuteronomy 27:9, 10'))})`);
}

{
  // (2026-11-09, pane3b) a lecture's line of the verse's number: kept with two of the verse's words, refused with fewer where another verse has more
  const jn3 = (n) => ({ 15: 'that whosoever believeth may in him have eternal life.', 16: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth on him should not perish, but have eternal life.' }[n] || '');
  const mt5b = (n) => ({ 4: 'Blessed are they that mourn: for they shall be comforted.', 5: 'Blessed are the meek: for they shall inherit the earth.' }[n] || '');
  ok(A.lineFits('3:15 so that whoever believes in him may not perish but have eternal life', 15, jn3) && !A.lineFits('5:5 Blessed are they who mourn: for they will be comforted. [n. 422]', 5, mt5b),
    'a lecture line with two of its verse\'s words is its note (Aquinas on John 3:15); one with fewer, where another verse has more, is not (his Vulgate\'s Matthew 5:5)');
}

if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\ncommentary anchor: all checks passed');
