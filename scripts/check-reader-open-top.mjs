/*
 * A bare link to a work opens at the very top of the volume (report #42, 2026-10-19).
 *
 * Two things carried a reader past the title and the collapsed front matter:
 *   1. Opening a volume wrote fr_lastread with the page the spy first named (the title page, past the front matter
 *      toggle), and every later bare link to that work resumed there. An arrival nobody asked for is now stored with
 *      top:1 and frResumePage() refuses it as a resume point.
 *   2. A rebuild (TEI hydration, the late shards) anchored the first body row and re-pinned it at its old offset when the
 *      content above changed height. A reader still at the top is now captured as {top:true} and held at scrollTop 0.
 *
 * Saved places, ?p=, ?section= and #hash links must keep working, so those are asserted too. Lifts the functions from
 * reader-core.js by text, like check-brace-diagrams.mjs.
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";

const src = readFileSync("assets/js/port/reader-core.js", "utf8");
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a); if (a < 0 || b < 0) throw new Error(`reader-core.js no longer holds ${from}`); return src.slice(a, b); };

let failed = 0;
const check = (name, ok) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) failed++; };

// 1. resume points
const ctx = {};
vm.createContext(ctx);
vm.runInContext(cut("function frResumePage(", "(function(){\n  if(frReaderBlockReference"), ctx);
check("a place past page 3 resumes", ctx.frResumePage({ page: 18 }) === "18");
check("a place on pages 1 to 3 does not", ctx.frResumePage({ page: 3 }) === null && ctx.frResumePage({ page: 1 }) === null);
check("a non-numeric place still resumes", ctx.frResumePage({ page: "xiv" }) === "xiv");
check("an arrival at the top (top:1) is not a resume point, whatever its page", ctx.frResumePage({ page: 7, top: 1 }) === null);
check("no record, no resume", ctx.frResumePage(undefined) === null && ctx.frResumePage({}) === null);

// the write marks only an unasked-for arrival
const write = cut("const _sp=new URLSearchParams(location.search)", "lr[_k]=");
check("the fr_lastread write flags an arrival with no p, section, heading, hl, hash, choice or saved place",
  /!window\.__frInitialReference/.test(write) && /!window\.__readerChoice/.test(write) && /!location\.hash/.test(write)
  && ["p", "section", "heading", "hl"].every((k) => write.includes(`!_sp.has("${k}")`)) && /_sc\.scrollTop<8/.test(write));
check("the flag is stored as top:1", /\.\.\.\(_opening\?\{top:1\}:\{\}\)/.test(src));
check("both resume readers go through frResumePage", (src.match(/frResumePage\(/g) || []).length === 3);

// 2. a rebuild keeps a reader at the top
const capture = cut("function captureReaderPosition(", "const frSourceHeadingCache");
const mk = (scrollTop, extra = {}) => {
  const sc = { scrollTop, getBoundingClientRect: () => ({ top: 0 }) };
  const row = { id: "b9-1", getClientRects: () => [1], getBoundingClientRect: () => ({ top: 640, bottom: 700 }), closest: () => ({ dataset: { page: "9" } }), dataset: {} };
  const reading = { querySelectorAll: () => [row] };
  const c = { cur: 6, location: { hash: extra.hash || "" }, document: { getElementById: (id) => (id === "scroll" ? sc : id === "reading" ? reading : null) }, window: {} };
  c.window = c; Object.assign(c, extra.globals || {});
  vm.createContext(c); vm.runInContext(capture, c);
  return c;
};
const top = mk(0).captureReaderPosition(true);
check("at scrollTop 0 a rebuild captures the top, not the first body row", top && top.top === true && top.id === null && top.choice === false);
check("a plain capture (bookmarks, Ask) still reads the row under the masthead", mk(0).captureReaderPosition().id === "b9-1");
check("a reader who has scrolled is anchored as before", mk(300).captureReaderPosition(true).id === "b9-1");
check("an explicit page (?p= sets __frTgt) is not held at the top", mk(0, { globals: { __frTgt: 12 } }).captureReaderPosition(true).top === undefined);
check("a saved place (__frInitialReference) is not held at the top", mk(0, { globals: { __frInitialReference: "18" } }).captureReaderPosition(true).top === undefined);
check("a #hash link is not held at the top", mk(0, { hash: "#b18-0" }).captureReaderPosition(true).top === undefined);
check("a deliberate choice is not held at the top", mk(0, { globals: { __readerChoice: { page: 4, title: "", id: null, serial: 1 } } }).captureReaderPosition(true).top === undefined);

if (failed) { console.error(`${failed} open-at-top check(s) failed`); process.exit(1); }
console.log("reader open at top: all checks pass");
