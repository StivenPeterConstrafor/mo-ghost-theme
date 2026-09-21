/* Collected-volume contents, taken from the published reader outlines. */
(function(){
  'use strict';
  const url=document.currentScript?.dataset.contents;
  let works={};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reader=(slug,page)=>`/the-faith-received/read/?w=${encodeURIComponent(slug)}${page==null?'':`&p=${encodeURIComponent(String(page))}#b${encodeURIComponent(String(page))}-0`}`;
  function excerpt(value){const text=String(value||'').replace(/\s+/g,' ').trim();return text.length<=260?text:`${text.slice(0,257).replace(/\s+\S*$/,'')}…`;}
  const api={
    ready:url?fetch(url).then(r=>{if(!r.ok)throw Error('Contents unavailable');return r.json();}).then(d=>{works=d.works||{};}).catch(()=>{}):Promise.resolve(),
    get:slug=>works[slug]||null,
    search(slug){const w=works[slug];return w?[w.summary,...w.sections.map(s=>s.title)].join(' '):'';},
    preview(slug){const w=works[slug];return w?.summary?`<span class="frcw-preview"><span>Includes: </span>${esc(excerpt(w.summary))}</span>`:'';},
    disclosure(slug){const w=works[slug];if(!w)return '';
      if(!w.sections.length)return '<p class="frcw-unindexed">Section links are not yet available for this volume.</p>';
      return `<details class="frcw-contents"><summary>View contents <span>(${w.sections.length}${w.sections.length===1?' section':' sections'})</span></summary><div class="frcw-pane"><p class="frcw-note">Main sections from the reader’s contents.</p><ol class="frcw-list">${w.sections.map(s=>`<li><div><a class="frcw-link" href="${esc(reader(slug,s.page))}"><span>${esc(s.title)}</span><small>p. ${esc(s.page)}</small></a></div></li>`).join('')}</ol></div><a class="frcw-reader" href="${esc(reader(slug))}">Open full reader contents</a></details>`;
    }
  };
  window.MOCollectedContents=api;
})();
