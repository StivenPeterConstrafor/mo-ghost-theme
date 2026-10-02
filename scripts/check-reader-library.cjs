const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../assets/js/port/reader-core.js','utf8');
const start=source.indexOf('  function readerLibraryGroups(');
const end=source.indexOf('  function renderLibrary(',start);
assert.ok(start>=0&&end>start,'reader library model is available');
const box={};vm.createContext(box);vm.runInContext(source.slice(start,end),box);
const groups=(works,query='',current='')=>box.readerLibraryGroups(works,query,current);

test('the open author stays reachable beyond the old 900-work cut-off',()=>{
  const works=Array.from({length:1500},(_,i)=>({slug:'work-'+i,title:'Work '+i,author:'Author '+String(i).padStart(4,'0')}));
  const view=groups(works,'','work-1499');
  assert.equal(view.count,1500);assert.equal(view.groups.length,1500);
  assert.equal(view.groups[0].author,'Author 1499');assert.equal(view.current.slug,'work-1499');
  assert.equal(view.groups[1].author,'Author 0000');
  assert.equal(groups(works,'Work 1499').groups[0].works[0].slug,'work-1499');
});

test('author, volume and edition can be combined without accent-sensitive lookup',()=>{
  const works=[
    {slug:'suarez-1',author:'Francisco Suárez',title:'Opera omnia',volume:'Vol. 1',edition:'Facsimile'},
    {slug:'suarez-2',author:'Francisco Suárez',title:'Opera omnia',volume:'Vol. 2',edition:{label:'Born digital'}},
    {slug:'pg-73',author:'Cyril of Alexandria',title:'Commentary on John',volume:'PG 73'}
  ];
  assert.equal(groups(works,'suarez 2 digital').groups[0].works[0].slug,'suarez-2');
  assert.equal(groups(works,'PG 73').groups[0].works[0].slug,'pg-73');
  assert.equal(groups(works,'facsimile').count,1);
});

test('all works by one author remain available in the catalogue order',()=>{
  const works=Array.from({length:1001},(_,i)=>({slug:'vol-'+i,author:'Collected author',volume:'Vol. '+(i+1),title:'Collected works'}));
  const view=groups(works,'','vol-980');
  assert.equal(view.groups[0].works.length,1001);
  assert.equal(view.groups[0].works[0].slug,'vol-0');
  assert.equal(view.groups[0].works[1000].slug,'vol-1000');
  assert.equal(view.current.slug,'vol-980');
  assert.equal(works[0].slug,'vol-0','the public catalogue order is not mutated');
});

test('English titles and confession groups stay discoverable, with honest empty results',()=>{
  const works=[{slug:'conf-1',title:'Confessio',title_en:'Augsburg Confession',author:'Philipp Melanchthon',_confession:true}];
  assert.equal(groups(works,'augsburg').groups[0].author,'Confessions');
  assert.equal(groups(works,'missing').count,0);assert.equal(groups(works,'missing').groups.length,0);
});

test('explicit Migne volume searches match volume metadata, never work IDs or incidental numbers',()=>{
  const works=[
    {slug:'pg-1473',author:'Athanasius',title:'A work',volume:'PG 28'},
    {slug:'pg-73',author:'Ignatius',title:'Letters',volume:'PG 5'},
    {slug:'pg-1730',author:'Cyril',title:'Commentary on John',volume:'PG 73'},
    {slug:'pg-1731',author:'Cyril',title:'Another commentary',volume:'PG LXXIII'},
    {slug:'pld-73',author:'Latin author',title:'Work',volume:'PL 73'},
    {slug:'po-23',author:'Eastern author',title:'Work',volume:'PO Tome 23'}
  ];
  const slugs=q=>Array.from(groups(works,q).groups).flatMap(group=>Array.from(group.works,w=>w.slug));
  for(const q of ['PG 73','PG73','PG LXXIII'])assert.deepEqual(slugs(q),['pg-1730','pg-1731']);
  assert.deepEqual(slugs('Cyril PG 73 John'),['pg-1730']);
  assert.deepEqual(slugs('PL 73'),['pld-73']);
  assert.deepEqual(slugs('PO 23'),['po-23']);
  assert.ok(slugs('73').includes('pg-1473'),'a standalone numeric search remains a general catalogue search');
  assert.equal(groups(works,'PG 73').searching,true);
});
