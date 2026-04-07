# Ship

Smart commit-and-push that handles all scenarios: uncommitted changes, already-committed-but-unpushed changes, or both.

## Worktree Awareness

If the current working directory is inside a worktree (path contains `~/faniverz-worktrees/`), run all commands from that worktree directory. After committing, the branch must be merged into master (see step 9).

## Critical: Scope Control

**Scope rules depend on whether you are in a worktree or on the main branch.**

### In a worktree (path contains `~/faniverz-worktrees/`)

A worktree is an isolated workspace owned entirely by this session. **ALL uncommitted changes in a worktree belong to this session** — there are no other sessions sharing a worktree. Therefore:

- Use `git add -A` to stage everything
- Do NOT selectively pick files — commit ALL changes
- If `git status` shows modified files, they are yours — commit them

### On the main branch (master / not in a worktree)

The user works with multiple Claude sessions on the main branch, so there may be uncommitted changes from other sessions that do NOT belong in this commit.

You MUST:

1. Review the conversation history to identify exactly which files YOU created, modified, or deleted
2. Only stage those specific files
3. If `git status` shows other uncommitted changes, IGNORE them — they belong to another session
4. NEVER use `git add -A` or `git add .`

## Steps

1. Run `git status`, `git log --oneline -5 @{u}..HEAD 2>/dev/null || echo "NO_UPSTREAM"`, and `git worktree list` in parallel to determine the current state.

2. **Determine the scenario:**
   - **Scenario W — Work was done in a worktree during this session:** Go to the Worktree Ship Flow below.
   - **Scenario A — Uncommitted changes from this session exist:** Go to step 3 (commit flow).
   - **Scenario B — No uncommitted changes from this session, but unpushed commits exist:** Skip to step 8 (push only).
   - **Scenario C — No uncommitted changes and no unpushed commits:** Report "Nothing to ship" and stop.

3. **Build your file list** by reviewing the conversation to identify ONLY files you touched in this session. List them explicitly.

4. Run `git diff --stat HEAD -- <your files>` to confirm the scope.

5. Run `git log --oneline -5` to match the repository's commit message style.

6. Analyze the changes and draft a concise commit message:
   - Use conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`
   - Keep the first line under 72 characters
   - Add a blank line then bullet points for multi-area changes
   - Focus on the "why" not the "what"

7. Stage files and create the commit:

**If in a worktree:** stage everything — all changes are yours.

```bash
git add -A
```

**If on the main branch:** stage ONLY your files by name.

```bash
git add path/to/file1 path/to/file2 ...
```

First, get the GitHub username:

```bash
gh api user --jq '.login'
```

Then commit using the GitHub user as contributor (NEVER include Claude as a co-author or contributor):

```bash
git commit -m "$(cat <<'EOF'
<type>: <short summary>

- Detail 1
- Detail 2

Co-Authored-By: <github_display_name> <github_username>@users.noreply.github.com
EOF
)"
```

8. Run `git status` after the commit (or in Scenario B) to verify state.

9. **Squash in worktree, fast-forward merge into master, and push:**

   **If in a worktree** (path contains `~/faniverz-worktrees/`):

   Worktree commits are squashed into a single commit **inside the worktree branch**, then fast-forward merged into master. This keeps history linear AND allows `git branch --merged` to correctly detect the branch as merged (unlike `merge --squash` which breaks that detection).

   ```bash
   # Still in the worktree directory — squash all commits into one
   git reset --soft master
   git commit -m "$(cat <<'EOF'
   <type>: <short summary from the worktree work>

   - Detail 1
   - Detail 2

   Co-Authored-By: <github_display_name> <github_username>@users.noreply.github.com
   EOF
   )"

   # Get the current branch name
   BRANCH=$(git branch --show-current)

   # Switch to master in the MAIN repo and fast-forward merge
   cd <main-repo-root>   # e.g. ~/faniverz-app
   git checkout master
   git merge "$BRANCH"   # fast-forward since branch is linear from master
   git push
   ```

   The commit message should summarize the entire worktree's work (not repeat "Merge branch"). Use the same conventional commit format as step 6.

   After merging, inform the user the worktree branch has been merged into master and pushed. **Do NOT delete the worktree or its branch** — leave both intact so the user can verify nothing was missed. The user will clean it up manually or via `/cleanup-worktree`.

   **WARNING:** Do NOT use the Agent tool with `isolation: "worktree"` for shipping — it auto-cleans worktrees on completion, which destroys the worktree before the user can verify. Always run ship commands directly.

   **If NOT in a worktree** (working directly on master or a branch):

   ```bash
   git push
   ```

   If the branch has no upstream, use:

   ```bash
   git push -u origin HEAD
   ```

10. Report to the user:
    - If committed: the commit hash and summary
    - Push status (success/failure)
    - If worktree: confirm branch was merged into master
    - Any remaining uncommitted changes (from other sessions)

## Worktree Ship Flow

When work was done in a worktree (at `~/faniverz-worktrees/`), the changes live on a separate branch with uncommitted files in a worktree directory. You must commit there, squash, then merge into the main branch.

1. **Identify the worktree branch and directory** from the conversation history (look for `worktreeBranch:`, `worktreePath:`, or `cd ~/faniverz-worktrees/<name>` commands).

2. **Navigate to the worktree directory** and check status:

   ```bash
   cd <worktree-path>
   git status
   ```

3. **Fast-forward the worktree branch** if it's behind the main branch:

   ```bash
   git pull --ff-only
   ```

4. **Check for migration or file conflicts** introduced by the fast-forward (e.g., duplicate migration numbers). Renumber if needed.

5. **Stage ALL changes and squash into a single commit** in the worktree. Since the worktree is owned entirely by this session, use `git add -A` to stage everything — do NOT selectively pick files.

   ```bash
   git add -A
   git reset --soft master
   git commit -m "$(cat <<'EOF'
   <type>: <summary of all worktree work>

   - Detail 1
   - Detail 2

   Co-Authored-By: <github_display_name> <github_username>@users.noreply.github.com
   EOF
   )"
   ```

   This collapses all worktree commits + uncommitted changes into a single commit on top of master.

6. **Switch back to the main branch directory** and fast-forward merge:

   ```bash
   cd <original-repo-path>
   git checkout master
   git merge <worktree-branch>
   ```

   This is a fast-forward merge since the branch is linear from master. The branch tip becomes the new master tip, so `git branch --merged master` will correctly detect it as merged.

7. **Push master** and report the commit hash. Inform the user the worktree is still intact for verification. They can clean it up with `/cleanup-worktree` when ready.

## Rules

- In a worktree: commit ALL changes (`git add -A`) — the worktree is yours alone
- On the main branch: NEVER stage files you didn't touch — NEVER use `git add -A` or `git add .`
- NEVER amend a previous commit unless explicitly asked
- NEVER skip pre-commit hooks (no `--no-verify`)
- NEVER force push (`--force`) unless explicitly asked
- NEVER push to main/master with `--force` — warn the user if they request it
- If pre-commit hooks fail, fix the issue and create a NEW commit
- If unsure whether a file belongs to this session, ask the user
- NEVER include Claude as a co-author or contributor in commits — always use the GitHub user's name and noreply email from `gh api user`
- NEVER delete worktrees or worktree branches — leave them for user verification
- NEVER use the Agent tool with `isolation: "worktree"` during ship — it auto-cleans worktrees
