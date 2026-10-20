/*
 * Key works for each century row of the Topic Desk's About section (Ian, 2026-10-20: "Every century dropdown should also list its key works").
 *
 * buildKeyWorks({ locus, treat, works, authors })  ->  Map(century -> up to 5 rows { title, author, cen, y, w, p, src })
 *
 * A work qualifies only under a strict rule, never by size alone:
 *   1. its section heading or its title names the topic (the locus label, its search words, and its aliases);
 *   2. it is not on the deny list (picks the owner found wrong: a Leisnig ordinance for the Trinity, De officiis for the Lord's Supper,
 *      Stillingfleet's Trinity and Transubstantiation Compared, and so on);
 *   3. it is placed in the century of its own date, and not before its author was born;
 *   4. several volumes of one set count once.
 * The classic treatments (treatments.json) come first. The rest are the works the worker's topic trace holds with the most indexed passages
 * in that century (`weight`), above a minimum, with a relevant section or title. Each work stands in exactly one century.
 * It says that a work has passages on the topic. It never says what a work says or that an author holds a position.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MOTopicKeyWorks = api;
}(typeof window === "undefined" ? globalThis : window, () => {
  "use strict";
  const PER_CENTURY = 5;
  const MIN_WEIGHT = 10;

  /* The deny list: by title pattern, optionally only for some topics (or never for some). */
  const DENY = [
    { title: /transubstantiation compared/i },
    { w: "luther-wa-schriften-12", topics: ["de-trinitate"] },
    { w: "pld-359", topics: ["de-coena", "de-scriptura"] },
    { title: /tractates? on (the gospel of )?john/i, topics: ["de-scriptura"] },
    { title: /apology against rufinus/i, topics: ["de-scriptura"] },
    { title: /sentences/i, author: /duns scotus/i, topics: ["de-trinitate"] },
    { title: /miraculous/i, topics: ["de-justificatione"] },
    { title: /justification/i, author: /davenant/i, notTopics: ["de-justificatione"] },
  ];
  const denied = (id, w, title, author) => DENY.some((d) => {
    if (d.topics && !d.topics.includes(id)) return false;
    if (d.notTopics && d.notTopics.includes(id)) return false;
    if (d.w && d.w !== w) return false;
    if (d.title && !d.title.test(title)) return false;
    if (d.author && !d.author.test(author || "")) return false;
    return Boolean(d.w || d.title);
  });

  const stemOf = (t) => (t.includes(" ") ? t : t.slice(0, Math.max(5, t.length - 2)));
  function termsOf(locus) {
    const raw = [String(locus.label || "").replace(/^the\s+/i, ""), ...(locus.find || []), ...(locus.aliases || []).map((a) => a.replace(/-/g, " "))]
      .map((t) => String(t).toLowerCase().replace(/['’]s\b/g, "").trim()).filter((t) => t.length >= 4);
    return [...new Set(raw.flatMap((t) => (t.includes(" and ") ? t.split(" and ") : [t])).map((t) => t.trim()).filter((t) => t.length >= 4))];
  }
  const namer = (locus) => {
    const stems = termsOf(locus).map((t) => stemOf(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = stems.length ? new RegExp(`\\b(?:${stems.join("|")})`, "i") : null;
    return (text) => Boolean(re && re.test(String(text || "")));
  };

  const setKey = (author, title) => `${String(author || "").toLowerCase()}|${String(title || "").toLowerCase()
    .replace(/\([^)]*\)/g, " ").replace(/\b(?:vol(?:ume)?|tomus|tome|pars|part|liber|book|pt)\.?\s*[ivxlc\d]+\b/g, " ").replace(/[\d,.:;]+/g, " ").replace(/\s+/g, " ").trim()}`;
  const centuryOf = (cen, y) => Number(cen) || (Number(y) ? Math.ceil(Number(y) / 100) : 0);
  const possible = (c, birth) => !birth || (c * 100 >= birth && (c - 1) * 100 <= birth + 90);

  function buildKeyWorks({ locus, treat = [], works = [], authors = [] }) {
    const names = namer(locus);
    const birth = new Map(authors.filter((a) => a && a.a && Number(a.y)).map((a) => [a.a, Number(a.y)]));
    const cand = [];
    treat.forEach((e, i) => {
      if (!e || !e.w || !(names(e.heading) || names(e.title)) || denied(locus.id, e.w, e.title, e.author)) return;
      cand.push({ src: "treatment", rank: 0, order: i, title: e.title, author: e.author, cen: centuryOf(e.cen, e.y), y: Number(e.y) || 0, w: e.w, p: e.p || null });
    });
    works.forEach((e) => {
      if (!e || !e.w || Number(e.weight) < MIN_WEIGHT || denied(locus.id, e.w, e.t, e.a)) return;
      const sec = (e.secs || []).find((s) => names(s.t));
      if (!sec && !names(e.t)) return;
      cand.push({ src: "trace", rank: 1, order: -Number(e.weight), title: e.t, author: e.a, cen: centuryOf(e.cen, e.y), y: Number(e.y) || 0, w: e.w, p: sec ? sec.p : null });
    });
    cand.sort((a, b) => a.rank - b.rank || a.order - b.order);
    const out = new Map();
    const seenSet = new Set();
    const seenW = new Set();
    cand.forEach((c) => {
      if (c.cen < 1 || c.cen > 21 || !possible(c.cen, birth.get(c.author))) return;
      const k = setKey(c.author, c.title);
      if (seenSet.has(k) || seenW.has(c.w)) return;
      if (!out.has(c.cen)) out.set(c.cen, []);
      if (out.get(c.cen).length >= PER_CENTURY) return;
      seenSet.add(k); seenW.add(c.w);
      out.get(c.cen).push({ title: c.title, author: c.author, cen: c.cen, y: c.y, w: c.w, p: c.p, src: c.src });
    });
    return out;
  }

  return { buildKeyWorks, termsOf, namer, denied, DENY, PER_CENTURY, MIN_WEIGHT };
}));
