// ACADEMIC CITATIONS (2026-09-28; a reader, relayed by the owner for Ian: "Will source information be added so these materials can
// be cited for academic use? I have in mind all the standard citation details needed in a bibliography and footnotes").
//
// THE OWNER'S FORM IS THE NOTE:
//   Philip Melanchthon, Loci Theologici (1559), CR 21:601, English trans. accessed through The Faith Received, <link>.
// — author, the text's title, its own date, the standard series and volume:column (or the edition's page), whether the English was
// read, and where. citation(record, {page, part, lane, link, site}) returns that note, a short note, a Chicago bibliography entry
// (17th ed.), the SBL form for series, and BibTeX / RIS / CSL-JSON for reference managers.
//
// The record is the work's bibliographic record (v1/bib/works.json: every field traced to a source) or, until a work has one, what
// the catalogue knows (recordFromCatalogue). `part` is the text inside a volume of collected works (the outline entry that holds the
// page: "Loci Theologici (1559)" in CR 21). Nothing is invented: publication facts not recorded print as Chicago's "n.p." / "n.d."
// and are named in `warnings`; a page id that is only the digital edition's scan index is cited as such, never as a printed page.
// This file is pure and dependency-free: the server (_cite.mjs: the lookup, /api/cite, the MCP's cite tool) and the reader (a copy
// at the site's root, cite-core.mjs, loaded by read-tools.js) format with the same code. Keep the two copies identical (_cite.test.mjs).

// The standard series, for the bibliography entry (the note cites only the abbreviation, volume and column or page).
export const SERIES = {
  PL: { series: 'Patrologia Latina', full: 'Patrologiae cursus completus, Series Latina', editor: 'J.-P. Migne', place: 'Paris', years: '1844–1864', by: 'column' },
  PG: { series: 'Patrologia Graeca', full: 'Patrologiae cursus completus, Series Graeca', editor: 'J.-P. Migne', place: 'Paris', years: '1857–1866', by: 'column' },
  // PO: founded by R. Graffin and F. Nau (Paris: Firmin-Didot), continued by others (Turnhout: Brepols) — no one editor or publisher
  PO: { series: 'Patrologia Orientalis', place: 'Paris', years: '1903–', by: 'page' },
  CR: { series: 'Corpus Reformatorum', place: 'Halle, Braunschweig and Berlin', publisher: 'C. A. Schwetschke', years: '1834–', by: 'column' },
  CO: { series: 'Ioannis Calvini opera quae supersunt omnia', editor: 'G. Baum, E. Cunitz and E. Reuss', place: 'Braunschweig and Berlin', publisher: 'C. A. Schwetschke', years: '1863–1900', by: 'column' },
  WA: { series: 'D. Martin Luthers Werke: Kritische Gesamtausgabe', place: 'Weimar', publisher: 'H. Böhlau', years: '1883–2009', by: 'page' },
  CSEL: { series: 'Corpus Scriptorum Ecclesiasticorum Latinorum', place: 'Vienna', years: '1866–', by: 'page' },
  CCSL: { series: 'Corpus Christianorum, Series Latina', place: 'Turnhout', publisher: 'Brepols', years: '1953–', by: 'page' },
  SC: { series: 'Sources Chrétiennes', place: 'Paris', publisher: 'Cerf', years: '1942–', by: 'page' },
  GCS: { series: 'Die griechischen christlichen Schriftsteller der ersten Jahrhunderte', place: 'Leipzig and Berlin', years: '1897–', by: 'page' },
  // found in the library's records (09-28): the title of each series; places and years come from the work's own record
  PS: { series: 'Patrologia Syriaca', by: 'column' },
  'WA TR': { series: 'D. Martin Luthers Werke: Tischreden', by: 'page' },
  A: { series: 'Sämtliche Schriften und Briefe, Akademie-Ausgabe', by: 'page' },
  CT: { series: 'Concilium Tridentinum: Diariorum, Actorum, Epistularum, Tractatuum nova collectio', by: 'page' },
  Mansi: { series: 'Sacrorum conciliorum nova et amplissima collectio', editor: 'G. D. Mansi', by: 'column' },
  Leonine: { series: 'Sancti Thomae de Aquino Opera omnia iussu Leonis XIII P. M. edita', by: 'page' },
  'Coll. Lac.': { series: 'Acta et decreta sacrorum conciliorum recentiorum: Collectio Lacensis', by: 'column' },
  'CIC (Friedberg)': { series: 'Corpus Iuris Canonici', editor: 'E. Friedberg', by: 'column' },
};
// Chicago 14.128: a book printed before 1900 is cited by place and date; the publisher (a printer's imprint) may go.
// (a range by its last year: a series printed 1883–2009 keeps its publisher)
const pre1900 = y => { const all = String(y ?? '').match(/\d{4}/g); return !!all && Number(all[all.length - 1]) < 1900; };
// an imprint set in capitals on the title page ("APUD C. A. SCHWETSCHKE ET FILIUM") in ordinary case, for the exports
const LOWER = new Set(['et', 'und', 'and', 'of', 'the', 'de', 'du', 'des', 'la', 'le', 'les', 'von', 'van', 'der', 'den', 'in', 'bei', 'chez', 'e', 'y', 'for', 'at', 'by']);
const ordinaryCase = t => { const s = String(t || ''), letters = s.replace(/[^\p{L}]/gu, '');
  if (!letters || letters.replace(/[^\p{Lu}]/gu, '').length / letters.length <= 0.7) return s;
  return s.toLowerCase().replace(/\p{L}+/gu, (w, i) => i && LOWER.has(w) ? w : w[0].toUpperCase() + w.slice(1)); };
