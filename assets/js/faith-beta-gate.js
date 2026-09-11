/*
 * The Faith Received beta gate — the signed-in half.
 *
 * Read partials/faith-received/_beta-gate.hbs first. That file carries
 * the whole contract; this one implements exactly one clause of it.
 *
 * WHAT THIS FILE DOES NOT DO, and why that matters: it does not hide
 * anything and it does not reveal anything. The gate's visibility is
 * decided before this script exists — either server-side by a
 * Handlebars {{#if @member}} (the markup is never sent) or by the
 * [data-tfr-gate] rules in assets/css/faith-received.css, which key off
 * body[data-member-status] and arrive in a render-blocking <link> in
 * <head>. Both are correct at first paint. A JS reveal would put the
 * tools on screen one frame late for every member and is exactly the
 * flash the CSS exists to avoid, so there is deliberately no reveal
 * path here to "fix" later.
 *
 * WHAT IT DOES: claims the TFR and TFR-Beta Kit tags for the member who
 * is looking at the page. One POST to mo-kit's /tfr-beta, carrying the
 * member's own Ghost identity JWT (window.MOAuth.fetch attaches it; the
 * kit worker host is in default.hbs's mo-trusted-hosts meta, which is
 * what makes that attachment legal). The endpoint takes no email —
 * mo-kit reads the identity off the verified token, so this cannot be
 * used to tag somebody else.
 *
 * WHY THE TAGS ARE CLAIMED HERE RATHER THAN AT SIGNUP. Two reasons,
 * both written out in the partial's header: Ghost's sendMagicLink
 * ignores `labels` for an address that already exists, so a signup form
 * cannot reliably write them; and Ian chose the emailed magic link over
 * silent member creation precisely so the address is confirmed before
 * anything lands in Kit. A member reading this page has clicked the
 * link. That is the confirmation.
 *
 * It follows that this also catches people who never touched the gate
 * box — an existing member who simply opened the research page. That is
 * intended. TFR-Beta is "has access to the tools during the beta", and
 * every signed-in member does.
 *
 * MOAuth ships in boot.min.js in <head>, so it is already on the page
 * by the time any page-bottom script runs (page scripts run BEFORE
 * site.min.js; only head/boot globals are safe to depend on, which
 * MOAuth is). Everything here is still written defensively: a missing
 * MOAuth, a missing worker URL or a failed request all end as a silent
 * return. Nothing a reader can see depends on this call succeeding.
 */
(function () {
  // Signed out: the gate box is what is on screen, and there is no
  // identity to tag. Nothing to do. default.hbs only writes
  // data-member-status for a signed-in member, free included.
  const status = (document.body && document.body.getAttribute("data-member-status")) || "";
  if (!status) return;

  const base = (document.body.getAttribute("data-kit-worker-url") || "").replace(/\/+$/, "");
  if (!base) return;
  if (!window.MOAuth || typeof window.MOAuth.fetch !== "function") return;

  /*
   * Client-side "already done" marker. Bump the version suffix if the
   * tag set ever changes, which re-claims for everybody.
   *
   * This is a politeness cache, not the idempotency guarantee. mo-kit's
   * /tfr-beta is idempotent on its own (it merges Ghost labels rather
   * than replacing them, and Kit tagging only ever adds), and it holds
   * its own KV dedup key. So a cleared localStorage, a second browser
   * or a private window costs one extra no-op request and nothing else.
   * Never make a correctness claim rest on storage the reader can wipe.
   */
  const MARK = "mo_tfr_beta_claimed_v1";
  try {
    if (window.localStorage && localStorage.getItem(MARK) === status) return;
  } catch (_) { /* private mode: fall through and just make the call */ }

  function claim() {
    window.MOAuth.fetch(`${base}/tfr-beta`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }).then((res) => {
      if (!res || !res.ok) return;
      // Keyed by status so a free member who upgrades re-claims once and
      // mo-kit gets a fresh look at them. Cheap, and it keeps the Kit
      // tag state honest across a tier change.
      try { if (window.localStorage) localStorage.setItem(MARK, status); } catch (_) {}
    }).catch(() => {
      // Deliberately silent. A reader whose tagging failed still has the
      // tools; surfacing this would be noise about our own bookkeeping.
    });
  }

  // Off the critical path. The tools are already interactive and this
  // call is bookkeeping, so it waits for an idle moment rather than
  // competing with the first fetch a reader actually triggers.
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(claim, { timeout: 4000 });
  } else {
    window.setTimeout(claim, 1200);
  }
})();
