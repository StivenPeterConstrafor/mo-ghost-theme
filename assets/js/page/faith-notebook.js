/*
 * The Faith Received — the Notebook workspace.
 *
 * Binds to partials/faith-received/_notebook-panel.hbs. Read that
 * partial's header comment for the DOM contract; every selector below
 * is unscoped document.querySelector(), so the markup must appear
 * exactly once on whichever page loads this file.
 *
 * THIS IS A SECOND VIEW OF ONE SET OF NOTES, NOT A SECOND NOTEBOOK.
 * The notes are made in the reader: select a passage, and
 * assets/js/faith-reader-tools.js keeps it with its citation and a link
 * back to the exact block. That panel is scoped to the work in front of
 * you. This one is the whole notebook across every work, which is the
 * view the reader panel could never be.
 *
 * Both surfaces read and write through window.MOFaithNotebook
 * (assets/js/lib/faith-notebook-store.js) and NEITHER touches
 * localStorage directly. That file was factored out of
 * faith-reader-tools.js for exactly this reason: two copies of the
 * parsing code over one storage key is a format that drifts, and the
 * way it drifts is that one side quietly drops a field the other side
 * wrote. If the notebook ever moves off localStorage it moves there,
 * and both surfaces follow without either being rewritten.
 *
 * ── COLLECTIONS ──────────────────────────────────────────────────
 *
 * Absorbed from the Pins page (assets/js/page/faith-pins.js, deleted),
 * which was a seventh tab in the Research strip until it became clear
 * it had never been a second destination. A collection holds ENTRY IDS
 * into this same notebook and nothing else — window.MOFaithCollections,
 * assets/js/lib/faith-collections-store.js, whose header explains why
 * it refuses to hold the records themselves. Two tabs over one store
 * meant a passage kept while reading appeared in the other one without
 * the reader doing anything, which is the behaviour of a filter, not of
 * a place.
 *
 * So the collection strip IS a filter over the list this panel already
 * drew. "Everything" is the default and is the panel exactly as it was.
 * Choosing a collection narrows the list and brings with it the four
 * things that are collection-scoped and have nowhere else to live:
 *
 *   - ITS WORKING NOTES. A memo about the argument being assembled,
 *     distinct from the note on any one passage.
 *   - ITS OWN ORDER. resolve() returns a collection's entries in the
 *     order the reader put them in, so "Recent" is relabelled "Your
 *     order" there and the move controls appear on each card. Order is
 *     the reader's argument; it exists nowhere but inside a collection,
 *     which is why the controls do not appear outside one.
 *   - ITS RELATIONS. An edge names two members and a verb, and the
 *     store will only accept one whose ends are both in the collection,
 *     so drawing is offered nowhere else. Edges ALREADY drawn are shown
 *     on every entry in every view, because hiding them would make a
 *     passage look like it stood alone.
 *   - ITS EXPORT. Copy and Download emit Markdown with the collection's
 *     name, memo, grouping and relations, where outside a collection
 *     they emit the plain citation list they always did. The buttons say
 *     which, rather than silently changing what they produce.
 *
 * WHAT PINS HAD AND THIS DOES NOT. One thing, deliberately: its own
 * card renderer. Pins drew .pins-card with a blur-saved note field and a
 * one-press remove; the notebook entry beside it had a debounced
 * autosave and a two-press remove over the same stored note. Keeping
 * both would have been two ways to edit one field, and the weaker one
 * loses a note if the tab closes before the blur. Everything Pins could
 * DO to a card is here on the notebook entry instead. Its share link is
 * also fixed rather than ported: Pins pointed its link at
 * /the-faith-received/research/#c=<payload>, and nothing on that page
 * has ever read #c= — the import banner lives in the reader, so the link
 * has to be a reader link, which is what the notebook's own share
 * button already built.
 *
 * NOTHING HERE TOUCHES THE NETWORK, so unlike the Compare and Desk
 * panels this one has no reason to wait for its tab and does not.
 *
 * LINKING BACK. An entry stores an absolute `url` written from the
 * reader's own location, so it addresses the exact block. That is
 * better than anything reconstructable and is used verbatim, after
 * MOSafeHref, since it is also the one field that can arrive from
 * outside in a shared constellation. Where there is none, the store
 * builds one by the same rule as readerUrlFor() in
 * website/workers/tfr-library/lib/collections.js: `?c=pld&w=2741`, with
 * `c` omitted for the default collection.
 */
