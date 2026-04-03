# Bug Hunt + Review & Fix Loop

Orchestrator that runs `/bug-hunt` and `/review-and-fix` back-to-back in a loop until **both produce 0 findings for 3 consecutive combined cycles**.

## Worktree Setup

Before starting any work, ensure you are operating in a git worktree:

1. **If already in a worktree** (current directory path contains `.claude/worktrees/`): proceed in the current directory.
2. **If NOT in a worktree**: Create one:
   ```bash
   git worktree add .claude/worktrees/bh-rf-$(date +%s) -b bh-rf-$(date +%s)
   ```
   Then `cd` into the worktree directory before proceeding.

**All file reads, edits, quality gates, and commits must happen inside the worktree.** Never modify files in the main working directory.

## How It Works

Each "cycle" consists of two steps run sequentially:

1. **Bug Hunt** — deep-scan the **entire codebase** for bugs (all phases: scan, report, fix) **without committing**
2. **Review & Fix** — review only the **uncommitted changes** (accumulated fixes) for regressions or new issues

A cycle is **clean** only if Bug Hunt found 0 bugs AND Review & Fix found 0 issues. If either finds anything, the consecutive clean counter resets to 0.

```
Cycle 1 → BH: 5 bugs, R&F: 3 issues → fix all → Cycle 2 → BH: 1 bug, R&F: 0 → fix → Cycle 3 → BH: 0, R&F: 0 → Cycle 4 → BH: 0, R&F: 0 → Cycle 5 → BH: 0, R&F: 0 → DONE
```

## Scope Distinction (CRITICAL)

The two steps have **different scopes** — do not conflate them:

| Step             | Scope                                               | What NOT to do                                               |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| **Bug Hunt**     | **Entire codebase** — all source directories        | Do NOT start with `git diff`. Do NOT limit to changed files. |
| **Review & Fix** | **Uncommitted changes only** — output of `git diff` | Do NOT scan unmodified files.                                |

## Cycle Steps

### Step 1 — Run `/bug-hunt` (ENTIRE CODEBASE)

Follow all instructions in `.claude/commands/bug-hunt.md`. Execute a **single full pass** (Phase 1–4) with these overrides:

- **Override loop mode** — do NOT use Bug Hunt's internal 3-clean-run loop. This orchestrator controls looping.
- **Override commit behavior** — skip Phase 3 step 6 (commit) and Phase 4 Commits table. Leave all changes uncommitted.
- **Do NOT run `git diff`** — Bug Hunt scans the entire codebase by reading source files directly, not the diff.
- **Launch at least 3 parallel agents** with explicit directory assignments so each area of the codebase gets independent coverage.

Record the total number of bugs found.

### Step 2 — Run `/review-and-fix` (UNCOMMITTED CHANGES ONLY)

Follow all instructions in `.claude/commands/review-and-fix.md`. Execute a **single full pass** (Phase 1–3) with this override:

- **Override loop mode** — do NOT use Review & Fix's internal 3-clean-run loop. This orchestrator controls looping.

This step reviews only the `git diff` — the accumulated uncommitted changes from Bug Hunt fixes. Its purpose is to catch regressions or issues introduced by the fixes themselves.

Record the number of issues found.

### Step 3 — Cycle Summary

After both steps complete, print:

```
### Cycle N complete — Bug Hunt: {X bugs | clean}, Review & Fix: {Y issues | clean} (consecutive clean: M/3)
```

### Step 4 — Loop or Done

- If consecutive clean counter < 3: start a new cycle from Step 1
- If consecutive clean counter = 3: print final report and stop

## Final Report

```
## Bug Hunt + Review & Fix — Complete

### Stats
- Total cycles: N
- Bug Hunt bugs found and fixed: X
- Review & Fix issues found and fixed: Y
- Consecutive clean cycles: 3/3
```

## Rules

- **No commits** — all changes must remain uncommitted. The user will review and commit manually.
- **Single source of truth** — all scan/report/fix behavior comes from the referenced command files (`.claude/commands/bug-hunt.md` and `.claude/commands/review-and-fix.md`). Do not duplicate or override their instructions beyond the overrides listed above.
- **A cycle is only clean if BOTH skills find 0 issues.**
- **3 consecutive clean cycles required** — not 3 clean runs of each individually.
- **Never declare a cycle "clean" without tool-backed evidence** (Agent output showing files scanned, Read/Grep tool calls).
- **Do not batch consecutive clean declarations.** Each clean cycle must be a separate, verifiable scan.
- **Each cycle's agents start fresh** — do not rely on memory of previous cycles' findings.
