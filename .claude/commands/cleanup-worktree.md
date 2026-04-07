# Cleanup

Remove **only this session's worktree** after it has been merged into master.

## Critical: Scope Control

**Other worktrees belong to other concurrent agent sessions. NEVER touch them.**

Only clean up a worktree that was created and used in THIS conversation. Identify it from the conversation history (look for `worktreeBranch:`, `worktreePath:`, or `cd ~/faniverz-worktrees/<name>` commands earlier in the conversation).

If you cannot identify which worktree belongs to this session, ask the user — do NOT guess or clean up all worktrees.

## Steps

1. **Identify this session's worktree** from the conversation history. If no worktree was used in this session, report "No worktree from this session to clean up" and stop.

2. Run `git worktree list` to confirm it still exists.

3. Check if the branch has been merged into master:

   ```bash
   git branch --merged master | grep <branch>
   ```

   If NOT found (e.g., older branches that were squash-merged via `merge --squash` instead of fast-forward), check if master already contains the same changes:

   ```bash
   # If the branch tip's tree is identical to some commit on master, it was squash-merged
   git diff master..<branch> --stat
   ```

   - If `git diff` shows no differences: the branch content is on master — safe to remove.
   - If `git diff` shows differences AND `--merged` didn't match: **do NOT remove it** — warn the user that it has unmerged changes and stop.

4. Remove the worktree and its branch:

   ```bash
   git worktree remove <worktree-path>
   git branch -D <branch-name>
   ```

5. Report what was cleaned up.

## Rules

- **ONLY clean up this session's worktree** — NEVER touch worktrees from other sessions
- NEVER iterate over all worktrees and remove them
- NEVER remove a worktree whose branch has NOT been merged into master
- NEVER force-remove a worktree (`--force`) unless the user explicitly asks
- If a worktree has uncommitted changes, warn the user and skip it
