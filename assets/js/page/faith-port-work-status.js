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

  /* WHAT THE ENGLISH WAS TRANSLATED FROM.
   *
   * For the machine-translated collections the panel does not print a
   * word until it knows the source language, and it learns that from
   * data-fr-original-lang on <html>. The OLD reader set that attribute;
   * the ported one does not, so without this the panel would wait its
   * eight seconds and then stay silent on every Migne and native work.
   * Silence is the right failure and the wrong outcome: those are
   * exactly the works whose English a machine wrote.
   *
   * Not hardcoded per corpus. The ported reader already labels its
   * source lane with the language of THIS work, Greek on a Patrologia
   * Graeca volume and Latin on a Latina one, so the page is asked
   * rather than the slug. A work with no source lane publishes nothing
   * and the panel stays quiet, which is the behaviour the old reader
   * had for a work that never answered. */
  function publishLanguage() {
    const el = document.getElementById("m-par");
    const lang = el && !el.hidden ? (el.textContent || "").trim() : "";
    if (!/^[A-Za-z][A-Za-z ]{1,20}$/.test(lang)) return false;
    if (/^english$/i.test(lang)) return false;
    document.documentElement.dataset.frOriginalLang = lang;
    return true;
  }

  function watchLanguage() {
    if (publishLanguage()) return;
    // The toolbar is built with the work, so this is a short wait, and a
    // bounded one: the panel gives up at eight seconds and so does this.
    let tries = 0;
    const timer = window.setInterval(() => {
      if (publishLanguage() || ++tries > 28) window.clearInterval(timer);
    }, 250);
  }

  function show(corpus, id) {
    mount.dataset.frStatusCorpus = corpus;
    mount.dataset.frStatusWork = id;
    // Before starting the panel, so a work whose lane is already
    // labelled draws at once instead of waiting on the observer.
    if (corpus !== "eebo" && corpus !== "mo") watchLanguage();
    if (window.FRWorkStatus && window.FRWorkStatus.run) window.FRWorkStatus.run();
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
