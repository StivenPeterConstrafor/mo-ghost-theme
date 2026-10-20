/*
 * The Scripture page must never say an author holds a position the library only records him DISCUSSING.
 *
 * WHY. 2026-10-19: the "Points in dispute" fold listed Luther on both sides of "Does with God distinguish two persons?", under "Father and
 * Son are only one person" too, because the dispute data has no stance (a witness is any page that discusses a position, including one
 * that refutes it). 139 of John 1's 230 disputes had an author on two or more sides. The fold now shows counts only.
 *
 * Asserts, over the real chapter files of the live library (skipped when offline; --offline to skip on purpose):
 *   1. the dispute model carries no author or witness field at all;
 *   2. the rendered fold text, built the way the page builds it, names no author of the data;
 *   3. a reading with no reports and no rejects and a heterodox label is Unverified and lists nobody.
 * Run: node scripts/check-scripture-dispute-trust.mjs
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = createRequire(import.meta.url)(path.join(root, 'assets/js/page/faith-port-scripture-notes.js'));
const BASE = process.env.FR_BLOB_BASE || 'https://mo-tfr-library.mo-podcast-feed.workers.dev';
let failed = 0;
const ok = (c, m) => { if (!c) { failed += 1; console.error(`FAIL  ${m}`); } else console.log(`ok    ${m}`); };

// synthetic: the exact shape that caused it
const fake = [{ question: 'Does with God distinguish two persons?', sides: [
  { position: 'Father and Son are only one person', witnesses: [['luther-1', '9', 'Martin Luther', 'reformation']] },
  { position: 'Father and Son are distinct', witnesses: [['luther-1', '12', 'Martin Luther', 'reformation'], ['x', '1', 'Athanasius', 'fathers']] }] }];
const fm = T.disputeModel(fake);
ok(!JSON.stringify(fm).match(/Luther|Athanasius|luther-1|witness/i), 'dispute model carries no author names or witness lists');
ok(fm[0].sides[1].pages === 2 && fm[0].sides[1].authors === 2, 'dispute model keeps page and author counts');
const bad = T.readingModel({ label: 'Created and subordinate Son', reading: 'x', n: [4, 0, 0], holds: [['a', '1', 'Someone', '']], exemplars: [{ author: 'Someone' }] });
ok(bad.unverified && !bad.holds.length && !bad.exemplars.length, 'heterodox reading with no reports/rejects is Unverified with no names');
const good = T.readingModel({ label: 'Word as Essential God', reading: 'x', n: [4, 0, 0], holds: [['a', '1', 'Someone', '']] });
ok(!good.unverified && good.holds.length === 1, 'an orthodox reading keeps its holders');
const refuted = T.readingModel({ label: 'Sabellian reading', reading: 'x', n: [1, 2, 3], holds: [['a', '1', 'Someone', '']] });
ok(!refuted.unverified, 'a heterodox reading that others report and reject is not hidden (stance exists)');

const CH = [['john', 1], ['genesis', 1]];
for (const [b, c] of CH) {
  let d;
  try {
    if (process.argv.includes('--offline')) throw new Error('offline');
    const r = await fetch(`${BASE}/v1/enrich/scripture-readings/${b}/${c}.json`, { headers: { 'User-Agent': 'curl/8.7.1' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(String(r.status));
    d = await r.json();
  } catch (e) { console.log(`skip  ${b} ${c}: ${e.message}`); continue; }
  let nd = 0, leaked = 0, text = '';
  const authors = new Set();
  for (const x of Object.values(d.verses)) {
    for (const dp of x.disputes || []) for (const s of dp.sides || []) for (const w of s.witnesses || []) if (w[2]) authors.add(w[2]);
    const m = T.disputeModel(x.disputes);
    nd += m.length;
    text += JSON.stringify(m);
    for (const dm of m) for (const s of dm.sides) if (Object.keys(s).some((k) => !['position', 'pages', 'authors'].includes(k))) leaked += 1;
  }
  ok(nd > 0, `${b} ${c}: ${nd} disputes modeled`);
  ok(leaked === 0, `${b} ${c}: no dispute side carries anything but position and counts`);
  const named = [...authors].filter((a) => a.length > 4 && text.replace(/"(position|question)":"[^"]*"/g, '').includes(a));
  ok(named.length === 0, `${b} ${c}: no author of the dispute data appears outside a question or position's own words`);
  let hid = 0;
  for (const x of Object.values(d.verses)) for (const r of x.readings || []) { const m = T.readingModel(r); if (m.unverified) { hid += 1; if (m.holds.length) failed += 1; } }
  console.log(`info  ${b} ${c}: ${hid} readings marked Unverified`);
}
// the page must use the model, not raw witnesses
const src = readFileSync(path.join(root, 'assets/js/page/faith-port-scripture-notes.js'), 'utf8');
const body = src.slice(src.indexOf('const disputesBody'), src.indexOf('const rdNote'));
ok(!/witnesses|byAuthor|byEra/.test(body), 'disputesBody never touches witnesses, byAuthor or byEra');
ok(/disputeModel/.test(body), 'disputesBody renders from disputeModel');
process.exit(failed ? 1 : 0);
