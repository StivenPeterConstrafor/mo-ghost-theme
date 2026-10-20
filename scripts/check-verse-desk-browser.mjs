/*
 * The Verse Desk as a browser runs it (2026-10-19): the real scripture-dev-core.js, scripture-dev-desk.js, faith-port-scripture-notes.js,
 * verse-desk-model.js and verse-desk.js loaded into a DOM (jsdom) on John 1:1, and what the page ends up holding read back.
 *   A. everything loads: the modules are placed, the desk's own content stays, the older reception section is NOT drawn;
 *   B. the new modules fail (the model throws): nothing half-drawn is left, and the older reception section is drawn;
 *   C. verse-desk.js never loads: the older reception section is drawn at once;
 *   D. no verse in the address: the chooser, and no module.
 * Needs jsdom (not a dependency of the theme: `npm i --no-save jsdom`) and the network. Skips, and passes, without either.
 *   node scripts/check-verse-desk-browser.mjs
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
let JSDOM;
try { ({ JSDOM } = createRequire(import.meta.url)("jsdom")); } catch (_) { console.log("skip  desk in a DOM: jsdom is not installed (npm i --no-save jsdom)"); process.exit(0); }
const LIB = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
const UA = { "User-Agent": "curl/8.7.1" };
try { const r = await fetch(`${LIB}/v1/scripture/rank.json`, { headers: UA, method: "HEAD" }); if (!r.ok) throw new Error(String(r.status)); } catch (_) { console.log("skip  desk in a DOM: the library worker is not reachable"); process.exit(0); }

let failed = 0;
const ok = (c, m) => { if (!c) { failed += 1; console.error(`FAIL  ${m}`); } else console.log(`ok    ${m}`); };

const hbs = readFileSync(path.join(root, "custom-scripture-dev-desk.hbs"), "utf8");
const body = hbs.split("{{/contentFor}}")[1].replace(/\{\{!--[\s\S]*?--\}\}/g, "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<link[^>]*>/g, "").replace(/\{\{>[^}]*\}\}/g, "");
const cache = new Map();
const cached = (u) => { if (!cache.has(u)) cache.set(u, fetch(u, { headers: UA }).then(async (r) => ({ status: r.status, text: await r.text() }))); return cache.get(u); };

async function page({ search, load, breakModel }) {
  const dom = new JSDOM(`<!doctype html><html><head><meta name="tfr-library-base" content="${LIB}"></head><body>${body}</body></html>`,
    { url: `https://mereorthodoxy.com/the-faith-received/scripture/desk/${search}`, runScripts: "outside-only", pretendToBeVisual: true });
  const { window } = dom;
  const logged = [];
  window.console = { log() {}, info() {}, warn() {}, error: (...a) => logged.push(a.map((x) => (x && x.stack) || String(x)).join(" ")) };
  window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.Element.prototype.scrollIntoView = function scrollIntoView() {};
  for (const k of ["DecompressionStream", "Response", "Blob", "TextDecoder", "Uint8Array"]) if (!window[k]) window[k] = globalThis[k];
  window.MOSafeHref = { set: (el, href) => el.setAttribute("href", href) };
  window.fetch = async (u, o) => {
    const href = new URL(u, "https://mereorthodoxy.com/").href;
    const local = new URL(href);
    if (local.hostname === "mereorthodoxy.com" && existsSync(path.join(root, local.pathname))) {
      return new window.Response(readFileSync(path.join(root, local.pathname)), { status: 200 });
    }
    if (!href.startsWith(LIB)) return new window.Response("{}", { status: 404 });
    const r = await cached(href);
    return new window.Response(r.text, { status: r.status });
  };
  const run = (file) => window.eval(readFileSync(path.join(root, file), "utf8"));
  ["assets/js/port/scripture-kinds.js", "assets/js/page/scripture-source-groups.js", "assets/js/page/scripture-dev-core.js", "assets/js/page/scripture-dev-desk.js", "assets/js/page/commentary-anchor.js"].forEach(run);
  run("assets/js/page/faith-port-scripture-notes.js");
  if (load) {
    run("assets/js/page/verse-desk-model.js");
    if (breakModel) window.FRVerseDeskModel.build = () => { throw new Error("the model failed"); };
    run("assets/js/page/verse-desk.js");
  }
  return { window, logged };
}
const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };

// A. everything loads
{
  const { window, logged } = await page({ search: "?ref=john.1.1", load: true });
  const d = window.document;
  const done = await until(() => window.MOVerseDesk && window.MOVerseDesk.ok !== null, 60000);
  ok(done && window.MOVerseDesk.ok === true, "A: the modules render for John 1:1");
  const ids = [...d.querySelectorAll(".vd-modules > [data-vd]")].map((e) => e.dataset.vd);
  ok(["voices", "church", "dispute", "confess", "ladder", "heat", "share"].every((x) => ids.includes(x)), `A: every module is placed (${ids.join(", ")})`);
  ok(d.querySelector(".sd-desk-head.vd-on .vd-ruler") && d.querySelectorAll(".vd-tile").length === 4, "A: the verse card holds the ruler and four tiles");
  ok(d.querySelector(".vd-lede") && /Cited in 1,915 works/.test(d.querySelector(".vd-lede").textContent), "A: the lede is composed from the counts");
  await new Promise((r) => setTimeout(r, 1500));
  ok(!d.querySelector("#sd-h-reads"), "A: the older reception section is not drawn beside the new modules");
  ok(d.querySelector("[data-sd-parallel]") && d.querySelector("[data-sd-ask]") && d.querySelector("[data-sd-filters]") && d.querySelector("[data-sd-commentary-index]"), "A: the desk's translations, filters, commentaries and Ask are all still there");
  ok(d.querySelector(".sd-desk-toc a[href=\"#vd-confess\"]"), "A: the page's own table of contents names the new modules");
  ok(d.querySelector("link[rel=canonical]") && d.querySelector("link[rel=canonical]").href === "https://mereorthodoxy.com/the-faith-received/scripture/desk/?ref=john.1.1", "A: one canonical address for the verse");
  ok(d.querySelectorAll(".vd-voice").length >= 2 && [...d.querySelectorAll(".vd-voice a.vd-vlink")].every((a) => /^\/the-faith-received\/read\/\?w=/.test(a.getAttribute("href"))), "A: every key voice links to the reader");
  ok(logged.length === 0, `A: no exception logged (got: ${logged.slice(0, 2).join(" | ").slice(0, 300) || "none"})`);
  window.close();
}
// B. the modules fail
{
  const { window } = await page({ search: "?ref=john.1.1", load: true, breakModel: true });
  const d = window.document;
  await until(() => window.MOVerseDesk && window.MOVerseDesk.ok !== null, 60000);
  ok(window.MOVerseDesk.ok === false, "B: a failed build reports false");
  ok(await until(() => d.querySelector("#sd-h-reads"), 30000), "B: the older reception section is drawn instead");
  ok(!d.querySelector("[data-vd]") && !d.querySelector(".vd-on") && !d.querySelector(".sd-desk-toc a[href^=\"#vd-\"]"), "B: nothing of the new modules is left half drawn");
  ok(d.querySelector("[data-sd-parallel]") && d.querySelector("[data-sd-ask]"), "B: the desk's own content stands");
  window.close();
}
// C. the script never loads
{
  const { window } = await page({ search: "?ref=john.1.1", load: false });
  ok(await until(() => window.document.querySelector("#sd-h-reads"), 30000), "C: without verse-desk.js the older reception section is drawn");
  ok(typeof window.MOVerseDesk === "undefined", "C: nothing claims the page");
  window.close();
}
// D. no verse
{
  const { window } = await page({ search: "", load: true });
  await new Promise((r) => setTimeout(r, 800));
  ok(window.document.querySelector(".sd-chooser") && !window.document.querySelector("[data-vd]") && typeof window.MOVerseDesk === "undefined", "D: no verse, so the chooser and none of the modules");
  window.close();
}
if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log("\nverse desk in a DOM: all checks passed");
process.exit(0);
