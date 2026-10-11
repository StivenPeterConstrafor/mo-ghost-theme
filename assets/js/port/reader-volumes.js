/* VOLUMES OF ONE WORK (owner 2026-10-11: "we have works that are multiple volumes in the reader make it so that its easy to go the
   previous volumes like poole, also keep in mind going between born digital and facsimile"). v1/volume-sets.json
   (runs/volume_sets_1011/build_sets.py) lists each work the library holds in several volumes, in printed order, one track per form:
   the facsimile, the born-digital text, another edition. The reader's header gets a row under the title: the previous volume, every
   volume in one list, the next volume, and the work's other forms where the Edition row has no page link to them. The text opens with
   the previous volume and ends with the next one. The Library tab lists a set's volumes in printed order (FRVolumes.order).
   Migne's shelves keep their own volume box (#volnav) and are not in the file. The same file serves the corpus site (/read?w=) and
   mereorthodoxy.com (/the-faith-received/read/?w=). */
(function(){
 if(window.FRVolumes)return;
 const READ=location.pathname.indexOf('/the-faith-received/')===0?'/the-faith-received/read/?w=':'/read?w=';
 const href=slug=>READ+encodeURIComponent(slug);
 const h=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const cut=(s,n)=>{s=String(s||'');return s.length>n?s.slice(0,n-1).trim()+'…':s;};
 const OWN=/^(pld|pg|po|eebo)-/;
 let setsP=null;
 const ready=()=>setsP||(setsP=(typeof BLOB==='string'&&BLOB)
  ?fetch(BLOB+'/v1/volume-sets.json'+(window.__FR_VER?'?v='+encodeURIComponent(window.__FR_VER):''),{signal:AbortSignal.timeout?AbortSignal.timeout(20000):undefined})
    .then(r=>r.ok?r.json():null).then(S=>{if(!S||!S.sets)return null;
     // the index is rebuilt from the sets: the copy this site's own store serves leaves out the volumes the library may not
     // show, and the file's stored places would then point one volume off
     const by={};for(const id in S.sets)(S.sets[id].tracks||[]).forEach((t,ti)=>(t.vols||[]).forEach((v,i)=>{if(v&&v.s)by[v.s]=[id,ti,i];}));
     S.by=by;return S;}).catch(()=>null)
  :Promise.resolve(null));
 // where a work sits: its set, its track (form) and its place in that track
 const at=(S,slug)=>{const b=S&&S.by&&S.by[slug],set=b&&S.sets[b[0]],track=set&&set.tracks[b[1]],vol=track&&track.vols[b[2]];
  return vol?{id:b[0],set,ti:b[1],track,i:b[2],vol}:null;};
 // the bar's name for a volume: its label up to the place of printing or the contents ("Vol. II (London, 1671): Job, Psalms" > "Vol. II")
 const short=v=>cut(String(v&&v.l||'').split(/[:(]/)[0].trim().replace(/[.,;]$/,''),40)||'Volume';
 // the volume of another track that answers the one being read: the same volume number, else the same place when both tracks
 // hold as many volumes; otherwise the track's first volume, and the link says so
 const pair=(c,t)=>{const o=c.set.tracks[t];if(!o||!o.vols.length)return null;
  const k=JSON.stringify(c.vol.n);let j=o.vols.findIndex(v=>JSON.stringify(v.n)===k);
  if(j<0&&o.vols.length===c.track.vols.length)j=c.i;
  return j>=0?{v:o.vols[j],exact:true}:{v:o.vols[0],exact:false};};
 const options=c=>c.set.tracks.map(t=>{
  const o=t.vols.map(v=>'<option value="'+h(v.s)+'"'+(v.s===c.vol.s?' selected':'')+'>'+h(cut(v.l||short(v),90))+'</option>').join('');
  return c.set.tracks.length>1?'<optgroup label="'+h(t.label)+'">'+o+'</optgroup>':o;}).join('');
 function bar(c,skip){
  let row=document.getElementById('reader-volumes');
  if(!row){const head=document.querySelector('header.fr-reader-head')||document.querySelector('header.ph');if(!head)return;
   row=document.createElement('div');row.id='reader-volumes';row.hidden=true;
   const ed=document.getElementById('reader-editions');if(ed&&ed.parentNode===head)head.insertBefore(row,ed);else head.appendChild(row);}
  row.setAttribute('role','navigation');row.setAttribute('aria-label','Volumes of this work');row.dataset.work=c.vol.s;
  const vols=c.track.vols,N=vols.length,prev=vols[c.i-1],next=vols[c.i+1];
  const others=c.set.tracks.map((t,ti)=>ti===c.ti?null:{t,p:pair(c,ti)}).filter(x=>x&&x.p&&!skip.has(x.p.v.s));
  if(N<2&&!others.length){row.hidden=true;row.innerHTML='';return;}
  let x='';
  if(N>1){
   x+='<span class="vs-k">'+h(c.set.tracks.length>1?c.track.label:'Volumes')+'</span>';
   x+=prev?'<a class="vs-prev" href="'+href(prev.s)+'" title="'+h('Previous volume: '+prev.l)+'">‹ '+h(short(prev))+'</a>'
          :'<span class="vs-prev vs-off" title="This is the first volume">‹</span>';
   x+='<label class="vs-pick" title="'+h(c.vol.l+'. Choose another volume of this work.')+'"><span class="vs-now">'+h(short(c.vol))
     +' <span class="vs-of">· '+(c.i+1)+' of '+N+'</span> ▾</span><select aria-label="Go to another volume of this work">'+options(c)+'</select></label>';
   x+=next?'<a class="vs-next" href="'+href(next.s)+'" title="'+h('Next volume: '+next.l)+'">'+h(short(next))+' ›</a>'
          :'<span class="vs-next vs-off" title="This is the last volume">›</span>';
  }
  if(others.length){
   x+='<span class="vs-also"><span class="vs-k">'+(N>1?'Also':'Also in the library')+'</span>'+others.map(o=>{
    const many=o.t.vols.length>1,what=o.t.form==='dig'?'the born-digital text: the Latin with its English translation':o.t.form==='fac'?'the facsimile: the printed page, with its scan beside the text':o.t.label;
    const title=o.p.exact?'This work is also held as '+what+'. Opens '+o.p.v.l+'.':'This work is also held as '+what+', in '+o.t.vols.length+' volumes. Opens the first, '+o.p.v.l+'.';
    return '<a href="'+href(o.p.v.s)+'" title="'+h(title)+'">'+h(o.t.label)+(many?', '+h(o.p.exact?short(o.p.v):o.t.vols.length+' vols.'):'')+' ⇄</a>';}).join('')+'</span>';
  }
  row.innerHTML=x;row.hidden=false;
  const sel=row.querySelector('select');
  if(sel)sel.addEventListener('change',()=>{if(sel.value&&sel.value!==c.vol.s)location.href=href(sel.value);});
 }
 // the ends of the text: "Continue in" the next volume after the last page, the previous volume before the first.
 // build() empties #reading on every rebuild, so these are put back after each one (window._afterBuild).
 function bands(c){
  const R=document.getElementById('reading'),first=R&&R.querySelector('.folio');if(!first)return;
  const vols=c.track.vols,prev=vols[c.i-1],next=vols[c.i+1];
  if(next&&!document.getElementById('setnext')&&!(DATA&&DATA.__loadRest)){   // a streaming volume is not at its end yet
   const b=document.createElement('div');b.id='setnext';
   b.innerHTML='<span class="vk">End of '+h(short(c.vol))+'</span><a href="'+href(next.s)+'" title="'+h('Open '+next.l)+'">Continue in '+h(cut(next.l,110))+' ›</a>';
   R.appendChild(b);}
  if(prev&&!document.getElementById('setprev')){
   const b=document.createElement('div');b.id='setprev';
   b.innerHTML='<a href="'+href(prev.s)+'" title="'+h('Open '+prev.l)+'">‹ '+h(cut(prev.l,110))+'</a><span class="vk">Before '+h(short(c.vol))+'</span>';
   first.parentNode.insertBefore(b,first);}
 }
 function paint(){
  const slug=typeof DATA!=='undefined'&&DATA&&DATA.slug;if(!slug||OWN.test(slug))return;
  ready().then(S=>{
   if(!DATA||DATA.slug!==slug)return;
   const c=at(S,slug),row=document.getElementById('reader-volumes');
   if(!c){if(row)row.hidden=true;return;}
   // the Edition row (editionFor: v1/work-relations.json) links the other form page by page; the bar links only the rest
   Promise.resolve(typeof editionFor==='function'?editionFor(slug):null).catch(()=>null).then(e=>{
    if(!DATA||DATA.slug!==slug)return;
    const skip=new Set(e&&e.first?[e.first].concat(e.others||[]):[]);
    if(!row||row.dataset.work!==slug||row.hidden)bar(c,skip);
    bands(c);
   });
  });
 }
 // the Library tab: a set's volumes together, in printed order, where the first of them stands under its author
 function order(ws,S){
  if(!S||!S.by||!Array.isArray(ws))return ws;
  const key=w=>{const b=S.by[w.slug];return b?(w.author||'')+'\u0001'+b[0]:null;},first={};
  const rows=ws.map((w,i)=>{const k=key(w);if(k!=null&&!(k in first))first[k]=i;return {w,i,k};});
  return rows.sort((x,y)=>{const a=x.k!=null?first[x.k]:x.i,b=y.k!=null?first[y.k]:y.i;if(a!==b)return a-b;
   if(x.k!=null&&y.k!=null){const p=S.by[x.w.slug],q=S.by[y.w.slug];return p[1]-q[1]||p[2]-q[2];}
   return x.i-y.i;}).map(x=>x.w);
 }
 // MIGNE'S VOLUMES IN THE SAME ROW (owner 2026-10-11, the PG shelf on a phone: "make navigation easy"). A work in Migne had its
 // volume only in a box at the foot of the Contents drawer, below the whole outline. The row under the title now walks the series:
 // ‹ the volume before · this volume, the work's place in it, and a list of its works and of the other volumes · the volume after ›.
 // Called by the reader's wireVolTravel with the volume's spine (v1/pgvol | plvol | povol/<n>.json); same tab throughout.
 function migne(c){
  if(!c||!c.sp||!Array.isArray(c.sp.works))return;
  let row=document.getElementById('reader-volumes');
  if(!row){const head=document.querySelector('header.fr-reader-head')||document.querySelector('header.ph');if(!head)return;
   row=document.createElement('div');row.id='reader-volumes';row.hidden=true;
   const ed=document.getElementById('reader-editions');if(ed&&ed.parentNode===head)head.insertBefore(row,ed);else head.appendChild(row);}
  const sp=c.sp,W=c.volWord,N=c.volN,P=c.prefix,n=sp.works.length,i=c.i;
  // a Greek Fathers reader keeps the text form they chose (Greek, Greek and Latin, Latin) from work to work
  const src=P==='pg'?new URL(location.href).searchParams.get('src'):'';
  const keep=['grc','grcla','la','ocr'].includes(src)?'&src='+src:'';
  const go=id=>READ+encodeURIComponent(P+'-'+id)+keep;
  row.setAttribute('role','navigation');row.setAttribute('aria-label','Volumes of '+W);row.dataset.work=P+'-'+c.meId;
  let x=sp.prev?'<a class="vs-prev" href="'+go(sp.prev.first)+'" title="'+h('The volume before: '+W+' '+sp.prev.vol)+'">‹ '+h(W+' '+sp.prev.vol)+'</a>'
               :'<span class="vs-prev vs-off" title="The first volume">‹</span>';
  const works=sp.works.map((w,k)=>'<option value="'+h(String(w.id))+'"'+(k===i?' selected':'')+'>'+(k+1)+'. '+h(cut(w.t||(P+'-'+w.id),80))+'</option>').join('');
  const vols=P==='pg'?'pgvols':P==='pld'?'plvols':'';
  x+='<label class="vs-pick" title="'+h(W+' '+N+': its works, and the other volumes. Choose one to open it.')+'"><span class="vs-now">'+h(W+' '+N)
    +(i>=0?' <span class="vs-of">· '+(i+1)+' of '+n+'</span>':'')+' ▾</span><select aria-label="'+h('Go to another work in '+W+' '+N+(vols?', or to another volume':''))+'">'
    +'<optgroup label="'+h(W+' '+N)+'">'+works+'</optgroup>'+(vols?'<optgroup label="Other volumes" data-vols></optgroup>':'')+'</select></label>';
  x+=sp.next?'<a class="vs-next" href="'+go(sp.next.first)+'" title="'+h('The volume after: '+W+' '+sp.next.vol)+'">'+h(W+' '+sp.next.vol)+' ›</a>'
            :'<span class="vs-next vs-off" title="The last volume">›</span>';
  row.innerHTML=x;row.hidden=false;
  const sel=row.querySelector('select');
  sel.addEventListener('change',()=>{const v=sel.value;if(v&&String(v)!==String(c.meId))location.href=go(v);});
  // the other volumes: the shelf's list (60 KB for PG), fetched once the page is idle so it is there when the list opens
  if(vols&&typeof BLOB==='string'&&BLOB){const fill=()=>fetch(BLOB+'/v1/'+vols+'.json').then(r=>r.ok?r.json():null).then(j=>{
    const g=sel.querySelector('optgroup[data-vols]');if(!g||!j||!Array.isArray(j.vols))return;
    g.innerHTML=j.vols.filter(v=>String(v.vol)!==String(N)&&v.first&&v.first.id!=null)
     .map(v=>'<option value="'+h(String(v.first.id))+'">'+h(W+' '+v.vol)+(v.first.a?' · '+h(cut(String(v.first.a).replace(/,\s*pt\.\s*\d+$/,''),40)):'')+'</option>').join('');}).catch(()=>{});
   (window.requestIdleCallback||(f=>setTimeout(f,1200)))(fill);}
 }
 window.FRVolumes={ready,order,paint,migne};
 {const previous=window._afterBuild;window._afterBuild=()=>{if(previous)previous();try{paint();}catch(e){}};}
 ready();
 if(window.__readerBuilt)paint();
})();
