/*
 * The Faith Received — Ask's conversations, in one place.
 *
 * WHY THIS EXISTS. Ask was a single shot: you asked, you read, and the
 * answer was gone the moment you navigated. The ported workspace is a
 * conversation with a history rail beside it, so there has to be one
 * definition of what a conversation IS on disk. Two surfaces parsing
 * the same key through two copies of the same code is a format that
 * drifts, and the way it fails is that a reader loses work nobody
 * reported losing. Same rule as faith-notebook-store.js: nothing
 * outside this file may read or write `fr_ask_chats`.
 *
 * WHERE IT LIVES. localStorage, per browser, and the workspace says so
 * in as many words ("Conversations are saved in this browser"). Deep
 * research is the exception and knows it: those runs are server jobs
 * keyed by id, and the row here is a pointer to one. If conversations
 * ever move to a worker they move HERE and every surface follows.
 *
 * THE SHAPE, and why each field is on it:
 *
 *   conversation
 *     id       "c" + base36 time + base36 random. Unique, not ordered.
 *     title    the first question, trimmed to TITLE_MAX. Renameable.
 *              Minted from the question rather than asked for, because a
 *              reader who has to name a thing before making it makes
 *              fewer of them.
 *     scope    { traditions: [], author: "" } — the scope the NEXT turn
 *              inherits. Carried on the conversation, not the turn, so
 *              a follow-up stays inside the shelf the reader chose.
 *     created  ms. updated ms, bumped on every write, and the ONLY sort
 *              key the rail uses.
 *     archived bool. Archived conversations leave the list and keep
 *              their turns; nothing here deletes a turn.
 *     turns    [turn], oldest first, which is reading order.
 *
 *   turn
 *     id       "t" + …
 *     q        the question as asked.
 *     mode     "ask" | "deep".
 *     status   "running" | "done" | "error" | "stopped".
 *     answer   the finished markdown. Accumulated deltas land here.
 *     sources  [{slug, page, author, title}] from the brain's `result`.
 *              NOT quotes: the deployed brain does not send passage
 *              text, so a source card shows where to look and never
 *              pretends to show what it says.
 *     steps    the progress lines, in order, which ARE the research
 *              activity — the brain has no separate step frame, so the
 *              stage messages are the record of what it did.
 *     loci     parsed out of the "Loci: …" progress line, for the
 *              "Research context" row.
 *     error    the message, when status is "error".
 *     jobId    the server job, for a deep run only.
 *
 * SIZE. A conversation is capped at MAX_TURNS and the store at
 * MAX_CHATS, oldest-updated dropped first, because localStorage throws
 * when it is full and a throw here would lose the conversation the
 * reader is in the middle of. Archived rows are dropped before live
 * ones.
 */
