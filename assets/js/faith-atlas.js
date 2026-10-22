/* Disputed questions: ported from The Faith Received (tools/prdl_reader_prototype/atlas.html); the data from the library worker, links into the reader on this site. */
window.__FR_BLOB_BASE__=window.__FR_BLOB_BASE__||"https://mo-tfr-library.mo-podcast-feed.workers.dev";
window.__FR_READER_PATH__=window.__FR_READER_PATH__||"/the-faith-received/read/";
window.__FR_LEXICON_PATH__=window.__FR_LEXICON_PATH__||"/the-faith-received/lexicon/";
const BLOB=(window.__FR_BLOB_BASE__||"").replace(/\/$/,"");
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const J=u=>fetch(BLOB+u).then(r=>r.ok?r.json():null).catch(()=>null);
// MereO hosts the same page with its own reader path (window.__FR_READER_PATH__ = '/the-faith-received/read/') and data address
const READER=(window.__FR_READER_PATH__||'/read');
const read=(w,p)=>`${READER}?w=${encodeURIComponent(w)}#b${encodeURIComponent(p)}-0`;
const MAPS='/the-faith-received/maps/';
const ANS=[['affirms','Affirm'],['denies','Deny'],['distinguishes','Distinguish'],['reports only','Report others only'],['unclear','Unclear']];
const SHOWN=6;
let CUR=null,FILTER=null,DATA=null,FOLD=0;
// an open question ("For whom Christ died") carries the positions the schools took, in place of affirm and deny
const answersOf=d=>d.options?[...d.options.map(o=>[o,o]),['reports only','Report others only'],['unclear','Unclear']]:ANS;
// the pages an answer stands on, a line a work: "p. 446", or "pp. 361, 373, 375"; each opens the reader in a new tab, as on the maps
function pagesHTML(list){
  const by=new Map();for(const [w,p,t] of list){if(!by.has(w))by.set(w,{t:t||w,ps:[]});const g=by.get(w);if(!g.ps.includes(p))g.ps.push(p);}
  return [...by.entries()].map(([w,{t,ps}])=>ps.length===1
    ?`<span class="pp"><a class="pg" href="${read(w,ps[0])}" target="_blank" rel="noopener" title="${esc(t)}" aria-label="${esc(t)}, page ${esc(ps[0])}, opens the reader">p. ${esc(ps[0])}</a></span>`
    :`<span class="pp" title="${esc(t)}">pp. ${ps.map(p=>`<a class="pg" href="${read(w,p)}" target="_blank" rel="noopener" aria-label="${esc(t)}, page ${esc(p)}, opens the reader">${esc(p)}</a>`).join(', ')}</span>`).join('');
}
// one row: who (name; dates and tradition) | his answer, and the work it stands in | the pages, at the right
function rowHTML(a,k,fold){
  const list=a.cited&&a.cited.length?a.cited:(a.pages||[]).slice(0,3),works=[...new Set(list.map(x=>x[2]||x[0]))];
  const sub=[a.dates,a.tradition].filter(Boolean).join(' · ');
  return `<li class="hr"${fold&&k>=SHOWN?' hidden':''}><span class="h-who">${esc(a.author)}${sub?`<small>${esc(sub)}</small>`:''}</span><span class="h-line">${esc(a.line)}${works.length?`<small class="h-src">${works.map(esc).join('; ')}</small>`:''}</span><span class="h-pg">${pagesHTML(list)}</span></li>`;
}
function renderQ(){
  const d=DATA;if(!d)return;const A=answersOf(d);FOLD=0;
  const counts=Object.fromEntries(A.map(([k])=>[k,d.answers.filter(a=>a.answer===k).length]));
  const shown=FILTER?d.answers.filter(a=>a.answer===FILTER):d.answers.filter(a=>a.answer!=='unclear'&&a.answer!=='reports only');
  const groups=A.map(([k,l])=>[k,l,shown.filter(a=>a.answer===k)]).filter(([,,v])=>v.length);
  // all answers: each group shows six and folds the rest; one answer chosen in the tally: all of it
  const fold=!FILTER;
  $('#q').innerHTML=`<h2>${esc(d.q)}</h2><p class="meta">${esc(d.locus)} · ${d.answers.length} authors · ${d.n_pages.toLocaleString()} pages · <a href="${MAPS}#${esc(d.id)}">the map of the tradition</a></p>${window.TFRMethod?window.TFRMethod.html("<p>Each answer is read by machine from the claims recorded on the author's pages: open the pages to check it.</p>"):'<p class="note">Each answer is read by machine from the claims recorded on the author\'s pages: open the pages to check it.</p>'}`
    +`<div class="tally" role="group" aria-label="Filter by answer"><button type="button" data-f="" aria-pressed="${!FILTER}">Answers</button>${A.map(([k,l])=>counts[k]?`<button type="button" data-f="${esc(k)}" aria-pressed="${FILTER===k}">${esc(l)} <span class="ct">${counts[k]}</span></button>`:'').join('')}</div>${
    groups.length?groups.map(([k,l,v])=>{const id=`fold${++FOLD}`;
      return `<h3 class="ans">${esc(l)}<span class="ct"><span class="sr">, </span>${v.length}</span></h3><ol class="hl" id="${id}">${v.map((a,i)=>rowHTML(a,i,fold)).join('')}</ol>${fold&&v.length>SHOWN?`<button type="button" class="more" aria-expanded="false" aria-controls="${id}" data-n="${v.length}">Show all ${v.length}</button>`:''}`;}).join('')
      :'<p class="muted">No author in the library states an answer on the pages filed under this question yet.</p>'}`;
}
// the question shown keeps its locus open and in sight in the phone's bounded list
function keepInView(el){
  if(!el)return;const d=el.closest('details');if(d)d.open=true;
  const box=$('#loci');if(box.scrollHeight<=box.clientHeight+4)return;
  const r=el.getBoundingClientRect(),br=box.getBoundingClientRect();if(r.top<br.top||r.bottom>br.bottom)box.scrollTop+=r.top-br.top-box.clientHeight/3;
}
async function showQ(id,write){
  CUR=id;FILTER=null;document.querySelectorAll('[data-q]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.q===id)));
  keepInView(document.querySelector(`#loci [data-q="${CSS.escape(id)}"]`));
  DATA=await J(`/v1/atlas/q/${encodeURIComponent(id)}.json`);
  if(!DATA){$('#q').innerHTML='<p class="muted">This question could not be loaded.</p>';return;}
  renderQ();if(write)history.replaceState(null,'',`#${id}`);
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-q]');if(b){showQ(b.dataset.q,true);return;}
  const f=e.target.closest('[data-f]');if(f){FILTER=f.dataset.f||null;renderQ();return;}
  const more=e.target.closest('button.more');if(more){const open=more.getAttribute('aria-expanded')!=='true',ol=document.getElementById(more.getAttribute('aria-controls'));
    [...ol.children].forEach((li,k)=>{if(k>=SHOWN)li.hidden=!open;});more.setAttribute('aria-expanded',String(open));more.textContent=open?'Show fewer':`Show all ${more.dataset.n}`;
    if(!open&&more.getBoundingClientRect().top<0)ol.scrollIntoView({block:'start'});}
});
J('/v1/atlas/index.json').then(d=>{
  if(!d){$('#loci').innerHTML='<p class="muted">The atlas could not be loaded. Reload the page to try again.</p>';return;}
  const by=new Map();for(const x of d.questions){if(!by.has(x.locus))by.set(x.locus,[]);by.get(x.locus).push(x);}
  const want=location.hash.slice(1)||d.questions[0].id,wl=(d.questions.find(x=>x.id===want)||{}).locus;
  $('#loci').innerHTML=[...by.entries()].map(([l,qs])=>`<details${l===wl?' open':''}><summary>${esc(l)}<small>${qs.length}</small></summary><ul>${qs.map(x=>`<li><button type="button" data-q="${esc(x.id)}" aria-current="false">${esc(x.q)}</button></li>`).join('')}</ul></details>`).join('');
  showQ(want,false);
});
