/*
 * Every .fra-* selector in our Ask skin must match something the engine
 * actually emits.
 *
 * WHY THIS EXISTS. assets/css/faith-ask-workspace.css is Mere
 * Orthodoxy's skin over a vendored engine we do not own
 * (assets/js/port/ask-workspace.js). It keeps his class names because
 * they are what his DOM emits, which makes one mistake very easy and
 * completely silent: writing `.fra-thing` for an element the engine
 * names by id alone. The rule then matches nothing, the element falls
 * to the browser default, and nothing anywhere reports it.
 *
 * It has happened twice. First the panel itself, styled as
 * `.fra-workspace` when its class is `fra`. Then the source pane, where
 * four rules were written as classes and the worst of them was the
 * iframe: an unstyled iframe is not plain, it is 300x150, so opening a
 * citation put the passage in a small box in the corner of an empty
 * pane. Both were found by a person looking at the screen, which is the
 * expensive way to find them.
 *
 * WHAT IT CHECKS. Every `.fra-…` class selector in the stylesheet
 * appears as a class somewhere in the engine's markup. When one does
 * not, the message says whether the same name exists as an id, because
 * that is nearly always the actual mistake and the fix is one
 * character.
 *
 * WHAT IT DOES NOT CHECK. That a rule is correct, or that an element
 * the engine emits has any rule at all. It only catches the dead
 * selector. Class names are collected by reading the engine's source as
 * text, so a class assembled at runtime from pieces cannot be seen; add
 * such a name to KNOWN_DYNAMIC below rather than loosening the check.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const CSS = path.join(ROOT, "assets/css/faith-ask-workspace.css");
const ENGINE = [
  "assets/js/port/ask-workspace.js",
  "assets/js/port/ask-jobs.js",
  "assets/js/port/ask-stream.js",
].map((p) => path.join(ROOT, p));

// Classes the engine builds at runtime rather than writing out whole,
// so they cannot be read out of the source as literals.
const KNOWN_DYNAMIC = new Set([]);

function read(file) {
  try { return fs.readFileSync(file, "utf8"); } catch (e) { return ""; }
}

const js = ENGINE.map(read).join("\n");
if (!js.trim()) {
  console.error("check-ask-selectors: the Ask engine is missing; cannot verify the skin.");
  process.exit(1);
}

const emitted = new Set(KNOWN_DYNAMIC);
for (const m of js.matchAll(/class(?:Name)?\s*=\s*['"]([^'"]+)['"]/g))
  for (const c of m[1].split(/\s+/)) if (c) emitted.add(c);
for (const m of js.matchAll(/class="([^"]*)"/g))
  for (const c of m[1].split(/\s+/)) if (c && !c.includes("+")) emitted.add(c);
for (const m of js.matchAll(/classList\.(?:add|remove|toggle|contains)\(([^)]*)\)/g))
  for (const s of m[1].matchAll(/['"]([^'"]+)['"]/g)) emitted.add(s[1]);

const ids = new Set();
for (const m of js.matchAll(/id="([a-zA-Z0-9_-]+)"/g)) ids.add(m[1]);
for (const m of js.matchAll(/\.id\s*=\s*['"]([a-zA-Z0-9_-]+)['"]/g)) ids.add(m[1]);

// Comments are stripped so that prose naming a selector is not read as one.
const css = read(CSS).replace(/\/\*[\s\S]*?\*\//g, "");
const used = new Set();
for (const m of css.matchAll(/\.(fra[a-zA-Z0-9_-]*)/g)) used.add(m[1]);

const dead = [...used].filter((c) => !emitted.has(c)).sort();

if (dead.length) {
  console.error(
    "\ncheck-ask-selectors: " + dead.length +
    " selector(s) in faith-ask-workspace.css match nothing the engine emits.\n"
  );
  for (const d of dead) {
    console.error(
      ids.has(d)
        ? `  .${d}  ->  the engine names this by id. Write #${d}.`
        : `  .${d}  ->  no such class or id in the engine. Stale rule?`
    );
  }
  console.error(
    "\nA dead rule is silent: the element falls to the browser default and\n" +
    "nothing reports it. Check the markup in assets/js/port/ask-workspace.js.\n"
  );
  process.exit(1);
}

console.log(`✓ Ask skin: all ${used.size} .fra-* selectors match the engine's markup`);
