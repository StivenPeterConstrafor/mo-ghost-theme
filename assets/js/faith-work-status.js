/*
 * The Faith Received — where a work stands.
 *
 * Publishing a machine translation of a work nobody has read in
 * English before puts an obligation on the page: a reader has to be
 * able to see how the text was made, how far it has been checked, and
 * what has been changed since. This is that panel.
 *
 * Four things, in the order a reader needs them:
 *
 *   1. Whether the English was made by a machine. Said plainly, at the
 *      top, before the text rather than in a footnote after it.
 *   2. Where the work is in review, and the honest default is that
 *      nobody has checked it. An unreviewed work says so.
 *   3. How many problems have been reported, open and settled, which
 *      is the one number that cannot be argued with.
 *   4. What has actually been corrected, with dates. A translation
 *      that changes silently is worse than one that was wrong: a
 *      reader who checked it once has no way to know it moved.
 *
 * Counts and review state come from /v1/work-status, which is public
 * and needs no account. Somebody deciding whether to trust a machine
 * translation should not have to hold a membership to find out.
 *
 * ── Early English Books ─────────────────────────────────────────────
 *
 * Added while porting the corpus owner's English Divines reading
 * edition, whose work head carries a provenance line ours did not:
 * "Transcription: EEBO-TCP, spelling lightly modernized for reading."
 *
 * Until this pass the panel returned early for any collection that was
 * not machine translated, which meant an EEBO work showed nothing at
 * all: not that its text is a third-party transcription, not that its
 * spelling changes under the modernizer, not its review state, not its
 * reported issues, and not its corrections. All four of those exist in
 * the database for EEBO works, readers can and do file reports against
 * them from the text tools, and staff can mark them reviewed. The page
 * simply never showed any of it.
 *
 * So the question the panel asks is now "how was this text made",
 * which every collection can answer, rather than "what did the machine
 * translate", which only some can. The AI collections keep exactly the
 * wording and the behaviour they had, including waiting for the work
 * to name the language it was translated from.
 */
