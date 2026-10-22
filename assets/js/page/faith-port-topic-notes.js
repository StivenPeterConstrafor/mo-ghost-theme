/* Topic pages: the disputed questions of the topic, the questions the tradition shares on it, the controversies that touch it,
 * how the doctrine developed, the traditions compared on the subject, a course of reading, and the concept guides that belong to it.
 *
 * v1/enrich/topics/<slug>.json on the library worker (slugs are the topic
 * page's own, from v1/mine/topic2-all) carries:
 *   guide       the doctrine's history across the library, period by period,
 *               with the authors' pages behind each step, and a course of 10-12
 *               readings in order, each a thesis's page with why to read it;
 *   traditions  pairings of the library's shelves (Roman Catholic and Reformed,
 *               Reformed and Lutheran, Latin and Greek Fathers ...) on this
 *               subject: a summary, where they agree, where they part, and the
 *               authors' pages behind each;
 *   concepts    the concept guides tied to this subject (id, label, gloss); a
 *               guide opens in place from v1/enrich/concepts/<id>.json: what
 *               the concept is, its scope, how the traditions differed, each
 *               tradition's position with evidence pages, and what to read.
 * Folds under the topic's heading. Machine-written from the authors' own
 * claims, paraphrase never quotation, every page checked; the block says so.
 *
 * DISPUTED QUESTIONS, SHARED QUESTIONS, CONTROVERSIES (2026-10-21, owner: "disputed questions and topics feel like they should be
 * combined ... consolidate, simplify but maintain all our mined insights and organization"). Three folds come first, closed:
 *   Disputed questions   the atlas questions of the topic (v1/atlas/index.json): each with its answer tally (the index carries the
 *                        same counts as v1/atlas/q/<id>.json, so no question file is fetched), "answers" to the disputed questions
 *                        page (#<id>) and "map" to the maps page (#<id>) when v1/maps/index.json has a map of it;
 *   Questions the tradition shares   the topic's part of v1/questions/index.json (questions three or more works ask), most-asked
 *                        first, the first eight and "Show all" in a bounded pane; Mere Orthodoxy has no shared questions page yet,
 *                        so the rows name the question and how many works ask it, without a link;
 *   Controversies        the controversies of v1/enrich/controversies/<pair>.json whose nearest classic question (`atlas`) is one
 *                        of the topic's, or whose keywords name the topic, each opening the controversies page (#<id>); the files
 *                        load when the fold first opens.
 * The atlas has loci, the topic pages have their own slugs: LOCI and NARROW below join them.
 */
