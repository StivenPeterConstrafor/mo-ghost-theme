const assert = require('node:assert/strict');
const fs = require('node:fs');
const policy = require('../assets/js/lib/faith-catalogue.js');
policy.setAliases(JSON.parse(fs.readFileSync('assets/data/faith-received/english-author-aliases.json')));
for (const [raw, want] of [
 ['Baxter, Richard, 1615-1691','Richard Baxter'],
 ['Baxter, Richard, 1615-1691. Sacrilegious desertion of the holy ministry rebuk','Richard Baxter'],
 ['Manton, Thomas, 1620-1677','Thomas Manton'],
 ['Owen, John, 1616-1683','John Owen'],
 ['Owen, John, 1560?-1622','John Owen (1560?–1622)'],
 ['Owen, John, chaplain to Lord Grey of Ruthin','John Owen (chaplain to Lord Grey of Ruthin)'],
 ['Howe, John, 1630-1705','John Howe'],
 ['Perkins, William, 1558-1602. Treatise tending unto a declaration. Part 7. aut','William Perkins'],
]) assert.equal(policy.authorName(raw), want);
assert.equal(policy.authorKey('baxterrichard16151691'),policy.authorKey('Richard Baxter'));
const input=[{id:'a',author:'Thomas Manton',title:'Sermons'},{id:'b',author:'Manton, Thomas, 1620-1677',title:'Sermons'},{id:'westminster-assembly-minutes-vol-1',author:'Westminster Assembly'},{id:'westminster-assembly-minutes-vol-3a',author:'Westminster Assembly'}];
const result=policy.normalize(input);
assert.equal(result.length,3);assert.equal(result[0].author,result[1].author);
assert.equal(input[1].author,'Manton, Thomas, 1620-1677');
assert.ok(result.some(w=>w.id==='westminster-assembly-minutes-vol-3a'));
assert.equal(policy.publicWork('westminster-assembly-minutes-vol-1'),false);
assert.equal(policy.publicWork('westminster-assembly-minutes-vol-3a'),true);
console.log('Catalogue policy: aliases, distinct people, withdrawn volume and witness preservation passed.');
policy.setWorkIdentity({'eebo-7':{c:'baxter-work'},'second-witness':{c:'first-witness'}},{works:{'second-witness':'edition-group'}});
assert.equal(policy.displayWork({corpus:'eebo',id:'7'}),false);
assert.equal(policy.displayWork({id:'baxter-work'}),true);
assert.equal(policy.displayWork({id:'second-witness'}),true);
assert.equal(policy.normalize([{corpus:'eebo',id:'7'},{corpus:'tfr',id:'baxter-work'}]).length,1);
console.log('Vercel duplicate folding: repeated import removed, explicit edition-group witness retained.');
