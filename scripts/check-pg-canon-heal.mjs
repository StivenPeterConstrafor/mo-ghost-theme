/*
 * The Patrologia Graeca reader's seam corrections (assets/js/port/pg-canon-heal.js) and the column label
 * (FRPgParallel.location), checked against the four works readers reported on 2026-10-19:
 *
 *   pg-119 / pg-120  the Pedagogue's title page (col. 247) sat at the end of the Exhortation
 *   pg-3834          the Latin on its own plates broke 500 letters before the English
 *   pg-22            a Latin-only opening keyed to its right column read 'col. 718' for a page of cols. 717-718
 *
 * Pure decisions only: the DOM moves are exercised in the browser, since the theme repo carries no DOM library
 * (see memory project_tfr-html-extract-section-shapes). Run: node scripts/check-pg-canon-heal.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const H = require('../assets/js/port/pg-canon-heal.js');
const P = require('../assets/js/port/pg-parallel.js');
const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/pg-canon-heal.json', import.meta.url), 'utf8'));

const scan = (vol, dir, file) => `https://mo-tfr-library.mo-podcast-feed.workers.dev/pg/scan/migne/${vol}/${dir}/${file}`;
const own119 = '00049_clementis-alexandrini-cohortatio-ad-gentes';
const pbs119 = [49, 51, 241, 243, 245].map(n => ({ n, facs: scan('008', own119, `mg008_${String(n).padStart(4, '0')}.jpg`) }));
pbs119.push({ n: 247, facs: '/pg/scan/migne/008/00247_pedagogus/mg008_0247.jpg' });
const pbs120 = [{ n: 249, facs: scan('008', '00247_pedagogus/00249_liber-primus', 'mg008_0249.jpg') }, { n: 251, facs: scan('008', '00247_pedagogus/00249_liber-primus', 'mg008_0251.jpg') }];
const spine = { w118: { id: 118, c: [33, 50] }, w119: { id: 119, c: [49, 248] }, w120: { id: 120, c: [249, 684] } };

// ── scan folders ──
assert.deepEqual(H.facsDir(pbs119[5].facs), { vol: '008', num: 247, slug: 'pedagogus' });
assert.deepEqual(H.facsDir(pbs120[0].facs), { vol: '008', num: 247, slug: 'pedagogus' }, 'a nested folder reads as its work\'s folder');
assert.equal(H.facsDir('https://example.org/x.jpg'), null);

// ── #33: the title page goes to the work whose folder it is in ──
const claim = H.frontMatterClaim(pbs120, spine.w119);
assert.equal(claim && claim.donor, '119', 'pg-120 looks to pg-119 for its title page, and takes nothing until both sides agree');
assert.equal(H.frontMatterClaim(pbs119, spine.w118), null, 'pg-119 opens in its own folder on its own page');
const shared = [{ n: 727, facs: scan('002', '00726_jus-canonicum', 'mg002_0727.jpg') }];
assert.equal(H.frontMatterClaim(shared, { id: 1 }), null, 'a page shared with the work before is not a title page (gap of one)');
assert.equal(H.frontMatterClaim([{ n: 95, facs: scan('025', '00375_oratio-de-incarnatione-verbi', 'mg025b_0095.jpg') }], { id: 2879 }), null, 'offset volumes (folder number far from the column) are left alone');

const cand = H.trailingForeign(pbs119, spine.w120);
assert.equal(cand && cand.from, 247, 'pg-119 ends with a page in the Pedagogue\'s folder');
assert.ok(H.confirmDonor(cand, pbs120), 'and the Pedagogue\'s own pages open in that folder');
assert.equal(cand.count, 1);

// one hand-over, one `from`: the folder one column below the page break (pg-1654 > pg-1655 class) still names the donor's own page
const d1 = [{ n: 1565, facs: scan('021', '01561_homilia-a', 'a.jpg') }, { n: 1567, facs: scan('021', '01561_homilia-a', 'b.jpg') }, { n: 1569, facs: scan('021', '01568_homilia-b', 'c.jpg') }];
const o1 = [{ n: 1571, facs: scan('021', '01568_homilia-b/01571_x', 'd.jpg') }];
const c1 = H.trailingForeign(d1, { id: 2, c: [1571, 1600] });
assert.ok(c1 && c1.from === 1569, 'the donor drops from its own page, not from the folder number');
assert.ok(H.confirmDonor(c1, o1), 'and the owner confirms the same folder');
const ownerClaim = H.frontMatterClaim(o1, { id: 1 });
assert.ok(ownerClaim, 'the owner has a lead, but no `from` of its own to take from');
assert.ok(!('from' in ownerClaim) && !('to' in ownerClaim), 'the owner takes only what the donor confirms');
// a lonely claim (pg-3411 class): a folder opening before the first page with no confirming donor changes nothing
const lonely = [{ n: 1103, facs: scan('021', '01100_lonely', 'e.jpg') }];
const longDonor = [1095, 1097, 1099, 1101, 1103].map(n => ({ n, facs: scan('021', n < 1099 ? '01090_main' : '01099_other', `m${n}.jpg`) }));
assert.equal(H.trailingForeign(longDonor, { id: 3, c: [1105, 1200] }), null, 'a long foreign tail is not a front');
assert.ok(!H.confirmDonor(null, lonely), 'no donor, no hand-over');
assert.ok(!H.confirmDonor(cand, [{ n: 249, facs: scan('008', '00249_other', 'mg008_0249.jpg') }]), 'a next work in another folder is not confirmation');
assert.equal(H.trailingForeign(pbs119.slice(0, 5), spine.w120), null, 'no foreign page, nothing to hand over');
assert.equal(H.trailingForeign(pbs119, { id: 120, c: [260, 684] }), null, 'the next work must begin within a few columns');
assert.ok(H.mayNeedSpine(pbs119) && H.mayNeedSpine(pbs120), 'both halves ask for the spine');
const barnabas = [647, 649, 727].map(n => ({ n, facs: scan('002', '00647_s-barnabas-apostulus', `mg002_0${n}.jpg`) }));
assert.ok(!H.mayNeedSpine(barnabas), 'an ordinary work never fetches the spine');

// ── #37: the Latin cut follows the Greek where the Latin has plates of its own ──
const g = fx.pg3834.greekLens, l = fx.pg3834.latinLens, after = fx.pg3834.latinAfter, before = fx.pg3834.latinBeforeTail;
const sh = H.seamShift(g, l, 'x'.repeat(l[0]), after);
assert.ok(sh && sh.dir === 1, 'the Latin tail moves up to the page before');
const moved = after.slice(0, sh.at);
assert.ok(/declaratus\.\s*$/.test(moved), 'the cut lands on the sentence before "In his duobus montibus"');
assert.ok(after.slice(sh.at).startsWith('In his duobus montibus'), 'and the next page opens on that sentence');
assert.ok(sh.at > 400 && sh.at < 700, 'about 500 letters cross the seam');
assert.equal(H.seamShift([7616, 682], [7616, 682], before, after), null, 'agreeing breaks stay as printed');
assert.equal(H.seamShift([1000, 1000], [4000, 100], 'x'.repeat(4000), 'y'.repeat(100)), null, 'a Latin that is not the same text cut two ways is left alone');
assert.equal(H.sentenceEnd('No full stop here at all', 10, 300), null);
assert.equal(H.sentenceEnd('One. Two. Three. Four.', 10, 4), 10, 'nearest sentence end');

// ── #5: a Latin-only opening names both of its columns ──
const data = { pg_columns: { 717: { la: ['718'] }, 713: { grc: ['713'], la: ['714'] }, 719: { la: ['719'] }, 5: { grc: ['6'] } }, pg_source: 'grcla' };
assert.equal(P.location(data, '717'), 'cols. 717–718');
assert.equal(P.location(data, '713'), 'cols. 713–714', 'a Greek and Latin opening is unchanged');
assert.equal(P.location(data, '719'), 'col. 719');
assert.equal(P.location(data, '5'), 'col. 6', 'a Greek column keyed to an even number is its own citation');
data.pg_source = 'grc';
assert.equal(P.location(data, '717'), null);

console.log('PG canon heal: title-page hand-over, Latin seam cut and Latin-only column label passed.');
