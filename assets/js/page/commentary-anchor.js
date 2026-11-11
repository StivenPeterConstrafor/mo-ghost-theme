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
   here second-guesses it, save one case: a page that carries the verse only in the text printed ahead of the notes, with no note
   on it, gives way to the page where the note follows (2026-11-08, Calvin; noteAfterText); everything else below is for the
   commentaries that have no such row. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FRCommentaryAnchor = api;
}(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const HEAD = '(?:ver(?:s(?:e|us)?)?\\.?\\s*|v\\.\\s*)';
  const strongRx = (n) => new RegExp(`^${HEAD}\\(?${n}\\b\\s*[.:,)\\]]`, 'i');
  // a bare numbered line; "31:35" opens with a chapter and its verse (Aquinas on Jeremiah), not with verse 31 (2026-11-08: Aquinas's
  // lemma "31:35 Thus says the Lord" was marked as his note on Jeremiah 31:31)
  const bareRx = (n) => new RegExp(`^\\(?${n}\\b(?!\\s*:\\s*\\d)\\s*[.:,)\\]]`);
  // a bare numbered line; a number in parentheses is a footnote mark, not a verse, and is not counted
  const bareNum = (s) => { const m = /^(\d{1,3})(?!\s*:\s*\d)\s*[.:)\]]\s*\S/.exec(s); return m ? +m[1] : null; };
  const romanNum = (r) => {
    const V = { I: 1, V: 5, X: 10, L: 50, C: 100 }, u = String(r).toUpperCase();
    let n = 0;
    for (let i = 0; i < u.length; i += 1) { const x = V[u[i]], y = V[u[i + 1]] || 0; if (!x) return NaN; n += x < y ? -x : x; }
    return n;
  };
  const WORDNUM = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN',
    'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN', 'TWENTY'];
  const numOf = (x) => (/^\d+$/.test(x) ? +x : WORDNUM.includes(String(x).toUpperCase()) ? WORDNUM.indexOf(String(x).toUpperCase()) + 1 : romanNum(x));

  /* THE VERSE A HEADING NAMES (2026-11-08, owner: "do more testing and then fix"; a survey of 2,674 landings over 80 verses). A note's
   * heading names its verse in more forms than "Vers. 1.", and none of these was read:
   *   - in brackets, after the section's or the column's own number: "(Vers. 14.)", "305 (Chap. I.--Ver. 1.)" (Jerome, the default
   *     commentary on the Prophets, which opened at the library's page with nothing marked), "2. [vers. 2, 3.]" (Augustine on the
   *     Psalms), "28. (Vers. 13, 14)." (Bonaventure);
   *   - several verses, as a list or a range: "VERSES 6, 7.", "VERS. 2-3.--", "Verses 1–3." (the catenae, the Gloss, Benson);
   *   - the chapter in Roman numerals: "LII. [Ib. XXI, 13.]", "[Gen. XV, 6.]" (Augustine's Questions), "TO GENESIS CHAP. I. v. I." (Calov);
   *   - Hammond's "Paraphrase. 10." and "Paraphrase 4, 5, 6.": he prints the verses, then his paraphrase of them, which is his comment
   *     (the reader was shown the verse he prints, marked as his note; on Hebrews 6:4, the verse alone, a line of his text).
   * verseHead(s) gives {a, b, list, chap}: every verse the heading names, and the chapter where it names one. A heading for another
   * chapter names none of this one's verses: Jerome's "(Chap. XIV.--Ver. 3.)" is not his note on Genesis 12:3. The number before a
   * bracket is the section's or the column's, never the verse: Augustine's "7. [vers. 8.]" is his note on verse 8, and it was marked as
   * his note on Psalm 2:7. "(Vers. 6 seqq.)" names its first verse only, as the print gives no end to it. A verse followed by a comment
   * with no such word is left as it is: the Catena Aurea's "26. And as they were eating …", then "Jerome When the typical Passover …",
   * cannot be told from a heading followed by its text (Willet's "3. The Exegesis or Theological Explication.", then "QVEST. I. …"), and
   * Baxter's and Patrick's verse is followed by their paraphrase under the same number. */
  /* A NOTE'S HEADING BEHIND ITS MARGIN (2026-11-08, owner: "do more testing and then fix"; Hammond's annotations were never read as
   * notes). Hammond sets the Greek or Hebrew word a note is on in the margin, before its heading, and the scan prints the word, or a
   * mark where it could not be read: "⟨…⟩ Δικαιοσύνη V. 17. Righteousness] For the explaining of this verse", "〈 in non-Latin alphabet
   * 〉 V. 1. Inditing]", with the letter of his note in the text ("⟨…⟩ f. Πέτρος V. 18. Rock]") or the word alone ("σωτηρίας V. 3.
   * Upholding]"); the head of his annotations may run on into the first of them: "Annotations on Psalm LI. 〈 in non-Latin alphabet 〉
   * V. 4. Clear] The word". Only before a verse's heading ("V. 17.") is this cut: a margin before anything else is left. */
  const MARGIN = /^(?:Annotations\s+on\s+(?:[A-Za-z]+\.?,?\s+){1,8}?(?:[IVXLC]+|\d{1,3})\.\s+)?(?:[\u0370-\u03ff\u1f00-\u1fff\u0590-\u05ff][\u0300-\u036f\s\u0370-\u03ff\u1f00-\u1fff\u0590-\u05ff'\u2019\u1fbd\u02bc,.;\u00b7]*)?(?:(?:\u2329[^\u232a]{0,40}\u232a|\u3008[^\u3009]{0,40}\u3009|\u27e8[^\u27e9]{0,40}\u27e9)(?:\s*[A-Za-z]\.)?[\u0300-\u036f\s\u0370-\u03ff\u1f00-\u1fff\u0590-\u05ff'\u2019\u1fbd\u02bc,.;\u00b7]*)*(?=(?:V|Ver|Vers|Verse)\.?\s*\d)/;
  const unmargin = (s) => String(s || '').replace(MARGIN, '');
  // a heading read only behind such a margin: never taken into the section's run of headings, which goes by their order (Psalm 15's
  // "Annotations on Psal. XV. V. 4. To his own hurt]" heads Psalm 16's first page); only as an annotation that quotes its verse
  const byMargin = (s) => { const t = String(s || '').replace(/^#{1,6}\s+/, '').replace(/^\s+/, ''); return unmargin(t) !== t; };
  const VWORD = '(?:ver(?:s(?:e|es|us)?)?\\.?|vv?\\.|paraphrase\\.?)';
  const CWORD = '(?:chap(?:ter)?|cap(?:ut)?)\\.?\\s*([IVXLC]+|\\d{1,3})\\.?';
  const H_LEAD = new RegExp(`^(?:\\d{1,4}|[IVXLC]{1,7})\\.?\\s+(?=[(\\[]|${CWORD}\\s*[-\\u2013\\u2014]{1,2}\\s*[(\\[])`, 'i');
  const H_CHAP_OUT = new RegExp(`^${CWORD}\\s*[-\\u2013\\u2014]{1,2}\\s*(?=[(\\[])`, 'i');
  const H_CHAP_IN = new RegExp(`^${CWORD}\\s*(?:[-\\u2013\\u2014]{1,2}|,)\\s*`, 'i');
  const H_WORD = new RegExp(`^${VWORD}\\s*\\(?(\\d{1,3})(?!\\d)`, 'i');
  const H_QUAEST = /^(?:Ib(?:id)?|[A-Z][a-z]{1,5})\.\s*([IVXLC]+)\s*,\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*\.?\s*\]/;
  // (the chapter's numeral ends at a stop, a comma or a space, and so does the verse's word: "CHAP. XVII." is no chapter X with a verse
  // II, and Piscator's "ANALYSIS CHAP. V. VI. &" no chapter V with a verse I)
  const H_ROMAN = /^(?:[A-Z]{2,}\s+){0,3}(?:CHAP|Chap|CAP|Cap)\.?\s*([IVXLC]+|\d{1,3})(?:\.\s*,?\s*|\s*,\s*|\s+)[Vv](?:[Ee][Rr](?:[Ss](?:[Ee]|[Uu][Ss])?)?)?(?:\.\s*|\s+)([IVXLC]+|\d{1,3})\s*[.:,]/;
  /* A ROMAN NUMBER AFTER THE VERSE WORD (2026-11-08, owner: "iterate until scripture can be used as a daily driver for what were doing";
   * data7: Stock on Malachi 3:12, his note at p. 239, opened at "Its next note is on Malachi 3:16"). Stock heads his notes "VERSE IIII.
   * Though Edom say", "VERS. XII. And all Nations shall call you blessed", from I to XVIII, and only an Arabic number was read after the
   * word. A Roman one is read too, in capitals, as a heading at the paragraph's start, after a stop and before a new sentence: "Ver. I
   * say" is the pronoun, "Vers. I. e." no heading. */
  const H_VROMAN = /^(?:VERS(?:E|US)?|Vers(?:e|us)?|Ver)\.?\s+([IVXLC]{1,7})\.\s+(?=["\u201c\u2018'(\[]?[A-Z])/;
  const spanOf = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
  function verseHead(s) {
    // (a part of a psalm's division ahead of its verse: Lombard's "PART II. VERS. 2.--")
    let t = unmargin(String(s || '').replace(/^#{1,6}\s+/, '').replace(/^\s+/, '')).replace(/^part\s+[IVXLC]+\.?\s*(?:[-–—]{1,2}\s*)?(?=ver|vv?\.)/i, '');
    let chap = null, m = H_ROMAN.exec(t);
    if (m) { const c = numOf(m[1]), v = numOf(m[2]); return c > 0 && v > 0 ? { a: v, b: v, list: [v], chap: c, br: false } : null; }
    if ((m = H_VROMAN.exec(t))) { const v = romanNum(m[1]); return v > 0 && v <= 176 ? { a: v, b: v, list: [v], chap: null, br: false, roman: true } : null; }
    const lead = H_LEAD.exec(t);
    if (lead) t = t.slice(lead[0].length);
    if ((m = H_CHAP_OUT.exec(t))) { chap = numOf(m[1]); t = t.slice(m[0].length); }
    const br = /^[(\[]\s*/.exec(t);
    if (br) t = t.slice(br[0].length);
    else if (lead) return null; // a number before a heading is the section's only where a bracket follows it
    if (br && (m = H_CHAP_IN.exec(t))) { chap = numOf(m[1]); t = t.slice(m[0].length); }
    if (br && br[0][0] === '[' && chap == null && (m = H_QUAEST.exec(t))) {
      const a = +m[2], b = m[3] ? +m[3] : a;
      return b >= a && b - a <= 40 ? { a, b, list: spanOf(a, b), chap: romanNum(m[1]), br: true } : null;
    }
    if (!(m = H_WORD.exec(t))) return null;
    // the verses: one, a list, or a range ("2, 3", "13-15", "9 and 10"), always climbing ("V. 3, 1 Cor. 2:9" is verse 3 and a citation)
    const a = +m[1], list = [a];
    let b = a, pos = m[0].length;
    for (;;) {
      const x = /^\s*(,|&|and\b|to\b|[-–—])\s*(\d{1,3})(?!\d)/i.exec(t.slice(pos));
      if (!x || +x[2] <= b || +x[2] - a > 40) break;
      if (/^(?:,|&|and)$/i.test(x[1])) list.push(+x[2]); else for (let k = b + 1; k <= +x[2]; k += 1) list.push(k);
      b = +x[2]; pos += x[0].length;
    }
    const rest = t.slice(pos).replace(/^\s*(?:et\s+)?(?:seqq?|sqq?|ff?)\.?/i, '');
    return /^\s*(?:[.:,;)\]–—-]|$)/.test(rest) ? { a, b, list, chap, br: !!br } : null;
  }
  // the first verse a heading names, in any chapter
  const strongNum = (s) => { const h = verseHead(s); return h ? h.a : null; };
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

  // A NOTE THAT QUOTES ITS VERSE (2026-11-08, QA on John 1:1). A commentary that annotates verse by verse opens each note with the
  // verse's number and its first words, closed by a bracket: "32. I saw the Spirit … descending like a dove] Either in the form of
  // …" (Poole's Synopsis), "9. Erat lux vera] Or, That light …" (the Critici Sacri). Such notes count up one by one as the reprinted
  // text does: Poole's twelve notes on John 1:32-43 on p. 595 were taken for the chapter's text, the section was started there,
  // and his note on 1:1 at p. 584, which the map and the library both give, was passed over ("No note on John 1:1 was found").
  // The bracket with the comment after it marks a note, so such a paragraph is never counted as the text. A bracket that closes
  // one opened before it ("the law [109] is manifested", a footnote's number; "[vers. 1.]") is not this one, nor one that only
  // closes the verse (Hammond prints his text "42. So also is the resurrection of the dead … raised in incorruption.]").
  function quotesVerse(s) {
    const t = String(s || '');
    let open = 0;
    for (let i = 0; i < Math.min(t.length, 300); i += 1) {
      if (t[i] === '[') open += 1;
      else if (t[i] === ']') { if (!open) return t.length - i > 20; open -= 1; }
    }
    return false;
  }
  // the highest verse mark a paragraph carries after its own number, counting on from it ("1. Have mercy upon me … 2. Multiply to
  // wash me …" carries verses 1 and 2)
  function innerTop(s, n) {
    let top = n;
    for (const m of String(s).matchAll(/\s(\d{1,3})\.\s+\S/g)) if (+m[1] === top + 1) top += 1;
    return top;
  }

  // The indexes of paragraphs that are the Bible's own words reprinted, in two parts:
  //   text   a run of numbered lines counting up (five or more, or three and four of them short, as verses are and a commentator's
  //          notes seldom are), or a paragraph carrying several verse marks that count up inside it ("… 29. And God said: Behold
  //          … 30. and to all beasts … 31. And God saw …"): the chapter's text, as Lapide prints it ahead of his notes;
  //   ahead  a section's verses printed ahead of the notes on them, each verse twice (see below).
  // THE TEXT PRINTED AHEAD OF ITS NOTES, EVERY VERSE TWICE (2026-11-08, QA: Calvin, the default commentary on Hebrews and Romans,
  // marked only the reprinted verse as the note at Hebrews 12:1, 12:5, 12:14 and Romans 3:23). The Calvin Translation Society
  // prints each section's verses before Calvin's notes on them, every verse in the translation and then in Calvin's Latin ("1.
  // Wherefore seeing we also …", "1. Proinde nos quoque …", "2. Looking unto Jesus …", "2. Intuentes …"), or several verses to a
  // paragraph ("1. Have mercy upon me … 2. Multiply to wash me …"); then the notes start the count again ("1. Wherefore, seeing we
  // also, etc. This conclusion is …"). The numbers go 1, 1, 2, 2, so no run counting up by one was found, the English verse was
  // taken for the note, the note was ended at "2. Looking unto Jesus", and Calvin's comment was left behind "Keep reading". A run
  // of verse numbers ("1. ") each printed once or twice in a row, with at least one printed twice or one paragraph carrying the
  // next verse inside it, is that text when the paragraph straight after it starts again at the run's first number and is at
  // least twice as long as any line of the run: the first note. A commentator's own notes, one to a verse, do not start again; a
  // paraphrase printed after each verse (Baxter: "5. And ye have forgotten …", "5. Have ye forgotten the Lord's gentle words …")
  // goes on to the next verse; an outline's heads ("2. The parties resembled", "2. His brethren", "2. The extent of that
  // evidence", Gouge) start again, but with a line no longer than they are; a homily's text ("49. Respondit Nathanael … 50. …")
  // is followed by the homily's own first section ("1. Multa nobis cura …"), not by verse 49. All are left alone.
  // Some of the Society's volumes set the notes' numbers with no stop ("13 But I would not have you ignorant.", "6 Inasmuch as he
  // was in the form of God."), a shape read nowhere else (an editor's line number is set so); after such a text, and up to the
  // next one, a paragraph so numbered, within the text's verses and in their order, is a note (`notes`: index to verse).
  // TWO LINES OF ONE NUMBER, THE SECOND IN THE OTHER TONGUE (2026-11-08, owner: "do more testing and then fix"; Calvin marked the verse
  // at Hebrews 1:3, 1 John 4:8, Isaiah 40:8, Daniel 7:13). A pair such as "15. And I will put enmity between thee and the woman …" and
  // "15. Et inimicitias ponam inter te et inter mulierem …" is the text, whatever follows it: the first note was often too short to be
  // twice as long as the verse, or stood two pages on (Genesis 3 is printed on pp. 58-59, the first note on p. 60). Such a pair has
  // next to no word in common and about one length; an outline's heads (Gouge) are too short to tell. A verse and its paraphrase in one
  // tongue may share as few ("8. I am Alpha and Omega, the beginning and the ending …", then Baxter's "8. I am everlasting, before all
  // Worlds and without end …"), but both carry English's small words, which a Latin line does not.
  // A SECTION'S TEXT UNDER ITS REFERENCE (same day: Calvin on John 1:14, Psalm 3:1). The Society heads each section with the verses
  // it takes ("John 1:14", "Psalm 3:1-2", "Hebrews Chapter 12:1-3", "MATTHEW 26:26-30; MARK 14:22-26; LUKE 22:17-20") and prints
  // them under it: the numbered lines straight after such a heading, within its verses and in their order, are that text when one of
  // them is printed twice in the two tongues, or carries the next verse inside it, or when the line after them starts the count again
  // (John 1:14: the verse, then "14. And the Speech was made flesh. The Evangelist shows …", the note). Where such a section of a few
  // verses is followed by prose with no number, that prose is the comment on its first verse (`after`: verse to index; Daniel 7:13,
  // "After Daniel has narrated …").
  const wordsOf = (s) => new Set(String(s).toLowerCase().replace(/^\W*\d{1,3}\W*/, '').split(/[^a-zß-ɏ]+/).filter((w) => w.length > 2));
  const EN_SMALL = /\b(?:the|and|of|to|that|unto|shall|thou|thee|thy|his|he|which|for|with|not|was|is|be|it|they|them|their|ye|my)\b/g;
  const english = (s) => new Set(String(s).toLowerCase().match(EN_SMALL) || []).size >= 2;
  // a paragraph's length without the translator's words in parentheses (2026-11-09: translated, twin)
  const glossless = (s) => String(s || '').replace(/\([^)]*\)/g, '').length || 1;
  function translated(x, y) {
    if (x.length < 30 || y.length < 30 || x.length > 700 || y.length > 700 || quotesVerse(x) || quotesVerse(y)) return false;
    if (english(x) && english(y)) return false;
    // (2026-11-09) the lengths without the translator's words in parentheses (Calvin's Latin of Jonah 2:3, "omnes conflictus tui (sed hac
    // voce intelligit undas …)", three times his English)
    const r = glossless(y) / glossless(x); if (r < 0.5 || r > 2) return false;
    const a = wordsOf(x), b = wordsOf(y); if (a.size < 4 || b.size < 4) return false;
    let n = 0; for (const w of a) if (b.has(w)) n += 1;
    return n / Math.min(a.size, b.size) <= 0.15;
  }
  // (2026-11-09, pane3b) and two verses with a comma, "Deuteronomy 27:9, 10", which Calvin's Harmony of the Law heads his passage with
  const REF_ONE = /^(?:(?:[1-3]|I{1,3})\s+)?[A-Z][A-Za-z]+(?:\s+(?:of\s+)?[A-Z][A-Za-z]+)?\.?\s+(?:Chapter\s+)?(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–,]\s*(\d{1,3}))?$/;
  function refHead(s) {
    const t = String(s || '').replace(/^#{1,6}\s+/, '').trim();
    if (!t || t.length > 120) return null;
    const out = [];
    for (const part of t.split(/\s*;\s*/)) { const m = REF_ONE.exec(part); if (!m) return null; const a = +m[2], b = m[3] ? +m[3] : a; if (b < a) return null; out.push([a, b]); }
    return out;
  }
  // (2026-11-08) a heading's references with their book and chapter: "Hebrews Chapter 12:9-11" is [{book: 'Hebrews Chapter', c: 12, a: 9, b: 11}]
  const refsOf = (s) => (refHead(s) ? String(s).replace(/^#{1,6}\s+/, '').trim().split(/\s*;\s*/).map((x) => {
    const m = REF_ONE.exec(x); return { book: x.slice(0, x.search(/\d{1,3}\s*:/)).trim(), c: Number(m[1]), a: Number(m[2]), b: Number(m[3] || m[2]) };
  }) : []);
  const prose = (s) => s.length >= 80 && !/^#{1,6}\s/.test(s) && /^[«"“‘']?[A-Za-z]/.test(s) && verseHead(s) == null && refHead(s) == null;
  function lemmaParts(paras) {
    const text = new Set(), runText = new Set(), ahead = new Set(), notes = new Map(), after = new Map(), runs = [];
    const app = apparatusIndexes(paras);
    // a paragraph with a verse heading of its own ("2. [vers. 2, 3.]") is a note, never a line of the text, whatever number it opens with
    const hd = paras.map((s) => verseHead(s) != null);
    const nums = paras.map((s, i) => (app.has(i) || quotesVerse(s) || hd[i] ? null : bareNum(s)));
    for (let i = 0; i < paras.length; i += 1) {
      if (nums[i] == null) continue;
      let j = i;
      while (j + 1 < paras.length && nums[j + 1] === nums[j] + 1) j += 1;
      const run = paras.slice(i, j + 1);
      if (run.length >= 5 || (run.length >= 3 && run.every((s) => s.length < 220))) { for (let k = i; k <= j; k += 1) { text.add(k); runText.add(k); } }
      i = j;
    }
    paras.forEach((s, i) => {
      if (app.has(i) || hd[i]) return; // a note under a "Vers. N." heading may list 1. 2. 3. inside it; it is still the note
      const marks = (s.match(/\s(\d{1,3})\.\s+\S/g) || []).map((m) => parseInt(m, 10));
      if (marks.some((n, k) => marks[k + 1] === n + 1)) text.add(i);
    });
    // a verse's number as the text prints it, "12. " ("1:12 " is Aquinas's chapter and verse, read as 1 above); a note's number as
    // that, or with no stop ("13 But")
    const vn = paras.map((s, i) => { const m = nums[i] != null && /^(\d{1,3})\.\s+\S/.exec(s); return m ? +m[1] : null; });
    const wn = paras.map((s, i) => { if (vn[i] != null || app.has(i) || quotesVerse(s)) return vn[i]; const m = /^(\d{1,3})\s+["\u201c\u2018']?[A-Z]/.exec(s); return m ? +m[1] : null; });
    for (let i = 0; i < paras.length; i += 1) {
      if (vn[i] == null) continue;
      let j = i, top = innerTop(paras[i], vn[i]), shape = top > vn[i], long = paras[i].length, pair = false;
      while (j + 1 < paras.length && vn[j + 1] != null) {
        const n = vn[j + 1];
        // the same verse again (in the original), once, after a paragraph that carried that verse alone
        // (a run that opens with a verse and its translation: notes counting up before the next section's text are not that text)
        if (n === vn[j] && (j === i || vn[j - 1] !== n) && top === n) { shape = true; if (j === i && translated(paras[j], paras[j + 1])) pair = true; }
        else if (n !== top + 1) break;
        j += 1;
        top = Math.max(top, innerTop(paras[j], n));
        if (top > n) shape = true;
        long = Math.max(long, paras[j].length);
      }
      const k1 = j + 1;
      if (pair || (shape && k1 < paras.length && wn[k1] === vn[i] && paras[k1].length >= 2 * long)) {
        for (let k = i; k <= j; k += 1) ahead.add(k);
        runs.push([j + 1, vn[i], top]);
        i = j;
      }
    }
    for (let i = 0; i < paras.length; i += 1) {
      let rs = refHead(paras[i]);
      if (!rs) continue;
      let j = i;
      while (j + 1 < paras.length && refHead(paras[j + 1])) { j += 1; rs = rs.concat(refHead(paras[j])); } // the Harmony names three
      // each named passage's text is entered once, at its first verse (the Harmony's three, one after another)
      const inR = (n) => rs.some(([a, b]) => a <= n && n <= b), entered = new Set();
      const enter = (n) => { const q = rs.findIndex(([a], x) => a === n && !entered.has(x)); if (q >= 0) entered.add(q); return q >= 0; };
      const got = [];
      let last = null, twice = false, top = -1, firm = false, k = j + 1;
      for (; k < paras.length; k += 1) {
        if (app.has(k)) continue;
        const n = vn[k];
        if (n == null || !inR(n)) break;
        if (n === last) { if (twice || !translated(paras[got[got.length - 1]], paras[k])) break; twice = true; firm = true; } else {
          if (last == null) enter(n);
          else if (n <= top && !enter(n)) break; // the count starts again: the first note
          twice = false;
        }
        const t = innerTop(paras[k], n);
        if (t > n) firm = true;
        got.push(k); last = n; top = Math.max(top, t);
      }
      const nx = k < paras.length ? (vn[k] != null ? vn[k] : wn[k]) : null;
      if (got.length && (firm || (nx != null && nx <= top && inR(nx)))) {
        const a = vn[got[0]];
        for (const g of got) ahead.add(g);
        runs.push([k, a, top]);
        if (top - a <= 3 && k < paras.length && nx == null && prose(paras[k])) after.set(a, k);
      }
      i = Math.max(i, k - 1);
    }
    for (const [from, a, b] of runs) {
      let last = a;
      for (let m = from; m < paras.length && !ahead.has(m); m += 1) {
        const x = wn[m]; if (x == null) continue;
        if (x < last || x > b) break;
        notes.set(m, x); last = x;
      }
    }
    return { text, runText, ahead, notes, after, all: new Set([...text, ...ahead]) };
  }
  const lemmaIndexes = (paras) => lemmaParts(paras).all;

  // A VERSE MARKED BY ITS CHAPTER AND NUMBER IN THE RUN OF THE TEXT (2026-11-08, owner "fix this": Luther's Galatians, WA 40 I, said
  // "No note on Galatians 2:16 was found"). The Weimar edition prints the verse's place before its first words, inside the paragraph:
  // "… non solum ceremonias cavillatur. 2, 16 Scientes autem, quod non iustificatur homo ex operibus legis." (English: "… ceremonies
  // only. 2, 16 Knowing that a man is not justified …"). A marker is the chapter's number, a comma and the verse's, at a paragraph's
  // start or after a sentence's last word (a word in small letters and its stop, so "Gal. 2, 16" in a citation, or "cf. 2, 16", is
  // not one), before the verse's first word in capitals (a bare "2, 16" in the margin is a cross-reference: Rörer's notes list "2, 16", "2, 14", "2, 12"). cvMarks(s, ch) gives the markers of chapter `ch` in a paragraph:
  // [{v, at}], `at` where the marker stands.
  const CV_START = /^\s*(\d{1,3})\s*,\s*(\d{1,3})(?!\d)\s?(?=[A-Z\u00c0-\u00de\u2018\u201c'"])/;
  const CV_IN = /(^|[^A-Za-z\u00c0-\u024f])([a-z\u00df-\u024f]{3,})[.!?;:]['"\u2019\u201d\u00bb)\]]?\s{1,2}(\d{1,3})\s*,\s*(\d{1,3})(?!\d)\s?(?=[A-Z\u00c0-\u00de\u2018\u201c'"])/g;
  const CV_ABBR = new Set(['vgl', 'ibid', 'cap', 'vers', 'col', 'pag', 'fol', 'lib', 'sect', 'art', 'dist', 'etc', 'seq', 'sqq', 'supra', 'infra', 'ver', 'loc']);
  function cvMarks(s, ch) {
    const t = String(s || ''), c = Number(ch), out = [];
    if (!(c > 0)) return out;
    const m0 = CV_START.exec(t); if (m0 && +m0[1] === c) out.push({ v: +m0[2], at: 0 });
    for (const m of t.matchAll(CV_IN)) if (+m[3] === c && !CV_ABBR.has(m[2])) out.push({ v: +m[4], at: m.index + m[1].length + m[2].length + 1 });
    return out;
  }

  /* A HEADING THAT QUOTES ANOTHER VERSE (2026-11-08, owner: "do more testing and then fix"; round 3 of the survey left 16 wrong marks
   * among the 374 landings whose mark changed). A note's heading may give the words it comments on: in « » (Lombard: "VERS. 6.-- «
   * Because of truth and meekness and justice … »"), after "VERS. N.--" (the Gloss: "VERSE 1.-- Unto the end, a psalm."), or before a
   * bracket ("Verse 5. Having a form of godliness] The original word", Clarke). Lombard divides the psalms as the Vulgate does: his "VERS.
   * 6." on Psalm 45 quotes 45:4b ("for the cause of truth and meekness and righteousness"), and was marked as his note on 45:6; that
   * note is his "VERS. 8.-- « Thy throne, O God, is for ever and ever »". A heading whose quoted words are English and share none of the
   * verse's own words (the small words aside, old spellings folded: "Thy", "vnto", "doth") is no note on that verse, whatever number it
   * carries. Only quoted words count: a heading with none, or with Latin ones ("9. Erat lux vera]", the Critici Sacri), is left as it
   * is, as an English verse shares no word with them. */
  // the words a note's heading quotes from its verse, or '' (never a paraphrase's words: Hammond's "Paraphrase 6." is his own)
  function lemmaOf(s) {
    let t = unmargin(String(s || '').replace(/^#{1,6}\s+/, '').trim()).replace(/^part\s+[IVXLC]+\.?\s*/i, '');
    if (/^paraphrase\b/i.test(t)) return '';
    const h = afterHead(t);
    if (h !== t) t = h;
    else { const m = /^\(?\d{1,3}\)?\s*[.:)]?\s+/.exec(t); if (!m) return ''; t = t.slice(m[0].length); }
    // (a word the scan could not read, after the heading: Hammond's "V. 4. 〈 in non-Latin alphabet 〉 And in thy Majesty]")
    t = t.replace(/^(?:\u2329[^\u232a]{0,40}\u232a|\u3008[^\u3009]{0,40}\u3009|\u27e8[^\u27e9]{0,40}\u27e9|\s)+/, '');
    let m;
    if ((m = /^[-\u2013\u2014]{1,2}\s*/.exec(t))) {
      const plain = /^--?\s*$/.test(m[0]);
      t = t.slice(m[0].length);
      if ((m = /^\u00ab\s*([^\u00bb]{2,300}?)\s*\u00bb/.exec(t))) return m[1];
      // (the words set in capitals, where the note goes on in small letters: Migne's "VERSE 19. — AND, that is, afterward, when the
      // supper had taken place")
      if ((m = /^[A-Z][A-Z'\u2019]*(?:[\s,;:]+[A-Z][A-Z'\u2019]*)*(?=[\s,;:.?!]+[a-z0-9\u00b0]|[.?!]|$)/.exec(t)) && /[A-Z]{2}/.test(m[0])) return m[0];
      // the first sentence after "VERS. N.--", as Lombard and the Gloss print the verse ("VERS. 3.-- And they cried. (ID.) They do not say
      // it lightly"); after a printer's dash the words may be the note's own ("Ver. 15. — For the Son is the Word of the Father", Lapide)
      return plain ? (/^[^.?!;:\]]{2,200}/.exec(t) || [''])[0] : '';
    }
    if ((m = /^\u00ab\s*([^\u00bb]{2,300}?)\s*\u00bb/.exec(t))) return m[1];
    // (Estius's verse ends at a stop set apart: "v. 4. And he shall have exercised vengeance also upon their gods . What kind of vengeance")
    if ((m = /^([^.?!\]]{3,200}?)\s\.(?:\s|$)/.exec(t))) return m[1];
    // before a bracket that closes none opened before it ("[Hier., Aug.]" is a citation, "[כִּסְאֲךָ]" a word quoted)
    let open = 0;
    for (let i = 0; i < Math.min(t.length, 300); i += 1) {
      if (t[i] === '[') open += 1;
      else if (t[i] === ']') { if (!open) return t.slice(0, i); open -= 1; }
    }
    return '';
  }
  // the words of a verse or a lemma that tell it from another: lower case, old spellings folded (u for v, i for j: "vnto", "iust"; no
  // hyphen: "First-born"); the small words dropped, and "God" and "Lord", which every psalm has. Two words are one where they share a
  // long stem ("righteousnesse", "comforteth") or differ only in an ending (sameWord: "sonne" and "son", "dayes" and "days", "come" and
  // "coming"); "fire" is no "firstborn", "word" no "world"
  const fold = (w) => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\u017f/g, 's').replace(/v/g, 'u').replace(/j/g, 'i').replace(/['\u2019-]/g, '');
  function sameWord(a, b) {
    if (a === b) return true;
    let p = 0;
    while (p < a.length && p < b.length && a[p] === b[p]) p += 1;
    if (p >= 6) return true;
    const [x, y] = a.length <= b.length ? [a, b] : [b, a];
    return p >= 3 && p >= x.length - 1 && /^(?:|e|s|d|y)$/.test(x.slice(p)) && /^(?:|e|s|es|d|ed|th|eth|st|est|ing|n|ne|ies|ied)$/.test(y.slice(p));
  }
  const SMALL = new Set(('a about above after again against all also am an and any are art as at be because been before being both but by can could '
    + 'did do doe doest doeth does doth done down each even every for from had hast hath have having he her here hers him his how i if in into is it '
    + 'its let lo may me might mine more most much my nay neither no nor not now o of off oh on once one only or other our ours out over own said '
    + 'saith say shall shalt she should so some such than that the thee their theirs them then there therefore these they thine this those thou '
    + 'though through thus thy till to too under unto up upon us very was we were what when where wherefore which while who whom whose why will '
    + 'wilt with would ye yea yet you your yours has must says saying didst hadst wast wert thereof therein thereby wherein whereby hereby '
    + 'himself herself itself myself thyself ourselves yourselves themselves like among between within without toward towards behold etc '
    + 'god lord').split(' ').map(fold));
  function wordsTold(s, names) {
    const out = new Set();
    for (const w of String(s || '').replace(/(\w)-\s*(\w)/g, '$1$2').split(/[^A-Za-z\u00c0-\u024f\u017f'\u2019-]+/)) {
      let x = fold(w).replace(/[^a-z\u00df-\u024f]/g, '');
      if (x.length < 3 || (SMALL.has(x) && !(names && (x === 'god' || x === 'lord')))) continue;
      if (x === 'foreuer' || x === 'euermore') x = 'euer';
      out.add(x.replace(/tre$/, 'ter'));
    }
    return out;
  }
  // how many of the words `a` the words `b` have
  const shared = (a, b) => { let n = 0; for (const x of a) for (const y of b) if (sameWord(x, y)) { n += 1; break; } return n; };
  /* (2026-11-08, as at H_VROMAN) a Roman verse heading is the note on its verse only where the words after it are that verse's, two words
   * that tell at least (one, where the verse has no more): Stock's "VERS. XII. And all Nations shall call you blessed" (Malachi 3:12),
   * Cocceius's "VERSE XIII. AND MAKE STRAIGHT PATHS FOR YOUR FEET" (Hebrews 12:13). Rivet's Decalogue, which the map gives as his Exodus
   * 3, heads "VERSE II. I am the LORD thy God"; de Dieu's "VERS. II. He came unto his own" is John 1:11; Cocceius's Hebrews, listed on
   * Psalm 110, heads 8:3 "VERS. III. FOR EVERY HIGH PRIEST IS APPOINTED TO OFFER GIFTS", one word of Psalm 110:3 ("Thy people offer
   * themselves willingly"): none of them is the note on Exodus 3:2, John 1:2 or Psalm 110:3. Where the verse's words are not given, the
   * heading stands. */
  const afterRoman = (s) => { const t = unmargin(String(s || '').replace(/^#{1,6}\s+/, '').trim()), m = H_VROMAN.exec(t); return m ? t.slice(m[0].length) : t; };
  const romanFits = (s, text) => {
    if (!String(text || '').trim()) return true;
    const v = wordsTold(text);
    return shared(wordsTold(afterRoman(s).slice(0, 300)), v) >= Math.max(1, Math.min(2, v.size));
  };
  // a lemma in English: an English small word in it, and no Latin, German or French one ("Erat lux vera", "Ynn dem anfang")
  const EN_SURE = /\b(?:the|and|of|to|that|unto|shall|thou|thee|thy|thine|his|he|him|which|for|with|not|was|they|them|their|ye|my|you|your|we|our|us|hath|have|had|having|are|were|will|from|upon|this|these|those|who|whom|what|there|when|by|all|but|or|art|doth|been|being|she|her|its|it|be)\b/i;
  const NOT_EN = /\b(?:et|est|sunt|non|ad|cum|qui|quae|quod|ut|sed|enim|autem|ex|per|ab|eius|ejus|erat|esse|te|tu|se|sicut|super|quia|nec|neque|ego|hic|haec|hoc|ille|illa|illud|ipse|omnis|omnes|omnia|nos|vos|nobis|vobis|mihi|tibi|sibi|quoniam|ecce|eum|eam|eos|iste|ista|istud|vero|quis|quid|quem|quam|ubi|tunc|nunc|sic|ita|etiam|atque|ac|aut|vel|deus|dominus|domine|dei|domini|deo|meus|mea|meum|tuus|tua|tuum|suus|sua|suum|der|die|das|dem|den|des|und|ist|nicht|ein|eine|zu|mit|von|auf|sich|ich|du|er|wir|ynn|vnd|nit|le|la|les|un|une|il|elle|que|dans|pour|sur|avec|ce|cette|au|aux|pas|nous|vous)\b/i;
  const englishLemma = (s) => EN_SURE.test(s) && !NOT_EN.test(s);
  /* A VERSE PRINTED IN BOTH TONGUES (2026-11-09, owner: "iterate until scripture can be used as a daily driver for what were doing"). The
   * Calvin Translation Society prints each section's verses in English and in Calvin's Latin, one after the other (lemmaParts reads them
   * as the text by their numbers), but a pair is missed where the English line has no stop, "3 Let nothing be done through strife",
   * beside "3. Nihil per contentionem" (Philippians 2:3), or where the two share the names that make them look alike, "11. For thus
   * Amos saith, Jeroboam shall die by the sword" beside "11. Quia sic dicit Amos, Gladio morientur Jeroboam" (Amos 7:11): the Latin line
   * and the English one were marked as his notes. A numbered paragraph is never a note where a paragraph next to it opens with the same
   * number in the other tongue and is about as long, the translator's words in parentheses aside (his Latin of Jonah 2:3 carries a gloss
   * three times the verse's length: "omnes conflictus tui (sed hac voce intelligit undas …)"). */
  const LEAD_NUM = /^\(?(\d{1,3})\)?\.?\s+\S/;
  // which tongue a line is in, by its small words, English or Latin, the more of them ("shall die by the sword" is English, though NOT_EN
  // has "die" for the German article)
  const EN_SMALL_G = new RegExp(EN_SURE.source, 'gi');
  const LA_SMALL_G = /\b(?:et|est|sunt|non|ad|cum|qui|quae|quod|ut|sed|enim|autem|ex|per|ab|eius|ejus|erat|esse|te|tu|se|sicut|super|quia|nec|neque|ego|hic|haec|hoc|ille|illa|illud|ipse|omnis|omnes|omnia|nos|vos|nobis|vobis|mihi|tibi|sibi|quoniam|ecce|eum|eam|eos|vero|quis|quid|quem|quam|ubi|tunc|nunc|sic|ita|etiam|atque|ac|aut|vel|meus|mea|meum|tuus|tua|tuum|suus|sua|suum|de)\b/gi;
  const tongue = (s) => {
    const t = String(s || '').slice(0, 200), en = (t.match(EN_SMALL_G) || []).length, la = (t.match(LA_SMALL_G) || []).length;
    return en >= 2 && en > 2 * la ? 'en' : la >= 2 && la > 2 * en ? 'la' : '';
  };
  // (2026-11-10, pane3c) whether verse n stands on these paragraphs as a verse printed in both tongues: the passage's text, not a note
  const printedText = (paras, n) => paras.some((s, k) => { const m = LEAD_NUM.exec(s || ''); return !!m && +m[1] === +n && twin(paras, k); });
  function twin(paras, k) {
    const m = LEAD_NUM.exec(paras[k] || ''), a = m ? tongue(paras[k]) : '';
    if (!a) return false;
    return [k - 1, k + 1].some((j) => {
      const s = paras[j], n = LEAD_NUM.exec(s || ''); if (!n || n[1] !== m[1]) return false;
      const b = tongue(s), r = glossless(s) / glossless(paras[k]);
      return !!b && b !== a && r >= 0.5 && r <= 2;
    });
  }
  // how a heading's quoted words stand to a verse: {n: its words that tell, hit: how many of them the verse has}, or null where it quotes
  // nothing in English, or the verse is not given
  function quoteFit(s, text) {
    // (what the commentator puts in brackets inside the words is his: Poole's "Go ye (one hither, another thither:) therefore]")
    const lem = lemmaOf(s).replace(/\([^)]*\)/g, ' ');
    if (!lem.trim() || !text || !String(text).trim() || !englishLemma(lem)) return null;
    const a = wordsTold(lem);
    return { n: a.size, hit: shared(a, wordsTold(text)) };
  }
  // the verses' words given: one text, or several (the verse whose note is looked for, then the verse the reader chose)
  const textsOf = (text) => (Array.isArray(text) ? text : [text]).map((x) => String(x || '')).filter((x) => x.trim());
  // whether the heading quotes another verse than those whose words are `text`: QUOTE_MIN or more words that tell, none of them any of
  // the verses'. Two words are too few to judge by: Lombard's "VERS. 1.-- "O Lord, why are they multiplied that afflict me?"" is his
  // note on Psalm 3:1, which the page prints "O LORD, how many are my foes!". Not a heading of several verses, whose words are its
  // first verse's ("VERS. 2-3.-- « And I will make of thee a great nation, »", the Gloss on Genesis 12:3), nor a psalm's title, which
  // the Hebrew counts in its first verse and the page may not print there ("VERS. 1.-- Unto the end, a psalm of David"). A next note's
  // heading is weighed against the verse the reader chose as well: Migne's "VERSE 15. — CHRIST HAS REDEEMED US FROM THE CURSE", taken
  // for his next note after Galatians 3:13, is his note on 3:13
  const QUOTE_MIN = 3;
  const TITLE_IN = /\b(?:psalm|psalme|song|maschil|michtam|musician|musitian|title|inscription|superscription|unto the end|for the end|to the end)\b/i;
  // (words in Hebrew or Greek beside the quotation: the commentator's own rendering of them, as Poole's "13. And he prepared many works,
  // וּמְלָאכָה רַבָּה הָיָה לוֹ]" on 2 Chronicles 17:13, where the page prints "he had large supplies")
  const ORIGINAL = /[\u0370-\u03ff\u1f00-\u1fff\u0590-\u05ff]/;
  function quotesOther(s, text) {
    const ts = textsOf(text), h = verseHead(s), lem = lemmaOf(s);
    if (!ts.length || (h && h.list.length > 1) || TITLE_IN.test(lem) || ORIGINAL.test(lem)) return false;
    return ts.every((t) => { const f = quoteFit(s, t); return !!f && f.n >= QUOTE_MIN && f.hit === 0 && wordsTold(t).size >= 1; });
  }

  /* HAMMOND'S OWN MARKS OF A PSALM OR A CHAPTER (2026-11-08): the head of his annotations ("Annotations on Psal. XV.", "Annotations on S.
   * MATTHEW Chap. V.") and a psalm's title ("The Forty Fifth PSALM.", "The Hundred and Tenth PSALM.", in his spellings "Seventeeth" and
   * "Ninteenth"), which no other heading reads. hammondChapter(s) gives the number, or 0. He counts the psalms as the English do. */
  const ORDS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11,
    twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, seventeeth: 17, eighteenth: 18,
    nineteenth: 19, ninteenth: 19, twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60, seventieth: 70, eightieth: 80,
    ninetieth: 90, hundredth: 100, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 };
  function hammondChapter(s) {
    const t = String(s || '').replace(/^#{1,6}\s+/, '');
    let m = /^Annotations\s+on\b[^\]]{0,80}?\b(?:Psal(?:m)?|Chap(?:ter)?)\.?\s+([IVXLC]+|\d{1,3})\b/i.exec(t);
    if (m) return numOf(m[1]) || 0;
    if (!(m = /^The\s+((?:[A-Za-z]+\s+){1,4})psalm\b/i.exec(t))) return 0;
    let n = 0;
    for (const w of m[1].trim().split(/\s+/)) { const x = w.toLowerCase(); if (x !== 'and') { if (!ORDS[x]) return 0; n += ORDS[x]; } }
    return n;
  }
  // the chapter each paragraph stands under, by a heading on a line of its own ("CHAPTER ONE.", Piscator's "ANALYSIS CHAP. V. VI. &"),
  // and whether that is chapter `ch`: a note under a heading of another chapter is that chapter's (Psalm 33's "1. REjoyce in the LORD"
  // below "PSAL. XXXIII.", on the page Poole's Annotations are indexed at for Psalm 32; a psalm's number in the Vulgate's count is this one's).
  // (2026-11-08) By Hammond's marks too, his count only, and what stands above the psalm's own title is the psalm before's: Psalm 15's
  // "Annotations on Psal. XV. V. 4." heads the page of Psalm 16, and Psalm 17's "Paraphrase. 10." follows Psalm 16's "V. 10. Hell]"
  /* (2026-11-09, owner: "iterate until scripture can be used as a daily driver for what were doing") and by a section's reference heading,
   * as the resolver's section reads it (foreign): Calvin's Harmony of the Law heads each passage with its reference and prints the text it
   * names under it ("Exodus 23:13", "13. ... and make no mention of the name of other gods"), and what follows, to the next such heading or
   * chapter heading, is that passage's. His "13. Make no mention of the name of other gods", on Exodus 23:13, was marked as his note on
   * Deuteronomy 6:13, whose own section ("Deuteronomy 6:13", "13. ... shalt swear by his name.") stands above it on p. 233. A run of
   * references is one heading (the Harmony of the Gospels' "Matthew 26:26-30", "Mark 14:22-26", "Luke 22:17-20"), and it scopes only where
   * the line after it opens with a verse it names: a reference standing alone in a note is a citation. */
  const refChapters = (s) => String(s).replace(/^#{1,6}\s+/, '').trim().split(/\s*;\s*/).map((y) => { const m = REF_ONE.exec(y); return m ? +m[1] : 0; });
  /* (2026-11-10, pane3c; the node gate's hand read) THE NOTES OF THE PASSAGE BEFORE. The Harmony prints two passages one after the other
   * and then his notes on the first: "Deuteronomy 8:7-10" with its text, "Deuteronomy 11:10-12" with its text, then "7. For the Lord thy
   * God" and "10. When thou hast eaten and art full", his notes on 8:7 and 8:10; the second was marked as his note on Deuteronomy 11:10,
   * and shown as the closest earlier note on 11:12 and 11:13. Where the paragraph that follows a reference's printed text is a note
   * numbered below the reference's first verse, the notes there are the passage before's and no note of this reference, to the next
   * heading; a note among them that opens as the reference's own printed verse of its number does ("11. But the land" after "11. But
   * the land, whither ye go to possess it") is the reference's again, and so are those after it. (Only the paragraph next after the text:
   * Calvin's commentaries go on from "Hosea 9:6" and his comment to "7. The days of visitation are come" with no heading of its own.) */
  const firstTwo = (s) => String(s || '').replace(/^\W*\d{1,3}\W*/, '').toLowerCase().replace(/[^a-z\s]/g, ' ').trim().split(/\s+/).slice(0, 2).join(' ');
  function chapterScope(paras, ch) {
    let hc = null, hm = null, rc = null;
    // (the reference a paragraph stands under: its verses and chapters, the verses it prints, whether its text is still running, and
    // whether the notes are the passage before's)
    let ref = null;
    const under = [], marks = [], refs = [];
    // (a chapter's own heading ends the run of his marks before it: "CHAP. XVI." after "Annotations on S. MARK Chap. XV.")
    for (let k = 0; k < paras.length; k += 1) {
      const s = paras[k], m = chapterHead(s, false) || chapterHead(s, true), x = hammondChapter(s);
      if (m) { hc = m; hm = null; rc = null; ref = null; }
      if (x) hm = x;
      if (refHead(s) && !refHead(paras[k - 1] || '')) {
        let j = k, rs = refHead(s), cs = refChapters(s);
        while (j + 1 < paras.length && refHead(paras[j + 1])) { j += 1; rs = rs.concat(refHead(paras[j])); cs = cs.concat(refChapters(paras[j])); }
        const n = bareNum(paras[j + 1] || '');
        if (n != null && rs.some(([a, b]) => a <= n && n <= b)) { ref = { rs, cs, text: new Map(), inText: true, gone: false }; rc = cs; }
      } else if (ref && !refHead(s)) {
        const n = bareNum(s);
        if (n != null && twin(paras, k)) { if (tongue(s) === 'en' && !ref.text.has(n)) ref.text.set(n, firstTwo(s)); }
        else if (ref.inText) { ref.inText = false; if (n != null && ref.rs.every(([a]) => n < a)) { ref.gone = true; rc = [0]; } }
        else if (ref.gone && n != null && ref.text.get(n) && firstTwo(s) === ref.text.get(n)) { ref.gone = false; rc = ref.cs; }
      }
      under.push(hc); marks.push(hm); refs.push(rc);
    }
    const title = ch == null ? -1 : paras.findIndex((s) => /^(?:#{1,6}\s+)?The\s/.test(s) && hammondChapter(s) === +ch);
    const byMark = (k) => (marks[k] == null ? !(title >= 0 && k < title) : marks[k] === +ch);
    const byRef = (k) => refs[k] == null || refs[k].some((x) => x === +ch || vulgateOf(+ch).includes(x));
    return { under, mine: (k) => ch == null || ((under[k] == null || under[k] === +ch || vulgateOf(+ch).includes(under[k])) && byMark(k) && byRef(k)) };
  }
  /* HAMMOND'S ANNOTATION OVER HIS PARAPHRASE (2026-11-08, owner: the full argument, never a summary). Hammond prints a verse, then his
   * "Paraphrase N." of it, and after the paraphrases of the whole chapter, under "Annotations on Psalm XLV." or "Annotations on Chap. I.",
   * his notes on the verses that need one: "V. 6. Thy throne] The difficulty here is, to whom this verse … is … appliable", "⟨…⟩ Δικαιοσύνη
   * V. 17. Righteousness] For the explaining of this verse". Where he wrote one on the verse, it is his note, and the paraphrase is not.
   * An annotation is taken for the verse only where its quoted words are the verse's, as he prints it ahead of the paraphrase ("5.
   * Behold, I was born. shapen in iniquity", for "V. 5. Shapen]") or as the page gives it. */
  const PARA = /^(?:#{1,6}\s+)?paraphrase\b/i;
  function annotates(s, lines, text) {
    if (PARA.test(s)) return false;
    // ("God" and "Lord" count here: his "V. 1. My Lord]" on Psalm 110 quotes "THE Lord said unto my Lord")
    const lem = lemmaOf(s); if (!lem) return false;
    const a = wordsTold(lem, true);
    return [...lines, text].some((x) => !!x && shared(a, wordsTold(x, true)) > 0);
  }
  // the verse `v` as the commentator prints it on these pages, a bare numbered line ahead of his notes ("6. Thy throne, O God, is for ever")
  const printedLines = (paras, v) => paras.filter((s) => bareNum(s) === +v && verseHead(s) == null);
  // The paragraph where the commentator's own note on verse `printed` begins, or -1. Never the reprinted text. A number in
  // parentheses is a footnote mark ("(1) Quaest. hebr. in Genes.") unless `loose` is set, which is for a page the library itself
  // indexed as holding the note (some commentaries print a psalm's verse as "(22)"). With the chapter `ch`, a verse marked by its
  // chapter and number in the run of the text ("2, 16 Scientes autem") is found too.
  // (2026-11-08) The heading is any of verseHead's forms, of this chapter (a heading that names another chapter, and those after it,
  // are that chapter's), the narrowest where several name the verse ("VERS. 8.--" before "VERS. 1-8.--"). A paragraph that carries
  // such a heading is never read by the number it opens with: "7. [vers. 8.]" is not verse 7. `skip`, the section's reprinted text as
  // the resolver read it over its pages (a text that runs over a page break is not seen whole on one page), is never the note.
  // (romanText: the words of the verse a Roman heading must share, where `text` is not given; findNote's callers in the resolver)
  function noteAt(paras, printed, loose, ch, skip, text, romanText) {
    const { all: lemma, notes, after } = lemmaParts(paras), app = apparatusIndexes(paras);
    const v = +printed, bx = bareRx(printed);
    /* (2026-11-09, pane3b) a note numbered as the verse follows the heading of the passage that holds it, where that heading stands on
     * these pages with the text it names after it: one above it is an earlier passage's. Calvin's Harmony of the Law ends his Leviticus
     * 17:1-9 at the head of p. 147 ("8. And thou shalt say unto them"), above "Deuteronomy 17:8-11" and his "8 If there arise a matter
     * too hard for thee"; the first such heading counts */
    let gate = -1;
    for (let k = 0; ch != null && k < paras.length && gate < 0; k += 1) {
      if (!refsOf(paras[k]).some((r) => r.c === +ch && r.a <= v && v <= r.b)) continue;
      let j = k; while (j + 1 < paras.length && refHead(paras[j + 1])) j += 1;
      if (bareNum(paras[j + 1] || '') != null) gate = k;
    }
    const off = (k) => app.has(k) || !!(skip && skip.has(paras[k]));
    const { under, mine } = chapterScope(paras, ch);
    let i = -1, width = Infinity, cur = null;
    for (let k = 0; k < paras.length; k += 1) {
      // past a chapter's heading, once the verse's heading is found, what follows is the next chapter's (Lombard's Philemon "VERS. 1-6.--"
      // after his Titus 3 "VERS. 1-15.--" is no narrower note on Titus 3:5)
      if (i >= 0 && under[k] !== under[i]) break;
      const h = app.has(k) ? null : verseHead(paras[k]);
      if (!h) continue;
      if (h.chap != null) cur = h.chap;
      if (ch != null && cur != null && cur !== +ch) continue;
      // the heading word marks a note even where the note lists 1. 2. 3. inside it
      if (!h.list.includes(v) || off(k) || !mine(k)) continue;
      if (h.roman && !romanFits(paras[k], romanText != null ? romanText : text)) continue;
      // (Hammond's annotation that quotes the verse is taken over his paraphrase of it, of any width)
      if (i >= 0 && PARA.test(paras[i]) && !PARA.test(paras[k]) && annotates(paras[k], printedLines(paras, v), text)) { i = k; width = h.list.length; continue; }
      if (i >= 0 && PARA.test(paras[k]) && !PARA.test(paras[i]) && annotates(paras[i], printedLines(paras, v), text)) continue;
      if (h.list.length < width) { i = k; width = h.list.length; }
    }
    /* (2026-11-09) never a verse printed in both tongues (twin), but the comment after the pair where it opens unnumbered, the verse's
     * note: Calvin's "Here the Prophet retorts the complaints which the Jews had previously made" after "5. And I will come near to you to
     * judgment" and "5. Et appropinquabo ad vos in judicium" (Malachi 3:5). Without it the resolver read his page as the verse's text
     * only, with no note on it, and went on to the next note (Amos 2:13, p. 102 for p. 100) */
    const num = (x) => (LEAD_NUM.exec(x || '') || [])[1];
    const past = (k) => {
      // (where the pairs of several verses stand together, the comment after them opens on the first: Calvin's Micah 5:1 and 5:2, his
      // Amos 7:10-13, his Habakkuk 2:2 and 2:3; the pairs after the first are no note, and the comment is taken for the first verse only)
      const start = k > 0 && num(paras[k - 1]) === num(paras[k]) && twin(paras, k - 1) ? k - 1 : k;
      if (start > 0 && LEAD_NUM.test(paras[start - 1])) return -1;
      let j = k + 1; while (j < paras.length && twin(paras, j)) j += 1;
      const s = paras[j];
      // (a comment, not another passage's reference and text, "Leviticus 19:12. And ye shall not swear by my name falsely", nor a
      // heading, "Deuteronomy 10", "A REPETITION OF THE SAME", "Lecture Fortieth", nor a lecture's last words, "I cannot finish today")
      return s != null && s.length >= 80 && !lemma.has(j) && !off(j) && mine(j) && !LEAD_NUM.test(s) && verseHead(s) == null && !refHead(s)
        && !REF_BOOK.test(s) && /[a-z]/.test(s.slice(0, 40)) && !/^(?:#{1,6}\s+)?(?:Lecture|Prayer|Chapter|Psalm)\b/i.test(s)
        // (2026-11-09, pane3b) nor the next verse printed with a colon for its stop, "24: But let him that glorieth glory in this" (Jeremiah 9)
        && !/^\W{0,2}\d{1,3}\s*[:.]/.test(s) ? j : -1;
    };
    // (the pair is read as the text, the resolver's section's text too, and the comment after it is its note where nothing else is: a
    // numbered note on the verse further on comes first, Calvin's "1. If ye are risen with Christ." after his opening on Colossians 3)
    let viaPair = -1;
    if (i < 0) {
      for (let k = 0; k < paras.length; k += 1) {
        const s = paras[k];
        if (app.has(k) || !mine(k) || verseHead(s) != null || !bx.test(s) || (!loose && /^\(/.test(s))) continue;
        if (twin(paras, k)) { if (viaPair < 0) viaPair = past(k); continue; }
        if (!lemma.has(k) && !off(k) && k >= gate) { i = k; break; }
      }
    }
    if (i < 0) { const q = bracketNotes(paras, app).find((x) => x[1] === v && !off(x[0]) && mine(x[0])); if (q) i = q[0]; }
    // ("14 For if we believe." after the text; (2026-11-09) of this chapter's section, not another's under its own reference: chapterScope)
    if (i < 0) for (const [k, x] of notes) if (x === v && !off(k) && mine(k) && !twin(paras, k)) { i = k; break; }
    if (i < 0 && ch != null) i = paras.findIndex((s, k) => !off(k) && cvMarks(s, ch).some((x) => x.v === v));
    if (i < 0 && after.has(v) && !off(after.get(v)) && mine(after.get(v))) i = after.get(v); // the comment after a section's text that opens with the verse
    if (i < 0 && ch != null) i = refNote(paras, v, +ch, off);
    if (i < 0) i = viaPair;
    return i;
  }
  // (2026-11-08) With the verse's own words, `text` (the page's verse; see quotesOther), a heading that quotes another verse gives way
  // to another heading that names the verse and quotes it, else to one that quotes it closely, three or more of its words that tell and
  // twice as many as any other heading there, whatever number it carries (Lombard's "VERS. 8.-- « Thy throne, O God, is for ever and ever
  // »" for Psalm 45:6). With none, it is dropped only where it quotes five or more such words, none of them the verse's, and the note's
  // first words after them name nothing of the verse either (Lombard's Psalm 131 "VERS. 4.-- « As a child that is weaned is towards
  // his mother »", marked as his note on Psalm 130:4); REFUSED (-2) then says so, so that no older reading puts back the heading. A
  // commentator who divides the verses otherwise may quote the end of the verse before and go on to this one: the Gloss's "VER. 13.--
  // The elder shall serve the younger." goes on "Jacob I have loved", and Alcuin's "VERS. 1.-- What will you see in the Shulamite"
  // goes on "How beautiful are your steps in shoes" (the Vulgate's and the Hebrew's 7:1 of the Song is the English 6:13b and 7:1). A
  // heading with no quoted words is never taken in another's place. Without `text`, nothing changes.
  const REFUSED = -2, DROP_MIN = 5;
  function findNote(paras, printed, loose, ch, skip, text, romanText) {
    const ts = textsOf(text), k0 = noteAt(paras, printed, loose, ch, skip, ts[0], romanText);
    if (k0 < 0 || !quotesOther(paras[k0], ts)) return k0;
    const no = new Set(skip || []);
    no.add(paras[k0]);
    for (let n = 0; n < 8; n += 1) {
      const k = noteAt(paras, printed, loose, ch, no, ts[0], romanText);
      if (k < 0 || !quotesOther(paras[k], ts)) { if (k >= 0 && ts.some((t) => { const f = quoteFit(paras[k], t); return !!f && f.hit > 0; })) return k; break; }
      no.add(paras[k]);
    }
    const text0 = ts[0];
    const app = apparatusIndexes(paras), { all: lemma } = lemmaParts(paras), { mine } = chapterScope(paras, ch);
    let best = -1, top = 0, next = 0;
    paras.forEach((s, k) => {
      if (app.has(k) || lemma.has(k) || no.has(s) || PARA.test(s) || !mine(k)) return;
      // a note's heading, of this chapter: a verse heading, or a numbered note that quotes its verse in brackets and goes on
      const h = verseHead(s);
      if (h ? h.chap != null && ch != null && h.chap !== +ch : !(bareNum(s) != null && quotesVerse(s))) return;
      const f = quoteFit(s, text0); if (!f) return;
      if (f.hit > top) { next = top; top = f.hit; best = k; } else if (f.hit > next) next = f.hit;
    });
    if (best >= 0 && top >= 3 && top >= 2 * next) return best;
    // (the note's first words: its heading's paragraph and the next, where that is no heading of its own)
    const after = paras[k0 + 1] != null && verseHead(paras[k0 + 1]) == null && bareNum(paras[k0 + 1]) == null ? paras[k0 + 1] : '';
    const lead = wordsTold(`${paras[k0]} ${after}`.slice(0, 900)), lem = lemmaOf(paras[k0]);
    const drop = wordsTold(lem.replace(/\([^)]*\)/g, ' ')).size >= DROP_MIN && ts.every((t) => shared(lead, wordsTold(t)) === 0);
    return drop ? REFUSED : k0;
  }
  /* A NOTE HEADED BY ITS SECTION'S REFERENCE (2026-11-08, survey: Calvin's Harmony of the Law, the default commentary on Exodus 20:3,
   * marked the verse it prints). Calvin's Harmonies head each passage with its reference ("Exodus 20:3"; "MATTHEW 26:26-30; MARK 14:22-26;
   * LUKE 22:17-20") and head his note on a verse with it again ("Exodus 20:3 Thou shalt have no other gods before me. In this commandment
   * God enjoins …"). A paragraph that opens with a reference of the chapter's verse, in a book a section's heading on the same pages
   * names, and goes on, is that note. */
  const REF_BOOK = /^((?:(?:[1-3]|I{1,3})\s+)?[A-Z][A-Za-z]+(?:\s+(?:of\s+)?[A-Z][A-Za-z]+)?)\.?\s+(?:Chapter\s+)?(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-\u2013]\s*(\d{1,3}))?/;
  function refNote(paras, v, ch, off) {
    const named = [];
    for (const s of paras) {
      if (!refHead(s)) continue;
      for (const part of String(s).replace(/^#{1,6}\s+/, '').trim().split(/\s*;\s*/)) {
        const m = REF_BOOK.exec(part); if (m) named.push({ book: m[1].toLowerCase(), c: +m[2], a: +m[3], b: m[4] ? +m[4] : +m[3] });
      }
    }
    if (!named.length) return -1;
    return paras.findIndex((s, k) => {
      if (off(k) || refHead(s) || s.length < 40) return false;
      const m = REF_BOOK.exec(s); if (!m || m.index !== 0 || +m[2] !== ch) return false;
      const a = +m[3], b = m[4] ? +m[4] : a;
      return a <= v && v <= b && named.some((x) => x.book === m[1].toLowerCase() && x.c === ch && x.a <= v && v <= x.b);
    });
  }
  /* NOTES NUMBERED WITH NO STOP THAT QUOTE THEIR VERSE (2026-11-08, survey: Piscator's "7 I will declare the decree] Namely, the decree
   * of Jehovah God the Father", never found). A number, a space, the verse's first words closed by a bracket and the comment after them,
   * is the note on that verse where the pages carry two or more such notes counting up and no editors' apparatus (whose lines are
   * numbered so too: Weimar's "5 Iustitiam] Iu cf P[romissionem] …"). Without the bracket, a number with no stop is left alone ("10
   * Because …", Denys): it may be anything. [index, verse] for each. */
  function bracketNotes(paras, app) {
    if (app.size) return [];
    const xs = [];
    paras.forEach((s, k) => { const m = /^(\d{1,3})\s+(?=[^\d\s.:;,)\]–-])/.exec(s); if (m && quotesVerse(s) && verseHead(s) == null) xs.push([k, +m[1]]); });
    return xs.length >= 2 && xs.every((x, j) => !j || x[1] >= xs[j - 1][1]) ? xs : [];
  }

  // the index `max` paragraphs after `start`, not counting apparatus, and carrying on over an apparatus run that follows
  function capAt(paras, start, max, app) {
    let seen = 0, j = start + 1;
    for (; j < paras.length && seen < max; j += 1) if (!app.has(j)) seen += 1;
    while (j < paras.length && app.has(j)) j += 1;
    return Math.min(paras.length, Math.max(j, start + 1));
  }

  // Where that note ends: the next heading, or the next verse's note, or the next section's verses printed ahead of their notes
  // (Calvin's note on Hebrews 12:3 ends where verses 4 to 8 are printed), or `cap` paragraphs on.
  function noteEnd(paras, start, printed, cap, ch) {
    const { all: lemma, ahead, notes } = lemmaParts(paras), app = apparatusIndexes(paras), max = cap || 14, v = +printed;
    const qs = new Map(bracketNotes(paras, app));
    let seen = 0; // the editors' notes neither end the note nor count toward the cap
    for (let j = start + 1; j < paras.length && seen < max; j += 1) {
      if (app.has(j)) continue;
      seen += 1;
      // the next verse marked in the run of the text: a paragraph that opens with it is the next note; one that has it further on
      // still ends this note, and is kept
      if (ch != null) { const nx = cvMarks(paras[j], ch).find((x) => x.v > v); if (nx) return nx.at > 0 ? j + 1 : j; }
      if (isHead(paras[j])) return j;
      // (2026-11-08, owner: "work on the 201 psalms") a chapter's or a psalm's own heading ends the note ("ENARRATION ON PSALM LXXIX.",
      // after Augustine's last note on the psalm before)
      if (chapterHead(paras[j], true) || chapterHead(paras[j], false)) return j;
      // a heading of another verse, or of another chapter, begins another note; one that names this verse again does not
      const h = verseHead(paras[j]);
      if (h && (!h.list.includes(v) || (ch != null && h.chap != null && h.chap !== +ch))) return j;
      if (notes.has(j) && notes.get(j) > v) return j; // "7 Emptied himself." ends the note on verse 6
      if (qs.has(j) && qs.get(j) !== v) return j; // "8 Ask of me] …" ends Piscator's note on verse 7
      const bn = h ? null : bareNum(paras[j]);
      if (bn != null && bn > v && (!lemma.has(j) || ahead.has(j))) return j;
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

  // A LECTURE HEADED BY THE VERSES IT TAKES (2026-11-08, QA on Romans 3:23). Aquinas's lectures open "L. 3 (3:21–26) Christ the
  // redemption for all …", a lecture to a page, with no heading inside them for a verse; none of his notes on Romans 3 is indexed, so
  // the pane opened Romans 3:23 at the chapter's first page, Lecture 1 on 3:1-8. A paragraph that opens with a lecture's (homily's,
  // sermon's, tractate's) number and a range in parentheses gives the verses of chapter `ch` it takes, {a, b}, or null: "(3:21–26)"
  // is 21 to 26 of chapter 3, "(2:28–3:8)" is 1 to 8 of chapter 3 and 28 on of chapter 2.
  const RANGE = /^(?:#{1,6}\s+)?(?:L|Lect(?:ure|io)?|Lesson|Hom(?:ily|ilia)?|Sermo(?:n)?|Tract(?:ate|atus)?)\.?\s*(?:[IVXLC]+|\d{1,3})\.?\s*\(\s*(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-\u2013\u2014]\s*(?:(\d{1,3})\s*:\s*)?(\d{1,3}))?\s*\)/i;
  // (2026-11-08, owner "fix this": Augustine's Tractates on John said "No note on John 1:1 was found" at col. 35, the head of Tractate
  // I) Migne's heads give the chapter and verses after the tractate's subject: "TRACTATUS I. In illud Joannis, In principio erat Verbum
  // … usque ad id, Et tenebrae eam non comprehenderunt. Cap. I, V. 1-5." ("Chap. I, V. 1-5."). A heading that opens with the
  // division's word and number and names, in its first lines, the chapter and its verses, gives them too.
  const DIV_HEAD = /^(?:#{1,6}\s+)?\W*(?:L|Lect(?:ure|io)?|Lesson|Hom(?:ily|ilia)?|Sermo(?:n)?|Tract(?:ate|atus)?|Enarratio|Concio)\.?\s*(?:[IVXLCDM]+|\d{1,3})\b/i;
  const CAP_V = /\b(?:Cap(?:ut|itulum)?|Chap(?:ter)?)\.?\s*([IVXLC]+|\d{1,3})\s*[,.;]?\s*(?:V|Vv|Vers(?:e|us)?|Ver)\\?\.?\s*(\d{1,3})(?:\s*(?:[-\u2013\u2014]|ad|to)\s*(\d{1,3}))?/gi;
  function rangeOf(s, ch) {
    const t = String(s || ''), m = RANGE.exec(t);
    if (!m) {
      if (!DIV_HEAD.test(t)) return null;
      for (const x of t.slice(0, 600).matchAll(CAP_V)) {
        const c1 = /^\d+$/.test(x[1]) ? +x[1] : romanNum(x[1]), a = +x[2], b = x[3] ? +x[3] : a;
        if (c1 === +ch && b >= a) return { a, b };
      }
      return null;
    }
    const c = +ch, c1 = +m[1], a = +m[2], c2 = m[3] ? +m[3] : c1, b = m[4] ? +m[4] : a;
    if (c1 === c && c2 === c) return b >= a ? { a, b } : null;
    if (c1 === c && c2 > c) return { a, b: Infinity };
    if (c1 < c && c2 === c) return { a: 1, b };
    return null;
  }

  /* A CHAPTER'S OWN HEADING (2026-11-08, survey): "CHAPTER XII.", "CHAP. 7.", "Chapter 1", "CAPUT V.", "COMMENTARY ON GENESIS, CHAP.
   * III.", "PSALM LI.", "ENARRATION ON PSALM II. A psalm of David …": the whole paragraph, or set in capitals at its start with a title
   * after it. The word is the book's, a psalm's for the Psalms and a chapter's for the rest (Lapide's essay on the six days cites "Psalm
   * CIII." on a line of its own). chapterHead(s, psalms) gives its number, or 0. */
  /* (2026-11-09, owner: "iterate until scripture can be used as a daily driver for what were doing") and "Ch." or "CH.": Piscator heads
   * each chapter's parts "ANALYSIS CH. II.", "SCHOLIA ON CH. VI.", "OBSERVATIONS FROM CH. V.". Unread, his notes on Hosea 6 stood under
   * his "ANALYSIS CHAP. V. VI. &", as chapter 5's, and his "V.1. "Rapuit" ] Better, he tore" was no note on 6:1 (a "ch." in lower case,
   * as in a citation, is not read); and after a stray number: Calov's "3. CHAPTER XVIII. The burdens of the Priests and Levites" was
   * not read, and his "Ver. 9. WHICH ARE SANCTIFIED" (Numbers 18:9) was marked as his note on 17:9 */
  const CH_WORD = { ps: '(?:[Pp]sal(?:m(?:us|i)?)?|PSAL(?:M(?:US|I)?)?)', ch: '(?:[Cc]hap(?:ter)?|CHAP(?:TER)?|[Cc]ap(?:ut|itulum)?|CAP(?:UT|ITULUM)?|CH|Ch)' };
  const CH_CAPS_WORD = { ps: 'PSAL(?:M(?:US|I)?)?', ch: '(?:CHAP(?:TER)?|CAP(?:UT|ITULUM)?|CH)' };
  /* THE BIBLE'S CHAPTER IN BRACKETS (2026-11-09, owner: "iterate until scripture can be used as a daily driver for what were doing";
   * the scorecard's wrong mark on 2 Samuel 7:14). Migne prints Procopius on the Books of Kings with his own chapter numbers, the Bible's
   * after them in brackets: "CHAP. VI. [VII.]", "CHAP. VII [VIII].", "CHAP. VIII [X].". Neither was read as a heading ("CHAP. VI." was read
   * as chapter 6, "CHAP. VII [VIII]." not at all), so the section for 2 Samuel 7 ran on into chapter 8, and his "VERSE 14. In all Idumaea
   * he placed garrisons" (8:14) was marked as his note on 7:14. A heading that is only that, with a bracketed number near its own, names
   * the bracketed chapter; a number far from it (a footnote's "[1]") is not read as one. */
  const CH_ALONE = {}, CH_CAPS = {}, CH_BRACKET = {};
  for (const k of ['ps', 'ch']) {
    CH_ALONE[k] = new RegExp(`^(?:#{1,6}\\s+)?(?:\\d{1,3}\\.\\s+)?(?:[A-Z][A-Za-z]*,?\\s+){0,4}${CH_WORD[k]}\\.?\\s+([IVXLC]+|\\d{1,3}|${WORDNUM.join('|')})\\.?\\s*$`);
    CH_CAPS[k] = new RegExp(`^(?:#{1,6}\\s+)?(?:\\d{1,3}\\.\\s+)?(?:[A-Z]+,?\\s+){0,4}${CH_CAPS_WORD[k]}\\.?\\s+([IVXLC]+|\\d{1,3}|${WORDNUM.join('|')})\\.(?:\\s|$)`);
    CH_BRACKET[k] = new RegExp(`^(?:#{1,6}\\s+)?(?:[A-Z][A-Za-z]*,?\\s+){0,4}${CH_WORD[k]}\\.?\\s+([IVXLC]+|\\d{1,3})\\.?\\s*\\[\\s*([IVXLC]+|\\d{1,3})\\.?\\s*\\]\\.?\\s*$`);
  }
  function chapterHead(s, psalms) {
    const t = String(s || '').trim(), k = psalms ? 'ps' : 'ch';
    if (!t) return 0;
    const b = t.length <= 60 && CH_BRACKET[k].exec(t);
    if (b) { const own = numOf(b[1]), bible = numOf(b[2]); if (own > 0 && bible > 0 && Math.abs(bible - own) <= 3) return bible; }
    // (in capitals at its start, a heading may run on into the chapter's argument: "PSAL. XXXIII. The ARGUMENT. This Psalm contains …",
    // Poole's Annotations; "CHAP. III. PVt them in remembrance …", Taylor)
    const m = (t.length <= 160 && CH_ALONE[k].exec(t)) || CH_CAPS[k].exec(t);
    return (m && numOf(m[1])) || 0;
  }
  // the Vulgate's number for a psalm (the Hebrew's 11 is its 10), which a Latin commentary's heading gives
  const vulgateOf = (n) => (n <= 8 ? [n] : n <= 10 ? [9] : n <= 113 ? [n - 1] : n <= 115 ? [113] : n === 116 ? [114, 115] : n <= 146 ? [n - 1] : n === 147 ? [146, 147] : [n]);
  // the psalms whose title the Hebrew and the Vulgate count as a verse of its own (as two in 51, 52, 54 and 60), and the English not
  const TITLED = { 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 12: 1, 13: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 30: 1, 31: 1, 34: 1, 36: 1, 38: 1,
    39: 1, 40: 1, 41: 1, 42: 1, 44: 1, 45: 1, 46: 1, 47: 1, 48: 1, 49: 1, 51: 2, 52: 2, 53: 1, 54: 2, 55: 1, 56: 1, 57: 1, 58: 1, 59: 1, 60: 2,
    61: 1, 62: 1, 63: 1, 64: 1, 65: 1, 67: 1, 68: 1, 69: 1, 70: 1, 75: 1, 76: 1, 77: 1, 80: 1, 81: 1, 83: 1, 84: 1, 85: 1, 88: 1, 89: 1, 92: 1,
    102: 1, 108: 1, 140: 1, 142: 1 };
  const TITLE_WORDS = /^[\W\d]*(?:unto the end|for the end|to the end|in finem|(?:to|for) the chief musician|a psalm|psalmus|(?:for its |the )?title|inscription|superscription)\b/i;
  const afterHead = (s) => String(s || '').replace(/^#{1,6}\s+/, '')
    .replace(/^\s*(?:(?:\d{1,4}|[IVXLC]{1,7})\.?\s+)?[(\[][^)\]]*[)\]]\.?\s*|^\s*(?:ver(?:s(?:e|es|us)?)?\.?|vv?\.)\s*\d{1,3}(?:\s*[,–-]\s*\d{1,3})*\.?\s*/i, '');
  /* A TITLE HEADED AS VERSE 1 WHERE THE PSALM HAS NONE OF ITS OWN (2026-11-09, owner: "iterate until scripture can be used as a daily
   * driver for what were doing"; the scorecard's wrong mark on Psalm 32:1). The Hebrew and the Vulgate count Psalm 32's title inside its
   * first verse, so it is not in TITLED, but Migne's brackets in Augustine's Expositions give the title a heading of its own: "1. [vers.
   * 1.] To David himself, for understanding" is on the title, "2. [vers. 2.] Blessed are they whose iniquities are forgiven" takes the
   * English 32:1 and 32:2, and "3. [vers. 3.] Because I was silent" on is the English count again. The first was marked as his note on
   * 32:1. Where the work's heading of verse 1 opens on a title's words (David, a psalm, for understanding, unto the end) and on none of
   * verse 1's own, while its heading of verse 2 opens on two or more of them, verse 1's note is that heading of verse 2 (located). The
   * title's words in the verse as the page gives it ("A Psalm of David. Maschil. Blessed is he") are left out of the count. */
  const TITLE_LIKE = /\b(?:david|asaph|kor(?:ah|e)|core|solomon|moses|heman|ethan|idithun|jeduthun|psalm|psalmus|song|canticle|title|inscription|superscription|maschil|michtam|understanding|intellect(?:us)?|instruction|musician|unto the end|for the end|to the end|in finem)\b/i;
  const TITLE_W = new Set(['david', 'asaph', 'korah', 'kore', 'core', 'solomon', 'moses', 'heman', 'ethan', 'idithun', 'jeduthun', 'psalm', 'psalme', 'psalmus',
    'song', 'canticle', 'title', 'inscription', 'superscription', 'maschil', 'maskil', 'michtam', 'miktam', 'understanding', 'intellect', 'intellectus',
    'instruction', 'musician', 'choirmaster', 'chief', 'end', 'finem'].map(fold));
  const opening = (s) => afterHead(s).slice(0, 120);
  function titleAlone(s1, s2, text) {
    const v = new Set([...wordsTold(text)].filter((x) => !TITLE_W.has(x)));
    if (v.size < 2 || !TITLE_LIKE.test(opening(s1))) return false;
    return shared(wordsTold(opening(s1)), v) === 0 && shared(wordsTold(opening(s2)), v) >= 2;
  }
  /* ANOTHER COUNT OF A CHAPTER'S VERSES (2026-11-09, owner: "iterate until scripture can be used as a daily driver for what were doing";
   * the scorecard's wrong mark on Jonah 2:1). The Hebrew, and the Latin and the Greek that follow it there, number some chapters' verses
   * otherwise than the English: the English Jonah 2:1-10 are their 2:2-11 (the English 1:17 is their 2:1). Jerome's "(Chap. II.--Ver. 1.)
   * And the Lord prepared a great fish" was marked as his note on the English 2:1, Cyril's "VERSE 1. And the Lord commanded a great whale"
   * and Theophylact's "VERS. 1. And God commanded a great whale" too. SHIFTS lists the places where a chapter's verses run on under other
   * numbers in the same chapter, by the library's book: [chapter, first verse, last verse, what to add to the English number], from the
   * Copenhagen Alliance's standard mapping of the English count onto the original (versification-mappings/standard-mappings/eng.json,
   * after Paratext's eng.vrs; a verse moved into another chapter is left out, and the psalms' titles are TITLED's). A work's own count is
   * known to no field on the map, so there the note is told by its words: among the work's heading of the verse and, in the other count,
   * its heading and the plain paragraphs of that note (no line of the text, nothing numbered), the one whose first words are the verse's,
   * two of its words that tell at least (three, for a paragraph inside that note), more than the first heading's, which keeps
   * its place where it quotes the verse, and more than of any other verse of the chapter (Isaiah's refrain
   * "his hand is stretched out still", 9:12, 17 and 21, does not make "He stretched out his hand over the sea" a note on 9:12).
   * Jerome's is "And Jonas prayed to the Lord his God out of the belly of the fish", inside his "(Ver. 2.)"; Cyril's and Theophylact's is
   * their "VERS. 2, 3. And Jonah prayed". A work that counts as the English keeps its heading, where neighbouring verses open alike too:
   * Clarke's "Verse 7. The remnant of Jacob" is Micah 5:7 as much as 5:8, and his "Verse 8. As a lion" stays his note on 5:8; Grotius's
   * "14. HEAD AND TAIL" is Isaiah 9:14, not 9:15. One heading that takes both numbers ("Ver. 8–21.") has nothing to decide. */
  const SHIFTS = { genesis: [[32, 1, 32, 1]], exodus: [[8, 5, 32, -4], [22, 2, 31, -1]], leviticus: [[6, 8, 30, -7]], numbers: [[17, 1, 13, 15], [30, 1, 16, 1]],
    deuteronomy: [[13, 1, 18, 1], [23, 1, 25, 1], [29, 2, 29, -1]], 'i-samuel': [[21, 1, 15, 1], [24, 1, 22, 1]], 'ii-samuel': [[19, 1, 43, 1]],
    'i-kings': [[5, 1, 18, 14], [22, 43, 53, 1]], 'ii-kings': [[12, 1, 21, 1]], 'i-chronicles': [[6, 16, 81, -15], [12, 4, 40, 1]],
    'ii-chronicles': [[2, 2, 18, -1], [14, 2, 15, -1]], nehemiah: [[4, 7, 23, -6], [7, 69, 73, -1], [10, 1, 39, 1]],
    // (2026-11-09, pane3b; the word judge) and the Vulgate's Job 16 and 40, which Aquinas prints: the English 16:21 is its 16:22, 40:6-24 its 40:1-19
    job: [[16, 21, 22, 1], [40, 6, 24, -5], [41, 9, 34, -8]],
    ecclesiastes: [[5, 2, 20, -1]], 'song-of-solomon': [[7, 1, 13, 1]], isaiah: [[9, 2, 21, -1], [64, 2, 12, -1]], jeremiah: [[9, 2, 26, -1]],
    ezekiel: [[21, 1, 32, 5]], daniel: [[4, 4, 37, -3], [6, 1, 28, 1]], hosea: [[2, 1, 23, 2], [12, 1, 14, 1], [14, 1, 9, 1]], jonah: [[2, 1, 10, 1]],
    micah: [[5, 2, 15, -1]], nahum: [[2, 1, 13, 1]], zechariah: [[2, 1, 13, 4]] };
  const otherNumbers = (book, ch, v) => (SHIFTS[book] || []).filter(([c, a, b]) => c === Number(ch) && a <= v && v <= b).map(([, , , d]) => v + d);
  /* (2026-11-09, pane3b; the word judge over the node gate) the chapters of SHIFTS that the Vulgate and the Septuagint also count as the
   * Hebrew does (Numbers 30, 1 Samuel 24, Job 41, Ecclesiastes 5, the Song 7, Daniel 4, Hosea 14, Jonah 2), or count otherwise of
   * themselves (the Vulgate's Job 16 and 40). In the others the Vulgate
   * counts as the English, and only a work that numbers by the Hebrew counts otherwise: there the other count is read only where the
   * work's own heading of the number quotes the verse the Hebrew gives that number (Poole's "3. A controversy", Hosea 12:2 in the
   * English). Migne's Cursus, which numbers Genesis 32 as the Vulgate does, had its "VERSE 21. BUT HE HIMSELF REMAINED THAT NIGHT"
   * marked on 32:20, and Grotius on Hosea 2 his "11. AND I WILL TAKE AWAY ALL HER JOY" on 2:9 */
  const VSHIFT = { numbers: [30], 'i-samuel': [24], job: [16, 40, 41], ecclesiastes: [5], 'song-of-solomon': [7], daniel: [4], hosea: [14], jonah: [2] };
  // the paragraph to mark for the verse `printed` (the English number) where another count runs: k0 the one found by that number (or -1),
  // textOf(n) the words of the chapter's verse n as the page gives it
  function otherCount(paras, k0, printed, book, ch, textOf) {
    const v = Number(printed), alts = otherNumbers(book, ch, v), vw = wordsTold(textOf(v));
    if (!alts.length || vw.size < 2) return k0;
    // (2026-11-09, pane3b) a paragraph's first words to the first point it numbers inside it (Willet's "… whether he offended in so
    // dissembling. 1. The word here used")
    const first = (k) => opening(paras[k]).split(/\s\d{1,2}\.\s/)[0];
    const fit = (k, w) => shared(wordsTold(first(k)), w);
    // the chapter's other verses, as the page gives them
    const others = [];
    for (let u = 1, miss = 0, seen = false; u <= 200 && miss < 3; u += 1) {
      const t = String(textOf(u) || '');
      if (!t.trim()) { if (seen) miss += 1; continue; }
      seen = true; miss = 0;
      if (u !== v) others.push(wordsTold(t));
    }
    // (a heading of the verse's own number whose quotation, to its first stop or bracket, has two words that tell, half of them or more
    // the verse's, is its note: Simon Patrick's "Ver. 22. He rose up that night.]" on Genesis 32:22, though his note on 32:23
    // goes on "Having tried the Ford ... caused them all to pass over"; not Cyril's "VERSE 1. And the Lord commanded a great whale, and it
    // swallowed Jonah" on the English Jonah 2:1. A paragraph of the other count's note, not its heading, is taken only on three of the
    // verse's words: Poole's "9. The roof of thy mouth" on the Song 7:9, which he counts as the English, stays against a paragraph of his
    // note on 7:10 that has "beloved" and "wine")
    if (k0 >= 0) {
      const qw = wordsTold(afterHead(paras[k0]).replace(/^\s*\(?\d{1,3}\)?\.?\s+/, '').split(/\]|[.;?!](?:\s|$)/)[0].slice(0, 160));
      if (qw.size >= 2 && 2 * shared(qw, vw) >= qw.size) return k0;
    }
    const { all: lemma } = lemmaParts(paras);
    let best = -1, top = Math.max(1, k0 >= 0 ? fit(k0, vw) : 0);
    /* (2026-11-09, pane3b; the coordinator's read of the node gate) and by the words weighed by how few of the chapter's verses have
     * them, with a margin: half again the weight of the work's own heading of the number, and more than any other verse's. A name that
     * runs through the chapter tells little: Willet, who counts as the English, heads "13. Quest. v. 13. Of Davids chaunging of his
     * behaviour before Achish" (1 Samuel 21:13), and its "David" and "Achish", both in 21:12, outweighed by count the one "behaviour" of
     * 21:13; it was marked as his note on 21:12 */
    const every = [vw, ...others], wt = new Map();
    const weight = (x) => {
      if (!wt.has(x)) { const d = every.filter((w) => [...w].some((y) => sameWord(x, y))).length; wt.set(x, d ? Math.log(1 + every.length / d) : 0); }
      return wt.get(x);
    };
    const fitW = (k, w) => { let n = 0; for (const x of wordsTold(first(k))) if ([...w].some((y) => sameWord(x, y))) n += weight(x); return n; };
    const topW = k0 >= 0 ? fitW(k0, vw) : 0;
    const counts = (VSHIFT[book] || []).includes(Number(ch));
    for (const a of alts) {
      // (where the Vulgate counts as the English, the work's heading of this number must quote, by its weighed words, the verse the Hebrew
      // gives it more than this one)
      if (!counts) {
        // (a heading that is its number only has its words in the paragraph after it, Luther's "V. 12." over "If Gilead is an idol")
        const u = v - (a - v), uw = u >= 1 ? wordsTold(textOf(u)) : new Set();
        const k1 = k0 >= 0 && !wordsTold(afterHead(paras[k0])).size && k0 + 1 < paras.length ? k0 + 1 : k0;
        if (k1 < 0 || !uw.size || !(fitW(k1, uw) > fitW(k1, vw))) continue;
      }
      const h = findNote(paras, a, false, ch, null, [textOf(v)]);
      if (h < 0 || h === k0) continue;
      const end = noteEnd(paras, h, a, 8, ch);
      // (a heading that is its number only, Luther's "V. 13.", has its words in the paragraph after it: his "he served, he kept, namely,
      // the flock" is the English Hosea 12:12)
      const bare = !wordsTold(afterHead(paras[h])).size;
      for (let j = h; j < Math.max(end, h + 1); j += 1) {
        // (nor a footnote set under the note, ": (2) Indeed, I might have followed the desire for vengeance", Migne's on 1 Samuel 24:10)
        if (j > h && (lemma.has(j) || LEAD_NUM.test(paras[j]) || verseHead(paras[j]) || twin(paras, j) || /^\W{0,3}\(\d{1,2}\)/.test(paras[j]))) continue;
        // (2026-11-09, pane3b) nor a paragraph of the note whose own lemma, to its first stop, has more of another verse's words than of
        // this one's: Migne's "THIS IS THE GIFT OF GOD", inside his "VERSE 17." (the English Ecclesiastes 5:18), is the English 5:19
        if (j > h) { const L = lemmaWords(paras[j]), own = shared(L, vw); if (others.some((ow) => shared(L, ow) > own)) continue; }
        const s = fit(j, vw);
        if (s >= (j === h || (bare && j === h + 1) ? 2 : 3) && s > top && others.every((ow) => s > fit(j, ow))) {
          const sw = fitW(j, vw);
          if (sw >= 1.5 * topW && others.every((ow) => sw > fitW(j, ow))) { top = s; best = j; }
        }
      }
    }
    return best >= 0 ? best : k0;
  }
  // (2026-11-09) whether a note's first words are the verse's (`text`): two of them that tell at least, or all where the verse has fewer
  const fitsVerse = (s, text) => { const v = wordsTold(text); return !!v.size && shared(wordsTold(opening(s)), v) >= Math.min(2, v.size); };
  // the words of a note's lemma: after its heading and number, to its first stop, bracket or parenthesis
  const lemmaText = (s) => afterHead(String(s || '').replace(/^#{1,6}\s+/, '')).replace(/^\s*\(?\d{1,3}\)?\.?\s+/, '');
  const lemmaCut = (t) => t.split(/\]|\)\s|[.;?!](?:\s|$)|\s[([]/)[0].slice(0, 160);
  const lemmaWords = (s) => wordsTold(lemmaCut(lemmaText(s)));
  /* A FOOTNOTE'S NUMBER INSIDE A LEMMA (2026-11-11, pane3c; the coordinator's read of Mere Orthodoxy: Calvin's note on Romans 1:17, the
   * first key's, opened unmarked). The Calvin Translation Society sets a footnote's number in brackets, and the lemma was cut at it: "17.
   * For [39] the righteousness of God, etc." left "For", no word that tells, so the note could not lead with its verse. The number
   * stands as often at the lemma's end, the comment running on with no stop ("18. And Abram removed his tent [355] Here Moses relates
   * that the holy man"), and there the cut is right: reading every lemma on past the number lost nine such notes on the whole Bible. So
   * the lemma is read both ways where it meets such a number before any stop (lemmaPast: the lemma with the number dropped, null where
   * it meets none), and a note leads with its verse, or quotes it, where either reading does. */
  const lemmaPast = (s) => { const t = lemmaText(s); return /^[^.;?!()[\]]*\s\[\d{1,4}\]\s/.test(t) ? wordsTold(lemmaCut(t.replace(/\s*\[\d{1,4}\]/, ''))) : null; };
  /* A LEMMA WITH NO STOP AFTER IT (2026-11-11, pane3f; the coordinator's read of Mere Orthodoxy: Genesis 1:4 with Calvin open, his note
   * unmarked). Some of the Calvin Translation Society's volumes are stored with the stop after a lemma lost, the comment running on: "4
   * And God saw the light Here God is introduced by Moses as surveying his work", "5. And God called the light That is, God willed". Read
   * to the first stop, the lemma took in the comment's words, and too few of them were the verse's. So it is read a third way: cut where
   * a capitalised word follows a lower-case one with no stop between, within its first words. A name begins with a capital too ("unto
   * Abram He now relates"), so each such cut is tried (lemmaCuts: the words that tell before each). A lemma cut so leads with its verse,
   * or quotes it, only by two of the verse's words that tell at least, and where every word of its own that tells is the verse's: cut at
   * a name inside it, a lemma is a shorter lemma, and under the guards the other readings have (a third of its words, a half) Cajetan's
   * "Vers. 1. And Solomon began to build the house of the Lord in Jerusalem on mount Moriah" (2 Chronicles 3:1), cut before "Jerusalem",
   * was marked on 2:1, "Now Solomon purposed to build a house" (the Bible-wide screen, both judges). Nor where a verse within two of
   * it has as many of the cut's words: the paragraph under Luther's margin label "V. 12", "And I gave Gilead to Machir" (Deuteronomy
   * 3:15), has "gave" and "Gilead" of 3:12 and of 3:13 alike; Calvin's "26. I will call them my people which are not a people" is Romans
   * 9:25's wording. A verse far off may have as many, as with the other readings: Genesis 1:18 has "saw" and "light" too. */
  const CUT_WORDS = 14;
  const lemmaCuts = (s) => {
    const ws = lemmaCut(lemmaText(s)).split(/\s+/), out = [];
    for (let i = 2; i < ws.length && i <= CUT_WORDS; i += 1) if (/^[A-Z]/.test(ws[i]) && /[a-z]$/.test(ws[i - 1])) out.push(wordsTold(ws.slice(0, i).join(' ')));
    return out;
  };
  /* THE DIVINE NAME (2026-11-11, pane3f; the coordinator's read of Mere Orthodoxy: Psalm 23:1, Calvin's "1. Jehovah is my shepherd."
   * unmarked). The page there prints "The LORD is my shepherd", and "Lord" is a small word (every psalm has it), so the lemma had one of
   * the verse's words, not two. "Jehovah", "Yahweh" and "LORD" in capitals among lower-case words are one name (named: each written
   * "Jehovah"); a lemma all in capitals has no such "LORD". */
  const NAME_G = /\b(?:Jehovah|Jehova|Yahweh|Yahveh|Jahveh)\b/gi, NAME_CAPS_G = /\bLORD\b/g;
  const named = (s) => { const t = String(s || ''); return (/[a-z]{2}/.test(t) ? t.replace(NAME_CAPS_G, 'Jehovah') : t).replace(NAME_G, 'Jehovah'); };
  // the chapter's verses as the page gives them, each with its words: [[n, words], ...]
  const versesOf = (textOf) => {
    const out = [];
    for (let u = 1, miss = 0, seen = false; u <= 200 && miss < 3; u += 1) {
      const t = String(textOf(u) || '');
      if (!t.trim()) { if (seen) miss += 1; continue; }
      seen = true; miss = 0; out.push([u, wordsTold(t)]);
    }
    return out;
  };
  /* A NUMBERED NOTE THAT QUOTES ITS VERSE (2026-11-09, pane3b; the coordinator's read of the node gate). A lone label in a run of margin
   * labels gives way to the note numbered as the verse only where that note's lemma is the verse's: two of the verse's words that tell
   * (all, where the lemma has fewer), half of the lemma's own words or more, and no other verse of the chapter with more of them. Two
   * words of the opening were no guard: Lapide's "7. THE TENTH DAY ALSO OF THIS SEVENTH MONTH SHALL BE HOLY TO YOU" (Numbers 29:7), on p.
   * 390 under his margin labels, was marked as his note on 30:7 by "day" and by "holy" taken for "hold". textOf(n): the chapter's verse n. */
  function quotes(s, v, textOf) {
    const V = wordsTold(textOf(v));
    if (!V.size) return false;
    // (2026-11-11, pane3c) by the lemma as cut, or as read on past a footnote's number (lemmaPast)
    if ([lemmaWords(s), lemmaPast(s)].some((L) => {
      if (!L || !L.size) return false;
      const own = shared(L, V);
      if (own < Math.min(2, L.size) || 2 * own < L.size) return false;
      return versesOf(textOf).every(([u, w]) => u === Number(v) || shared(L, w) <= own);
    })) return true;
    // (2026-11-11, pane3f) or as cut where a capital follows a lower-case word (lemmaCuts): two of the verse's words at least, every
    // word of the cut the verse's, and no verse within two with as many
    return lemmaCuts(s).some((L) => {
      const own = shared(L, V);
      if (own < 2 || own < L.size) return false;
      return versesOf(textOf).every(([u, w]) => u === Number(v) || (Math.abs(u - Number(v)) <= 2 ? shared(L, w) < own : shared(L, w) <= own));
    });
  }
  /* THE COMMENT AFTER A PRINTED PASSAGE (2026-11-09, pane3b; the coordinator's read of the word judge). The Calvin Translation Society
   * prints a passage's verses in English and in Latin under its heading ("Jeremiah 35:12-15"), then comments on them in order, so the
   * first comment after them is on the passage's first verse. It is not the note of a later verse of the passage (n, the number looked
   * for): on Jeremiah 35:15 it is Calvin's comment on 35:13, "Here Jeremiah applies the example". Nor, after a passage of one verse,
   * where the paragraph after it turns to the verse ("I come now to the last verse", "I now return to the text"): after his printed Hosea
   * 11:12, a new lecture's first paragraph closes his comment on 11:10-11, "the roaring of God"; after his Jonah 3:5, "One thing escaped me
   * in the third verse". Words do not tell these apart (his comments open on the Prophet, not the verse's words: a test of them refused
   * twenty-five of his right comments in the node gate to stop two wrong ones). The printed lines are walked back to the passage's
   * heading, a line misread at its stop included ("14, Stabiliti sunt sermones"); with no heading, a passage that holds the verse begins
   * at its least number. paras: the run of paragraphs; h: the comment; ch: the chapter. */
  function afterPassage(paras, h, n, ch) {
    const nums = [];
    let j = h - 1;
    // (a heading is no printed line, though its book is numbered: "1 Peter 3:5-6")
    for (; j >= 0 && h - j <= 40 && !refHead(paras[j]); j -= 1) { const m = /^\(?(\d{1,3})\)?[.,]?\s+\S/.exec(paras[j] || ''); if (!m) break; nums.push(Number(m[1])); }
    const ref = (j >= 0 ? refsOf(paras[j]) : []).find((r) => r.c === Number(ch));
    const first = ref ? ref.a : nums.includes(Number(n)) ? Math.min(...nums) : null;
    if (first != null && first < Number(n)) return false;
    const one = ref ? ref.a === ref.b : nums.every((x) => x === Number(n));
    return !(one && /^\W*I\s+(?:now\s+)?(?:come|return)\s+(?:now\s+)?to\s+the\s+(?:(?:last|next)\s+)?(?:verse|text)\b/i.test(paras[h + 1] || ''));
  }
  /* A NOTE THAT LEADS WITH ITS VERSE (2026-11-09, pane3b; the coordinator's rule for the first pass, from the word judge over the whole
   * Bible). The first commentary takes a key's note as its own note on the verse only where the note's lemma has two of the verse's words
   * that tell (all, where it has fewer), a third of its own at least, and no other verse of the chapter has more of them. Words are one only where they differ in an
   * ending that is one (the anchor's sameWord, less two words that each add one letter of their own: "holy" is no "hold"). Lapide's "THE
   * TENTH DAY ALSO OF THIS SEVENTH MONTH SHALL BE HOLY TO YOU" has only "day" of Numbers 30:7; Cajetan's "Unto the utmost sea." none of
   * Deuteronomy 34:3; Augustine's "He orders the tabernacle to be made of ten curtains" leads with Exodus 26:1. */
  const sameStrict = (a, b) => {
    if (!sameWord(a, b)) return false;
    let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p += 1;
    return !(p < 6 && a.length - p === 1 && b.length - p === 1);
  };
  const sharedStrict = (a, b) => { let n = 0; for (const x of a) for (const y of b) if (sameStrict(x, y)) { n += 1; break; } return n; };
  // (2026-11-11, pane3f) `hard`, for Calvin's Harmonies (harmonyNote): two of the verse's words always, and no other verse with as many
  function leadsBy(s, v, textOf, hard) {
    const V = wordsTold(textOf(v));
    if (!V.size) return false;
    // (`cut`, a reading by lemmaCuts: nor a verse within two of this one with as many)
    const rest = (L, own, text, cut) => versesOf(text).every(([u, w]) => u === Number(v) || (hard || (cut && Math.abs(u - Number(v)) <= 2) ? sharedStrict(L, w) < own : sharedStrict(L, w) <= own));
    // (2026-11-11, pane3c) by the lemma as cut, or as read on past a footnote's number (lemmaPast)
    if ([lemmaWords(s), lemmaPast(s)].some((L) => {
      if (!L || !L.size) return false;
      const own = sharedStrict(L, V);
      // (and a third of the lemma's own words that tell, at least: pg-2352's "And he came to Capernaum: and when he was come into the
      // house, he asked them", Mark 9:33, has only "come" and "asked" of 10:35)
      if (own < (hard ? 2 : Math.min(2, L.size)) || 3 * own < L.size) return false;
      return rest(L, own, textOf);
    })) return true;
    // (2026-11-11, pane3f) or as cut where a capital follows a lower-case word (lemmaCuts): two of the verse's words at least, every
    // word of the cut the verse's, and no verse within two with as many
    if (lemmaCuts(s).some((L) => {
      const own = sharedStrict(L, V);
      return own >= 2 && own === L.size && rest(L, own, textOf, true);
    })) return true;
    // (2026-11-11, pane3f) or by the divine name (named), where the lemma has it and a word that tells beside it
    const t = named(lemmaCut(lemmaText(s)));
    if (!/\bJehovah\b/.test(t)) return false;
    const L = wordsTold(t), own = sharedStrict(L, wordsTold(named(textOf(v))));
    return L.size >= 2 && own >= 2 && 3 * own >= L.size && rest(L, own, (u) => named(textOf(u)));
  }
  const leads = (s, v, textOf) => leadsBy(s, v, textOf, false);
  /* CALVIN'S HARMONIES IN THE FIRST PASS (2026-11-11, pane3f; the coordinator's brief: "admit a Harmony note only where all three hold").
   * His Harmonies set passages of several books side by side, so a number alone does not say whose verse a paragraph is on: let into the
   * first pass as other works are, they marked Mark's printed text for Matthew 19:13, 24:1 and 28:8, Luke's for 27:33, his "8. Thus did
   * your fathers" (Numbers 32:8) for Numbers 36:8. A note of theirs is the verse's own only where
   *   1. it is not the passage's printed text: no verse printed in both tongues (twin), with none such after it before the next heading;
   *      not among the numbered paragraphs that follow a passage's headings before its first comment (the Gospels' columns: "13. Then
   *      were presented to him children", "13. And they brought to him children", "15. And they presented to him also infants" under
   *      "Matthew 19:13-15", "Mark 10:13-16", "Luke 18:15-17"); and no numbered paragraph after it, before the next heading or
   *      reference, counts back to its number or below (a printed line, the notes after it beginning again);
   *   2. the nearest paragraph before it that names a book and chapter names the verse's own: a note that opens with its reference
   *      ("Matthew 19:13. But the disciples rebuked them.", before his "14. Suffer children."), or the passage's headings, where they give
   *      the verse to this book and its number to no other ("Matthew 27:33-38; Mark 15:22-28; Luke 23:33-34, 38" gives 33 to two). Under
   *      "Deuteronomy 5:1-6, 4:20" his "4. Face to face" is Deuteronomy 5:4, not Exodus 20:4. With none on the pages read, it is refused;
   *   3. its lemma leads with the verse by two words that tell, never one, and no other verse of the chapter has as many (leadsBy, hard).
   * A note that opens with its own reference ("Matthew 9:9. Jesus saw a man sitting at the customhouse.") must name the verse, and lead
   * with it so. paras: the pages' paragraphs as the mark was looked for in them; h: the mark; book, ch: the reader's. */
  const bookKey = (s) => String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').trim().split(/\s+/).pop().replace(/s$/, '');
  const HEAD_BOOK = /^((?:(?:[1-3]|I{1,3})\s+)?[A-Z][A-Za-z]+)\.?\s+(\d{1,3})$/;
  // the references a paragraph opens with: {refs: [{book, c, a, b}] (a chapter alone: a and b null), head: whether it is nothing but
  // them, rest: the words after the first}
  const markerOf = (s) => {
    const t = String(s || '').replace(/^#{1,6}\s+/, '').trim(), refs = [];
    let tail = '', first = 0;
    for (const part of t.split(/\s*;\s*/)) {
      const m = REF_BOOK.exec(part), g = !m && t.length <= 60 ? HEAD_BOOK.exec(part) : null;
      if (!m && !g) break;
      if (m) { refs.push({ book: bookKey(m[1]), c: +m[2], a: +m[3], b: m[4] ? +m[4] : +m[3] }); tail = part.slice(m[0].length); }
      else { refs.push({ book: bookKey(g[1]), c: +g[2], a: null, b: null }); tail = ''; }
      if (refs.length === 1) first = m ? m[0].length : part.length;
    }
    return refs.length ? { refs, head: !/[A-Za-z]{2}/.test(tail), rest: t.slice(first) } : null;
  };
  function harmonyNote(paras, h, v, textOf, book, ch) {
    const s = String(paras[h] || ''), n = Number(v), bk = bookKey(book);
    const mine = (r) => r.book === bk && r.c === Number(ch), holds = (r) => r.a != null && r.a <= n && n <= r.b;
    if (twin(paras, h)) return false;
    const own = markerOf(s);
    if (own) return !own.head && own.refs.length === 1 && mine(own.refs[0]) && holds(own.refs[0]) && leadsBy(own.rest.replace(/^[\s.,:]+/, ''), v, textOf, true);
    const num = LEAD_NUM.exec(s);
    if (!num || +num[1] !== n) return false;
    for (let k = h + 1, last = n; k < paras.length && !markerOf(paras[k]); k += 1) {
      const x = LEAD_NUM.exec(paras[k]);
      if (twin(paras, k) || (x && +x[1] <= last)) return false;
      if (x) last = +x[1];
    }
    let j = h - 1, mk = null;
    for (; j >= 0; j -= 1) { mk = markerOf(paras[j]); if (mk) break; }
    if (!mk) return false;
    if (!mk.head) { if (!mk.refs.some(mine)) return false; } else {
      const refs = mk.refs.slice();
      for (let k = j - 1; k >= 0; k -= 1) { const x = markerOf(paras[k]); if (!x || !x.head) break; refs.push(...x.refs); }
      let numbered = true, twins = false;
      for (let k = j + 1; k < h; k += 1) {
        // (a footnote set at the page's foot is neither)
        if (/^\W{0,2}\[\d{1,4}\]/.test(paras[k])) continue;
        if (!LEAD_NUM.test(paras[k])) numbered = false;
        if (twin(paras, k)) twins = true;
      }
      if (numbered && !twins) return false;
      const ranged = refs.filter((r) => mine(r) && r.a != null);
      if (ranged.length ? !ranged.some(holds) : !refs.some(mine)) return false;
      if (refs.some((r) => !mine(r) && holds(r))) return false;
    }
    return leadsBy(s, v, textOf, true);
  }
  // (2026-11-09, pane3b) whether a lecture's line of the verse's number is its verse's: not where it has fewer than two of the verse's words
  // and another verse of the chapter has more (Aquinas prints the Vulgate's numbers: his "40:15 The mountains yield grass for him" is the
  // English Job 40:20); his "3:15 so that whoever believes in him may not perish but have eternal life" is John 3:15, though 3:16 has more
  // of its words
  // (and not where a verse that has as many of its words, one at least, carries its number in the other count: his "40:1 Then the Lord
  // answered Job out of the whirlwind" is the English 40:6, whose Vulgate number is 1; `n`, the line's number; book and ch for SHIFTS)
  function lineFits(s, v, textOf, book, ch, n) {
    const L = lemmaWords(s), own = sharedStrict(L, wordsTold(textOf(v)));
    return !versesOf(textOf).some(([u, w]) => {
      if (u === Number(v)) return false;
      const su = sharedStrict(L, w);
      return (own < 2 && su > own) || (su >= Math.max(1, own) && book != null && otherNumbers(book, ch, u).includes(Number(n != null ? n : v)));
    });
  }
  /* A HEADING WHOSE WORDS ARE A NEIGHBOUR'S (2026-11-09, pane3b). The first commentary is the first key, in rank order, with its own note
   * on the verse; a note found by its heading's number whose lemma has more words of a verse one or two away than of this one is not
   * taken for that: Cajetan's margin labels stand a line off his text, and his "Ver. 26. According to the latest commands also of David"
   * (1 Chronicles 23:27, "by the last words of David"), "Ver. 27. And they were under the hand of the sons of Aaron" (23:28) and "Verse
   * 18. And lest perhaps with your eyes lifted up to the heavens" (Deuteronomy 4:19) were made the first commentary on 23:26, 23:27 and
   * 4:18 over a key ranked above them: such a note is taken as a place near the verse, chosen only as the first key with a place was
   * before the two passes. The pane still marks such a heading when it is pressed. */
  function misfit(s, v, textOf, single) {
    // (a heading of several verses, or of a verse and those after it, has their words: Ambrose's "(Vers. 13, 14.) And there was with the
    // angel a multitude" on Luke 2:14, Jerome's "(Vers. 15 seqq.) Wherefore I also" on Ephesians 1:15; `single`: a lemma known to be of
    // one verse, the pane's "5:5 Blessed are they who mourn" of Aquinas, whose Vulgate puts the mourners after the meek)
    const h = single ? { list: [Number(v)] } : verseHead(String(s || '').replace(/^#{1,6}\s+/, ''));
    if (!h || h.list.length !== 1 || /\b(?:seqq?|sqq)\b/i.test(String(s).slice(0, 40))) return false;
    const L = lemmaWords(s), V = wordsTold(textOf(v));
    if (L.size < 2 || !V.size) return false;
    const own = shared(L, V);
    return versesOf(textOf).some(([u, w]) => u !== Number(v) && Math.abs(u - Number(v)) <= 2 && shared(L, w) > own);
  }
  // and more of them than of the verse before (`before`): resolve()'s note numbered past the chapter's end
  const pastFits = (s, text, before) => fitsVerse(s, text) && shared(wordsTold(opening(s)), wordsTold(text)) > shared(wordsTold(opening(s)), wordsTold(before));
  /* A NOTE ON ANOTHER VERSE (2026-11-09, owner: "iterate until scripture can be used as a daily driver for what were doing"). Some works
   * number their sections, not the verses, and the library files the section that holds a verse: Augustine's unfinished exposition of
   * Romans comments on 1:6 in his section 7, and his "6. Through whom we have received, he says, grace and apostleship" (1:5) was marked
   * as his note on 1:6; so Origen's "7. "Through whom we have received grace and apostleship"" (1:5) on 1:7, and Calov's "12. Verse 7. AND
   * THY INIQUITY SHALL BE TAKEN AWAY" on Isaiah 6:12. Others count the verses otherwise than the English where the Hebrew does not: the
   * Vulgate's Haggai 2 takes in the English 1:15, and Albertus's "15. And Aggaeus answered, and said: So is this people" is the English
   * 2:14. quotesOther reads a heading's quoted words only, and these quote nothing so marked. A paragraph that opens with a bare number is
   * not the verse's note where a heading of other verses follows the number ("Verse 7."), or where its first words, to the first stop or
   * bracket, quote another verse: three or more of that verse's own words (those the verse lacks, each counted once), none of the verse's
   * own (those the other lacks) and one of its words at most. (Where the stop after a lemma is lost, the comment after it is read as its
   * quotation, unless the note opens on the verse's own first words, as Calvin's "3. And God said Moses now, for the first time,
   * introduces God in the act of speaking, as if he had created the mass of heaven and earth" on Genesis 1:3; a rule that let all such
   * prose pass let back twenty notes of the Douay's and the Vulgate's verses under the English numbers.) Only such a number is read so:
   * a heading that names its verse
   * or verses after the number is read by them ("28. (Vers. 13, 14).", Bonaventure on Luke 2:14), and a heading that names its verse is
   * read by it, though its
   * words be another verse's in the page's translation (the Westminster Annotations' "V. 20. moving creature] Heb. creeping thing", Genesis
   * 1:20 in the English of 1611, where the page has "swarms of living creatures"), a heading of several verses holds them all ("Verses
   * 15-18. I Daniel was grieved", Benson on Daniel 7:16), and a comment that opens on the verse before ("Since the presumptuous speaking of
   * the little horn", Calvin on 7:11) is no quotation of it; nor is a lemma of small words ("6. This shall not be]", Poole on Amos 7:6).
   * textOf(n): the words of the chapter's verse n as the page gives them; where they are not given, or the note is in another tongue,
   * nothing is refused. */
  function onOther(s, v, textOf, also) {
    const t = String(s || '').replace(/^#{1,6}\s+/, '');
    if (!LEAD_NUM.test(t)) return false;
    // (a heading after the number names the verses it is on: Bonaventure's "28. (Vers. 13, 14)." is his note on Luke 2:14; `also`, the
    // numbers the note may carry for the verse besides its own, the work's count: Augustine's "2. [vers. 2.]" on Psalm 32:1)
    // (2026-11-09, pane3b) and a numbered question that names its verse: Willet's "12. Quest. v. 9. Whether David sinned in taking
    // Goliaths sword" is his twelfth question, on 1 Samuel 21:9, not his note on 21:12
    const named = verseHead(t.replace(/^\s*\(?\d{1,3}\)?\.?\s+/, '').replace(/^(?:Quest(?:ion)?|Qu)\.?\s+(?=v)/i, ''));
    if (named && named.list.length) return ![Number(v), ...(also || []).map(Number)].some((x) => named.list.includes(x));
    const lead = afterHead(t).replace(/^\s*\(?\d{1,3}\)?\.?\s+/, '');
    // (a word joined to another by a hyphen counts as two: the page's "night-visions" of Daniel 7:7 is Poole's "vision of the night")
    const told = (x) => wordsTold(String(x || '').replace(/([A-Za-z])-([A-Za-z])/g, '$1 $2'));
    const q = told(lead.split(/\]|[.;?!](?:\s|$)/)[0].slice(0, 160)), vw = told(textOf(v));
    if (q.size < 3 || !vw.size || shared(q, vw) > 1) return false;
    const lacks = (set) => (x) => { for (const y of set) if (sameWord(x, y)) return false; return true; };
    // (the chapter's other verses, as the page gives them)
    const others = [];
    for (let u = 1, miss = 0, seen = false; u <= 200 && miss < 3; u += 1) {
      const w = String(textOf(u) || '');
      if (!w.trim()) { if (seen) miss += 1; continue; }
      seen = true; miss = 0;
      if (u !== Number(v)) others.push(w);
    }
    // (a note that opens on the verse's own first words, three or more and as many as any other verse's, quotes it, though the stop
    // after its lemma be lost: Calvin's "3. And God said Moses now, for the first time, introduces God in the act of speaking, as if he
    // had created the mass of heaven and earth" on Genesis 1:3, his "8. And there were shepherds It would have been to no purpose" on
    // Luke 2:8; not Augustine's "29. And God said: Let us make man to our image" on 1:29, which is 1:26's)
    const plain = (x) => String(x || '').toLowerCase().replace(/[^a-z\u00df-\u024f\s]+/g, ' ').split(/\s+/).filter(Boolean);
    const first = plain(lead), opens = (x) => { const w = plain(x); let n = 0; while (n < w.length && n < first.length && w[n] === first[n]) n += 1; return n; };
    const own = opens(textOf(v));
    if (own >= 3 && others.every((w) => opens(w) <= own)) return false;
    for (const w of others) {
      const uw = told(w);
      // (2026-11-09, pane3b) not a verse worded nearly as this one: Exodus 21:29 and 21:36 both have the ox "wont to gore in time past"
      // and its owner who "hath not kept it in", and Rivet's note on 21:36 quotes them
      if (shared(uw, vw) >= 4) continue;
      if (shared([...uw].filter(lacks(vw)), q) >= 3 && shared([...vw].filter(lacks(uw)), q) === 0) return true;
    }
    return false;
  }

  // The search itself. `getParas(slug, n)` gives a page's paragraphs as [english[], latin[]]. A work `c` is
  // {slug, notes: {verse: page}, rows: {verse: [row]}, pv: {verse: printed number}, open: the map's page for the chapter,
  // close: the map's page for the NEXT chapter}; `w` is {name, ch}. resolve() gives {p, how, v, indexed}, where how is, in order of
  // preference:
  //   note     the library indexed the work's own note on the verse, or its page text carries one;
  //   range    a lecture, homily or tractate headed by a range of the chapter's verses holding it begins there ({a, b});
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
    // the verse's words as the page gives them, or ''
    const wordsAt = (x) => { try { return String(verseText(x) || ''); } catch (_) { return ''; } };
    // (2026-11-08) the chapter's last verse, as the page gives its verses, a gap of a verse or two passed over; 0 where none is given
    const lastVerse = () => {
      let n = 0;
      try { for (let x = 1, miss = 0; x <= 200 && miss < 5; x += 1) { if (String(verseText(x) || '').trim()) { n = x; miss = 0; } else if (n) miss += 1; else if (x > 3) break; } } catch (_) { n = 0; }
      return n;
    };
    const printedOf = (c, v) => (c.pv && c.pv[v]) || v;
    const memo = new Map();
    const once = (k, make) => { if (!memo.has(k)) memo.set(k, make()); return memo.get(k); };
    // The section is the chapter's pages, read once: it gives the section's start, and an index of the note headings in it ("Vers.
    // 20.", "9. LET THE WATERS", "(Vers. 14.)", "VERS. 2-3.--": a heading of several verses holds each, the narrowest heading of a verse
    // taking it), each the first heading of its number that follows the one before, so a cross-reference or a repeated number cannot
    // take it; a heading that names another chapter, and those after it, are that chapter's.
    /* THE SECTION'S BOUNDS (2026-11-08, owner: "do more testing and then fix"; a survey of 2,674 landings over 80 verses). Three faults:
     *   - the next chapter's page was left out, where the chapter's last verses often stand (Grotius on 2 Peter 1:21 at p. 126, Piscator
     *     on Genesis 12:3 at p. 75): the section now runs to the map's page for the next chapter, that page too, and stops at the next
     *     chapter's heading on it (`hi` is that last page, read);
     *   - with no next chapter on the map, or one on the same page, the section was read for 150 pages and started at the longest run of
     *     reprinted verses in them: the Westminster Annotations opened Revelation (p. 476) for verses of the Gospels and the Epistles, de
     *     Dieu his index (p. 905), Grotius his errata (p. 573), Poole's Annotations Psalm 106 for Psalm 2. The start now moves only where
     *     the next chapter's page is known and lies after this one's, and never past a later chapter's heading; otherwise forty pages
     *     are read from the map's page;
     *   - the last notes of the chapter before, above this chapter's heading on its first page (Augustine's Psalm 1 above "ENARRATION
     *     ON PSALM II."), took the index's first numbers, and this chapter's own were refused as going back: the section now starts at
     *     the chapter's own heading where it stands on the map's page or the next (for a psalm, its number or the Vulgate's).
     * The section's reprinted text is read across its pages as one run (`text`), so a text that runs over a page break is still
     * the text where it is seen on one page alone (Calvin's Genesis 1 over pp. 19-21). */
    const section = (c, w) => once(`sec|${c.slug}|${w.name}|${w.ch}`, async () => {
      const from = c.open != null ? +c.open : 0, ch = +w.ch, psalms = /^psalm/i.test(String(w.name || '').trim());
      const known = from > 0 && c.close != null && +c.close >= from;
      // with no next chapter on the map: forty pages, or as far as most of the library's own rows on the chapter's verses go (the ninth
      // tenth of them, so that a stray row on an index or another chapter does not carry it), 150 at most: Taylor's Titus 3 runs from p.
      // 539 to p. 745, Burroughs's Hosea 6 from p. 547, his note on 6:6 at p. 598
      const rowPages = [...Object.values(c.notes || {}), ...Object.values(c.rows || {}).flat().map((r) => r && r.p)].map(Number)
        .filter((p) => p >= from && p <= from + 150).sort((x, y) => x - y);
      const rowsTo = rowPages.length ? rowPages[Math.floor((rowPages.length - 1) * 0.9)] : 0;
      const end = from <= 0 ? 0 : known ? Math.min(+c.close, from + 260) : Math.max(from + 40, rowsTo);
      const pages = [];
      for (let n = from; from > 0 && n <= end; n += 1) { const [en, la] = await getParas(c.slug, n); pages.push([n, en.length ? en : la]); }
      const alias = psalms ? vulgateOf(ch).filter((m) => m !== ch) : [];
      const later = (m) => m > ch && m <= ch + 3 && !alias.includes(m);
      // the start: the chapter's own heading on the map's page or the next, else the page with the longest run of reprinted verses.
      // A psalm's own number and the Vulgate's can both stand there: Augustine's "ENARRATION ON PSALM XV." is Psalm 16, and the "XVI." on
      // his next column is Psalm 17; in a work that counts as the English does, "PSALM XV." would be the psalm before. The heading that
      // stands at or before the library's notes on the chapter (the first quarter of them, by its column) is its own, and with no note a
      // psalm's is not taken, as one number alone tells nothing there (the Gloss's page for Psalm 51 carries only "PSALM LI.", its Psalm
      // 52); a heading below the library's notes is no start (Piscator prints Isaiah 53's text, then "CHAPTER LIII."). And it is the start
      // only where another chapter's heading stands above it on its page (the Westminster Annotations print John 1, 2 and 3 on p. 399), or
      // every verse heading above it is numbered higher than the first below it (the chapter before's last notes): Lombard's "PSALM
      // XXII." stands on its column below his note on verse 1, Migne's Hosea 6 between his last notes on chapter 5.
      let p0 = 0, i0 = 0, own = null, cut = false;
      const colOf = (q, s) => (q + 1 < pages.length && pages[q + 1][1].includes(s) ? pages[q + 1][0] : pages[q][0]);
      const cands = [];
      for (let q = 0; q < Math.min(2, pages.length); q += 1) {
        pages[q][1].forEach((s, k) => {
          const m = chapterHead(s, psalms);
          if ((m === ch || alias.includes(m)) && !cands.some((x) => x.s === s)) cands.push({ q, k, m, s, col: colOf(q, s) });
        });
      }
      const noted = Object.values(c.notes || {}).map(Number).filter((p) => p >= from).sort((a, b) => a - b);
      const first = noted.length ? noted[Math.floor(noted.length / 4)] : null;
      const fit = first == null ? (alias.length ? [] : cands) : cands.filter((x) => x.col <= first);
      // (a psalm's two numbers both at or before them tell nothing either: the Gloss's "PSALMUS XV." and "XVI." on Psalm 16)
      const pick = (alias.length ? (new Set(fit.map((x) => x.m)).size === 1 ? fit[fit.length - 1] : null) : fit[0]) || null;
      if (pick) {
        const above = pages[pick.q][1].slice(0, pick.k).map(verseHead).filter(Boolean);
        let below = null;
        for (let q = pick.q; q < pages.length && !below; q += 1) for (const s of pages[q][1].slice(q === pick.q ? pick.k + 1 : 0)) { const h = verseHead(s); if (h) { below = h; break; } }
        own = pick.m;
        const before = pages[pick.q][1].slice(0, pick.k).some((s) => { const m = chapterHead(s, psalms); return m && m !== pick.m; });
        if (before || !below || above.every((h) => h.a > below.a)) { p0 = pick.q; i0 = pick.k; cut = true; }
      }
      if (!cut && known && +c.close > from) {
        let best = 5;
        // (never on the next chapter's page: the text it prints is that chapter's, Lapide's Genesis 2 at p. 235; nor past the middle of the
        // library's own notes on the chapter, three or more of them over more than one page: Bellarmine's notes on Psalm 23 are at pp.
        // 137-138, the text of his Psalm 24 at p. 140; the middle, as some rows are keyed to another chapter (Clarke's on 2 Timothy 3:16
        // and 3:17 stand at 2 Timothy 1:16-17, p. 136); an index that puts every verse on one page, Albert's on Matthew 5, says nothing)
        const until = noted.length >= 3 && noted[0] !== noted[noted.length - 1] ? noted[Math.floor(noted.length / 2)] : Infinity;
        for (let q = 0; q < pages.length && pages[q][0] < +c.close && pages[q][0] <= until; q += 1) {
          const ps = pages[q][1], at = ps.findIndex((s) => later(chapterHead(s, psalms))), part = at >= 0 ? ps.slice(0, at) : ps;
          // the chapter's text in one piece; a section's verses printed ahead of its notes (Calvin's, every few verses) say nothing of
          // where the chapter begins, and would start it at the longest of them. (2026-11-08) Its lines are a verse long: a run of a
          // homily's numbered sections is no text (Ambrose's on Luke 22 moved the start past all his notes on the chapter)
          const run = [...lemmaParts(part).runText].filter((k) => part[k].length < 300).length;
          if (run > best) { best = run; p0 = q; }
          if (at >= 0) break;
        }
      }
      // the end: the next chapter's heading after the start, or a verse heading that names a later chapter ("(Chap. VII.--Vers. 1.)")
      let p1 = pages.length - 1, i1 = p1 >= 0 ? pages[p1][1].length : 0, stopped = false;
      // (below the chapter's own heading, where it stands, even where the section is not cut there: the chapters before it on its page are
      // no end of it)
      const [q0, k0] = pick && (pick.q > p0 || (pick.q === p0 && pick.k >= i0)) ? [pick.q, pick.k] : [p0, i0];
      find: for (let q = q0; q < pages.length; q += 1) {
        const ps = pages[q][1];
        for (let k = q === q0 ? k0 + 1 : 0; k < ps.length; k += 1) {
          const m = chapterHead(ps[k], psalms), h = m ? null : verseHead(ps[k]);
          const next = m ? (own != null ? m !== own && (m === 1 || (m > own && m <= own + 3)) : later(m)) : !!(h && h.chap != null && later(h.chap));
          // (not where most of the library's notes on the chapter stand after it: Theophylact's "CHAPTER XI." heads col. 599, his notes
          // on Mark 10 are indexed at cols. 601-607)
          if (next && noted.filter((p) => p > pages[q][0]).length * 2 > noted.length) continue;
          if (next) { p1 = q; i1 = k; stopped = true; break find; }
        }
      }
      // the next chapter's page with no heading of it found: what it carries is taken for the next chapter's (Bellarmine's Psalm 24 and
      // Calov's 23 open on their map pages under no heading the section knows)
      if (!stopped && known && +c.close > from && p1 > p0 && pages[p1][0] === +c.close) i1 = 0;
      const lo = pages.length ? pages[p0][0] : from, hi = pages.length ? pages[p1][0] : (from <= 0 ? Infinity : end);
      // the section's paragraphs from its start to its end, each once (a page of two columns repeats its second on the next page)
      const joined = [], at = [];
      for (let q = p0; q <= p1 && q < pages.length; q += 1) {
        const [n, ps] = pages[q], prev = q > p0 ? new Set(pages[q - 1][1]) : null;
        for (let k = q === p0 ? i0 : 0; k < (q === p1 ? i1 : ps.length); k += 1) if (!prev || !prev.has(ps[k])) { joined.push(ps[k]); at.push([n, k]); }
      }
      // (the text printed whole: a run of verses, or the verses ahead of their notes; not a long note that lists 1. 2. 3. inside it, as
      // Poole's Synopsis does, which a paragraph seen alone may be taken for)
      const parts = lemmaParts(joined), app = apparatusIndexes(joined), text = new Set([...parts.runText, ...parts.ahead].map((k) => joined[k]));
      const ahead = new Set([...parts.ahead].map((k) => joined[k])), aheadAt = new Map();
      for (const k of [...parts.ahead].sort((x, y) => x - y)) { const m = /^(\d{1,3})\./.exec(joined[k]); if (m && !aheadAt.has(+m[1])) aheadAt.set(+m[1], at[k][0]); }
      // the notes numbered with no stop after that text ("7 Emptied himself."), known only from the section read whole
      const nostop = new Map([...parts.notes].map(([k, x]) => [joined[k], x]));
      // (2026-11-08) what stands under the references of another chapter, with the text they name after them, is that chapter's, to the
      // next chapter's heading: Calvin's Harmony of the Law prints Deuteronomy 9:1-6 and his notes on it within the pages the map gives
      // his Deuteronomy 6, and his "4. Speak not thou in thine heart" was marked as his note on 6:4. Such paragraphs are never the note
      // (`skip`, with the section's text). A run of references is read as one: the Harmony of the Gospels heads a section "Matthew
      // 16:13-19", "Mark 8:27-29", "Luke 9:18-20", and its notes are on all three
      // (2026-11-09, pane3b; screen1's Bible-wide run) a reference of another book is not this chapter's, whatever its numbers: Calvin's
      // Harmony of the Law heads "Leviticus 19:16, 17" a page before "Deuteronomy 19:16-21", and his "17. Thou shalt in any wise rebuke
      // thy neighbor" was taken for his note on Deuteronomy 19:17
      const bk = bookWord(w.name), foreign = new Set(), chapsOf = (x) => refsOf(x).map((r) => (ofBook(r.book, bk) ? r.c : 0));
      let rc = null;
      for (let k = 0; k < joined.length; k += 1) {
        let j = k;
        if (refHead(joined[k])) {
          let rs = refHead(joined[k]), cs = chapsOf(joined[k]);
          while (j + 1 < joined.length && refHead(joined[j + 1])) { j += 1; rs = rs.concat(refHead(joined[j])); cs = cs.concat(chapsOf(joined[j])); }
          const n = bareNum(joined[j + 1] || '');
          if (n != null && rs.some(([a, b]) => a <= n && n <= b)) rc = cs;
        } else if (chapterHead(joined[k], psalms)) rc = null;
        else {
          // (2026-11-09, pane3b) and a heading of a book's chapter ("Numbers 8") or of a passage the reference reading does not take
          // ("Numbers 8:5-19, 23-26") begins another passage: what stood under the reference before it ends there, and what follows is
          // that chapter's of this book (the Harmony prints "Leviticus 8:1-3", then "Numbers 8", "Numbers 8:5-19, 23-26" and his notes on
          // Numbers 8); another book's such heading counts where the text it names follows it
          const g = BOOK_HEAD.exec(joined[k]);
          if (g && BIBLE.has(bookWord(g[1]))) {
            // (one of a run of references, read as one heading, the Harmony of the Gospels' "Matthew 27:33-38", "Mark 15:22-28", "Luke
            // 23:33-34, 38": it adds its chapter where it is this book's, and takes nothing away)
            const inRun = k > 0 && (refHead(joined[k - 1]) || BOOK_HEAD.test(joined[k - 1]));
            // (a book of one chapter is cited by its verse: Calvin's "Obadiah 6" heads his note on verse 6)
            const c = !/:/.test(joined[k]) && (/^(?:obadiah|philemon|jude)$/.test(bookWord(g[1])) || /^(?:2|3|II|III)\s+John$/i.test(g[1].trim())) ? 1 : Number(g[2]);
            if (ofBook(g[1], bk)) rc = inRun && rc ? rc.concat([c]) : inRun ? rc : [c];
            else if (!inRun) {
              let q = k; while (q + 1 < joined.length && (BOOK_HEAD.test(joined[q + 1]) || refHead(joined[q + 1]))) q += 1;
              if (bareNum(joined[q + 1] || '') != null) rc = [0];
            }
          }
        }
        for (let q = k; q <= j; q += 1) if (rc && !rc.some((x) => x === ch || alias.includes(x))) foreign.add(joined[q]);
        k = j;
      }
      const skip = new Set([...text, ...foreign]);
      // (2026-11-08) the section's own headings where they stand, for the seek in resolve(): a run of references with the verses of each
      // chapter it takes ("Hebrews Chapter 12:9-11"; the Harmony's run of three, one heading), or a chapter's heading
      const turns = [];
      for (let k = 0; k < joined.length; k += 1) {
        if (refHead(joined[k])) {
          const t = { p: at[k][0], pos: k, refs: refsOf(joined[k]) };
          while (k + 1 < joined.length && refHead(joined[k + 1])) { k += 1; t.refs = t.refs.concat(refsOf(joined[k])); }
          turns.push(t);
        } else { const m = chapterHead(joined[k], psalms); if (m) turns.push({ p: at[k][0], pos: k, chap: m }); }
      }
      const heads = {}, caps = [], ranges = [], marks = [];
      // a heading that names its verses says so wherever it stands in the section (Augustine's Tractate I, col. 35)
      pages.forEach(([n, ps], q) => { if (q <= p0) for (const s of q < p0 ? ps : ps.slice(0, i0)) { const r = rangeOf(s, w.ch); if (r) ranges.push({ p: n, pos: -1, ...r }); } });
      // the first verses that the next two headings after `pos` name, a few paragraphs on at most, in this chapter
      const nextHeads = (pos) => {
        const xs = [];
        for (let k = pos + 1; k < joined.length && k <= pos + 8 && xs.length < 2; k += 1) {
          const g = app.has(k) || byMargin(joined[k]) ? null : verseHead(joined[k]); if (!g) continue;
          if (g.chap != null && g.chap !== ch) break;
          xs.push(g.a);
        }
        return xs;
      };
      let last = 0, lastA = 0, cur = null, named = false, title = '';
      // (2026-11-08) Hammond's annotations, after the paraphrases of the whole chapter, go back to its first verses: one that quotes its
      // verse, as he prints it ahead of the paraphrase (`lines`) or as the page gives it, takes that verse from his paraphrase of it.
      // Only in the first annotations after the chapter's own paraphrases ("Annotations on Psalm XLV.", "Annotations on Chap. I."), in
      // their own order, and over a paraphrase: no other heading that goes back is taken. Not the psalm's before, whose annotations head
      // its page (Psalm 15's at the top of Psalm 16's), nor the next book's where the section runs on past the book's last chapter (Mark
      // 10's "V. 19. Defraud not]" after Matthew 28)
      let annots = false, done = false, lastAnn = 0, pending = [];
      const lines = new Map(), paraOf = new Set(), pageVerse = (x) => { try { return c.pv && Object.keys(c.pv).length ? '' : String(verseText(x) || ''); } catch (_) { return ''; } };
      for (let pos = 0; pos < joined.length; pos += 1) {
        if (app.has(pos)) continue; // "13 zu Inanis et vacua" is the editors' line number, not verse 13
        const s = joined[pos], [n, i] = at[pos];
        if (/^(?:#{1,6}\s+)?Annotations\s+on\b/i.test(s)) { if (paraOf.size && !annots) annots = true; else if (annots) done = true; pending = []; } else if (bareNum(s) != null && verseHead(s) == null) pending.push(s);
        // (the verse as he prints it, the last line of its number ahead of his paraphrase of it; a paraphrase after the annotations is
        // the next chapter's)
        if (PARA.test(s)) {
          if (annots) done = true;
          for (const x of (verseHead(s) || { list: [] }).list) { paraOf.add(x); const l = pending.slice().reverse().find((y) => bareNum(y) === x); if (l) lines.set(x, l); }
          pending = [];
        }
        const r = rangeOf(s, w.ch); if (r) ranges.push({ p: n, pos, ...r });
        for (const x of cvMarks(s, w.ch)) if (!marks.some((y) => y.v === x.v)) marks.push({ p: n, i, pos, v: x.v });
        let h = verseHead(s);
        // (2026-11-08) a Roman verse heading counts only where its words are its verse's (romanFits)
        if (h && h.roman && !romanFits(s, wordsAt(h.a))) h = null;
        if (h && h.chap != null) {
          // the first heading that names this chapter's first verse is where it starts: what the index took before it was another
          // chapter's; once it is named, a heading that names another chapter ends it (Trapp's "CHAP. III. Verse 1." of Hebrews, after
          // his Titus 3, is no new start of Titus 3)
          if (h.chap !== ch) { if (named) break; cur = h.chap; continue; }
          if (!named && h.a === 1) { for (const x of Object.keys(heads)) delete heads[x]; last = 0; lastA = 0; }
          cur = ch; named = true;
        } else if (h && cur != null && cur !== ch) continue;
        if (!h && !parts.all.has(pos)) { const cn = capsNum(s); if (cn != null) h = { a: cn, b: cn, list: [cn] }; }
        if (h) {
          // (a section cut at the chapter's heading holds nothing of the chapter before: a sparse annotator's notes may stand further apart,
          // Grotius's on Proverbs 8 at verses 1, 14 and 22; but a heading that runs ahead of the count, where the next two run on from the
          // last, is none of the chapter's: Migne's footnote "v. 18. In similar language John the Baptist is called Elijah", between his
          // notes on 1 John 4:3 and 4:4, took the place of verses 4 to 17, and the reader was sent to 4:3 for 4:8)
          const nx = h.a > last + 1 ? nextHeads(pos) : [];
          const stray = nx.length === 2 && nx[0] > lastA && nx[0] < nx[1] && nx[1] < h.a;
          if (h.a > lastA && h.a - last <= (cut ? 25 : 12) && !stray && !byMargin(s)) {
            for (const x of h.list) if (!heads[x] || heads[x].w > h.list.length) heads[x] = { p: n, i, pos, w: h.list.length, s, br: !!h.br };
            if (!title && h.list.includes(1)) title = s;
            lastA = h.a; last = Math.max(last, h.b);
          } else if (annots && !done && h.a > lastAnn && !PARA.test(s)) {
            for (const x of h.list) {
              // (over his paraphrase, or his verse set in capitals where it took the place: "1. NOW Faith is the confident expectation")
              if (heads[x] && (PARA.test(heads[x].s) || paraOf.has(x)) && annotates(s, lines.has(x) ? [lines.get(x)] : [], pageVerse(x))) heads[x] = { p: n, i, pos, w: h.list.length, s, br: !!h.br };
            }
            lastAnn = h.a;
          }
        } else if (!parts.all.has(pos)) {
          const m = /^[«"“‘']?([A-Z][A-Z’' -]{6,}[A-Z])\s*(?:[.,;:—–]|$)/.exec(s);
          if (m) caps.push({ p: n, i, pos, words: m[1].toLowerCase().split(/[^a-z]+/).filter(Boolean) });
        }
      }
      // a psalm's title counted as its first verse (located): its heading of verse 1 is on the title ("1. [vers. 1.] Unto the end, to the
      // servant of the Lord", the Gloss's "VERSE 1.-- Unto the end, a psalm."), or its bracketed headings, Augustine's, run past the
      // psalm's last verse in the English count by the title's verses (his Psalm 3 to "[vers. 9.]"; Cassiodorus's "Ver." headings run
      // past it for other reasons, and his "Ver. 1." on Psalm 18 is "I will love thee, O Lord")
      let titleOff = 0;
      const t = psalms ? TITLED[ch] || 0 : 0;
      if (t) {
        let nv = 0;
        try { while (nv < 200 && String(verseText(nv + 1) || '').trim()) nv += 1; } catch (_) { nv = 0; }
        if ((nv > 0 && Object.keys(heads).some((k) => +k > nv && +k <= nv + t && heads[k].br)) || TITLE_WORDS.test(afterHead(title))) titleOff = t;
      }
      // the next chapter on the chapter's own first page, with no heading of a later chapter there, says nothing of where the chapter
      // ends: the lectures and homilies that name their chapter and verses are read on, forty pages (Aquinas on Romans 9, whose map
      // gives Romans 10 at p. 50 too: his lecture on 9:6-13 is at p. 51, and the reader was sent to the chapter's opening for 9:13).
      // Only they are: a bare verse heading there may be any chapter's
      if (known && +c.close === from && !stopped) {
        let pos = joined.length;
        for (let n = from + 1; n <= from + 40; n += 1) {
          const [en, la] = await getParas(c.slug, n);
          for (const s of en.length ? en : la) { const r = rangeOf(s, w.ch); if (r) ranges.push({ p: n, pos, ...r }); pos += 1; }
        }
      }
      // the library's own rows on the chapter's verses need no page read: with no next chapter on the map and no heading of it found in
      // the pages read, they are taken as far as the section once ran (150 pages; Taylor's Titus 3 runs from p. 539, his note on 3:6 is
      // at p. 622)
      const far = !known && from > 0 && !stopped ? from + 150 : hi;
      // (2026-11-08) with the next chapter on this chapter's own first page and no heading of it read there, the library's own rows on
      // the chapter's verses are taken as far as they rise with the verses, forty pages at most: Jerome's on Zechariah 12, whose map gives
      // chapter 13 on col. 1508 too, are indexed at cols. 1510-1515, and the reader was sent to the column of 12:9 for 12:10
      let rowsFar = far;
      if (known && +c.close === from && !stopped) {
        const rs = Object.entries(c.notes || {}).map(([x, p]) => [+x, +p]).filter(([, p]) => p >= from).sort((x, y) => x[0] - y[0]);
        if (rs.length >= 3 && rs.every(([, p], k) => !k || p >= rs[k - 1][1])) rowsFar = Math.max(far, Math.min(from + 40, rs[rs.length - 1][1]));
      }
      // (the section's last page, and where on it the section ends: the next chapter's heading, or its top where none is read there)
      const endAt = pages.length ? { p: pages[p1][0], i: i1 } : null;
      return { lo, hi, far, rowsFar, endAt, heads, caps, ranges, marks, text, skip, foreign, ahead, aheadAt, nostop, titleOff, turns, bk };
    });
    // THE NOTE AFTER ITS TEXT (2026-11-08, QA). The library indexes Calvin's note on a verse at the page where the verse is printed
    // ahead of his notes (Galatians 2:16 at p. 29, with the text of 2:11-16; Isaiah 53:5 at p. 61, with 53:1-12), and his note on
    // it comes after those on the verses before it (p. 34; p. 64). Where the indexed page and the next carry the verse only in such
    // a text, with no note on it, the place is the first of the section's following pages that carries one. (2026-11-08, survey) The
    // text is the section's, read whole (Calvin prints Genesis 3 on pp. 58-59), and the search runs to the section's end, forty pages
    // at most: his note on Genesis 3:15 is at p. 72. The same holds for a page the library files as discussing the verse.
    const noteAfterText = async (c, sec, p0, printed, ch, vt) => {
      const [[e1, l1], [e2, l2]] = [await getParas(c.slug, p0), await getParas(c.slug, p0 + 1)];
      let held = false;
      for (const all of [[...e1, ...e2], [...l1, ...l2]]) {
        if (!all.length) continue;
        if (findNote(all, printed, true, ch, sec.skip, undefined, vt) >= 0) return null;
        const { ahead } = lemmaParts(all);
        if (all.some((s, k) => (ahead.has(k) || sec.ahead.has(s)) && +(/^(\d{1,3})\./.exec(s) || [])[1] === +printed)) held = true;
      }
      for (let n = p0 + 2; held && n <= Math.min(sec.far, p0 + 40); n += 1) {
        if (await noteOn(c, sec, n, printed, ch, vt)) return n;
        // another passage's text begins under its reference: the note on this verse came before it, unfound (Calvin's Harmony of the
        // Law runs from Exodus 20:3 on to Deuteronomy 13:3, whose note is no note on Exodus 20:3); (2026-11-09, pane3b) a reference of
        // another book holds none of this book's verses
        const [en] = await getParas(c.slug, n);
        if (en.some((s) => { const r = refsOf(s); return r.length && !r.some((x) => ofBook(x.book, sec.bk) && x.a <= +printed && +printed <= x.b); })) return null;
      }
      return null;
    };
    // whether pages p and p + 1 carry the verse's number only in a line of the text (a verse long, never a numbered note that runs on), or
    // under another chapter's heading, and no note on it. The text is a run of verses or the verses ahead of their notes, never a note
    // that lists "1. … 2." inside it (Poole's Synopsis on 1 John 4:8, "8. He that loveth not (either, 1. a brother: or, 2. God …) knoweth
    // not God] That is …", was dropped from his index)
    const textOnly = async (c, sec, p, printed, ch, vt) => {
      const [[e1, l1], [e2, l2]] = [await getParas(c.slug, p), await getParas(c.slug, p + 1)];
      let seen = false;
      for (const all of [[...e1, ...e2], [...l1, ...l2]]) {
        if (!all.length) continue;
        if (findNote(all, printed, true, ch, sec.skip, undefined, vt) >= 0) return false;
        const { runText, ahead } = lemmaParts(all);
        let hc = null;
        for (let k = 0; k < all.length; k += 1) {
          const m = chapterHead(all[k], false) || chapterHead(all[k], true); if (m) hc = m;
          if (bareNum(all[k]) !== +printed || verseHead(all[k]) != null) continue;
          const elsewhere = (hc != null && hc !== +ch && !vulgateOf(+ch).includes(hc)) || sec.foreign.has(all[k]);
          if (!elsewhere && (all[k].length >= 300 || !(runText.has(k) || ahead.has(k) || sec.text.has(all[k])))) return false;
          seen = true;
        }
      }
      return seen;
    };
    // whether page n carries the note on the verse: by its own reading, or as the section read whole ("7 Emptied himself.")
    const noteOn = async (c, sec, n, printed, ch, vt) => {
      const [en, la] = await getParas(c.slug, n);
      return findNote(en, printed, false, ch, sec.skip, undefined, vt) >= 0 || findNote(la, printed, false, ch, sec.skip, undefined, vt) >= 0 || en.some((s) => sec.nostop.get(s) === +printed && !sec.foreign.has(s));
    };
    /* A NOTE OUTSIDE THE TRACTATE ON ITS VERSE (2026-11-08, found testing Augustine on John 1). The library indexed the numbered sections
     * of Augustine's Tractate I (on John 1:1-5) as notes on verses: its §13, at col. 1385 on 1:3, became "his note on John 1:13", though
     * Tractate II, on 1:6-14, begins at col. 1388. Where a heading in the section names a run of verses holding this one, a page that lies
     * outside that run (before its heading, or past the next one) is not the note on it. */
    const inRun = (sec, printed, p) => {
      const r = sec.ranges.filter((x) => x.a <= printed && printed <= x.b).sort((x, y) => (x.b - x.a) - (y.b - y.a) || x.p - y.p)[0];
      if (!r) return true;
      const next = sec.ranges.filter((x) => x.p > r.p).sort((x, y) => x.p - y.p)[0];
      return p >= r.p && (!next || p <= next.p);
    };
    // (2026-11-09) the narrowest heading of a run of two verses or more that holds this one, where page p lies in its division, or null
    const runAt = (sec, printed, p) => {
      const r = sec.ranges.filter((x) => x.a <= printed && printed <= x.b && x.b > x.a).sort((x, y) => (x.b - x.a) - (y.b - y.a) || x.p - y.p)[0];
      if (!r) return null;
      const next = sec.ranges.filter((x) => x.p > r.p).sort((x, y) => x.p - y.p)[0];
      return p >= r.p && (!next || p <= next.p) ? r : null;
    };
    /* A PSALM'S TITLE COUNTED AS A VERSE (2026-11-08, found testing the bracketed headings). The Hebrew and the Vulgate count most
     * psalms' titles as their first verse (TITLED), the English does not: Augustine's "[vers. 7.]" on Psalm 51 (his 50) is the English
     * 51:5, and his "1. [vers. 1.]" on Psalm 18 is on its title. The library's index has it right (51:5 at col. 591, where "[vers. 7.]"
     * stands), but the pane marks a heading by the English number: once his headings were read, the reader would have been shown the
     * comment on another verse, marked as his note on this one. Where a work counts the title, the place is its heading of the verse in
     * that count (51:5 at "[vers. 7.]"), on the column where it stands, opened with nothing marked ("Its comment on Psalm 51:5", how
     * 'range'); with no such heading, the chapter's opening, said to be that. A work the map gives printed numbers for (`pv`) is read
     * by them. */
    const counted = (c, sec, v) => sec.titleOff && !(c.pv && c.pv[v] != null);
    const located = (c, v, w) => {
      return once(`loc|${c.slug}|${w.name}|${w.ch}|${v}`, async () => {
        const printed = printedOf(c, v), sec = await section(c, w), vt = wordsAt(v);
        if (counted(c, sec, v)) {
          const h = sec.heads[+printed + sec.titleOff];
          if (!h) return null;
          const [en, la] = await getParas(c.slug, h.p + 1);
          return { p: en.includes(h.s) || la.includes(h.s) ? h.p + 1 : h.p, v, range: { a: v, b: v } };
        }
        // (2026-11-09) a psalm's title headed as its verse 1, the verse's own words under its heading of verse 2 (titleAlone): that heading,
        // marked by its own number (Augustine's "2. [vers. 2.] Blessed are they whose iniquities are forgiven" on Psalm 32:1)
        if (+printed === 1 && !sec.titleOff && /^psalm/i.test(String(w.name || '').trim()) && sec.heads[1] && sec.heads[2] && titleAlone(sec.heads[1].s, sec.heads[2].s, vt)) return { p: sec.heads[2].p, v, pv: 2 };
        if (sec.heads[printed]) return { p: sec.heads[printed].p, v, s: sec.heads[printed].s };
        // the verse's place printed in the run of the text ("2, 16 Knowing that …", the Weimar edition)
        const mk = sec.marks.find((x) => x.v === +printed); if (mk) return { p: mk.p, v };
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
        // another work printed in the same volume), or the note itself where that page carries the verse only as the text
        // (2026-11-08) on the section's last page, the next chapter's, where no heading of that chapter is read, only for a verse after the
        // section's last heading: the chapter's last notes run on to it (Wesley's on 1 Corinthians 13:13, p. 249), its first do not. The
        // library's rows put Coke's Psalm 18:1 at p. 53, where his Psalm 19 opens under "PSA.L., XIX.", which the section cannot read,
        // past his notes on 18:7-50 at pp. 46-52; the note there was his "Ver. 1. The heaven's declare", on 19:1
        const onNext = (p) => !!sec.endAt && p === sec.endAt.p && sec.endAt.i === 0 && Object.keys(sec.heads).some((k) => +k > +printed);
        // (2026-11-08) inside a tractate, homily or lecture whose heading names a run of verses holding this one, a paragraph numbered
        // as the verse is the division's own section of that number, and only a heading that names the verse is its note: Augustine's
        // Tractate CV on John 17:1-5 opens his "3. Some accept the Son glorified by the Father …", which was marked as his note on 17:3
        const divided = sec.ranges.some((x) => x.a <= printed && printed <= x.b && x.b > x.a);
        const noteIn = (ps) => { const k = findNote(ps, printed, false, w.ch, sec.skip, undefined, vt); return k >= 0 && (!divided || (verseHead(ps[k]) || { list: [] }).list.includes(+printed)); };
        if (c.notes[v] != null && +c.notes[v] >= sec.lo && +c.notes[v] <= sec.rowsFar && inRun(sec, +printed, +c.notes[v]) && !onNext(+c.notes[v])) {
          const after = await noteAfterText(c, sec, +c.notes[v], printed, w.ch, vt);
          if (after != null) return { p: after, v, indexed: true };
          // (2026-11-08) a page that carries the verse only as a line of the text, with no note on it there or after, is no note: Albert's
          // every verse of Matthew 5 is indexed at the page of his text, and the reader was shown the verse marked as his note; nor one
          // whose line of that number stands under another chapter's heading (Poole's Annotations on Psalm 32:1, at p. 445: Psalm 33's
          // "1. REjoyce in the LORD")
          if (!(await textOnly(c, sec, +c.notes[v], printed, w.ch, vt))) {
            /* (2026-11-09, owner: "iterate until scripture can be used as a daily driver for what were doing"; the scorecard's wrong mark on
             * John 3:5) the same holds at the library's own page: there, inside such a division, with no heading that names the verse on it
             * or the next, the place is the division's run, nothing marked. Augustine's Tractate XI, headed "Chap. II, V. 23-25, and chap.
             * III, V. 1-5." at col. 1474, the library's page for John 3:5, numbers its sections 1 to 13, and his "5. Therefore attend, my
             * brethren" (on 3:3-4) was marked as his note on 3:5. */
            const r = divided ? runAt(sec, +printed, +c.notes[v]) : null;
            if (r) {
              const [[e1, l1], [e2, l2]] = [await getParas(c.slug, +c.notes[v]), await getParas(c.slug, +c.notes[v] + 1)];
              if (!noteIn([...e1, ...e2]) && !noteIn([...l1, ...l2])) return { p: +c.notes[v], v, range: { a: r.a, b: r.b } };
            }
            return { p: +c.notes[v], v, indexed: true };
          }
        }
        for (const cand of candidatePages((c.rows || {})[v], c.slug, w.name, w.ch, v).filter((x) => x.p >= sec.lo && x.p <= sec.far && inRun(sec, +printed, x.p)).slice(0, 8)) {
          for (const p of [cand.p - 2, cand.p - 1, cand.p]) {
            if (p < Math.max(1, sec.lo)) continue;
            const [en, la] = await getParas(c.slug, p);
            if (apparatusShare(en.length ? en : la) >= 0.8) continue; // a page of the editors' notes alone is no note on the verse
            // (on the section's last page, only above the next chapter's heading, or as above where none is read there)
            if (sec.endAt && p === sec.endAt.p) {
              const ps = en.length ? en : la, i = sec.endAt.i;
              if (i > 0 && i < ps.length) { if (noteIn(ps.slice(0, i))) return { p, v }; continue; }
              if (onNext(p)) continue;
            }
            if (noteIn(en) || noteIn(la)) return { p, v };
          }
          // (2026-11-08) a page that carries the verse only in the text printed ahead of the notes: the note is where it follows
          const after = await noteAfterText(c, sec, cand.p, printed, w.ch, vt);
          if (after != null) return { p: after, v };
        }
        // (2026-11-08) with no row of the library's to go by, the verse where the section prints it ahead of the notes: the note follows
        // (Calvin on Genesis 3:15, printed on p. 59, his note at p. 72)
        if (sec.aheadAt.has(+printed)) {
          const tp = sec.aheadAt.get(+printed);
          for (const p of [tp, tp + 1]) if (await noteOn(c, sec, p, printed, w.ch, vt)) return { p, v };
          const after = await noteAfterText(c, sec, tp, printed, w.ch, vt); if (after != null) return { p: after, v };
        }
        // the lecture whose heading names a range of the chapter's verses holding this one (the narrowest)
        const r = sec.ranges.filter((x) => x.a <= printed && printed <= x.b).sort((x, y) => (x.b - x.a) - (y.b - y.a) || x.pos - y.pos)[0];
        if (r) return { p: r.p, v, range: { a: r.a, b: r.b } };
        return null;
      });
    };
    /* THE COMMENT THAT RUNS ON OVER THE VERSE (2026-11-08, owner: "iterate until scripture can be used as a daily driver for what were
     * doing"). Calvin on Hebrews prints 12:4-8 under "Hebrews Chapter 12:4-8" and comments "7. For what son is he, etc." (p. 186), which
     * runs on through verse 8, which has no note of its own; his next section, "Hebrews Chapter 12:9-11", follows on p. 187. The seek took
     * the next note, within four verses, before the earlier one: "No separate note on 12:8. Its next note is on 12:9". Where the earlier
     * note's section heading takes both its verse and this one, and the next heading, after the earlier note's page and none between,
     * takes the next note's verse and none up to this one, the verse is in the earlier note's section, and that note is the place. Only
     * then: Calvin's Harmony heads the Lord's Supper "Matthew 26:26-30; Mark 14:22-26; Luke 22:17-20", and Luke 22:27, on the disciples'
     * strife, is not in it. (2026-11-09) The same where the next note stands within the earlier note's section, before the next heading,
     * on a verse its heading does not take: Calvin prints Joel 2:14 under his "Joel 2:12-13", with no heading of its own, and "Joel
     * 2:15-17" follows; Daniel 7:23-24 under "Daniel 7:21-22". Once his note on 2:14 was found, Joel 2:13 opened at it, past his comment
     * on 12-13. With no next heading, nothing says where the earlier section ends: the next note, as before. */
    const bookWord = (s) => String(s || '').toLowerCase().replace(/\bchapter\b/g, ' ').replace(/[^a-z ]/g, ' ').trim().split(/\s+/).pop().replace(/s$/, '');
    // (2026-11-09, pane3b) whether a reference's book is this one (bk): a name that is no book of the Bible, a misprint, is taken for it
    // (Calvin's "Malichi 3:15")
    const BIBLE = new Set(('genesis exodus leviticus numbers deuteronomy joshua judges ruth samuel kings chronicles ezra nehemiah esther job psalms '
      + 'proverbs ecclesiastes solomon isaiah jeremiah lamentations ezekiel daniel hosea joel amos obadiah jonah micah nahum habakkuk zephaniah '
      + 'haggai zechariah malachi matthew mark luke john acts romans corinthians galatians ephesians philippians colossians thessalonians timothy '
      + 'titus philemon hebrews james peter jude revelation').split(' ').map(bookWord));
    const ofBook = (book, bk) => !bk || !book || bookWord(book) === bk || !BIBLE.has(bookWord(book));
    const BOOK_HEAD = /^(?:#{1,6}\s+)?((?:(?:[1-3]|I{1,3})\s+)?[A-Z][A-Za-z]+(?:\s+(?:of\s+)?[A-Z][A-Za-z]+)?)\.?\s+(\d{1,3})(?:\s*:\s*\d{1,3}(?:\s*[-\u2013,]\s*\d{1,3})*)?\s*$/;
    const sectionTurn = (sec, prev, next, v, w) => {
      const ch = Number(w.ch), bk = bookWord(w.name);
      const mine = (t) => (t.refs || []).filter((r) => r.c === ch && (!bk || !r.book || bookWord(r.book) === bk));
      const holds = (t, x) => mine(t).some((r) => r.a <= x && x <= r.b);
      const ts = sec.turns || [], g = ts.filter((t) => t.p <= prev.p).pop(), h = ts.find((t) => t.p > prev.p);
      if (!g || !holds(g, prev.v) || !holds(g, v)) return false;
      if (h && next.p < h.p && !holds(g, next.v)) return true;
      if (!h || h.p > next.p || ts.indexOf(h) !== ts.indexOf(g) + 1) return false;
      return holds(h, next.v) && mine(h).every((r) => r.a > v);
    };
    async function resolve(c, v, w) {
      const here = await located(c, v, w);
      // (2026-11-09, pane3b) a heading whose lemma is a neighbour's says so (misfit): the first commentary is not chosen by it
      if (here) return here.range ? { p: here.p, how: 'range', v, a: here.range.a, b: here.range.b } : { p: here.p, how: 'note', v, indexed: !!here.indexed, ...(here.pv ? { pv: here.pv } : {}), ...(here.s && misfit(here.s, v, wordsAt) ? { misfit: true } : {}) };
      const sec = await section(c, w);
      // a psalm whose title the work counts, with no heading of the verse: no other verse's note is offered for it
      if (counted(c, sec, v)) return c.open != null ? { p: Math.max(+c.open, sec.lo), how: 'chapter' } : null;
      /* A NOTE NUMBERED PAST THE CHAPTER'S END THAT QUOTES THE VERSE (2026-11-09, owner: "iterate until scripture can be used as a daily
       * driver for what were doing"). No next note is named past the chapter's last verse (below), but a work that numbers the chapter's
       * last verses on from the English may print the last verse's note past it: Damascene on 2 Corinthians 5:21 at "Verse 22. “Him that
       * knew no sin, he made sin for us.”", Migne's Cursus on 1 Corinthians 13:13 at "VERSE 15. — NOW FAITH, HOPE, AND CHARITY ABIDE",
       * Rivet on Psalm 45:17 at "Ver. 18. I will make thy name to be remembered in all generations"; refused as past the end, the right text
       * became an earlier note. For the chapter's last verses, a heading up to three past the end whose first words are this verse's (two
       * that tell at least, and more than the verse before's) is its note, marked by its own number (pv). Hesychius's "Verse 9. Depart
       * from me" (Psalm 6:8), past his Psalm 1, shares none of Psalm 1:6's words and stays refused. */
      const last = lastVerse();
      if (last && v >= last - 2) {
        // (and more of them than of any other of the chapter's last verses: Chrysostom's "VERSE 27. Faith without works is dead" is his
        // note on James 2:26, "faith apart from works is dead", not on 2:24, "by works a man is justified, and not only by faith")
        const fitOf = (s, x) => shared(wordsTold(opening(s)), wordsTold(wordsAt(x)));
        for (let x = last + 1; x <= Math.min(last + 3, v + 4); x += 1) {
          const h = sec.heads[x];
          if (h && !h.br && pastFits(h.s, wordsAt(v), wordsAt(v - 1))) {
            const own = fitOf(h.s, v);
            let best = true;
            for (let y = Math.max(1, last - 3); y <= last; y += 1) if (y !== v && fitOf(h.s, y) >= own) best = false;
            if (best) return { p: h.p, how: 'note', v, pv: x };
          }
        }
      }
      const claims = [];
      for (const x of candidatePages((c.rows || {})[v], c.slug, w.name, w.ch, v)) {
        if (x.claim !== 'yes' || x.p < sec.lo || x.p > sec.far) continue;
        const [en, la] = await getParas(c.slug, x.p);
        if (apparatusShare(en.length ? en : la) < 0.8) claims.push(x); // a page that is nearly all the editors' notes is not "the comment"
      }
      /* NO NOTE PAST THE CHAPTER'S END (2026-11-08, owner: "iterate until scripture can be used as a daily driver for what were doing";
       * data7: with Hammond's Psalms widened to 1-150, 34 verses of Psalms 113, 123, 125, 127, 137 and 141 opened at the right page,
       * nothing marked, saying "Its next note is on Psalm 113:10" of a nine-verse psalm: his note on the next psalm's verse; Origen on
       * Genesis 23:18-20 named 43:22's note "23:22"). The seek names no verse past the chapter's last one, where the page gives the verses
       * (a verse a translation leaves out is no end) */
      const seek = async (dir, max) => {
        for (let d = 1; d <= max; d += 1) {
          const x = v + dir * d; if (x < 1 || (last && x > last)) return null;
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
      // the earlier note's section holds the verse (owned: the pane does not trade it for the chapter's opening)
      if (next && prev && next.v - v <= 4 && sectionTurn(sec, prev, next, v, w)) return { p: prev.p, how: 'nearest', v: prev.v, owned: true };
      if (next && next.v - v <= 4) return { p: next.p, how: 'later', v: next.v };
      if (prev) return { p: prev.p, how: 'nearest', v: prev.v };
      if (next) return { p: next.p, how: 'later', v: next.v };
      if (c.open != null) return { p: Math.max(+c.open, sec.lo), how: 'chapter' };
      return null;
    }
    return { located, resolve, section };
  }

  return { strongRx, bareRx, strongNum, bareNum, capsNum, verseHead, chapterHead, refHead, isApparatus, apparatusIndexes, apparatusShare, quotesVerse, lemmaParts, lemmaIndexes, cvMarks, findNote, noteEnd, gistClaims, candidatePages, rangeOf, createResolver,
    lemmaOf, wordsTold, quoteFit, quotesOther, fitsVerse, quotes, leads, harmonyNote, lineFits, misfit, afterPassage, onOther, twin, printedText, otherNumbers, otherCount, REFUSED,
    // (2026-11-09) whether paragraph k is of chapter ch, by the chapter and reference headings above it (chapterScope)
    inScope: (paras, ch) => chapterScope(paras, ch).mine };
}));
