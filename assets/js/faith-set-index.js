/* Index of the set: ported from The Faith Received (tools/prdl_reader_prototype/setindex.html); the data from the library worker, links into the reader on this site. */
window.__FR_BLOB_BASE__=window.__FR_BLOB_BASE__||"https://mo-tfr-library.mo-podcast-feed.workers.dev";
window.__FR_READER_PATH__=window.__FR_READER_PATH__||"/the-faith-received/read/";
window.__FR_LEXICON_PATH__=window.__FR_LEXICON_PATH__||"/the-faith-received/lexicon/";
const BLOB=(window.__FR_BLOB_BASE__||"").replace(/\/$/,"");
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fold=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9Ͱ-Ͽἀ-῿ ]+/g,' ').replace(/\s+/g,' ').trim().replace(/^(the|a|an) /,'');
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
})({read,col:'#entry',host:'.rows li',text:''});
const SECS=[['subjects','Subjects'],['persons','Persons'],['scripture','Scripture'],['terms','Terms'],['questions','Questions']];
const BOOK=b=>b.replace(/-/g,' ').replace(/\b([a-z])/g,c=>c.toUpperCase()).replace(/^(\d) /,'$1 ').replace('Revelation Of John','Revelation').replace('Song Of Songs','Song of Songs');
const SET=new URLSearchParams(location.search).get('set');
const base=`/v1/enrich/sets/${encodeURIComponent(SET)}/`;
let M=null,SEC='subjects',LETTER=null,ROWS=[],CUR=null,SHOWN=300,BOOKSEL=null;
// Migne's "volumes" are its works, one treatise each (meta.unit 'work'); a set of printed volumes counts volumes
const unit=n=>{const u=(M&&M.unit)||'volume';return n===1?u:`${u}s`;};
const cache=new Map();const load=f=>{if(!cache.has(f))cache.set(f,J(base+f));return cache.get(f);};
function pagesHTML(slug,ps){return ps.map(p=>PVW.loc(slug,p)).join(', ');}
/* the line under an entry's name says what a page number does, where one opens its page here */
const opensHere=slugs=>slugs.some(s=>PVW.can(s))?' A page number opens its page here.':'';
async function listFor(letter){
  if(M.lists[SEC]==='one')return (await load(`L/${SEC}.json`))||[];
  return (await load(`L/${SEC}-${letter}.json`))||[];
}
function renderList(rows,cur){$('#list').innerHTML=rows.length?rows.slice(0,1500).map(r=>`<li><button type="button" data-k="${esc(r[0])}" data-f="${esc(r[2])}" aria-current="${r[0]===cur}">${esc(r[0])}<small>${r[1].toLocaleString()} ${unit(r[1])}</small></button></li>`).join(''):'<li class="muted" style="padding:.6rem 0">Nothing here.</li>';
  const on=$('#list [aria-current="true"]');if(on)on.scrollIntoView({block:'nearest'});}
