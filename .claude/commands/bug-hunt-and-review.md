# Bug Hunt + Review & Fix Loop

Orchestrator that runs `/bug-hunt` and `/review-and-fix` back-to-back in a loop until **both produce 0 findings for 3 consecutive combined cycles**.

## How It Works

Each "cycle" consists of two steps run sequentially:

1. **Bug Hunt** — execute the full `/bug-hunt` skill (all phases: scan, report, fix, commit)
2. **Review & Fix** — execute the full `/review-and-fix` skill (all phases: scan, report, fix). If no uncommitted changes exist after Bug Hunt commits, this step is automatically clean.

A cycle is **clean** only if Bug Hunt found 0 bugs AND Review & Fix found 0 issues. If either finds anything, the consecutive clean counter resets to 0.

```
Cycle 1 → BH: 5 bugs, R&F: 3 issues → fix all → Cycle 2 → BH: 1 bug, R&F: 0 → fix → Cycle 3 → BH: 0, R&F: 0 → Cycle 4 → BH: 0, R&F: 0 → Cycle 5 → BH: 0, R&F: 0 → DONE
```

## Cycle Steps

### Step 1 — Run `/bug-hunt`

Follow all instructions in `.claude/commands/bug-hunt.md`. Execute a **single full pass** (Phase 1–4). Do NOT use Bug Hunt's internal 3-clean-run loop — this orchestrator controls the looping instead.

Record the number of bugs found in this pass.

### Step 2 — Run `/review-and-fix`

Follow all instructions in `.claude/commands/review-and-fix.md`. Execute a **single full pass** (Phase 1–3). Do NOT use Review & Fix's internal 3-clean-run loop — this orchestrator controls the looping instead.

If `git diff --name-only` and `git diff --cached --name-only` return no files, this step is automatically clean (0 issues).

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

- **Single source of truth** — all scan/report/fix behavior comes from the referenced skill files. Do not duplicate or override their instructions.
- **Override loop mode** — each skill's internal "loop until 3 consecutive clean" mode is disabled. This orchestrator runs one pass of each per cycle and controls the combined loop.
- **A cycle is only clean if BOTH skills find 0 issues**
- **3 consecutive clean cycles required** — not 3 clean runs of each individually
