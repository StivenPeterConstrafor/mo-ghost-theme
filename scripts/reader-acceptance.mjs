/*
 * Reader acceptance battery.
 *
 * WHY IT IS A NODE SCRIPT AND NOT A CONSOLE PASTE. The previous version
 * of this file ran by being pasted into a browser console, which meant
 * it ran wherever I happened to be looking. Everything available to me
 * paints nothing: no animation frames, no scroll events, no
 * IntersectionObserver callbacks. On 2026-09-11 that cost three
 * regressions found by the owner and one revert of a change that was
 * fine. This drives a real Chrome instead, and refuses to report
 * anything until it has proved that Chrome renders.
 *
 * WHY THE OLD ASSERTIONS WOULD NOT HAVE HELPED. They opened a section by
 * setting `.open = true` and waited for text. Sections are open from the
 * start now and fill as they are approached, so that wait could only
 * ever time out — and worse, a reader with NO text in it would have
 * passed the checks that did run. The battery has to exercise the thing
 * that actually loads text: scrolling.
 *
 * WHAT IT ASSERTS. Only what a reader would notice, never how the code
 * is written, so it survives the reader being replaced by the ported
 * one (READER-SPEC 0):
 *
 *   1. the work reads continuously, with nothing hidden behind a click
 *   2. it does NOT arrive all at once
 *   3. scrolling brings the next part            <- caught nothing before
 *   4. paragraphs are paragraphs and headings are headings
 *   5. Find searches the whole work              <- broke 2026-09-11
 *   6. an Ask citation lands and marks its words <- broke 2026-09-11
 *   7. no division is nameless or empty          (Enchiridion)
 *   8. a work's heading is printed once          (EEBO)
 *
 * RUN:  node scripts/reader-acceptance.mjs [--base https://…]
 */
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH
  || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseArg = process.argv.indexOf("--base");
const BASE = baseArg > -1 ? process.argv[baseArg + 1] : "https://mereorthodoxy.com";
const READER = `${BASE}/the-faith-received/reader/`;

const results = [];
function record(name, rows) {
  const pass = rows.every((r) => r.pass);
  results.push({ name, pass, rows });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  rows.forEach((r) => {
    if (!r.pass) console.log(`        ${r.what}: got ${r.got}, want ${r.want}`);
  });
}
const T = (rows) => ({
  ok: (what, cond) => rows.push({ what, got: cond ? "yes" : "no", want: "yes", pass: !!cond }),
  is: (what, got, want) => rows.push({ what, got, want, pass: got === want }),
  atLeast: (what, got, want) => rows.push({ what, got, want: `>= ${want}`, pass: got >= want }),
  atMost: (what, got, want) => rows.push({ what, got, want: `<= ${want}`, pass: got <= want }),
});

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 900 },
});

/* The surface proves itself before it is allowed to judge anything. */
{
  const page = await browser.newPage();
  await page.setContent('<!doctype html><body style="margin:0"><div style="height:3000px"></div><div id="t">x</div><div style="height:3000px"></div>');
  const env = await page.evaluate(async () => {
    const o = { vis: document.visibilityState, raf: 0, io: 0, scroll: 0 };
    requestAnimationFrame(() => { o.raf += 1; });
    new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) o.io += 1; }))
      .observe(document.getElementById("t"));
    addEventListener("scroll", () => { o.scroll += 1; }, { passive: true });
    await new Promise((r) => setTimeout(r, 250));
    scrollTo(0, 3000);
    await new Promise((r) => setTimeout(r, 500));
    return o;
  });
  await page.close();
  if (env.vis !== "visible" || !env.raf || !env.io || !env.scroll) {
    console.error("This browser does not render. Nothing below would mean anything.");
    console.error(JSON.stringify(env));
    await browser.close();
    process.exit(2);
  }
  console.log("Browser renders: frames, scroll and observers all fire.\n");
}

async function open(url, waitFor) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`        [page error] ${e.message}`));
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(waitFor, { timeout: 45000 }).catch(() => {});
  return page;
}

