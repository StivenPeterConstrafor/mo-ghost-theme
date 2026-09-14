// Mirrors markPhrase()'s index mapping and descending-split, on strings.
const norm=s=>String(s||"").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();

function plan(nodeTexts, quote){
  const PHRASE=norm(quote);
  const chars=[];let prevSpace=true;
  nodeTexts.forEach((t,ni)=>{
    for(let i=0;i<t.length;i++){const c=t[i].toLowerCase();
      if(/\s/.test(c)){if(!prevSpace){chars.push({ni,off:i,ch:" "});prevSpace=true;}continue;}
      if(!/[\p{L}\p{N}]/u.test(c))continue;
      chars.push({ni,off:i,ch:c});prevSpace=false;}});
  const hay=chars.map(c=>c.ch).join("");
  const segs=[];let from=0,found=0,at;
  while(found<40&&(at=hay.indexOf(PHRASE,from))>=0){
    const run=chars.slice(at,at+PHRASE.length);
    for(let i=0,first=true;i<run.length;first=false){
      const ni=run[i].ni;let j=i;
      while(j<run.length&&run[j].ni===ni)j++;
      segs.push({ni,start:run[i].off,end:run[j-1].off+1,cont:!first});i=j;}
    found++;from=at+PHRASE.length;}
  return {segs,found};
}
// apply the same "sort desc, split from the end" rule
function apply(nodeTexts,segs){
  const out=[...nodeTexts];
  const byNode=new Map();
  for(const s of segs){if(!byNode.has(s.ni))byNode.set(s.ni,[]);byNode.get(s.ni).push(s);}
  for(const [ni,list] of byNode){
    list.sort((a,b)=>b.start-a.start);
    let text=out[ni];
    for(const s of list){
      if(s.start>=text.length||s.end>text.length)continue;
      text=text.slice(0,s.start)+"«"+text.slice(s.start,s.end)+"»"+text.slice(s.end);
    }
    out[ni]=text;}
  return out;
}
let pass=0,fail=0;
const t=(name,nodes,quote,expect)=>{
  const {segs}=plan(nodes,quote);const got=apply(nodes,segs).join("|");
  if(got===expect){pass++;console.log("  ok   "+name);}
  else{fail++;console.log("  FAIL "+name+"\n       got      "+got+"\n       expected "+expect);}
};

console.log("phrase highlight:");
t("single node, mid",["the light of nature in them."],"light of nature",
  "the «light of nature» in them.|".slice(0,-1));
t("across two nodes",["in a dark and obfcure ","manner, fo as by this light"],"obfcure manner",
  "in a dark and «obfcure »|«manner», fo as by this light");
t("across three nodes",["a man fees ","many times ","little better"],"fees many times little",
  "a man «fees »|«many times »|«little» better");
t("punctuation and line breaks ignored",["was \"not utterly\n  extinguished\""],"not utterly extinguished",
  "was \"«not utterly\n  extinguished»\"");
t("two occurrences both marked",["the law. and the law again"],"the law",
  "«the law». and «the law» again");
t("quote absent leaves text alone",["nothing of the sort here"],"a phrase that is not present",
  "nothing of the sort here");
t("trailing truncation still matches as prefix",["the whole sentence runs on and on"],"the whole sentence runs",
  "«the whole sentence runs» on and on");
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