// the end of a range as Chicago writes it (9.61): 601–2, 609–10, 259–60, 1467–68, 299–300
const chicagoEnd = (a, b) => { if (a < 100 || a % 100 === 0) return String(b); const A = String(a), B = String(b); if (A.length !== B.length) return B;
  let i = 0; while (i < A.length && A[i] === B[i]) i++; const ch = B.slice(i); return a % 100 < 10 ? ch : ch.length >= 2 ? ch : B.slice(-2); };

// A person's name inverted for a bibliography: "Robert Bellarmine" → "Bellarmine, Robert"; "Jean de Launoy" → "Launoy, Jean de";
// names that are not "given family" (Augustine of Hippo, Basil the Great, Innocent III, a single name, "Various Popes") stand as written.
export function invertName(name) {
  const n = String(name || '').trim();
  if (AS_INVERTED.has(n)) return AS_INVERTED.get(n);   // the catalogue's own inversion: "La Porte du Theil, Franc"
  if (!n || n.includes(',') || /\s(?:of|the)\s/i.test(' ' + n + ' ') || /\b[IVXL]{1,5}$/.test(n) || !/\s/.test(n) || /^(?:various|anonymous|uncertain)/i.test(n)) return n;
  const w = n.split(/\s+/);
  // the family name is the last word; its particles stand after the given name (Chicago 8.5): "Hardt, Hermann von der"
  return `${w[w.length - 1]}, ${w.slice(0, -1).join(' ')}`;
}
// A catalogue name in natural order. The catalogues write some names inverted ("Rous, Francis", "Taylor, Thomas. 1576-1632"),
// some with an epithet ("Epiphanius, Deacon of Catania" stands as written) and some lists with commas ("L. Petit, X. A. Sidéridès,
// M. Jugie": three people).
const EPITHET = /^(?:\p{Ll}|(?:Saint|St\.?|Pope|Patriarch|Metropolitan|Archbishop|Bishop|Cardinal|Abbot|Abbess|Deacon|Priest|Monk|Emperor|Empress|King|Queen|Prince|Duke|Earl|Count|Lord|Sir|Master|Doctor|Rabbi)\b)/u;
const words = t => t.split(/\s+/).filter(Boolean).length;
const AS_INVERTED = new Map();
function natural(name) {
  const n = String(name || '').replace(/[,.]?\s*\(?(?:(?:b|d|fl|ca|c)\.\s*)?\d{3,4}\??(?:\s*[-–]\s*\d{0,4}\??)?\)?\.?\s*$/, '').replace(/(?<!(?:^|\s)\p{Lu})[.,;]\s*$/u, '').trim();
  if (!n.includes(',')) return [n];
  const parts = n.split(/\s*,\s*/).filter(Boolean);
  if (parts.length === 2) {
    if (EPITHET.test(parts[1])) return [n];
    if (words(parts[0]) >= 2 && words(parts[1]) >= 2 && /^\p{Lu}/u.test(parts[1])) return parts;     // "Robert P. Blake, Maurice Brière"
    const nat = `${parts[1]} ${parts[0]}`; AS_INVERTED.set(nat, `${parts[0]}, ${parts[1]}`); return [nat];   // "Rous, Francis" → "Francis Rous"
  }
  return parts.every(x => words(x) >= 2) ? parts : [n];
}
const people = v => (Array.isArray(v) ? v : String(v || '').split(/\s*(?:;|&| and )\s*/)).map(x => String(x).replace(/\s*\((?:hrsg|eds?|ed)\.?\)\s*$/i, '').trim()).filter(Boolean).flatMap(natural).filter(Boolean);
const list = names => names.length <= 1 ? names.join('') : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
const surname = n => { const inv = invertName(n); return inv.includes(',') ? inv.split(',')[0] : n; };
const WEAK = new Set(['a', 'an', 'the', 'of', 'and', 'in', 'on', 'to', 'for', 'ad', 'de', 'et', 'in', 'contra', 'super', 'pro', 'cum']);
const shortTitle = t => { const s = String(t || '').split(/[:.;—–(]/)[0].trim(); let w = s.split(/\s+/); if (w.length > 4) w = w.slice(0, 4); while (w.length > 1 && WEAK.has(w[w.length - 1].toLowerCase())) w.pop(); return w.join(' '); };
const clean = s => String(s || '').replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').replace(/([.?!])\./g, '$1').replace(/,\s*,/g, ',').trim();
const isAnon = a => /^(?:various|anonymous|uncertain)/i.test(a);
// a volume inside a note: "vol. 2" (the catalogue's "Vol. 2" in lower case mid-sentence; "Pars VIII", "Tomus II" as printed)
const inNote = v => /^[\dIVXL]+$/.test(String(v)) ? `vol. ${v}` : String(v).replace(/^Vol\.\s*/, 'vol. ');

/** A record for a work that has none yet: the catalogue's author, title and volume line, and the series rules for Migne. */
export function recordFromCatalogue(w = {}) {
  const slug = String(w.slug || ''), family = (/^(pld|pg|po|eebo|aq)-/.exec(slug) || [])[1] || 'tfr';
  const vol = String(w.volume || '').trim(), m = /^(PL|PG|PO)\s+(\d+)/.exec(vol);
  const rec = { family, author: w.author || '', title: w.title || slug, title_orig: w.title_la || null, provenance: { author: 'catalogue', title: 'catalogue' } };
  if (family === 'eebo') rec.language = 'en';   // the early English books are read in their own English
  if (m) return Object.assign(rec, { type: 'part', series_short: m[1], volume: m[2], locator: { kind: 'column' }, provenance: { ...rec.provenance, series: 'catalogue volume' } });
  if (/^\d{4}$/.test(vol)) return Object.assign(rec, { type: 'book', year: vol, provenance: { ...rec.provenance, year: 'catalogue volume' } });
  // "Tomus V — De praeclaro apparatu … Frankfurt & Leipzig, 1696–1700" · "Tomus I (1588)": place and years as the line gives them
  const tail = /,\s*(\d{4}(?:\s*[–-]\s*\d{2,4})?)\s*$/.exec(vol), paren = /\((\d{4}(?:\s*[–-]\s*\d{2,4})?)\)\s*$/.exec(vol);
  const segs = tail ? vol.slice(0, tail.index).split(/[.;—–·]\s+/) : [], place = segs.length > 1 ? segs[segs.length - 1].trim() : '';
  const out = { type: 'book' };
  if (tail && /^[A-Z][\p{L}' -]{1,40}(?:\s*(?:&|and)\s*[A-Z][\p{L}' -]{1,40})?$/u.test(place))
    Object.assign(out, { place, year: tail[1].replace(/\s+/g, ''), volume_note: segs.slice(0, -1).join('. ').trim() });
  else if (paren) Object.assign(out, { year: paren[1].replace(/\s+/g, ''), volume_note: vol.slice(0, paren.index).trim() });
  else if (vol) out.volume_note = vol;
  if (out.place || out.year) rec.provenance = { ...rec.provenance, ...(out.place ? { place: 'catalogue volume' } : {}), ...(out.year ? { year: 'catalogue volume' } : {}) };
  return Object.assign(rec, out);
}

