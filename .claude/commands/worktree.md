# Create Worktree

Create a new git worktree for feature work. Accepts a branch name as the argument: `/worktree <branch-name>`

If no branch name is provided, derive one from the current task context (e.g., `fix-feed-divider`, `feat-search-filters`).

## Steps

1. **Create the worktree** outside the main repo:

   ```bash
   git worktree add ~/faniverz-worktrees/<branch-name> -b <branch-name>
   ```

   If the branch already exists, abort and tell the user.

2. **Install dependencies**:

   ```bash
   cd ~/faniverz-worktrees/<branch-name> && yarn install --frozen-lockfile
   ```

3. **Copy environment file**:

   ```bash
   cp ~/faniverz-app/.env.local ~/faniverz-worktrees/<branch-name>/.env.local
   ```

4. **Report** the worktree path and branch name so subsequent commands know where to work.

## Rules

- Worktrees must live in `~/faniverz-worktrees/`, NEVER inside the main project directory.
- Always use `-b` to create a new branch from the current HEAD.
- Always copy `.env.local` — EAS builds and local dev both depend on it.
- Always run `yarn install --frozen-lockfile` — worktrees share git objects but NOT `node_modules`.
- Do NOT modify any files in the main working directory.