(function () {
  "use strict";

  const BASE = window.__FR_BLOB_BASE__ || "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  const READ = "/the-faith-received/read/?w=";
  const ATLAS = "/the-faith-received/disputed-questions/#";
  const MAPS = "/the-faith-received/maps/#";
  const CONTROVERSIES = "/the-faith-received/controversies/#";
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const method = (html) => (window.TFRMethod ? window.TFRMethod.html(html) : html);
  const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const pageLink = (w, p, label) => `<a href="${READ}${encodeURIComponent(w)}#b${encodeURIComponent(p)}-0" target="_blank" rel="noopener">${esc(label)}</a>`;
  const slugNow = () => decodeURIComponent(String(location.hash || "").slice(1).split("?")[0].split("/")[0] || "");

  // A page reference names whose words the page carries; a compiled page says by whom ("Augustine, via Eugippius, p. 12").
  const who = (r) => `${r.a || r.author || r.side || "page"}${r.via ? `, via ${r.via}` : ""}`;
  const refs = (rs) => (rs || []).slice(0, 6).map((r) => pageLink(r.w, r.p, `${who(r)}, p. ${r.p}`)).join(" · ");
  const pagesLine = (rs) => (rs && rs.length ? `<p class="cn-pages">${refs(rs)}</p>` : "");

  // The theme's own fold: summary title and count, then a card body.
  const fold = (title, count, body, open, cls) => `<details class="rx-fold tn-fold${cls ? ` ${cls}` : ""}"${open ? " open" : ""}>
      <summary><span><strong>${esc(title)}</strong><small>${esc(count)}</small></span></summary>
      <div class="rx-fold-body">${body}</div></details>`;

  /* THE LOCI OF THE ATLAS ON THE TOPIC PAGES. Every locus of v1/atlas/index.json belongs to one or more topic pages (their slugs in
   * v1/mine/topic2-all): its disputed questions and its topic of the shared questions show there. The first page named is the
   * locus's home; questions.html links each topic of the shared questions to it (its HOME table must agree with this one). The
   * four loci of metaphysics (q294-q330, Suárez's disputations) go where their questions belong: being and the transcendentals with
   * prolegomena and method, beside philosophy in theology; matter, form and the categories to Form and Matter; causes, potency and
   * act to Causality; God in metaphysics to God. */
  const LOCI = {
    "Scripture": ["scripture", "the-word-of-god"],
    "God": ["god"],
    "Predestination": ["predestination", "election", "election-predestination"],
    "Trinity": ["the-trinity"],
    "Christ": ["christ-christology"],
    "Man and sin": ["sin", "man-anthropology"],
    "Grace": ["grace"],
    "Justification": ["justification"],
    "Church": ["the-church"],
    "Sacraments": ["sacraments"],
    "Worship and the saints": ["religion-true-worship"],
    "Last things": ["last-things"],
    "Law and ethics": ["virtues-moral-theology"],
    "Philosophy in theology": ["prolegomena-theological-method"],
    "Creation and providence": ["providence", "creation"],
    "Angels and demons": ["angels"],
    "Covenant": ["covenant"],
    "Revelation and reason": ["revelation", "reason"],
    "Repentance and conversion": ["repentance", "conversion", "conversion-repentance"],
    "Sanctification and good works": ["sanctification", "good-works", "good-works-sanctification"],
    "Prayer": ["prayer"],
    "Ministry and church order": ["ministry", "ministry-holy-orders", "ministry-orders"],
    "Christ's work": ["redemption", "christ-christology", "atonement"],
    "Mary and the saints": ["the-virgin-mary"],
    "Soul and death": ["death", "last-things"],
    "Papal power and the civil order": ["the-civil-magistrate"],
    "Law and Gospel": ["law-and-gospel", "the-gospel"],
    "Councils and Fathers": ["tradition"],
    "Christian life": ["christian-liberty"],
    "Being and the transcendentals": ["prolegomena-theological-method"],
    "Matter, form and the categories": ["form-and-matter"],
    "Causes, potency and act": ["causality"],
    "God in metaphysics": ["god"],
  };
  /* Narrower topics take single disputed questions from any locus (q + atlas id) and parts of the shared questions ("topic" or
   * "topic/part" of v1/questions/index.json). A topic named in LOCI keeps its loci and adds these. */
  const NARROW = {
    "the-existence-of-god": "q010 q011 q327 q329",
    "divine-simplicity": "q012 q013 q301",
    "the-divine-attributes-their-distinction": "q012 q013 q020 q258 q261 q262 q301",
    "god-s-knowledge-middle-knowledge": "q014 q260 q325 q326",
    "omnipotence-absolute-power": "q019 q141 q262",
    "the-will-of-god": "q017 q024 q263 q326",
    "god-s-will": "q017 q024 q263",
    "the-eternity-of-god": "q258 q330",
    "divine-omnipresence-immensity": "q330",
    "justice-of-god": "q017",
    "divine-justice": "q017",
    "providence": "q015 q016 q260",
    "creation": "q018 q145 q316",
    "the-beatific-vision": "q043 q111 q259",
    "beatitude": "q111 q259",
    "beatitude-eternal-life": "q111 q259",
    "eternal-life": "q064 q111 q158 q259",
    "the-filioque-the-procession-of-the-spirit": "q026",
    "subsistent-relations-the-divine-persons": "q027 q266 q307",
    "the-divine-processions-eternal-generation": "q026 q028 q031 q266",
    "the-holy-spirit": "q026 q030 q059 q171 q230",
    "the-word": "q028 q029 q031",
    "incarnation": "q020 q032 q035 q292 q293",
    "the-cross": "q039 q195 q197 q198",
    "atonement": "q039 q040",
    "redemption": "q039 q040 q041",
    "salvation-redemption": "q039 q040 q195 q198",
    "sacrifice": "q039 q093",
    "merit": "q038 q055 q064 q179 grace/merit",
    "good-works-merit": "q064 q179 grace/merit",
    "original-sin": "q042 q044 q045 q048 q289",
    "free-will": "q047 q053 q054 q055 q056 q231 q319 q320 grace/free-will",
    "the-will": "q132 q319 q320",
    "the-image-of-god": "q051",
    "the-soul": "q046 q129 q133 q210 q211 q317 q318",
    "the-soul-intellect-and-will": "q132 q317 q318 q319",
    "the-intellect": "q132 q317 q321 q322",
    "knowledge": "q163 q321 q322",
    "conscience": "q125 law/obligation-and-conscience",
    "virtues-moral-theology": "q175 q290",
    "charity": "q059 q063",
    "charity-love": "q059 q063",
    "idolatry": "q095 q103 q104 q105 q207",
    "satan": "q148 q149 q151",
    "perseverance": "q057",
    "perseverance-of-the-saints": "q057",
    "assurance": "q058",
    "assurance-of-salvation": "q058",
    "effectual-calling": "q053 q054 q171 q232",
    "calling": "q053 q054 q232",
    "salvation-of-the-unevangelized": "q060 q159 q287 q288",
    "salvation": "q024 q060 q065 q159 q279 q288",
    "regeneration": "q089 q171 q172",
    "faith": "q062 q063 q069 q156 q160 q161 q167 q172 q229",
    "imputation": "q041 q045 q061 q196 q286",
    "good-works": "q064 q065",
    "good-works-necessity": "q064 q065",
    "justification": "grace/justification",
    "predestination": "grace/predestination-and-election",
    "election": "grace/predestination-and-election",
    "election-predestination": "grace/predestination-and-election",
    "reprobation": "q022 q023",
    "forgiveness": "q097 q168 q169",
    "antichrist": "q078",
    "schism": "q082 q239 q278",
    "heresy": "q081 q090 q278",
    "excommunication": "q190",
    "discipline": "q190 q191",
    "persecution": "q081 q245",
    "the-civil-magistrate": "q080 q081 q117 q118 q123 q125",
    "ministry": "q079 q083",
    "ordination": "q083 q101 q188 q192 sacraments/orders",
    "holy-orders": "q079 q083 q100 q101 sacraments/orders",
    "ministry-holy-orders": "q079 q083 q100 q101 sacraments/orders",
    "ministry-orders": "q079 q083 q100 q101 sacraments/orders",
    "preaching": "q193 q227 q281",
    "tradition": "q004 q234",
    "baptism": "q048 q087 q088 q089 q090 q115 q157 q269 q275 sacraments/baptism",
    "the-lord-s-supper": "q034 q091 q092 q093 q094 q095 q102 q268 q272 q273 q274 q276 q305 sacraments/the-eucharist",
    "the-eucharist": "q034 q091 q092 q093 q094 q095 q102 q268 q272 q273 q274 q276 q305 sacraments/the-eucharist",
    "the-lord-s-sacrament": "q091 q092 q093 q094 q095 q102 q268 q272 q273 q274 q276 sacraments/the-eucharist",
    "the-mass": "q091 q093 q094 q095 q272 q276 sacraments/the-eucharist",
    "penance": "q096 q097 q098 q166 q168 sacraments/penance",
    "repentance-penance": "q096 q097 q166 q168 sacraments/penance",
    "confession": "q096 sacraments/penance",
    "absolution": "q096",
    "contrition": "q166",
    "indulgences": "q097 q098",
    "purgatory": "q097 q106 q107 q212",
    "marriage": "q099 q100 sacraments/marriage",
    "matrimony": "q099 q100 sacraments/marriage",
    "marriage-and-divorce": "q099 sacraments/marriage",
    "divorce": "q099 sacraments/marriage",
    "marriage-celibacy": "q099 q100 sacraments/marriage",
    "marriage-and-family": "q099 sacraments/marriage",
    "confirmation": "q270 sacraments/confirmation-and-unction",
    "anointing-of-the-sick": "q270 sacraments/confirmation-and-unction",
    "circumcision": "q271",
    "sabbath": "q109 q242",
    "vows": "q108 q175 q246",
    "oaths-and-vows": "q108 q121",
    "monasticism": "q108 q175 q246",
    "oaths": "q120 q121",
    "oaths-and-perjury": "q120 q121",
    "fasting": "q240 q241",
    "resurrection": "q113 q210",
    "hell": "q114 q197 q214 q215",
    "judgment": "q215 q216 q218",
    "salvation-of-infants": "q115 q157 q229",
    "usury": "q116 q248",
    "contracts": "q116 q248",
    "wealth-and-poverty": "q116 q246",
    "natural-law": "q122 law/natural-law",
    "justice": "q119 q248",
    "truth": "q120 q297 q298",
    "the-law": "q052 q122 q123 q174 q177 q178 q226 q227 q228 law",
    "prophecy": "q164 q165",
    "prophets": "q164",
    "miracles": "q140 q164",
    "reason": "q010 q133 q134 q264",
    "salvation-history": "q153 q154 q158",
    "perfection": "q170 q175",
    "christian-liberty": "q110 q178",
    "the-lord-s-prayer": "q184",
    "the-virgin-mary": "q042 q292",
    "time": "q018 q258 q312",
    "motion": "q142 q309 q329",
    "good": "q297 q299",
    "goodness": "q297 q299",
    "the-world": "q018 q135 q141 q216",
  };
  // The shared questions name their topics after the atlas loci ("Christ's work" is christ-s-work), save "Law and ethics" (ethics).
  const sharedTopic = (locus) => (locus === "Law and ethics" ? "ethics" : locus.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
  function placeOf(slug) {
    const loci = Object.keys(LOCI).filter((l) => LOCI[l].includes(slug));
    const extra = String(NARROW[slug] || "").split(/\s+/).filter(Boolean);
    return {
      loci,
      ids: extra.filter((t) => /^q\d+$/.test(t)),
      parts: [...new Set([...loci.map(sharedTopic), ...extra.filter((t) => !/^q\d+$/.test(t))])],
    };
  }

  // Each index is fetched once a visit; a failed fetch is forgotten so the next topic tries again.
  const cache = new Map();
  const once = (path) => {
    if (!cache.has(path)) cache.set(path, getJSON(`${BASE}${path}`).then((d) => { if (!d) cache.delete(path); return d; }));
    return cache.get(path);
  };
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const nOf = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;

  /* A yes-or-no question shows how many authors affirm, deny and distinguish; an open question ("What faith is: knowledge, assent or
   * trust") has the schools' positions in place of affirm and deny, so it shows how many positions and how many authors take one. */
  const PLAIN = ["affirms", "denies", "distinguishes", "reports only", "unclear"];
  function tallyHTML(t) {
    const keys = Object.keys(t || {});
    const options = keys.filter((k) => !PLAIN.includes(k) && t[k] > 0);
    if (options.length) return `<b>${fmt(options.length)}</b> positions · <b>${fmt(options.reduce((n, k) => n + t[k], 0))}</b> authors take one`;
    const said = [["affirms", "affirm"], ["denies", "deny"], ["distinguishes", "distinguish"]].filter(([k]) => t[k] > 0);
    return said.map(([k, label]) => `<b>${fmt(t[k])}</b> ${label}`).join(" · ") || "No author states an answer yet";
  }

  function disputedRow(q, mapped) {
    return `<li><span class="tn-q-q">${esc(q.q)}</span><span class="cn-pages">${tallyHTML(q.tally)} · <a href="${ATLAS}${esc(q.id)}" aria-label="Every answer: ${esc(q.q)}">answers</a>${mapped ? ` · <a href="${MAPS}${esc(q.id)}" aria-label="The map of the tradition: ${esc(q.q)}">map</a>` : ""}</span></li>`;
  }

  // The topic's own loci first, then the loci its single questions come from, largest first; atlas order within each.
  function disputedOf(ax, where) {
    const ids = new Set(where.ids);
    const qs = ((ax && ax.questions) || []).filter((q) => where.loci.includes(q.locus) || ids.has(q.id));
    const groups = new Map();
    for (const q of qs) {
      if (!groups.has(q.locus)) groups.set(q.locus, []);
      groups.get(q.locus).push(q);
    }
    const own = (l) => where.loci.indexOf(l);
    return [...groups.entries()].sort((a, b) => {
      const oa = own(a[0]);
      const ob = own(b[0]);
      if (oa >= 0 || ob >= 0) return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob);
      return b[1].length - a[1].length;
    });
  }

  function disputedHTML(groups, mapped) {
    const qs = groups.flatMap(([, list]) => list);
    if (!qs.length) return "";
    const list = (rows) => `<ul class="rn-list tn-qs">${rows.map((q) => disputedRow(q, mapped.has(q.id))).join("")}</ul>`;
    const body = groups.length > 1
      ? groups.map(([locus, rows]) => `<h4 class="tn-locus">${esc(locus)}<small>${fmt(rows.length)}</small></h4>${list(rows)}`).join("")
      : list(qs);
    // The fold's line counts the questions and their loci; the questions themselves are the fold's body.
    return fold("Disputed questions", `${nOf(qs.length, "question", "questions")}${groups.length > 1 ? ` in ${fmt(groups.length)} loci` : ""}`,
      `${body}<p class="rx-note">Each author's answer is read by machine from the claims on his pages; the answers and the map name the pages. <a href="${ATLAS.slice(0, -1)}">Every disputed question, by locus</a></p>`, false, "tn-dq");
  }

  // The shared questions of the topic's parts, most-asked first; equal counts keep the index's order (oldest asker first).
  // A question two parts both hold (the same words) is listed once, where more works ask it.
  function sharedRows(ix, parts) {
    const rows = new Map();
    for (const ref of parts) {
      const [t, b] = ref.split("/");
      const topic = ((ix && ix.topics) || []).find((x) => x.topic === t);
      if (!topic) continue;
      for (const part of topic.buckets || []) {
        if (b && part.slug !== b) continue;
        (part.questions || []).forEach((q, i) => {
          const key = String(q.q || "").trim().toLowerCase();
          const row = { q: q.q, works: q.works || 0, at: `${t}/${part.slug}/${i}` };
          if (!rows.has(key) || rows.get(key).works < row.works) rows.set(key, row);
        });
      }
    }
    return [...rows.values()].sort((a, b) => b.works - a.works);
  }
  const SHOWN = 8;
  const sharedRow = (r) => `<li><span class="tn-q-q">${esc(r.q)}</span><span class="cn-pages">${nOf(r.works, "work", "works")}</span></li>`;
  function sharedBody(rows) {
    if (!rows) return `<p class="rx-note" role="status">Loading the shared questions…</p>`;
    return `<ul class="rn-list tn-qs tn-first">${rows.slice(0, SHOWN).map(sharedRow).join("")}</ul>
      ${rows.length > SHOWN ? `<div class="rx-pane tn-pane" id="tnSharedAll" role="region" tabindex="0" aria-label="All ${fmt(rows.length)} shared questions" hidden></div>
      <button type="button" class="rx-button tn-more" aria-expanded="false" aria-controls="tnSharedAll">Show all ${fmt(rows.length)}</button>` : ""}
      <p class="rx-note">Questions three or more works of the library ask, grouped by a machine reading of each work's questions.</p>`;
  }
  const sharedCount = (rows) => (rows ? `${nOf(rows.length, "question", "questions")}${rows.length > 1 ? ", the most asked first" : ""}` : "Loading");
  function sharedHTML(rows, parts) {
    if (!parts.length || (rows && !rows.length)) return "";
    return fold("Questions the tradition shares", sharedCount(rows), sharedBody(rows), false, "tn-shared");
  }

  /* The controversies the library's controversy literature argued (Rada, Capreolus, Turretin, Chemnitz, Bellarmine, Ames, Whitaker,
   * Chamier, Calov, Suárez ...), grouped by the work that argued them, the largest group open. A controversy belongs to the topic
   * when its nearest classic question is one of the topic's, or when one of its keywords is the topic's name. */
  const KIND = { contradiction: "They contradict", distinction: "A distinction, not a denial", emphasis: "A difference of emphasis", agreement: "They agree" };
  const folded = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim().replace(/^the /, "");
  function controHTML(cx) {
    const pairs = (cx && cx.pairs) || [];
    if (!pairs.length) return "";
    return fold("Controversies", `From ${nOf(pairs.length, "work", "works")} of controversy`, `<p class="rx-note tn-status" role="status"></p>
      <div class="tn-contro-list">${pairs.map((p) => `<div data-pair="${esc(p.pair)}" hidden></div>`).join("")}</div>
      <p class="rx-note">Each opens the controversy as the work argued it: both sides, the work's judgment, and each side in his own words.</p>`, false, "tn-contro");
  }
  // A work's list longer than a screenful scrolls in its own pane (the topic page never runs on for fifty questions).
  function controGroup(d, rows) {
    const list = `<ul class="rn-list tn-qs">${rows.map((c) => `<li><a class="tn-q-q" href="${CONTROVERSIES}${esc(c.id)}">${esc(c.question)}</a><span class="cn-pages">${esc(KIND[c.kind] || c.kind)}</span></li>`).join("")}</ul>`;
    return `<details class="tn-work"><summary><span>${esc(d.source)}, <em>${esc(d.source_title)}</em><small>${esc(d.a)} and ${esc(d.b)}</small></span><span class="tn-n">${nOf(rows.length, "controversy", "controversies")}</span></summary>
      ${rows.length > 8 ? `<div class="tn-scroll" role="region" tabindex="0" aria-label="${esc(d.source)}: ${nOf(rows.length, "controversy", "controversies")}">${list}</div>` : list}</details>`;
  }
  async function loadControversies(box, foldEl) {
    if (foldEl.dataset.loaded) return;
    foldEl.dataset.loaded = "1";
    const cx = await once("/v1/enrich/controversies/index.json");
    const pairs = (cx && cx.pairs) || [];
    const ids = new Set(JSON.parse(box.dataset.ids || "[]"));
    const names = new Set(JSON.parse(box.dataset.names || "[]"));
    const status = foldEl.querySelector(".tn-status");
    const small = foldEl.querySelector("summary small");
    status.textContent = `Reading ${nOf(pairs.length, "work", "works")} of controversy…`;
    let total = 0;
    let works = 0;
    let failed = 0;
    await Promise.all(pairs.map(async (p) => {
      const d = await once(`/v1/enrich/controversies/${encodeURIComponent(p.pair)}.json`);
      const slot = foldEl.querySelector(`[data-pair="${CSS.escape(p.pair)}"]`);
      if (!d) { failed += 1; return; }
      const rows = (d.controversies || []).filter((c) => (c.atlas && ids.has(c.atlas.id)) || (c.keywords || []).some((k) => names.has(folded(k))));
      if (!rows.length || !slot) return;
      total += rows.length;
      works += 1;
      slot.innerHTML = controGroup(d, rows);
      slot.hidden = false;
      small.textContent = `${nOf(total, "controversy", "controversies")} · ${nOf(works, "work", "works")}`;
    }));
    const groups = [...foldEl.querySelectorAll(".tn-contro-list .tn-work")];
    const largest = groups.reduce((best, g) => (!best || g.querySelectorAll("li").length > best.querySelectorAll("li").length ? g : best), null);
    if (largest && !groups.some((g) => g.open)) largest.open = true;
    status.textContent = total ? (failed ? `${nOf(failed, "work", "works")} of controversy could not load; reload the page to try again.` : "")
      : failed ? "The controversies could not load. Reload the page to try again." : "No controversy in these works is filed under this topic yet.";
    status.hidden = !status.textContent;
    if (!total) small.textContent = failed ? "Could not load" : "None filed under this topic";
    if (failed) delete foldEl.dataset.loaded;
  }

  function traditionsHTML(prs) {
    if (!prs || !prs.length) return "";
    return fold("Traditions compared", `${prs.length} pairings`, `<ol class="cn-points">${prs.map((p) => `<li><h4>${esc(p.x)} and ${esc(p.y)}</h4>
        <p class="cn-summary">${esc(p.summary)}</p>
        ${p.agree ? `<p><em>Agree.</em> ${esc(p.agree)}</p>${pagesLine(p.agree_refs)}` : ""}
        ${p.differ ? `<p><em>Differ.</em> ${esc(p.differ)}</p>${pagesLine(p.differ_refs)}` : ""}</li>`).join("")}</ol>`, false);
  }

  // The doctrine's history across the library, period by period (a timeline
  // shared with the Scripture pages' verse histories), and a course of
  // readings in order, each a thesis's page with why to read it there.
  function historyHTML(g) {
    if (!g || !(g.history || []).length) return "";
    return fold("How the doctrine developed", `${g.history.length} periods`, `${g.summary ? `<p class="lib-lede">${esc(g.summary)}</p>` : ""}
      <ol class="lib-timeline">${g.history.map((h) => `<li><h4>${esc(h.period)}</h4>
        <div><p>${esc(h.text)}</p>${pagesLine(h.refs)}</div></li>`).join("")}</ol>`, true);
  }

  function courseHTML(g) {
    if (!g || !(g.course || []).length) return "";
    return fold("A course of reading", `${g.course.length} readings`, `<ol class="tn-course">${g.course.map((c) => `<li>
        <p class="tn-course-head">${pageLink(c.w, c.p, `${who(c)}${c.t ? `, ${c.t}` : ""}, p. ${c.p}`)}</p>
        <p>${esc(c.why)}</p>${c.thesis ? `<p class="tn-course-thesis">${esc(c.thesis)}</p>` : ""}</li>`).join("")}</ol>`, false);
  }

  function conceptsHTML(cs) {
    if (!cs || !cs.length) return "";
    return fold("Concept guides", String(cs.length), `<ul class="rn-list">${cs.map((c) => `<li><strong>${esc(c.label)}</strong><span>${esc(c.gloss)}</span>
        <button type="button" class="rx-button tn-open" data-concept="${esc(c.id)}">Read the guide</button><div class="tn-guide" hidden></div></li>`).join("")}</ul>`, false);
  }

  function guideHTML(g) {
    const pos = (g.positions || []).map((p) => `<li><strong>${esc(p.tradition)}</strong>: ${esc(p.summary)}
      <span class="cn-pages">${(p.evidence || []).slice(0, 5).map((e) => pageLink(e.work, e.page, `p. ${e.page}`)).join(" · ")}</span></li>`).join("");
    const read = (g.read || []).map((r) => `<li>${r.title ? pageLink(r.work, r.page, r.title) : pageLink(r.work, r.page, r.work).replace("<a ", `<a data-work-name="${esc(r.work)}" `)}<span>${esc(r.why)}</span></li>`).join("");
    return `${g.brief ? `<p>${esc(g.brief)}</p>` : ""}${g.scope_note ? `<p><em>Scope:</em> ${esc(g.scope_note)}</p>` : ""}
      ${g.differed ? `<p><em>Where the traditions differed:</em> ${esc(g.differed)}</p>` : ""}
      ${pos ? `<h5>Positions</h5><ul class="bn-list">${pos}</ul>` : ""}${read ? `<h5>Where to read</h5><ul class="rn-list">${read}</ul>` : ""}
      ${g.terms ? `<p class="bn-themes">${esc(g.terms)}</p>` : ""}`;
  }

  /* IN THE WORKS' OWN INDEXES (2026-10-21, with the site): v1/enrich/concept_index/<id>.json names the works whose made index
   * (subjects, terms defined) carries the concept's words, with the pages the index gives it, ordered by curated standing and then by
   * how much of the work the index gives the concept (no model). The first twelve works are shown; "Show all" the rest. */
  function indexHTML(ix) {
    if (!ix || !(ix.rows || []).length) return "";
    const SHOW = 12;
    const row = (r, i) => `<li${i >= SHOW ? " hidden" : ""}><strong>${esc(r.a || r.w)}</strong>, <em>${esc(r.t)}</em>
        <span class="cn-pages">${(r.pages || []).slice(0, 6).map((p) => pageLink(r.w, p, `p. ${p}`)).join(" · ")}${r.n > 6 ? ` · ${r.n} pages in its index` : ""}</span>
        ${r.headings && r.headings.length ? `<span class="tn-ix-h">${esc(r.headings.slice(0, 2).join(" · "))}</span>` : ""}</li>`;
    return `<h5>In the works' own indexes <small>${Number(ix.works).toLocaleString()} ${ix.works === 1 ? "work" : "works"} · ${Number(ix.pages).toLocaleString()} pages</small></h5>
      <ul class="rn-list tn-ix">${ix.rows.map(row).join("")}</ul>${ix.rows.length > SHOW ? `<button type="button" class="rx-button tn-ix-all">Show all ${ix.rows.length}</button>` : ""}`;
  }

  // The shared questions fill in when their index arrives (it is the largest of the files; the other folds do not wait for it).
  function fillShared(box, rows) {
    const el = box.querySelector(".tn-shared");
    if (!el) return;
    if (!rows) {
      el.querySelector("summary small").textContent = "Could not load";
      el.querySelector(".rx-fold-body").innerHTML = `<p class="rx-note" role="status">The shared questions could not load. Reload the page to try again.</p>`;
      return;
    }
    if (!rows.length) { el.remove(); return; }
    box.sharedRows = rows;
    el.querySelector("summary small").textContent = sharedCount(rows);
    el.querySelector(".rx-fold-body").innerHTML = sharedBody(rows);
  }

  // A topic with nothing to show is remembered until the address changes, so the 700 ms redraw does not refetch it.
  const empty = new Set();
  let busy = false;
  async function draw() {
    const slug = slugNow();
    const page = document.getElementById("page");
    const old = document.getElementById("tnNotes");
    if (!slug || !page) { if (old) old.remove(); return; }
    if (busy || empty.has(slug) || (old && old.dataset.slug === slug && page.contains(old))) return;
    const head = page.querySelector("h1");
    if (!head) return;
    busy = true;
    try {
      const where = placeOf(slug);
      const sharedIndex = where.parts.length ? once("/v1/questions/index.json") : null;
      const [d, ax, mx, cx] = await Promise.all([getJSON(`${BASE}/v1/enrich/topics/${encodeURIComponent(slug)}.json`),
        once("/v1/atlas/index.json"), once("/v1/maps/index.json"), once("/v1/enrich/controversies/index.json")]);
      if (old) old.remove();
      if (slugNow() !== slug || !page.contains(head)) return;
      const groups = disputedOf(ax, where);
      const mapped = new Set(((mx && mx.questions) || []).map((q) => q.id));
      const notes = d ? historyHTML(d.guide) + traditionsHTML(d.traditions) + courseHTML(d.guide) + conceptsHTML(d.concepts) : "";
      const body = disputedHTML(groups, mapped) + sharedHTML(null, where.parts) + controHTML(cx) + notes;
      if (!body) { empty.add(slug); return; }
      const box = document.createElement("section");
      box.id = "tnNotes";
      box.className = "cn-notes tn-notes";
      box.dataset.slug = slug;
      // What the controversies fold matches on: the topic's atlas questions, and its name (each half of a paired name) as a keyword.
      box.dataset.ids = JSON.stringify(groups.flatMap(([, list]) => list.map((q) => q.id)));
      const label = folded(head.textContent);
      box.dataset.names = JSON.stringify([label, ...label.split(/\s*[/&]\s*/).map(folded).filter(Boolean)]);
      box.innerHTML = `${body}${notes ? method(`<p>Machine-written from the authors' own claims, not their words; every page is checked. Open a page to read the passage.</p>`) : ""}`;
      box.addEventListener("click", async (e) => {
        const more = e.target.closest(".tn-more");
        if (more) {
          const pane = box.querySelector("#tnSharedAll");
          const first = box.querySelector(".tn-first");
          const opening = more.getAttribute("aria-expanded") !== "true";
          if (opening && !pane.childElementCount) pane.innerHTML = `<ul class="rn-list tn-qs">${(box.sharedRows || []).map(sharedRow).join("")}</ul>`;
          pane.hidden = !opening;
          first.hidden = opening;
          more.setAttribute("aria-expanded", String(opening));
          more.textContent = opening ? `Show the first ${SHOWN}` : `Show all ${fmt((box.sharedRows || []).length)}`;
          return;
        }
        const all = e.target.closest(".tn-ix-all");
        if (all) { all.previousElementSibling.querySelectorAll("li[hidden]").forEach((li) => { li.hidden = false; }); all.remove(); return; }
        const b = e.target.closest(".tn-open");
        if (!b) return;
        const slot = b.nextElementSibling;
        if (!slot.hidden) { slot.hidden = true; b.textContent = "Read the guide"; return; }
        if (!slot.dataset.loaded) {
          const [g, ix] = await Promise.all([getJSON(`${BASE}/v1/enrich/concepts/${encodeURIComponent(b.dataset.concept)}.json`),
            getJSON(`${BASE}/v1/enrich/concept_index/${encodeURIComponent(b.dataset.concept)}.json`)]);
          slot.innerHTML = (g ? guideHTML(g) : "<p>This guide could not load.</p>") + indexHTML(ix);
          slot.dataset.loaded = "1";
        }
        slot.hidden = false; b.textContent = "Close the guide";
      });
      // A fold's toggle does not bubble: listen in the capture phase. The controversies load the first time their fold opens.
      box.addEventListener("toggle", (e) => {
        if (e.target.classList && e.target.classList.contains("tn-contro") && e.target.open) loadControversies(box, e.target);
      }, true);
      // After the whole heading row: the h1 shares a flex row with its link, where the notes would be squeezed into a column.
      (head.closest(".rx-topic-heading") || head).insertAdjacentElement("afterend", box);
      if (sharedIndex) sharedIndex.then((ix) => fillShared(box, ix ? sharedRows(ix, where.parts) : null));
    } finally {
      busy = false;
    }
  }

  // authors.in03.js draws the topic page on its own schedule and on every route.
  setInterval(draw, 700);
  addEventListener("hashchange", () => { empty.delete(slugNow()); draw(); });
})();
// a work named only by its slug (a Patrologia piece whose title the list lacks): its name from its meta.json, fetched once a slug
const WORK_NAMES = new Map();
const WORK_NAMES_BASE = window.__FR_BLOB_BASE__ || "https://mo-tfr-library.mo-podcast-feed.workers.dev";
let WORK_NAMES_OBSERVER = null;
function fillWorkNames(root) {
  (root || document).querySelectorAll("a[data-work-name]").forEach((a) => {
    const slug = a.getAttribute("data-work-name"); a.removeAttribute("data-work-name");
    if (!WORK_NAMES.has(slug)) WORK_NAMES.set(slug, fetch(`${WORK_NAMES_BASE}/v1/works/${encodeURIComponent(slug)}/meta.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
    WORK_NAMES.get(slug).then((m) => { if (!m) return; const t = m.title_en || m.title || slug; a.textContent = (m.author ? `${m.author}, ` : "") + t + (m.volume ? ` · ${m.volume}` : ""); });
  });
}
// the lists render as folds open: fill the names whenever a slug-named link appears
if (typeof document !== "undefined" && document.body && !WORK_NAMES_OBSERVER) { WORK_NAMES_OBSERVER = new MutationObserver(() => fillWorkNames(document)); WORK_NAMES_OBSERVER.observe(document.body, { childList: true, subtree: true }); fillWorkNames(document); }
