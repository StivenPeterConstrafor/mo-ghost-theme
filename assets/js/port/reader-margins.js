/* Marginalia are apparatus, not parallel-text rows. Keep every original note in
   place and expose it through a compact control after the canonical DOM renders. */
(function(){
  'use strict';
  const root=document.getElementById('reading');if(!root)return;
  const sheet=document.createElement('section');sheet.id='readerMarginPopover';
  sheet.setAttribute('popover','auto');sheet.setAttribute('role','dialog');sheet.setAttribute('aria-labelledby','readerMarginTitle');
  sheet.innerHTML='<header class="rm-panel-head"><div><h2 id="readerMarginTitle">Margin notes</h2><p class="rm-context"></p></div><button type="button" class="rm-close" aria-label="Close margin notes">Close</button></header><div class="rm-panel-body"></div>';
  document.body.appendChild(sheet);
  const native=typeof sheet.showPopover==='function';let active=null,queued=false;
  // A margin note that is only the print's paragraph number or a margin-link letter ("12.", "n. 12", "XIV.", "b") is not a
  // note to open: its control led to a panel holding the number alone (owner 09-30 on Scotus, Opera t. 8 p. 369: "i click
  // this it nothing shows"; 67 of that volume's 235 margin notes). It keeps its place in the text for print and copy.
  const BARE=/^[\[(]?(?:[nN](?:um)?\.?\s*|§\s*)?(?:\d{1,4}[a-z]?|[IVXLCDM]{1,8}|[a-zA-Z])[\])]?\s*[.,;:]?$/;
  // Nor is a run of word ends the reading cut at the line edge ("Me- in- Me- fi-", Scheibler, Metaphysica p. 52) or of margin
  // letters ("B C"): scraps of the print, not notes.
  const SHRED=/^(?:\S{1,4}[-\u2010](?:\s+|$)){2,}$|^(?:[a-zA-Z](?:\s+|$)){2,}$/;
  const eligible=note=>{const t=note.textContent.trim();return !!t&&!BARE.test(t)&&!SHRED.test(t)&&!note.matches('.headnote,.edinl')&&!note.closest('.edblock');};
  const notesIn=host=>host.matches('.mnote')?[host]:Array.from(host.children).filter(e=>e.matches('.mnote')&&eligible(e));
  // A .mnin is the notes that stood at one point of the text, set inline there by the reader (owner 2026-10-11: "margin notes
  // dont cause new lines and are tastefully integrated"). One mark opens them all; where the reading area is wide (railok) the
  // notes themselves stand in the outer margin beside their line and the mark is not drawn.
  function sourcePage(node){
    const row=node.closest('.row[id]');
    let page=(row?.id.match(/^b(.+)-\d+$/)||[])[1]||node.closest('.folio')?.dataset.page;
    const lane=node.closest('.en,.la,.stk-en,.stk-la');
    if(lane)for(const anchor of lane.querySelectorAll('.pganchor[data-page]')){
      // A continuous section can contain several original page boundaries.
      if(anchor.compareDocumentPosition(node)&4)page=anchor.dataset.page;
    }
    return page;
  }
  const shown=()=>native?sheet.matches(':popover-open'):sheet.classList.contains('rm-open');
  function close(restore=true){if(native){if(sheet.matches(':popover-open'))sheet.hidePopover();}else sheet.classList.remove('rm-open');if(active){active.setAttribute('aria-expanded','false');if(restore&&active.isConnected)active.focus({preventScroll:true});}}
  function open(button,host){
    const notes=notesIn(host);if(!notes.length)return;document.dispatchEvent(new CustomEvent('fr-apparatus-open',{detail:{kind:'margin'}}));
    if(active&&active!==button)active.setAttribute('aria-expanded','false');active=button;
    const first=notes[0],page=sourcePage(first),language=first.closest('.en,.stk-en')?'English':window.__SRCNAME||'Original text';
    sheet.querySelector('.rm-context').textContent=[page!=null?'Page '+page:'',language,notes.length+' '+(notes.length===1?'note':'notes')].filter(Boolean).join(' · ');
    const body=sheet.querySelector('.rm-panel-body');body.replaceChildren();
    for(const note of notes){const article=document.createElement('article');article.className='rm-note';article.lang=note.closest('[lang]')?.lang||'';
      for(const child of note.childNodes)article.appendChild(child.cloneNode(true));
      article.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
      article.querySelectorAll('a[href]').forEach(a=>{try{if(!['http:','https:'].includes(new URL(a.getAttribute('href'),location.href).protocol))a.removeAttribute('href');}catch(_){a.removeAttribute('href');}});
      body.appendChild(article);
    }
    button.setAttribute('aria-expanded','true');
    if(native){if(!sheet.matches(':popover-open'))sheet.showPopover({source:button});}else sheet.classList.add('rm-open');
    sheet.querySelector('.rm-close').focus({preventScroll:true});
  }
  function marker(host,notes,inline){
    const within=inline==='in';
    let button=inline&&!within?host.previousElementSibling:host.querySelector(':scope > .rm-marker');
    if(!button?.matches('.rm-marker')){button=document.createElement('button');button.type='button';button.className='rm-marker'+(inline?' rm-inline':'');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',sheet.id);button.setAttribute('aria-expanded','false');
      /* MereO delta (Ian, 2026-09-21: "buttons that open but don't close"). The
         marker carries aria-expanded, so it says it is a toggle, and it was bound
         straight to open(): pressing it again rebuilt the same sheet in place and
         nothing appeared to happen. Measured on eebo-266, which carries 157 of
         these markers; three presses in a row all left it open.
         WHY THE STATE IS READ AT POINTERDOWN. The sheet is popover=auto, and the
         browser's own light dismiss runs at the document on pointerdown, before
         this click. By the time a click handler could ask, the sheet is already
         hidden, a toggle reads "closed" and re-opens it: closed and re-opened
         inside one press, which looks exactly like a button that does nothing.
         The press is judged from what was true when it began. Keyboard activation
         sends no pointerdown and no light dismiss, so it reads the state directly. */
      let armed=false;
      button.addEventListener('pointerdown',()=>{armed=active===button&&shown();});
      button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();
        const shut=e.detail===0?(active===button&&shown()):armed;armed=false;
        if(shut){close();return;}
        open(button,host);});if(inline&&!within)host.before(button);else host.prepend(button);}
    const label=notes.length===1?'Margin note':'Margin notes';const count=notes.length>1?' '+notes.length:'';
    let full=button.querySelector('.rm-marker-label');
    if(!full){full=document.createElement('span');full.className='rm-marker-label';const compact=document.createElement('span');compact.className='rm-marker-compact';compact.setAttribute('aria-hidden','true');compact.textContent='note';button.replaceChildren(full,compact);}
    if(full.textContent!==label+count)full.textContent=label+count;
    {const compact=button.querySelector('.rm-marker-compact'),word=notes.length>1?'notes':'note';if(compact&&compact.textContent!==word)compact.textContent=word;}
    const page=sourcePage(host);
    button.setAttribute('aria-label','Read '+label.toLowerCase()+(page!=null?' on page '+page:'')+(notes.length>1?', '+notes.length+' notes':''));
    button.title=button.getAttribute('aria-label');
    notes.forEach(note=>note.classList.add('rm-original'));
  }
  // The margin column is 224px of a 1600px screen, and it was reserved for every
  // work the moment this module loaded, before anything asked whether the work had
  // margin notes. Migne's do not: a Patrologia carries its apparatus as editorial
  // notes printed at their own column, not as inline <note>s, so every one of the
  // 12,000 of them held a quarter of the page open for notes that were never
  // coming. Reserve it when there is something to put in it, and give the space
  // back when there is not — re-asked on every pass, so a work that gains notes
  // when a later section loads gets its column then.
  function reserve(){document.documentElement.classList.toggle('fr-margin-notes', !!root.querySelector('.rm-marker'));rail();}
  // ROOM BESIDE THE COLUMN. The notes stand in the outer margin only where the page leaves that margin empty: measured from the
  // text column to the edge of the reading pane (the pane, not the window: the contents panel and the scan sit beside it), on
  // each side for its own lane. A rail narrower than 6.5rem would wrap a reference word by word, so below that the marks stay.
  function rail(){
    const html=document.documentElement,any=!!root.querySelector('.mnin > .rm-marker');
    const em=parseFloat(getComputedStyle(html).fontSize)||16,gap=1.25*em+10,min=6.5*em,max=10*em;
    const pane=(root.parentElement||root).getBoundingClientRect();
    // measured on the cells that hold notes (rows differ: a facing-columns row is narrower than a full one), the widest of them
    const cells={la:new Set(),en:new Set()};
    if(any)for(const g of Array.from(root.querySelectorAll('.mnin > .rm-marker')).slice(0,400)){const c=g.parentElement.closest('.la,.en,.stk-la,.stk-en');if(c)cells[c.matches('.la,.stk-la')?'la':'en'].add(c);}
    const side=(set,left)=>{let edge=null;
      for(const c of set){if(ro)ro.observe(c);const b=c.getBoundingClientRect();if(!b.width)continue;edge=edge==null?(left?b.left:b.right):(left?Math.min(edge,b.left):Math.max(edge,b.right));}
      if(edge==null)return 0;const room=(left?edge-pane.left:pane.right-edge)-gap;return room>=min?Math.min(room,max):0;};
    const L=side(cells.la,true),R=side(cells.en,false);
    html.classList.toggle('fr-mn-railL',!!L);html.classList.toggle('fr-mn-railR',!!R);
    // each page is paint-contained (content-visibility:auto) and would clip a gloss standing outside it, so the page's box
    // reaches out over the margin by as much as the gloss needs; its text keeps its measure
    const rb=root.getBoundingClientRect(),rs=getComputedStyle(root),inL=rb.left+parseFloat(rs.paddingLeft||0),inR=rb.right-parseFloat(rs.paddingRight||0);
    const reach=(set,left,w)=>{let e=null;for(const c of set){const b=c.getBoundingClientRect();if(!b.width)continue;e=e==null?(left?b.left:b.right):(left?Math.min(e,b.left):Math.max(e,b.right));}
      return e==null?0:Math.max(0,Math.ceil(left?inL-(e-1.25*em-w-4):(e+1.25*em+w+4)-inR));};
    if(L){html.style.setProperty('--rm-railL',Math.floor(L)+'px');html.style.setProperty('--rm-extL',reach(cells.la,true,Math.floor(L))+'px');}
    if(R){html.style.setProperty('--rm-railR',Math.floor(R)+'px');html.style.setProperty('--rm-extR',reach(cells.en,false,Math.floor(R))+'px');}
  }
  let railQ=0;const railSoon=()=>{cancelAnimationFrame(railQ);railQ=requestAnimationFrame(rail);};
  addEventListener('resize',railSoon,{passive:true});
  const ro=window.ResizeObserver?new ResizeObserver(railSoon):null;if(ro){ro.observe(root);if(root.parentElement)ro.observe(root.parentElement);}
  function enhance(){queued=false;
    root.querySelectorAll('.mnp:not(.edblock)').forEach(host=>{const notes=notesIn(host);if(!notes.length||host.querySelector('.headnote,.edinl'))return;marker(host,notes,false);host.classList.add('rm-group');});
    // a group of nothing but paragraph numbers and margin letters gets no mark (they keep their place for print and copy)
    root.querySelectorAll('.mnin').forEach(host=>{const notes=notesIn(host);host.classList.toggle('rm-bare',!notes.length);if(notes.length)marker(host,notes,'in');});
    root.querySelectorAll('.mnote').forEach(note=>{if(!eligible(note)||note.parentElement.classList.contains('rm-group')||note.parentElement.classList.contains('mnin'))return;marker(note,[note],true);});
    // a group holding nothing but such numbers gets no control and leaves no empty ruled box behind
    root.querySelectorAll('.mnp:not(.edblock):not(.rm-group):not(.rm-bare)').forEach(host=>{const kids=Array.from(host.children);
      if(kids.length&&kids.every(e=>e.matches('.mnote')&&!e.matches('.headnote,.edinl')&&!eligible(e))&&!Array.from(host.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()))host.classList.add('rm-bare');});
    reserve();
  }
  sheet.querySelector('.rm-close').onclick=()=>close(true);
  // in the outer margin a long gloss is cut short; the gloss itself opens the full notes
  root.addEventListener('click',e=>{const note=e.target.closest?.('.mnin > .rm-original');if(!note||!document.documentElement.matches('.fr-mn-railL,.fr-mn-railR'))return;
    const host=note.parentElement,button=host.querySelector(':scope > .rm-marker');if(!button)return;e.preventDefault();
    if(active===button&&shown()){close(false);return;}open(button,host);});
  document.addEventListener('fr-apparatus-open',e=>{if(e.detail?.kind&&e.detail.kind!=='margin')close(false);});
  sheet.addEventListener('toggle',e=>{if(e.newState==='closed'&&active)active.setAttribute('aria-expanded','false');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(!native&&sheet.classList.contains('rm-open')||native&&sheet.matches(':popover-open'))){e.preventDefault();e.stopImmediatePropagation();close();}},true);
  if(!native)document.addEventListener('pointerdown',e=>{if(sheet.classList.contains('rm-open')&&!sheet.contains(e.target)&&!e.target.closest('.rm-marker')){sheet.classList.remove('rm-open');active?.setAttribute('aria-expanded','false');}});
  enhance();
  new MutationObserver(records=>{if(queued||!records.some(r=>Array.from(r.addedNodes).some(n=>n.nodeType===1&&(n.matches('.mnote,.mnp,.mnin')||n.querySelector('.mnote')))))return;queued=true;requestAnimationFrame(enhance);}).observe(root,{childList:true,subtree:true});
})();
