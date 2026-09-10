/*
 * The Faith Received — the Desk.
 *
 * Where the reading turns into writing: a plain editor with the
 * reader's own kept passages in a rail beside it, each one insertable
 * with its citation already attached. Binds to custom-faith-desk.hbs;
 * read that template's header for the DOM contract.
 *
 * PORTED FROM the corpus owner's Desk (his assets/js/port/desk.in02.js).
 * The shape of the thing is his and is the point:
 *
 *   - THREE COLUMNS. Documents on the left, the draft in the middle,
 *     research on the right. On a narrow screen the two rails become
 *     overlays over the draft, because the draft is what the page is
 *     for and it never gets squeezed into a gutter.
 *   - THE RAIL INSERTS WITH THE CITATION. This is the whole idea. A
 *     passage does not arrive as loose text to be attributed later; it
 *     arrives as a blockquote with its author, work and a link back to
 *     the exact block, because a quotation whose source has to be
 *     reconstructed afterwards is how misattribution happens.
 *   - A PAPER KNOWS ITS COLLECTION, so the rail opens on the material
 *     that paper is being written from rather than on everything.
 *   - IT SAVES ITSELF, and says when it has.
 *
 * WHAT WAS DROPPED, AND WHY. His rail has four tabs: notes,
 * highlights, reading history and Ask conversations. Only the first
 * exists here, because only the first has a store on our side —
 * `fr_hl`, `fr_lastread` and `fr_chats` are his. Three tabs that were
 * always empty would say "you have highlighted nothing" to a reader who
 * has highlighted plenty, in a different tool. His iframe preview of a
 * source beside the draft is likewise gone: a link that opens the
 * reader in a new tab does the same work without putting our own pages
 * in a frame.
 *
 * WHAT IT DOES NOT DO. It does not sync. Papers are in this browser,
 * the footer says so in as many words, and the export is one press away
 * for exactly that reason.
 *
 * ON contenteditable AND execCommand. Both are ancient and
 * execCommand is formally deprecated, and both are still what every
 * browser actually implements for a rich-text box. The alternative is
 * a several-thousand-line editing engine for a screen whose entire
 * formatting vocabulary is two headings, bold, italic, a blockquote and
 * a list. The toolbar therefore uses execCommand; INSERTION does not —
 * it builds real nodes and puts them in a Range, so no HTML string is
 * ever parsed out of a passage's text.
 */
