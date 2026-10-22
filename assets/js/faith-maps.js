/* Maps of the tradition: ported from The Faith Received (tools/prdl_reader_prototype/maps.html, 2026-10-21); the data from the library worker, links into the reader on this site. */
window.__FR_BLOB_BASE__=window.__FR_BLOB_BASE__||"https://mo-tfr-library.mo-podcast-feed.workers.dev";
window.__FR_READER_PATH__=window.__FR_READER_PATH__||"/the-faith-received/read/";
const BASE=(window.__FR_BLOB_BASE__||'').replace(/\/$/,'');
const $=s=>document.querySelector(s),esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
const READER=(window.__FR_READER_PATH__||'/read');
const read=(w,p)=>`${READER}?w=${encodeURIComponent(w)}#b${encodeURIComponent(p)}-0`;
const ATLAS='/the-faith-received/disputed-questions/';
const ord=n=>n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][Math.min(n%10,4)]||'th');
/* the shelves' colours: one a tradition, the same in the legend, the dots and the lists; a shelf not named falls to grey */
const COL={'Greek Fathers':'#2E6E8E','Latin Fathers':'#7A4E9B','Eastern Fathers':'#5E8C61','Byzantine':'#1F8A7A','Medieval':'#B07B2A','Lutheran':'#C1593C','Reformed':'#2F7D4F','Continental Reformed':'#2F7D4F','Roman Catholic':'#A63D5A','English Divines':'#3B5BA5','Humanism and Law':'#8C7B5C'};
const col=t=>COL[t]||'#7A7A76';
const KINDS=[['refutes','Refutes','k'],['develops','Develops','k'],['follows','Follows','k'],['distinguishes','Distinguishes','k dash'],['reconciles','Reconciles','k dot']];
const SHOWN=6;
let IX=null,D=null,CUR=null,TRAD=new Set(),FOLD=0;const KIND=new Set(KINDS.map(k=>k[0]));
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0)/4294967295};
const citedOf=h=>h.cited||(h.cite?[h.cite]:[]);
/* a holder's dates as the data gives them; a bare year only when it is a real one (9999 marks no date) */
const yrOf=h=>h.dates||(Number(h.y)>0&&Number(h.y)<9999?String(h.y):'');
/* the pages an answer stands on, a line a work: "p. 446", or "pp. 17, 18"; each opens the reader in a new tab */
function pagesHTML(cited){
  const by=new Map();for(const [w,p,t] of cited){if(!by.has(w))by.set(w,{t:t||w,ps:[]});const g=by.get(w);if(!g.ps.includes(p))g.ps.push(p);}
  return [...by.entries()].map(([w,{t,ps}])=>ps.length===1
    ?`<span class="pp"><a class="pg" href="${read(w,ps[0])}" target="_blank" rel="noopener" title="${esc(t)}" aria-label="${esc(t)}, page ${esc(ps[0])}, opens the reader">p. ${esc(ps[0])}</a></span>`
    :`<span class="pp" title="${esc(t)}">pp. ${ps.map(p=>`<a class="pg" href="${read(w,p)}" target="_blank" rel="noopener" aria-label="${esc(t)}, page ${esc(p)}, opens the reader">${esc(p)}</a>`).join(', ')}</span>`).join('');
}
/* ONE ROW, the same here and in the atlas: who (name, dates) | his claim, and the work it stands in | the pages, at the right */
function rowHTML(h,k){
  const c=citedOf(h),works=[...new Set(c.map(x=>x[2]||x[0]))];
  return `<li class="hr"${k>=SHOWN?' hidden':''}><span class="h-who">${esc(h.author)}${yrOf(h)?`<small>${esc(yrOf(h))}</small>`:''}</span><span class="h-line">${esc(h.line)}${works.length?`<small class="h-src">${works.map(esc).join('; ')}</small>`:''}</span><span class="h-pg">${pagesHTML(c)}</span></li>`;
}
/* a list longer than six rows shows six and folds the rest behind "Show all N" */
function foldHTML(items,row,cls){
  const id=`fold${++FOLD}`;
  return `<ol class="${cls}" id="${id}">${items.map(row).join('')}</ol>${items.length>SHOWN?`<button type="button" class="more" aria-expanded="false" aria-controls="${id}" data-n="${items.length}">Show all ${items.length}</button>`:''}`;
}
function byTradition(hs){
  const by=new Map();for(const h of hs){const k=h.tradition||'Other';if(!by.has(k))by.set(k,[]);by.get(k).push(h);}
  return [...by.entries()].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0])).map(([t,xs])=>[t,xs.sort((a,b)=>(Number(a.y)||9999)-(Number(b.y)||9999))]);
}
function holdersHTML(hs){
  return byTradition(hs).map(([t,xs])=>`<section class="tg" data-trad="${esc(t)}"><h4><i class="sw" style="--c:${col(t)}" aria-hidden="true"></i>${esc(t)}<span class="ct"><span class="sr">, </span>${xs.length}</span></h4>${foldHTML(xs,rowHTML,'hl')}</section>`).join('');
}
function posName(d,id){return (d.positions.find(p=>p.id===id)||{}).label||'';}
function endHTML(d,e){
  if(e.author)return `<span class="r-e">${esc(e.author)}${e.dates?`<small>${esc(e.dates)}</small>`:''}</span>`;
  return `<span class="r-e"><i>The position</i> ${esc(posName(d,e.position))}</span>`;
}
function relationsHTML(d){
  const groups=KINDS.map(([k,l])=>[k,l,d.relations.filter(r=>r.kind===k)]).filter(([,,rs])=>rs.length);
  const rest=d.relations.filter(r=>!KINDS.some(k=>k[0]===r.kind));if(rest.length)groups.push(['other','Other',rest]);
  return `<section class="sec" aria-labelledby="sec-rel"><h3 id="sec-rel">The lines between them<span class="ct"><span class="sr">, </span>${d.relations.length}</span></h3>${groups.map(([k,l,rs])=>`<section class="rk"><h4><i class="lk ${esc(k)}" aria-hidden="true"></i>${esc(l)}<span class="ct"><span class="sr">, </span>${rs.length}</span></h4>${foldHTML(rs,(r,i)=>`<li class="rr"${i>=SHOWN?' hidden':''}>${endHTML(d,r.from)}<span class="r-to" aria-hidden="true">→</span><span class="sr">${esc(l.toLowerCase())}</span>${endHTML(d,r.to)}${r.note?`<span class="r-note">${esc(r.note)}</span>`:''}</li>`,'hl')}</section>`).join('')}</section>`;
}
function turningHTML(d){
  return `<section class="sec" aria-labelledby="sec-tp"><h3 id="sec-tp">Turning points<span class="ct"><span class="sr">, </span>${d.turning_points.length}</span></h3><ol class="tps">${d.turning_points.map(t=>`<li><span class="tp-c">${esc(ord(t.century))} century</span><div><p>${esc(t.what)}</p>${t.who.length?`<p class="tp-who">${t.who.map(w=>{const c=citedOf(w)[0];return `${esc(w.author)}${c?` <a class="pg" href="${read(c[0],c[1])}" target="_blank" rel="noopener" title="${esc(c[2]||c[0])}">p. ${esc(c[1])}</a>`:''}`;}).join(' · ')}</p>`:''}</div></li>`).join('')}</ol></section>`;
}
function draw(d){
  const P=d.positions,all=P.flatMap(p=>p.holders.map(h=>({...h,pos:p.id})));
  const dated=h=>Number(h.y)>0&&Number(h.y)<2000,years=all.filter(dated).map(h=>Number(h.y)),y0=Math.floor((Math.min(...years,1700)-1)/100)*100,y1=Math.min(2000,Math.ceil(Math.max(...years,1700)/100)*100),step=(y1-y0)/100>12?200:100;
  const W=1000,L=56,R=12,T=14,B=38,H=Math.max(380,Math.min(720,(y1-y0)/100*44+T+B)),cw=(W-L-R)/P.length;
  const yOf=y=>T+(y-y0)/(y1-y0)*(H-T-B-26),undated=H-B+14;
  const xOf=(h,k)=>L+cw*(k+.5)+(hash(h.author)-.5)*cw*.72;
  const at=new Map();P.forEach((p,k)=>p.holders.forEach(h=>at.set(h.n,{x:xOf(h,k),y:dated(h)?yOf(Number(h.y)):undated,h,un:!dated(h)})));
  let g='';
  for(let k=0;k<P.length;k+=2){g+=`<rect class="band" x="${(L+cw*k).toFixed(1)}" y="${T}" width="${cw.toFixed(1)}" height="${H-B-T}"/>`;}
  for(let c=y0;c<=y1;c+=100){const y=yOf(c),lab=((c-y0)/100)%(step/100)===0;g+=`<line class="grid" x1="${L}" x2="${W-R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>${lab&&c>0?`<text x="${L-8}" y="${(y+4).toFixed(1)}" text-anchor="end">${ord(c/100+1)}</text>`:''}`;}
  for(let k=1;k<P.length;k++){const x=L+cw*k;g+=`<line class="col" x1="${x}" x2="${x}" y1="${T}" y2="${H-B}"/>`;}
  if(all.some(h=>!dated(h)))g+=`<text x="${L-8}" y="${undated+4}" text-anchor="end">undated</text>`;
  const posX=k=>L+cw*(k+.5);
  let e='';
  for(const r of d.relations){
    const a=r.from.n?at.get(r.from.n):null,b=r.to.n?at.get(r.to.n):null;
    /* an undated author has no place on the time axis: no line to the undated band */
    if((a&&a.un)||(b&&b.un))continue;
    let x1,y1_,x2,y2;
    if(a){x1=a.x;y1_=a.y}else if(r.from.position){const k=P.findIndex(p=>p.id===r.from.position);if(k<0)continue;x1=posX(k);y1_=T-6}else continue;
    if(b){x2=b.x;y2=b.y}else if(r.to.position){const k=P.findIndex(p=>p.id===r.to.position);if(k<0)continue;x2=posX(k);y2=T-6}else continue;
    const mx=(x1+x2)/2,bend=Math.min(60,Math.abs(x2-x1)*.25);
    e+=`<path class="edge ${r.kind}${r.recorded?' recorded':''}" data-kind="${r.kind}" data-a="${r.from.n||''}" data-b="${r.to.n||''}" d="M${x1.toFixed(1)},${y1_.toFixed(1)} C${(mx).toFixed(1)},${(y1_-bend).toFixed(1)} ${(mx).toFixed(1)},${(y2-bend).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}"><title>${esc(`${r.from.author||r.from.position} ${r.kind} ${r.to.author||r.to.position}${r.note?`: ${r.note}`:''}`)}</title></path>`;
  }
  let dots='';
  for(const [n,o] of at){const {h} = o;dots+=`<a class="dot" data-n="${n}" data-trad="${esc(h.tradition||'')}" tabindex="0" role="button" aria-label="${esc(h.author)}, ${esc(h.tradition||'')}, ${esc(yrOf(h)||'undated')}: ${esc(h.answer)}"><circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="5" fill="${col(h.tradition)}"/></a>`;}
  const heads=`<div class="heads" style="grid-template-columns:repeat(${P.length},1fr)">${P.map(p=>`<div>${esc(p.label)}<small>${p.holders.length} ${p.holders.length===1?'author':'authors'}${p.first?` · from ${esc(p.first.author)}`:''}</small></div>`).join('')}</div>`;
  /* on a phone the diagram keeps a readable width and scrolls sideways inside its frame; the page never does */
  return `<div class="dscroll" style="--np:${P.length}"><div>${heads}<svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(d.q)}: ${P.length} positions, ${all.length} authors placed by century">${g}${e}${dots}</svg></div></div><div class="tip" id="tip" hidden></div>`;
}
function apply(){
  document.querySelectorAll('svg.map .dot').forEach(el=>el.classList.toggle('off',TRAD.size>0&&!TRAD.has(el.dataset.trad)));
  document.querySelectorAll('svg.map .edge').forEach(el=>{const a=document.querySelector(`.dot[data-n="${el.dataset.a}"]`),b=document.querySelector(`.dot[data-n="${el.dataset.b}"]`);el.classList.toggle('off',!KIND.has(el.dataset.kind)||(a&&a.classList.contains('off'))||(b&&b.classList.contains('off')));});
  /* the lists follow the legend: a tradition switched off leaves the positions' lists too */
  document.querySelectorAll('#m .tg').forEach(el=>{el.hidden=TRAD.size>0&&!TRAD.has(el.dataset.trad==='Other'?'':el.dataset.trad);});
}
function tip(n,anchor){
  const t=$('#tip');if(!n){t.hidden=true;document.querySelectorAll('.dot.is-on,.dot.dim').forEach(x=>x.classList.remove('is-on','dim'));return;}
  const h=D.positions.flatMap(p=>p.holders.map(x=>({...x,pos:p.label}))).find(x=>x.n===Number(n));if(!h)return;
  const c=citedOf(h)[0];
  t.innerHTML=`<button type="button" aria-label="Close">×</button><b>${esc(h.author)}</b> <span class="tt">${esc(yrOf(h))}${h.tradition?` · ${esc(h.tradition)}`:''}</span><div class="tt">${esc(h.pos)} · ${esc(h.answer)}</div><p>${esc(h.line)}</p>${c?`<a href="${read(c[0],c[1])}" target="_blank" rel="noopener">${esc(c[2]||c[0])}, p. ${esc(c[1])}</a>`:''}`;
  t.hidden=false;
  const box=$('.diagram').getBoundingClientRect(),r=anchor.getBoundingClientRect();
  let x=r.left-box.left+12,y=r.top-box.top+12;if(x+t.offsetWidth>box.width-8)x=Math.max(8,r.left-box.left-t.offsetWidth-6);if(y+t.offsetHeight>box.height-4)y=Math.max(4,r.top-box.top-t.offsetHeight-6);
  t.style.left=`${x}px`;t.style.top=`${y}px`;
  document.querySelectorAll('.dot').forEach(x=>{x.classList.toggle('is-on',x.dataset.n===String(n));});
  const linked=new Set([String(n)]);document.querySelectorAll('svg.map .edge:not(.off)').forEach(el=>{if(el.dataset.a===String(n))linked.add(el.dataset.b);if(el.dataset.b===String(n))linked.add(el.dataset.a);});
  document.querySelectorAll('.dot').forEach(x=>x.classList.toggle('dim',!linked.has(x.dataset.n)));
}
function show(id,push){
  const i=IX.questions.findIndex(q=>q.id===id);if(i<0)return;CUR=id;
  document.querySelectorAll('.loci li button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===id)));
  keepInView(document.querySelector(`.loci button[data-id="${CSS.escape(id)}"]`));
  $('#m').innerHTML='<p class="muted">Drawing the map…</p>';
  J(`${BASE}/v1/maps/q/${encodeURIComponent(id)}.json`).then(d=>{
    if(!d||CUR!==id)return;D=d;TRAD=new Set();FOLD=0;
    const trads=Object.entries(d.traditions||{}).sort((a,b)=>b[1]-a[1]);
    const prev=IX.questions[i-1],next=IX.questions[i+1];
    const secs=d.positions.map(p=>`<section class="sec" aria-labelledby="pos-${esc(p.id)}"><h3 id="pos-${esc(p.id)}">${esc(p.label)}<span class="ct"><span class="sr">, </span>${p.holders.length}<span class="sr"> authors</span></span></h3>
        ${p.summary?`<p class="thesis">${esc(p.summary)}</p>`:''}${p.distinction?`<dl class="lab"><div><dt>Turns on</dt><dd>${esc(p.distinction)}</dd></div></dl>`:''}
        ${holdersHTML(p.holders)}</section>`).join('');
    const unpl=(d.unplaced||[]).length?`<section class="sec" aria-labelledby="sec-unpl"><h3 id="sec-unpl">Not placed<span class="ct"><span class="sr">, </span>${d.unplaced.length}</span></h3><p class="thesis muted">Answers the reading could not file under a position; each stands on his page.</p>${holdersHTML(d.unplaced)}</section>`:'';
    $('#m').innerHTML=`<h2>${esc(d.q)}</h2>
      <p class="meta">${esc(d.locus)} · ${d.n} authors · ${d.positions.length} positions · <a href="${ATLAS}#${esc(d.id)}">every answer in the atlas</a></p>
      ${d.note?`<p class="shape">${esc(d.note)}</p>`:''}${d.axes.length?`<dl class="lab"><div><dt>Runs along</dt><dd><ol>${d.axes.map(a=>`<li>${esc(a)}</li>`).join('')}</ol></dd></div></dl>`:''}
      <div class="chips" id="trads" role="group" aria-label="Traditions shown">${trads.map(([t,n])=>`<button type="button" data-trad="${esc(t)}" aria-pressed="true"><i style="--c:${col(t)}"></i>${esc(t||'Other')} <span class="ct">${n}</span></button>`).join('')}</div>
      <div class="chips" id="kinds" role="group" aria-label="Lines shown">${KINDS.filter(k=>d.relations.some(r=>r.kind===k[0])).map(([k,l,c])=>`<button type="button" class="${c}" data-kind="${k}" aria-pressed="true"><i style="--c:${k==='refutes'?'var(--accent)':'var(--muted)'}"></i>${l}</button>`).join('')}</div>
      <div class="diagram">${draw(d)}</div>
      ${secs}${unpl}${d.turning_points.length?turningHTML(d):''}${d.relations.length?relationsHTML(d):''}
      <nav class="next" aria-label="Previous and next question">${prev?`<button type="button" data-go="${esc(prev.id)}">‹ ${esc(prev.q)}</button>`:'<span></span>'}${next?`<button type="button" data-go="${esc(next.id)}">${esc(next.q)} ›</button>`:'<span></span>'}</nav>`;
    $('#note').textContent=d.method||'';
    if(push)history.replaceState(null,'',`#${id}`);
    document.title=`${d.q} | Maps of the tradition | The Faith Received | Mere Orthodoxy`;
  });
}
/* the question shown keeps its locus open and in sight: the phone's bounded list, or the sticky column */
function keepInView(el){
  if(!el)return;const d=el.closest('details');if(d)d.open=true;
  const box=[...document.querySelectorAll('.loci,.nav')].find(x=>x.contains(el)&&x.scrollHeight>x.clientHeight+4);if(!box)return;
  const r=el.getBoundingClientRect(),br=box.getBoundingClientRect();if(r.top<br.top||r.bottom>br.bottom)box.scrollTop+=r.top-br.top-box.clientHeight/3;
}
function list(){
  const q=($('#find').value||'').trim().toLowerCase(),by=new Map();
  for(const x of IX.questions){if(q&&!x.q.toLowerCase().includes(q))continue;if(!by.has(x.locus))by.set(x.locus,[]);by.get(x.locus).push(x);}
  $('#loci').innerHTML=[...by.entries()].map(([l,xs])=>`<li><details ${xs.some(x=>x.id===CUR)||q?'open':''}><summary>${esc(l)}<small>${xs.length}</small></summary><ul>${xs.map(x=>`<li><button type="button" data-id="${esc(x.id)}" aria-current="${String(x.id===CUR)}">${esc(x.q)}<small>${x.positions.length} positions · ${x.authors} authors</small></button></li>`).join('')}</ul></details></li>`).join('')||'<li class="muted">Nothing matches.</li>';
}
$('#loci').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(b)show(b.dataset.id,true);});
$('#find').addEventListener('input',list);
$('#m').addEventListener('click',e=>{
  const go=e.target.closest('button[data-go]');if(go){show(go.dataset.go,true);$('#m').scrollIntoView({block:'start'});return;}
  const more=e.target.closest('button.more');if(more){const open=more.getAttribute('aria-expanded')!=='true',ol=document.getElementById(more.getAttribute('aria-controls'));
    [...ol.children].forEach((li,k)=>{if(k>=SHOWN)li.hidden=!open;});more.setAttribute('aria-expanded',String(open));more.textContent=open?'Show fewer':`Show all ${more.dataset.n}`;
    if(!open&&more.getBoundingClientRect().top<0)ol.scrollIntoView({block:'start'});return;}
  const t=e.target.closest('#trads button');if(t){const k=t.dataset.trad;if(TRAD.has(k))TRAD.delete(k);else TRAD.add(k);if(TRAD.size===document.querySelectorAll('#trads button').length)TRAD.clear();document.querySelectorAll('#trads button').forEach(b=>b.setAttribute('aria-pressed',String(!TRAD.size||TRAD.has(b.dataset.trad))));apply();return;}
  const k=e.target.closest('#kinds button');if(k){const kk=k.dataset.kind;if(KIND.has(kk))KIND.delete(kk);else KIND.add(kk);k.setAttribute('aria-pressed',String(KIND.has(kk)));apply();return;}
  const d=e.target.closest('.dot');if(d){tip(d.dataset.n,d);return;}
  if(e.target.closest('#tip button')){tip(null);return;}
  if(!e.target.closest('#tip'))tip(null);
});
$('#m').addEventListener('mouseover',e=>{const d=e.target.closest('.dot');if(d&&!document.querySelector('.dot.is-on'))tip(d.dataset.n,d);});
$('#m').addEventListener('focusin',e=>{const d=e.target.closest('.dot');if(d)tip(d.dataset.n,d);});
addEventListener('keydown',e=>{if(e.key==='Escape')tip(null);if(e.target.matches('input'))return;const i=IX?IX.questions.findIndex(q=>q.id===CUR):-1;if(i<0)return;if(e.key==='ArrowRight'&&IX.questions[i+1])show(IX.questions[i+1].id,true);if(e.key==='ArrowLeft'&&IX.questions[i-1])show(IX.questions[i-1].id,true);});
J(`${BASE}/v1/maps/index.json`).then(ix=>{
  if(!ix||!(ix.questions||[]).length){$('#m').innerHTML='<p class="muted">The maps could not be loaded. Reload the page to try again.</p>';return;}
  IX=ix;const want=decodeURIComponent(location.hash.slice(1));list();
  const first=ix.questions.find(q=>q.id===want)||ix.questions[0];if(first)show(first.id,false);
});
