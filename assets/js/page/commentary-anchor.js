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
  const bareNum = (s) => { const m = /^\(?(\d{1,3})\s*[.:)\]]\s*\S/.exec(s); return m ? +m[1] : null; };
  const isHead = (s) => /^#{1,6}\s+/.test(s);

  // The indexes of paragraphs that are the Bible's own words reprinted: a run of numbered lines counting up (five or more, or three
  // and four of them short, as verses are and a commentator's notes seldom are), or a paragraph carrying several verse marks that
  // count up inside it ("… 29. And God said: Behold … 30. and to all beasts … 31. And God saw …").
  function lemmaIndexes(paras) {
    const out = new Set();
    const nums = paras.map((s) => (strongNum(s) == null ? bareNum(s) : null));
    for (let i = 0; i < paras.length; i += 1) {
      if (nums[i] == null) continue;
      let j = i;
      while (j + 1 < paras.length && nums[j + 1] === nums[j] + 1) j += 1;
      const run = paras.slice(i, j + 1);
      if (run.length >= 5 || (run.length >= 3 && run.every((s) => s.length < 220))) { for (let k = i; k <= j; k += 1) out.add(k); }
      i = j;
    }
    paras.forEach((s, i) => {
      const marks = (s.match(/\s(\d{1,3})\.\s+\S/g) || []).map((m) => parseInt(m, 10));
      if (marks.some((n, k) => marks[k + 1] === n + 1)) out.add(i);
    });
    return out;
  }

  // The paragraph where the commentator's own note on verse `printed` begins, or -1. Never the reprinted text. A number in
  // parentheses is a footnote mark ("(1) Quaest. hebr. in Genes.") unless `loose` is set, which is for a page the library itself
  // indexed as holding the note (some commentaries print a psalm's verse as "(22)").
  function findNote(paras, printed, loose) {
    const lemma = lemmaIndexes(paras);
    const sx = strongRx(printed), bx = bareRx(printed);
    let i = paras.findIndex((s, k) => !lemma.has(k) && sx.test(s));
    if (i < 0) i = paras.findIndex((s, k) => !lemma.has(k) && bx.test(s) && (loose || !/^\(/.test(s)));
    return i;
  }

  // Where that note ends: the next heading, or the next verse's note, or `cap` paragraphs on.
  function noteEnd(paras, start, printed, cap) {
    const lemma = lemmaIndexes(paras), max = cap || 14;
    for (let j = start + 1; j < paras.length && j < start + max; j += 1) {
      if (isHead(paras[j])) return j;
      const sn = strongNum(paras[j]);
      if (sn != null && sn !== printed) return j;
      const bn = sn == null ? bareNum(paras[j]) : null;
      if (bn != null && bn > printed && !lemma.has(j)) return j;
    }
    return Math.min(paras.length, start + max);
  }

  // Whether a page's one-line gist, as the reception file carries it, is about this verse: 'yes' (it names a range holding the verse
  // in this chapter of this book), 'no' (it names verses, but not this one), or 'unknown' (it names none). "A commentary on
  // Genesis 1:3-4 …" is 'no' for 1:1; "… on 2 Peter 1:1" is 'no' for Genesis 1:1.
  function gistClaims(gist, bookName, ch, v) {
    const g = String(gist || '');
    const rx = /((?:[1-3]|I{1,3})\s)?([A-Z][a-z]+)\.?\s+(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-\u2013\u2014]\s*(\d{1,3}))?/g;
    const book = String(bookName || '').toLowerCase();
    let m, any = false;
    while ((m = rx.exec(g))) {
      any = true;
      const word = m[2].toLowerCase();
      const same = word.length >= 3 && (book === word || book.endsWith(` ${word}`) || book.startsWith(word)) && !m[1];
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
  function createResolver(getParas) {
    const printedOf = (c, v) => (c.pv && c.pv[v]) || v;
    const memo = new Map();
    const once = (k, make) => { if (!memo.has(k)) memo.set(k, make()); return memo.get(k); };
    const section = (c, w) => once(`sec|${c.slug}|${w.name}|${w.ch}`, async () => {
      const hi = c.close != null ? +c.close : Infinity;
      const from = c.open != null ? +c.open : 0;
      let lo = from, best = 5;
      if (from > 0) {
        for (let n = from; n < hi && n < from + 260; n += 1) {
          const [en, la] = await getParas(c.slug, n);
          const ps = en.length ? en : la;
          const run = lemmaIndexes(ps).size;
          if (run > best) { best = run; lo = n; }
        }
      }
      return { lo, hi };
    });
    const located = (c, v, w) => {
      if (c.notes[v] != null) return Promise.resolve({ p: +c.notes[v], v, indexed: true });
      return once(`loc|${c.slug}|${w.name}|${w.ch}|${v}`, async () => {
        const printed = printedOf(c, v), sec = await section(c, w);
        for (const cand of candidatePages((c.rows || {})[v], c.slug, w.name, w.ch, v).filter((x) => x.p >= sec.lo && x.p < sec.hi).slice(0, 8)) {
          for (const p of [cand.p - 2, cand.p - 1, cand.p]) {
            if (p < Math.max(1, sec.lo)) continue;
            const [en, la] = await getParas(c.slug, p);
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
      const claims = candidatePages((c.rows || {})[v], c.slug, w.name, w.ch, v).filter((x) => x.claim === 'yes' && x.p >= sec.lo && x.p < sec.hi);
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

  return { strongRx, bareRx, strongNum, bareNum, lemmaIndexes, findNote, noteEnd, gistClaims, candidatePages, createResolver };
}));
