#!/usr/bin/env node
/*
 * TFR changelog from commits (Ian, 2026-09-30: "make sure all changes will
 * show up automatically ... only effects TFR, not the rest of Mere O").
 *
 * Run by .github/workflows/tfr-changelog.yml on every push to main. For
 * each commit in the push:
 *   - it must carry a changelog line in its message:
 *       Changelog: What changed, in one plain sentence.
 *       Changelog-Feature: A new thing readers can do.
 *       Changelog-Works: slug-one, slug-two      (optional; default All works)
 *     "Changelog: none" is allowed and posts nothing;
 *   - AND it must touch a TFR file (TFR_PATHS, a regex set per repo in the
 *     workflow). A commit that touches only the rest of Mere Orthodoxy is
 *     never posted, whatever its message says.
 * Posts to mo-forms POST /tfr-changelog-log with the CHANGELOG_TOKEN
 * secret. The ref is the commit, so a re-run never writes a row twice.
 * A failed post fails the workflow, so a missed entry is visible.
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";

// Which files a commit touched, from git itself (the workflow checks out
// enough history). The push payload's own file lists are not reliable.
// A merge commit has no files under diff-tree, so a merged PR with a
// Changelog line was skipped as "touches no TFR file" (2026-10-01). Diff
// against the first parent instead; a root commit falls back to diff-tree.
function filesOf(sha) {
  const run = (args) => execFileSync("git", args, { encoding: "utf8" }).split("\n").filter(Boolean);
  try {
    return run(["diff", "--name-only", `${sha}^1`, sha]);
  } catch (_) {
    try {
      return run(["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", sha]);
    } catch (__) {
      return [];
    }
  }
}

const ENDPOINT = "https://mo-forms.mo-podcast-feed.workers.dev/tfr-changelog-log";
const token = process.env.CHANGELOG_TOKEN || "";
const tfr = new RegExp(process.env.TFR_PATHS || "^$");
const repo = process.env.REPO_TAG || "repo";
const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));

let failed = 0;
for (const c of event.commits || []) {
  const entries = [];
  let works = [];
  // The subject line is never a changelog line: a commit titled
  // "Changelog: ..." posted itself twice (2026-10-01).
  for (const raw of String(c.message || "").split("\n").slice(1)) {
    const line = raw.trim();
    const w = /^Changelog-Works?:\s*(.+)$/i.exec(line);
    if (w) { works = w[1].split(/[,\s]+/).filter(Boolean); continue; }
    const m = /^Changelog(-Feature)?:\s*(.+)$/i.exec(line);
    if (m && !/^none\.?$/i.test(m[2].trim())) entries.push({ kind: m[1] ? "feature" : "staff", summary: m[2].trim() });
  }
  if (!entries.length) continue;
  const listed = [...(c.added || []), ...(c.modified || []), ...(c.removed || [])];
  const files = listed.length ? listed : filesOf(c.id);
  if (!files.some((f) => tfr.test(f))) {
    console.log(`skip ${c.id.slice(0, 8)}: has a Changelog line but touches no TFR file`);
    continue;
  }
  if (!token) { console.error("CHANGELOG_TOKEN is not set"); process.exit(1); }
  const at = new Date(c.timestamp).toISOString().replace("T", " ").slice(0, 19);
  for (const [i, e] of entries.entries()) {
    const ref = `git:${repo}:${c.id.slice(0, 12)}${entries.length > 1 ? `:${i}` : ""}`;
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ ref, at, summary: e.summary, kind: e.kind, works }),
    });
    const text = await res.text();
    console.log(`${c.id.slice(0, 8)} ${e.kind}: ${res.status} ${text}`);
    if (!res.ok) failed++;
  }
}
if (failed) process.exit(1);
