/*
 * The Faith Received — one comparator for a shelf of titles.
 *
 * WHY. Eight surfaces sorted titles with a plain `localeCompare`, which
 * orders digit runs as text. Abraham Calov's System of Theological
 * Topics therefore stood on his shelf as
 *
 *   Vol. 1, Vol. 10, Vol. 11, Vol. 12, Vol. 2, Vol. 3, Vol. 4, ...
 *
 * and 242 of the library's 3,213 authors had a work list out of order
 * for the same reason. A multi-volume set is the one case where order
 * carries meaning, so this is not a tidiness problem: a reader looking
 * for where a work continues is told it continues in volume 10.
 *
 * Roman numerals fail the same way and worse, because text order puts
 * IX between IV and V. 68 titles in the catalogue number their parts in
 * Roman, "Sober Philosophy, Part III".
 *
 * WHAT IT DOES. Rewrites a volume number into a sortable one, then
 * hands the rest to the platform's own numeric collation. It does not
 * attempt to parse titles, and it never reorders anything it did not
 * positively recognise: a title with no volume number sorts exactly as
 * it did before.
 *
 * LOADED IN BOOT, deliberately. Page scripts run BEFORE site.min.js in
 * this theme, so a comparator published from the site bundle would be
 * undefined at the moment faith-room.js sorts. Every caller still
 * guards with `window.MOTitleOrder ? ... : ...` so a boot that failed to
 * load degrades to the old ordering rather than to a blank shelf.
 */
(function () {
  "use strict";

  /*
   * Only after one of these words. A bare roman numeral in a title is
   * far more often a name or an initial than a number, and a wrong
   * reordering is worse than none: "Liber Isaiah" must not read as
   * book 1, which is why the numeral needs a word boundary on both
   * sides rather than merely a leading match.
   */
  const VOLUME_WORD =
    /\b(vol|vols|volume|volumes|tome|tomus|tom|pars|part|parts|book|liber|lib)\.?\s+([ivxlcdm]+)\b/gi;

  const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };

  function romanToInt(s) {
    const x = String(s).toLowerCase();
    let total = 0;
    for (let i = 0; i < x.length; i += 1) {
      const cur = ROMAN[x[i]];
      const next = ROMAN[x[i + 1]];
      if (!cur) return 0;
      total += next && next > cur ? -cur : cur;
    }
    return total;
  }

  /*
   * Replace "Part III" with "Part 3" so the numeric collation below can
   * see it. Padding is not needed: `numeric: true` compares digit runs
   * by value, not by width.
   *
   * A numeral that does not convert (0) is left exactly as written. That
   * covers the letters that look Roman and are not, and it means an
   * unrecognised title keeps whatever order it already had.
   */
  function normalise(title) {
    return String(title || "").replace(VOLUME_WORD, (whole, word, numeral) => {
      const n = romanToInt(numeral);
      return n > 0 ? `${word} ${n}` : whole;
    });
  }

  /*
   * `numeric: true` is what fixes the Arabic case, and it is the whole
   * fix for it: "Vol. 2" before "Vol. 10" with no parsing at all.
   * `sensitivity: "base"` keeps accents and case from deciding an order
   * a reader cannot see the reason for, which matters in a catalogue
   * that spells the same name several ways.
   */
  const COLLATOR = typeof Intl !== "undefined" && Intl.Collator
    ? new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })
    : null;

  function compareTitles(a, b) {
    const x = normalise(a);
    const y = normalise(b);
    if (COLLATOR) return COLLATOR.compare(x, y);
    return x.localeCompare(y, undefined, { numeric: true });
  }

  window.MOTitleOrder = { compareTitles, normalise, romanToInt };
})();
