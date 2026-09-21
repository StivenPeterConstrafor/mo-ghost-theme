const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const paths=[__dirname+'/../assets/js/port/ask-workspace.js',process.env.FR_GHOST_ASK].filter(Boolean);
for(const path of paths){
 const window={};window.parent=window;
 const context=vm.createContext({window,FRChatStore:{},URL,matchMedia:()=>({matches:false,addEventListener(){}}),location:{origin:'https://thefaithreceived.vercel.app'},document:{readyState:'loading',addEventListener(){}}});
 vm.runInContext(fs.readFileSync(path,'utf8'),context);const api=window.FRAsk;
 test(path+': source groups preserve every passage and separate edition witnesses',()=>{
  const sources=[{slug:'edition-a',page:'52:0183A',title:'Collected Works'},{slug:'edition-a',page:184,title:'Collected Works'},{slug:'edition-b',page:183,title:'Collected Works'},{title:'Unlocated'},{title:'Unlocated'}];
  const groups=api.sourceGroups(sources);
  assert.equal(groups.length,4);assert.equal(groups.reduce((n,g)=>n+g.passages.length,0),5);
  assert.equal(groups[0].passages[0].page,'52:0183A');
  const html=api.sourceCollectionHTML(sources);
  assert.match(html,/5 passages · 4 works/);assert.match(html,/#b52%3A0183A-0/);
  assert.equal((html.match(/class="fra-source-row"/g)||[]).length,5);
 });
 test(path+': source previews escape untrusted labels and reject executable destinations',()=>{
  const html=api.sourceCollectionHTML([{title:'<img onerror=alert(1)>',link:'javascript:alert(1)',quote:'<script>x</script>'}]);
  assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('javascript:'));
  assert.match(html,/Source location unavailable/);
 });
 test(path+': displayed status follows actual research and delivery state',()=>{
  assert.equal(api.researchState(null).kind,'idle');
  assert.equal(api.researchState({status:'running',stage:'Reading source pages'}).label,'Reading source pages');
  assert.equal(api.researchState({status:'error'}).kind,'attention');
  assert.equal(api.researchState({status:'paused'}).kind,'paused');
  assert.equal(api.researchState({status:'complete',mode:'deep'}).label,'Research complete');
  assert.equal(api.researchState({status:'complete',steps:[{label:'Preparing the response'}]}).label,'Check answer delivery');
 });
 test(path+': command matching supports accents, multiple words and empty results',()=>{
  const entries=[{id:'1',label:'Suárez on grace',detail:'Conversation'},{id:'2',label:'Search within',detail:'Choose shelves, authors or works'}];
  assert.equal(api.commandMatches('suarez grace',entries)[0].id,'1');
  assert.equal(api.commandMatches('authors',entries)[0].id,'2');
  assert.equal(api.commandMatches('absent',entries).length,0);
  assert.equal(api.commandMatches('',Array.from({length:30},(_,i)=>({label:String(i),detail:''}))).length,12);
 });
}
