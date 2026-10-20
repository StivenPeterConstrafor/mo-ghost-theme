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
const SECS=[['subjects','Subjects'],['persons','Persons'],['terms','Terms'],['scripture','Scripture']];
const BOOK=b=>b.replace(/-/g,' ').replace(/\b([a-z])/g,c=>c.toUpperCase()).replace(/^(\d) /,'$1 ').replace('Revelation Of John','Revelation').replace('Song Of Songs','Song of Songs');
const SET=new URLSearchParams(location.search).get('set');
const base=`/v1/enrich/sets/${encodeURIComponent(SET)}/`;
let M=null,SEC='subjects',LETTER=null,ROWS=[],CUR=null,SHOWN=300,BOOKSEL=null;
// Migne's "volumes" are its works, one treatise each (meta.unit 'work'); a set of printed volumes counts volumes
const unit=n=>{const u=(M&&M.unit)||'volume';return n===1?u:`${u}s`;};
const cache=new Map();const load=f=>{if(!cache.has(f))cache.set(f,J(base+f));return cache.get(f);};
function pagesHTML(slug,ps){return ps.map(p=>`<a href="${read(slug,p)}">${esc(p)}</a>`).join(', ');}
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
    $('#entry').innerHTML=`<h2>${esc(k)}</h2><p class="count">In ${groups.length.toLocaleString()} ${unit(groups.length)} of the set.</p><ul class="rows">${groups.slice(0,SHOWN).map(row).join('')}</ul>${
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
  $('#entry').innerHTML=`<h2>${esc(BOOK(BOOKSEL))} ${esc(c)}</h2><p class="count">${vs.length} ${vs.length===1?'verse':'verses'} cited in the set.</p>${
    vs.map(([v,es])=>`<h3 class="verse">${v?`Verse ${esc(v)}`:'The chapter'}</h3><ul class="rows">${volRows(es).slice(0,200).map(([vi,xs])=>{const [slug,label]=M.vols[vi]||[];return slug?`<li><div class="vol">${esc(label)}</div><p class="subs">${xs.map(x=>pagesHTML(slug,x[1])).join(' · ')}</p></li>`:'';}).join('')}</ul>`).join('')}`;
  if(write)history.replaceState(null,'',`?set=${encodeURIComponent(SET)}#scripture/${BOOKSEL}/${c}`);
}
async function showSec(sec,want,write){
  SEC=sec;CUR=null;document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.s===sec)));
  $('#entry').innerHTML='';$('#find').hidden=sec==='scripture';
  if(sec==='scripture'){const [b,c]=(want||'').split('/');await showScripture(b,c,write);return;}
  $('#q').placeholder={subjects:'Find a subject: grace, justification, the papacy',persons:'Find a person: Augustine, Jerome',terms:'Find a term in English, Latin or Greek'}[sec];
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
// no set named: the directory of every set that has one index, the Weimar Edition and Migne first
if(!SET){
  $('#title').textContent='Indexes of whole sets';document.title='Set Indexes — The Faith Received';
  for(const id of ['tabs','find','letters','cols'])$(`#${id}`).hidden=true;
  J('/v1/enrich/sets/index.json').then(d=>{
    if(!d){$('#by').textContent='The list of sets could not be loaded. Reload the page to try again.';return;}
    $('#by').textContent=`One index for each of ${d.sets.length} editions and sets of volumes: subjects, persons, terms and Scripture, every entry naming its volume and pages.`;
    $('#dir').innerHTML=d.sets.map(([id,t,a,n,u,e])=>`<li><a href="?set=${encodeURIComponent(id)}">${esc(t)}</a><small>${n.toLocaleString()} ${n===1?u:`${u}s`} · ${e.toLocaleString()} entries</small>${a?`<span class="who">${esc(a)}</span>`:''}</li>`).join('');
    $('#dir').hidden=false;
  });
}else J(`${base}meta.json`).then(async m=>{
  if(!m){$('#by').textContent='This set has no index yet.';return;}
  M=m;document.title=`${m.t} · Index — The Faith Received`;$('#title').textContent=m.t;
  $('#by').textContent=`${m.a?`${m.a} · `:''}${m.vols.length.toLocaleString()} ${unit(m.vols.length)} indexed together: every entry names its ${unit(1)} and its pages.`;
  $('#tabs').innerHTML=SECS.map(([k,l])=>`<button type="button" role="tab" data-s="${k}" aria-selected="false">${l}<small>${(m.n[k]||0).toLocaleString()}</small></button>`).join('');
  await route();
  addEventListener('hashchange',route);
});
async function route(){const [sec,...rest]=decodeURIComponent(location.hash.slice(1)).split('/');
  await showSec(SECS.some(([k])=>k===sec)?sec:'subjects',rest.join('/')||null,false);}
