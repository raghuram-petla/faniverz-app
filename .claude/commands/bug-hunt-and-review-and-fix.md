# Bug Hunt + Review & Fix Loop

Orchestrator that runs `/bug-hunt` and `/review-and-fix` back-to-back in a loop until **both produce 0 findings for 3 consecutive combined cycles**.

## How It Works

Each "cycle" consists of two steps run sequentially:

1. **Bug Hunt** — execute the full `/bug-hunt` skill (all phases: scan, report, fix) **without committing**
2. **Review & Fix** — execute the full `/review-and-fix` skill (all phases: scan, report, fix) on the accumulated uncommitted changes

A cycle is **clean** only if Bug Hunt found 0 bugs AND Review & Fix found 0 issues. If either finds anything, the consecutive clean counter resets to 0.

```
Cycle 1 → BH: 5 bugs, R&F: 3 issues → fix all → Cycle 2 → BH: 1 bug, R&F: 0 → fix → Cycle 3 → BH: 0, R&F: 0 → Cycle 4 → BH: 0, R&F: 0 → Cycle 5 → BH: 0, R&F: 0 → DONE
```

## Cycle Steps

### Step 1 — Run `/bug-hunt`

Follow all instructions in `.claude/commands/bug-hunt.md`. Execute a **single full pass** (Phase 1–4). Do NOT use Bug Hunt's internal 3-clean-run loop — this orchestrator controls the looping instead. **Do NOT commit** — skip Bug Hunt's Phase 3 step 6 (commit) and Phase 4 Commits table. Leave all changes uncommitted.

Record the number of bugs found in this pass.

### Step 2 — Run `/review-and-fix`

Follow all instructions in `.claude/commands/review-and-fix.md`. Execute a **single full pass** (Phase 1–3). Do NOT use Review & Fix's internal 3-clean-run loop — this orchestrator controls the looping instead.

Since Bug Hunt leaves changes uncommitted, Review & Fix will always have files to review after a non-clean Bug Hunt cycle.

Record the number of issues found in this pass.

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

- **No commits** — all changes must remain uncommitted. Do not commit at any point during or after the loop. The user will review and commit manually.
- **Single source of truth** — all scan/report/fix behavior comes from the referenced skill files. Do not duplicate or override their instructions.
- **Override loop mode** — each skill's internal "loop until 3 consecutive clean" mode is disabled. This orchestrator runs one pass of each per cycle and controls the combined loop.
- **Override commit behavior** — Bug Hunt's Phase 3 step 6 (commit) and Phase 4 Commits table are skipped. All fixes stay uncommitted.
- **A cycle is only clean if BOTH skills find 0 issues**
- **3 consecutive clean cycles required** — not 3 clean runs of each individually

## CRITICAL — No Shortcuts Allowed

- **Every single cycle MUST perform a full scan.** You MUST actually read the diffs and source files in every iteration — no skipping, no "the code hasn't changed so it's clean", no assuming previous cycles were thorough enough.
- **Launch an Agent** (Explore or general-purpose) for each scan phase to ensure independent, thorough review. Do not rely on memory of previous cycles.
- **Never declare a cycle "clean" without reading the actual code.** If you cannot prove you read the diffs in that cycle, it doesn't count.
- A clean cycle requires actively scanning and finding nothing — not passively assuming nothing changed.
- **Do not batch consecutive clean declarations.** Each clean cycle must be a separate, verifiable scan with tool-backed evidence (Agent output, git diff reads, file reads).
