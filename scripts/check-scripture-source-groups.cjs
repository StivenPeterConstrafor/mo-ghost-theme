const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function load(file){const box={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),box);return box.module.exports;}
const G=load('assets/js/page/scripture-source-groups.js');
test('author/work groups preserve editions and naturally order volumes and exact loci',()=>{
 const rows=[{a:'Martin Luther',w:'wa-53',t:'Werke, 53. Band',p:'52:0200A',cen:16},{a:'Martin Luther',w:'wa-45',t:'Werke, 45. Band',p:'52:0183B',cen:16},{a:'Martin Luther',w:'wa-45',t:'Werke, 45. Band',p:'52:0183A',cen:16},{a:'Abraham Calov',w:'nt-1',t:'Biblia Novi Testamenti',p:20,cen:17}];
 const authors=G.group(rows);assert.equal(authors[0].label,'Abraham Calov');assert.equal(authors[1].works[0].work,'wa-45');
 assert.equal(authors[1].works[0].rows[0].p,'52:0183A');assert.equal(G.group(rows,{by:'work'}).length,3);
 assert.equal(G.group(rows,{order:'century'})[0].label,'Martin Luther');assert.equal(G.group(rows,{order:'count'})[0].label,'Martin Luther');
 assert.equal(authors.reduce((n,a)=>n+a.rows.length,0),rows.length);
});
test('unknown dates sort last and same-title witnesses remain separate',()=>{
 const rows=[{a:'Unknown',w:'edition-1',t:'Theology',p:1},{a:'Known',w:'edition-2',t:'Theology',p:1,cen:4}];
 assert.equal(G.group(rows,{order:'century'})[0].label,'Known');assert.equal(G.group(rows,{by:'work'}).length,2);
});
const C=load('assets/js/lib/faith-catalogue.js');
test('Gerhard cards retain volume and facsimile data; only recorded twins are second witnesses',()=>{
 const one='gerhard-confessio-catholica-liber-1',two='gerhard-confessio-catholica-liber-2-pars-1',digital=one+'-as';
 C.setCanonical({works:[{slug:one,title:'Confessio Catholica',author:'Johann Gerhard',volume:'Liber I: Generalis',has_pages:true},{slug:two,title:'Confessio Catholica',author:'Johann Gerhard',volume:'Liber II, Pars I',has_pages:true},{slug:digital,title:'Confessio Catholica',author:'Johann Gerhard',has_pages:false}]});
 C.setRelations({duplicates:[{keep:[one],others:[digital],kind:'edition'}],complementary_witnesses:[{fac:[one,two],dig:[digital]}]});
 const works=C.catalogue('tfr',[]);
 assert.equal(C.metadata(works[0]).volume,'Liber I: Generalis');assert.equal(C.metadata(works[0]).format,'Facsimile');
 assert.equal(C.metadata(one).witness,'Second witness held');assert.equal(C.metadata(digital).witness,'Second witness');
 assert.equal(C.metadata(digital).format,'Born-digital text');assert.equal(C.metadata(two).witnessExact,false);assert.equal(C.metadata(two).witness,'Related born-digital edition');
 assert.equal(C.metadata({slug:'unknown'}).format,'');
 assert.match(C.metadataHTML(one),/Liber I: Generalis/);assert.match(C.metadataHTML(two),/Liber II, Pars I/);
});
test('Petau retains five digital parts and seven facsimile volumes while repeat ingestions still fold',()=>{
 const fac=Array.from({length:7},(_,i)=>`petavius-de-theologicis-dogmatibus-vol-${i+1}`);
 const dig=['1','2','3','4','4-pars-altera'].map(n=>`petavius-dogmata-tomus-${n}`);
 C.setCanonical({works:[...fac.map((slug,i)=>({slug,title:'On Theological Dogmas',author:'Denis Pétau',volume:`Vol. ${i+1}`,has_pages:true,n_pages:724})),...dig.map((slug,i)=>({slug,title:'On Theological Dogmas',author:'Denis Pétau',volume:`Tomus ${i+1}`,has_pages:false,n_pages:946})),{slug:'repeat-ingestion',title:'On Theological Dogmas',author:'Denis Pétau'}]});
 C.setWorkIdentity(Object.fromEntries([...fac.map(slug=>[slug,dig[0]]),['repeat-ingestion',dig[0]]]),{});
 C.setRelations({duplicates:[{work:'petavius.dogmata',keep:dig,others:fac,kind:'edition'}],complementary_witnesses:[{author:'Denis Pétau',title:'On Theological Dogmas',fac,dig}]});
 const works=C.catalogue('tfr',[]);assert.equal(works.length,12);
 assert.equal(works.filter(w=>C.metadata(w).format==='Facsimile').length,7);
 assert.equal(works.filter(w=>C.metadata(w).format==='Born-digital text').length,5);
 assert.equal(new Set(works.map(w=>C.metadata(w).family)).size,1);
 assert.equal(C.metadata(fac[0]).witnessExact,false);assert.match(C.metadata(dig[0]).extentLabel,/sections/);assert.match(C.metadata(fac[0]).extentLabel,/pages/);
});