(function () {
  "use strict";

  const NB = window.MOFaithNotebook;
  const CO = window.MOFaithCollections;
  const root = document.querySelector("[data-fn-root]");
  if (!root) return;
  // The partial ships its own <script> tags so it can be dropped into
  // any page. If a host page loads this file a second time, bind once.
  if (root.getAttribute("data-fn-bound") === "1") return;
  root.setAttribute("data-fn-bound", "1");

  const listEl = document.querySelector("[data-fn-list]");
  const countEl = document.querySelector("[data-fn-count]");
  const statusEl = document.querySelector("[data-fn-status]");
  const filterEl = document.querySelector("[data-fn-filter]");
  const groupEl = document.querySelector("[data-fn-group]");
  const toolsEl = document.querySelector("[data-fn-tools]");
  const footEl = document.querySelector("[data-fn-foot]");
  const footNoteEl = document.querySelector("[data-fn-foot-note]");
  if (!listEl) return;

  const stripEl = document.querySelector("[data-fn-collections]");
  const cbarEl = document.querySelector("[data-fn-cbar]");
  const newBtn = document.querySelector("[data-fn-c-new]");
  const renameBtn = document.querySelector("[data-fn-c-rename]");
  const deleteBtn = document.querySelector("[data-fn-c-delete]");
  const linkBtn = document.querySelector("[data-fn-c-link]");
  const relField = document.querySelector("[data-fn-rel-field]");
  const relSel = document.querySelector("[data-fn-rel]");
  const nameForm = document.querySelector("[data-fn-name-form]");
  const nameInput = document.querySelector("[data-fn-name-input]");
  const nameLegend = document.querySelector("[data-fn-name-legend]");
  const memoEl = document.querySelector("[data-fn-memo]");
  const consEl = document.querySelector("[data-fn-constellation]");

  // The store is loaded by the partial immediately above this file. If
  // it is missing the page has been assembled wrongly, and an empty
  // notebook would read as "you have never taken a note" — which is a
  // lie, and the worst one this panel could tell.
  if (!NB) {
    listEl.innerHTML =
      `<div class="notebook-empty">` +
      `<p class="notebook-empty-lede">The notebook could not be opened.</p>` +
      `<p class="notebook-empty-note">Your notes are safe. This page failed to load the piece that reads them, ` +
      `so nothing is being shown rather than the wrong thing.</p>` +
      `</div>`;
    if (toolsEl) toolsEl.hidden = true;
    if (footEl) footEl.hidden = true;
    if (stripEl) stripEl.hidden = true;
    if (cbarEl) cbarEl.hidden = true;
    return;
  }

  const esc = NB.escapeHtml;

  /* ── State ───────────────────────────────────────────────────── */

  const ALL = "";
  const UNFILED = "~unfiled";

  let groupBy = "recent";
  let filter = "";
  // The entry whose Remove button is waiting for its second click.
  let armed = "";
  // Which collection the strip has selected. "" is Everything.
  let viewId = ALL;
  // While a relation is being drawn: true before the first end is
  // picked, then the id of that first end.
  let linking = null;
  // "new" | "rename", while the name form is open.
  let nameMode = "";

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  };

  const clear = (node) => {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  };

  const fmt = (n) => Number(n || 0).toLocaleString();
  const titleOf = (e) => e.title || e.work || "Untitled passage";
  const authorOf = (e) => e.author || "Unattributed";

  const matches = (e) => {
    if (!filter) return true;
    return [e.text, e.note, e.cite, e.title, e.author]
      .map((s) => String(s == null ? "" : s).toLowerCase())
      .join(" ")
      .indexOf(filter) >= 0;
  };

  /* ── Views ───────────────────────────────────────────────────── *
   *
   * Everything, then each collection, then the passages in none of
   * them. That last group is offered only when something IS filed:
   * with no collections at all it is Everything under a second name,
   * and an extra tab that duplicates the one beside it is noise.
   *
   * Every view resolves through the store, so a collection whose ids
   * point at entries the notebook no longer holds shows what is
   * actually there rather than a count that overstates it. */
  function views() {
    const out = [{ id: ALL, name: "Everything", memo: "", sort: "", edges: [], entries: NB.load(), real: false }];
    if (!CO) return out;
    CO.load().forEach((c) => out.push({ ...c, entries: CO.resolve(c), real: true }));
    const loose = CO.unfiled();
    if (loose.length && out.length > 1) {
      out.push({
        id: UNFILED, name: "Not in a collection", memo: "", sort: "",
        items: loose.map((e) => e.id), edges: [], entries: loose, real: false,
      });
    }
    return out;
  }

  function currentView() {
    const all = views();
    return all.filter((v) => v.id === viewId)[0] || all[0];
  }

  // Everything in the selected view, filter applied.
  const shown = () => currentView().entries.filter(matches);

  /* ── Painting ────────────────────────────────────────────────── */

  function setStatus(text, tone) {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.hidden = !text;
    statusEl.classList.toggle("notebook-status--error", tone === "error");
  }

  const say = (msg) => setStatus(msg || "");

  function edgeMarkup(id, byId, edges) {
    const rows = edges
      .filter((x) => x.a === id || x.b === id)
      .map((x) => {
        const other = byId.get(x.a === id ? x.b : x.a);
        if (!other) return "";
        // Direction matters: "contests" and "is contested by" are not
        // the same claim. The arrow marks the incoming half.
        const dir = x.a === id ? String(x.rel) : `${String(x.rel)} ←`;
        return `<li class="notebook-edge">${esc(dir)} ` +
          `<a href="${esc(NB.linkFor(other))}">${esc(other.cite || other.title || "a passage")}</a></li>`;
      })
      .filter(Boolean)
      .join("");
    return rows ? `<ul class="notebook-edges">${rows}</ul>` : "";
  }

  // Which collections hold this passage. Shown outside a collection
  // only: inside one it would say the name at the top of the screen
  // back to the reader on every card.
  function filedMarkup(id) {
    if (!CO || viewId !== ALL) return "";
    const held = CO.collectionsFor(id);
    if (!held.length) return "";
    return `<p class="notebook-entry-filed">In ${held.map((c) => esc(c.name)).join(", ")}</p>`;
  }

  // The controls that only exist inside a collection, or the one that
  // only exists outside one.
  //
  // `index` is the entry's place in the collection's own order, or -1
  // where there is no such thing: in a grouped view, or while a filter
  // is on, the rows on screen are not the collection's order and a Move
  // up that jumped a card over one it is not next to would be a
  // reordering the reader did not ask for. So the move controls ship
  // disabled at -1 rather than absent, because a control that vanishes
  // when a filter is typed reads as breakage.
  function fileMarkup(view, entry, index) {
    if (!CO) return "";
    if (view.real) {
      const order = view.sort === "author" ? [] : [
        `<button type="button" class="notebook-act" data-fn-up${index <= 0 ? " disabled" : ""}>Move up</button>`,
        `<button type="button" class="notebook-act" data-fn-down${index < 0 || index >= view.entries.length - 1 ? " disabled" : ""}>Move down</button>`,
      ];
      return [...order, `<button type="button" class="notebook-act" data-fn-unfile>Remove from collection</button>`].join("");
    }
    const real = CO.load();
    if (!real.length) return "";
    // aria-label rather than a <label for>: this select is rendered once
    // per entry, and one `for` pointing at a repeated id would name the
    // wrong control on every row after the first.
    return [
      `<select class="pins-file" data-fn-file aria-label="Put ${esc(titleOf(entry))} in a collection">`,
      `<option value="">Put in a collection&hellip;</option>`,
      real.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join(""),
      `</select>`,
    ].join("");
  }

  function entryMarkup(e, byId, edges, view, index) {
    const head = esc(e.cite || e.title || "Passage");
    const source = [e.title, e.author].filter(Boolean).map(esc).join(" &middot; ");
    // Ids come out of the store and go into an id= / for= pair, so they
    // are escaped on both sides and stay identical to each other.
    const noteId = `notebook-note-${esc(e.id)}`;
    const sep = source && e.at ? " &middot; " : "";
    const cls = linking
      ? ` is-linkable${linking === e.id ? " is-linking" : ""}`
      : "";
    return [
      `<article class="notebook-entry${cls}" data-fn-id="${esc(e.id)}">`,
      `<p class="notebook-entry-cite">${head}</p>`,
      source || e.at
        ? `<p class="notebook-entry-source">${source}${sep}${esc(e.at || "")}</p>`
        : "",
      e.text ? `<blockquote class="notebook-entry-text">${esc(e.text)}</blockquote>` : "",
      filedMarkup(e.id),
      `<label class="visually-hidden" for="${noteId}">Your note on this passage</label>`,
      `<textarea class="notebook-entry-note" id="${noteId}" data-fn-note rows="2" `,
      `placeholder="Your note">${esc(e.note || "")}</textarea>`,
      edgeMarkup(e.id, byId, edges),
      `<div class="notebook-entry-row">`,
      `<a class="notebook-act" href="${esc(NB.linkFor(e))}">Open in the reader</a>`,
      `<button type="button" class="notebook-act" data-fn-copy-one>Copy citation</button>`,
      fileMarkup(view, e, index),
      `<button type="button" class="notebook-act notebook-act--quiet" data-fn-remove `,
      `aria-label="Remove this note from your notebook">Remove</button>`,
      `</div>`,
      `</article>`,
    ].join("");
  }

  function renderEmpty(view, filtered) {
    if (filtered) {
      listEl.innerHTML =
        `<div class="notebook-empty">` +
        `<p class="notebook-empty-lede">Nothing matches that.</p>` +
        `<p class="notebook-empty-note">The filter looks at the passage, your note, the citation, ` +
        `the work and its author.</p>` +
        `</div>`;
      return;
    }
    if (view.real) {
      listEl.innerHTML =
        `<div class="notebook-empty">` +
        `<p class="notebook-empty-lede">This collection is empty.</p>` +
        `<p class="notebook-empty-note">Passages you keep while reading land in the collection marked active. ` +
        `You can also file anything into it from Everything, using the control on each passage.</p>` +
        `</div>`;
      return;
    }
    listEl.innerHTML =
      `<div class="notebook-empty">` +
      `<p class="notebook-empty-lede">Nothing in the notebook yet.</p>` +
      `<p class="notebook-empty-note">Open a work in the reader and select any passage. ` +
      `Choose Save to notebook and it is kept here, with its citation and a link back to the exact block.</p>` +
      `<p class="notebook-empty-act"><a class="notebook-empty-link" href="/the-faith-received/browse/">Browse the library</a></p>` +
      `</div>`;
  }

  /* ── The collection strip ────────────────────────────────────── */

  function renderStrip(all, view) {
    if (!stripEl || !CO) return;
    clear(stripEl);
    // One tab is no choice at all: with no collections yet the strip
    // would be a single "Everything" button that does nothing.
    stripEl.hidden = all.length < 2;
    if (all.length < 2) return;
    all.forEach((v) => {
      const b = el("button", "pins-tab");
      b.type = "button";
      b.setAttribute("role", "tab");
      const on = v.id === view.id;
      b.setAttribute("aria-selected", String(on));
      if (on) b.classList.add("is-active");
      if (v.id === UNFILED) b.classList.add("pins-tab-unfiled");
      b.appendChild(el("span", "pins-tab-name", v.name));
      b.appendChild(el("span", "pins-tab-n", fmt(v.entries.length)));
      b.addEventListener("click", () => {
        viewId = v.id;
        // The active collection is where passages kept while reading
        // land. Choosing Everything or the unfiled group is not a
        // statement about that, so it leaves it alone.
        if (v.real) CO.setActive(v.id);
        linking = null;
        closeNameForm();
        disarm();
        // A filter set on one collection silently narrowing the next is
        // the kind of thing that reads as data having gone missing.
        filter = "";
        if (filterEl) filterEl.value = "";
        groupBy = v.real && v.sort === "author" ? "author" : "recent";
        render();
      });
      stripEl.appendChild(b);
    });
  }

  /* ── The constellation ───────────────────────────────────────── *
   * The relations drawn inside a collection, as a ring and as a list.
   * The list is the part that matters: the ring is unreadable to a
   * screen reader and is marked aria-hidden, so the rows below it carry
   * the same information in text. An edge whose other end has left the
   * notebook is dropped by resolve() upstream and never reaches here. */
  function constellation(view) {
    if (!consEl) return;
    clear(consEl);
    if (!view.real || !view.edges.length || !CO) return;
    const present = new Set(view.entries.map((e) => e.id));
    const edges = view.edges.filter((e) => present.has(e.a) && present.has(e.b));
    if (!edges.length) return;

    consEl.appendChild(el("h3", "pins-cons-title", "Relations in this collection"));

    const keys = [...new Set(edges.flatMap((e) => [e.a, e.b]))];
    const byId = new Map(view.entries.map((e) => [e.id, e]));
    const W = 640;
    const H = Math.max(240, keys.length * 34);
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(cx - 150, cy - 28);

    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    // A fixed viewBox, so nothing here has to measure a box that is
    // zero-width behind a hidden tab.
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("class", "pins-cons-svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    const pos = {};
    keys.forEach((k, i) => {
      const ang = (2 * Math.PI * i) / keys.length - Math.PI / 2;
      pos[k] = [cx + R * Math.cos(ang), cy + R * Math.sin(ang)];
    });
    edges.forEach((e) => {
      const [ax, ay] = pos[e.a];
      const [bx, by] = pos[e.b];
      const ln = document.createElementNS(NS, "line");
      ln.setAttribute("x1", ax); ln.setAttribute("y1", ay);
      ln.setAttribute("x2", bx); ln.setAttribute("y2", by);
      ln.setAttribute("class", "pins-cons-line");
      svg.appendChild(ln);
    });
    keys.forEach((k) => {
      const [x, y] = pos[k];
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", "5");
      c.setAttribute("class", "pins-cons-node");
      svg.appendChild(c);
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", x); t.setAttribute("y", y - 11);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("class", "pins-cons-text");
      t.textContent = titleOf(byId.get(k) || {}).slice(0, 34);
      svg.appendChild(t);
    });
    consEl.appendChild(svg);

    const rows = el("ul", "pins-cons-list");
    view.edges.forEach((e, i) => {
      if (!present.has(e.a) || !present.has(e.b)) return;
      const li = el("li", "pins-cons-row");
      li.appendChild(el("span", "pins-cons-end", titleOf(byId.get(e.a) || {})));
      li.appendChild(el("span", "pins-cons-rel", e.rel));
      li.appendChild(el("span", "pins-cons-end", titleOf(byId.get(e.b) || {})));
      const x = el("button", "pins-act", "Remove");
      x.type = "button";
      x.setAttribute("aria-label", `Remove the relation ${e.rel}`);
      x.addEventListener("click", () => {
        CO.removeEdge(view.id, i);
        render();
        say("Relation removed.");
      });
      li.appendChild(x);
      rows.appendChild(li);
    });
    consEl.appendChild(rows);
  }

  /* ── Export ──────────────────────────────────────────────────── *
   * Inside a collection this is the collection: its name, its working
   * notes, its order or its author grouping, and the relations drawn in
   * it. Outside one it is the plain citation list the notebook has
   * always produced. The buttons are relabelled to say which. */

  function markdown(view, list) {
    const lines = [`# ${view.name}`, ""];
    if (view.memo) { lines.push(`> ${view.memo.replace(/\n+/g, "\n> ")}`, ""); }
    const write = (e) => {
      const head = [authorOf(e), titleOf(e)].filter(Boolean).join(", ");
      lines.push(`- **${head}**${e.cite ? `, ${e.cite}` : ""}`);
      if (e.text) lines.push(`  > ${e.text.replace(/\n+/g, " ")}`);
      if (e.note) lines.push(`  - ${e.note.replace(/\n+/g, " ")}`);
      const href = NB.linkFor(e);
      if (href) lines.push(`  - ${href}`);
    };
    if (groupBy === "author") {
      const groups = new Map();
      list.forEach((e) => {
        const k = authorOf(e);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(e);
      });
      [...groups.keys()].sort().forEach((k) => {
        lines.push(`## ${k}`, "");
        groups.get(k).forEach(write);
        lines.push("");
      });
    } else {
      list.forEach(write);
      lines.push("");
    }
    const present = new Set(list.map((e) => e.id));
    const edges = (view.edges || []).filter((e) => present.has(e.a) && present.has(e.b));
    if (edges.length) {
      const byId = new Map(list.map((e) => [e.id, e]));
      lines.push("## Relations", "");
      edges.forEach((e) => {
        lines.push(`- ${titleOf(byId.get(e.a))}, *${e.rel}*, ${titleOf(byId.get(e.b))}`);
      });
      lines.push("");
    }
    lines.push("Assembled in The Faith Received");
    return lines.join("\n");
  }

  // Everything currently on screen, not everything stored: if a filter
  // is on, what leaves is what the filter shows. Anything else would
  // mean the button did something other than what the panel says.
  function exportPayload() {
    const view = currentView();
    const list = shown();
    if (!list.length) return null;
    return view.real
      ? { text: markdown(view, list), name: "collection.md", type: "text/markdown;charset=utf-8" }
      : { text: list.map(NB.formatEntry).join("\n\n"), name: "faith-received-notebook.txt", type: "text/plain;charset=utf-8" };
  }

  /* ── Render ──────────────────────────────────────────────────── */

  // A render rebuilds every entry from storage, textareas included. If
  // one of them has the cursor in it, that field is holding text the
  // store has not seen yet and the rebuild deletes it mid-sentence.
  // The `storage` event makes this a real case rather than a
  // theoretical one: the reader open in another tab saves a passage,
  // this page renders, and the note being typed here vanishes.
  //
  // So a render that arrives while someone is typing is DEFERRED, not
  // dropped, and runs when the field is released.
  let deferred = false;
  let deferTimer = null;

  function typing() {
    const a = document.activeElement;
    if (!a || !a.matches) return false;
    if (a.matches("[data-fn-note]") && listEl.contains(a)) return true;
    // The memo is rebuilt by the same render and loses its cursor the
    // same way.
    return !!(memoEl && a.matches("textarea") && memoEl.contains(a));
  }

  // Picked up by whichever comes first: the field losing focus, or
  // this. Both, because `focusout` is the immediate signal and is not
  // a guaranteed one — a field can stop being the active element
  // without the reader having blurred it — and a deferred render that
  // nothing ever runs is a list frozen at the moment someone started
  // typing.
  function deferRender() {
    deferred = true;
    if (deferTimer) return;
    deferTimer = window.setInterval(() => {
      if (typing()) return;
      window.clearInterval(deferTimer);
      deferTimer = null;
      if (deferred) render();
    }, 700);
  }

  function renderChrome(all, view) {
    const total = NB.load().length;
    const inView = view.entries.length;
    const list = shown();

    renderStrip(all, view);

    if (countEl) {
      countEl.hidden = !total;
      if (total) {
        const kept = `${inView} ${inView === 1 ? "passage" : "passages"}`;
        countEl.textContent = filter ? `${list.length} of ${kept}` : kept;
      } else {
        countEl.textContent = "";
      }
    }

    // Based on the whole notebook rather than on the view, so that the
    // ordering controls stay reachable inside a collection of one.
    if (toolsEl) toolsEl.hidden = total < 2;

    // The ordering controls. "Recent" is the notebook's order; inside a
    // collection the same button is the collection's own order, which
    // is what resolve() already returns, so only the label changes. "By
    // author" is offered only there, because it is a property the store
    // keeps on the collection.
    if (groupEl) {
      const recent = groupEl.querySelector('[data-fn-group-by="recent"]');
      const author = groupEl.querySelector('[data-fn-group-by="author"]');
      if (recent) recent.textContent = view.real ? "Your order" : "Recent";
      if (author) author.hidden = !view.real;
      groupEl.querySelectorAll("[data-fn-group-by]").forEach((b) => {
        const on = b.getAttribute("data-fn-group-by") === groupBy;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }

    // The collection bar. New is always offered; the rest act on a real
    // collection and are hidden without one rather than disabled,
    // because there is nothing to explain — there is no collection.
    if (cbarEl) cbarEl.hidden = !CO;
    [renameBtn, deleteBtn].forEach((b) => { if (b) b.hidden = !view.real; });
    if (linkBtn) {
      linkBtn.hidden = !view.real;
      linkBtn.textContent = linking ? "Choose the second passage" : "Draw a relation";
      linkBtn.setAttribute("aria-pressed", String(!!linking));
      linkBtn.disabled = inView < 2;
    }
    if (relField) relField.hidden = !view.real;
    if (deleteBtn && !deleteBtn.hidden) deleteBtn.textContent = "Delete collection";

    if (memoEl) {
      memoEl.hidden = !view.real;
      if (view.real) {
        const ta = memoEl.querySelector("textarea");
        if (ta && document.activeElement !== ta) ta.value = view.memo || "";
      }
    }

    if (footEl) footEl.hidden = !list.length;
    const copyBtn = document.querySelector("[data-fn-copy]");
    if (copyBtn) copyBtn.textContent = view.real ? "Copy as Markdown" : "Copy all";
    if (footNoteEl) {
      footNoteEl.textContent = view.real
        ? "Kept in this browser only. Copy or download anything you want to keep. A share link carries the passages and the relations between them, not your working notes."
        : "Kept in this browser only. Copy or download anything you want to keep.";
    }
  }

  function render() {
    const all = views();
    const view = currentView();
    viewId = view.id;

    // Everything above this line is chrome and cannot eat anyone's
    // typing. Everything below rebuilds the entries.
    renderChrome(all, view);
    if (typing()) { deferRender(); return; }
    deferred = false;

    const list = shown();
    const edges = NB.loadEdges();
    const byId = new Map(NB.load().map((e) => [e.id, e]));

    if (!list.length) {
      clear(consEl);
      renderEmpty(view, !!filter && !!view.entries.length);
      return;
    }

    if (groupBy === "author") {
      // Ported from Pins, and offered only inside a collection. The
      // heading is an h3: the panel's own title is the h2 and the page
      // has exactly one h1, in the hero.
      const groups = new Map();
      list.forEach((e) => {
        const k = authorOf(e);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(e);
      });
      listEl.innerHTML = [...groups.keys()].sort().map((k) => {
        const kept = groups.get(k);
        return `<section class="notebook-group">` +
          `<h3 class="notebook-group-title">${esc(k)}` +
          `<span class="notebook-group-count">${kept.length} ${kept.length === 1 ? "passage" : "passages"}</span>` +
          `</h3>` +
          `<div class="notebook-entries">${
            kept.map((e) => entryMarkup(e, byId, edges, view, -1)).join("")}</div>` +
          `</section>`;
      }).join("");
      constellation(view);
      return;
    }

    if (groupBy !== "work") {
      listEl.innerHTML = `<div class="notebook-entries">${
        list.map((e, i) => entryMarkup(e, byId, edges, view, filter ? -1 : i)).join("")}</div>`;
      constellation(view);
      return;
    }

    // Grouped by the work the passage came from. Works appear in the
    // order their most recent note appears, so what someone is reading
    // now is at the top.
    const order = [];
    const groups = new Map();
    list.forEach((e) => {
      const key = `${e.corpus || "tfr"}|${e.work || ""}`;
      if (!groups.has(key)) { groups.set(key, []); order.push(key); }
      groups.get(key).push(e);
    });
    listEl.innerHTML = order.map((key) => {
      const kept = groups.get(key);
      const first = kept[0];
      const name = first.title || first.work || "This work";
      const n = kept.length;
      return `<section class="notebook-group">` +
        `<h3 class="notebook-group-title">` +
        `<a href="${esc(NB.linkFor(first))}">${esc(name)}</a>` +
        `<span class="notebook-group-count">${n} ${n === 1 ? "passage" : "passages"}</span>` +
        `</h3>` +
        `<div class="notebook-entries">${
          kept.map((e) => entryMarkup(e, byId, edges, view, -1)).join("")}</div>` +
        `</section>`;
    }).join("");
    constellation(view);
  }

  /* ── Removing ────────────────────────────────────────────────── */
  //
  // Two steps. A note is a piece of someone's own work, there is no
  // undo, and it is not re-creatable by clicking anything: it would
  // have to be found and re-selected in the text. The reader's panel
  // removes on one click because it is a short, work-scoped list; this
  // one is the whole notebook and the rows all look alike.
  //
  // Taking a passage out of a COLLECTION is one press, because that is
  // reversible: it stays in the notebook and can be filed again.

  function disarm() {
    if (!armed) return;
    armed = "";
    listEl.querySelectorAll("[data-fn-remove]").forEach((b) => {
      b.classList.remove("is-armed");
      b.textContent = "Remove";
    });
  }

  // After a reorder, put the cursor back on the button that was
  // pressed. A move that leaves focus on the document body loses a
  // keyboard reader in a list they were halfway through arranging.
  function focusIn(id, sel) {
    const c = listEl.querySelector(`[data-fn-id="${window.CSS && CSS.escape ? CSS.escape(id) : id}"]`);
    const b = c && c.querySelector(sel);
    if (b && !b.disabled) b.focus({ preventScroll: true });
  }

  /* ── Events ──────────────────────────────────────────────────── */

  // Drawing a relation, in the capture phase: while a relation is being
  // drawn the card's own controls are not what the reader means to
  // press.
  listEl.addEventListener("click", (e) => {
    if (!linking || !CO) return;
    const item = e.target.closest("[data-fn-id]");
    if (!item) return;
    e.preventDefault();
    e.stopPropagation();
    const id = item.getAttribute("data-fn-id");
    if (linking === true) {
      linking = id;
      render();
      say("Now choose the passage it relates to.");
      return;
    }
    if (linking === id) { linking = null; render(); say("Relation cancelled."); return; }
    const view = currentView();
    const ok = CO.addEdge(view.id, linking, id, relSel ? relSel.value : "parallels");
    linking = null;
    render();
    say(ok ? "Relation recorded." : "That relation could not be saved.");
  }, true);

  listEl.addEventListener("click", (e) => {
    const item = e.target.closest("[data-fn-id]");
    if (!item) { disarm(); return; }
    const id = item.getAttribute("data-fn-id");
    const view = currentView();

    if (e.target.closest("[data-fn-remove]")) {
      const btn = e.target.closest("[data-fn-remove]");
      if (armed !== id) {
        disarm();
        armed = id;
        btn.classList.add("is-armed");
        btn.textContent = "Remove?";
        return;
      }
      armed = "";
      NB.remove(id);
      setStatus("");
      render();
      return;
    }

    if (e.target.closest("[data-fn-copy-one]")) {
      const btn = e.target.closest("[data-fn-copy-one]");
      const entry = NB.load().filter((x) => x.id === id)[0];
      if (!entry) return;
      NB.copyText(NB.formatEntry(entry)).then((ok) => {
        btn.textContent = ok ? "Copied" : "Copy failed";
        window.setTimeout(() => { btn.textContent = "Copy citation"; }, 1200);
      });
      return;
    }

    if (CO && view.real && e.target.closest("[data-fn-unfile]")) {
      CO.removeItem(view.id, id);
      render();
      say("Removed from this collection. The passage is still in your notebook.");
      return;
    }

    if (CO && view.real && e.target.closest("[data-fn-up]")) {
      CO.move(view.id, id, -1);
      render();
      focusIn(id, "[data-fn-up]");
      return;
    }

    if (CO && view.real && e.target.closest("[data-fn-down]")) {
      CO.move(view.id, id, 1);
      render();
      focusIn(id, "[data-fn-down]");
      return;
    }

    disarm();
  });

  // Filing a passage into a collection, from Everything or from the
  // unfiled group.
  listEl.addEventListener("change", (e) => {
    const sel = e.target.closest("[data-fn-file]");
    if (!sel || !CO || !sel.value) return;
    const item = sel.closest("[data-fn-id]");
    if (!item) return;
    const name = (CO.load().filter((c) => c.id === sel.value)[0] || {}).name || "that collection";
    CO.add(sel.value, item.getAttribute("data-fn-id"));
    render();
    say(`Filed in ${name}.`);
  });

  /* ── Notes ───────────────────────────────────────────────────── */
  //
  // Autosaved while typing, not only on blur. Blur alone loses a note
  // in the ordinary case: type a sentence, then close the tab or follow
  // the "Open in the reader" link, and `change` never fires. The
  // reader's own panel does the same thing on the same schedule, so a
  // note behaves identically in both places.
  //
  // 500ms, trailing. Short enough that a note is safe almost as soon as
  // it is typed, long enough that a whole sentence is one write to
  // localStorage rather than forty.

  let noteTimer = null;
  let noteField = null;

  function saveNote(field) {
    const item = field.closest("[data-fn-id]");
    const id = item && item.getAttribute("data-fn-id");
    if (!id) return;
    const saved = NB.setNote(id, field.value);
    // A failed save here means the entry is gone — removed in another
    // tab, most likely — and the reader is typing into nothing. Said
    // plainly, and left on screen rather than timed out.
    setStatus(saved ? "Note saved." : "That note could not be saved: it is no longer in your notebook.", saved ? "" : "error");
    if (saved) window.setTimeout(() => setStatus(""), 1600);
  }

  listEl.addEventListener("input", (e) => {
    const field = e.target.closest("[data-fn-note]");
    if (!field) return;
    noteField = field;
    window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => {
      noteTimer = null;
      if (noteField) saveNote(noteField);
    }, 500);
  });

  // Kept alongside the debounce: `change` is what a paste-then-tab
  // produces, and it commits immediately rather than waiting.
  listEl.addEventListener("change", (e) => {
    const field = e.target.closest("[data-fn-note]");
    if (!field) return;
    window.clearTimeout(noteTimer);
    noteTimer = null;
    saveNote(field);
  });

  root.addEventListener("focusout", (e) => {
    const field = e.target.closest && e.target.closest("[data-fn-note]");
    if (field) {
      // Commit whatever the debounce has not written yet, then run any
      // render that was waiting for this field to be free. A timeout of
      // 0, because during focusout the field is still the active
      // element and typing() would say the reader is still in it.
      window.clearTimeout(noteTimer);
      noteTimer = null;
      saveNote(field);
      noteField = null;
      if (deferred) window.setTimeout(render, 0);
    }
    if (!root.contains(e.relatedTarget)) disarm();
  });

  if (filterEl) {
    let timer = null;
    filterEl.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        filter = filterEl.value.trim().toLowerCase();
        disarm();
        render();
      }, 180);
    });
  }

  if (groupEl) {
    groupEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-fn-group-by]");
      if (!btn) return;
      groupBy = btn.getAttribute("data-fn-group-by") || "recent";
      // Inside a collection the author grouping is a property of the
      // collection, so it is remembered with it. The store holds only
      // "author" or nothing (see normalise() in the collections store),
      // so choosing By work inside a collection is a session choice and
      // comes back as Your order next time. That is the schema, said
      // out loud rather than worked around with a second key.
      const view = currentView();
      if (CO && view.real) CO.update(view.id, { sort: groupBy === "author" ? "author" : "" });
      disarm();
      render();
    });
  }

  /* ── Collections ─────────────────────────────────────────────── */

  function openNameForm(mode, value) {
    nameMode = mode;
    if (!nameForm) return;
    nameForm.hidden = false;
    if (nameLegend) nameLegend.textContent = mode === "rename" ? "Rename this collection" : "Name the new collection";
    if (nameInput) {
      nameInput.value = value || "";
      nameInput.focus();
      nameInput.select();
    }
  }

  function closeNameForm() {
    nameMode = "";
    if (nameForm) nameForm.hidden = true;
  }

  if (newBtn) newBtn.addEventListener("click", () => openNameForm("new", ""));
  if (renameBtn) {
    renameBtn.addEventListener("click", () => {
      const v = currentView();
      if (v.real) openNameForm("rename", v.name);
    });
  }

  if (nameForm) {
    nameForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!CO) return;
      const value = (nameInput.value || "").trim();
      if (!value) { say("Give the collection a name."); return; }
      if (nameMode === "rename") {
        const v = currentView();
        say(CO.update(v.id, { name: value }) ? "Renamed." : "That name could not be saved.");
      } else {
        const c = CO.create(value);
        if (c) {
          viewId = c.id;
          CO.setActive(c.id);
          groupBy = "recent";
          say("Collection created.");
        } else {
          say("That collection could not be created. Your browser's storage for this site is full.");
        }
      }
      closeNameForm();
      render();
    });
    const cancel = nameForm.querySelector("[data-fn-name-cancel]");
    if (cancel) {
      cancel.addEventListener("click", () => {
        closeNameForm();
        if (newBtn) newBtn.focus();
      });
    }
  }

  if (deleteBtn) {
    // Two presses, like Remove above and for the same reason: a
    // collection is someone's own arrangement and there is no undo. The
    // confirm lives on the button, not in a dialog.
    let armedDelete = false;
    deleteBtn.addEventListener("click", () => {
      const v = currentView();
      if (!v.real || !CO) return;
      if (!armedDelete) {
        armedDelete = true;
        deleteBtn.textContent = "Delete this collection?";
        say("Press again to delete. The passages themselves stay in your notebook.");
        return;
      }
      CO.remove(v.id);
      armedDelete = false;
      deleteBtn.textContent = "Delete collection";
      viewId = ALL;
      groupBy = "recent";
      render();
      say("Collection deleted. Its passages are still in your notebook.");
    });
    deleteBtn.addEventListener("blur", () => {
      armedDelete = false;
      deleteBtn.textContent = "Delete collection";
    });
  }

  if (linkBtn) {
    linkBtn.addEventListener("click", () => {
      if (linking) { linking = null; render(); say("Relation cancelled."); return; }
      linking = true;
      render();
      say("Choose the first passage.");
    });
  }

  if (memoEl) {
    const ta = memoEl.querySelector("textarea");
    if (ta) {
      ta.addEventListener("blur", () => {
        const v = currentView();
        if (!v.real || !CO || (v.memo || "") === ta.value) return;
        say(CO.update(v.id, { memo: ta.value })
          ? "Working notes saved."
          : "Those notes could not be saved. Copy them before leaving this page.");
      });
    }
  }

  /* ── Copy, download, share ───────────────────────────────────── */

  const copyBtn = document.querySelector("[data-fn-copy]");
  const downloadBtn = document.querySelector("[data-fn-download]");
  const shareBtn = document.querySelector("[data-fn-share]");

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const payload = exportPayload();
      if (!payload) return;
      const label = copyBtn.textContent;
      NB.copyText(payload.text).then((ok) => {
        copyBtn.textContent = ok ? "Copied" : "Copy failed";
        window.setTimeout(() => { copyBtn.textContent = label; }, 1400);
      });
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      const payload = exportPayload();
      if (!payload) return;
      const view = currentView();
      const name = view.real
        ? `${(view.name || "collection").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "collection"}.md`
        : payload.name;
      const blob = new Blob([`${payload.text}\n`], { type: payload.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      const view = currentView();
      const list = shown();
      if (!list.length) return;
      // A collection shares its own relations; everything else shares
      // the notebook's.
      const present = new Set(list.map((e) => e.id));
      const edges = view.real
        ? view.edges.filter((e) => present.has(e.a) && present.has(e.b))
        : NB.loadEdges();
      const hash = NB.encodeShare(list, edges, view.real ? view.name : "Notebook");
      // Land whoever opens it inside a work rather than on a tab strip:
      // the import banner lives in the reader, so the link has to be a
      // reader link. Query kept, fragment dropped, since the payload is
      // the fragment.
      let base = "/the-faith-received/reader/";
      try {
        const u = new URL(NB.linkFor(list[0]), window.location.origin);
        base = u.pathname + u.search;
      } catch (_) { /* keep the default */ }
      const url = window.location.origin + base + hash;
      if (url.length > 8000) {
        say("This is too long for a share link. Use Download to keep the whole thing.");
        return;
      }
      NB.copyText(url).then((ok) => {
        shareBtn.textContent = ok ? "Link copied" : "Copy failed";
        window.setTimeout(() => { shareBtn.textContent = "Share as a link"; }, 1800);
      });
    });
  }

  /* ── Boot ────────────────────────────────────────────────────── *
   * The collection the reader last worked in is where passages kept
   * while reading have been landing, so it is the one to open on. It is
   * only honoured when it still exists: a deleted collection falls back
   * to Everything rather than to a blank strip. */

  if (CO) {
    const last = CO.activeId();
    if (last && CO.load().some((c) => c.id === last)) {
      viewId = last;
      const hit = CO.load().filter((c) => c.id === last)[0];
      if (hit && hit.sort === "author") groupBy = "author";
    }
  }
  render();

  // A note taken in another tab, or the reader open beside this page,
  // should not need a reload to show up here.
  window.addEventListener("storage", (e) => {
    if (e.key !== NB.NOTEBOOK_KEY && e.key !== NB.EDGES_KEY && !(CO && e.key === CO.KEY)) return;
    disarm();
    render();
  });
})();
