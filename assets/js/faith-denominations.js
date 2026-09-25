/*
 * The Faith Received — denomination and party
 *
 * The library had no denomination field. It had one free-text
 * `tradition` string per work, filled by six different sources to six
 * different standards, and the facet labelled "Denomination" was that
 * string. So the control offered "English Divines" — a nationality —
 * as the denomination of four thousand works, "Lutheran" beside it,
 * and two singletons out of our own editions. Everything Early English
 * Books holds, 15,569 works, offered nothing at all: that catalogue
 * has no such field, and the 2,908 works the source placed were placed
 * by two curated lists of 287 author names.
 *
 * Two axes, not one.
 *
 *   BODY    the church a man belonged to: Anglican, Presbyterian,
 *           Congregational, Baptist, Continental Reformed, Lutheran,
 *           Quaker, Anabaptist, Arminian, Bohemian Brethren,
 *           Waldensian, Socinian. Single-valued.
 *
 *   PARTY   where he stood inside it: Puritan or Conformist. Cuts
 *           across the bodies and belongs to none of them.
 *
 * The split is not tidiness. Puritan is not a denomination — it is a
 * party inside the Church of England and then a family of dissenters
 * out of it — and one list containing both makes John Owen choose
 * between Congregational and Puritan when he was plainly both, sorts
 * William Prynne away from the Presbyterians he wrote for, and files
 * Benjamin Keach somewhere other than with the Baptists. On two axes
 * each man is filed once and found twice.
 *
 * A Puritan who never left the establishment keeps Anglican as his
 * body. William Perkins was a beneficed clergyman of the Church of
 * England and is filed as one; his party says the rest. Only a man who
 * actually left — to a gathered church, a presbytery, a meeting —
 * takes a different body.
 *
 * "Anglican" is anachronistic for the sixteenth century, where "Church
 * of England" is the honest phrase. It is used anyway because the rest
 * of the library already says Anglican — the confessions patterns, the
 * source's own author list, the shelf page — and one library should
 * not carry two names for one church.
 *
 * Where the answer is not known the work is left unplaced rather than
 * guessed. An unplaced work is a gap anybody can see and fix; a
 * guessed one is a false claim about a real man, and this library is
 * read by people who will know.
 *
 * Data: /assets/data/faith-received/denominations.json, built by
 * scripts/build-denominations.mjs. Every entry carries a confidence,
 * and the builder records where it came from.
 */
