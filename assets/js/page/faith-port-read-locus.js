/*
 * When a citation points at a page this work does not have, say so.
 *
 * "Read the passage" on a mined position, on a comparison, and on an
 * Ask citation all open the reader at ?p=<n>. If the work has no such
 * page the reader does not fail: it renders page one. Measured on the
 * live site, /read/?w=pld-2741&p=9999 produces a page byte-identical to
 * /read/?w=pld-2741 with no p at all, 41,678 characters beginning at
 * col. 245. Nothing on screen distinguishes "here is the passage you
 * asked for" from "that passage is not in this edition, here is the
 * beginning".
 *
 * That is the worst kind of wrong answer. A reader who followed a
 * citation is looking for a specific sentence; landing silently on the
 * first page invites them to conclude the index lied about the content,
 * when what actually happened is that the locus did not resolve.
 *
 * WHY LOCI MISS. The mined records carry the PRINTED locus, the column
 * number Migne set, while ?p= is the reader's page index. For most of
 * the Patrologia the two ranges do not even overlap: pld-2741 is cited
 * at columns 247 to 483 and paginates 1 to 484, which happens to look
 * plausible, but a work printed at columns 826 to 886 has about sixty
 * pages and every citation into it is out of range. Correcting the
 * records is a corpus job. Telling the truth about them is this file.
 *
 * WHAT IT DOES NOT DO: guess. It does not scroll somewhere near, and it
 * does not hide the work. The text is still the right work, and the
 * reader is told which locus could not be found so they can look for it
 * themselves.
 *
 * The parameter is read at parse time because the reader rewrites the
 * address as soon as it routes: by the time this could observe the page
 * settling, location.search says ?w=pld-2741&pldpart=all and the p is
 * gone.
 */
(function () {
  "use strict";

  let asked = null;
  try {
    const raw = new URLSearchParams(window.location.search).get("p");
    if (raw && /^\d+$/.test(raw)) asked = parseInt(raw, 10);
  } catch (_) { asked = null; }
  if (!asked) return;

  const SETTLE = 400;
  const GIVE_UP = 40; // 16s: the total is painted with the work

  function total() {
    const el = document.getElementById("pgTotal");
    const m = el && (el.textContent || "").match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function tell(n) {
    if (document.getElementById("frLocusMiss")) return;
    const host = document.getElementById("reading");
    if (!host) return;
    const note = document.createElement("p");
    note.id = "frLocusMiss";
    note.className = "fr-locus-miss";
    note.setAttribute("role", "status");
    note.textContent =
      `The citation you followed points to ${asked}, which this edition does not `
      + `carry: it runs to ${n}. The work is open at its first page.`;
    host.insertBefore(note, host.firstChild);
  }

  let ticks = 0;
  const timer = window.setInterval(() => {
    const n = total();
    if (n) {
      window.clearInterval(timer);
      // Only when it genuinely cannot be reached. A locus inside the
      // work resolved, whether or not it landed where the index meant.
      if (asked > n) tell(n);
      return;
    }
    if (++ticks >= GIVE_UP) window.clearInterval(timer);
  }, SETTLE);
})();
