/* One stream owner per origin, independent of which conversation is on screen.
   SharedWorker survives panel close and page changes while another site port is open.
   Browsers may suspend it: persisted interrupted states never masquerade as completion. */
importScripts('/assets/js/port/ask-store.js?v=5', '/assets/js/port/ask-stream.js?v=5');
const Store = FRChatStore, jobs = new Map(), ports = new Set();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('fr-ask-updates') : null;
function broadcast(event) { for (const p of ports) { try { p.postMessage(event); } catch (_) { ports.delete(p); } } if (channel) channel.postMessage(event); }
// A previous worker version may still own a live turn in another open tab.
// Preserve recently updated turns; only recover abandoned work after the client window.
const STALE_AFTER=360000;
/* MereO delta: how long THIS FILE waits before it gives up on a turn.
   Named, and the wording below is derived from it, because the old copy
   said "five-minute server window" for a 330s browser-side abort and got
   two things wrong at once. Nothing on the server closes this stream: the
   Ask worker holds a streaming response open with a heartbeat, and the
   only clock that stops it is the AbortController on the next line. The
   deep-research path never reaches this file either, because
   ask-workspace.js sends mode==='deep' to FRResearchJobs instead, so a
   message that says "Research" here names the wrong feature. Re-apply
   when re-vendoring ask-worker.js from upstream. */
const CLIENT_ABORT_MS=330000;
const CLIENT_ABORT_TEXT=(CLIENT_ABORT_MS/60000).toFixed(1).replace(/\.0$/,'')+' minutes';
/* MereO delta (2026-09-29, "Still writing… 871m 3s"): the worker sweeps abandoned quick answers ITSELF, not only when
   it starts. The worker that streamed a turn can die (its tab closed or was suspended) while another tab keeps THIS
   worker alive, and a startup-only sweep never saw that turn. Staleness is the turn's own clock: every save stamps
   turn.beat (heartbeats included), so a turn nobody writes is known without trusting the conversation's ts, which
   other writes touch. It runs at start, whenever a tab connects, and once a minute, so the launcher's "research
   running" count clears with the panel closed too (the Low finding on 1cefc941e). The page-side check in
   ask-workspace.js (abandoned()) stays: the two agree on the 360s ceiling. Re-apply when re-vendoring. */