(function () {
  "use strict";

  // The table is data, not code: it is rebuilt and redeployed without a
  // theme version bump, and the versioned URL is cached for a year, so a
  // corrected table took the old label to readers for hours (the Westminster
  // Assembly stayed "Anglican" long after the fix reached the server,
  // 2026-09-24). An `&h=` hour key did not help: the CDN keys on `v` alone.
  // moDataUrl puts the hour inside `v`. The author labels fetch this same
  // URL, so the two never disagree.
  const PATH = "/assets/data/faith-received/denominations.json";
  const URL_ = window.moDataUrl ? window.moDataUrl(PATH)
    : window.moAssetUrl ? window.moAssetUrl(PATH) : PATH;

  // Display order for the facet. Not by how much sits in each: a
  // reader scanning for his own church finds it faster in an order
  // that holds still between one filter and the next, and counting
  // ranks Anglican above Baptist on a shelf of English printing in a
  // way that reads as a judgement rather than an arithmetic.
  //
  // Grouped as the sixteenth century grouped itself: the English
  // establishment, then what separated from it in the order it
  // separated, then the continent, then the bodies older than the
  // Reformation or outside it.
  const ORDER = [
    "Anglican",
    "Reformed",
    "Presbyterian",
    "Congregational",
    "Baptist",
    "Quaker",
    "Continental Reformed",
    "Lutheran",
    "Anabaptist",
    "Arminian",
    "Bohemian Brethren",
    "Waldensian",
    "Socinian",
  ];

  const PARTIES = ["Puritan", "Conformist"];

  // The communion a body sits in. Early English Books carries no
  // tradition field at all, so once a work is placed as Quaker or
  // Baptist it still has nothing saying it is Protestant — and the
  // facet counts denominations only under a chosen communion, so a
  // placed work with no communion above it is invisible. On the first
  // run that lost the Quakers and most of the Baptists from a list
  // they were now in.
  const COMMUNION = {
    Anglican: "Protestant",
    Reformed: "Protestant",
    Presbyterian: "Protestant",
    Congregational: "Protestant",
    Baptist: "Protestant",
    Quaker: "Protestant",
    "Continental Reformed": "Protestant",
    Lutheran: "Protestant",
    Anabaptist: "Protestant",
    Arminian: "Protestant",
    "Bohemian Brethren": "Protestant",
    Waldensian: "Protestant",
    Socinian: "Protestant",
    "Roman Catholic": "Roman Catholic",
    "Eastern Orthodox": "Eastern Orthodox",
  };

  let data = null;
  let pending = null;

  // ── Author keys ──────────────────────────────────────────────────
  //
  // The same man is named three ways in three catalogues. Early
  // English Books catalogues him as the British Library does, surname
  // first with his life dates and every hedge the cataloguer needed:
  //
  //   "Owen, John, 1616-1683"
  //   "Goodwin, John, 1594?-1665"
  //   "Adams, Thomas, fl. 1612-1653"
  //   "Hill, Thomas, b. ca. 1528"
  //   "R. F. (Richard Farnworth), d. 1666"
  //
  // The Latin Library names him "John Owen". Our own editions name him
  // "John Owen". So the key is the name with the apparatus stripped
  // and the halves put back in reading order, which brings all three
  // to "john owen".
  //
  // Stripping the dates is what makes the three catalogues agree, and
  // it is also what makes two men one. The library holds a William
  // Allen who was a Particular Baptist and a William Allen who was the
  // cardinal who ran the English mission from Douai; a Thomas Watson
  // who was a Presbyterian of the ejection and a Thomas Watson who was
  // Mary's Bishop of Lincoln; four Thomas Taylors, one of them a
  // Quaker. Merging any of those pairs would file a man's books under
  // the church he spent his life arguing against.
  //
  // So there are two keys. The dated key keeps whatever years the
  // cataloguer gave — "thomas watson 1513 1584" — and is tried first.
  // The bare key is the fallback that crosses catalogues, and the
  // builder emits it only for names that are unambiguous across the
  // whole library. An ambiguous name with no dates on it stays
  // unplaced, which is the right answer: nobody knows which man it is.
  function authorKey(name) {
    // EEBO writes its names as catalogue entries, ending in a full stop:
    // "Keach, Benjamin, 1640-1704." The date strip below is anchored at
    // the end, so the stop hid the dates and the name matched nothing
    // (Keach, Bunyan, Perkins, Owen all fell back to no church).
    // Punctuation goes at the last step anyway, so this changes only
    // names that missed. Same line in scripts/build-denominations.mjs.
    let s = String(name == null ? "" : name).trim().replace(/\.+$/, "").trim();
    if (!s) return "";
    // Everything a cataloguer adds after the name: life dates, floruit,
    // "d.", "b. ca.", the query marks on an uncertain year.
    // Life dates as the cataloguers actually write them, which is not
    // one form but a dozen: "1600-1669", "d. 1666", "fl. 1612-1653",
    // "b. ca. 1528", "ca. 1634-ca. 1707", "1636?-1723", and the ones
    // that spell a shortened second year — "1579 or 80-1652",
    // "1625 or 6-1672". Missing those last two left the years inside
    // the key, so John Vicars never matched John Vicars.
    s = s.replace(/,\s*(?:(?:b|d|fl|ca|c)\.\s*)*\d{3,4}\??(?:\s*or\s*\d{1,4})?\s*(?:-\s*(?:(?:b|d|fl|ca|c)\.\s*)*\d{0,4}\??(?:\s*or\s*\d{1,4})?)?\s*$/i, "");
    // A parenthetical expansion — "R. F. (Richard Farnworth)" — is the
    // real name, so it wins over the initials in front of it.
    // Only where what stands before it is initials. "R. F. (Richard
    // Farnworth)" is a name hiding behind its initials and the
    // parenthesis is the name; "Ferne, H. (Henry)" is a surname with
    // its forename expanded, and taking the parenthesis there would
    // key the man as "henry" and lose Ferne entirely.
    const paren = /^([^(]*)\(([^)]+)\)/.exec(s);
    if (paren && !/[a-z]{2}/.test(paren[1]) && /[a-z]{3}/i.test(paren[2]) && !/^\d/.test(paren[2].trim())) s = paren[2];
    s = s.replace(/\([^)]*\)/g, " ");
    // Titles the catalogue appends: "Saint", "Bishop of Hippo", "Sir".
    // A bare ", of ..." is deliberately NOT stripped: "Morton, Thomas,
    // of Berwick" and "Rogers, John, of Chacombe" carry the place
    // precisely because a second man of the name exists, and cutting it
    // merges the two the whole two-key scheme is meant to keep apart.
    s = s.replace(/,\s*(?:saint|st\.?|bishop|archbishop|sir|dame|lord|lady|king|queen)\b[^,]*/gi, " ");
    // Surname-first to reading order, on the FIRST comma only: a name
    // with two commas has already lost its apparatus above.
    const c = s.indexOf(",");
    if (c > 0) s = `${s.slice(c + 1)} ${s.slice(0, c)}`;
    return s
      .normalize("NFD").replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  // The same name with its years kept, so two men who share one are
  // two rows. Every three- or four-digit number in the original
  // string, in the order it appears: "Taylor, Thomas, 1618-1682"
  // becomes "thomas taylor 1618 1682", and "Cooper, Thomas, fl. 1626"
  // becomes "thomas cooper 1626". A name with no years has no dated
  // key and falls to the bare one.
  function datedKey(name) {
    const base = authorKey(name);
    if (!base) return "";
    const years = String(name == null ? "" : name).match(/\d{3,4}/g);
    return years && years.length ? `${base} ${years.join(" ")}` : "";
  }

  // A corporate author is not a man and has no biography to look up,
  // but it names its own church outright: "Church of England. Diocese
  // of Ely. Bishop (1559-1581 : Cox)" is Anglican whatever else it is.
  // Patterns, not keys, because the tail of these is unbounded.
  function byPattern(name) {
    const pats = (data && data.patterns) || [];
    for (let i = 0; i < pats.length; i += 1) {
      const p = pats[i];
      try {
        if (new RegExp(p[0], "i").test(name)) return { body: p[1] || "", party: p[2] || "", confidence: "h" };
      } catch (_) { /* a bad pattern must not take the facet down */ }
    }
    return null;
  }

  // What the source already asserted, kept as the floor. Where a
  // catalogue says Lutheran it is taken at its word; where it says
  // "English Divines" it is saying a nationality and is dropped.
  const FROM_TRADITION = {
    lutheran: "Lutheran",
    reformed: "Continental Reformed",
    anglican: "Anglican",
    presbyterian: "Presbyterian",
    congregational: "Congregational",
    baptist: "Baptist",
    "reformed baptist": "Baptist",
    anabaptist: "Anabaptist",
    arminian: "Arminian",
    quaker: "Quaker",
    waldensian: "Waldensian",
    "bohemian brethren": "Bohemian Brethren",
  };

  function fromTradition(work) {
    const t = String((work && work.tradition) || "").trim().toLowerCase();
    if (!t) return null;
    const body = FROM_TRADITION[t];
    if (!body) return null;
    // The Latin Library's Reformed shelf is continental — Turretin,
    // Voetius, Zanchi, Junius, Mastricht — and its English Calvinists
    // are filed under "English Divines" instead, so the plain
    // "Reformed" label means the continent here. The confessions
    // catalogue uses it the same way once its own patterns have lifted
    // out the Anglican, Presbyterian and Baptist documents.
    return { body, party: "", confidence: "m" };
  }

  const EMPTY = { body: "", party: "", confidence: "" };

  // Resolved once per work and cached on it, because the facets recount
  // the whole library on every keystroke and this is the inner loop.
  function of(work) {
    if (!work) return EMPTY;
    if (work._den) return work._den;
    let out = EMPTY;
    if (data) {
      // A per-work assertion beats everything: it is the only level
      // that can speak about an anonymous tract or tell two men of one
      // name apart.
      const wk = `${work.corpus}:${work.id}`;
      const w = data.works && data.works[wk];
      if (w) out = { body: w[0] || "", party: w[1] || "", confidence: w[2] || "h" };
      if (!out.body && !out.party) {
        // Dated first, so a man with years on his name is never read
        // off his namesake's row. Then the corpus-scoped bare name:
        // the Latin Library catalogues everybody without dates, so its
        // "John Owen" cannot reach the global row while two John Owens
        // are in the library — but somebody has looked and said that
        // inside THAT catalogue he is the Congregationalist. Then the
        // global bare name, which the builder emits only for names
        // that belong to one man anywhere.
        const map = data.authors || {};
        const bare = authorKey(work.author);
        const a = map[datedKey(work.author)]
          || (data.scoped && data.scoped[`${work.corpus}|${bare}`])
          || map[bare];
        if (a) out = { body: a[0] || "", party: a[1] || "", confidence: a[2] || "m" };
      }
      if (!out.body && !out.party && work.author) {
        const p = byPattern(String(work.author));
        if (p) out = p;
      }
    }
    if (!out.body && !out.party) out = fromTradition(work) || EMPTY;
    work._den = out;
    return out;
  }

  window.MODenom = {
    // Resolves to itself once the table is in hand, so a caller can
    // await it before painting a facet. Failure resolves rather than
    // rejects: a missing table must leave the library browsable on
    // whatever its catalogues already said, not empty the page.
    ready () {
      if (pending) return pending;
      pending = fetch(URL_, { credentials: "same-origin" })
        .then((r) => { return r.ok ? r.json() : null; })
        .then((d) => { data = d && d.authors ? d : null; return window.MODenom; })
        .catch(() => { data = null; return window.MODenom; });
      return pending;
    },
    loaded () { return !!data; },
    url: URL_,
    of,
    body (work) { return of(work).body; },
    party (work) { return of(work).party; },
    authorKey,
    datedKey,
    // The communion a body belongs to, or "" for a body nobody has
    // placed. Callers use it to give a work a tradition where its
    // catalogue carries none.
    communion (body) { return COMMUNION[body] || ""; },
    bodies: ORDER.slice(),
    parties: PARTIES.slice(),
    // Facet order. Anything the table gains that this list does not
    // name sorts after the named ones rather than vanishing, so a new
    // body added to the data shows up without a code change.
    rank (body) {
      const i = ORDER.indexOf(body);
      return i < 0 ? ORDER.length : i;
    },
  };
})();
