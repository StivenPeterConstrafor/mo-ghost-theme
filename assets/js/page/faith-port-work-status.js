/*
 * Which collection a work in the ported reader belongs to, so the
 * disclosure panel can say how its text was made.
 *
 * Ian, 2026-09-21: "we lost our AI disclosure on works. We need to
 * re-integrate that into the new reader."
 *
 * faith-work-status.js draws the panel and owns every word in it. All
 * this file does is answer the one question that file can no longer
 * answer for itself here: which collection is this work in.
 *
 * WHY IT IS NOT A STRING SPLIT. Four collections carry their name as a
 * slug prefix, so pg-3860, pld-2741, po-118 and eebo-A45283 answer
 * immediately. The rest do not, and the rest are not one thing:
 *
 *   tfr   the native corpus, machine translated from Latin. Its slugs
 *         are ordinary words: luther-..., albertus-..., duns-...
 *   mo    our own curated set, which is historic HUMAN translation:
 *         anf-hermas-shepherd, charnock-attributes, calvin-institutes.
 *
 * Both are bare. Guessing between them by shape is guessing, and the
 * two answers are opposite disclosures. Defaulting to tfr, which is
 * what the panel does with no corpus given, would print "translated by
 * a machine" over the Ante-Nicene Fathers. So the curated index is
 * fetched and asked. It is one small file listing our own works, and
 * this only runs on a reader page that is already loading a work.
 *
 * If the index cannot be read, the native rules decide instead (see
 * the fetch at the foot). They only say "machine translated" where a
 * work shows a source lane beside its English, so a guess can never
 * print that over one of ours.
 */
