
/* reveal — gentle staggered fade-up on static furniture (family design elevation).
   Dynamic surfaces (results, ask turns) are never revealed. */
(function(){
  'use strict';
  if(!('IntersectionObserver' in window))return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var SEL=['.search-box','.smodes-wrap'].join(',');
  var els;
  try{els=Array.prototype.slice.call(document.querySelectorAll(SEL));}catch(e){return;}
  els=els.filter(function(el){return el.offsetWidth||el.offsetHeight;});
  if(!els.length)return;
  var io=new IntersectionObserver(function(entries){
    var seen=0;
    entries.forEach(function(en){
      if(!en.isIntersecting)return;
      en.target.style.setProperty('--rv-d',Math.min(seen*75,450)+'ms');seen++;
      en.target.classList.add('rv-in');
      io.unobserve(en.target);
    });
  },{rootMargin:'0px 0px -7% 0px',threshold:.04});
  els.forEach(function(el){el.classList.add('rv');io.observe(el);});
})();
/* SAVE TO NOTEBOOK (2026-09-10 "save works … specific passages, on all surfaces"): every result that opens the reader
   gets a star — a work (no page) or a passage (a page) — through FRResearchNotebook only. */
(function(){const N=()=>window.FRResearchNotebook;
function paint(button){const page=button.getAttribute('data-page'),on=!!N()?.hasReference(button.dataset.slug,page);button.setAttribute('aria-pressed',String(on));button.textContent=(on?'Unsave ':'Save ')+(page!=null?'passage':'work');}
function decorate(root){(root.querySelectorAll?root.querySelectorAll('a.sr:not([data-starred])'):[]).forEach(a=>{a.dataset.starred='1';const ref=FRSearch.readerLink(a.getAttribute('href'),location.origin);if(!ref)return;const wrapper=document.createElement('article');wrapper.className='search-result';a.parentNode.insertBefore(wrapper,a);wrapper.appendChild(a);const button=document.createElement('button');button.type='button';button.className='search-save';button.dataset.slug=ref.slug;if(ref.page!=null)button.dataset.page=ref.page;paint(button);button.onclick=async()=>{const n=N();if(!n)return;button.disabled=true;try{const w=WORKS_BY_SLUG?.[ref.slug]||{},title=w.title_en||w.title||ref.slug,author=w.author||'';if(n.hasReference(ref.slug,ref.page))await n.unsave(ref.slug,ref.page);else if(ref.page!=null)await n.savePassage({slug:ref.slug,page:ref.page,title,author,label:a.querySelector('.sr-ex')?.textContent||'',url:rdHref(ref.slug,ref.page)});else await n.saveWork({slug:ref.slug,title,author});paint(button);}catch(error){button.textContent='Save failed. Try again';button.title=error.message;}finally{button.disabled=false;}};wrapper.appendChild(button);});}
window.addEventListener('fr-notebook-updated',()=>document.querySelectorAll('.search-save').forEach(paint));decorate(document);new MutationObserver(()=>decorate(res)).observe(res,{childList:true,subtree:true});})();
