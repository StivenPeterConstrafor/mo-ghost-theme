/* WHERE A COMMENTARY OPENS ON A VERSE (2026-10-19, owner: "the commentary needs to open to the actual commentary on the verse, not
   the place where the commentary reproduces the verse that's selected").

   Pure functions, no DOM, so scripts/check-commentary-anchor.mjs can run them on real page text. commentary-pane.js uses them.

   The trap this file exists for. A commentary prints the chapter's text before it comments on it (the lemma): "1. In the beginning
   God created the heaven and the earth. 2. And the earth was void …", a numbered line for every verse. A search for "the paragraph
   that starts with the verse's number" lands on that copy of the text, and the reader is shown the Bible again where the
   commentator's own note should be. Three things tell the two apart:
     - the note usually carries a heading word ("Vers. 1.", "Verse 12.");
     - the copy is a run of numbered lines whose numbers climb by one (1., 2., 3. …), or one paragraph with several verse marks in it;
     - the library files a page that merely prints the verse as `quotation`, and one that discusses it as `explicit` or `exegesis`.
   Where the library has indexed a note for the verse itself (`exegesis`, "Its note on this verse") that page is trusted and nothing
   here second-guesses it; everything below is for the commentaries that have no such row. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FRCommentaryAnchor = api;
}(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const HEAD = '(?:ver(?:s(?:e|us)?)?\\.?\\s*|v\\.\\s*)';
  const strongRx = (n) => new RegExp(`^${HEAD}\\(?${n}\\b\\s*[.:,)\\]]`, 'i');
  const bareRx = (n) => new RegExp(`^\\(?${n}\\b\\s*[.:,)\\]]`);
  const strongNum = (s) => { const m = new RegExp(`^${HEAD}\\(?(\\d{1,3})\\b\\s*[.:,)\\]]`, 'i').exec(s); return m ? +m[1] : null; };
  // a bare numbered line; a number in parentheses is a footnote mark, not a verse, and is not counted
  const bareNum = (s) => { const m = /^(\d{1,3})\s*[.:)\]]\s*\S/.exec(s); return m ? +m[1] : null; };
  // a bare numbered line whose first words are set in capitals: how some commentaries head a note ("3. AND GOD SAID - by word")
  const capsNum = (s) => { const m = /^(\d{1,3})\s*[.:]\s+["\u201c\u2018']?[A-Z]{2,}[A-Z\u2019' ,;.-]*[A-Z]/.exec(s); return m ? +m[1] : null; };
  const isHead = (s) => /^#{1,6}\s+/.test(s);

  // CRITICAL APPARATUS (2026-10-19). A scholarly edition prints its editors' notes at the foot of each page: Weimar Luther runs
  // them as short lines that begin with the line number of the text they gloss and give the variant readings of the early printings
  // under their sigla ("17 jha B", "20 ynn] jhn B augenplick B sag C", "16 zu Zeit fuer (vor B ) Gott ungemessen . r ABCD",
  // "[zu Bl. A5 a Terra quae bis A6 a tenens vgl. R 99, 32 – 101, 24]"). They are the editors' words about the printing, never the
  // author's commentary, and "13 zu Inanis et vacua" must not be read as a note on verse 13. isApparatus() recognizes one such
  // paragraph, on shape alone, with no word list of any one language. It is deliberately narrow: it wants a line number or a
  // bracketed "[zu Bl. …]" at the start, AND siglum letters (isolated capitals A to H, or Rorer's "r") standing after words, so a
  // paragraph of prose that merely mentions a letter, or a numbered verse ("13. And God said"), is not caught.
  const SIGLUM = /^[A-H]{1,4}$/;
  function siglaIn(words) {
    let n = 0;
    for (let i = 1; i < words.length; i += 1) {
      const w = words[i];
      if (SIGLUM.test(w) && !(w === 'A' && /[.!?]$/.test(words[i - 1]))) n += 1; // "…it was so. A great question" is a sentence, not a siglum
      else if (w === 'r' && (words[i - 1] === '.' || SIGLUM.test(words[i + 1] || ''))) n += 1; // Rorer's manuscript, "… rohe . r"
    }
    return n;
  }
  // text with no line number that is nonetheless a run of variant readings: three or more sigla, a fifth of its words
  function sigRun(t) {
    const words = t.split(/\s+/);
    if (words.length > 80) return false;
    const n = siglaIn(words);
    return n >= 3 && n / words.length >= 0.2;
  }
  function isApparatus(s) {
    const t = String(s || '').trim();
    if (!t || t.length > 700 || /^#{1,6}\s/.test(t)) return false;
    if (/^\[(?:zu|vgl\.?|Bl\.)\s/.test(t) && /\]$/.test(t)) return true; // "[zu Bl. A5 a Terra quae bis A6 a … vgl. R 99, 32 – 101, 24]"
    // a line number, then a space (a verse is "13." or "13)"; an apparatus line is "13 zu …", "17 jha B")
    if (!/^\d{1,3}\s+[^\d\s.:;)\]–-]/.test(t)) return (/\bvgl\./.test(t) && /\bBl\.\s*[A-H]?\d/.test(t)) || sigRun(t);
    if (/^\d{1,3}\s+zu\s/.test(t)) return true;
    const words = t.split(/\s+/), n = siglaIn(words);
    return n >= 1 && words.length <= 60 && n / words.length >= 0.1;
  }
  // the indexes of the apparatus paragraphs of a page
  const apparatusIndexes = (paras) => { const out = new Set(); (paras || []).forEach((s, i) => { if (isApparatus(s)) out.add(i); }); return out; };
  // the share of a page's characters that are apparatus: a page that is nearly all of it holds no commentary
  const apparatusShare = (paras) => {
    let all = 0, app = 0;
    for (const s of paras || []) { all += s.length; if (isApparatus(s)) app += s.length; }
    return all ? app / all : 0;
  };

  // The indexes of paragraphs that are the Bible's own words reprinted: a run of numbered lines counting up (five or more, or three
  // and four of them short, as verses are and a commentator's notes seldom are), or a paragraph carrying several verse marks that
  // count up inside it ("… 29. And God said: Behold … 30. and to all beasts … 31. And God saw …").
  function lemmaIndexes(paras) {
    const out = new Set();
    const app = apparatusIndexes(paras);
    const nums = paras.map((s, i) => (app.has(i) ? null : strongNum(s) == null ? bareNum(s) : null));
    for (let i = 0; i < paras.length; i += 1) {
      if (nums[i] == null) continue;
      let j = i;
      while (j + 1 < paras.length && nums[j + 1] === nums[j] + 1) j += 1;
      const run = paras.slice(i, j + 1);
      if (run.length >= 5 || (run.length >= 3 && run.every((s) => s.length < 220))) { for (let k = i; k <= j; k += 1) out.add(k); }
      i = j;
    }
    paras.forEach((s, i) => {
      if (app.has(i) || strongNum(s) != null) return; // a note under a "Vers. N." heading may list 1. 2. 3. inside it; it is still the note
      const marks = (s.match(/\s(\d{1,3})\.\s+\S/g) || []).map((m) => parseInt(m, 10));
      if (marks.some((n, k) => marks[k + 1] === n + 1)) out.add(i);
    });
    return out;
  }

  // The paragraph where the commentator's own note on verse `printed` begins, or -1. Never the reprinted text. A number in
  // parentheses is a footnote mark ("(1) Quaest. hebr. in Genes.") unless `loose` is set, which is for a page the library itself
  // indexed as holding the note (some commentaries print a psalm's verse as "(22)").
  function findNote(paras, printed, loose) {
    const lemma = lemmaIndexes(paras), app = apparatusIndexes(paras);
    const sx = strongRx(printed), bx = bareRx(printed);
    let i = paras.findIndex((s, k) => !app.has(k) && sx.test(s)); // the heading word marks a note even where the note lists 1. 2. 3. inside it
    if (i < 0) i = paras.findIndex((s, k) => !lemma.has(k) && !app.has(k) && bx.test(s) && (loose || !/^\(/.test(s)));
    return i;
  }

  // the index `max` paragraphs after `start`, not counting apparatus, and carrying on over an apparatus run that follows
  function capAt(paras, start, max, app) {
    let seen = 0, j = start + 1;
    for (; j < paras.length && seen < max; j += 1) if (!app.has(j)) seen += 1;
    while (j < paras.length && app.has(j)) j += 1;
    return Math.min(paras.length, Math.max(j, start + 1));
  }

  // Where that note ends: the next heading, or the next verse's note, or `cap` paragraphs on.
  function noteEnd(paras, start, printed, cap) {
    const lemma = lemmaIndexes(paras), app = apparatusIndexes(paras), max = cap || 14;
    let seen = 0; // the editors' notes neither end the note nor count toward the cap
    for (let j = start + 1; j < paras.length && seen < max; j += 1) {
      if (app.has(j)) continue;
      seen += 1;
      if (isHead(paras[j])) return j;
      const sn = strongNum(paras[j]);
      if (sn != null && sn !== printed) return j;
      const bn = sn == null ? bareNum(paras[j]) : null;
      if (bn != null && bn > printed && !lemma.has(j)) return j;
    }
    return capAt(paras, start, max, app);
  }

  // Whether a page's one-line gist, as the reception file carries it, is about this verse: 'yes' (it names a range holding the verse
  // in this chapter of this book), 'no' (it names verses, but not this one), or 'unknown' (it names none). "A commentary on
  // Genesis 1:3-4 …" is 'no' for 1:1; "… on 2 Peter 1:1" is 'no' for Genesis 1:1.
  const ROMAN = { i: '1', ii: '2', iii: '3' };
  const SHORT = { mt: 'matthew', mk: 'mark', mc: 'mark', lk: 'luke', jn: 'john', jhn: 'john', ps: 'psalms', pss: 'psalms', gen: 'genesis', ex: 'exodus',
    lev: 'leviticus', num: 'numbers', dt: 'deuteronomy', deut: 'deuteronomy', canticles: 'song of solomon', song: 'song of solomon', sam: 'samuel',
    kgs: 'kings', chr: 'chronicles', cor: 'corinthians', thess: 'thessalonians', tim: 'timothy', pet: 'peter', rom: 'romans', heb: 'hebrews' };
  function gistClaims(gist, bookName, ch, v) {
    const g = String(gist || '');
    const rx = /(?:^|[^A-Za-z0-9])((?:[1-3]|I{1,3})\.?\s+)?([A-Z][a-z]{1,11})\.?\s+(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-\u2013\u2014]\s*(\d{1,3}))?/g;
    const mine = /^\s*([1-3]|I{1,3})\.?\s+(.*)$/.exec(String(bookName || '')), num = mine ? (ROMAN[mine[1].toLowerCase()] || mine[1]) : '';
    const book = (mine ? mine[2] : String(bookName || '')).toLowerCase();
    let m, any = false;
    while ((m = rx.exec(g))) {
      any = true;
      const pre = m[1] ? (ROMAN[m[1].replace(/\./, '').trim().toLowerCase()] || m[1].replace(/\./, '').trim()) : '';
      let word = m[2].toLowerCase();
      word = SHORT[word] || word;
      const same = pre === num && word.length >= 2 && (book === word || book.startsWith(word) || book.endsWith(` ${word}`) || word.startsWith(book));
      const a = +m[4], b = m[5] ? +m[5] : a;
      if (same && +m[3] === +ch && a <= v && v <= b) return 'yes';
    }
    return any ? 'no' : 'unknown';
  }

  // The pages worth opening to look for the commentary's note on verse `v`, from the chapter file's rows for that verse: only
  // pages the library files as discussing the verse (not as printing it), only those not plainly about another verse or book;
  // those that name the verse first, then by page. Returns [{p, claim}].
  function candidatePages(rows, slug, bookName, ch, v) {
    const seen = new Map();
    for (const r of rows || []) {
      if (r.w !== slug || (r.how !== 'explicit' && r.how !== 'exegesis')) continue;
      const claim = gistClaims(r.g, bookName, ch, v);
      if (claim === 'no') continue;
      const p = +r.p; if (!(p > 0)) continue;
      if (!seen.has(p) || claim === 'yes') seen.set(p, claim);
    }
    return [...seen].map(([p, claim]) => ({ p, claim }))
      .sort((x, y) => (x.claim === y.claim ? x.p - y.p : x.claim === 'yes' ? -1 : 1));
  }

  // The search itself. `getParas(slug, n)` gives a page's paragraphs as [english[], latin[]]. A work `c` is
  // {slug, notes: {verse: page}, rows: {verse: [row]}, pv: {verse: printed number}, open: the map's page for the chapter,
  // close: the map's page for the NEXT chapter}; `w` is {name, ch}. resolve() gives {p, how, v, indexed}, where how is, in order of
  // preference:
  //   note     the library indexed the work's own note on the verse, or its page text carries one;
  //   page     the library files a page as discussing the verse, lying between the notes on the verses either side of it;
  //   later    the work's next note after the verse (within four verses);
  //   nearest  its closest note before (within twelve); then a later one within twelve;
  //   chapter  the page the map gives as the chapter's opening, said to be nothing more.
  // Only pages of the commentary's own section on the chapter are looked at. The map's opening can be wrong (Lapide's vol. 1 maps
  // Genesis 1 to an essay on the six days printed ahead of his own Genesis, at p. 75; his chapter begins at p. 196, with the
  // chapter's text), so the section starts at the page that carries the longest run of reprinted verses between the map's opening
  // and the next chapter's, and ends at the next chapter's.
  function createResolver(getParas, opts) {
    const verseText = (opts && opts.verseText) || (() => '');
    const printedOf = (c, v) => (c.pv && c.pv[v]) || v;
    const memo = new Map();
    const once = (k, make) => { if (!memo.has(k)) memo.set(k, make()); return memo.get(k); };
    // The section is every page from the chapter's reprinted text to the next chapter's page (or, with no usable next chapter, 150
    // pages on), read once: it gives the section's start, and an index of the note headings in it ("Vers. 20.", "9. LET THE WATERS"),
    // each the first heading of its number that follows the one before, so a cross-reference or a repeated number cannot take it.
    const section = (c, w) => once(`sec|${c.slug}|${w.name}|${w.ch}`, async () => {
      const from = c.open != null ? +c.open : 0;
      const hi = from <= 0 ? Infinity : (c.close != null && +c.close > from ? Math.min(+c.close, from + 260) : from + 150);
      const pages = [];
      let lo = from, best = 5;
      if (from > 0) {
        for (let n = from; n < hi; n += 1) {
          const [en, la] = await getParas(c.slug, n);
          const ps = en.length ? en : la;
          pages.push([n, ps]);
          const run = lemmaIndexes(ps).size;
          if (run > best) { best = run; lo = n; }
        }
      }
      const heads = {}, caps = [];
      let last = 0, pos = 0;
      for (const [n, ps] of pages) {
        if (n < lo) continue;
        const lemma = lemmaIndexes(ps), app = apparatusIndexes(ps);
        for (let i = 0; i < ps.length; i += 1, pos += 1) {
          if (app.has(i)) continue; // "13 zu Inanis et vacua" is the editors' line number, not verse 13
          const num = strongNum(ps[i]) != null ? strongNum(ps[i]) : (lemma.has(i) ? null : capsNum(ps[i]));
          if (num != null && num > last && num - last <= 12) { heads[num] = { p: n, i, pos }; last = num; } else if (num == null && !lemma.has(i)) {
            const m = /^[\u00ab"\u201c\u2018']?([A-Z][A-Z\u2019' -]{6,}[A-Z])\s*(?:[.,;:\u2014\u2013]|$)/.exec(ps[i]);
            if (m) caps.push({ p: n, i, pos, words: m[1].toLowerCase().split(/[^a-z]+/).filter(Boolean) });
          }
        }
      }
      return { lo, hi, heads, caps };
    });
    const located = (c, v, w) => {
      return once(`loc|${c.slug}|${w.name}|${w.ch}|${v}`, async () => {
        const printed = printedOf(c, v), sec = await section(c, w);
        if (sec.heads[printed]) return { p: sec.heads[printed].p, v };
        // a note headed only by the verse's words in capitals ("AND GOD SAW THE LIGHT THAT IT WAS GOOD."): between the notes on the
        // verses either side, the heading whose words are all in the verse
        let text; try { text = String(verseText(v) || '').toLowerCase(); } catch (_) { text = ''; }
        if (text) {
          const ks = Object.keys(sec.heads).map(Number);
          const before = Math.max(-1, ...ks.filter((k) => k < printed).map((k) => sec.heads[k].pos));
          const after = Math.min(Infinity, ...ks.filter((k) => k > printed).map((k) => sec.heads[k].pos));
          const have = new Set(text.split(/[^a-z]+/).filter(Boolean));
          const score = (x) => x.words.filter((q) => have.has(q)).length;
          const fit = sec.caps.filter((x) => x.pos > before && x.pos < after && x.words.length >= 3 && score(x) / x.words.length >= 0.7)
            .sort((x, y) => score(y) - score(x) || x.pos - y.pos);
          if (fit.length) return { p: fit[0].p, v };
        }
        // the library's own indexed note, if it lies in this commentary's section of the chapter (an index row can point into
        // another work printed in the same volume)
        if (c.notes[v] != null && +c.notes[v] >= sec.lo && +c.notes[v] < sec.hi) return { p: +c.notes[v], v, indexed: true };
        for (const cand of candidatePages((c.rows || {})[v], c.slug, w.name, w.ch, v).filter((x) => x.p >= sec.lo && x.p < sec.hi).slice(0, 8)) {
          for (const p of [cand.p - 2, cand.p - 1, cand.p]) {
            if (p < Math.max(1, sec.lo)) continue;
            const [en, la] = await getParas(c.slug, p);
            if (apparatusShare(en.length ? en : la) >= 0.8) continue; // a page of the editors' notes alone is no note on the verse
            if (findNote(en, printed) >= 0 || findNote(la, printed) >= 0) return { p, v };
          }
        }
        return null;
      });
    };
    async function resolve(c, v, w) {
      const here = await located(c, v, w);
      if (here) return { p: here.p, how: 'note', v, indexed: !!here.indexed };
      const sec = await section(c, w);
      const claims = [];
      for (const x of candidatePages((c.rows || {})[v], c.slug, w.name, w.ch, v)) {
        if (x.claim !== 'yes' || x.p < sec.lo || x.p >= sec.hi) continue;
        const [en, la] = await getParas(c.slug, x.p);
        if (apparatusShare(en.length ? en : la) < 0.8) claims.push(x); // a page that is nearly all the editors' notes is not "the comment"
      }
      const seek = async (dir, max) => {
        for (let d = 1; d <= max; d += 1) {
          const x = v + dir * d; if (x < 1) return null;
          const hit = await located(c, x, w);
          if (hit) return { p: hit.p, v: x };
        }
        return null;
      };
      const next = await seek(1, 12), prev = await seek(-1, 12);
      if (claims.length && (next || prev)) {
        const lo = prev ? prev.p : 0, hi = next ? next.p : Infinity;
        const mid = claims.map((x) => x.p).filter((p) => p >= lo && p <= hi).sort((x, y) => x - y)[0];
        if (mid != null) return { p: mid, how: 'page', v };
      }
      if (next && next.v - v <= 4) return { p: next.p, how: 'later', v: next.v };
      if (prev) return { p: prev.p, how: 'nearest', v: prev.v };
      if (next) return { p: next.p, how: 'later', v: next.v };
      if (c.open != null) return { p: Math.max(+c.open, sec.lo), how: 'chapter' };
      return null;
    }
    return { located, resolve, section };
  }

  return { strongRx, bareRx, strongNum, bareNum, capsNum, isApparatus, apparatusIndexes, apparatusShare, lemmaIndexes, findNote, noteEnd, gistClaims, candidatePages, createResolver };
}));
