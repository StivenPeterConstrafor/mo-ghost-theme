/*
 * The Faith Received — Pins.
 *
 * The research portfolio: passages the reader has kept, gathered into
 * named collections, with the relations between them drawn out. Binds
 * to custom-faith-pins.hbs; read that template's header for the DOM
 * contract.
 *
 * PORTED FROM the corpus owner's `/pins` page (his
 * assets/js/port/pins.in02.js). His structure is kept whole:
 *
 *   - COLLECTIONS ARE TABS across the top, each with its count, and one
 *     of them is ACTIVE — the one new pins land in while reading.
 *   - A MEMO sits under the tabs: working notes for the collection as a
 *     whole, distinct from the note on any one passage.
 *   - CARDS in the reader's own order, each movable, annotatable and
 *     removable.
 *   - RELATIONS between two pins ("supports", "contests", "cites",
 *     "expands", "parallels"), drawn as a constellation above the list
 *     and listed under it.
 *   - EXPORT: the whole collection as Markdown, or as a share link.
 *
 * WHERE THE DATA LIVES, AND THE ONE REAL CHANGE. His collections hold
 * the saved records themselves. Ours hold ENTRY IDS into
 * window.MOFaithNotebook, and window.MOFaithCollections owns the
 * grouping. The reasoning is in that store's header: this theme already
 * has one definition of a kept passage, and a second copy inside a
 * collection drifts from it the first time a reader edits a note.
 *
 * The visible consequence, and it is a good one: a passage kept while
 * reading shows up here immediately under "Not in a collection",
 * without having been filed. His build needed the reader to have chosen
 * a collection first. Ours cannot lose a passage merely because nobody
 * had decided where to put it yet.
 *
 * WHAT WAS DROPPED. His page could also import a collection from a
 * JSON file and pull one out of a shared Firestore document belonging
 * to his four sister sites. Neither is here: we have no Firebase, and
 * an import path that accepts a file of arbitrary saved records is a
 * trust boundary this page does not need to open in order to do its
 * job. Sharing OUT is kept, through the notebook's own constellation
 * format, which the sister corpora already read.
 *
 * SAFETY. Everything on a card is the reader's own text or a title that
 * came off the network; both are written with textContent. Links are
 * built by MOFaithNotebook.linkFor(), which puts the entry's stored URL
 * through MOSafeHref and falls back to a constructed reader link rather
 * than to nothing.
 */
