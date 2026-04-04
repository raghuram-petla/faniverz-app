# Cleanup

Remove worktrees that have already been merged into master.

## Steps

1. Run `git worktree list` to find all worktrees.

2. If no worktrees exist (only the main working directory), report "No worktrees to clean up" and stop.

3. For each worktree (excluding the main working directory):
   - Get the branch name and worktree path
   - Check if the branch has been merged into master: `git branch --merged master | grep <branch>`
   - If merged: remove it
   - If NOT merged: **do NOT remove it** — warn the user that it has unmerged changes

4. Remove merged worktrees and their branches:

   ```bash
   git worktree remove <worktree-path>
   git branch -D <branch-name>
   ```

5. Report what was cleaned up and what was skipped (with reason).

## Rules

- NEVER remove a worktree whose branch has NOT been merged into master
- NEVER force-remove a worktree (`--force`) unless the user explicitly asks
- If a worktree has uncommitted changes, warn the user and skip it
- Always list what will be removed before doing it
