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
// HOW THE LIBRARY DEFINES IT (10-20, item 6): every work that defines the term, oldest author first, from v1/lexicon/history, bundles of
// about 38 terms named by FNV-1a over the term's id (The Faith Received runs/minimax_1019/lexicon/history.py). Each line is the machine's
// one-line English summary of how that page defines the term, not a quotation; the page link is the source.
const fnv=s=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h;};
const JZ=async u=>{try{const r=await fetch(BLOB+u);if(!r.ok)return null;const b=new Uint8Array(await r.arrayBuffer());
  const t=b[0]===31&&b[1]===139?await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(b);return JSON.parse(t);}catch(_){return null;}};
const histOf=async id=>{const d=await JZ(`/v1/lexicon/history/${fnv(id)%2048}.json.gz`);return d&&d.terms?d.terms[id]||null:null;};
const cent=y=>{if(y==null)return 'Undated';const c=Math.floor((y-1)/100)+1,s=c%100>=11&&c%100<=13?'th':({1:'st',2:'nd',3:'rd'}[c%10]||'th');return `${c}${s} century`;};
const who=a=>a?`<span class="ha">${esc(a[0]||'Unknown author')}</span>${a[1]?` (${esc(a[1])})`:''}`:'';
function histRows(h,n){let last=null,out='';
  for(const r of h.rows.slice(0,n)){const a=h.authors[r[2]]||[],c=cent(a[2]);
    if(c!==last){out+=`<li class="hc">${esc(c)}</li>`;last=c;}
    out+=`<li class="hr"><div class="hw">${who(a)}, <a href="${read(r[0],r[3])}">${esc(r[1]||r[0])}, p. ${esc(r[3])}</a>${r[5]>1?` · on ${r[5]} pages`:''}</div><p>${esc(r[4])}</p></li>`;}
  return out;}
async function showHistory(id){const box=$('#hist');if(!box)return;const h=await histOf(id);if(CUR!==id)return;
  if(!h||!h.rows.length){box.innerHTML='';return;}
  const dated=h.rows.map(r=>h.authors[r[2]]).filter(a=>a&&a[2]!=null),first=dated[0],last=dated[dated.length-1];
  const span=first&&last&&first!==last?`, from ${esc(first[0])} to ${esc(last[0])}`:'';
  box.innerHTML=`<h3 id="hist-h">How the library defines it</h3><p class="muted">${h.works.toLocaleString()} ${h.works===1?'work':'works'}${span}. Each line is a one-line English summary, made by machine, of how that page defines the term; open the page to read the author's own words.</p><ol>${histRows(h,60)}</ol>${h.rows.length>60?`<button type="button" class="more">Show all ${h.works.toLocaleString()} works</button>`:''}`;
  const more=box.querySelector('.more');if(more)more.addEventListener('click',()=>{box.querySelector('ol').innerHTML=histRows(h,h.rows.length);more.remove();});}
const SIBS=new Map();
function listHTML(rows){
  // one row a headword: the lexicon filed some headwords several times (wages: merces, merces with ὀψώνια, opsōnion); the list shows each
  // once, with the works of its fullest entry, and the entry opened names the others under "Also filed as"
  const by=new Map();rows.forEach(t=>{const k=String(t[1]).toLowerCase();if(!by.has(k))by.set(k,[]);by.get(k).push(t);});
  by.forEach((v,k)=>{v.sort((a,b)=>(b[2]||0)-(a[2]||0));SIBS.set(k,v);});
  return [...by.values()].map(v=>{const t=v[0];return `<li><button type="button" data-id="${esc(t[0])}" aria-current="${v.some(x=>x[0]===CUR)}">${esc(t[1])}${v.length>1?`<span class="lx-form"> · ${v.length} entries</span>`:''}<small>${esc(t[2]||'')}</small></button></li>`;}).join('');}
