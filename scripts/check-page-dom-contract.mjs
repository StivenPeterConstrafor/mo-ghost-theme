/*
 * A page's scripts may not dereference an element the page does not have.
 *
 * WHY THIS EXISTS. On 2026-09-21 the ported search page lost its own
 * navigation bar: "The Faith Received / Collections / Dictionary /
 * Theme" was a fourth arrangement of links the shared rail already
 * carries, so the nav went and the rail stayed. The Theme button went
 * with it. What stayed behind was the line in
 * assets/js/port/search.in03.js that bound its click:
 *
 *     document.getElementById('searchTheme').onclick = function(){…};
 *
 * That line sits at the top level of the file. With no #searchTheme in
 * the markup it threw before anything below it ran, so the mode tabs,
 * the Search button and the result list were never wired. Every tab on
 * /the-faith-received/search/ was dead for a day, and the page looked
 * perfectly normal while it was: markup, styling and chrome all
 * present, nothing but a TypeError in a console nobody had open.
 *
 * Removing markup is the cheap half of a change. This is the half that
 * gets forgotten, and the failure it causes is total rather than
 * local -- one dead line takes the whole file with it.
 *
 * WHAT IT CHECKS. For every page template, every element id that its
 * scripts fetch and immediately use -- `getElementById('x').something`
 * -- exists in the markup that page renders (the template plus the
 * partials it includes), or is built by one of those same scripts.
 *
 * WHAT IT DOES NOT CHECK. A null-guarded lookup
 * (`var el = getElementById('x'); if (el) …`) or an optional chain
 * (`getElementById('x')?.remove()`), because those are how you write a
 * reference to something that may not be there; they fail quietly by
 * design and that is their author's decision, not a bug. Nor does it
 * check querySelector, whose selectors are not ids and whose misses are
 * usually cosmetic rather than fatal. An id assembled at runtime from
 * pieces cannot be seen by reading source as text; add such a name to
 * KNOWN_DYNAMIC below rather than loosening the check.
 *
 * ONE GAP WORTH NAMING. `$('#x').something`, where a file defines `$`
 * as document.querySelector, is getElementById under another name and
 * fails the same total way -- assets/js/port/pins.in02.js:44 and
 * desk.in02.js:181 both bind a theme button in exactly the shape that
 * broke search.in03.js. Both ids are in their templates today, so
 * neither is a live bug. Extending the check to that form was tried and
 * backed out: `$('#x')` is also how these files reach for markup they
 * rendered themselves a moment earlier, which this script cannot see,
 * and it raised 43 findings of which none were real. Catching those two
 * lines needs a way to read ids out of the HTML a script writes, not a
 * wider regex.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");

// Ids no template writes and no script writes out whole.
const KNOWN_DYNAMIC = new Set([]);

const read = (file) => {
  try { return fs.readFileSync(file, "utf8"); } catch { return ""; }
};
const strip = (hbs) => hbs.replace(/\{\{!--[\s\S]*?--\}\}/g, "");

const idsIn = (text) => {
  const out = new Set();
  for (const m of text.matchAll(/\bid="([^"]+)"/g)) out.add(m[1]);
  return out;
};

// Ids a script builds itself: el.id = 'x', or id="x" inside markup it writes.
const idsBuiltBy = (js) => {
  const out = new Set();
  for (const m of js.matchAll(/\.id\s*=\s*['"]([a-zA-Z0-9_-]+)['"]/g)) out.add(m[1]);
  for (const m of js.matchAll(/id=\\?["']([a-zA-Z0-9_-]+)\\?["']/g)) out.add(m[1]);
  return out;
};

function markupOf(hbs, seen = new Set()) {
  const text = strip(hbs);
  let ids = idsIn(text);
  for (const m of text.matchAll(/\{\{>\s*"([^"]+)"\}\}/g)) {
    const name = m[1];
    if (seen.has(name)) continue;
    seen.add(name);
    const partial = path.join(ROOT, "partials", name + ".hbs");
    if (fs.existsSync(partial)) ids = new Set([...ids, ...markupOf(read(partial), seen)]);
  }
  return ids;
}

const templates = fs.readdirSync(ROOT).filter((n) => n.endsWith(".hbs")).sort();
const failures = [];
let checked = 0;

for (const name of templates) {
  const hbs = strip(read(path.join(ROOT, name)));
  const scripts = [...hbs.matchAll(/\{\{asset\s+"(js\/[^"]+)"\}\}/g)]
    .map((m) => m[1])
    .filter((p, i, all) => all.indexOf(p) === i)
    .filter((p) => fs.existsSync(path.join(ROOT, "assets", p)));
  if (!scripts.length) continue;

  const sources = new Map(scripts.map((p) => [p, read(path.join(ROOT, "assets", p))]));
  let available = new Set([...markupOf(read(path.join(ROOT, name))), ...KNOWN_DYNAMIC]);
  for (const js of sources.values()) available = new Set([...available, ...idsBuiltBy(js)]);

  for (const [file, js] of sources) {
    for (const m of js.matchAll(/document\.getElementById\(\s*['"]([a-zA-Z0-9_-]+)['"]\s*\)\s*\./g)) {
      checked++;
      const id = m[1];
      if (available.has(id)) continue;
      // `getElementById('x') && getElementById('x').checked` is a guard
      // written the long way: the same lookup, just before this one, with
      // nothing dereferenced off it. Reading it as unguarded would punish
      // the careful author.
      const before = js.slice(Math.max(0, m.index - 200), m.index);
      const guard = new RegExp(`getElementById\\(\\s*['"]${id}['"]\\s*\\)\\s*(?!\\.)`);
      if (guard.test(before)) continue;
      failures.push({ page: name, file, id, line: js.slice(0, m.index).split("\n").length });
    }
  }
}

if (failures.length) {
  console.error(
    `\ncheck-page-dom-contract: ${failures.length} script reference(s) to an element the page does not render.\n`
  );
  for (const f of failures) {
    console.error(`  ${f.file}:${f.line}  #${f.id}  is not in ${f.page} or anything it includes`);
  }
  console.error(
    "\nAn unguarded getElementById at the top level of a file throws when the\n" +
    "element is gone, and every line below it stops running. Either put the\n" +
    "markup back, delete the handler with it, or guard the lookup.\n"
  );
  process.exit(1);
}

console.log(`✓ Page DOM contract: ${checked} element reference(s) across ${templates.length} templates all resolve`);
