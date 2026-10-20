/* Lexicon: ported from The Faith Received (tools/prdl_reader_prototype/lexicon.html); the data from the library worker, links into the reader on this site. */
window.__FR_BLOB_BASE__=window.__FR_BLOB_BASE__||"https://mo-tfr-library.mo-podcast-feed.workers.dev";
window.__FR_READER_PATH__=window.__FR_READER_PATH__||"/the-faith-received/read/";
window.__FR_LEXICON_PATH__=window.__FR_LEXICON_PATH__||"/the-faith-received/lexicon/";
const BLOB=(window.__FR_BLOB_BASE__||"").replace(/\/$/,"");
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fold=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim();
const J=u=>fetch(BLOB+u).then(r=>r.ok?r.json():null).catch(()=>null);
// MereO hosts the same page with its own reader path (window.__FR_READER_PATH__ = '/the-faith-received/read/') and data address
const READER=(window.__FR_READER_PATH__||'/read');
const read=(w,p)=>`${READER}?w=${encodeURIComponent(w)}#b${encodeURIComponent(p)}-0`;
let INDEX=null,LETTER=null,CUR=null;
function listHTML(rows){return rows.map(t=>`<li><button type="button" data-id="${esc(t[0])}" aria-current="${t[0]===CUR}">${esc(t[1])}<small>${esc(t[2]||'')}</small></button></li>`).join('');}
async function showLetter(l){LETTER=l;document.querySelectorAll('#letters button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.l===l)));
  const rows=await J(`/v1/lexicon/letters/${encodeURIComponent(l)}.json`);$('#list').innerHTML=rows?listHTML(rows):'<li class="muted">Nothing under this letter.</li>';}
async function showTerm(id,write){
  const t=await J(`/v1/lexicon/terms/${encodeURIComponent(id)}.json`);if(!t){$('#entry').innerHTML='<p class="muted">This term could not be loaded.</p>';return;}
  CUR=id;document.querySelectorAll('#list button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===id)));
  const forms=[...(t.latin||[]).map(x=>`Latin ${x}`),...(t.greek||[]).map(x=>`Greek ${x}`)].join(' · ');
  $('#entry').innerHTML=`<h2>${esc(t.headword)}</h2>${forms?`<p class="forms">${esc(forms)}</p>`:''}<p class="muted">Defined in ${esc(t.works)} ${t.works===1?'work':'works'} of the library; the senses below come from up to thirty of them.</p>${
    (t.senses||[]).map((s,i)=>`<section class="sense"><p><strong>${i+1}.</strong> ${esc(s.gloss)}</p><ol>${(s.src||[]).slice(0,12).map(([w,p,a,ti])=>`<li>${esc(a||'')}${a?', ':''}<a href="${read(w,p)}">${esc(ti||w)}, p. ${esc(p)}</a></li>`).join('')}${(s.src||[]).length>12?`<li>and ${(s.src||[]).length-12} more</li>`:''}</ol></section>`).join('')}`;
  if(write)history.replaceState(null,'',`#${encodeURIComponent(id)}`);
}
async function find(q){
  const f=fold(q);if(!f)return;
  const shard=await J(`/v1/lexicon/forms/${encodeURIComponent(f.slice(0,2).replace(/ς/g,'σ').replace(/[^\p{L}\p{N}]/gu,'_'))}.json`)||{};
  const id=shard[f];if(id){await showTerm(id,true);return;}
  // no exact form: the terms whose forms begin with what was typed, from the same shard
  const near=Object.entries(shard).filter(([k])=>k.startsWith(f)).slice(0,40);
  $('#list').innerHTML=near.length?near.map(([k,i])=>`<li><button type="button" data-id="${esc(i)}">${esc(k)}</button></li>`).join(''):'<li class="muted">No term matches.</li>';
  if(near.length)await showTerm(near[0][1],true);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b){showTerm(b.dataset.id,true);return;}const l=e.target.closest('[data-l]');if(l)showLetter(l.dataset.l);});
$('#find').addEventListener('submit',e=>{e.preventDefault();find($('#q').value);});
J('/v1/lexicon/index.json').then(async d=>{
  if(!d){$('#entry').innerHTML='<p class="muted">The lexicon could not be loaded. Reload the page to try again.</p>';return;}
  INDEX=d;$('#letters').innerHTML=Object.entries(d.letters).filter(([l])=>l!=='_').map(([l,n])=>`<button type="button" data-l="${esc(l)}" aria-pressed="false" title="${n} terms">${esc(l.toUpperCase())}</button>`).join('');
  $('#list').innerHTML=listHTML(d.top.slice(0,120));
  const want=decodeURIComponent(location.hash.slice(1));
  if(want)await showTerm(want,false);else if(d.top.length)await showTerm(d.top[0][0],false);
});