(function () {
  "use strict";

  const KEY = "fr_ask_chats";
  const MAX_CHATS = 60;
  const MAX_TURNS = 80;
  const TITLE_MAX = 90;
  const ANSWER_MAX = 120000;   // one very long deep answer, not a novel

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function readAll() {
    try {
      const raw = window.localStorage.getItem(KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.filter((c) => c && c.id) : [];
    } catch (_) {
      // A corrupt blob must not take Ask down with it. An empty list is
      // recoverable; a thrown parse on every page load is not.
      return [];
    }
  }

  /*
   * Trim to fit, then write. Live conversations outrank archived ones
   * whatever their dates, because archiving is the reader saying "keep
   * this but get it out of my way", not "lose it first".
   */
  function writeAll(list) {
    const ordered = list.slice().sort((a, b) => {
      if (!!a.archived !== !!b.archived) return a.archived ? 1 : -1;
      return (b.updated || 0) - (a.updated || 0);
    });
    const kept = ordered.slice(0, MAX_CHATS).map((c) => ({
      ...c,
      turns: (c.turns || []).slice(-MAX_TURNS),
    }));
    try {
      window.localStorage.setItem(KEY, JSON.stringify(kept));
    } catch (_) {
      // Out of quota. Drop the oldest half and try once; if that fails
      // too, leave what is on disk alone rather than clearing it.
      try {
        window.localStorage.setItem(KEY, JSON.stringify(kept.slice(0, Math.ceil(kept.length / 2))));
      } catch (__) { /* keep what is there */ }
    }
    return kept;
  }

  function list(opts) {
    const wantArchived = !!(opts && opts.archived);
    return readAll()
      .filter((c) => !!c.archived === wantArchived)
      .sort((a, b) => (b.updated || 0) - (a.updated || 0));
  }

  function get(id) {
    return readAll().find((c) => c.id === id) || null;
  }

  function titleFrom(question) {
    const q = String(question || "").replace(/\s+/g, " ").trim();
    if (!q) return "New conversation";
    return q.length > TITLE_MAX ? `${q.slice(0, TITLE_MAX - 1)}…` : q;
  }

  function create(scope) {
    const now = Date.now();
    const chat = {
      id: uid("c"),
      title: "New conversation",
      scope: normaliseScope(scope),
      created: now,
      updated: now,
      archived: false,
      turns: [],
    };
    const all = readAll();
    all.unshift(chat);
    writeAll(all);
    return chat;
  }

  function normaliseScope(scope) {
    const s = scope || {};
    return {
      traditions: Array.isArray(s.traditions) ? s.traditions.slice(0, 12) : [],
      author: String(s.author || "").slice(0, 100),
    };
  }

  /* One write path for every mutation, so `updated` can never be missed. */
  function update(id, mutate) {
    const all = readAll();
    const i = all.findIndex((c) => c.id === id);
    if (i < 0) return null;
    const next = mutate({ ...all[i] });
    if (!next) return all[i];
    next.updated = Date.now();
    all[i] = next;
    writeAll(all);
    return next;
  }

  function addTurn(chatId, turn) {
    const t = {
      id: uid("t"),
      q: String(turn && turn.q || "").slice(0, 2000),
      mode: turn && turn.mode === "deep" ? "deep" : "ask",
      status: "running",
      answer: "",
      sources: [],
      steps: [],
      loci: "",
      error: "",
      jobId: (turn && turn.jobId) || null,
      created: Date.now(),
    };
    update(chatId, (c) => {
      c.turns = (c.turns || []).concat([t]);
      // The first question names the conversation. A rename by the
      // reader sticks, so only an untouched title is replaced.
      if (c.turns.length === 1 && c.title === "New conversation") c.title = titleFrom(t.q);
      return c;
    });
    return t;
  }

  /*
   * Patch a turn in place. Called on every delta while an answer
   * streams, so it takes the whole turn rather than a field name: one
   * read-modify-write per frame is already the cost, and a per-field
   * API would multiply it.
   */
  function patchTurn(chatId, turnId, patch) {
    return update(chatId, (c) => {
      c.turns = (c.turns || []).map((t) => {
        if (t.id !== turnId) return t;
        const next = { ...t, ...patch };
        if (typeof next.answer === "string" && next.answer.length > ANSWER_MAX) {
          next.answer = next.answer.slice(0, ANSWER_MAX);
        }
        return next;
      });
      return c;
    });
  }

  function rename(id, title) {
    return update(id, (c) => {
      c.title = titleFrom(title);
      return c;
    });
  }

  function setScope(id, scope) {
    return update(id, (c) => {
      c.scope = normaliseScope(scope);
      return c;
    });
  }

  function archive(id, on) {
    return update(id, (c) => {
      c.archived = on !== false;
      return c;
    });
  }

  /*
   * The only path that loses a conversation, and it is the reader's own
   * explicit act. Everything else archives.
   */
  function remove(id) {
    writeAll(readAll().filter((c) => c.id !== id));
  }

  function search(q) {
    const needle = String(q || "").trim().toLowerCase();
    if (!needle) return list();
    return list().filter((c) => {
      if (String(c.title || "").toLowerCase().includes(needle)) return true;
      return (c.turns || []).some((t) => String(t.q || "").toLowerCase().includes(needle));
    });
  }

  /* Plain text of one conversation, for Download conversation. */
  function toText(id) {
    const c = get(id);
    if (!c) return "";
    const parts = [c.title, ""];
    (c.turns || []).forEach((t) => {
      parts.push(`Q: ${t.q}`, "");
      if (t.answer) parts.push(t.answer, "");
      if ((t.sources || []).length) {
        parts.push("Sources:");
        t.sources.forEach((s, i) => {
          parts.push(`  [${i + 1}] ${[s.author, s.title].filter(Boolean).join(", ")}, p. ${s.page}`);
        });
        parts.push("");
      }
    });
    return parts.join("\n");
  }

  window.MOFaithAskStore = {
    list, get, create, addTurn, patchTurn, rename, setScope,
    archive, remove, search, toText, titleFrom,
  };
})();
