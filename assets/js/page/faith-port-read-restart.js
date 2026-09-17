/*
 * A way back to the first page, for a reader the book put down for them.
 *
 * The ported reader restores your place silently: leave on page 18 and
 * you come back to page 18, no prompt and no click. That is the right
 * default — it is what a bookmark in a physical book does — but it
 * quietly takes away the one thing a prompt gave you, which is the
 * choice to start over. Someone returning to a work they read three
 * pages of last month has no obvious way back to its title page.
 *
 * So this adds the missing half and nothing else. It does NOT track
 * position, store anything, or restore anything: reader-core.js owns
 * all of that, and a second writer to fr_lastread would be two systems
 * fighting over one scroll on load. This only notices that a restore
 * happened, and offers the door out.
 *
 * HOW IT LEAVES. By setting ?p=1 and reloading, because READER-SPEC §1
 * already says an explicit ?p= beats the saved position. Using the
 * reader's own contract rather than reaching into its internals is what
 * lets this keep working the next time the reader is replaced.
 */
(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const work = params.get("w") || params.get("ws");
  if (!work) return;

  // An explicit page, a highlight, or a hash means the reader was sent
  // somewhere on purpose. Nothing was restored, so nothing is offered.
  if (params.get("p") || params.get("hl") || window.location.hash) return;

  function savedPage() {
    try {
      const all = JSON.parse(window.localStorage.getItem("fr_lastread") || "{}");
      const mine = all && all[work];
      return mine && Number(mine.page) ? Number(mine.page) : 0;
    } catch (_) {
      return 0;
    }
  }

  // The same floor the reader itself uses: a saved position of three
  // pages or fewer is not a place anyone needs rescuing from.
  const page = savedPage();
  if (page <= 3) return;

  function show() {
    if (document.getElementById("frRestart")) return;
    const host = document.querySelector(".reader-reference")
      || document.querySelector(".reader-identity");
    if (!host) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "frRestart";
    btn.className = "fr-restart";
    btn.textContent = "Start from the beginning";
    btn.title = `You were left at page ${page}. Open this work at its first page instead.`;
    btn.addEventListener("click", () => {
      // The hash has to go too. Restoring your place leaves #b18-0 on
      // the URL, and a block anchor beats ?p= in the reader's own
      // landing order — so setting the search alone reloaded straight
      // back to page 18, which is the opposite of the button's name.
      //
      // Dropped with replaceState first, then the search is set, which
      // is what actually reloads. Assigning location.href would do both
      // at once and is forbidden here for a good reason: it takes a
      // whole URL and so has to be trusted. This only ever edits the
      // URL the browser is already on.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      const next = new URLSearchParams(window.location.search);
      next.set("p", "1");
      window.location.search = next.toString();
    });
    host.appendChild(btn);
  }

  // Offered only once the restore has actually happened. Offering first
  // would put the link in front of a reader who was starting at the top
  // anyway, and the scroll lands a beat after the text does.
  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    const el = document.getElementById("scroll");
    if (el && el.scrollTop > 1000) {
      window.clearInterval(timer);
      show();
    } else if (tries > 40) {
      window.clearInterval(timer);
    }
  }, 400);
})();
