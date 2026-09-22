/* Shared presentation policy for the Ghost library. Source records stay intact.
 * This removes a withdrawn work from the UI; server/storage withdrawal remains
 * necessary to revoke direct access outside the theme.
 */
(function (root) {
  'use strict';
  const withdrawn = new Set(['westminster-assembly-minutes-vol-1']);
  const fold = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const publicWork = value => !withdrawn.has(String(typeof value === 'object' && value ? value.slug || value.id || value.w || value.work || '' : value || ''));
  let aliases = {}, keys = new Map(), duplicates = {}, workgroups = {}, canonical = null, canonicalBySlug = new Map(), groupDefinitions = {}, witnessRelations = new Map();
  const libraryIds = ['pg','pld','po','tfr','eebo','mo'];
  const corpusOf = slug => /^(pg|pld|po|eebo)-\d+$/.exec(slug)?.[1] || 'tfr';
  function setCanonical(data) { canonical = data.works || []; canonicalBySlug = new Map(canonical.map(work => [work.slug, work])); }
  const workSlug = work => typeof work !== 'object' ? String(work || '') : ['eebo','pld','pg','po'].includes(work.corpus) && !String(work.id).startsWith(`${work.corpus}-`) ? `${work.corpus}-${work.id}` : String(work.slug || work.id || '');
  function setWorkIdentity(fold, groups) { duplicates = fold || {}; workgroups = groups?.works || {}; groupDefinitions = groups?.groups || {}; }
  const displayWork = work => publicWork(work) && (!duplicates[workSlug(work)] || Boolean(workgroups[workSlug(work)]) || Boolean(witnessRelations.get(workSlug(work))?.distinct));
  function setRelations(data) {
    witnessRelations = new Map();
    for (const group of data?.duplicates || []) {
      if (group.kind !== 'edition') continue;
      const keep = Array.isArray(group.keep) ? group.keep : [group.keep];
      const others = group.others || [];
      for (const slug of keep.filter(Boolean)) witnessRelations.set(slug, {label:keep.length === 1 && others.length === 1 ? 'Second witness held' : 'Alternate edition held', exact:keep.length === 1 && others.length === 1, distinct:true, family:group.work});
      for (const slug of others) witnessRelations.set(slug, {label:keep.length + others.length === 2 ? 'Second witness' : 'Alternate edition', exact:keep.length + others.length === 2, distinct:true, family:group.work});
    }
    for (const group of data?.complementary_witnesses || []) {
      const fac = group.fac || [], dig = group.dig || [];
      const family = `witness:${group.author || ''}:${group.title || ''}`;
      for (const [members, other, format, label] of [[fac,dig,'Facsimile',fac.length === 1 && dig.length === 1 ? 'Digital witness held' : 'Related born-digital edition'],[dig,fac,'Born-digital text',fac.length === 1 && dig.length === 1 ? 'Facsimile witness held' : 'Related facsimile edition']]) {
        for (const slug of members) if (other.length) {
          const previous = witnessRelations.get(slug);
          witnessRelations.set(slug,{...previous,label:previous?.exact ? previous.label : label,exact:!!previous?.exact || fac.length === 1 && dig.length === 1,distinct:true,family,format});
        }
      }
    }
  }
  function metadata(work) {
    const slug = workSlug(work), original = canonicalBySlug.get(slug) || {};
    const row = typeof work === 'object' && work ? {...original, ...work} : original;
    const group = workgroups[slug], edition = group && groupDefinitions[group.g]?.editions?.[group.ed];
    const volume = String(row.volumeLabel || original.volume || row.volume || '').trim();
    const editionLabel = String(edition || row.edition_label || (typeof row.edition === 'string' ? row.edition : '') || '').trim();
    const scanned = row.has_pages === true || Number(row.pdf_pages) > 0 || row.hasFacsimile === true;
    let format = scanned ? 'Facsimile' : row.has_pages === false || row.hasFacsimile === false ? 'Digital text' : '';
    const witness = witnessRelations.get(slug);
    if (witness?.format) format = witness.format;
    const extent = Number(original.n_pages || row.extent) || 0;
    return {family:witness?.family || '', extent, extentLabel:extent && format ? `${extent.toLocaleString()} ${format === 'Facsimile' ? 'pages' : 'sections'}` : '', volume, edition:editionLabel, format, witness:witness?.label || '', witnessExact:!!witness?.exact, labels:[volume,editionLabel && editionLabel !== volume ? editionLabel : '',format,witness?.label].filter(Boolean)};
  }
  const escapeText = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function metadataHTML(work, options = {}) {
    const meta = metadata(work), lines = [options.hideVolume ? '' : meta.volume,meta.edition,options.hideExtent ? '' : meta.extentLabel].filter(Boolean);
    return (lines.length ? `<span class="faith-work-edition">${lines.map(escapeText).join(' · ')}</span>` : '') +
      (meta.format || meta.witness ? `<span class="faith-work-witnesses">${meta.format ? `<span>${escapeText(meta.format)}</span>` : ''}${meta.witness ? `<span${!meta.witnessExact ? ' title="Related edition in this set; coverage can differ by volume."' : ''}>${escapeText(meta.witness)}</span>` : ''}</span>` : '');
  }
  const preferredAuthors = {'Irenaeus of Lyons':'Irenaeus of Lyon','Maran, Prudent':'Prudent Maran','Fabricius, Johann Albert':'Johann Albert Fabricius','Cave, William':'William Cave'};
  function setAliases(data) {
    aliases = data.aliases || {};
    keys = new Map(Object.entries({...aliases, ...preferredAuthors}).map(([before, after]) => [fold(before), fold(preferredAuthors[after] || after)]));
  }
  const authorName = value => { const name = aliases[value] || String(value || ''); return preferredAuthors[name] || name; };
  const authorKey = value => keys.get(fold(value)) || fold(value);
  function normalize(works) {
    return works.filter(displayWork).map(work => ({...work, authorOriginal:work.authorOriginal || work.author, author:authorName(work.author)}));
  }
  function catalogue(corpus, original) {
    if (corpus === 'mo') return normalize(original).map(work => ({...work, tradition:work.tradition === 'Reformed' ? 'Continental Reformed' : work.tradition, supplement:true}));
    if (corpus === 'confessions' || !canonical) return normalize(original);
    const old = new Map(original.map(w => [workSlug(w), w]));
    return normalize(canonical.filter(w => corpusOf(w.slug) === corpus).map(w => {
      const previous = old.get(w.slug) || {};
      const series = /^(?:PL|PG|PO)(?:\s+Tome)?\s+(\d+)/i.exec(w.volume || '');
      const volume = series ? series[1] : String(w.volume || '');
      return {...previous, corpus, id:corpus === 'tfr' ? w.slug : w.slug.replace(`${corpus}-`, ''),
        slug:w.slug, title:w.title_en || w.title, titleLatin:w.title_en && w.title_en !== w.title ? w.title : previous.titleLatin || '',
        volumeLabel:w.volume || previous.volumeLabel || '', has_pages:w.has_pages, hasFacsimile:typeof w.has_pages === 'boolean' ? w.has_pages : previous.hasFacsimile, edition:w.edition || previous.edition || '',
        author:aliases[previous.author]?.includes(' (') ? authorName(previous.author) : w.author_en || w.author, volume, tradition:w.tradition === 'Reformed' ? 'Continental Reformed' : w.tradition, party:w.party || '',
        eyebrow:series ? w.volume : w.tradition, extent:w.n_pages || previous.extent || 0,
        order:w.po ?? previous.order, cols:w.cols || previous.cols, kind:w.kind || previous.kind,
        url:`/the-faith-received/read/?w=${encodeURIComponent(w.slug)}`,
      };
    }));
  }
  function authorGroup(name, works = []) {
    const anthology = /^(PG|PL|PO)\s+(\d+)\s*\(anthology\)$/i.exec(name);
    if (anthology) return {kind:'collection', label:`${anthology[1].toUpperCase()} ${anthology[2]}: collected and editorial material`};
    if (/^(?:Anonymous|Unknown author|Uncertain author|Unattributed)(?:$|\s*\()/i.test(name)) return {kind:'unattributed', label:name};
    if (works.length && works.every(w => ['preface','apparatus'].includes(w.kind))) return {kind:'editorial', label:name};
    return {kind:'author', label:name};
  }
  function countLabel(works) {
    const extra = works.filter(work => work.supplement).length, core = works.length - extra;
    const base = core ? `${core.toLocaleString()} work${core === 1 ? '' : 's'}` : '';
    const added = extra ? `${extra.toLocaleString()} English edition${extra === 1 ? '' : 's'}` : '';
    return [base, added].filter(Boolean).join(' + ') || '0 works';
  }
  const loaded = new Map();
  let ready = Promise.resolve();
  const api = {publicWork, displayWork, workSlug, authorName, authorKey, normalize, setAliases, setWorkIdentity, setCanonical, setRelations, metadata, metadataHTML, catalogue, libraryIds, countLabel, authorGroup,
    load(id) {
      if (!loaded.has(id)) loaded.set(id, Promise.all([root.MOCorpora.load(id), ready]).then(([works]) => catalogue(id, works)));
      return loaded.get(id);
    },
  };
  root.MOFaithCatalogue = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root.document || !root.location.pathname.startsWith('/the-faith-received/')) return;
  const readJSON = url => fetch(url, {cache:'no-cache'}).then(response => { if (!response.ok) throw Error('Catalogue identity unavailable'); return response.json(); });
  const libraryBase = 'https://mo-tfr-library.mo-podcast-feed.workers.dev';
  ready = Promise.all([
    readJSON('/assets/data/faith-received/english-author-aliases.json?v=20260920a'),
    readJSON(`${libraryBase}/v1/dupfold.json`),
    readJSON(`${libraryBase}/v1/workgroups.json`),
    readJSON(`${libraryBase}/v1/author_aliases.json`),
    readJSON(`${libraryBase}/v1/works-index.json`),
    readJSON(`${libraryBase}/v1/work-relations.json`).catch(() => null),
  ]).then(([local, fold, groups, publishedAliases, index, relations]) => {
    setAliases({aliases:{...publishedAliases, ...local.aliases}});
    setWorkIdentity(fold, groups);
    setCanonical(index);
    setRelations(relations);
  }).catch(error => root.console?.warn(error.message));
  api.ready = ready;
  // Ported surfaces read the public work index directly. Apply the same
  // withdrawal there, and refuse this work's requests before downloading it.
  const originalFetch = root.fetch;
  root.fetch = function (input, init) {
    const raw = typeof input === 'string' ? input : input?.url || String(input);
    let url;
    try { url = new URL(raw, root.location.origin); } catch (_) { return originalFetch.call(this, input, init); }
    const library = url.hostname.endsWith('.mo-podcast-feed.workers.dev');
    const path = decodeURIComponent(url.pathname);
    if (library && [...withdrawn].some(slug => path.split('/').includes(slug) || path.split('/').some(part => part.startsWith(`${slug}.`)) || url.searchParams.get('w') === slug || url.searchParams.get('slug') === slug)) {
      return Promise.resolve(new Response(JSON.stringify({error:'This volume is not available in the public library.'}), {status:404, headers:{'content-type':'application/json'}}));
    }
    return originalFetch.call(this, input, init).then(async response => {
      if (!library || !response.ok || !['/v1/works-index.json','/v1/mo/index.json'].includes(path)) return response;
      const data = await response.clone().json();
      if (!Array.isArray(data.works)) return response;
      data.works = data.works.filter(publicWork);
      const headers = new Headers(response.headers);
      headers.delete('content-length'); headers.delete('content-encoding');
      return new Response(JSON.stringify(data), {status:response.status, headers});
    });
  };
})(typeof window === 'undefined' ? globalThis : window);