(function () {
  "use strict";

  const mount = document.querySelector("[data-fr-status]");
  if (!mount) return;

  const PREFIXED = ["eebo", "pld", "pg", "po"];

  function slug() {
    try { return new URLSearchParams(window.location.search).get("w") || ""; }
    catch (_) { return ""; }
  }

  function base() {
    const meta = document.querySelector('meta[name="tfr-library-base"]');
    return ((meta && meta.getAttribute("content")) || "").replace(/\/+$/, "");
  }

  /* The old reader's panel asks the worker for a BARE id beside a
     corpus, which is the shape its URL already had. The ported reader
     carries the two joined into one slug, so they are taken apart again
     here rather than teaching the worker a second address. */
  function split(w) {
    for (const c of PREFIXED) {
      if (w.startsWith(`${c}-`)) return { corpus: c, id: w.slice(c.length + 1) };
    }
    return null;
  }

  /* HOW THIS TEXT WAS MADE, DECIDED FROM THE WORK ITSELF (Ian, 2026-09-28).
   *
   * The first version read the language off the reader's source button
   * and would publish only once that label had held still for five
   * ticks, giving up after twelve seconds. Measured on the live site,
   * the panel landed 10 to 14 seconds after the page opened, so a slow
   * phone got no disclosure at all, and every work outside the AI
   * collections got none by design: the Didache, the English Divines,
   * the Book of Concord in English, Aquinas, all of Patrologia Orientalis.
   * The button also lied: a Leibniz volume in French was published as
   * "AI translated from Latin" because the native reader's button says
   * Latin by default.
   *
   * Now the reader's own stamp decides, and it lands in 0.5 to 7 seconds:
   * data-fr-lanes on <html> ("source en", "en" or "source", reader-core)
   * plus DATA, the work record reader-core holds as a top-level binding.
   * The kind goes to faith-work-status.js as data-fr-prov and the panel
   * draws at once. For a machine translation the language is read from
   * the source text on the page, never from a label, and follows as an
   * event; until then the panel says "AI translation", which is true.
   * A language the text cannot settle is left as "the original" rather
   * than guessed. */

  // Our curated set. Four are English originals; the rest are historic
  // translations made by people (the anf- works are the Ante-Nicene
  // Fathers series). Sixteen works, so they are named rather than guessed.
  const MO_ENGLISH = new Set(["edwards-resolutions", "1928-bcp", "lausanne", "new-hampshire-confession"]);
  const ENGLISH_REGION = /^(English|Scottish|American|Welsh|Irish)/i;
  const ENGLISH_TRADITION = /^English Divines$/i;

  function data() {
    try { return (typeof DATA !== "undefined" && DATA) || window.DATA || null; } catch (_) { return window.DATA || null; }
  }
  /* AQUINAS IS THE EXCEPTION (Stiven, 2026-09-24): a two-lane work whose
   * English is a human translation. His slugs begin "aq-". */
  function aquinas(d) {
    return /thomas aquinas/i.test(String((d && d.author) || "")) || /^aq-/.test(String(slug() || ""));
  }
  function translatorFromTitle(d) {
    const m = String((d && d.title) || "").match(/\((?:trans\.?|translated by|tr\.)\s+([^)]+)\)/i);
    return m ? m[1].trim() : "";
  }

  // ── The language of the source text on the page ──
  const SCRIPTS = [
    [/[\u0370-\u03FF\u1F00-\u1FFF]/g, "Greek"],
    [/[\u0700-\u074F]/g, "Syriac"],
    [/[\u0600-\u06FF\u0750-\u077F]/g, "Arabic"],
    [/[\u0590-\u05FF]/g, "Hebrew"],
    [/[\u0530-\u058F]/g, "Armenian"],
    [/[\u10A0-\u10FF\u1C90-\u1CBF]/g, "Georgian"],
    [/[\u2C80-\u2CFF\u03E2-\u03EF]/g, "Coptic"],
    [/[\u1200-\u137F]/g, "Ge\u02BCez"],
    [/[\u0400-\u04FF\u0460-\u052F]/g, "Slavonic"],
  ];
  // Common short words, each a strong signal for one language only.
  const STOP = {
    Latin: ["et", "est", "quod", "non", "ad", "cum", "sed", "qui", "quae", "enim", "autem", "ut", "sunt", "hoc", "etiam", "vel", "atque", "quia"],
    French: ["le", "les", "des", "du", "une", "que", "dans", "pour", "pas", "sont", "avec", "au", "ce", "il", "elle", "nous"],
    German: ["der", "die", "das", "und", "ist", "nicht", "ein", "eine", "zu", "den", "mit", "sich", "auf", "auch", "dem", "von"],
    Italian: ["il", "che", "di", "della", "gli", "per", "sono", "una", "del", "nel", "anche"],
    Spanish: ["el", "los", "las", "que", "del", "por", "una", "para", "con", "es", "como", "sus"],
    Dutch: ["het", "een", "van", "niet", "zijn", "dat", "ook", "maar", "wordt", "voor"],
  };
  // Sampled across the whole of what is loaded, not the opening page:
  // a title page in Greek over a Latin work (pg-11, Recognitions) or a
  // French preface to a mixed volume (Leibniz) would otherwise decide it.
  function sourceText() {
    const cells = document.querySelectorAll("#reading .la");
    const step = Math.max(1, Math.floor(cells.length / 60));
    let text = "";
    for (let i = 0; i < cells.length && text.length < 12000; i += step) {
      text += ` ${String(cells[i].textContent || "").slice(0, 400)}`;
    }
    return text;
  }
  function languageOf(text) {
    const letters = (text.match(/\p{L}/gu) || []).length;
    if (letters < 300) return null; // not enough on the page yet
    // A script names the language only when it carries most of the text.
    // A real share that is not a majority means a mixed page: say nothing.
    for (const [re, name] of SCRIPTS) {
      const share = (text.match(re) || []).length / letters;
      if (share > 0.6) return name;
      if (share > 0.15) return "";
    }
    const words = (text.toLowerCase().match(/\p{L}+/gu) || []);
    const score = {};
    for (const lang of Object.keys(STOP)) {
      const set = new Set(STOP[lang]);
      score[lang] = words.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0);
    }
    const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
    const [best, second] = ranked;
    // Only a clear winner is named. A volume that mixes languages, as
    // Leibniz's do, says "the original" rather than the wrong one.
    if (best[1] >= 12 && best[1] >= 2 * second[1]) return best[0];
    return "";
  }
  // Resolves to a language, or "" when the text cannot settle it.
  function readLanguage(limitMs) {
    return new Promise((done) => {
      const t0 = Date.now();
      const tick = () => {
        const lang = languageOf(sourceText());
        if (lang !== null) { done(lang); return; }
        if (Date.now() - t0 > limitMs) { done(""); return; }
        window.setTimeout(tick, 300);
      };
      tick();
    });
  }

  // The reader's stamp, or null if it never comes.
  function lanesStamp(limitMs) {
    return new Promise((done) => {
      const t0 = Date.now();
      const tick = () => {
        const v = document.documentElement.getAttribute("data-fr-lanes");
        if (v !== null && data()) { done(v.trim()); return; }
        if (Date.now() - t0 > limitMs) { done(null); return; }
        window.setTimeout(tick, 150);
      };
      tick();
    });
  }

  const PO_LANG = { syc: "Syriac", ar: "Arabic", gez: "Ge\u02BCez", cop: "Coptic", hy: "Armenian",
    ka: "Georgian", grc: "Greek", cu: "Slavonic", chu: "Slavonic", la: "Latin", he: "Hebrew" };
  // PO says per row whose English it is: resp="#machine" or "#edition"
  // (the edition's own printed English). The reader has already fetched
  // this file and it caches for a day, so this is a cache hit.
  function poCanon(id) {
    const blob = (window.__FR_BLOB_BASE__ && !/TBD/.test(String(window.__FR_BLOB_BASE__)))
      ? String(window.__FR_BLOB_BASE__).replace(/\/+$/, "") : base();
    return fetch(`${blob}/v1/tei/po/${encodeURIComponent(id)}.xml`, { credentials: "omit" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((xml) => {
        const machine = (xml.match(/resp="#machine"/g) || []).length;
        const edition = (xml.match(/resp="#edition"/g) || []).length;
        const code = (xml.match(/xml:lang="([a-z-]+)"\s+type="source"/) || [])[1] || "";
        return { machine, edition, lang: PO_LANG[code] || "" };
      })
      .catch(() => null);
  }

  // reader-core's own language codes (its LGN), for works that declare one.
  const SRC_LANG = { la: "Latin", grc: "Greek", el: "Greek", de: "German", fr: "French",
    it: "Italian", es: "Spanish", nl: "Dutch", cy: "Welsh" };
  const MACHINE_WORDS = /machine|\bAI\b|automat|gemini|gpt|llm/i;

  function decide(corpus, lanes) {
    const d = data() || {};
    if (corpus === "mo") {
      return MO_ENGLISH.has(slug()) ? { kind: "english" }
        : { kind: "human", credit: /^anf-/.test(slug()) ? "From the Ante-Nicene Fathers series." : "" };
    }
    // An English original can show two lanes (the reader labels the
    // second "Original"). It is never a translation. A Latin title on
    // the record says otherwise: Baxter's Methodus (1681) is stamped
    // src_lang "en" upstream, but it is a Latin original.
    const latinTitle = !!d.title_la && d.title_la !== d.title;
    if (d.src_lang === "en" && !latinTitle) return { kind: "english" };
    if (lanes === "source") return { kind: "source" };
    if (aquinas(d)) return { kind: "human", credit: "" };
    if (lanes === "en") {
      // The author's nation is not the text's language: a Latin work by
      // an English divine can ship in English alone, and then it is a
      // translation. Only a work whose title has no separate English form
      // is taken as written in English.
      const ownTitle = !latinTitle && (!d.title_en || d.title_en === d.title);
      if (ownTitle && ENGLISH_TRADITION.test(String(d.tradition || ""))) return { kind: "english" };
      if (ownTitle && d.region && ENGLISH_REGION.test(String(d.region))) return { kind: "english" };
      if (d.source && /translat/i.test(String(d.source)) && !MACHINE_WORDS.test(String(d.source))) {
        return { kind: "human", credit: String(d.source).replace(/\.?$/, ".") };
      }
      const tr = translatorFromTitle(d);
      if (tr) return { kind: "human", credit: `Translated by ${tr}.` };
      return { kind: "unknown" };
    }
    if (lanes === "source en") {
      if (corpus === "pld") return { kind: "ai", lang: "Latin" };
      return { kind: "ai", lang: SRC_LANG[String(d.src_lang || "").toLowerCase()] || "" };
    }
    return { kind: "unknown" };
  }

  function show(corpus, id) {
    mount.dataset.frStatusCorpus = corpus;
    mount.dataset.frStatusWork = id;
    const go = (prov) => {
      if (prov) mount.dataset.frProv = JSON.stringify(prov);
      if (window.FRWorkStatus && window.FRWorkStatus.run) window.FRWorkStatus.run();
    };
    // EEBO keeps its own transcription note.
    if (corpus === "eebo") { go(null); return; }
    lanesStamp(20000).then(async (lanes) => {
      // A reader that never stamps still gets a disclosure: the prefixed
      // collections are machine translated; anything else says it is not
      // yet recorded. Never silence.
      if (lanes === null) {
        // PO is left out: some of it is the edition's own printed English.
        go(["pg", "pld"].includes(corpus) ? { kind: "ai", lang: corpus === "pld" ? "Latin" : "" } : { kind: "unknown" });
        return;
      }
      let prov = decide(corpus, lanes);
      if (corpus === "po" && prov.kind === "ai") {
        const c = await poCanon(id);
        if (!c) prov = { kind: "unknown" }; // no file, no claim either way
        else if (c.edition && !c.machine) prov = { kind: "human", credit: "The English is the printed translation in the Patrologia Orientalis edition." };
        else if (c.lang) prov.lang = c.lang;
      }
      go(prov);
      if (prov.kind === "ai" && !prov.lang) {
        readLanguage(20000).then((lang) => {
          if (lang) document.dispatchEvent(new CustomEvent("fr-provenance-lang", { detail: { lang } }));
        });
      }
    });
  }
  const w = slug();
  if (!w) return;

  const direct = split(w);
  if (direct) { show(direct.corpus, direct.id); return; }

  // Bare slug: ours, or the native corpus. Only the index knows.
  fetch(`${base()}/v1/mo/index.json`, { credentials: "omit" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const works = (d && (d.works || d)) || null;
      if (!Array.isArray(works)) { show("tfr", w); return; }
      const ours = works.some((x) => String(x && (x.slug || x.s || x.id)) === w);
      show(ours ? "mo" : "tfr", w);
    })
    // Without the index the native rules still apply. They never call a
    // work machine translated unless it shows a source and an English lane,
    // which none of ours does, so this cannot mislabel our set as AI.
    .catch(() => show("tfr", w));
})();
