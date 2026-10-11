---
description: Run the Deslop agent on the staged changes (or a PR with an argument). Returns PASS, PATCH or FLAG. Runs on every commit and merge per DESLOP-AGENT.md.
---

Invoke the `deslop-agent` subagent with the prompt:

> Deslop the change. If an argument was given ($ARGUMENTS), treat a number as a GitHub PR in this repo (`node scripts/deslop-check.mjs --pr <n> --repo <owner/repo>`) and anything else as a git range (`--range`); otherwise use the staged diff. Read website/agents/DESLOP-AGENT.md in the MOCA first. Run the checker, then read every new or changed reader-facing sentence and style rule against §3b and §3c. Patch what §4 allows, flag the rest in the §5 shape, and reply PASS, PATCH or FLAG.

The mechanical half also runs by itself: the Claude hook blocks `git commit`, `git merge` and `gh pr merge` on errors, and `.github/workflows/deslop.yml` checks every push and PR. `Deslop: skip <reason>` in a commit message or PR body passes the gate; the reason is the record.