(function () {
  "use strict";

  const root = document.querySelector("[data-pins-root]");
  if (!root) return;

  const NB = window.MOFaithNotebook;
  const CO = window.MOFaithCollections;

  const tabsEl = root.querySelector("[data-pins-tabs]");
  const memoEl = root.querySelector("[data-pins-memo]");
  const barEl = root.querySelector("[data-pins-bar]");
  const listEl = root.querySelector("[data-pins-list]");
  const consEl = root.querySelector("[data-pins-constellation]");
  const statusEl = root.querySelector("[data-pins-status]");
  const countEl = root.querySelector("[data-pins-count]");
  const footEl = root.querySelector("[data-pins-foot]");

  const newBtn = root.querySelector("[data-pins-new]");
  const renameBtn = root.querySelector("[data-pins-rename]");
  const deleteBtn = root.querySelector("[data-pins-delete]");
  const groupBtn = root.querySelector("[data-pins-group]");
  const linkBtn = root.querySelector("[data-pins-link]");
  const copyBtn = root.querySelector("[data-pins-copy]");
  const shareBtn = root.querySelector("[data-pins-share]");
  const nameForm = root.querySelector("[data-pins-name-form]");
  const nameInput = root.querySelector("[data-pins-name-input]");
  const nameLegend = root.querySelector("[data-pins-name-legend]");

  // The store is loaded by the template immediately above this file. An
  // empty page here would read as "you have never kept anything", which
  // is the one lie this screen must not tell.
  if (!NB || !CO) {
    if (listEl) {
      listEl.appendChild(note("Your collections could not be opened.",
        "Nothing has been changed or lost. This page failed to load the piece that reads them, "
        + "so it is showing nothing rather than the wrong thing."));
    }
    [barEl, footEl, tabsEl].forEach((n) => { if (n) n.hidden = true; });
    return;
  }

  const UNFILED = "~unfiled";

  let activeId = "";
  let linking = null; // the first pin picked, while a relation is being drawn
  let nameMode = ""; // "new" | "rename", while the name form is open

  /* ── Helpers ─────────────────────────────────────────────────── */

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function note(lede, body) {
    const d = el("div", "pins-empty");
    d.appendChild(el("p", "pins-empty-lede", lede));
    if (body) d.appendChild(el("p", "pins-empty-note", body));
    return d;
  }

  function say(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }

  const fmt = (n) => Number(n || 0).toLocaleString();

  function titleOf(e) {
    return e.title || e.work || "Untitled passage";
  }

  function authorOf(e) {
    return e.author || "Unattributed";
  }

  // Every collection, plus the pseudo-collection of everything not yet
  // filed. The unfiled row is only offered when it has something in it,
  // so a reader who files everything never sees an empty extra tab.
  function views() {
    const list = CO.load().map((c) => ({ ...c, entries: CO.resolve(c), real: true }));
    const loose = CO.unfiled();
    if (loose.length) {
      list.push({
        id: UNFILED, name: "Not in a collection", memo: "", sort: "",
        items: loose.map((e) => e.id), edges: [], entries: loose, real: false,
      });
    }
    return list;
  }

  function currentView() {
    const all = views();
    return all.filter((v) => v.id === activeId)[0] || all[0] || null;
  }

  /* ── The name form ───────────────────────────────────────────── *
   * A real form rather than window.prompt(), which his build used.
   * prompt() cannot be styled, cannot be reached by a screen reader in
   * the flow of the page, and is blocked outright in some embedded
   * browsers — where his New collection button would simply do nothing. */
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

  /* ── Cards ───────────────────────────────────────────────────── */

  function card(entry, view, index) {
    const art = el("article", "pins-card");
    art.setAttribute("data-pins-id", entry.id);

    const head = el("div", "pins-card-head");
    const a = el("a", "pins-card-title", titleOf(entry));
    const href = NB.linkFor(entry);
    if (window.MOSafeHref) window.MOSafeHref.set(a, href, "/the-faith-received/");
    else a.setAttribute("href", href);
    head.appendChild(a);
    art.appendChild(head);

    const meta = [authorOf(entry), entry.cite].filter(Boolean).join(" · ");
    if (meta) art.appendChild(el("p", "pins-card-meta", meta));
    if (entry.text) art.appendChild(el("blockquote", "pins-card-text", entry.text));

    // The reader's own note, editable in place. Saved on blur rather
    // than on every keystroke: this writes the whole notebook back, and
    // a 500-entry read-modify-write per character is a stutter on a
    // phone.
    const label = el("label", "pins-note-field");
    label.appendChild(el("span", "visually-hidden", `Your note on ${titleOf(entry)}`));
    const ta = el("textarea", "pins-note");
    ta.rows = 2;
    ta.value = entry.note || "";
    ta.setAttribute("placeholder", "Your note on this passage…");
    ta.addEventListener("blur", () => {
      if ((entry.note || "") === ta.value) return;
      const saved = NB.setNote(entry.id, ta.value);
      say(saved ? "Note saved." : "That note could not be saved. Copy it somewhere before leaving this page.");
      if (saved) entry.note = saved.note;
    });
    label.appendChild(ta);
    art.appendChild(label);

    const acts = el("div", "pins-card-acts");
    if (view.real) {
      // Order is the reader's argument, so it is only movable in a real
      // collection. The unfiled group has no order to defend.
      if (view.sort !== "author") {
        const up = el("button", "pins-act", "Move up");
        up.type = "button";
        up.disabled = index === 0;
        up.addEventListener("click", () => {
          CO.move(view.id, entry.id, -1);
          render();
          focusCard(entry.id, "[data-pins-up]");
        });
        up.setAttribute("data-pins-up", "");
        const down = el("button", "pins-act", "Move down");
        down.type = "button";
        down.disabled = index === view.entries.length - 1;
        down.addEventListener("click", () => {
          CO.move(view.id, entry.id, 1);
          render();
          focusCard(entry.id, "[data-pins-down]");
        });
        down.setAttribute("data-pins-down", "");
        acts.appendChild(up);
        acts.appendChild(down);
      }
      const out = el("button", "pins-act", "Remove from collection");
      out.type = "button";
      out.addEventListener("click", () => {
        CO.removeItem(view.id, entry.id);
        render();
        say("Removed from this collection. The passage is still in your notebook.");
      });
      acts.appendChild(out);
    } else {
      // From the unfiled group the useful action is the opposite one.
      const real = CO.load();
      if (real.length) {
        const sel = el("select", "pins-file");
        sel.setAttribute("aria-label", `Put ${titleOf(entry)} in a collection`);
        const first = el("option", null, "Put in a collection…");
        first.value = "";
        sel.appendChild(first);
        real.forEach((c) => {
          const o = el("option", null, c.name);
          o.value = c.id;
          sel.appendChild(o);
        });
        sel.addEventListener("change", () => {
          if (!sel.value) return;
          CO.add(sel.value, entry.id);
          render();
          say("Filed.");
        });
        acts.appendChild(sel);
      }
    }
    art.appendChild(acts);

    if (linking) {
      art.classList.add("is-linkable");
      if (linking === entry.id) art.classList.add("is-linking");
    }
    return art;
  }

  function focusCard(id, sel) {
    const c = listEl && listEl.querySelector(`[data-pins-id="${CSS.escape(id)}"]`);
    const b = c && c.querySelector(sel);
    if (b) b.focus({ preventScroll: true });
  }

  /* ── The constellation ───────────────────────────────────────── *
   * The relations drawn as a ring, and listed underneath. The list is
   * the part that matters: the ring is unreadable to a screen reader
   * and is marked aria-hidden, so the rows below it carry the same
   * information in text. An edge whose other end has left the notebook
   * is dropped by resolve() upstream and never reaches here. */
  function constellation(view) {
    clear(consEl);
    if (!view.real || !view.edges.length) return;
    const present = new Set(view.entries.map((e) => e.id));
    const edges = view.edges.filter((e) => present.has(e.a) && present.has(e.b));
    if (!edges.length) return;

    consEl.appendChild(el("h2", "pins-cons-title", "Relations you have drawn"));

    const keys = [...new Set(edges.flatMap((e) => [e.a, e.b]))];
    const byId = new Map(view.entries.map((e) => [e.id, e]));
    const W = 640;
    const H = Math.max(240, keys.length * 34);
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(cx - 150, cy - 28);

    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
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

  /* ── Export ──────────────────────────────────────────────────── */

  function markdown(view) {
    const lines = [`# ${view.name}`, ""];
    if (view.memo) { lines.push(`> ${view.memo.replace(/\n+/g, "\n> ")}`, ""); }
    const write = (e) => {
      const head = [authorOf(e), titleOf(e)].filter(Boolean).join(", ");
      lines.push(`- **${head}**${e.cite ? ` — ${e.cite}` : ""}`);
      if (e.text) lines.push(`  > ${e.text.replace(/\n+/g, " ")}`);
      if (e.note) lines.push(`  - ${e.note.replace(/\n+/g, " ")}`);
      const href = NB.linkFor(e);
      if (href) lines.push(`  - ${href}`);
    };
    if (view.sort === "author") {
      const groups = new Map();
      view.entries.forEach((e) => {
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
      view.entries.forEach(write);
      lines.push("");
    }
    if (view.edges && view.edges.length) {
      const byId = new Map(view.entries.map((e) => [e.id, e]));
      lines.push("## Relations", "");
      view.edges.forEach((e) => {
        const a = byId.get(e.a);
        const b = byId.get(e.b);
        if (a && b) lines.push(`- ${titleOf(a)} — *${e.rel}* — ${titleOf(b)}`);
      });
      lines.push("");
    }
    lines.push("— assembled in The Faith Received");
    return lines.join("\n");
  }

  /* ── Render ──────────────────────────────────────────────────── */

  function renderTabs(all, view) {
    clear(tabsEl);
    all.forEach((v) => {
      const b = el("button", "pins-tab");
      b.type = "button";
      b.setAttribute("role", "tab");
      const on = v.id === view.id;
      b.setAttribute("aria-selected", String(on));
      if (on) b.classList.add("is-active");
      if (!v.real) b.classList.add("pins-tab-unfiled");
      b.appendChild(el("span", "pins-tab-name", v.name));
      b.appendChild(el("span", "pins-tab-n", fmt(v.entries.length)));
      b.addEventListener("click", () => {
        activeId = v.id;
        if (v.real) CO.setActive(v.id);
        linking = null;
        render();
      });
      tabsEl.appendChild(b);
    });
  }

  function render() {
    const all = views();
    if (!all.length) {
      clear(tabsEl);
      clear(listEl);
      clear(consEl);
      if (memoEl) memoEl.hidden = true;
      if (barEl) barEl.hidden = true;
      if (footEl) footEl.hidden = true;
      if (countEl) countEl.hidden = true;
      listEl.appendChild(note(
        "Nothing kept yet.",
        "Highlight a passage while reading and choose Save to notebook, and it will appear here. "
        + "Make a collection to gather passages into an argument.",
      ));
      if (newBtn) newBtn.hidden = false;
      return;
    }

    const view = currentView();
    activeId = view.id;
    renderTabs(all, view);

    if (barEl) barEl.hidden = false;
    if (footEl) footEl.hidden = false;
    if (countEl) {
      countEl.hidden = false;
      countEl.textContent = `${fmt(view.entries.length)} ${view.entries.length === 1 ? "passage" : "passages"}`;
    }

    // Actions that only make sense on a real collection.
    [renameBtn, deleteBtn, groupBtn, linkBtn, shareBtn].forEach((b) => {
      if (b) b.hidden = !view.real;
    });
    if (deleteBtn) deleteBtn.hidden = !view.real || CO.load().length < 1;
    if (groupBtn) {
      groupBtn.textContent = view.sort === "author" ? "Your own order" : "Group by author";
      groupBtn.setAttribute("aria-pressed", String(view.sort === "author"));
    }
    if (linkBtn) {
      linkBtn.textContent = linking ? "Choose the second passage" : "Draw a relation";
      linkBtn.setAttribute("aria-pressed", String(!!linking));
      linkBtn.disabled = view.entries.length < 2;
    }

    // The memo.
    if (memoEl) {
      memoEl.hidden = !view.real;
      if (view.real) {
        const ta = memoEl.querySelector("textarea");
        if (ta && document.activeElement !== ta) ta.value = view.memo || "";
      }
    }

    // The cards.
    clear(listEl);
    if (!view.entries.length) {
      listEl.appendChild(note(
        "This collection is empty.",
        "Passages you keep while reading land in the collection marked active. "
        + "You can also move anything here from Not in a collection.",
      ));
    } else if (view.sort === "author") {
      const groups = new Map();
      view.entries.forEach((e) => {
        const k = authorOf(e);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(e);
      });
      [...groups.keys()].sort().forEach((k) => {
        const h = el("h2", "pins-group", k);
        h.appendChild(el("span", "pins-group-n", fmt(groups.get(k).length)));
        listEl.appendChild(h);
        groups.get(k).forEach((e) => listEl.appendChild(card(e, view, -1)));
      });
    } else {
      view.entries.forEach((e, i) => listEl.appendChild(card(e, view, i)));
    }

    constellation(view);
  }

  /* ── Relation drawing ────────────────────────────────────────── */

  if (listEl) {
    listEl.addEventListener("click", (e) => {
      if (!linking) return;
      const c = e.target.closest("[data-pins-id]");
      if (!c) return;
      // While a relation is being drawn the card's own controls are not
      // what the reader means to press.
      e.preventDefault();
      e.stopPropagation();
      const id = c.getAttribute("data-pins-id");
      if (linking === true) {
        linking = id;
        render();
        say("Now choose the passage it relates to.");
        return;
      }
      if (linking === id) { linking = null; render(); say("Relation cancelled."); return; }
      const view = currentView();
      const sel = root.querySelector("[data-pins-rel]");
      const rel = sel ? sel.value : "parallels";
      const ok = CO.addEdge(view.id, linking, id, rel);
      linking = null;
      render();
      say(ok ? "Relation recorded." : "That relation could not be saved.");
    }, true);
  }

  if (linkBtn) {
    linkBtn.addEventListener("click", () => {
      if (linking) { linking = null; render(); say("Relation cancelled."); return; }
      linking = true;
      render();
      say("Choose the first passage.");
    });
  }

  /* ── Wiring ──────────────────────────────────────────────────── */

  if (newBtn) newBtn.addEventListener("click", () => openNameForm("new", ""));
  if (renameBtn) {
    renameBtn.addEventListener("click", () => {
      const v = currentView();
      if (v && v.real) openNameForm("rename", v.name);
    });
  }
  if (nameForm) {
    nameForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = (nameInput.value || "").trim();
      if (!value) { say("Give the collection a name."); return; }
      if (nameMode === "rename") {
        const v = currentView();
        const ok = CO.update(v.id, { name: value });
        say(ok ? "Renamed." : "That name could not be saved.");
      } else {
        const c = CO.create(value);
        if (c) { activeId = c.id; CO.setActive(c.id); say("Collection created."); }
        else say("That collection could not be created. Your browser's storage for this site is full.");
      }
      closeNameForm();
      render();
    });
    const cancel = nameForm.querySelector("[data-pins-name-cancel]");
    if (cancel) {
      cancel.addEventListener("click", () => {
        closeNameForm();
        if (newBtn) newBtn.focus();
      });
    }
  }

  if (deleteBtn) {
    // Two presses, like the notebook panel's Remove and for the same
    // reason: a collection is someone's own arrangement and there is no
    // undo. The confirm lives on the button, not in a dialog.
    let armed = false;
    deleteBtn.addEventListener("click", () => {
      const v = currentView();
      if (!v || !v.real) return;
      if (!armed) {
        armed = true;
        deleteBtn.textContent = "Delete this collection?";
        say("Press again to delete. The passages themselves stay in your notebook.");
        return;
      }
      CO.remove(v.id);
      armed = false;
      deleteBtn.textContent = "Delete collection";
      activeId = "";
      render();
      say("Collection deleted. Its passages are still in your notebook.");
    });
    deleteBtn.addEventListener("blur", () => {
      armed = false;
      deleteBtn.textContent = "Delete collection";
    });
  }

  if (groupBtn) {
    groupBtn.addEventListener("click", () => {
      const v = currentView();
      if (!v || !v.real) return;
      CO.update(v.id, { sort: v.sort === "author" ? "" : "author" });
      render();
    });
  }

  if (memoEl) {
    const ta = memoEl.querySelector("textarea");
    if (ta) {
      ta.addEventListener("blur", () => {
        const v = currentView();
        if (!v || !v.real || (v.memo || "") === ta.value) return;
        const ok = CO.update(v.id, { memo: ta.value });
        say(ok ? "Working notes saved." : "Those notes could not be saved. Copy them before leaving this page.");
      });
    }
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const v = currentView();
      if (!v) return;
      NB.copyText(markdown(v)).then((ok) => {
        say(ok
          ? "Collection copied as Markdown."
          : "The clipboard is not available here. Use Download instead.");
      });
    });
  }

  const downloadBtn = root.querySelector("[data-pins-download]");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      const v = currentView();
      if (!v) return;
      const blob = new Blob([markdown(v)], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(v.name || "collection").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "collection"}.md`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      say("Downloaded.");
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      const v = currentView();
      if (!v || !v.real) return;
      // The notebook's own constellation format, which the sister
      // corpora already read. Entries with no addressable work drop
      // out of the payload, so the count is stated rather than assumed.
      const share = NB.encodeShare(v.entries, v.edges, v.name);
      const url = `${location.origin}/the-faith-received/research/${share}`;
      if (url.length > 8000) {
        say("This collection is too long for a share link. Use Download to keep the whole thing.");
        return;
      }
      NB.copyText(url).then((ok) => {
        say(ok
          ? "Share link copied. Anyone who opens it sees these passages and the relations between them."
          : "The link could not be copied. Use Download instead.");
      });
    });
  }

  // Another tab, or the reader's own notebook panel, changed something.
  window.addEventListener("storage", (e) => {
    if ([NB.NOTEBOOK_KEY, CO.KEY].indexOf(e.key) !== -1) render();
  });

  activeId = CO.activeId();
  render();
})();