async function showLetter(l){
  LETTER=l;document.querySelectorAll('#letters button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.l===l)));
  const rows=await listFor(l);ROWS=M.lists[SEC]==='one'?rows.filter(r=>{const f=fold(r[0])[0]||'_';return l==='_'?!/[a-z]/.test(f):f===l;}):rows;
  renderList(ROWS,CUR);
}
function volRows(ents){
  const by=new Map();for(const e of ents){if(!by.has(e[0]))by.set(e[0],[]);by.get(e[0]).push(e);}
  return [...by.entries()].sort((a,b)=>a[0]-b[0]);
}
async function showEntry(k,f,write){
  CUR=k;SHOWN=300;document.querySelectorAll('#list button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.k===k)));
  const on=$('#list [aria-current="true"]');if(on)on.scrollIntoView({block:'nearest'});
  const E=await load(`E/${f}.json`);const ents=(E&&E[k])||[];
  const groups=volRows(ents);
  const draw=()=>{
    const row=([vi,es])=>{const [slug,label]=M.vols[vi]||[];if(!slug)return '';
      let inner='';
      if(SEC==='subjects')inner=es.map(e=>`${e[1]?`${esc(e[1])}: `:''}${pagesHTML(slug,e[2])}`).join(' · ');
      else if(SEC==='persons')inner=es.map(e=>`${e[2]?`${esc(e[2])}: `:''}${pagesHTML(slug,e[1])}`).join(' · ');
      else inner=es.map(e=>pagesHTML(slug,e[1])).join(' · ');
      return `<li><div class="vol">${esc(label)}</div><p class="subs">${inner}</p></li>`;};
    $('#entry').dataset.pvHl=k;
    $('#entry').innerHTML=`<h2>${esc(k)}</h2><p class="count">In ${groups.length.toLocaleString()} ${unit(groups.length)} of the set.${opensHere(groups.map(([vi])=>(M.vols[vi]||[])[0]||''))}</p><ul class="rows">${groups.slice(0,SHOWN).map(row).join('')}</ul>${
      groups.length>SHOWN?`<button type="button" class="more" id="more">Show ${Math.min(300,groups.length-SHOWN)} more ${unit(2)}</button>`:''}`;
  };
  draw();
  $('#entry').onclick=e=>{if(e.target.id==='more'){SHOWN+=300;draw();}};
  if(write)history.replaceState(null,'',`?set=${encodeURIComponent(SET)}#${SEC}/${encodeURIComponent(k)}`);
}
async function showScripture(book,ch,write){
  const S=await load('L/scripture.json')||{};const books=Object.keys(S);
  BOOKSEL=book&&S[book]?book:books[0];
  $('#letters').innerHTML=books.map(b=>`<button type="button" data-b="${esc(b)}" aria-pressed="${b===BOOKSEL}">${esc(BOOK(b))}</button>`).join('');
  const chs=Object.keys(S[BOOKSEL]||{}).map(Number).sort((a,b)=>a-b);
  $('#list').innerHTML=chs.map(c=>`<li><button type="button" data-c="${c}" aria-current="${String(c)===String(ch)}">${esc(BOOK(BOOKSEL))} ${c}</button></li>`).join('');
  const c=ch&&S[BOOKSEL][ch]?String(ch):String(chs[0]);
  document.querySelectorAll('#list button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.c===c)));
  const E=await load(`E/${S[BOOKSEL][c]}.json`);const vs=(E&&E[`${BOOKSEL}.${c}`])||[];
  delete $('#entry').dataset.pvHl;
  $('#entry').innerHTML=`<h2>${esc(BOOK(BOOKSEL))} ${esc(c)}</h2><p class="count">${vs.length} ${vs.length===1?'verse':'verses'} cited in the set.${opensHere(vs.flatMap(([,es])=>es.map(e=>(M.vols[e[0]]||[])[0]||'')))}</p>${
    vs.map(([v,es])=>`<h3 class="verse">${v?`Verse ${esc(v)}`:'The chapter'}</h3><ul class="rows">${volRows(es).slice(0,200).map(([vi,xs])=>{const [slug,label]=M.vols[vi]||[];return slug?`<li><div class="vol">${esc(label)}</div><p class="subs">${xs.map(x=>pagesHTML(slug,x[1])).join(' · ')}</p></li>`:'';}).join('')}</ul>`).join('')}`;
  if(write)history.replaceState(null,'',`?set=${encodeURIComponent(SET)}#scripture/${BOOKSEL}/${c}`);
}
async function showSec(sec,want,write){
  SEC=sec;CUR=null;document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.s===sec)));
  $('#entry').innerHTML='';$('#find').hidden=sec==='scripture';
  if(sec==='scripture'){const [b,c]=(want||'').split('/');await showScripture(b,c,write);return;}
  $('#q').placeholder={subjects:'Find a subject: grace, justification, the papacy',persons:'Find a person: Augustine, Jerome',terms:'Find a term in English, Latin or Greek',questions:'Find a question: whether, why, how'}[sec];
  const letters='abcdefghijklmnopqrstuvwxyz_'.split('');
  $('#letters').innerHTML=letters.map(l=>`<button type="button" data-l="${l}" aria-pressed="false">${l==='_'?'#':l.toUpperCase()}</button>`).join('');
  const l=want?(fold(want)[0]||'_'):'a';await showLetter(/[a-z]/.test(l)?l:'_');
  const hit=want&&ROWS.find(r=>r[0]===want);
  if(hit)await showEntry(hit[0],hit[2],false);else if(ROWS.length)await showEntry(ROWS[0][0],ROWS[0][2],write);
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-s]');if(t){showSec(t.dataset.s,null,true);return;}
  const l=e.target.closest('[data-l]');if(l){showLetter(l.dataset.l);return;}
  const k=e.target.closest('[data-k]');if(k){showEntry(k.dataset.k,k.dataset.f,true);return;}
  const b=e.target.closest('[data-b]');if(b){showScripture(b.dataset.b,null,true);return;}
  const c=e.target.closest('[data-c]');if(c){showScripture(BOOKSEL,c.dataset.c,true);}
});
$('#find').addEventListener('submit',async e=>{e.preventDefault();const f=fold($('#q').value);if(!f)return;
  const l=/[a-z]/.test(f[0])?f[0]:'_';await showLetter(l);
  const rows=ROWS.filter(r=>fold(r[0]).startsWith(f)),near=rows.length?rows:ROWS.filter(r=>fold(r[0]).includes(f));
  renderList(near,CUR);if(near.length)await showEntry(near[0][0],near[0][2],true);else $('#entry').innerHTML='<p class="muted">No entry matches. Try fewer letters.</p>';});
