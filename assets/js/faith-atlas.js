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
/* THE PAGE PREVIEW (2026-10-22, owner: "make it easy to preview things in the controversies, indices, etc"). A page reference keeps
   its link to the reader and gains a Preview that opens the page itself under its row: the page window (page-window.js) shows the
   cited page with the passage marked, the page before and after, and English, the source text or both. A Father in Migne or an
   EEBO book, which the page window cannot read, is read by the Scripture page's reader of them (FRCommentaryText, commentary-pane.js,
   loaded on the first such preview with its pane left off), in the same markup. Failing both, the button turns into the reader link;
   never the reader in a frame. One preview a column (cfg.col): opening another there closes it; Escape closes it. The same block on
   the controversies, the maps, the atlas, the shared questions and the set indexes, and in Mere Orthodoxy's ports of them (where
   cfg.text is empty, so a Father in Migne opens the reader). */
const PVW=(cfg=>{
  const FAMILY=/^(?:pld|pg|po|eebo)-\d+$/,NONE=new Set(),OPEN=[];
  let seq=0,text=null;
  const at=(w,p)=>`${/^(?:pld|pg)-/.test(w)?'col.':'p.'} ${p}`;
  const can=w=>!FAMILY.test(w)||!!cfg.text;
  const reader=()=>text||(text=window.FRCommentaryText?Promise.resolve(window.FRCommentaryText):new Promise(res=>{
    window.FR_COMMENTARY_PANE=false;const s=document.createElement('script');s.src=cfg.text;
    s.onload=()=>res(window.FRCommentaryText||null);s.onerror=()=>res(null);document.head.appendChild(s);}));
  async function fill(el,w,p,hl){
    try{
      if(FAMILY.test(w)){const T=cfg.text?await reader():null;return T?await T.fill(el,{slug:w,page:p}):false;}
      return window.FRPageWindow?await window.FRPageWindow.fill(el,{slug:w,page:p,hl}):false;
    }catch(_){return false;}
  }
  const link=(w,p)=>`<a class="pvb" href="${esc(cfg.read(w,p))}" target="_blank" rel="noopener">Open in the reader</a>`;
  /* the button after a page link: w the work, p the page, hl the passage's own words to mark, ps every page the row cites there */
  function btn(w,p,hl,ps){
    if(!w||p==null||p==='')return '';
    if(!can(w)||NONE.has(`${w}|${p}`))return link(w,p);
    return `<button type="button" class="pvb" data-pv="${esc(w)}|${esc(p)}"${hl?` data-pv-hl="${esc(String(hl).slice(0,400))}"`:''}${ps&&ps.length>1?` data-pv-pages="${esc(ps.join(','))}"`:''} aria-expanded="false" aria-label="Preview ${esc(at(w,p))}">Preview</button>`;
  }
  /* an index's page number: the number itself opens its page here; with a modifier key it opens the reader, as a link does */
  function loc(w,p){
    const href=esc(cfg.read(w,p));
    return can(w)&&!NONE.has(`${w}|${p}`)?`<a class="pvl" href="${href}" data-pv="${esc(w)}|${esc(p)}" aria-expanded="false">${esc(p)}</a>`:`<a href="${href}">${esc(p)}</a>`;
  }
  function close(box,focus){
    if(!box)return false;
    const i=OPEN.indexOf(box);if(i>=0)OPEN.splice(i,1);
    const t=box._t,was=box.isConnected;box.remove();
    if(t&&t.isConnected){
      t.removeAttribute('aria-controls');
      if(t.dataset.pv)t.setAttribute('aria-expanded','false');else t.removeAttribute('aria-expanded');
      if(focus)t.focus();
    }
    return was;
  }
  async function show(box,w,p){
    const t=box._t,hl=((t.closest('[data-pv-hl]')||{}).dataset||{}).pvHl||'',body=document.createElement('div');
    body.className='pvw-body';body.innerHTML='<p class="pw-wait" role="status">Loading the page…</p>';
    box.querySelector('.pvw-body').replaceWith(body);
    box.querySelector('.pvw-at').textContent=at(w,p);box.querySelector('.pvw-open').href=cfg.read(w,p);
    box.querySelectorAll('[data-pv-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pvPage===String(p))));
    const ok=await fill(body,w,p,hl);
    if(!body.isConnected)return;
    if(ok){box.scrollIntoView({block:'nearest'});return;}
    NONE.add(`${w}|${p}`);
    if(t.tagName==='BUTTON'&&!box.querySelector('[data-pv-page]')){
      const a=document.createElement('a'),had=box.contains(document.activeElement)||document.activeElement===t;
      a.className='pvb';a.href=cfg.read(w,p);a.target='_blank';a.rel='noopener';a.textContent='Open in the reader';
      close(box,false);t.replaceWith(a);if(had)a.focus();return;
    }
    if(t.tagName==='A')t.removeAttribute('data-pv');
    body.innerHTML=`<p class="pw-wait">This page cannot be shown here. <a href="${esc(cfg.read(w,p))}" target="_blank" rel="noopener">Open ${esc(at(w,p))} in the reader ↗</a></p>`;
  }
  function open(t){
    const [w,p]=t.dataset.pv.split('|'),host=t.closest(cfg.host)||t.closest('div,section,article,li,figure')||t.parentElement,col=t.closest(cfg.col);
    const was=OPEN.some(b=>b.isConnected&&b._t===t);
    for(const b of OPEN.slice())if(!b.isConnected||b.closest(cfg.col)===col)close(b,false);
    if(was)return;
    const ps=(t.dataset.pvPages||'').split(',').filter(Boolean),box=document.createElement('div');
    box.className='pvw';box.id=`pvw-${++seq}`;box._t=t;box.setAttribute('aria-live','off');
    box.innerHTML=`<div class="pvw-head"><span class="pvw-at"></span>${ps.length>1?`<span class="pvw-pp" role="group" aria-label="The pages cited">${ps.map(x=>`<button type="button" data-pv-page="${esc(x)}" aria-pressed="false">${esc(x)}</button>`).join('')}</span>`:''}<a class="pvw-open" target="_blank" rel="noopener">Open in the reader ↗</a><button type="button" class="pvw-x" data-pv-close>Close preview</button></div><div class="pvw-body"></div>`;
    host.appendChild(box);t.setAttribute('aria-expanded','true');t.setAttribute('aria-controls',box.id);OPEN.push(box);
    show(box,w,p);
  }
  document.addEventListener('click',e=>{
    const x=e.target.closest('[data-pv-close]');if(x){close(x.closest('.pvw'),true);return;}
    const n=e.target.closest('[data-pv-page]');if(n){const box=n.closest('.pvw');if(box&&box._t&&box._t.dataset.pv)show(box,box._t.dataset.pv.split('|')[0],n.dataset.pvPage);return;}
    const t=e.target.closest('[data-pv]');
    if(!t||(t.tagName==='A'&&(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)))return;
    e.preventDefault();open(t);
  });
  return {btn,loc,can,escape(){const a=document.activeElement,box=(a&&a.closest&&a.closest('.pvw'))||OPEN.filter(b=>b.isConnected).pop();return close(box,true);}};
})({read,col:'#q',host:'.hr',text:''});
const MAPS='/the-faith-received/maps/';
const ANS=[['affirms','Affirm'],['denies','Deny'],['distinguishes','Distinguish'],['reports only','Report others only'],['unclear','Unclear']];
const SHOWN=6;
let CUR=null,FILTER=null,DATA=null,FOLD=0;
// an open question ("For whom Christ died") carries the positions the schools took, in place of affirm and deny
const answersOf=d=>d.options?[...d.options.map(o=>[o,o]),['reports only','Report others only'],['unclear','Unclear']]:ANS;
// the pages an answer stands on, a line a work: "p. 446", or "pp. 361, 373, 375"; each opens the reader in a new tab, as on the maps,
// and the line's Preview opens its first page here (the others are in the preview's head)
function pagesHTML(list){
  const by=new Map();for(const [w,p,t] of list){if(!by.has(w))by.set(w,{t:t||w,ps:[]});const g=by.get(w);if(!g.ps.includes(p))g.ps.push(p);}
  return [...by.entries()].map(([w,{t,ps}])=>ps.length===1
    ?`<span class="pp"><a class="pg" href="${read(w,ps[0])}" target="_blank" rel="noopener" title="${esc(t)}" aria-label="${esc(t)}, page ${esc(ps[0])}, opens the reader">p. ${esc(ps[0])}</a>${PVW.btn(w,ps[0])}</span>`
    :`<span class="pp" title="${esc(t)}">pp. ${ps.map(p=>`<a class="pg" href="${read(w,p)}" target="_blank" rel="noopener" aria-label="${esc(t)}, page ${esc(p)}, opens the reader">${esc(p)}</a>`).join(', ')}${PVW.btn(w,ps[0],'',ps)}</span>`).join('');
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
addEventListener('keydown',e=>{if(e.key==='Escape'&&PVW.escape())e.preventDefault();});
J('/v1/atlas/index.json').then(d=>{
  if(!d){$('#loci').innerHTML='<p class="muted">The atlas could not be loaded. Reload the page to try again.</p>';return;}
  const by=new Map();for(const x of d.questions){if(!by.has(x.locus))by.set(x.locus,[]);by.get(x.locus).push(x);}
  const want=location.hash.slice(1)||d.questions[0].id,wl=(d.questions.find(x=>x.id===want)||{}).locus;
  $('#loci').innerHTML=[...by.entries()].map(([l,qs])=>`<details${l===wl?' open':''}><summary>${esc(l)}<small>${qs.length}</small></summary><ul>${qs.map(x=>`<li><button type="button" data-q="${esc(x.id)}" aria-current="false">${esc(x.q)}</button></li>`).join('')}</ul></details>`).join('');
  showQ(want,false);
});
