/* PL presentation metadata derived from canonical TEI. Never rewrite source prose. */
(function(root){
  'use strict';
  const text=node=>String(node?.textContent||'').replace(/\s+/g,' ').trim();
  const lang=node=>node?.getAttribute('xml:lang')||'';
  const column=node=>node?.localName==='milestone'&&node.getAttribute('unit')==='column';
  function repeatsHeading(source,p){
    if(text(p)===source)return true;
    // Some PL proposition paragraphs are wholly bold and add print note numbers
    // absent from the structural head (Alain XIX: 31, 32). Only suppress the
    // synthetic head; preserve every character of that complete paragraph.
    const children=Array.from(p?.children||[]),bold=children.length===1&&children[0].localName==='hi'
      &&children[0].getAttribute('rend')==='bold'&&text(children[0])===text(p);
    if(!bold||/\d/.test(source))return false;
    const fold=s=>s.replace(/\s+/g,' ').replace(/\s+([,.;:])/g,'$1').trim();
    return fold(text(p).replace(/\b\d+\b/g,''))===fold(source);
  }
  function heading(head){
    const source=text(head);let next=head.nextElementSibling,companion=null,rawColumn='';
    // A translation and column marker can occur in either order before the body.
    while(next&&(column(next)||(next.localName==='head'&&lang(next)==='en'&&lang(head)!=='en'&&!companion))){
      if(column(next)){if(!rawColumn)rawColumn=next.getAttribute('n')||'';}
      else companion=next;
      next=next.nextElementSibling;
    }
    const p=next,translation=p?.nextElementSibling,id=p?.getAttribute('xml:id');
    const repeated=!!(source&&lang(head)!=='en'&&p?.localName==='p'&&lang(p)!=='en'&&repeatsHeading(source,p)
      &&id&&translation?.localName==='p'&&lang(translation)==='en'
      &&translation.getAttribute('corresp')==='#'+id&&text(translation));
    return {source:lang(head)==='en'?'':source,
      english:repeated?text(translation):companion?text(companion):lang(head)==='en'?source:'',
      companion,rawColumn,repeated};
  }
  function introduction(heads,toPage){
    const list=Array.from(heads);
    if(!list.some(h=>/\bPRAENOTATIONES\b/i.test(text(h))))return null;
    // A real book heading, not CAP. I in a prefatory paragraph of summaries.
    const book=list.find(h=>/\bSENTENTIARUM LIBER PRIMUS\b/i.test(text(h)));
    if(!book)return null;
    const chapter=list.find(h=>h.parentElement?.parentElement===book.parentElement&&/^CAPUT II\./i.test(text(h)));
    const target=(h,label)=>{if(!h)return null;const info=heading(h),page=toPage(info.rawColumn);
      return page?{page,title:info.english||info.source,label}:null;};
    const start=target(book,'Read Book I');if(!start)return null;
    return {end:start.page,targets:[start,target(chapter,'Read Chapter II')].filter(Boolean)};
  }
  const api={heading,introduction};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FRPldReading=api;
})(typeof window==='object'?window:globalThis);