const lastBeat=t=>Math.max(t.beat||0,t.ts||0,...(t.steps||[]).map(s=>s.ts||0));
async function recoverInterrupted(){
 const all=await Store.all();
 for(const c of all){
  if(jobs.has(c.id))continue;
  if(!(c.turns||[]).some(t=>t.status==='running'&&!t.serverJob&&Date.now()-lastBeat(t)>=STALE_AFTER))continue;
  let n=0;
  await Store.update(c.id,current=>{if(jobs.has(c.id))return;for(const t of current.turns||[])if(t.status==='running'&&!t.serverJob&&Date.now()-lastBeat(t)>=STALE_AFTER){t.status='interrupted';t.error='This research was interrupted when the browser stopped. Retry to start a new attempt.';n++;}if(n)current.unread=true;});
  if(n)broadcast({type:'updated',id:c.id});
 }
}
const ready=recoverInterrupted();
(function sweep(){const t=setTimeout(()=>{recoverInterrupted().catch(()=>{}).finally(sweep);},60000);t?.unref?.();})();
// A stop for a turn another worker streams is passed to that worker (see 'stop' below); the owner aborts it.
if(channel)channel.addEventListener('message',e=>{const d=e.data||{};if(d.type==='stop-request'){const job=jobs.get(d.id);if(job)job.ctl.abort();}});
// what a stream event does to a turn — shared by a live stream and a resumed one (2026-10-03)
function applier(turn, state) {
  return ev => {
      if(Array.isArray(ev.artifacts))turn.artifacts=ev.artifacts.slice(0,30);
      if(ev.corpusState&&Array.isArray(ev.corpusState.queries))turn.corpusState=ev.corpusState;
      if(ev.protocol===2)turn.expectsReceipt=true;
      if(ev.completion==='complete')turn.receivedComplete=true;
      if(ev.check&&typeof ev.check==='object')turn.check={claims:+ev.check.claims||0,supported:+ev.check.supported||0,partial:+ev.check.partial||0,removed:+ev.check.removed||0,quotes:+ev.check.quotes||0,
        // the statements the page supports only in part, or that the check could not confirm (2026-09-26): marked in place
        flags:(Array.isArray(ev.check.flags)?ev.check.flags:[]).slice(0,20).map(f=>({w:String(f&&f.w||''),p:String(f&&f.p||''),v:f&&f.v==='partial'?'partial':'unconfirmed',s:String(f&&f.s||'').slice(0,200)})).filter(f=>f.w&&f.p&&f.s)};
      // the works the research has met so far, shown while it runs (2026-09-26): the stream sends them before the answer
      if(Array.isArray(ev.worksFound))turn.found={items:ev.worksFound.slice(0,12).map(f=>({s:String(f&&f.s||''),a:String(f&&f.a||''),w:String(f&&f.w||'')})).filter(f=>f.s),works:+ev.worksTotal||0,passages:+ev.passagesTotal||0};
      if(ev.relevance==='unrelated')turn.outOfScope=true;
      if (ev.approach && ['ask','deep'].includes(ev.approach.mode)) {
        turn.approach = { mode: ev.approach.mode, automatic: ev.approach.automatic === true, recommended:ev.approach.recommended==='deep'?'deep':null,
          needs: Array.isArray(ev.approach.needs) ? ev.approach.needs.filter(n=>n==='inventory'||n==='file') : [] };
        turn.mode = turn.approach.mode;
      }
      if (ev.t === 'text') turn.a += ev.text;
      else if(ev.t==='replace')turn.a=String(ev.text||'');
      else if (ev.t === 'sources') { turn.src = ev.sources; turn.graph = ev.graph; turn.gaps = ev.deep || ''; turn.unverified = ev.unverified || []; }
      else if (ev.t === 'progress' || ev.t === 'step' || ev.t === 'plan') {
        let message = ev.message || ev.title || ev.note;
        if (ev.t === 'plan') { turn.plan = ev.steps || []; message = 'Planning the research'; }
        if (ev.total) { turn.progress = { done: ev.done, total: ev.total, found: ev.found }; message = 'Reading batch ' + ev.done + ' of ' + ev.total + '; ' + ev.found + ' passages found'; }
        if (!message && ev.i != null) message = (turn.plan || [])[ev.i];
        if (message) { turn.stage = String(message).replace(/\s*[—]\s*/g, ': '); const history = turn.steps || (turn.steps = []); if (!history.length || history[history.length - 1].label !== turn.stage) history.push({ label: turn.stage, ts: Date.now() }); }
      } else if (ev.t === 'report') { turn.a = ev.md || ''; turn.src = ev.sources || (ev.evidence || []).map(f => ({ slug: f.slug, page: f.page, t: f.work, quote: f.quote })); turn.evidence = ev.evidence; turn.stats = ev.stats; state.finished = true; }
      else if (ev.t === 'error') throw new Error('The research could not finish. ' + String(ev.msg || '').slice(0,180));
  };
}
// RESUME (2026-10-03, owner: a question failed when the phone went to another app). The worker stores every Ask turn's stream
// under the turn id and answers GET ?turn=<id> with it; when the live stream breaks, the finished answer is fetched from there.
const RESUME_WINDOW = 420000, RESUME_POLL_MS = typeof FR_RESUME_POLL_MS !== 'undefined' ? FR_RESUME_POLL_MS : 3000;
async function resumeTurn(url, turnId, job, turn, apply, headers) {
  const base = String(url).split('?')[0], t0 = Date.now(); let fails = 0;
  while (Date.now() - t0 < RESUME_WINDOW) {
    if (job.cancelled) return false;
    let rec = null;
    try {
      const r = await fetch(base + '?turn=' + encodeURIComponent(turnId), { headers: headers || {}, credentials: 'same-origin', cache: 'no-store' });
      if (r.status === 404) return false;
      rec = r.ok ? await r.json() : null; fails = 0;
    } catch (_) { if (++fails >= 3) return false; }
    if (rec && rec.status === 'failed') return false;
    if (rec && rec.status === 'done' && typeof rec.text === 'string') {
      turn.a = ''; turn.src = []; turn.receivedComplete = false; turn.expectsReceipt = false; delete turn.replacing; delete turn.finalText;
      try { FRChatStream.parser('ask', apply).feed(rec.text, true); } catch (_) { return false; }
      if (turn.replacing) { if (String(turn.finalText || '').trim()) turn.a = turn.finalText; delete turn.replacing; delete turn.finalText; }
      return !!String(turn.a || '').trim() && !(turn.expectsReceipt && !turn.receivedComplete);
    }
    await new Promise(r => setTimeout(r, RESUME_POLL_MS));
  }
  return false;
}
async function run(id, turnId, request, job) {
  const ctl = job.ctl;
  let turn, lastSave = 0, timer, saveTimer, saveChain=Promise.resolve(), apply = null; const state = { finished: false };
  function save(force = false) {
    const wait=180-(Date.now()-lastSave);
    if (!force && wait>0) {
      if(!saveTimer)saveTimer=setTimeout(()=>{saveTimer=null;save(true).catch(error=>{job.storageError=error;ctl.abort();});},wait);
      return saveChain;
    }
    clearTimeout(saveTimer);saveTimer=null;
    lastSave = Date.now();
    turn.beat = lastSave;
    const snapshot = structuredClone(turn);
    const write=saveChain.then(()=>Store.update(id, c => {
      const i = c.turns.findIndex(t => t.id === turnId); if (i >= 0) c.turns[i] = snapshot;
      c.ts = Date.now(); if (snapshot.status === 'complete' || snapshot.status === 'error') c.unread = true;
    })).then(()=>broadcast({ type: 'updated', id, status: snapshot.status }));
    // Serialize writes so a slower partial save cannot overwrite completion.
    saveChain=write.catch(()=>{});
    return write;
  }
  try {
    const c = await Store.get(id); turn = c.turns.find(t => t.id === turnId);
    if (!turn) throw new Error('Conversation not found');
    apply = applier(turn, state);                        // before the request: a fetch that fails outright still resumes
    timer = setTimeout(() => { job.timeout = true; ctl.abort(); }, CLIENT_ABORT_MS);
    /* MereO delta (ASK-SPEC §7): carry the member bearer.
       This worker has its own global scope and cannot reach
       window.MOAuth, and `credentials: 'same-origin'` sends nothing to
       mo-tfr-ask-dev because that is a different origin. Our Ask worker
       requires a verified Ghost member on every spending route, so
       without this every question 401s. The page mints the token and
       puts it on request.headers; see assets/js/page/faith-ask-workspace.js.
       Re-apply this when re-vendoring ask-worker.js from upstream. */
    if (request.format === 'ask' && request.body && typeof request.body === 'object') request.body.turn = turnId;   // the worker keeps the finished answer under it (2026-10-03)
    let r; try { r = await fetch(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(request.headers || {}) }, credentials: 'same-origin', body: JSON.stringify(request.body), signal: ctl.signal }); }
    catch (e) { job.lostStream = true; throw e; }         // the connection itself failed: the server may still finish the answer
    if (!r.ok || !r.body) {
      /* MereO delta (2026-09-29): the server says why in its JSON `error` (the member's questions for the day, the shared
         daily capacity, signing in: gateResponse in mo-workers ask.js), and the reader is now shown that. A reader who had
         used the day's questions was told "The library is busy. Wait a moment, then retry.", and retrying failed again. */
      let said = ''; try { const j = await r.clone().json(); said = String((j && (j.error || j.message)) || '').slice(0, 300); } catch (_) {}
      if (r.status === 401 || r.status === 403) throw new Error(said || 'Your preview session has expired. Open the library to sign in, then retry.');
      if (r.status === 429) throw new Error(said || 'The library is busy. Wait a moment, then retry.');
      throw new Error('Research is unavailable (' + r.status + '). Your question is saved; you can retry.');
    }
    const parser = FRChatStream.parser(request.format, apply);
    if (request.format === 'follow') {
      const result = await r.json(); if (!result.md) throw new Error(result.error || 'No answer was returned'); turn.a = result.md; state.finished = true;
    } else {
      const reader = r.body.getReader(), decoder = new TextDecoder();
      for (;;) { let step; try { step = await reader.read(); } catch (e) { job.lostStream = true; throw e; } const { done, value } = step; parser.feed(done ? decoder.decode() : decoder.decode(value, { stream: true }), done); await save(); if (done) break; }
    }
    if (/^\s*\(synthesis failed\)\s*$/i.test(turn.a)) { turn.a=''; throw new Error('The selected-work scan could not write its report. Your question is saved. Retry with Deep research.'); }
    if (!turn.a.trim() || (request.format !== 'ask' && !state.finished)) { job.lostStream = true; } if (!turn.a.trim() || (request.format !== 'ask' && !state.finished)) throw new Error('The response ended before an answer was ready. Retry the saved question.');
    if (/The library hit an error answering this/.test(turn.a)) { turn.a=turn.a.split('The library hit an error answering this')[0].trim(); throw new Error(turn.src?.length?'The answer could not be completed. Retrieved source passages are saved below. You can retry.':'The answer could not be completed. Your question is saved; try again.'); }
    if(turn.expectsReceipt&&!turn.receivedComplete){job.lostStream=true;} if(turn.expectsReceipt&&!turn.receivedComplete)throw new Error('The response ended before completion was confirmed. The received text and source passages are saved. Retry to finish.');
    turn.status = 'complete'; turn.stage = 'Complete'; turn.completedAt = Date.now();
  } catch (error) {
    if (!turn) return;
    if (request.format === 'ask' && apply && !job.storageError && (job.lostStream || job.timeout) && (!ctl.signal.aborted || job.timeout)) {
      turn.stage = 'Reconnecting to the answer'; try { await save(true); } catch (_) {}
      if (await resumeTurn(request.url, turnId, job, turn, apply, request.headers)) { turn.status = 'complete'; turn.stage = 'Complete'; turn.completedAt = Date.now(); turn.error = ''; return; }
    }
    turn.status = ctl.signal.aborted && !job.timeout && !job.storageError ? 'stopped' : 'error';
    const detail=String(error.message||error);
    turn.error = job.storageError ? 'The latest text could not be saved. Check available browser storage before retrying.' : job.timeout ? 'This answer was still arriving after '+CLIENT_ABORT_TEXT+', so the browser stopped waiting. Any text received is saved below. Narrow the question, or switch to Deep research, which runs on the server and keeps going after you close the tab.' : ctl.signal.aborted ? 'Stopped. Any partial answer is saved.' : /load failed|failed to fetch|networkerror|network request failed|fetch failed/i.test(detail) ? 'The connection was interrupted. Your question and any received passages are saved. Try again.' : detail;
  } finally {
    clearTimeout(timer); jobs.delete(id);
    if (turn) {
      try { await save(true); broadcast({ type: 'finished', id, status: turn.status, turnId }); }
      catch (_) { broadcast({ type: 'storage-error', id }); }
    }
  }
}
function connect(port) {
  ports.add(port); if (port.start) port.start();
  ready.then(()=>recoverInterrupted()).catch(()=>{});
  port.onmessage = async ({ data }) => {
    try {
      await ready;
      if (data.type === 'start') {
        if (jobs.has(data.id)) throw new Error('This conversation already has an answer in progress.');
        const job = { ctl: new AbortController() }; jobs.set(data.id, job);
        try {
        const c = await Store.get(data.id); if (!c) throw new Error('Conversation not found');
        const pending = c.turns.find(t => t.status === 'running');
        if (pending) throw new Error('This conversation already has an answer in progress.');
        await Store.update(data.id, c => { c.turns.push(data.turn); c.ts = Date.now(); c.draft = ''; });
        run(data.id, data.turn.id, data.request, job);
        } catch (error) { jobs.delete(data.id); throw error; }
      } else if (data.type === 'resume') {
        if (!jobs.has(data.id)) {
          const c = await Store.get(data.id), t = c && (c.turns || []).find(t => t.id === data.turnId);
          const recent = t && !t.serverJob && Date.now() - Math.max(lastBeat(t), t.completedAt || 0) < 900000;
          if (recent && (t.status === 'running' || t.status === 'interrupted' || (t.status === 'error' && /interrupted|ended before|Load failed|network/i.test(t.error || '')))) {
            const job = { ctl: new AbortController() }; jobs.set(data.id, job);
            (async () => {
              const turn = structuredClone(t); turn.status = 'running'; turn.stage = 'Reconnecting to the answer'; turn.error = '';
              const write = () => Store.update(data.id, c => { const i = c.turns.findIndex(x => x.id === turn.id); if (i >= 0) c.turns[i] = structuredClone(turn); c.ts = Date.now(); if (turn.status !== 'running') c.unread = true; });
              try {
                await write(); broadcast({ type: 'updated', id: data.id });
                const ok = await resumeTurn(data.url || '/api/ask', turn.id, job, turn, applier(turn, {}), data.headers);
                if (ok) { turn.status = 'complete'; turn.stage = 'Complete'; turn.completedAt = Date.now(); }
                else { turn.status = job.cancelled ? 'stopped' : 'error'; turn.error = job.cancelled ? '' : 'The connection was interrupted and the answer could not be recovered. Your question is saved. Try again.'; }
              } catch (_) { turn.status = 'error'; turn.error = 'The answer could not be recovered. Your question is saved. Try again.'; }
              finally { jobs.delete(data.id); try { await write(); broadcast({ type: 'finished', id: data.id, status: turn.status, turnId: turn.id }); } catch (_) { broadcast({ type: 'storage-error', id: data.id }); } }
            })();
          }
        }
      } else if (data.type === 'stop') { const job = jobs.get(data.id); if (job) { job.cancelled = true; job.ctl.abort(); } else {
        /* MereO delta (2026-09-29): another worker's turn, or nobody's. Its owner is asked to stop it; if the turn is
           not written to over the next few seconds, no worker is streaming it and it ends here. It used to answer
           "running in another open tab" for good, so a reader could not stop a dead answer. */
        const before=await Store.get(data.id), t0=before?.turns.find(t=>t.status==='running'&&!t.serverJob);
        if(t0){
          if(channel)channel.postMessage({type:'stop-request',id:data.id});
          await new Promise(r=>setTimeout(r,4000));
          await Store.update(data.id,current=>{const t=(current.turns||[]).find(x=>x.id===t0.id);if(t&&t.status==='running'&&lastBeat(t)<=lastBeat(t0)){t.status='stopped';t.error='This answer had stopped arriving and was ended. Your question and any received passages are saved. Retry to start a new attempt.';}});
        }
      } }
      port.postMessage({ type: 'reply', rid: data.rid, ok: true });
      broadcast({ type: 'updated', id: data.id });
    } catch (error) { port.postMessage({ type: 'reply', rid: data.rid, error: String(error.message || error) }); }
  };
}
if ('onconnect' in self) self.onconnect = e => connect(e.ports[0]);
else connect(self);