async function showLetter(l){LETTER=l;document.querySelectorAll('#letters button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.l===l)));
  const rows=await J(`/v1/lexicon/letters/${encodeURIComponent(l)}.json`);$('#list').innerHTML=rows?listHTML(rows):'<li class="muted">Nothing under this letter.</li>';}
let REDIR=null;
async function showTerm(id,write){
  let t=await J(`/v1/lexicon/terms/${encodeURIComponent(id)}.json`);
  // an id merged into another entry (the duplicate headwords, 10-22): v1/lexicon/redirects.json names the entry that holds it now
  if(!t){if(REDIR===null)REDIR=(await J('/v1/lexicon/redirects.json'))||{};const to=REDIR[id];if(to&&to!==id){id=to;t=await J(`/v1/lexicon/terms/${encodeURIComponent(id)}.json`);}}
  if(!t){$('#entry').innerHTML='<p class="muted">This term could not be loaded.</p>';return;}
  CUR=id;document.querySelectorAll('#list button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===id)));
  const forms=[...(t.latin||[]).map(x=>`Latin ${x}`),...(t.greek||[]).map(x=>`Greek ${x}`)].join(' · ');
  // opened by its address before any letter list loaded: the headword's letter file tells whether it is filed more than once
  const hk=String(t.headword||'').toLowerCase(),hl=fold(hk).slice(0,1);
  if(hl&&!SIBS.has(hk)){const lr=await J(`/v1/lexicon/letters/${encodeURIComponent(hl)}.json`);if(lr){const by=new Map();lr.forEach(x=>{const k=String(x[1]).toLowerCase();if(!by.has(k))by.set(k,[]);by.get(k).push(x);});by.forEach((v,k)=>{v.sort((a,b)=>(b[2]||0)-(a[2]||0));if(!SIBS.has(k))SIBS.set(k,v);});}}
  const sib=(SIBS.get(hk)||[]).filter(x=>x[0]!==id);
  const also=sib.length?`<p class="also">Also filed as ${sib.map(x=>`<button type="button" class="lnk" data-id="${esc(x[0])}">${esc([x[3],x[4]].filter(Boolean).join(' · ')||x[1])}<small> ${esc(x[2]||'')} ${x[2]===1?'work':'works'}</small></button>`).join(', ')}</p>`:'';
  $('#entry').innerHTML=`<h2>${esc(t.headword)}</h2>${forms?`<p class="forms">${esc(forms)}</p>`:''}${also}<p class="muted">The senses below are drawn from the works that define it; every work that does is listed under How the library defines it.</p>${
    (t.senses||[]).map((s,i)=>`<section class="sense"><p><strong>${i+1}.</strong> ${esc(s.gloss)}</p><ol>${(s.src||[]).slice(0,12).map(([w,p,a,ti])=>`<li>${esc(a||'')}${a?', ':''}<a href="${read(w,p)}">${esc(ti||w)}, p. ${esc(p)}</a></li>`).join('')}${(s.src||[]).length>12?`<li>and ${(s.src||[]).length-12} more</li>`:''}</ol></section>`).join('')}<section class="hist" id="hist" aria-labelledby="hist-h"></section>`;
  showHistory(id);
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
  // one row per alphabet: Greek capitals Α and Β are not the Latin A and B beside them
  const SCRIPTS=[['Latin and English',/^[a-zæœ]$/],['Greek',/^[\u0370-\u03ff\u1f00-\u1fff]$/],['Hebrew',/^[\u0590-\u05ff]$/]];
  const btn=([l,n])=>`<button type="button" data-l="${esc(l)}" aria-pressed="false" title="${n} terms">${esc(l.toUpperCase())}</button>`;
  const all=Object.entries(d.letters).filter(([l])=>l!=='_');
  INDEX=d;$('#letters').innerHTML=SCRIPTS.map(([name,rx])=>[name,all.filter(([l])=>rx.test(l))]).filter(([,ls])=>ls.length)
    .map(([name,ls])=>`<div class="lgroup" role="group" aria-label="${esc(name)}"><span class="lname">${esc(name)}</span><div class="lbtns">${ls.map(btn).join('')}</div></div>`).join('');
  $('#list').innerHTML=listHTML(d.top.slice(0,120));
  const want=decodeURIComponent(location.hash.slice(1));
  if(want)await showTerm(want,false);else if(d.top.length)await showTerm(d.top[0][0],false);
});
