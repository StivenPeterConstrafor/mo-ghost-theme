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
 * If the index cannot be read the panel is left alone rather than
 * shown with a guess. A disclosure that might be wrong is worse than
 * no disclosure: a reader who sees one believes it.
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

  /* WHAT THE ENGLISH WAS TRANSLATED FROM, ONCE THE PAGE IS SURE.
   *
   * For the machine-translated collections the panel prints nothing
   * until it knows the source language, which it reads from
   * data-fr-original-lang on <html>. The old reader set that; the
   * ported one does not, so without this the panel waits its eight
   * seconds and stays silent on every Migne and native work, which are
   * exactly the works whose English a machine wrote.
   *
   * The language is not taken from the slug. The ported reader labels
   * its source lane with the language of the work in front of you, so
   * the page is asked instead of a table being guessed at.
   *
   * BUT THE LABEL LIES FOR THE FIRST TWO SECONDS. It is rendered from
   * the template default before the work's own data arrives. Measured
   * on pg-3860: "Latin" at 806ms with the text already loading, and
   * "Greek" only at 2034ms. A first reading published "AI translated
   * from Latin" over a Greek work, which is the disclosure stating a
   * falsehood about the text under it, the one outcome worth more than
   * a few seconds of waiting.
   *
   * So the label has to hold still. It is read only once the work's
   * text is on the page, and then only after it has said the same thing
   * for five ticks together. If it never settles, nothing is published
   * and the panel keeps its silence, which is what the old reader did
   * for a work that never answered. */
  // SETTLE: consecutive equal readings, 250ms apart.
  // GIVE_UP: 12s, comfortably past the 2s measured above.
  const SETTLE = 5;
  const GIVE_UP = 48;

  /* THE LANE IS NOT ALWAYS LABELLED WITH A LANGUAGE.
   *
   * The first version of this accepted any word-shaped label, on the
   * assumption that the source lane names a language. It does not
   * always: pg-11 labels its lane "Page transcription", and the panel
   * duly printed "AI translated from Page transcription" over Origen.
   * Ian caught it on his phone the same afternoon.
   *
   * That is the same class of error as naming the wrong language, and
   * it comes from asking what shape the label is instead of what it
   * says. So the answer has to BE a language: anything outside this
   * list publishes nothing and the panel keeps its silence, which is
   * the correct outcome for a lane that is a scan rather than a
   * source text.
   *
   * The list is the languages the library actually holds originals in.
   * A combined lane such as "Greek · Latin" is deliberately absent: it
   * names two things, and "translated from Greek · Latin" is not a
   * sentence about where this English came from. */
  const LANGUAGES = new Set([
    "latin", "greek", "hebrew", "syriac", "arabic", "armenian", "coptic",
    "ethiopic", "geez", "ge'ez", "georgian", "church slavonic",
    "old church slavonic", "slavonic", "german", "french", "italian", "spanish",
  ]);

  /* ONLY A WORK WITH BOTH LANES IS A TRANSLATION (Stiven, 2026-09-24: the
   * Westminster minutes, an English original, were showing "AI translated
   * from Latin"). The ported reader hides the source-language button with
   * display:none for an English-only work, which is not the `hidden`
   * attribute, so the button's template label ("Latin") was read as the
   * source. The page is asked whether a source lane AND an English lane are
   * in front of the reader: the reader stamps data-fr-lanes ("source en",
   * "en" or "source") once its metadata lands, and the two buttons must
   * both be visible. Anything else publishes nothing. */
  function shown(el) {
    return !!el && !el.hidden && window.getComputedStyle(el).display !== "none";
  }
  function laneLanguage() {
    const lanes = document.documentElement.getAttribute("data-fr-lanes");
    if (lanes !== null && lanes.trim() !== "source en") return "";
    const en = document.getElementById("m-en");
    if (en && !shown(en)) return "";
    const el = document.getElementById("m-par");
    const lang = shown(el) ? (el.textContent || "").trim() : "";
    if (!lang) return "";
    return LANGUAGES.has(lang.toLowerCase()) ? lang : "";
  }

  function loaded() {
    const reading = document.getElementById("reading");
    return !!reading && (reading.innerText || "").trim().length > 200;
  }

  // Resolves to the settled language, or "" if the page never settles.
  function settledLanguage() {
    return new Promise((done) => {
      let last = "";
      let same = 0;
      let ticks = 0;
      const timer = window.setInterval(() => {
        ticks += 1;
        const now = loaded() ? laneLanguage() : "";
        same = now && now === last ? same + 1 : 0;
        last = now;
        if (same >= SETTLE) { window.clearInterval(timer); done(now); return; }
        if (ticks >= GIVE_UP) { window.clearInterval(timer); done(""); }
      }, 250);
    });
  }

  function show(corpus, id) {
    mount.dataset.frStatusCorpus = corpus;
    mount.dataset.frStatusWork = id;
    const go = () => {
      if (window.FRWorkStatus && window.FRWorkStatus.run) window.FRWorkStatus.run();
    };
    // EEBO is a transcription and the curated set is human translation;
    // neither asks what a machine worked from, so neither waits.
    if (corpus === "eebo" || corpus === "mo") { go(); return; }
    // The panel starts its own eight-second clock the moment it runs, so
    // it is started AFTER the language is settled rather than before.
    settledLanguage().then((lang) => {
      if (lang) document.documentElement.dataset.frOriginalLang = lang;
      go();
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
      if (!Array.isArray(works)) return;
      const ours = works.some((x) => String(x && (x.slug || x.s || x.id)) === w);
      show(ours ? "mo" : "tfr", w);
    })
    .catch(() => { /* no guess: the panel stays as it is */ });
})();
