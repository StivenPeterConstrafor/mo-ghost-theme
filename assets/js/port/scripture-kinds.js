/* SCRIPTURE KINDS — one rule for every surface (owner 2026-09-26: allusions matter on "every surface": the research rail, the
   verse and Scripture desks, work pages, rooms). The same rule, in the same order, as tools/mine/bookmap.py how_kind()
   (tools/mine/test_scripture_kinds.py holds them together). The miner may write only quotation | explicit | allusion; its free
   text is read as: the model's own 'explicit', then a quotation, then an allusion (echo, implicit, paraphrase), then an
   exposition of the verse (exegesis, exposition, commentary — a commentary's lemma), else a citation by name. */
(function(root){
  'use strict';
  const KINDS=['quotation','explicit','allusion','exegesis'];
  function kind(h){
    const s=String(h??'').trim().toLowerCase();
    if(KINDS.includes(s))return s;
    if(!s)return '';
    if(/\bexplicit\b/.test(s))return 'explicit';
    if(/\bquot/.test(s))return 'quotation';
    if(/allusi|alludes|\becho|implicit|implied|paraphras/.test(s))return 'allusion';
    if(/exeges|exposit|expound|commentar|lemma/.test(s))return 'exegesis';
    return 'explicit';
  }
  const VERB={quotation:'quotes',explicit:'cites',allusion:'alludes',exegesis:'expounds','':'cites'};
  const NOUN={quotation:'Quotation',explicit:'Citation',allusion:'Allusion',exegesis:'Exposition','':'Citation'};
  const PLURAL={quotation:'Quotations',explicit:'Citations',allusion:'Allusions',exegesis:'Expositions'};
  const TITLE={quotation:'Quoted in its words',explicit:'Cited by book and chapter',allusion:'Alluded to: the verse echoed without a citation',exegesis:'Expounded: the page comments on the verse',
    '':'Cited'};
  root.FRScriptureKind={
    KINDS, kind,
    verb:h=>VERB[kind(h)],            // quotes · cites · alludes · expounds
    noun:h=>NOUN[kind(h)],            // Quotation · Citation · Allusion · Exposition
    plural:k=>PLURAL[k]||'',
    n:(k,n)=>(n===1?NOUN[k]:PLURAL[k]||NOUN[k]).toLowerCase(),   // '1 exposition', '268 allusions'
    title:h=>TITLE[kind(h)]||'',
    order:h=>{const k=kind(h);return k?KINDS.indexOf(k):1;},
    // counts by kind over rows ({how}), in the fixed order, kinds with no rows left out
    counts:rows=>{const n=new Map(KINDS.map(k=>[k,0]));for(const r of rows||[]){const k=kind(r&&r.how)||'explicit';n.set(k,n.get(k)+1);}return KINDS.filter(k=>n.get(k)).map(k=>[k,n.get(k)]);}
  };
})(typeof window!=='undefined'?window:globalThis);
