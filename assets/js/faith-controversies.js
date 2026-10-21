/* The controversies: ported from The Faith Received (tools/prdl_reader_prototype/controversies.html, 2026-10-21); the data from the library worker, links into the reader on this site. */
window.__FR_BLOB_BASE__=window.__FR_BLOB_BASE__||"https://mo-tfr-library.mo-podcast-feed.workers.dev";
window.__FR_READER_PATH__=window.__FR_READER_PATH__||"/the-faith-received/read/";
const BASE=(window.__FR_BLOB_BASE__||'').replace(/\/$/,'');
const $=s=>document.querySelector(s),esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
const READER=(window.__FR_READER_PATH__||'/read');
const read=(w,p)=>`${READER}?w=${encodeURIComponent(w)}#b${encodeURIComponent(p)}-0`;
const KIND={contradiction:'They contradict',distinction:'A distinction, not a denial',emphasis:'A difference of emphasis',agreement:'They agree'};
let D=null,CUR=null;const KINDS=new Set();
const pg=(w,p,label)=>p?`<a class="pg" href="${read(w,p)}" target="_blank" rel="noopener">${esc(label||`p. ${p}`)}</a>`:'';
function sideHTML(name,s,src){
  const args=(s.arguments||[]).map(a=>`<li>${esc(a.arg)} ${pg(src.w,a.page)}</li>`).join('');
  const own=(s.picks||[]).map(q=>`<blockquote class="own"><p>${esc(q.quote)}</p><footer>${esc(q.t)}, ${pg(q.w,q.p)}</footer></blockquote>${q.says?`<p class="says">${esc(q.says)}</p>`:''}`).join('');
  return `<section class="side"><h3>${esc(name)}</h3>
    <h4>As ${esc(D.source)} states it</h4><p>${esc(s.reported)||'<span class="muted">Not stated.</span>'}</p>${args?`<ol>${args}</ol>`:''}
    <h4>In his own words</h4>${own||`<p class="muted">No page of his works was found to answer this question yet.</p>`}${s.position&&own?`<p class="says">${esc(s.position)}</p>`:''}</section>`;
}
function show(id,push){
  const i=D.controversies.findIndex(c=>c.id===id); if(i<0)return; const c=D.controversies[i]; CUR=id;
  document.querySelectorAll('.books li button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===id)));
  const jd=c.judgment||{},who=jd.side==='a'?D.a:jd.side==='b'?(c.b.name||D.b):jd.side==='both'?'both':'neither';
  const prev=D.controversies[i-1],next=D.controversies[i+1];
  $('#c').innerHTML=`<h2>${esc(c.question)}</h2>
    <p class="meta"><span class="kind">${esc(KIND[c.kind]||c.kind)}</span>${esc(D.books[String(c.book)]||'')}${c.place?` · ${esc(c.place)}`:''} · ${esc(D.source)}, controversy ${c.n}${c.source.title?`: <em>${esc(c.source.title)}</em>`:''}, ${pg(c.source.w,c.source.p0,`pp. ${c.source.p0}–${c.source.p1}`)}</p>
    <div class="sides">${sideHTML(D.a,c.a,c.source)}${sideHTML(c.b.name||D.b,c.b,c.source)}</div>
    <div class="judgment"><h3>${D.self_judge?`${esc(D.source)}'s conclusion`:`${esc(D.source)}'s judgment${who==='both'?': they agree':who==='neither'?'':`: for ${esc(who)}`}`}</h3><p>${esc(jd.why)||'<span class="muted">Not stated.</span>'} ${pg(c.source.w,jd.page)}</p></div>
    <nav class="next" aria-label="Previous and next controversy">${prev?`<button type="button" data-go="${esc(prev.id)}">‹ ${esc(prev.question)}</button>`:'<span></span>'}${next?`<button type="button" data-go="${esc(next.id)}">${esc(next.question)} ›</button>`:'<span></span>'}</nav>`;
  if(push)history.replaceState(null,'',`#${id}`);
  document.title=`${c.question} — Controversies — The Faith Received`;
}
function list(){
  const q=($('#find').value||'').trim().toLowerCase();
  const byBook=new Map();
  for(const c of D.controversies){
    if(KINDS.size&&!KINDS.has(c.kind))continue;
    if(q&&!(c.question.toLowerCase().includes(q)||(c.keywords||[]).some(k=>k.toLowerCase().includes(q))))continue;
    if(!byBook.has(c.book))byBook.set(c.book,[]); byBook.get(c.book).push(c);
  }
  $('#books').innerHTML=[...byBook.entries()].map(([b,cs])=>`<li><details open><summary>${esc(D.books[String(b)]||`Book ${b}`)}<small>${cs.length}</small></summary><ul>${cs.map(c=>`<li><button type="button" data-id="${esc(c.id)}" aria-current="${String(c.id===CUR)}">${esc(c.question)}<small>${esc(KIND[c.kind]||c.kind)}</small></button></li>`).join('')}</ul></details></li>`).join('')||'<li class="muted">Nothing matches.</li>';
}
$('#books').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(b)show(b.dataset.id,true);});
$('#c').addEventListener('click',e=>{const b=e.target.closest('button[data-go]');if(b){show(b.dataset.go,true);$('#c').scrollIntoView({block:'start'});}});
$('#find').addEventListener('input',list);
$('#chips').addEventListener('click',e=>{const b=e.target.closest('button[data-kind]');if(!b)return;const k=b.dataset.kind;if(KINDS.has(k))KINDS.delete(k);else KINDS.add(k);b.setAttribute('aria-pressed',String(KINDS.has(k)));list();});
addEventListener('hashchange',()=>{const h=decodeURIComponent(location.hash.slice(1));if(D&&!h.startsWith(D.pair))location.reload();});
addEventListener('keydown',e=>{if(e.target.matches('input'))return;const i=D?D.controversies.findIndex(c=>c.id===CUR):-1;if(i<0)return;if(e.key==='ArrowRight'&&D.controversies[i+1])show(D.controversies[i+1].id,true);if(e.key==='ArrowLeft'&&D.controversies[i-1])show(D.controversies[i-1].id,true);});
J(`${BASE}/v1/enrich/controversies/index.json`).then(async ix=>{
  const want=decodeURIComponent(location.hash.slice(1));
  const pair=(ix&&ix.pairs||[]).find(p=>p.pair===want||want.startsWith(p.pair))||(ix&&ix.pairs||[])[0];
  if(!pair){$('#c').innerHTML='<p class="muted">The controversies could not be loaded. Reload the page to try again.</p>';return;}
  D=await J(`${BASE}/v1/enrich/controversies/${encodeURIComponent(pair.pair)}.json`);
  if(!D){$('#c').innerHTML='<p class="muted">The controversies could not be loaded. Reload the page to try again.</p>';return;}
  if((ix.pairs||[]).length>1)$('#lede').insertAdjacentHTML('afterend',`<p class="chips" id="pairs">${ix.pairs.map(p=>`<a class="pg" href="#${esc(p.pair)}" aria-current="${String(p.pair===pair.pair)}">${esc(p.a)} and ${esc(p.b)}<span class="muted"> · ${p.n}</span></a>`).join(' ')}</p>`);
  $('#src').innerHTML=`<strong>${esc(D.a)}</strong> and <strong>${esc(D.b)}</strong>, ${D.n} controversies, as <strong>${esc(D.source)}</strong> argued them in <em>${esc(D.source_title)}</em> (${esc(D.source_note)}): ${Object.entries(D.kinds).map(([k,n])=>`${n} ${(KIND[k]||k).toLowerCase()}`).join(' · ')}.`;
  $('#chips').innerHTML=Object.keys(KIND).filter(k=>D.kinds[k]).map(k=>`<button type="button" data-kind="${k}" aria-pressed="false">${esc(KIND[k])} <span class="muted">${D.kinds[k]}</span></button>`).join('');
  $('#note').textContent=D.note||'';
  list();
  const first=D.controversies.find(c=>c.id===want)||D.controversies[0];
  if(first)show(first.id,false);
});
