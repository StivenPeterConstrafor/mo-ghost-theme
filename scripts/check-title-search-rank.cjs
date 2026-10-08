#!/usr/bin/env node
// Find-a-work ranks a title match above a word that is only in an author's epithet (2026-10-07).
//
// WHY THIS EXISTS. The owner typed "regensburg" and the Acts of the Regensburg Colloquy (Bucer, 1541) did not come up: nineteen
// works of "Othloh of Saint Emmeram in Regensburg" and his neighbours counted as the author's OWN works, so they filled the first
// page of ten and the one work with Regensburg in its title stood twenty-first. FRSearch.titleRank (assets/js/port/search-tools.js)
// counts a word as the author's only when it is in the name before " of / in / von …"; an author's own works still come first for
// his name ("augustine"), and dubia stay next to him.
//
// The fixture is MereO's own catalogue rows (works-index ⊕ titles_en) that hold any of the queries, captured 2026-10-07.
// Run: node scripts/check-title-search-rank.cjs
const fs = require('node:fs');
const path = require('node:path');
const FRSearch = require('../assets/js/port/search-tools.js');
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'title-search-rank.json'), 'utf8'));
const foldQ = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/v/g, 'u').replace(/j/g, 'i');   // search.in03.js
const works = Object.fromEntries(fx.rows.map((r) => [r.d, { slug: r.d, title: r.o, title_en: r.t, author: r.a, tradition: r.tradition, n_pages: r.n_pages, kind: r.kind }]));
function find(q) {   // the matching, ranking and ordering steps of search.in03.js renderTitle, on the fixture
  const toks = foldQ(q).split(/\s+/).filter((t) => t.length >= 2);
  const m = fx.rows.filter((e) => toks.every((t) => foldQ(e.t + ' ' + (e.o || '') + ' ' + (e.la || '') + ' ' + e.a + ' ' + (e.al || '')).indexOf(t) >= 0));
  m.forEach((e) => { e._au = FRSearch.titleRank(e, toks, foldQ); });
  const own = m.filter((e) => e._au === 0).length, authorQuery = m.length > 0 && own >= 0.6 * m.length;
  const epithet = m.some((e) => e._au === 3) && m.some((e) => e._au < 3);
  const counts = {}; m.forEach((e) => { counts[e.a] = (counts[e.a] || 0) + 1; });
  const prio = Object.fromEntries(m.map((e) => [e.d, e._au * 1e6 - counts[e.a]]));
  return FRSearch.orderWorks(m.map((e) => e.d), (authorQuery || epithet) ? 'title' : 'shelf', works, prio).map((d) => fx.rows.find((r) => r.d === d));
}
const failures = [];
const expect = (name, ok, detail) => { if (!ok) failures.push(`${name}: ${detail}`); };
const reg = find('regensburg');
expect('regensburg puts the Acts of the Regensburg Colloquy first', reg[0] && reg[0].d === 'bucer-acta-colloquii-ratisbonae',
  'got ' + reg.slice(0, 3).map((r) => r.d).join(', '));
expect('regensburg still lists the works of Othloh of Saint Emmeram in Regensburg', reg.some((r) => /Othloh/.test(r.a)), 'none listed');
const aug = find('augustine');
expect('augustine lists his own works first', aug.slice(0, 10).every((r) => /^Augustine\b/i.test(r.a)),
  'first ten authors: ' + [...new Set(aug.slice(0, 10).map((r) => r.a))].join(' | '));
const ath = find('athanasius');
expect('athanasius lists his own works first', ath.length && /^Athanasius\b/i.test(ath[0].a), 'got ' + (ath[0] && ath[0].a));
const rank = (e, q) => FRSearch.titleRank(e, foldQ(q).split(/\s+/), foldQ);
expect('dubia stay next to the author they are filed under', rank({ a: 'Uncertain author (Augustine?)', t: 'Sermon', o: '' }, 'augustine') === 1, 'not 1');
expect('a word only in an epithet ranks after a title', rank({ a: 'Othloh of Saint Emmeram in Regensburg', t: 'Proverbs' }, 'regensburg') === 3, 'not 3');
expect('the author’s name before the epithet is still his', rank({ a: 'Bernard of Clairvaux', t: 'Sermons' }, 'bernard') === 0, 'not 0');
for (const q of fx.queries) console.log(`  ${q.padEnd(11)} ${find(q).slice(0, 4).map((r) => `${r.t.slice(0, 34)} — ${r.a.slice(0, 26)}`).join(' | ')}`);
if (failures.length) { console.error(`✗ title search rank: ${failures.length} failed\n  ` + failures.join('\n  ')); process.exit(1); }
console.log('✓ title search rank: title matches before epithets; authors’ own works first for their names');
