/*
 * Reader acceptance battery — the bugs of 2026-09-11, written down so
 * they cannot come back.
 *
 * WHY THIS IS A BROWSER SCRIPT. The reader is a DOM program. There is no
 * DOM library in this repo, and the corpora it reads are fetched at
 * runtime, so nothing here can be asserted from Node. This runs in the
 * page, against the deployed site, and asserts on what the reader
 * actually drew.
 *
 * WHY IT ASSERTS ON THE PAGE AND NOT ON THE CODE. The point of this file
 * is to survive a change of reader. `faith-reader.js` may be replaced by
 * the ported page-native reader (READER-SPEC §0); when it is, every
 * assertion below must still hold, and not one of them names a function,
 * a class of ours, or a file. They name what a reader must show.
 *
 * HOW TO RUN. Open a reader URL listed in CASES, paste this file into
 * the console, and call:
 *
 *     await readerAcceptance()
 *
 * It picks the case matching the current URL and prints a pass/fail
 * table. Run it on all five URLs. Five green is the bar; four is a fail.
 *
 * THE NUMBERS ARE GROUND TRUTH, measured on 2026-09-11 against the live
 * site after each fix. Where a bound is loose ("at least 40 paragraphs")
 * it is loose on purpose: the exact count is an artefact of one
 * renderer, the floor is the thing that must not regress.
 */