/* ── 1–4. A native work reads continuously and arrives in pieces ──── */
{
  const rows = [];
  const t = T(rows);
  // Waiting for sections is not waiting for text. The bar is built when
  // the first section fills, so a check that runs on "sections exist"
  // reads a page that has not loaded a word yet and reports the bar
  // missing. Wait for the first section to actually report loaded.
  const page = await open(
    `${READER}?w=coccejus-summa-theologiae`,
    "document.querySelector('[data-from][data-fr-state=\"loaded\"]') !== null");

  const start = await page.evaluate(() => ({
    sections: document.querySelectorAll(".faith-section-details").length,
    closed: [...document.querySelectorAll(".faith-section-details")].filter((d) => !d.open).length,
    loaded: document.querySelectorAll('[data-from][data-fr-state="loaded"]').length,
    bar: !!document.querySelector(".faith-here"),
    rows: document.querySelectorAll(".faith-here-acts button").length,
    dupRow: document.querySelectorAll("[data-fr-content] .faith-section-action").length,
  }));
  t.atLeast("sections", start.sections, 20);
  t.is("sections closed behind a click", start.closed, 0);
  t.atMost("sections loaded before scrolling", start.loaded, 6);
  t.ok("the position bar is there", start.bar);
  t.atLeast("actions on the bar", start.rows, 3);
  t.is("duplicate per-section action rows", start.dupRow, 0);

  // THE CHECK THAT WAS MISSING. Scroll, and the next part must arrive.
  const after = await page.evaluate(async () => {
    const secs = [...document.querySelectorAll(".faith-section-details")];
    secs[Math.min(12, secs.length - 1)].scrollIntoView({ block: "start" });
    await new Promise((r) => setTimeout(r, 4000));
    // The FIRST loaded section is the front matter, which is a title
    // page: one paragraph and no headings. Measuring it and calling the
    // reader broken is a test bug, and was one. Take the fullest
    // section that has actually loaded.
    const lanes = [...document.querySelectorAll('[data-fr-state="loaded"] .faith-col-en')];
    const lane = lanes.sort(
      (a, b) => b.querySelectorAll("p").length - a.querySelectorAll("p").length)[0];
    const ps = lane ? [...lane.querySelectorAll("p")] : [];
    const lens = ps.map((p) => p.textContent.length).sort((a, b) => a - b);
    return {
      loaded: document.querySelectorAll('[data-from][data-fr-state="loaded"]').length,
      chapter: (document.querySelector(".faith-here-chapter") || {}).textContent || "",
      paragraphs: ps.length,
      headings: document.querySelectorAll(
        '[data-fr-state="loaded"] .faith-col-en h1, [data-fr-state="loaded"] .faith-col-en h2, [data-fr-state="loaded"] .faith-col-en h3').length,
      median: lens.length ? lens[Math.floor(lens.length / 2)] : 0,
      longest: lens.length ? lens[lens.length - 1] : 0,
      addressed: document.querySelectorAll(".faith-col-en > .faith-parallel-block[id]").length,
    };
  });
  t.atLeast("sections loaded after scrolling", after.loaded, start.loaded + 1);
  t.ok("the bar names a chapter", after.chapter.trim().length > 0);
  t.atLeast("paragraphs in a loaded section", after.paragraphs, 10);
  t.atLeast("headings drawn from the source", after.headings, 1);
  t.atMost("median paragraph length", after.median, 2000);
  t.atMost("longest paragraph", after.longest, 40000);
  t.atLeast("paragraphs carrying an address", after.addressed, 10);

  /* ── 5. Find searches the whole work, not the part on screen ────── */
  const find = await page.evaluate(async () => {
    const input = document.querySelector(".faith-find-input");
    if (!input) return { ran: false };
    input.value = "God";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    // It loads the work first on a folio; give it room.
    for (let i = 0; i < 60; i += 1) {
      await new Promise((r) => setTimeout(r, 500));
      if (document.querySelectorAll("mark.faith-find-hit").length) break;
    }
    return {
      ran: true,
      hits: document.querySelectorAll("mark.faith-find-hit").length,
      pending: window.MOFaithReader ? window.MOFaithReader.sectionsPending() : -1,
    };
  });
  t.ok("the Find field exists", find.ran);
  if (find.ran) t.atLeast("Find highlights matches", find.hits, 1);

  await page.close();
  record("A native work: continuous, lazy, addressable, searchable", rows);
}

