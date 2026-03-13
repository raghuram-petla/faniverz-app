# Ship

Smart commit-and-push that handles all scenarios: uncommitted changes, already-committed-but-unpushed changes, or both.

## Critical: Scope Control

**NEVER stage all uncommitted changes.** The user works with multiple Claude sessions on a single branch, so there may be uncommitted changes from other sessions that do NOT belong in this commit.

You MUST:

1. Review the conversation history to identify exactly which files YOU created, modified, or deleted
2. Only stage those specific files
3. If `git status` shows other uncommitted changes, IGNORE them — they belong to another session
4. NEVER use `git add -A` or `git add .`

## Steps

1. Run `git status` and `git log --oneline -5 @{u}..HEAD 2>/dev/null || echo "NO_UPSTREAM"` in parallel to determine the current state.

2. **Determine the scenario:**
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