(function () {
  "use strict";

  const root = document.querySelector("[data-desk-root]");
  if (!root) return;

  const NB = window.MOFaithNotebook;
  const CO = window.MOFaithCollections;
  const DK = window.MOFaithDesk;

  const editor = root.querySelector("[data-desk-editor]");
  const titleInput = root.querySelector("[data-desk-title]");
  const wordsEl = root.querySelector("[data-desk-words]");
  const saveStateEl = root.querySelector("[data-desk-savestate]");
  const toolbar = root.querySelector("[data-desk-toolbar]");

  const docsPanel = root.querySelector("[data-desk-docs]");
  const docsList = root.querySelector("[data-desk-doc-list]");
  const docsToggle = root.querySelector("[data-desk-docs-toggle]");
  const docsClose = root.querySelector("[data-desk-docs-close]");
  const newDocBtn = root.querySelector("[data-desk-new]");

  const railPanel = root.querySelector("[data-desk-rail]");
  const railBody = root.querySelector("[data-desk-rail-body]");
  const railToggle = root.querySelector("[data-desk-rail-toggle]");
  const railClose = root.querySelector("[data-desk-rail-close]");
  const railSearch = root.querySelector("[data-desk-rail-search]");
  const railMore = root.querySelector("[data-desk-rail-more]");
  const collectionSel = root.querySelector("[data-desk-collection]");

  const scrim = root.querySelector("[data-desk-scrim]");
  const statusEl = root.querySelector("[data-desk-status]");
  const exportBtn = root.querySelector("[data-desk-export]");
  const printBtn = root.querySelector("[data-desk-print]");
  const deleteBtn = root.querySelector("[data-desk-delete]");

  if (!editor || !DK || !NB) {
    if (statusEl) {
      statusEl.textContent = "The Desk could not be opened. Nothing has been lost; "
        + "this page failed to load the piece that reads your papers.";
    }
    return;
  }

  let current = null;
  let dirty = false;
  let saveTimer = null;
  let savedRange = null;
  let railLimit = 20;

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

  function say(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }

  function saveState(msg) {
    if (saveStateEl) saveStateEl.textContent = msg;
  }

  const fmt = (n) => Number(n || 0).toLocaleString();

  function titleOf(e) {
    return e.title || e.work || "Untitled passage";
  }

  /* ── Saving ──────────────────────────────────────────────────── *
   * Returns false on a failed write, and every caller that is about to
   * navigate away or swap documents checks it. The store does not evict
   * to make room (see its header), so a false here is real and the
   * reader is told, with the text still on screen. */
  function saveNow() {
    if (!current || !dirty) return true;
    const saved = DK.update(current.id, {
      title: (titleInput.value || "").trim() || "Untitled paper",
      html: editor.innerHTML,
    });
    if (!saved) {
      saveState("This paper could not be saved. Download it before you close this page.");
      return false;
    }
    current = saved;
    dirty = false;
    saveState("Saved in this browser");
    renderDocs();
    return true;
  }

  function autosave() {
    dirty = true;
    saveState("Saving…");
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveNow, 700);
    updateWords();
  }

  function updateWords() {
    const t = (editor.textContent || "").trim();
    if (wordsEl) wordsEl.textContent = t ? `${fmt(t.split(/\s+/).length)} words` : "";
  }

  /* ── Documents ───────────────────────────────────────────────── */

  function openDoc(id) {
    window.clearTimeout(saveTimer);
    if (current && !saveNow()) return false;
    const d = DK.get(id);
    if (!d) return false;
    current = d;
    dirty = false;
    savedRange = null;
    titleInput.value = d.title === "Untitled paper" ? "" : d.title;
    editor.innerHTML = d.html || "";
    DK.setContext(d.id);
    const url = new URL(location.href);
    url.searchParams.set("doc", d.id);
    history.replaceState(null, "", url.pathname + url.search);
    saveState("Saved in this browser");
    updateWords();
    renderDocs();
    syncCollection();
    renderRail();
    closePanels();
    return true;
  }

  function newDoc() {
    window.clearTimeout(saveTimer);
    if (current && !saveNow()) return;
    const created = DK.create({
      title: "Untitled paper",
      html: "",
      collection: CO ? CO.activeId() : "",
    });
    if (!created) {
      saveState("A new paper could not be created. Your browser's storage for this site is full.");
      return;
    }
    current = created;
    dirty = false;
    titleInput.value = "";
    editor.innerHTML = "";
    DK.setContext(created.id);
    updateWords();
    renderDocs();
    syncCollection();
    closePanels();
    titleInput.focus();
  }

  function renderDocs() {
    if (!docsList) return;
    const list = DK.all();
    clear(docsList);
    if (!list.length) {
      docsList.appendChild(el("p", "desk-empty", "Papers you write are kept here, in this browser."));
      return;
    }
    list.forEach((d) => {
      const b = el("button", "desk-doc");
      b.type = "button";
      if (current && d.id === current.id) {
        b.classList.add("is-active");
        b.setAttribute("aria-current", "true");
      }
      b.appendChild(el("span", "desk-doc-title", d.title || "Untitled paper"));
      b.appendChild(el("span", "desk-doc-date", new Date(d.ts).toLocaleDateString()));
      b.addEventListener("click", () => openDoc(d.id));
      docsList.appendChild(b);
    });
  }

  /* ── The research rail ───────────────────────────────────────── */

  function railEntries() {
    const chosen = collectionSel ? collectionSel.value : "all";
    if (!CO || chosen === "all") return NB.load();
    if (chosen === "~unfiled") return CO.unfiled();
    const c = CO.load().filter((x) => x.id === chosen)[0];
    return c ? CO.resolve(c) : [];
  }

  function syncCollection() {
    if (!collectionSel || !CO) return;
    const cols = CO.load();
    const want = collectionSel.value || (current && current.collection) || "all";
    clear(collectionSel);
    const all = el("option", null, "Everything you have kept");
    all.value = "all";
    collectionSel.appendChild(all);
    cols.forEach((c) => {
      const o = el("option", null, c.name);
      o.value = c.id;
      collectionSel.appendChild(o);
    });
    if (CO.unfiled().length) {
      const o = el("option", null, "Not in a collection");
      o.value = "~unfiled";
      collectionSel.appendChild(o);
    }
    const has = Array.prototype.some.call(collectionSel.options, (o) => o.value === want);
    collectionSel.value = has ? want : "all";
  }

  function renderRail() {
    if (!railBody) return;
    let list = railEntries();
    const q = railSearch ? railSearch.value.trim().toLowerCase() : "";
    if (q) {
      list = list.filter((e) => [e.title, e.author, e.cite, e.text, e.note]
        .join(" ").toLowerCase().indexOf(q) !== -1);
    }
    const visible = list.slice(0, railLimit);
    clear(railBody);

    if (!visible.length) {
      railBody.appendChild(el("p", "desk-empty", q
        ? "Nothing you have kept matches that."
        : "Highlight a passage while reading and choose Save to notebook. "
          + "It will appear here with its citation, ready to quote."));
      if (railMore) railMore.hidden = true;
      return;
    }

    visible.forEach((e) => {
      const art = el("article", "desk-item");
      art.appendChild(el("p", "desk-item-cite",
        [e.author, titleOf(e), e.cite].filter(Boolean).join(" · ")));
      if (e.text) art.appendChild(el("p", "desk-item-text", e.text));
      if (e.note) art.appendChild(el("p", "desk-item-note", e.note));

      const acts = el("div", "desk-item-acts");
      const ins = el("button", "desk-act", "Insert with citation");
      ins.type = "button";
      ins.addEventListener("click", () => insertEntry(e));
      acts.appendChild(ins);

      const href = NB.linkFor(e);
      if (href) {
        const a = el("a", "desk-act desk-act-link", "Open the source");
        if (window.MOSafeHref) window.MOSafeHref.set(a, href, "/the-faith-received/");
        else a.setAttribute("href", href);
        a.target = "_blank";
        a.rel = "noopener";
        acts.appendChild(a);
      }
      art.appendChild(acts);
      railBody.appendChild(art);
    });

    if (railMore) {
      railMore.hidden = list.length <= railLimit;
      railMore.textContent = `Show more (${fmt(visible.length)} of ${fmt(list.length)})`;
    }
  }

  /* ── Insertion ───────────────────────────────────────────────── *
   * Real nodes into a Range. No HTML string is built from an entry's
   * fields anywhere in here, so a passage containing angle brackets is
   * text and can never become markup. */
  function quoteNode(e) {
    const bq = document.createElement("blockquote");
    const p = document.createElement("p");
    p.textContent = e.text || e.note || titleOf(e);
    bq.appendChild(p);

    const cite = document.createElement("cite");
    cite.textContent = [e.author, titleOf(e), e.cite].filter(Boolean).join(", ");
    const href = NB.linkFor(e);
    if (href && (!window.MOSafeHref || window.MOSafeHref.isSafe(href))) {
      cite.appendChild(document.createTextNode(" · "));
      const a = document.createElement("a");
      a.href = href;
      a.textContent = "Read in context";
      cite.appendChild(a);
    }
    bq.appendChild(cite);
    return bq;
  }

  function insertEntry(e) {
    if (!current) newDoc();
    if (!current) { say("Choose a paper before inserting."); return; }
    editor.focus();

    const sel = window.getSelection();
    let range = null;
    if (savedRange && editor.contains(savedRange.startContainer)) {
      range = savedRange.cloneRange();
    } else {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    range.collapse(false);

    const frag = document.createDocumentFragment();
    frag.appendChild(quoteNode(e));
    const after = document.createElement("p");
    after.appendChild(document.createElement("br"));
    frag.appendChild(after);

    range.insertNode(frag);
    // Put the caret in the empty paragraph after the quotation, so the
    // reader carries on writing rather than inside the citation.
    const next = document.createRange();
    next.setStart(after, 0);
    next.collapse(true);
    sel.removeAllRanges();
    sel.addRange(next);
    savedRange = next.cloneRange();

    autosave();
    const ok = saveNow();
    say(ok
      ? `Inserted into ${current.title}.`
      : "Inserted, but the paper could not be saved. Download it before you close this page.");
    if (window.matchMedia("(max-width: 1160px)").matches) closePanels();
  }

  /* ── Panels ──────────────────────────────────────────────────── */

  function syncPanels() {
    const compact = window.matchMedia("(max-width: 1160px)").matches;
    const narrow = window.matchMedia("(max-width: 940px)").matches;
    const docsOpen = docsPanel && docsPanel.classList.contains("is-open");
    const railOpen = railPanel && railPanel.classList.contains("is-open");
    const overlay = (compact && docsOpen) || (narrow && railOpen);
    if (scrim) scrim.hidden = !overlay;
    if (docsToggle) docsToggle.setAttribute("aria-expanded", String(!!docsOpen));
    if (railToggle) railToggle.setAttribute("aria-expanded", String(!!railOpen));
    root.classList.toggle("desk-overlay", !!overlay);
  }

  function closePanels() {
    if (docsPanel) docsPanel.classList.remove("is-open");
    if (railPanel) railPanel.classList.remove("is-open");
    syncPanels();
  }

  if (docsToggle) {
    docsToggle.addEventListener("click", () => {
      const open = docsPanel.classList.toggle("is-open");
      if (railPanel) railPanel.classList.remove("is-open");
      syncPanels();
      if (open && docsClose) docsClose.focus();
    });
  }
  if (railToggle) {
    railToggle.addEventListener("click", () => {
      const open = railPanel.classList.toggle("is-open");
      if (docsPanel) docsPanel.classList.remove("is-open");
      syncPanels();
      if (open && railClose) railClose.focus();
    });
  }
  if (docsClose) {
    docsClose.addEventListener("click", () => { closePanels(); if (docsToggle) docsToggle.focus(); });
  }
  if (railClose) {
    railClose.addEventListener("click", () => { closePanels(); if (railToggle) railToggle.focus(); });
  }
  if (scrim) scrim.addEventListener("click", closePanels);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanels();
  });
  window.addEventListener("resize", syncPanels);

  /* ── Toolbar ─────────────────────────────────────────────────── */

  if (toolbar) {
    Array.prototype.forEach.call(toolbar.querySelectorAll("[data-desk-cmd]"), (b) => {
      // mousedown default would move the caret out of the editor before
      // the command runs, so the command would apply to nothing.
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        const cmd = b.getAttribute("data-desk-cmd");
        const val = b.getAttribute("data-desk-value") || null;
        editor.focus();
        try { document.execCommand(cmd, false, val); } catch (_) { /* nothing to do */ }
        autosave();
      });
    });
  }

  editor.addEventListener("input", autosave);
  if (titleInput) titleInput.addEventListener("input", autosave);

  document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }
  });

  /* ── Export ──────────────────────────────────────────────────── */

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      saveNow();
      const name = (titleInput.value || "").trim() || "Untitled paper";
      const md = `# ${name}\n\n${DK.toMarkdown(editor).replace(/\n{3,}/g, "\n\n").trim()}\n`;
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "paper"}.md`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      say("Downloaded.");
    });
  }
  if (printBtn) {
    printBtn.addEventListener("click", () => { saveNow(); window.print(); });
  }

  if (deleteBtn) {
    let armed = false;
    deleteBtn.addEventListener("click", () => {
      if (!current) return;
      if (!armed) {
        armed = true;
        deleteBtn.textContent = "Delete this paper?";
        say("Press again to delete. This cannot be undone.");
        return;
      }
      DK.remove(current.id);
      armed = false;
      deleteBtn.textContent = "Delete paper";
      current = null;
      dirty = false;
      const rest = DK.all();
      if (rest.length) openDoc(rest[0].id);
      else newDoc();
      say("Paper deleted.");
    });
    deleteBtn.addEventListener("blur", () => {
      armed = false;
      deleteBtn.textContent = "Delete paper";
    });
  }

  /* ── Rail wiring ─────────────────────────────────────────────── */

  if (collectionSel) {
    collectionSel.addEventListener("change", () => {
      railLimit = 20;
      if (current) {
        const value = collectionSel.value === "all" || collectionSel.value === "~unfiled" ? "" : collectionSel.value;
        const saved = DK.update(current.id, { collection: value });
        if (saved) current = saved;
      }
      renderRail();
    });
  }
  if (railSearch) {
    railSearch.addEventListener("input", () => { railLimit = 20; renderRail(); });
  }
  if (railMore) {
    railMore.addEventListener("click", () => { railLimit += 20; renderRail(); });
  }
  if (newDocBtn) newDocBtn.addEventListener("click", newDoc);

  window.addEventListener("storage", (e) => {
    if (!CO) return;
    if ([NB.NOTEBOOK_KEY, CO.KEY].indexOf(e.key) !== -1) { syncCollection(); renderRail(); }
  });

  // A paper half-typed and a tab closed is the commonest way to lose
  // work in a tool like this.
  window.addEventListener("pagehide", () => {
    window.clearTimeout(saveTimer);
    saveNow();
  });

  /* ── Boot ────────────────────────────────────────────────────── */

  syncPanels();
  syncCollection();

  const wanted = new URLSearchParams(location.search).get("doc");
  const all = DK.all();
  if (wanted && all.some((d) => d.id === wanted)) openDoc(wanted);
  else if (wanted) {
    say("That paper is not in this browser. Papers are kept where they were written; "
      + "open the link there, or download the paper and bring the file across.");
    if (all.length) openDoc(DK.context().docId && all.some((d) => d.id === DK.context().docId)
      ? DK.context().docId : all[0].id);
    else newDoc();
  } else if (all.length) {
    const last = DK.context().docId;
    openDoc(all.some((d) => d.id === last) ? last : all[0].id);
  } else newDoc();

  renderRail();
})();