addEventListener('keydown',e=>{if(e.key==='Escape'&&PVW.escape())e.preventDefault();});
/* THE DIRECTORY'S FIND AND FILTERS (2026-10-22, owner: "search and filter to find a set to search"). The sets in the index's own order
   with its counts, narrowed as you type (title, author or id), by kind (the Patrologiae; the shelves; the editions and sets), and by
   tradition where the data gives one: a Patrologia's and a shelf's own; else the shelf of the room the library gives the set's author
   (v1/bible/<shelf>/rooms, read once the directory shows; a name in two rooms takes the first of ROOM_ORDER, the later shelves before
   the Fathers', whose rooms also hold their editors). A set whose author has no room (the councils, Migne's courses, the Critici
   Sacri) has none. The nine names are the library's closed list. The choice is kept for the tab, so Back returns to the same list. */
const DKINDS=[['all','All sets'],['pat','Patrologiae'],['shelf','Shelves'],['set','Editions and sets']];
const DTRADS=[['gf','Greek Fathers'],['pl','Latin Fathers'],['po','Eastern Fathers'],['md','Medieval'],['lu','Lutheran'],['rf','Continental Reformed'],['rc','Roman Catholic'],['ed','English Divines'],['hl','Humanism and Law']];
const SHELF_OF={'latin-fathers':'pl','greek-fathers':'gf','eastern-fathers':'po','english-divines':'ed','medieval':'md','roman-catholic':'rc','lutheran':'lu','reformed':'rf','continental-reformed':'rf','humanism-and-law':'hl'};
const ROOM_ORDER=['md','rc','lu','rf','ed','hl','gf','pl'];
const nameKey=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
let DIR=[],DK='all',DT='';
function dirKeep(){try{sessionStorage.setItem('fr_setdir',JSON.stringify({q:$('#dfind').value,k:DK,t:DT}));}catch(_){}}
function dirKept(){try{return JSON.parse(sessionStorage.getItem('fr_setdir')||'null');}catch(_){return null;}}
function dirRender(){
  const ws=fold($('#dfind').value).split(' ').filter(Boolean),names=new Map(DTRADS);
  const pass=(r,skip)=>(skip==='k'||DK==='all'||r.kind===DK)&&(skip==='t'||!DT||r.trad===DT)&&ws.every(w=>r.hay.includes(w));
  const rows=DIR.filter(r=>pass(r));
  const chip=(attr,v,label,n,on)=>`<button type="button" ${attr}="${v}" aria-pressed="${on}">${esc(label)}<small>${n.toLocaleString()}</small></button>`;
  $('#dkinds').innerHTML=DKINDS.map(([k,l])=>chip('data-dk',k,l,DIR.filter(r=>(k==='all'||r.kind===k)&&pass(r,'k')).length,DK===k)).join('');
  const ts=DTRADS.map(([t,l])=>[t,l,DIR.filter(r=>r.trad===t&&pass(r,'t')).length]).filter(([t,,n])=>n||t===DT);
  $('#dtrads').innerHTML=ts.length?chip('data-dt','','Every tradition',DIR.filter(r=>pass(r,'t')).length,!DT)+ts.map(([t,l,n])=>chip('data-dt',t,l,n,DT===t)).join(''):'';
  $('#dstat').textContent=rows.length===DIR.length?`${DIR.length.toLocaleString()} sets`:`${rows.length.toLocaleString()} of ${DIR.length.toLocaleString()} sets`;
  $('#dir').innerHTML=rows.map(r=>{const who=[r.a,names.get(r.trad)].filter(Boolean);
    return `<li><a href="?set=${encodeURIComponent(r.id)}">${esc(r.t)}</a><small>${r.n.toLocaleString()} ${esc(r.n===1?r.u:`${r.u}s`)} · ${r.e.toLocaleString()} entries</small>${who.length?`<span class="who">${who.map(esc).join(' · ')}</span>`:''}</li>`;}).join('')
    ||'<li class="muted">No set matches.<button type="button" class="more" data-dclear>Show every set</button></li>';
  dirKeep();
}
/* each set's tradition from its author's room, once the rooms arrive (the Patrologiae and the shelves have theirs already) */
function dirTraditions(){
  Promise.all(ROOM_ORDER.map(sh=>J(`/v1/bible/${sh}/rooms/index.json`))).then(xs=>{
    const room=new Map();xs.forEach((x,i)=>{for(const r of (x&&x.authors)||[]){const k=nameKey(r.a);if(k&&!room.has(k))room.set(k,ROOM_ORDER[i]);}});
    for(const r of DIR)if(!r.trad)for(const part of String(r.a||'').split(/;|\s+and\s+/)){const t=room.get(nameKey(part));if(t){r.trad=t;break;}}
    dirRender();
  });
}
// no set named: the directory of every set that has one index, the Weimar Edition and Migne first
if(!SET){
  $('#title').textContent='Indexes of whole sets';document.title='Set Indexes | The Faith Received | Mere Orthodoxy';
  for(const id of ['tabs','find','letters','cols'])$(`#${id}`).hidden=true;
  J('/v1/enrich/sets/index.json').then(d=>{
    if(!d){$('#by').textContent='The list of sets could not be loaded. Reload the page to try again.';return;}
    $('#by').textContent=`One index for each of ${d.sets.length} editions and sets of volumes: subjects, persons, Scripture, terms and questions, every entry naming its volume and pages.`;
    DIR=d.sets.map(([id,t,a,n,u,e])=>{const kind=/^(pl|pg|po)$/.test(id)?'pat':/^shelf-/.test(id)?'shelf':'set';
      return {id,t,a,n,u,e,kind,trad:kind==='pat'?{pl:'pl',pg:'gf',po:'po'}[id]:kind==='shelf'?SHELF_OF[id.slice(6)]||'':'',hay:fold(`${t} ${a} ${id.replace(/-/g,' ')}`)};});
    const kept=dirKept();
    if(kept){$('#dfind').value=kept.q||'';if(DKINDS.some(([k])=>k===kept.k))DK=kept.k;if(DTRADS.some(([t])=>t===kept.t))DT=kept.t;}
    dirRender();$('#dirtools').hidden=false;$('#dir').hidden=false;
    dirTraditions();
  });
  $('#dfind').addEventListener('input',dirRender);
  /* a chip redraws the chips (their counts follow the other filters), so the focus goes back to the chip pressed */
  $('#dirtools').addEventListener('click',e=>{
    const b=e.target.closest('[data-dk],[data-dt]');if(!b)return;
    const attr=b.hasAttribute('data-dk')?'data-dk':'data-dt',v=b.getAttribute(attr);
    if(attr==='data-dk')DK=v;else DT=v===DT?'':v;
    dirRender();
    const again=$('#dirtools').querySelector(`[${attr}="${CSS.escape(v)}"]`)||$('#dirtools [aria-pressed="true"]');if(again)again.focus();
  });
  $('#dir').addEventListener('click',e=>{if(e.target.closest('[data-dclear]')){$('#dfind').value='';DK='all';DT='';dirRender();$('#dfind').focus();}});
}else J(`${base}meta.json`).then(async m=>{
  if(!m){$('#by').textContent='This set has no index yet.';return;}
  M=m;document.title=`${m.t} Index | The Faith Received | Mere Orthodoxy`;$('#title').textContent=m.t;
  $('#by').textContent=`${m.a?`${m.a} · `:''}${m.vols.length.toLocaleString()} ${unit(m.vols.length)} indexed together: every entry names its ${unit(1)} and its pages.`;
  $('#tabs').innerHTML=SECS.map(([k,l])=>`<button type="button" role="tab" data-s="${k}" aria-selected="false">${l}<small>${(m.n[k]||0).toLocaleString()}</small></button>`).join('');
  await route();
  addEventListener('hashchange',route);
});
async function route(){const [sec,...rest]=decodeURIComponent(location.hash.slice(1)).split('/');
  await showSec(SECS.some(([k])=>k===sec)?sec:'subjects',rest.join('/')||null,false);}
