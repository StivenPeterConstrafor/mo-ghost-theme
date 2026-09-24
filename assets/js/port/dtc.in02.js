
const BLOB=(window.__FR_BLOB_BASE__&&!/TBD/.test(String(window.__FR_BLOB_BASE__)))?String(window.__FR_BLOB_BASE__).replace(/\/+$/,""):null;
const VER=window.__FR_VER?("?v="+window.__FR_VER):"";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fold=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
let IDX=[],LETTER=null,QY="",CUR=null,SEEALSO={},LANEPREF=null;
// 2026-09-22, Ian: the list used to stop dead at 600 and tell you to narrow
// the search. It pages now, as far as you want to go.
const PAGE=600;let SHOWN=PAGE;
let SZ=parseFloat(localStorage.getItem("dtc_sz"))||1.02;
document.documentElement.style.setProperty("--dtcsz",SZ+"rem");
document.addEventListener("click",e=>{const pp=document.getElementById("olPop");
  if(pp&&pp.classList.contains("on")&&!e.target.closest(".outline"))pp.classList.remove("on");});
document.addEventListener("keydown",e=>{
  const inInput=/INPUT|TEXTAREA/.test(document.activeElement.tagName);
  if((e.key==="/"&&!inInput)||((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k")){e.preventDefault();$("#q").focus();$("#q").select();return;}
  if(inInput){if(e.key==="Enter"){const f=document.querySelector(".hw");if(f){f.click();$("#q").blur();}}
    if(e.key==="Escape")$("#q").blur();return;}
  if(e.key==="[")$("#pPrev")&&$("#pPrev").click();
  if(e.key==="]")$("#pNext")&&$("#pNext").click();
});
/* ── Our two stores ───────────────────────────────────────────────────
   An article is bookmarked exactly as a work is, `tfr:dtc:<id>` in the
   mo-kit KV (faith-work-bookmarks.js), and where you stopped in one is
   kept exactly as it is for a work, under corpus "dtc" in
   faith-position-store.js. Both are optional at load: they are page
   scripts, and MOAuth arrives with site.min.js, which runs after every
   page script. So nothing here assumes either exists yet. */
const DTC_CORPUS="dtc";
const BM=()=>window.MOFaithBookmarks;
const POS=()=>window.MOFaithPosition;
function bmId(id){const b=BM();return b?b.idFor(DTC_CORPUS,id):"";}
// Availability is only knowable once MOAuth exists. Ask again on load
// rather than hiding the button forever because we asked too early.
function whenBookmarks(cb){
  const go=()=>{const b=BM();cb(!!(b&&b.available()));};
  if(document.readyState==="complete")go();else window.addEventListener("load",go,{once:true});
}
function rememberPlace(id,paragraph){
  const p=POS();if(!p||!id)return;
  try{p.set(DTC_CORPUS,id,{anchor:"sec"+(paragraph||0)});}catch(e){}
}
/* ── The notebook ─────────────────────────────────────────────────────
   Highlight a passage in an article and keep it, exactly as the reader
   keeps one from a work. The store is MOFaithNotebook
   (js/lib/faith-notebook-store.js), which is what the Notebook tab of
   /the-faith-received/research/ shows. NOT window.FRResearchNotebook,
   which is also on this page for the Ask workspace and is a different
   store, behind /pins/ and /desk/.

   Like the two stores above it is a page script, so it may not have run
   yet; every use of it is guarded rather than assumed.

   ART is the article on screen and LANE the lane it is painted in.
   Both are needed at the moment of a selection, and paint() replaces
   #art wholesale on every lane switch, so they are held here rather
   than closed over. */
const NB=()=>window.MOFaithNotebook;
let ART=null,LANE=null;
/* The paragraph a selection started in. Every block the body renders
   carries id="sec<n>" — a <p> in the single-lane views, the .pp or
   .hpair wrapper in the parallel one — so the index is the block's own
   id and not a count of anything. */
function paraIndex(node){
  const el=node&&node.nodeType===1?node:(node&&node.parentElement);
  const sec=el&&el.closest?el.closest('[id^="sec"]'):null;
  const n=sec?parseInt(sec.id.slice(3),10):0;
  return Number.isFinite(n)?n:0;
}
/* An ABSOLUTE address for a paragraph of an article, in the shape this
   page already addresses itself by (see writePlace): the article in the
   fragment, the paragraph and the lane in the query. It has to be
   absolute and it has to be stored, because MOFaithNotebook's fallback
   builds a /the-faith-received/reader/ url, and the reader loads
   nothing for a dictionary article. */
function articleUrl(id,paragraph,lane){
  const url=new URL(location.href);
  url.search="";
  url.searchParams.set("paragraph",String(paragraph||0));
  if(["both","en","fr"].includes(lane))url.searchParams.set("lang",lane);
  url.hash=encodeURIComponent(id);
  return url.href;
}
/* The most recent article in this browser, for the Continue line. The
   store keys records "<corpus>|<work>" and stamps each with `t`, which
   is the same recency the reader's own Continue uses. */
function lastPlace(){
  const p=POS();if(!p)return null;
  let best=null;
  try{
    const map=p.load()||{};
    Object.keys(map).forEach(k=>{
      if(k.indexOf(DTC_CORPUS+"|")!==0)return;
      const rec=map[k];if(!rec||typeof rec!=="object")return;
      if(!best||(rec.t||0)>(best.t||0))best={id:k.slice(DTC_CORPUS.length+1),t:rec.t||0,a:rec.a||""};
    });
  }catch(e){return null;}
  return best;
}
function paintResume(){
  const el=$("#resume");if(!el)return;
  const last=lastPlace();
  if(!last||!IDX.length){el.hidden=true;return;}
  const row=IDX.find(a=>String(a[0])===String(last.id));
  if(!row){el.hidden=true;return;}
  el.innerHTML=`<button class=rz data-id="${esc(last.id)}">Pick up where you left off<span>${esc(row[5]||row[1])}</span></button>`;
  el.hidden=false;
}
function paintAlpha(){
  const has={};IDX.forEach(a=>has[a[2]]=1);
  $("#alpha").innerHTML="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(L=>
    `<button data-l="${L}" ${has[L]?"":"disabled"} class="${LETTER===L?"on":""}">${L}</button>`).join("");
}
function matches(){
  const f=fold(QY.trim());
  let rows=IDX;
  if(LETTER)rows=rows.filter(a=>a[2]===LETTER);
  if(f)rows=rows.filter(a=>fold(a[1]).includes(f)||fold(a[5]||"").includes(f));
  return rows;
}
function paintList(){
  const rows=matches();
  $("#count").textContent=`${rows.length} of ${IDX.length} articles`;
  const f=fold(QY.trim());
  let html="",lastL="";
  if(!rows.length){$("#list").innerHTML='<div class=empty>No headword matches. The search reads headwords, not the text of the articles.</div>';return;}
  for(const a of rows.slice(0,SHOWN)){
    if(!QY&&a[2]!==lastL){lastL=a[2];html+=`<div class=lether>${esc(lastL)}</div>`;}
    const en=a[5]||a[1];
    let t=esc(en);
    if(f){const i=fold(en).indexOf(f);
      if(i>=0)t=esc(en.slice(0,i))+"<mark>"+esc(en.slice(i,i+QY.trim().length))+"</mark>"+esc(en.slice(i+QY.trim().length));}
    const frDiff=fold(a[1])!==fold(en)?esc(a[1])+" · ":"";
    html+=`<button class="hw${CUR===a[0]?" on":""}" data-id="${esc(a[0])}">${t}<small>${frDiff}${(a[3]/1000).toFixed(0)}k</small></button>`;
  }
  if(rows.length>SHOWN)html+=`<button class=more id=more>Load more<small>${rows.length-SHOWN} more of ${rows.length}</small></button>`;
  $("#list").innerHTML=html;
}
function cell(p){const t=String(p??"").trim();return t?tok(t):'<span style="color:var(--border)">\u2014</span>';}
function tok(p){
  // ⟦id|label⟧ → internal article links; the translation bank carries literal <em>/<i>
  // pairs for work titles (owner 2026-09-03 screenshot: "the <em>Defensiones</em>") —
  // escape everything, then re-admit exactly those as italics
  return esc(p).replace(/⟦([a-z0-9-]+)\|([^⟧]+)⟧/g,(m,id,lab)=>`<a class=xref data-id="${id}" href="#${id}">${lab}</a>`)
    .replace(/&lt;(\/?)(?:em|i)&gt;/g,'<$1i>');
}
// outline labels and list rows are plain text — em/i markup is dropped, not shown
function detok(p){return String(p??"").replace(/<\/?(?:em|i)>/g,"");}
const isHead=p=>{const t=p.replace(/\u27e6[^\u27e7]+\u27e7/g,"").trim();
  return t.length<170&&/^([IVXLC]+|\d+\u00b0?)[.)\u2014\u00b0]?\s+\S/.test(t)&&t.length<150;};
function renderArt(d,initialParagraph=0){
  let paragraph=initialParagraph;
  // The headword as the page shows it: English where there is one.
  ART={id:d.id,head:d.te&&d.te!==d.t?d.te:d.t};
  const writePlace=(i,l=LANEPREF)=>{const url=new URL(location.href);url.hash=encodeURIComponent(d.id);url.searchParams.set("paragraph",String(i));if(["both","en","fr"].includes(l))url.searchParams.set("lang",l);history.replaceState(history.state,"",url);};
  const FR=Array.isArray(d.fr)?d.fr:String(d.fr||"").split(/\n\n+/);
  const EN=Array.isArray(d.en)?d.en:null;
  const hasEn=EN&&EN.length===FR.length;
  // 2026-09-22, Ian: an article opens in English when there is an English
  // translation of it, not in the parallel lanes. The toggle is still
  // there, a lane chosen from it holds for the session (LANEPREF), and
  // ?lang= still wins. Articles with no English still open in French.
  const lane=hasEn?"en":"fr";
  const frLen=FR.join(" ").length;
  const heads=FR.map((f,i)=>isHead(f)?i:-1).filter(i=>i>=0);
  const paint=l=>{
    LANE=l;
    let body="";
    if(l==="both"&&hasEn){
      body=FR.map((f,i)=>isHead(f)
        ?`<div class=hpair id=sec${i}><h3>${tok(EN[i])}</h3><div class=hsub>${tok(f)}</div></div>`
        :`<div class=pp id=sec${i}><p class=pen>${cell(EN[i])}</p><p class=pfr>${cell(f)}</p></div>`).join("");
    }else if(l==="en"&&hasEn){
      body=EN.map((p,i)=>`<p id=sec${i}${isHead(FR[i])?' class=shead':''}>${tok(p)}</p>`).join("");
    }else{
      body=FR.map((p,i)=>`<p id=sec${i}${isHead(p)?' class=shead':''}>${tok(p)}</p>`).join("");
    }
    const rows=matches();const ci=rows.findIndex(a=>a[0]===d.id);
    const prev=ci>0?rows[ci-1]:null,next=ci>=0&&ci<rows.length-1?rows[ci+1]:null;
    const olHtml=heads.length>=3?`<span class=outline id=olWrap><button id=olBtn aria-haspopup=true>Contents \u25be</button>
      <div class=ol-pop id=olPop>${heads.map(i=>`<a href="#" data-sec="${i}">${esc(detok((hasEn?EN[i]:FR[i]).replace(/\u27e6[^|]+\|([^\u27e7]+)\u27e7/g,"$1")).slice(0,90))}</a>`).join("")}</div></span>`:"";
    $("#art").innerHTML=`<div class=artbar><button class=mb onclick="closeArt()">\u2039 Dictionary</button><span class=cw>${esc(d.te&&d.te!==d.t?d.te:d.t)}</span></div>
    <div class=artscroll><div class=inner>
      <h1>${esc(d.te&&d.te!==d.t?d.te:d.t)}</h1>
      ${d.te&&d.te!==d.t?`<div class=frlemma>${esc(d.t)}</div>`:""}
      <div class=meta>
        <span class=pnav><button id=pPrev title="Previous article" ${prev?"":"disabled"}>\u2039</button><button id=pNext title="Next article" ${next?"":"disabled"}>\u203a</button></span>
        <span class=lane-t>
          <button data-l=both class="${l==="both"?"on":""}" ${hasEn?"":"disabled"}>\u2225 Both</button>
          <button data-l=en class="${l==="en"?"on":""}" ${hasEn?"":"disabled"}>English</button>
          <button data-l=fr class="${l==="fr"?"on":""}">Fran\u00e7ais</button>
        </span>
        <button class=dtc-bmk id=bmk aria-pressed=false hidden>Bookmark</button>
        ${olHtml}
        <span class=szc><button id=szDn title="Smaller text">A\u2212</button><button id=szUp title="Larger text">A+</button></span>
        ${hasEn?"":'<span class=pend>ENGLISH TRANSLATION IN PROGRESS</span>'}
        ${d.q==="ocr"?'<span class=pend title="Wikisource transcription not yet proofread">RAW OCR TEXT</span>':""}
        <span>${(frLen/1000).toFixed(0)}k chars</span>
      </div>
      ${d.renvoi?`<div class=welcome>A cross-reference entry — it points to <a class=xref data-id="${esc(d.renvoi)}" href="#${esc(d.renvoi)}"><b>the main article</b></a>.</div>`:""}
      <div class=body>${body}</div>
      ${(SEEALSO[d.id]||[]).length?`<div class=seealso><b>Referenced as</b><br>${SEEALSO[d.id].map(esc).join(" · ")}</div>`:""}
      <div class=srcnote>Text: fr.wikisource.org, <i>Dictionnaire de théologie catholique</i> (public domain). Part of the Roman Catholic shelf of The Faith Received.</div>
    </div></div>`;
    $("#art").querySelectorAll("a.xref").forEach(a=>a.onclick=e=>{e.preventDefault();openArt(a.dataset.id);});
    const pv=$("#pPrev"),nx=$("#pNext");
    if(pv&&prev)pv.onclick=()=>openArt(prev[0]);
    if(nx&&next)nx.onclick=()=>openArt(next[0]);
    const ob=$("#olBtn");
    if(ob){ob.onclick=e=>{e.stopPropagation();$("#olPop").classList.toggle("on");};
      $("#olPop").querySelectorAll("a").forEach(a=>a.onclick=e=>{e.preventDefault();
        const t=document.getElementById("sec"+a.dataset.sec);if(t){paragraph=Number(a.dataset.sec);writePlace(paragraph);t.scrollIntoView({block:"start",behavior:"smooth"});}
        $("#olPop").classList.remove("on");});}
    const setSz=v=>{SZ=Math.max(.86,Math.min(1.3,v));try{localStorage.setItem("dtc_sz",SZ);}catch(e){}
      document.documentElement.style.setProperty("--dtcsz",SZ+"rem");};
    $("#szDn").onclick=()=>setSz(SZ-0.06);$("#szUp").onclick=()=>setSz(SZ+0.06);
    const asc=$("#art .artscroll");
    let follow=false,timer=0;
    const current=()=>{const line=asc.getBoundingClientRect().top+16;return [...asc.querySelectorAll('.body [id^="sec"]')].find(n=>n.getBoundingClientRect().bottom>line);};
    const remember=()=>{const n=current();if(n)paragraph=Number(n.id.slice(3));};
    for(const event of ['wheel','touchmove','pointerdown','keydown'])asc.addEventListener(event,()=>{follow=true;},{passive:true});
    asc.tabIndex=0;
    asc.onscroll=()=>{$("#art").classList.toggle("scrolled",asc.scrollTop>10);
      if(timer)return;timer=setTimeout(()=>{timer=0;if(!asc.isConnected||CUR!==d.id||!follow)return;remember();writePlace(paragraph);rememberPlace(d.id,paragraph);},400);};
    $("#art").querySelectorAll(".lane-t button").forEach(b=>b.onclick=()=>{if(!b.disabled){remember();LANEPREF=b.dataset.l;writePlace(paragraph,LANEPREF);paint(b.dataset.l);}});
    /* Bookmark this article. Same store, same id shape and same 200 cap
       as a bookmarked work, so one reader cannot end up with two
       records of the same thing. subscribe() keeps the button honest
       when the same id is un-bookmarked on another surface. */
    const bmk=$("#bmk");
    if(bmk)whenBookmarks(ok=>{
      if(!ok)return;                      // signed out, or not a paid member
      const b=BM(),id=bmId(d.id);
      if(!b||!id)return;
      const show=on=>{bmk.hidden=false;bmk.setAttribute("aria-pressed",on?"true":"false");
        bmk.textContent=on?"Bookmarked":"Bookmark";};
      b.ready().then(()=>{if(CUR===d.id)show(b.has(id)===true);}).catch(()=>{});
      bmk.onclick=()=>{b.toggle(id).then(on=>{if(CUR===d.id)show(!!on);}).catch(()=>{});};
      if(b.subscribe)b.subscribe(()=>{if(CUR===d.id)show(b.has(id)===true);});
    });
    $("#art").classList.remove("scrolled");
    asc.scrollTop=0;
    if(paragraph>0)document.getElementById('sec'+paragraph)?.scrollIntoView({block:'start'});
  };
  paint(LANEPREF&&(LANEPREF==="fr"||hasEn)?LANEPREF:lane);
}
function openArt(id,push){
  const params=new URL(location.href),raw=params.searchParams.get('paragraph');
  const paragraph=push===false&&/^\d+$/.test(raw||'')?Number(raw):0;
  if(push===false&&['both','en','fr'].includes(params.searchParams.get('lang')))LANEPREF=params.searchParams.get('lang');
  if(push!==false){params.searchParams.delete('paragraph');params.hash=encodeURIComponent(id);history.replaceState(history.state,'',params);}
  // Cleared until renderArt sets it again, so nothing selected while the
  // next article loads is attributed to the last one.
  CUR=id;ART=null;paintList();
  rememberPlace(id,paragraph);
  document.body.classList.add("reading");
  $("#art").innerHTML='<div class=inner><div class=welcome>Loading…</div></div>';
  fetch("https://mo-tfr-library.mo-podcast-feed.workers.dev/v1/dictionary/a/"+encodeURIComponent(id)+".json"+VER).then(r=>r.json()).then(d=>{
    if(CUR!==id)return;d.id=id;renderArt(d,paragraph);
    document.title=d.t+" · Dictionary of Catholic Theology";

  }).catch(()=>{$("#art").innerHTML='<div class=artbar></div><div class=artscroll><div class=inner><div class=welcome>Could not load this article.</div></div></div>';});
}
let LISTPOS=0;
// ART goes with it: the closed article's markup stays in #art, and a
// selection made after closing must not be offered as a passage of an
// article the reader is no longer in.
function closeArt(){document.body.classList.remove("reading");CUR=null;ART=null;
  const url=new URL(location.href);url.hash="";url.searchParams.delete("paragraph");history.replaceState(history.state,"",url);
  document.title="Dictionary of Catholic Theology \u00b7 The Faith Received";
  requestAnimationFrame(()=>{$("#list").scrollTop=LISTPOS;paintList();paintResume();});}
$("#list").addEventListener("click",e=>{
  // Keep the reader's place: the repaint appends, so the old scroll offset
  // still points at the row they were looking at.
  if(e.target.closest("#more")){const sc=$("#list").scrollTop;SHOWN+=PAGE;paintList();$("#list").scrollTop=sc;return;}
  const b=e.target.closest(".hw");
  if(b){LISTPOS=$("#list").scrollTop;openArt(b.dataset.id);}});
$("#resume")&&$("#resume").addEventListener("click",e=>{const b=e.target.closest(".rz");
  if(b)openArt(b.dataset.id);});
$("#alpha").addEventListener("click",e=>{const b=e.target.closest("button[data-l]");if(!b||b.disabled)return;
  LETTER=(LETTER===b.dataset.l?null:b.dataset.l);SHOWN=PAGE;paintAlpha();paintList();});
$("#q").addEventListener("input",()=>{QY=$("#q").value;SHOWN=PAGE;paintList();});
fetch("https://mo-tfr-library.mo-podcast-feed.workers.dev/v1/dictionary/index.json"+VER).then(r=>r.json()).then(d=>{
  IDX=d.articles||[];SEEALSO=d.seealso||{};
  paintAlpha();paintList();paintResume();
  const h=decodeURIComponent(location.hash.slice(1));
  if(h)openArt(h,false);
}).catch(()=>{$("#list").innerHTML='<div class=empty>The dictionary index is not published yet.</div>';});
/* ── Highlight → Save to notebook ─────────────────────────────────────
   Ported from buildSelectionSave() in assets/js/faith-reader-tools.js,
   which is the reader's version of this act, so that keeping a passage
   of an article is the same gesture and the same button as keeping a
   passage of a work. The button's class is styled site-wide in
   faith-received.css; nothing new is needed for it here.

   Gated since 2026-09-24 (Ian: every door to a research tool meets the
   subscribe pop-up). The article stays public; keeping a passage from it
   is the Notebook, and the reader's Save is gated the same way. A reader
   without an account gets feature-gate.js's modal, not a save.

   KNOWN, and accepted: MOFaithNotebook's constellation share encodes
   only the four sister corpora (tfr · pld · po · pg), so a dictionary
   entry lists and links in the notebook but does not ride along in a
   share link. */
function dtcSelectionSave(){
  const pop=document.createElement("button");
  pop.type="button";
  pop.className="faith-save-pop";
  pop.setAttribute("data-feature-gate","tfr-notebook");
  pop.hidden=true;
  pop.textContent="Save to notebook";
  document.body.appendChild(pop);
  let pending=null;
  const hide=()=>{pop.hidden=true;pending=null;};
  // Only on an empty selection: the popover has to survive the mouseup
  // that produced it.
  document.addEventListener("selectionchange",()=>{
    const sel=window.getSelection();
    if(!sel||sel.isCollapsed)hide();
  });
  /* A mousedown outside the selection collapses it, selectionchange
     then hides the button, and `pending` is null by the time the click
     runs — the button does nothing and the reader cannot tell why.
     Refusing the default keeps the selection alive through the click. */
  pop.addEventListener("mousedown",e=>{e.preventDefault();});
  function offer(){
    const nb=NB();
    const inner=document.querySelector("#art .artscroll .inner");
    // No store yet, no article open, or an article still loading: the
    // welcome text and the headword list are not passages of anything.
    if(!nb||!inner||!ART)return hide();
    const sel=window.getSelection();
    if(!sel||sel.isCollapsed||!sel.rangeCount)return hide();
    const range=sel.getRangeAt(0);
    if(!inner.contains(range.commonAncestorContainer))return hide();
    /* The range, not the selection: Selection.toString() returns empty
       when the document does not have focus, which is every automated
       check of this feature and some real ones. */
    const text=range.toString().trim();
    if(text.length<4)return hide();
    /* A selection running across two paragraphs is cited to the first,
       which is where a reader would cite it from. The stored index is
       the block's own, the printed one counts from 1, because there is
       no paragraph nought on a page. */
    const n=paraIndex(range.startContainer);
    pending=nb.newEntry({
      kind:nb.KINDS.SELECTION,
      corpus:DTC_CORPUS,
      work:ART.id,
      title:ART.head,
      cite:ART.head+", paragraph "+(n+1),
      anchor:"sec"+n,
      url:articleUrl(ART.id,n,LANE),
      text
    });
    const r=range.getBoundingClientRect();
    pop.hidden=false;
    pop.style.top=Math.max(8,r.top+window.scrollY-42)+"px";
    pop.style.left=Math.max(8,r.left+window.scrollX)+"px";
    return undefined;
  }
  // A beat after the event: the selection is not final until the browser
  // has finished with the gesture that made it.
  const offerSoon=()=>window.setTimeout(offer,10);
  /* On the document, not on the article: paint() replaces #art whole on
     every lane switch, and a selection that ends outside the article is
     a mouseup outside it. Containment is decided above, by the range. */
  document.addEventListener("mouseup",offerSoon);
  // A phone selects by long-press and drag and never fires mouseup.
  document.addEventListener("touchend",offerSoon);
  // A keyboard selects with shift+arrows, which is neither. Not while
  // the reader is typing in the search field: Shift is also how a
  // capital letter gets in there.
  document.addEventListener("keyup",e=>{
    if(!e.shiftKey&&e.key!=="Shift")return;
    const t=e.target;
    if(t&&t.closest&&t.closest("input, textarea, select, [contenteditable]"))return;
    offerSoon();
  });
  pop.addEventListener("click",()=>{
    const nb=NB();
    if(!pending||!nb)return;
    nb.add(pending);
    pop.textContent="Saved";
    window.setTimeout(()=>{pop.textContent="Save to notebook";hide();},900);
  });
}
dtcSelectionSave();
