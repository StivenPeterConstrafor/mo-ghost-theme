const {test}=require('node:test');
const assert=require('node:assert/strict');
const box={module:{exports:{}}};require('node:vm').runInNewContext(require('node:fs').readFileSync(__dirname+'/../assets/js/page/scripture-source-groups.js','utf8'),box);const S=box.module.exports;
test('volumes sort numerically within each edition, keeping all witnesses',()=>{
 const works=[['f10','Vol. 10',true],['dIV','Tomus IV',false],['f2','Vol. 2',true],['dII','Tomus II',false]].map(([slug,volume,has_pages])=>({slug,volume,has_pages,title:'Dogmas'}));
 const metadata=S.bibliography(works,{}, {complementary_witnesses:[{author:'A',title:'Dogmas',fac:['f10','f2'],dig:['dIV','dII']}]});
 const rows=works.map(w=>({w:w.slug,t:w.title,a:'A',p:'52:0183A'}));
 assert.deepEqual(Array.from(S.group(rows,{by:'author',metadata})[0].works,w=>w.work),['dII','dIV','f2','f10']);
 assert.deepEqual(Array.from(S.group(rows,{by:'work',metadata}),g=>g.works[0].work),['dII','dIV','f2','f10']);
 assert.equal(metadata('dII').format,'Born-digital text');assert.equal(metadata('f2').format,'Facsimile');
 assert.equal(S.group(rows,{metadata})[0].rows.length,4);
});
test('only explicit edition twins receive the second-witness label',()=>{
 const metadata=S.bibliography([{slug:'a',volume:'Liber I'},{slug:'b',volume:'Liber II, Pars I'},{slug:'c'}],{}, {duplicates:[{kind:'edition',work:'family',keep:['a'],others:['c']}],complementary_witnesses:[{author:'G',title:'Confessio',fac:['a','b'],dig:['c']}]});
 assert.equal(metadata('c').witness,'Second witness');assert.equal(metadata('b').witness,'Related born-digital edition');assert.equal(metadata('b').volume,'Liber II, Pars I');
 assert.equal(metadata('missing').format,'');
});
test('parts use numeric Roman order and the published volume label',()=>{
 const metadata=S.bibliography([{slug:'one',volume:'Liber II, Pars II'},{slug:'two',volume:'Liber II, Pars III'}],{works:{one:{display_volume:'Liber II, Pars I'}}});
 assert.equal(metadata('one').volume,'Liber II, Pars I');
 assert.ok(S.compareWorks({w:'one',t:'Confessio'},{w:'two',t:'Confessio'},metadata)<0);
});