/** The page as a locator: a series volume and column (CR 21:601, PL 35:2033), an edition's page, an EEBO image, the digital page. */
function locatorOf(rec, page, printed = null) {
  if (page == null || page === '') return { kind: 'none', text: '' };
  const p = String(page), ss = rec.series_short, ser = ss ? SERIES[ss] : null;
  const kind = rec.locator?.kind || (ser ? (ser.by === 'column' ? 'column' : 'printed-page') : 'scan-index');
  const col = /^(\d+):0*(\d+)([a-d]?)$/i.exec(p), num = /^0*(\d+)$/.exec(p);
  const n = col ? col[2] + (col[3] || '').toUpperCase() : (num ? num[1] : p);
  const vol = col ? col[1] : rec.volume;
  // outside a series a column number says so (Chicago 14.156: "col.", "cols."); a page number goes bare (no "p." in a note). The
  // volume of a book outside a series is named before the imprint (citation's volLabel), so it is not repeated here.
  const cols = (v, isCol) => isCol ? (/[–-]/.test(v) ? `cols. ${v}` : `col. ${v}`) : v;
  // a printed number the edition kept on this page (printed_numbers: <fw type="pageNum">) — exact, never interpolated
  if (printed != null && printed !== '') { const pv = String(printed);
    return { kind: 'printed', text: ss ? `${ss} ${vol}:${pv}` : cols(pv, rec.locator?.printed === 'columns'), n: pv }; }
  if (kind === 'column' || kind === 'printed-page') {
    // a Greek Migne page holds two columns, the Greek and its Latin (each page mark is the odd one): cite both
    const c = ss === 'PG' && /^\d+$/.test(n) && Number(n) % 2 === 1 ? `${n}–${chicagoEnd(Number(n), Number(n) + 1)}` : n;
    if (ss) return { kind, text: `${ss} ${vol}:${c}`, n };
    return { kind, text: cols(c, kind === 'column'), n };
  }
  if (kind === 'image') return { kind, text: `image ${n}`, n };
  if (kind === 'sequence') return { kind, text: `digital ed. sect. ${n}`, n };
  return { kind: 'scan-index', text: `${ss && vol ? `${ss} ${vol}, ` : ''}digital ed. p. ${n}`, n };
}

