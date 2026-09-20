/* Whole-catalogue parity check against public Vercel files downloaded by the auditor.
 * node scripts/check-catalogue-parity.cjs INDEX DUPFOLD WORKGROUPS
 */
const fs=require('node:fs'),assert=require('node:assert/strict');
const policy=require('../assets/js/lib/faith-catalogue.js');
const [index,dups,groups]=process.argv.slice(2).map(p=>JSON.parse(fs.readFileSync(p)));
policy.setCanonical(index);policy.setWorkIdentity(dups,groups);
const core=policy.libraryIds.filter(c=>c!=='mo').flatMap(c=>policy.catalogue(c,[]));
const expected=index.works.filter(w=>(!dups[w.slug]||groups.works?.[w.slug])&&policy.publicWork(w));
assert.deepEqual(core.map(w=>w.slug).sort(),expected.map(w=>w.slug).sort());
assert.equal(new Set(core.map(w=>w.slug)).size,core.length);
const counts=works=>works.reduce((out,w)=>(out[w.tradition==='Reformed'?'Continental Reformed':w.tradition]=(out[w.tradition==='Reformed'?'Continental Reformed':w.tradition]||0)+1,out),{});
assert.deepEqual(counts(core),counts(expected));
console.table(counts(core));
assert.equal(core.filter(w=>w.author==='Richard Baxter').length,155);
assert.equal(core.filter(w=>w.author==='Thomas Manton').length,18);
assert.ok(core.some(w=>w.slug==='pg-3127'));
assert.equal(policy.additions.size,11);
console.log(`${core.length} canonical works: every slug and shelf count matches Vercel, minus the withdrawn introductory volume. Eleven listed MereO additions are separate.`);
