/*
 * /bible/ is now the Scripture tool at /the-faith-received/bible/.
 *
 * Ian, 2026-09-20: "We need to ditch our old Bible reader and use this."
 * Everything the old reader had that the new one lacked has since been
 * carried over: all five translations, and Ask, Search and Copy on each
 * verse. There is nothing left here that is not there.
 *
 * SO THIS PAGE FORWARDS, AND CARRIES THE PASSAGE WITH IT. A bare
 * redirect would drop every reader who bookmarked a chapter back at
 * Genesis 1, and /bible/ has been the site's Scripture reader for long
 * enough that those bookmarks exist.
 *
 * Two address shapes reach here:
 *   #JHN.3                      the reader's own hash
 *   ?book=John&chapter=3#v12    what the Scripture Index links
 *
 * Both become #b/<slug>/<chapter>, which is what the tool reads.
 *
 * THE SLUGS ARE NOT THE BOOK NAMES LOWERCASED. The corpus numbers its
 * books in Roman: 1 Samuel is i-samuel, 2 John is ii-john, and
 * Revelation is revelation-of-john. Thirteen of the sixty-six would
 * have 404'd on a slugify. This table was generated against the live
 * v1/bible/all/books.json and checked book by book.
 *
 * IN THE HEAD, so the forward happens before the old reader paints. The
 * same lesson as the work reader two days ago: a redirect that fires
 * after render is a whole screen of the wrong page.
 */
(function () {
  "use strict";

  const TOOL = "/the-faith-received/bible/";
  const SLUG = {
    GEN: "genesis", EXO: "exodus", LEV: "leviticus", NUM: "numbers",
    DEU: "deuteronomy", JOS: "joshua", JDG: "judges", RUT: "ruth",
    "1SA": "i-samuel", "2SA": "ii-samuel", "1KI": "i-kings", "2KI": "ii-kings",
    "1CH": "i-chronicles", "2CH": "ii-chronicles", EZR: "ezra", NEH: "nehemiah",
    EST: "esther", JOB: "job", PSA: "psalms", PRO: "proverbs",
    ECC: "ecclesiastes", SNG: "song-of-solomon", ISA: "isaiah", JER: "jeremiah",
    LAM: "lamentations", EZK: "ezekiel", DAN: "daniel", HOS: "hosea",
    JOL: "joel", AMO: "amos", OBA: "obadiah", JON: "jonah",
    MIC: "micah", NAM: "nahum", HAB: "habakkuk", ZEP: "zephaniah",
    HAG: "haggai", ZEC: "zechariah", MAL: "malachi",
    MAT: "matthew", MRK: "mark", LUK: "luke", JHN: "john",
    ACT: "acts", ROM: "romans", "1CO": "i-corinthians", "2CO": "ii-corinthians",
    GAL: "galatians", EPH: "ephesians", PHP: "philippians", COL: "colossians",
    "1TH": "i-thessalonians", "2TH": "ii-thessalonians", "1TI": "i-timothy",
    "2TI": "ii-timothy", TIT: "titus", PHM: "philemon", HEB: "hebrews",
    JAS: "james", "1PE": "i-peter", "2PE": "ii-peter", "1JN": "i-john",
    "2JN": "ii-john", "3JN": "iii-john", JUD: "jude", REV: "revelation-of-john",
  };
  // The Scripture Index links by name, so the same table is needed the
  // other way round. Built from SLUG so the two cannot disagree.
  const BY_NAME = {};
  Object.keys(SLUG).forEach((id) => {
    BY_NAME[SLUG[id].replace(/-/g, " ")] = SLUG[id];
  });
  const NUMBERED = { 1: "i", 2: "ii", 3: "iii" };

  function fromName(name) {
    const n = String(name || "").trim().toLowerCase()
      .replace(/^([123])\s+/, (m, d) => `${NUMBERED[d]} `)
      .replace(/^(?:the\s+)?revelation(?:\s+of\s+(?:st\.?\s*)?john)?$/, "revelation of john")
      .replace(/^song of songs$|^canticles$/, "song of solomon")
      .replace(/^psalm$/, "psalms");
    return BY_NAME[n] || null;
  }

  function target() {
    const hash = String(window.location.hash || "").replace(/^#/, "");
    const own = hash.match(/^([A-Za-z0-9]+)\.(\d+)$/);
    if (own) {
      const slug = SLUG[own[1].toUpperCase()];
      if (slug) return `${TOOL}#b/${slug}/${own[2]}`;
    }
    let params;
    try { params = new URLSearchParams(window.location.search); }
    catch (_) { return TOOL; }
    const slug = fromName(params.get("book"));
    const ch = parseInt(params.get("chapter"), 10);
    if (slug && ch >= 1) {
      // #v12 on the old address named a verse; the tool takes it as a
      // query on the passage.
      const verse = (hash.match(/^v(\d+)$/) || [])[1];
      return `${TOOL}#b/${slug}/${ch}${verse ? `?v=${verse}` : ""}`;
    }
    return TOOL;
  }

  /* replace, not assign: the old reader must not sit in the back stack,
     or Back from the tool bounces through here and straight forward.

     NOT MOSafeRedirect. That helper exists to validate a destination a
     WORKER chose, and its allowlist is the two Stripe hosts; handed a
     same-origin path it throws by design. The lint rule names it as the
     remedy because every other redirect in the theme is a checkout one.

     What is being navigated to here is a same-origin path built from a
     fixed prefix, a lookup in the table above and an integer: no part
     of it is attacker-controlled, and there is no scheme to validate
     because there is no scheme. Exempted explicitly rather than written
     as bare `location.replace`, which slips past the same rule on a
     technicality and would leave the next reader thinking it had been
     checked. */
  // eslint-disable-next-line no-restricted-syntax -- same-origin path from a fixed table; MOSafeRedirect is Stripe-only and would throw
  window.location.replace(target());
})();