(function () {
  "use strict";

  const CASES = [
    {
      name: "Native work: paragraphs and headings come from the TEI",
      match: (u) => /[?&]w=coccejus-summa-theologiae/.test(u),
      /* The wall of text. Every sharded native work rendered as ONE
       * block per section: a median paragraph of 160,748 characters.
       * The corpus ends a paragraph with a single newline and carries no
       * blank lines at all, and the renderer was joining them up.
       * Headings existed only in the TEI, which the shard path never
       * read. Fixed b6beb8d (paragraphs) and 1b0813b (TEI). */
      async run(t) {
        const d = await openSection(20);
        const en = d.querySelectorAll(".faith-col-en p, .row .en p, .folio p");
        const hs = d.querySelectorAll("h1,h2,h3,h4,.csub,.rhead");
        const lens = [...en].map((p) => p.textContent.length).sort((a, b) => a - b);
        t.atLeast("paragraphs in the section", en.length, 40);
        t.atLeast("headings in the section", hs.length, 1);
        t.atMost("median paragraph length", lens[Math.floor(lens.length / 2)] || 0, 2000);
        t.atMost("longest paragraph", lens[lens.length - 1] || 0, 20000);
      },
    },
    {
      name: "Augustine: no drawer without a name, no drawer without content",
      match: (u) => /[?&]w=Ench_175/.test(u),
      /* The source ships ten <details class="collapse-question">, eight
       * with an empty <span class="head-la"></span>. Seven rendered as a
       * bar with a chevron and nothing written on it; an eighth, "On
       * Faith", had a name and no content. Fixed 58c177e / 86322ee. */
      async run(t) {
        await settle(() => document.querySelectorAll(".faith-section-details, .folio").length > 0);
        const secs = [...document.querySelectorAll(".faith-section-details")];
        const books = [...document.querySelectorAll(".faith-book-details")];
        const nameless = books.filter((b) => {
          const l = b.querySelector(":scope > summary .faith-part-eyebrow, :scope > summary .faith-book-label");
          return !l || !l.textContent.trim();
        });
        const untitled = secs.filter((s) => {
          const h = s.querySelector(".faith-section-title");
          return !h || !h.textContent.trim();
        });
        t.atLeast("sections", secs.length, 20);
        t.is("nameless part bars", nameless.length, 0);
        t.is("sections with no title", untitled.length, 0);
        t.ok("the part heading survived", /On Faith/.test(document.body.innerText));
        t.ok("no work-load error", !/Could not load this work/.test(document.body.innerText));
      },
    },
    {
      name: "Augustine: citations sit in the sentence, not below it",
      match: (u) => /c=augustine/.test(u),
      /* .aug-note was styled display:block with a rule down its side, on
       * the assumption it was editorial apparatus. It is the
       * parenthetical reference a critical edition prints inside the
       * sentence: 5,307 of them across 5,453 rows, 4,641 followed
       * immediately by punctuation, so the sentence's own full stop was
       * stranded on a line of its own. Fixed 58c177e. */
      async run(t) {
        const d = await openSection(0);
        const note = d.querySelector(".aug-note");
        t.ok("a citation note is present to test", !!note);
        if (note) t.is("its display", getComputedStyle(note).display, "inline");
        const body = d.textContent || "";
        t.is("orphaned stops on their own line", (body.match(/\n\s*[.?;]\s*\n/g) || []).length, 0);
      },
    },
    {
      name: "EEBO: the work loads, and its heading is printed once",
      match: (u) => /c=eebo/.test(u),
      /* Two bugs. The .json.gz keys arrive ALREADY DECODED (content
       * encoding br), and inflating them regardless made all 15,569 EEBO
       * works unreadable behind "we could not reach the service", which
       * blamed the reader for our bug. And 90% of EEBO leaves open with
       * a <b> repeating the label the drawer already prints. */
      async run(t) {
        await settle(() => document.querySelectorAll(".faith-section-details, .folio").length > 0);
        t.ok("no work-load error", !/Could not load this work|could not reach the service/i.test(document.body.innerText));
        const secs = [...document.querySelectorAll(".faith-section-details")];
        t.atLeast("sections", secs.length, 1);
        const norm = (s) => s.replace(/\W+/g, "").toLowerCase();
        let dup = 0;
        secs.forEach((s) => {
          const h = s.querySelector(".faith-section-title");
          const b = s.querySelector(".faith-section-body");
          if (!h || !b || !b.firstElementChild) return;
          const a = norm(b.firstElementChild.textContent.trim());
          if (a.length > 3 && norm(h.textContent).startsWith(a.slice(0, 40))) dup += 1;
        });
        t.is("headings printed twice", dup, 0);
      },
    },
    {
      name: "Ask: a work the library holds is linked when the answer names it",
      match: (u) => /\/the-faith-received\/ask\//.test(u),
      /* Ask linked only works retrieval returned, so it named the Summa
       * contra Gentiles — four volumes on the shelf — and left it dead.
       * Run this AFTER asking a question that names a held work. */
      async run(t) {
        const links = document.querySelectorAll("a.ask-work-link");
        t.atLeast("work links in the answer", links.length, 1);
        let bad = 0;
        links.forEach((a) => { if (!/\/the-faith-received\/reader\/\?/.test(a.getAttribute("href") || "")) bad += 1; });
        t.is("links that do not reach the reader", bad, 0);
      },
    },
  ];

  /* ── helpers ──────────────────────────────────────────────────── */

  function settle(pred, ms) {
    const limit = ms || 20000;
    const started = Date.now();
    return new Promise((res, rej) => {
      const tick = () => {
        let ok = false;
        try { ok = !!pred(); } catch (_) { ok = false; }
        if (ok) return res(true);
        if (Date.now() - started > limit) return rej(new Error("timed out waiting for the reader"));
        setTimeout(tick, 250);
      };
      tick();
    });
  }

  /* Open the nth section and wait for it to fill. Written against the
   * <details> reader AND a continuous-scroll one: where there are no
   * drawers the whole work is already on the page and the reading
   * surface is returned as it stands. */
  async function openSection(n) {
    await settle(() => document.querySelectorAll(".faith-section-details, .folio").length > 0);
    const secs = [...document.querySelectorAll(".faith-section-details")];
    if (!secs.length) return document.querySelector("#reading, [data-fr-content]") || document.body;
    const d = secs[Math.min(n, secs.length - 1)];
    d.open = true;
    await settle(() => {
      const b = d.querySelector(".faith-section-body");
      return b && b.textContent.trim().length > 200 && !/Loading/.test(b.textContent.slice(0, 40));
    });
    return d;
  }

  function recorder() {
    const rows = [];
    const T = {
      ok: (what, cond) => rows.push({ what, got: cond ? "yes" : "no", want: "yes", pass: !!cond }),
      is: (what, got, want) => rows.push({ what, got, want, pass: got === want }),
      atLeast: (what, got, want) => rows.push({ what, got, want: `>= ${want}`, pass: got >= want }),
      atMost: (what, got, want) => rows.push({ what, got, want: `<= ${want}`, pass: got <= want }),
    };
    return { T, rows };
  }

  window.readerAcceptance = async function readerAcceptance() {
    const url = location.href;
    const hit = CASES.filter((c) => c.match(url));
    if (!hit.length) {
      const urls = [
        "/the-faith-received/reader/?w=coccejus-summa-theologiae",
        "/the-faith-received/reader/?c=augustine&w=Ench_175",
        "/the-faith-received/reader/?c=eebo&w=14266",
        "/the-faith-received/ask/  (after asking a question naming a held work)",
      ];
      return { error: "No case matches this URL. Run on:", urls };
    }
    const out = [];
    for (const c of hit) {
      const { T, rows } = recorder();
      try {
        await c.run(T);
      } catch (err) {
        rows.push({ what: "ran to completion", got: String(err && err.message), want: "no error", pass: false });
      }
      out.push({ case: c.name, pass: rows.every((r) => r.pass), rows });
    }
    const green = out.every((c) => c.pass);
    try {
      out.forEach((c) => {
        console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.case}`);
        console.table(c.rows);
      });
      console.log(green ? "ALL GREEN" : "FAILURES ABOVE");
    } catch (_) { /* console.table is a convenience, not a dependency */ }
    return { green, cases: out };
  };
})();
