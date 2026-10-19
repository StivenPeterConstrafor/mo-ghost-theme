/* Corrections the reader makes to a Patrologia Graeca canon before it reads it.
 *
 * The canon is cut work by work from a volume whose pages do not respect the cuts, and its three lanes (Greek,
 * Migne's Latin, our English) are paginated by different hands. Two defects follow, and both were reported by readers
 * (tickets 2026-10-19, pg-119 and pg-3834). The fix lives here, in the reader, because the text is right and its
 * seams are wrong, and the reader is the one place every lane meets.
 *
 * 1. A TITLE PAGE FILED UNDER THE WRONG WORK (pg-119 / pg-120). The volume spine gives the Exhortation columns 49-248
 *    and the Pedagogue 249-684, but col. 247 is the Pedagogue's title page and the contents of its first book: the scan
 *    sits in the folder 00247_pedagogus, the Pedagogue's own. The Exhortation therefore ended with another work's title
 *    (and its Contents rail gained a stray subtitle), and the Pedagogue opened at its first chapter. The loser hands the
 *    opening over; the owner takes it. Both halves are decided from the scan folders, and the donor is only trusted
 *    once the owner's own scans agree (a work can end in a differently named folder without handing anything over).
 *
 * 2. A LATIN VERSION PRINTED ON ITS OWN PLATES (pg-3834). Where the Latin version is not the facing column of the
 *    Greek page, its page break falls where its plate happened to end, not where the Greek and the English do: the
 *    English column of the opening ended 'On these two mountains the immaculate' and its Latin, 500 letters short,
 *    left the same sentences at the head of the next page, so the last paragraphs of the English faced no Latin. The
 *    one paragraph that runs across the seam in both lanes is re-cut in the Latin at the Greek's proportion, snapped to a
 *    sentence end. It moves text between two halves of one paragraph and changes no word.
 *
 * The decisions are pure functions of plain data, so scripts/check-pg-canon-heal.mjs can run them in Node; the DOM
 * helpers only move nodes.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FRPgCanonHeal=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const ALT=['translation','secondary','diplomatic','witness','edition'];
const SCAN=/\/pg\/scan\/migne\/(\d{3})\/(\d{5})_([a-z0-9-]+)\//;

// ── pure decisions ──────────────────────────────────────────────────────────────────────────────────────────────
// The scan folder a plate sits in: '.../008/00247_pedagogus/mg008_0247.jpg' -> {num:247,slug:'pedagogus'}. The number is the
// column the folder's work opens on; a nested folder (00649_liber-primus under 00247_pedagogus) is a division of that work.
function facsDir(facs){const m=SCAN.exec(String(facs||''));return m?{vol:m[1],num:+m[2],slug:m[3]}:null;}
const sameDir=(a,b)=>!!a&&!!b&&a.num===b.num&&a.slug===b.slug;
const plateName=f=>String(f||'').split('?')[0].split('/').pop();

// OWNER: the work's own scan folder opens before its first page. pbs = the Greek lane's pages, in order, as {n,facs};
// prev = the previous work in the volume spine ({id}). Only a lead: the owner takes nothing until the donor's own trailing
// pages (trailingForeign) and this work's pages (confirmDonor) agree, and then takes exactly what the donor gives up.
function frontMatterClaim(pbs,prev){
  const first=pbs&&pbs[0],d=first&&facsDir(first.facs);
  if(!d||!prev)return null;
  if(!(Number(first.n)-d.num>=2))return null;                        // the folder opens a page or more before the first page
  if(Array.isArray(prev.c)&&!(prev.c[1]>=d.num))return null;       // and the work before reaches that far
  return {donor:String(prev.id),dir:d};
}
// DONOR: the work's last page(s) sit in another work's folder, opening exactly there, shortly before the next work begins.
// Only a candidate: confirmDonor must agree from the next work's side before anything is moved.
function trailingForeign(pbs,next){
  if(!pbs||pbs.length<2||!next||!Array.isArray(next.c))return null;
  const own=facsDir(pbs[0].facs);if(!own)return null;
  const run=[];
  for(let i=pbs.length-1;i>0;i--){const d=facsDir(pbs[i].facs);if(d&&!sameDir(d,own))run.unshift({n:Number(pbs[i].n),dir:d});else break;}
  if(!run.length||run.length>2)return null;
  const head=run[0];
  if(!(head.dir.num===head.n||head.dir.num===head.n-1))return null;   // a division that opens on this very page
  const gap=Number(next.c[0])-head.n;
  if(!(gap>=1&&gap<=4))return null;                                  // and the next work begins within a few columns
  return {from:head.n,count:run.length,dir:head.dir,nextId:String(next.id)};
}
// Whether a canon could need either decision at all, from its own pages: lets the reader skip the volume spine for every other work.
function mayNeedSpine(pbs){
  if(!pbs||!pbs.length)return false;
  const last=Number(pbs[pbs.length-1].n);
  return !!(frontMatterClaim(pbs,{id:'',c:[-1e9,1e9]})||trailingForeign(pbs,{id:'',c:[last+1,last+1]})||trailingForeign(pbs,{id:'',c:[last+4,last+4]}));
}
// The next work's own pages must open in the same folder, and before its first page.
function confirmDonor(cand,nextPbs){
  if(!cand||!nextPbs||!nextPbs.length)return false;
  const d=facsDir(nextPbs[0].facs);
  return sameDir(d,cand.dir)&&Number(nextPbs[0].n)-d.num>=2;
}
// The last column handed over: the one before the owner's own first page (a page both works print stays in both).
const handOverTo=nextPbs=>Number(nextPbs[0].n)-1;

// Where in `text` a sentence ends nearest to `target`, within `win` characters; null when none does.
function sentenceEnd(text,target,win){
  const rx=/[.?!;:·;]["'”’»)\]]*\s+/g;let m,best=null;
  while((m=rx.exec(text))){const at=m.index+m[0].length;if(Math.abs(at-target)<=win&&(best==null||Math.abs(at-target)<Math.abs(best-target)))best=at;}
  return best;
}
// One paragraph runs across the page seam in the Greek and in the Latin: g=[before,after] letters, l=[before,after]. Returns
// {delta,at}: how many Latin characters cross the seam (+ from the next page up, - from this page down) and where in the
// moving half the cut falls, or null when the two already agree or are too far apart to be one text cut two ways.
function seamShift(g,l,textBefore,textAfter){
  const gt=g[0]+g[1],lt=l[0]+l[1];if(!gt||!lt)return null;
  const fg=g[0]/gt,fl=l[0]/lt,gap=Math.abs(fg-fl);
  if(gap<=0.03||gap>0.25)return null;
  const delta=Math.round(fg*lt)-l[0];if(Math.abs(delta)<300)return null;
  if(delta>0){const at=sentenceEnd(textAfter,delta,300);return at==null?null:{delta:at,at,dir:1};}
  const keep=textBefore.length+delta,cut=sentenceEnd(textBefore,keep,300);
  return cut==null?null:{delta:textBefore.length-cut,at:cut,dir:-1};
}

// ── DOM ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function laneOf(el){
  for(let n=el.parentNode;n&&n.nodeType===1;n=n.parentNode){
    if(n.localName!=='div')continue;const t=n.getAttribute('type')||'';
    if(t==='translation')return 'en';if(t==='secondary')return 'la';if(ALT.includes(t))return null;
  }
  return 'grc';
}
function lanePbs(doc,lane){return [...doc.querySelectorAll('pb')].filter(pb=>laneOf(pb)===lane&&/^\d+$/.test(pb.getAttribute('n')||'')).map(el=>({el,n:Number(el.getAttribute('n')),facs:el.getAttribute('facs')||''}));}
function primaryPbs(doc){return lanePbs(doc,'grc').map(({n,facs})=>({n,facs}));}
const laneRoot=(doc,lane)=>lane==='la'?doc.querySelector('div[type="secondary"]'):lane==='en'?doc.querySelector('div[type="translation"]'):(doc.querySelector('div[type="division"]')||doc.querySelector('body > div'));
const numAttr=el=>{const v=el.getAttribute&&el.getAttribute('n');return /^\d+$/.test(v||'')?Number(v):null;};

// The nodes of every lane from column `from` to the end of the lane, taken OUT of doc. Nothing is taken from a lane whose
// pages are not a flat run in one container, or whose tail holds anything keyed to an earlier column.
function takeFront(doc,from,maxPbs,to){
  const out={grc:[],la:[],en:[]};
  const upto=to==null?Infinity:to;
  // never more pages than the hand-over names: a front that would take a long tail is not a front
  if(maxPbs&&lanePbs(doc,'grc').filter(p=>p.n>=from&&p.n<=upto).length>maxPbs)return out;
  const take=(nodes)=>{nodes.forEach(n=>n.parentNode&&n.parentNode.removeChild(n));return nodes;};
  // the run from this page break to the break of the first page past `to` (or the end of the lane); null if not a flat run in the lane
  const run=(pbs,rootEl,start)=>{if(!start||start.parentNode!==rootEl)return null;const stop=pbs.find(p=>p.n>upto&&p.el.parentNode===rootEl&&start.compareDocumentPosition(p.el)&4);
    const a=[];for(let n=start;n&&n!==(stop&&stop.el);n=n.nextSibling)a.push(n);return a;};
  const gp=lanePbs(doc,'grc'),lp=lanePbs(doc,'la');
  const g=gp.find(p=>p.n>=from&&p.n<=upto),l=lp.find(p=>p.n>=from&&p.n<=upto);
  if(g){const nodes=run(gp,laneRoot(doc,'grc'),g.el);if(nodes)out.grc=take(nodes);}
  if(l){const nodes=run(lp,laneRoot(doc,'la'),l.el);if(nodes)out.la=take(nodes);}
  // the translation divs (one per section in some works): the columns keyed from `from` to `to`
  doc.querySelectorAll('div[type="translation"]').forEach(div=>{
    const kids=[...div.childNodes];
    const i=kids.findIndex(k=>{const n=numAttr(k);return n!=null&&n>=from;});if(i<0)return;
    let j=kids.length;for(let q=i;q<kids.length;q++){const n=numAttr(kids[q]);if(n!=null&&n>upto){j=q;break;}}
    const seg=kids.slice(i,j);if(kids.slice(i).some(k=>{const n=numAttr(k);return n!=null&&n<from;}))return;
    out.en.push(...take(seg));
  });
  return out;
}
// Put a taken front at the head of this document's lanes (a lane the document does not have takes nothing).
function giveFront(doc,front){
  const put=(lane,nodes)=>{let r=laneRoot(doc,lane);
    if(!r&&lane==='en'&&nodes.length){const body=doc.querySelector('body');if(body){r=doc.createElementNS(doc.documentElement.namespaceURI,'div');r.setAttribute('type','translation');r.setAttribute('xml:lang','en');body.appendChild(r);}}
    if(!r||!nodes.length)return;const ref=r.firstChild;nodes.forEach(n=>r.insertBefore(doc.importNode(n,true),ref));};
  put('grc',front.grc);put('la',front.la);put('en',front.en.length?front.en:[]);
  return !!(front.grc.length||front.la.length||front.en.length);
}

// Rebalance the Latin across each page seam where it sits on plates of its own. Returns how many seams it moved.
function rebalanceSeams(doc){
  const seqOf=lane=>{const root=lane==='grc'?laneRoot(doc,'grc'):laneRoot(doc,'la');if(!root)return[];
    return [...root.querySelectorAll('pb, p')].filter(e=>laneOf(e)===lane);};
  const seams=lane=>{const out=[];let lastP=null,pend=null;
    for(const e of seqOf(lane)){
      if(e.localName==='pb'){pend=(lastP&&lastP.p.getAttribute('part')==='I')?{pI:lastP.p,n1:lastP.page,n2:e.getAttribute('n')}:null;page=e.getAttribute('n');}
      else{ if(pend&&e.getAttribute('part')==='F'){out.push({pI:pend.pI,pF:e,n1:pend.n1,n2:pend.n2});}pend=null;lastP={p:e,page};}
    }return out;};
  let page=null,moved=0;
  const G=seams('grc'),L=seams('la');
  const plates=lane=>new Map(lanePbs(doc,lane).map(p=>[String(p.n),plateName(p.facs)]));
  const gPlate=plates('grc'),lPlate=plates('la');
  const len=el=>(el.textContent||'').replace(/\s+/g,' ').trim().length;
  for(const ls of L){
    const gs=G.find(s=>s.n1===ls.n1&&s.n2===ls.n2);if(!gs)continue;
    // only a Latin on plates of its own: on a facing page the two breaks are one printed break
    if(!(lPlate.get(ls.n1)&&gPlate.get(ls.n1)&&lPlate.get(ls.n1)!==gPlate.get(ls.n1)))continue;
    const tb=ls.pI.textContent.replace(/\s+/g,' ').trim(),ta=ls.pF.textContent.replace(/\s+/g,' ').trim();
    const sh=seamShift([len(gs.pI),len(gs.pF)],[tb.length,ta.length],tb,ta);if(!sh)continue;
    const point=(el,off)=>{const w=doc.createTreeWalker(el,4);let n,acc=0;while((n=w.nextNode())){const l=n.nodeValue.length;if(off<=acc+l)return {node:n,offset:off-acc};acc+=l;}return null;};
    // offsets in the collapsed text are not offsets in the node text; walk the node text to the same visible position
    const raw=(el,vis)=>{const s=el.textContent;let seen=0,i=0,sp=true;for(;i<s.length&&seen<vis;i++){const c=/\s/.test(s[i]);if(c){if(!sp){seen++;sp=true;}}else{seen++;sp=false;}}return i;};
    const joinGap=(left)=>/-\s*$/.test(left.textContent)?null:doc.createTextNode(' ');
    try{
      const r=doc.createRange();
      if(sh.dir>0){const p=point(ls.pF,raw(ls.pF,sh.at));if(!p)continue;r.setStart(ls.pF,0);r.setEnd(p.node,p.offset);
        const frag=r.extractContents();const g0=joinGap(ls.pI);
        if(g0===null){const t=ls.pI.lastChild;if(t&&t.nodeType===3)t.nodeValue=t.nodeValue.replace(/-\s*$/,'');}else ls.pI.appendChild(g0);
        ls.pI.appendChild(frag);}
      else{const p=point(ls.pI,raw(ls.pI,sh.at));if(!p)continue;r.setStart(p.node,p.offset);r.setEnd(ls.pI,ls.pI.childNodes.length);
        const frag=r.extractContents(),lt=frag.lastChild,hy=lt&&lt.nodeType===3&&/-\s*$/.test(lt.nodeValue);
        if(hy)lt.nodeValue=lt.nodeValue.replace(/-\s*$/,'');else ls.pF.insertBefore(doc.createTextNode(' '),ls.pF.firstChild);ls.pF.insertBefore(frag,ls.pF.firstChild);}
      moved++;
    }catch(e){/* a seam that cannot be moved cleanly stays as printed */}
  }
  return moved;
}

return {facsDir,frontMatterClaim,trailingForeign,mayNeedSpine,confirmDonor,handOverTo,sentenceEnd,seamShift,primaryPbs,takeFront,giveFront,rebalanceSeams};
});
