# Commit

Stage ONLY files changed in this conversation, generate a commit message, and create the commit.

## Critical: Scope Control

**NEVER stage all uncommitted changes.** The user works with multiple Claude sessions on a single branch, so there may be uncommitted changes from other sessions that do NOT belong in this commit.

You MUST:

1. Review the conversation history to identify exactly which files YOU created, modified, or deleted
2. Only stage those specific files
3. If `git status` shows other uncommitted changes, IGNORE them — they belong to another session
4. NEVER use `git add -A` or `git add .`

## Steps

1. Run `git status` to see all uncommitted files.
2. **Build your file list** by reviewing the conversation to identify ONLY files you touched in this session. List them explicitly.
3. Run `git diff --stat HEAD -- <your files>` to confirm the scope.
4. Run `git log --oneline -5` to match the repository's commit message style.
5. Analyze the changes and draft a concise commit message:
   - Use conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`
   - Keep the first line under 72 characters
   - Add a blank line then bullet points for multi-area changes
   - Focus on the "why" not the "what"
6. Stage ONLY your files by name:

```bash
git add path/to/file1 path/to/file2 ...
```

7. Create the commit using a HEREDOC for proper formatting:

```bash
git commit -m "$(cat <<'EOF'
<type>: <short summary>

- Detail 1
- Detail 2

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

8. Run `git status` after the commit to verify success and confirm other changes remain unstaged.
9. Report the commit hash and summary to the user.

## Rules

- NEVER stage files you didn't touch in this conversation
- NEVER use `git add -A`, `git add .`, or `git add --all`
- NEVER amend a previous commit unless explicitly asked
- NEVER skip pre-commit hooks (no `--no-verify`)
- If pre-commit hooks fail, fix the issue and create a NEW commit
- If unsure whether a file belongs to this session, ask the user
- Do NOT push unless asked — use `/commit-and-push` for that
