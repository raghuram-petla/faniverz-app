# Ship

Smart commit-and-push that handles all scenarios: uncommitted changes, already-committed-but-unpushed changes, or both.

## Worktree Awareness

If the current working directory is inside a worktree (path contains `.claude/worktrees/`), run all commands from that worktree directory. After committing, the branch must be merged into master (see step 9).

## Critical: Scope Control

**NEVER stage all uncommitted changes.** The user works with multiple Claude sessions on a single branch, so there may be uncommitted changes from other sessions that do NOT belong in this commit.

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

7. Stage ONLY your files by name and create the commit:

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

9. Push to remote:

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
    - Any remaining uncommitted changes (from other sessions)

## Worktree Ship Flow

When work was done in a worktree (via `isolation: "worktree"` Agent), the changes live on a separate branch with uncommitted files in a worktree directory. You must commit there, then merge into the main branch.

1. **Identify the worktree branch and directory** from the conversation history (look for `worktreeBranch:` and `worktreePath:` in agent results).

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

5. **Stage, commit, and verify** in the worktree — follow steps 3-8 from the normal flow above, running from within the worktree directory.

6. **Switch back to the main branch directory** and merge:
   ```bash
   cd <original-repo-path>
   git merge <worktree-branch> --no-edit
   ```

7. **Push master** and report the merge commit hash.

8. **Clean up**: Remove the worktree and delete the branch after merge:
   ```bash
   git worktree remove <worktree-path>
   git branch -d <worktree-branch>
   git push origin --delete <worktree-branch>
   ```

## Rules

- NEVER stage files you didn't touch in this conversation
- NEVER use `git add -A`, `git add .`, or `git add --all`
- NEVER amend a previous commit unless explicitly asked
- NEVER skip pre-commit hooks (no `--no-verify`)
- NEVER force push (`--force`) unless explicitly asked
- NEVER push to main/master with `--force` — warn the user if they request it
- If pre-commit hooks fail, fix the issue and create a NEW commit
- If unsure whether a file belongs to this session, ask the user
- NEVER include Claude as a co-author or contributor in commits — always use the GitHub user's name and noreply email from `gh api user`