(function (root) {
  const mount = document.querySelector("[data-fr-status]");
  if (!mount) return;

  /* THE PORTED READER ASKS FOR THIS PANEL BY HAND.
   *
   * Ian, 2026-09-21: "we lost our AI disclosure on works. We need to
   * re-integrate that into the new reader." It was never ported: this
   * file is loaded by the old reader template alone, and the panel
   * mounts on markup only that template carries.
   *
   * It cannot simply be added to the new one, because it reads the work
   * out of the address and the two readers address a work differently.
   * The old reader says ?c=pg&w=3860, corpus and bare id. The new one
   * says ?w=pg-3860, one prefixed slug and no corpus at all. Read here
   * unchanged, a new-reader URL would resolve every work to the default
   * corpus, tfr, which is in the machine-translated set: the Shepherd
   * of Hermas, a historic human translation, would be labelled as
   * machine output. That is the one error this panel must never make.
   *
   * So the mount may name the work itself. When it does, its values win
   * and the address is not consulted; when it does not, nothing changes
   * for the old reader. faith-port-work-status.js is what fills them in,
   * and it defers this run until it has, because telling mo from tfr
   * takes a fetch. */
  if (mount.hasAttribute("data-fr-status-defer") && !mount.dataset.frStatusWork) {
    root.FRWorkStatus = {
      run() { mount.removeAttribute("data-fr-status-defer"); start(); },
    };
    return;
  }
  start();

  function start() {

  const baseMeta = document.querySelector('meta[name="tfr-library-base"]');
  const BASE = ((baseMeta && baseMeta.getAttribute("content")) || "").replace(/\/+$/, "");

  // Which collections were machine-translated at all. This decides
  // whether to ask the question, not what the answer is.
  //
  // Early English Books is English already, and the English Editions
  // are historic translations made by people. Patrologia Orientalis
  // prints the translation its own fascicles carry.
  const AI_COLLECTIONS = new Set(["tfr", "pld", "pg", "confessions"]);

  // Regions whose confessions were composed in English. The creeds
  // ship no original text, so they cannot answer for themselves and
  // this is what stands in.
  const ENGLISH_ORIGIN = /^(English|Scottish)/i;

  function param(name) {
    try { return new URLSearchParams(window.location.search).get(name) || ""; }
    catch (_) { return ""; }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function when(iso) {
    if (!iso) return "";
    const d = new Date(/[Zz+]|\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`);
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  const corpus = mount.dataset.frStatusCorpus || param("c") || "tfr";
  const workId = mount.dataset.frStatusWork || param("w");
  if (!workId) return;

  // Two states, not three. "Under review" is a third thing to keep
  // accurate for no gain to the reader: what they need to know is
  // whether a translator has read this work, and the answer is yes or
  // it is no.
  const REVIEW = corpus === "eebo"
    // Nothing was translated here, so there is nothing for a
    // translation committee to have checked it against. What a reader
    // wants to know about a transcription is whether an editor has
    // read it beside the page it came from.
    ? {
      reviewed: { label: "Reviewed", cls: "is-reviewed",
        note: "An editor has read this work against the printed original." },
      needs: { label: "Needs review", cls: "is-needs",
        note: "No editor has read this work against the printed original yet." },
    }
    : {
      reviewed: { label: "Reviewed", cls: "is-reviewed",
        note: "The translation committee has reviewed this work against the original." },
      needs: { label: "Needs review", cls: "is-needs",
        note: "The translation committee has not reviewed this work yet." },
    };

  // ── The tab ───────────────────────────────────────────────────
  //
  // Collapsed, because most readers came to read rather than to audit.
  // But the summary line is not a label: it carries the three facts
  // that decide whether to trust the page, so a reader who never opens
  // it has still been told. Hiding "translated by a machine" behind a
  // click would be a disclosure that discloses nothing.

  // Early English Books is not a translation and never was: the text
  // is the printed book, transcribed by EEBO-TCP. What it needs
  // disclosed is a different thing, which is that the transcription is
  // somebody else's work and that the reader's own modernizer changes
  // the spelling in front of them.
  if (corpus === "eebo") {
    draw({
      title: "How this text was made",
      fact: "EEBO-TCP transcription",
      head: "This is a transcription of the printed book, not a translation.",
      body: "The text comes from the Early English Books Text Creation Partnership, "
        + "which transcribed the printed page as it was set. Nothing on this page has "
        + "been translated. Modernize, in Tools, rewrites the spelling and the older "
        + "verb endings for reading. Switching it off returns the words to the form the "
        + "compositor set them in.",
    });
    return;
  }

  if (!AI_COLLECTIONS.has(corpus)) return;

  // The work answers for itself. The reader stamps the language of the
  // original it is showing beside the English, or an empty string if
  // there is none, once the work's metadata lands.
  //
  // This matters because a collection is not a claim about a text. The
  // Latin Library holds 732 English divines writing in English, and
  // calling William Ames a translation from the Latin because of the
  // shelf he sits on is simply false.
  function stamped() {
    return document.documentElement.getAttribute("data-fr-original-lang");
  }

  function whenAnswered() {
    if (stamped() !== null) return Promise.resolve(stamped());
    return new Promise((resolve) => {
      const obs = new MutationObserver(() => {
        if (stamped() === null) return;
        obs.disconnect();
        window.clearTimeout(timer);
        resolve(stamped());
      });
      obs.observe(document.documentElement, {
        attributes: true, attributeFilter: ["data-fr-original-lang"],
      });
      // A work that never answers gets no label. Silence must not
      // become a claim in either direction.
      const timer = window.setTimeout(() => { obs.disconnect(); resolve(null); }, 8000);
    });
  }

  const resolve = corpus === "confessions"
    // The creeds ship no original, so they are asked where they came
    // from instead.
    ? fetch(`${BASE}/v1/works/${encodeURIComponent(workId)}/meta.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => (m && !ENGLISH_ORIGIN.test(String(m.region || "")) ? "the original" : ""))
      .catch(() => "")
    : whenAnswered();

  resolve.then((source) => {
    if (!source) return;
    draw({
      // "Transparency", not "Translation Transparency". Ian,
      // 2026-09-21. In the rail the longer name wrapped to two lines
      // and spent them both saying what the panel below it says
      // anyway; the first fact on the summary line is already "AI
      // translated from Latin".
      title: "Transparency",
      fact: `AI translated from ${escapeHtml(source)}`,
      head: "This English was translated by a machine.",
      // The controls it names are the reader's current ones (Ian,
      // 2026-09-23): the language button and Scan, both in Tools.
      body: `The English on this page was produced from the ${escapeHtml(source)} by `
        + "artificial intelligence. It has not been reviewed by the translation committee "
        + "unless this panel says so. To check any sentence yourself, open Tools and set "
        + "the language button to Both. The original then sits beside the English. Where "
        + "a scan of the printed page exists, Scan in Tools shows it too.",
    });
  });

  // `intro` carries four strings, already escaped by the caller: the
  // tab's name, the first fact on its summary line, and the two
  // paragraphs of the disclosure. Everything below it, the review
  // state, the report counts and the correction history, is the same
  // for every collection because it comes from the same table.
  /*
   * WHERE THE PANEL LIVES, decided once it has something to say.
   *
   * Ian, 2026-09-21: "can you move that entire thing to the top of the
   * TOC sidebar?" Above the text it ran the full width of the reading
   * pane while the text below sat in a centred measure, so it read as a
   * system banner rather than a note about this work, and it pushed the
   * text down on every page turn.
   *
   * ONLY WHERE THE SIDEBAR IS ACTUALLY ON SCREEN. Below 880px the
   * reader has no sidebar -- it becomes a drawer behind a cell in the
   * thumb dock -- and this is an AI disclosure. Putting it there on a
   * phone would mean a reader could read a machine translation start to
   * finish without ever being told, which is the one outcome the panel
   * exists to prevent. On those widths it stays where it was, above the
   * text, which is also where the reading column is full-bleed anyway
   * and the width complaint does not arise.
   *
   * Moved rather than copied: one node, so the fetch that fills it and
   * the Report hook inside it cannot end up bound to a stale twin.
   */
  function place(node, tries) {
    if (document.documentElement.classList.contains("g-mobile")) return;
    // The ported reader shows the panel in a dialog from its toolbar's
    // Transparency button (faith-port-read-drawer.js, 2026-09-23).
    if (node.closest && node.closest(".fr-tt-box")) return;
    /* INSIDE #nav, NOT ABOVE IT. The sidebar's own top sits about
       thirty pixels under the fixed toolbar -- measured on the live
       reader, and true of the Outline/Library tabs before this panel
       existed, so it is the reader's condition and not something the
       panel introduced. A block pinned above #nav would put its title
       permanently in that dead strip; inside #nav it is the first thing
       in the scroller, gets exactly the treatment the tabs already get,
       and scrolls clear the moment anyone moves. #nav survives a page
       turn (checked: a marker in it outlives #reading being replaced),
       so the panel is not rebuilt out from under its own fetch. */
    const rail = document.querySelector("#app .sidebar #nav");
    if (rail) {
      if (node.parentElement === rail) return;
      node.classList.add("is-rail");
      rail.insertBefore(node, rail.firstChild);
      return;
    }
    // The rail is built by the port's own reader-core, and this panel
    // waits on a fetch, so it is normally there first -- but "normally"
    // is not a guarantee worth a silent full-width panel above the text
    // if the order ever changes. Retried briefly, then left where it is,
    // which is the old arrangement and not a broken one.
    const left = tries === undefined ? 20 : tries;
    if (left > 0) window.setTimeout(() => place(node, left - 1), 150);
  }

  function draw(intro) {
  mount.innerHTML =
    `<details class="fr-tt">`
    + `<summary class="fr-tt-head">`
    + `<span class="fr-tt-title">${intro.title}</span>`
    + `<span class="fr-tt-facts" data-tt-facts>`
    + `<span class="fr-tt-fact">${intro.fact}</span>`
    + `</span>`
    + `<span class="fr-tt-caret" aria-hidden="true"></span>`
    + `</summary>`
    + `<div class="fr-tt-body" data-tt-body>`
    + `<div class="fr-ai-note">`
    + `<p class="fr-ai-note-head">${intro.head}</p>`
    + `<p class="fr-ai-note-body">${intro.body}</p>`
    + `</div>`
    + `<div class="fr-tt-rows" data-tt-rows></div>`
    // The way to say this work is wrong, at the foot of the one block
    // on the page about whether it can be trusted. Ian, 2026-09-21: the
    // control was buried in the Aa menu among the type controls, where
    // nobody would look for it. [data-report-issue] is the hook
    // faith-report-issue.js listens for anywhere on the page, so this
    // needs no script of its own.
    + `<button type="button" class="fr-tt-report" data-report-issue>`
    + `\u2691 Report a problem with this work</button>`
    // The standing policy behind the panel: how works are made, who
    // reviews them, what gets corrected. The panel says what is true of
    // THIS work; this says what is true of all of them. Ian,
    // 2026-09-21: a button under Report, to our Commitment.
    + `<a class="fr-tt-commit" href="/the-faith-received/transparency/">`
    + `Our commitment to transparency</a>`
    + `</div></details>`;
  mount.hidden = false;
  place(mount);

  const factsEl = mount.querySelector("[data-tt-facts]");
  const rowsEl = mount.querySelector("[data-tt-rows]");

  fetch(`${BASE}/v1/work-status?c=${encodeURIComponent(corpus)}&w=${encodeURIComponent(workId)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data || !data.ok || !data.works) return;
      const w = data.works[workId];
      if (!w) return;

      const state = REVIEW[w.review] || REVIEW.needs;
      const open = (w.reports && w.reports.open) || 0;
      const done = (w.reports && w.reports.done) || 0;
      const revs = w.revisions || [];

      // The summary line, so the tab says something before it is opened.
      const facts = [intro.fact, escapeHtml(state.label)];
      if (open) facts.push(`${open.toLocaleString()} open report${open === 1 ? "" : "s"}`);
      if (revs.length) facts.push(`${revs.length.toLocaleString()} correction${revs.length === 1 ? "" : "s"}`);
      factsEl.innerHTML = facts.map((f) => `<span class="fr-tt-fact">${f}</span>`).join("");

      const reviewed = w.review === "reviewed" && w.reviewedAt
        ? `<span class="fr-status-when">${escapeHtml(when(w.reviewedAt))}</span>` : "";
      // Both numbers, always. Showing only the open ones would let a
      // work corrected twenty times look untouched.
      const reports = (open || done)
        ? `<b>${open.toLocaleString()}</b> open <span class="fr-status-sep">&middot;</span> `
          + `<b>${done.toLocaleString()}</b> settled`
        : `No issues reported yet`;

      const history = revs.length
        ? `<ol class="fr-status-revs">${revs.map((r) =>
          `<li><span class="fr-status-rev-date">${escapeHtml(when(r.at))}</span>`
          + `<span class="fr-status-rev-what">${escapeHtml(r.summary)}</span></li>`).join("")}</ol>`
        : `<p class="fr-tt-empty">Nothing has been changed in this work yet.</p>`;

      rowsEl.innerHTML =
        `<div class="fr-tt-row">`
        + `<span class="fr-tt-label">Review</span>`
        + `<span class="fr-tt-value"><span class="fr-status-badge ${state.cls}">`
        + `${escapeHtml(state.label)}</span> ${reviewed}`
        + `<span class="fr-status-note">${escapeHtml(state.note)}</span></span></div>`
        + `<div class="fr-tt-row">`
        + `<span class="fr-tt-label">Reported issues</span>`
        + `<span class="fr-tt-value">${reports}</span></div>`
        + `<div class="fr-tt-row">`
        + `<span class="fr-tt-label">Corrections</span>`
        + `<span class="fr-tt-value">${history}</span></div>`;
    })
    .catch(() => { /* the notice in the body stands on its own */ });
  }
  }
}(typeof window === "undefined" ? this : window));