/* ── 6. An Ask citation lands on the passage and marks it ─────────── */
{
  const rows = [];
  const t = T(rows);
  const quote = "Creation is the production of a new thing by command";
  const page = await open(
    `${READER}?w=coccejus-summa-theologiae&p=221&q=${encodeURIComponent(quote)}`,
    "document.querySelectorAll('.faith-section-details').length > 0");
  const landed = await page.evaluate(async () => {
    for (let i = 0; i < 40; i += 1) {
      await new Promise((r) => setTimeout(r, 500));
      if (document.querySelector("mark, .faith-quote-hit, .faith-page-target")) break;
    }
    const mark = document.querySelector("mark, .faith-quote-hit");
    return {
      marked: !!mark,
      onScreen: mark
        ? (() => { const b = mark.getBoundingClientRect();
            return b.top > -200 && b.top < window.innerHeight + 200; })()
        : false,
      scrolled: window.scrollY,
    };
  });
  t.ok("the cited words are marked", landed.marked);
  t.ok("the mark is on screen", landed.onScreen);
  t.ok("the reader was moved off the top", landed.scrolled > 200);
  await page.close();
  record("An Ask citation lands on its passage", rows);
}

/* ── 7. No division is nameless or empty ─────────────────────────── */
{
  const rows = [];
  const t = T(rows);
  const page = await open(
    `${READER}?c=augustine&w=Ench_175`,
    "document.querySelectorAll('.faith-section-details').length > 0");
  const r = await page.evaluate(() => {
    const secs = [...document.querySelectorAll(".faith-section-details")];
    const books = [...document.querySelectorAll(".faith-book-details")];
    return {
      error: /Could not load this work/.test(document.body.innerText),
      sections: secs.length,
      untitled: secs.filter((s) => {
        const h = s.querySelector(".faith-section-title");
        return !h || !h.textContent.trim();
      }).length,
      nameless: books.filter((b) => {
        const l = b.querySelector(":scope > summary .faith-part-eyebrow");
        return !l || !l.textContent.trim();
      }).length,
      keptHeading: /On Faith/.test(document.body.innerText),
    };
  });
  t.ok("the work loads", !r.error);
  t.atLeast("sections", r.sections, 20);
  t.is("sections with no title", r.untitled, 0);
  t.is("part bars with no name", r.nameless, 0);
  t.ok("the part heading survived", r.keptHeading);
  await page.close();
  record("Augustine: nothing nameless, nothing empty", rows);
}

/* ── 8. A heading is printed once ────────────────────────────────── */
{
  const rows = [];
  const t = T(rows);
  const page = await open(
    `${READER}?c=eebo&w=14266`,
    "document.querySelectorAll('.faith-section-details').length > 0");
  const r = await page.evaluate(() => {
    const norm = (s) => s.replace(/\W+/g, "").toLowerCase();
    const secs = [...document.querySelectorAll(".faith-section-details")];
    let dup = 0;
    secs.forEach((s) => {
      const h = s.querySelector(".faith-section-title");
      const b = s.querySelector(".faith-section-body");
      if (!h || !b || !b.firstElementChild) return;
      const a = norm(b.firstElementChild.textContent.trim());
      if (a.length > 3 && norm(h.textContent).startsWith(a.slice(0, 40))) dup += 1;
    });
    return {
      error: /Could not load this work|could not reach the service/i.test(document.body.innerText),
      sections: secs.length,
      dup,
    };
  });
  t.ok("the work loads", !r.error);
  t.atLeast("sections", r.sections, 1);
  t.is("headings printed twice", r.dup, 0);
  await page.close();
  record("EEBO: it loads, and its heading is printed once", rows);
}

await browser.close();
const green = results.every((r) => r.pass);
console.log(`\n${green ? "ALL GREEN" : "FAILURES ABOVE"} — ${results.filter((r) => r.pass).length}/${results.length} cases`);
process.exit(green ? 0 : 1);