/**
 * The citations for one work and page.
 *   page   the page id (PL/PG "35:2033" or a number)          part  {title, date} of the text inside a volume of collected works
 *   printed  the printed page or column the edition kept on that page, when the record's page_map has it
 *   label  the page's own printed label, when it has one (Denzinger 44–45)
 *   lane   'en' when the English lane is quoted              link  the reader's address for the page
 *   site   {name} of the digital edition (The Faith Received, Mere Orthodoxy)
 */
export function citation(record, { page = null, printed = null, part = null, lane = 'orig', link = '', site = { name: 'The Faith Received' }, label = '' } = {}) {
  const r = { ...(record || {}) }, warnings = [];
  if (r.year != null) r.year = String(r.year);
  // a page that carries its own printed label ("Denzinger 44–45" on the Denzinger chapters) is cited by it
  const loc = label ? { kind: 'label', text: String(label), n: null } : locatorOf(r, page, printed), ser = r.series_short ? SERIES[r.series_short] || { series: r.series || r.series_short } : null;
  const authors = people(r.author).filter(a => !isAnon(a));
  const editors = people(r.editor || (/\((?:hrsg|eds?)\.?\)/i.test(String(r.author || '')) ? r.author : ''));
  const byEditor = !authors.length || /\((?:hrsg|eds?)\.?\)/i.test(String(r.author || ''));
  const inPart = !!(part && part.title);
  const title = inPart ? part.title : (r.title_orig || r.title || '');
  const date0 = String((inPart ? part.date : null) || r.work_date || (!ser && r.year) || '');
  const date = date0 && !String(title).includes(date0) ? date0 : '';   // "Sermons of the Year 1531", not "… 1531 (1531)"
  const who = byEditor ? (editors.length ? `${list(editors)}, ${editors.length > 1 ? 'eds.' : 'ed.'}` : '') : list(authors);
  // A book written in English (the early English books, English originals) is read in its own words, not in translation.
  const english = r.language === 'en' || r.family === 'eebo';
  const where = lane === 'en' && !english ? `English trans. accessed through ${site.name}` : `accessed through ${site.name}`;

  // THE NOTE — the owner's form for a text in a series ("Philip Melanchthon, Loci Theologici (1559), CR 21:601, English trans.
  // accessed through The Faith Received, <link>"); for a book, a regular citation (owner: "eebo should just be the name of work,
  // author, etc regular citation"): author, title, (place: publisher, year), page.
  let note;
  if (ser) note = clean(`${who ? who + ', ' : ''}*${title}*${date ? ` (${date})` : ''}${loc.text ? ', ' + loc.text : ''}, ${where}${link ? ', ' + link : ''}.`);
  else {
    const pub = r.publisher && !pre1900(r.year) ? r.publisher : '';
    const facts = [r.place && (pub ? `${r.place}: ${pub}` : r.place), r.year || (inPart ? '' : date)].filter(Boolean).join(', ');
    const volLabel = r.volume ? inNote(r.volume) : (r.volume_note && r.volume_note.length <= 40 ? r.volume_note : '');
    const extra = [!byEditor && r.editor ? `ed. ${list(people(r.editor))}` : '', r.translator ? `trans. ${r.translator}` : '', r.edition || '', volLabel].filter(Boolean).join(', ');
    note = clean(`${who ? who + ', ' : ''}*${title}*${inPart && part.date ? ` (${part.date})` : ''}${inPart && (r.title_orig || r.title) !== title ? `, in *${r.title_orig || r.title}*` : ''}${extra ? ', ' + extra : ''}${facts ? ` (${facts})` : ''}${loc.text ? ', ' + loc.text : ''}, ${where}${link ? ', ' + link : ''}.`);
  }
  const bookVol = !ser && r.volume ? inNote(r.volume) : '';
  const short = clean(`${!byEditor && authors.length ? surname(authors[0]) + ', ' : editors.length ? surname(editors[0]) + ', ' : ''}*${shortTitle(title)}*${bookVol && loc.text ? ', ' + bookVol : ''}${loc.text ? ', ' + loc.text : ''}.`);
  const sbl = ser ? clean(`${who ? who + ', ' : ''}*${title}*${loc.text ? ` (${loc.text})` : ''}.`) : null;

  // THE BIBLIOGRAPHY — Chicago, with every publication fact the record has.
  // Chicago 14.76: the first name inverted, the rest in natural order, "and" before the last: "Ward, Geoffrey C., and Ken Burns"
  const bibList = ns => ns.length <= 1 ? invertName(ns[0] || '') : `${invertName(ns[0])}, ${ns.slice(1, -1).map(x => x + ', ').join('')}and ${ns[ns.length - 1]}`;
  const whoBib = byEditor ? (editors.length ? `${bibList(editors)}, ${editors.length > 1 ? 'eds.' : 'ed.'}` : '') : bibList(authors);
  const volTitle = r.title_orig || r.title || '';
  let bibliography;
  if (ser) {
    const place = r.place || ser.place || '', years = r.year || ser.years || '', publisher = pre1900(years) ? '' : (r.publisher || ser.publisher || '');
    const inVol = r.container_title || (inPart && volTitle && volTitle !== title ? volTitle : '');
    // the record's editor edited the collected edition when the record names it (Bindseil, CR 21); otherwise the series (Migne)
    const volEd = r.container_title && r.editor && !byEditor ? `, edited by ${list(people(r.editor))}` : '';
    const edBy = volEd ? (ser.editor ? `, edited by ${ser.editor}` : '') : r.editor && !byEditor ? `, edited by ${list(people(r.editor))}` : ser.editor ? `, edited by ${ser.editor}` : '';
    const facts = [place && (publisher ? `${place}: ${ordinaryCase(publisher)}` : place), years].filter(Boolean).join(', ');
    bibliography = clean(`${whoBib ? whoBib + '. ' : ''}*${title}*${date ? ` (${date})` : ''}. ${inVol ? `In *${inVol}*${volEd}, ` : 'In '}${r.series_short.replace(/\s*\(.*\)$/, '')} ${r.volume || ''}${ser.series ? ` (${ser.series}${edBy})` : ''}.${facts ? ' ' + facts + '.' : ''}${link ? ` ${site.name}. ${link}.` : ''}`);
  } else {
    const place = r.place || '', year = r.year || '', publisher = r.publisher && !pre1900(year) ? ordinaryCase(r.publisher) : '';
    if (!place) warnings.push('place of publication not yet recorded (n.p.)');
    if (!year) warnings.push('date of publication not yet recorded (n.d.)');
    const vol = r.volume ? (/^[\dIVXL]+$/.test(String(r.volume)) ? `Vol. ${r.volume}` : String(r.volume)) : (r.volume_note || '');
    bibliography = clean(`${whoBib ? whoBib + '. ' : ''}*${inPart ? title : volTitle}*.${inPart && volTitle !== title ? ` In *${volTitle}*.` : ''}${!byEditor && editors.length ? ` Edited by ${list(editors)}.` : ''}${r.translator ? ` Translated by ${r.translator}.` : ''}${r.edition ? ` ${r.edition}.` : ''}${vol ? ` ${vol}.` : ''} ${place || 'N.p.'}${publisher ? ': ' + publisher : ''}, ${year || 'n.d.'}.${link ? ` ${site.name}. ${link}.` : ''}`);
  }
  if (loc.kind === 'scan-index' || loc.kind === 'sequence') warnings.push('the page is the digital edition\'s page or section, not a printed page number');
  if (r.year_basis === 'catalogue') warnings.push('the year is the catalogue\'s and may be the first edition\'s, not the copy read');
  if (r.year_basis === 'reprint-original') warnings.push('the year is the original edition\'s; the copy read is a reprint');
  if (loc.kind === 'image') warnings.push('the page is an image number of the early printed book, not a printed page number');
  if (lane === 'en' && !english) warnings.push(`the English is ${site.name}'s translation; quote the original for an authoritative wording`);

  const chapter = !!(ser || inPart);
  const csl = { type: chapter ? 'chapter' : 'book', title,
    ...(authors.length ? { author: authors.map(a => ({ literal: a })) } : {}), ...(editors.length ? { editor: editors.map(e => ({ literal: e })) } : {}),
    ...(chapter ? { 'container-title': r.container_title || (ser ? `${ser.series}${r.volume ? ' ' + r.volume : ''}` : volTitle) } : {}), ...(ser ? { 'collection-title': ser.series } : {}), ...(r.volume ? { volume: String(r.volume) } : {}),
    ...((r.place || ser?.place) ? { 'publisher-place': r.place || ser.place } : {}), ...((r.publisher || ser?.publisher) ? { publisher: ordinaryCase(r.publisher || ser.publisher) } : {}),
    ...((r.year || ser?.years || date) ? { issued: { literal: String(r.year || ser?.years || date) } } : {}), ...(loc.n ? { page: String(loc.n) } : {}),
    ...(link ? { URL: link } : {}), note: where };
  const firstName = surname(authors[0] || editors[0] || 'anon').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '');
  const keyWord = (String(title).split(/\s+/).find(w => !/^(?:the|a|an|de|in|on|of|la|le|il|der|die|das)$/i.test(w)) || '').normalize('NFD').replace(/[^A-Za-z]/g, '');
  const key = (firstName + (String(date || r.year || '').match(/\d{4}/) || [''])[0] + keyWord).toLowerCase() || 'source';
  const bt = (k, v) => v ? `  ${k} = {${String(v).replace(/[{}]/g, '')}},\n` : '';
  const bibtex = `@${chapter ? 'incollection' : 'book'}{${key},\n` + bt('author', authors.join(' and ')) + bt('editor', editors.join(' and ') || ser?.editor) + bt('title', title) +
    bt('booktitle', chapter ? csl['container-title'] : '') + bt('series', ser?.series) + bt('volume', r.volume) + bt('pages', loc.n) + bt('address', csl['publisher-place']) +
    bt('publisher', csl.publisher) + bt('year', r.year || ser?.years || date) + bt('url', link) + bt('note', [where, loc.kind === 'scan-index' ? 'page of the digital edition' : ''].filter(Boolean).join('; ')) + '}';
  const ris = [`TY  - ${chapter ? 'CHAP' : 'BOOK'}`, ...authors.map(a => `AU  - ${invertName(a)}`), ...editors.map(e => `A2  - ${invertName(e)}`), `TI  - ${title}`,
    chapter && `T2  - ${csl['container-title']}`, r.volume && `VL  - ${r.volume}`, loc.n && `SP  - ${loc.n}`, csl['publisher-place'] && `CY  - ${csl['publisher-place']}`,
    csl.publisher && `PB  - ${csl.publisher}`, csl.issued && `PY  - ${csl.issued.literal}`, link && `UR  - ${link}`, `N1  - ${where}`, 'ER  - '].filter(Boolean).join('\n');
  const html = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*([^*]+)\*/g, '<i>$1</i>');
  return { note, short, bibliography, sbl, html: { note: html(note), short: html(short), bibliography: html(bibliography), ...(sbl ? { sbl: html(sbl) } : {}) },
    bibtex, ris, csl, warnings, locator: loc.kind, missing: r.missing || [] };
}

/** The text of a collected-works volume that holds a page: the last top-level heading at or before it. */
export function partAt(texts, page) {
  const n = Number(String(page ?? '').replace(/^\d+:/, ''));
  if (!Array.isArray(texts) || !texts.length || !Number.isFinite(n)) return null;
  let hit = null; for (const t of texts) if (Number(t.page) <= n && (!hit || Number(t.page) >= Number(hit.page))) hit = t;
  return hit ? { title: hit.title, date: hit.date || null } : null;
}
