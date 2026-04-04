# Security Audit

Deep-scan the entire codebase for security vulnerabilities, insecure patterns, and attack surface exposure. Covers authentication, authorization, input validation, secrets management, injection vectors, data exposure, and platform-specific security concerns across both mobile and admin codebases.

## Worktree Setup

Before starting any work, ensure you are operating in a git worktree:

1. **If already in a worktree** (current directory path contains `~/faniverz-worktrees/`): proceed in the current directory.
2. **If NOT in a worktree**: Create one:
   ```bash
   git worktree add ~/faniverz-worktrees/security-audit-$(date +%s) -b security-audit-$(date +%s)
   ```
   Then `cd` into the worktree directory before proceeding.

**All file reads, edits, quality gates, and commits must happen inside the worktree.** Never modify files in the main working directory.

## Loop Mode

This skill runs in a **loop until clean**. After completing a full scan-report-fix cycle, immediately start a new scan from Phase 1. Keep looping until **2 consecutive runs find zero vulnerabilities**. Track the run counter:

```
Run 1 -> found 9 vulns -> fix -> Run 2 -> found 2 vulns -> fix -> Run 3 -> found 0 -> Run 4 -> found 0 -> DONE (2 consecutive clean runs)
```

**Rules for loop mode:**

- Each run is a full Phase 1-4 cycle (scan, report, fix all, final report)
- A "clean run" means Phase 1 found exactly 0 vulnerabilities across all categories
- The 2-clean-run counter resets to 0 if any vulnerabilities are found
- Between runs, print: `### Run N complete -- {X vulns found | clean} (consecutive clean: M/2)`
- After 2 consecutive clean runs, print: `### Security Audit complete -- 2 consecutive clean runs achieved`

## Phase 1 -- Scan

Search the entire codebase -- mobile (`app/`, `src/`), admin (`admin/src/`), shared (`shared/`), API routes (`admin/src/app/api/`), and infrastructure (`supabase/`) -- for each category below. For each finding, record: **file path**, **line number(s)**, **what's wrong**, **severity** (Critical/High/Medium), **CVSS-like impact**, and **exploit scenario**. Do NOT modify any files during this phase.

**Agent strategy**: Launch **at least 4 parallel agents**, each assigned a distinct scanning area:

- Agent 1: `app/` + `src/` (mobile app)
- Agent 2: `admin/src/` (admin panel)
- Agent 3: `supabase/` (migrations, RLS policies, edge functions)
- Agent 4: Config files, env files, `package.json`, infrastructure

Each agent reads source files in its area and checks all applicable categories. Do NOT have agents start with `git diff` -- they should read source files directly via Glob, Grep, and Read tools.

---

### Category 1: Authentication & Session Security (Critical)

Flaws that allow unauthenticated or wrongly-authenticated access:

- **Missing auth checks on API routes**: Admin API routes (`admin/src/app/api/`) that don't verify the user's session or role before processing requests
- **Auth bypass via direct Supabase calls**: Client-side code using `supabase.from().select()` on tables without RLS policies -- bypasses intended access control
- **Session token exposure**: Auth tokens logged, stored in localStorage (XSS-accessible), or passed in URL query params
- **Missing CSRF protection**: Admin form submissions or state-changing API calls without CSRF tokens
- **Insecure token refresh**: Token refresh flows that don't validate the old token or allow replay
- **Missing auth redirect**: Protected pages/screens that render content before auth state is confirmed (flash of protected content)
- **Service role key on client**: Using `SUPABASE_SERVICE_ROLE_KEY` in client-side code (bypasses all RLS)

**Approach**: Read all API routes and check for session/auth validation at the top. Grep for `supabase.auth`, `getSession`, `getUser`, `createClient` to trace auth patterns. Check if service role key is ever imported in client bundles. Read middleware files for auth guards.

### Category 2: Authorization & Privilege Escalation (Critical)

Flaws that allow users to access or modify resources beyond their role:

- **Missing RLS policies**: Tables in `supabase/migrations/` with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` but no corresponding `CREATE POLICY` -- RLS is on but NO rows are accessible (or worse, if `FORCE` is missing, all rows are accessible)
- **Overly permissive RLS**: Policies using `true` as the condition, or `USING (true)` on SELECT/UPDATE/DELETE -- effectively no access control
- **Missing role checks in admin API**: Admin API endpoints that check auth but not admin role -- any logged-in user could access admin functions
- **IDOR (Insecure Direct Object Reference)**: Endpoints that accept a user ID or resource ID as a parameter and don't verify the requesting user owns/has access to that resource
- **Client-side-only authorization**: Role checks that only exist in the UI (hiding buttons/pages) but not enforced server-side/in RLS
- **Horizontal privilege escalation**: User A can access User B's private data (reviews, watchlists, profile details) by guessing/enumerating IDs
- **Vertical privilege escalation**: Regular user can access admin functions by directly calling admin API routes

**Approach**: Read all migration files and extract RLS policies. Cross-reference tables vs policies -- flag tables with RLS enabled but no policies or overly broad policies. Read admin API routes for role validation. Check if API routes validate resource ownership (e.g., `user_id = auth.uid()`).

### Category 3: Injection Vulnerabilities (Critical)

Code that constructs queries or commands from unsanitized user input:

- **SQL injection**: String concatenation or template literals in SQL queries instead of parameterized queries. Supabase's `.from().select()` is safe, but raw `supabase.rpc()` with string-built SQL, or `sql` tagged templates without proper escaping, are not
- **XSS via `dangerouslySetInnerHTML`**: Any use of `dangerouslySetInnerHTML` or equivalent with user-controlled content
- **XSS via admin content rendering**: Admin-entered HTML/markdown rendered without sanitization in the mobile app
- **Command injection**: User input passed to `exec()`, `spawn()`, `child_process`, or shell commands in API routes or scripts
- **Path traversal**: User-controlled input used in file paths (`fs.readFile(userInput)`) without validation -- can read arbitrary files
- **Header injection**: User input injected into HTTP response headers (can enable response splitting, cache poisoning)
- **SSRF (Server-Side Request Forgery)**: User-controlled URLs used in server-side `fetch()` calls -- can access internal services. Only flag if attacker controls host/protocol, not just path.
- **Template injection**: User input embedded in template strings that get evaluated (server-side template engines)

**Approach**: Grep for `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function(`, `exec(`, `spawn(`, `child_process`. Grep for raw SQL string construction (`\`._\$\{._\}.\*\``near SQL keywords). Read Supabase RPC calls for parameterization. Check any`fetch()` in API routes where the URL comes from request params.

### Category 4: Secrets & Credential Management (High)

Hardcoded or exposed secrets that could compromise the system:

- **Hardcoded API keys**: Supabase keys, TMDB keys, push notification keys, or any other API key hardcoded in source files (not in `.env`)
- **Secrets in client bundle**: Server-side secrets (service role key, database URL, admin API keys) referenced in client-side code -- will be included in the JS bundle
- **`.env` files committed**: `.env`, `.env.local`, `.env.production` files tracked by git (check `.gitignore`)
- **Secrets in logs**: `console.log()` or logging calls that output tokens, passwords, keys, or full request/response objects containing auth headers
- **Weak secret generation**: Using `Math.random()` for tokens, session IDs, or any security-sensitive random value instead of `crypto.randomUUID()` or `crypto.getRandomValues()`
- **Default/placeholder credentials**: `password123`, `admin/admin`, `test` credentials in source code (not in test files)
- **Exposed Supabase connection string**: Direct PostgreSQL connection strings in source files

**Approach**: Grep for common key patterns: `sk_`, `pk_`, `key=`, `token=`, `password`, `secret`, `apikey`, `api_key`. Check `.gitignore` for `.env*` entries. Grep for `console.log` near auth/token variables. Grep for `Math.random` in security contexts. Check that `SUPABASE_SERVICE_ROLE_KEY` is only in server-side code.

### Category 5: Data Exposure & Privacy (High)

Code that leaks sensitive data beyond its intended scope:

- **PII in logs**: Logging user emails, phone numbers, IP addresses, or full names in `console.log`, error reports, or analytics events
- **Verbose error responses**: API routes returning full error stacks, database error messages, or internal paths to clients -- aids attacker reconnaissance
- **Over-exposed API responses**: Supabase queries using `select('*')` on tables containing sensitive columns (password hashes, private emails, admin notes) -- should select only needed public columns
- **Sensitive data in URL params**: User IDs, tokens, or PII passed as URL query parameters (logged in server access logs, browser history, referrer headers)
- **Missing data sanitization on output**: API responses including fields that should be stripped for non-admin users (internal IDs, admin notes, moderation flags)
- **Exposed user enumeration**: Auth flows or search APIs that reveal whether an email/username exists (enables account enumeration attacks)
- **Client-side data caching**: Sensitive data stored in AsyncStorage/localStorage without encryption

**Approach**: Read API response shaping in hooks and API routes. Grep for `select('*')` on user-related tables. Check error handling in API routes for response bodies. Search for `console.log`, `console.error` near user data variables. Check auth error messages for user enumeration hints.

### Category 6: Supabase-Specific Security (High)

Security patterns unique to the Supabase backend:

- **RLS disabled on sensitive tables**: Tables without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` -- all data accessible to any authenticated user via PostgREST
- **Anon key with write access**: RLS policies that allow the `anon` role to INSERT/UPDATE/DELETE -- should typically require `authenticated` role
- **Missing `auth.uid()` in policies**: RLS policies that don't scope data to the requesting user where they should (e.g., users can read other users' private watchlists)
- **Function security definer**: Postgres functions created with `SECURITY DEFINER` that accept user input -- runs with the function owner's privileges, bypassing RLS
- **Unrestricted RPC functions**: `supabase.rpc()` calls to functions that don't validate input or check authorization internally
- **Missing `USING` vs `WITH CHECK` distinction**: INSERT policies using `USING` instead of `WITH CHECK`, or UPDATE policies missing `WITH CHECK` -- allows writing data that can't be read back (or vice versa)
- **Storage bucket policies**: Supabase storage buckets without proper access policies -- uploaded files may be publicly readable
- **Realtime subscription leaks**: Supabase realtime channels subscribed without RLS filtering -- may receive events for data the user shouldn't see

**Approach**: Read all migration files systematically. For every `CREATE TABLE`, check for `ENABLE ROW LEVEL SECURITY` and corresponding policies. Read all `CREATE FUNCTION` for `SECURITY DEFINER`. Check storage policies. Read realtime subscription code for channel configuration.

### Category 7: Admin Panel Security (High)

Vulnerabilities specific to the Next.js admin panel:

- **Unprotected admin API routes**: Routes under `admin/src/app/api/` without middleware or session checks -- accessible to anyone
- **Missing RBAC enforcement**: Admin actions (delete user, modify content, change roles) without checking the admin's specific role/permissions
- **Mass assignment**: API routes that accept arbitrary fields from request body and pass them directly to database update -- attacker can modify protected fields
- **Unsafe file upload**: File upload endpoints without type validation, size limits, or malware scanning -- can upload executable files
- **Admin impersonation without audit**: Impersonation features that don't log who impersonated whom
- **Unvalidated redirects**: Admin login/auth flows that redirect to user-controlled URLs after authentication
- **Missing Content-Security-Policy**: Admin panel served without CSP headers -- enables XSS exploitation if any injection point exists

**Approach**: Read all API route files in `admin/src/app/api/`. Check middleware for auth/RBAC checks. Read file upload handlers for validation. Check `next.config.js` or middleware for security headers. Read impersonation flow for audit logging.

### Category 8: Mobile App Security (Medium)

React Native / Expo-specific security concerns:

- **Deep link injection**: Deep link handlers that navigate to arbitrary screens or pass unsanitized params -- can trigger unintended actions
- **Insecure WebView**: `<WebView>` components with `javaScriptEnabled` loading user-controlled URLs -- enables JavaScript execution in app context
- **Unencrypted local storage**: Sensitive data (auth tokens, user PII) stored in plain AsyncStorage instead of SecureStore/Keychain
- **Certificate pinning absent**: API calls without certificate pinning -- vulnerable to MITM on compromised networks (note: this is defense-in-depth, not always required)
- **Expo config exposure**: `app.json` or `app.config.js` containing secrets that get embedded in the app bundle
- **Debug mode in production**: `__DEV__` checks that leave debug features enabled, or debug endpoints/screens accessible in release builds

**Approach**: Read deep link configuration and handlers. Grep for `WebView` usage. Check what's stored in `AsyncStorage` vs `SecureStore`. Read `app.json` / `app.config.js` for embedded secrets. Grep for `__DEV__` to check debug gates.

### Category 9: Dependency & Supply Chain Security (Medium)

Risks from third-party packages and build configuration:

- **Known vulnerable dependencies**: Packages with known CVEs (check `package-lock.json` / `yarn.lock` for flagged versions)
- **Overly broad permissions in Expo config**: `expo.plugins` or permissions requesting more than needed (camera, location, contacts when not used)
- **Missing Subresource Integrity (SRI)**: Admin panel loading external scripts without integrity checks
- **Unsafe `postinstall` scripts**: `package.json` scripts that execute downloaded code or run with elevated privileges
- **Lockfile manipulation**: `package-lock.json` with `resolved` URLs pointing to non-registry sources

**Approach**: Run `npm audit --json` if available. Read `package.json` for suspicious scripts. Check `app.json` permissions list against actually-used features. Read lockfile for non-registry URLs.

### Category 10: Cryptographic Weaknesses (Medium)

Insecure use of cryptography:

- **Weak hashing**: Using MD5 or SHA1 for password hashing or integrity verification instead of bcrypt/argon2/SHA256+
- **Predictable tokens**: Using timestamp-based or sequential IDs for password reset tokens, invitation codes, or magic links
- **Missing HTTPS enforcement**: API calls using `http://` instead of `https://` -- data transmitted in cleartext
- **Insecure comparison**: Comparing tokens/hashes with `===` instead of constant-time comparison (`crypto.timingSafeEqual`) -- vulnerable to timing attacks

**Approach**: Grep for `md5`, `sha1`, `createHash('md5')`, `createHash('sha1')`. Check token generation for randomness source. Grep for `http://` in API URLs (excluding localhost in dev configs). Check token comparison patterns.

---

## Phase 2 -- Report

Present findings as a severity-ranked report:

```
## Security Audit Report -- Run N

### Critical (Immediate exploitation risk)
| # | Category | File:Line | Vulnerability | Exploit Scenario | CVSS Est. |
|---|----------|-----------|--------------|------------------|-----------|

### High (Exploitable with some conditions)
| # | Category | File:Line | Vulnerability | Exploit Scenario | CVSS Est. |
|---|----------|-----------|--------------|------------------|-----------|

### Medium (Defense-in-depth / limited impact)
| # | Category | File:Line | Vulnerability | Exploit Scenario | CVSS Est. |
|---|----------|-----------|--------------|------------------|-----------|

### Summary
- Critical: X vulnerabilities
- High: Y vulnerabilities
- Medium: Z vulnerabilities
- Total: N vulnerabilities
```

**Do NOT wait for user confirmation.** Proceed directly to Phase 3 and fix ALL vulnerabilities across all severity levels.

## Phase 3 -- Fix

Fix all vulnerabilities in order of severity (Critical first).

### Fix Workflow

1. **Group related fixes** -- batch fixes that touch the same files together
2. **Fix the vulnerability** -- apply the minimal, correct fix
3. **Write/update tests** -- add a test that verifies the vulnerability is patched (security regression test)
4. **Run quality gates** after each severity batch:
   - Mobile: `npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit`
   - Admin: `cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run`
5. **Check 300-line limit** on all modified files
6. **Commit** after each severity batch passes quality gates

### Common Fix Patterns

- **Missing auth check on API route** -> Add session validation at top: `const { data: { session } } = await supabase.auth.getSession(); if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });`
- **Missing role check** -> After auth check, verify admin role: `const { data: role } = await supabase.from('admin_user_roles').select('role').eq('user_id', session.user.id).single(); if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });`
- **Missing RLS policy** -> Create new migration with appropriate `CREATE POLICY` statements scoped to `auth.uid()`
- **RLS not enabled** -> Create new migration: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` plus appropriate policies
- **Overly permissive RLS** -> Create new migration that drops the broad policy and creates scoped ones
- **`dangerouslySetInnerHTML` with user content** -> Use a sanitization library (DOMPurify) or render as plain text
- **SQL injection** -> Replace string concatenation with parameterized queries / Supabase's query builder
- **Hardcoded secret** -> Move to `.env` file, reference via `process.env.VAR_NAME`, add to `.env.example` without the value
- **Service role key in client** -> Move the operation to an API route or edge function that uses the service key server-side
- **Secrets in logs** -> Remove or redact: `console.log('Auth token:', token)` -> remove entirely or `console.log('Auth: [REDACTED]')`
- **PII in logs** -> Remove user-identifying information from log statements
- **Verbose error response** -> Return generic error message to client, log detailed error server-side only
- **`select('*')` on sensitive table** -> Replace with explicit column list excluding sensitive fields
- **Missing CSRF** -> Add CSRF token validation via Next.js middleware or custom header check
- **Mass assignment** -> Destructure only expected fields from request body: `const { title, description } = await req.json()`
- **Insecure deep link handler** -> Validate and sanitize incoming deep link params, whitelist allowed routes
- **Unencrypted sensitive storage** -> Replace `AsyncStorage` with `expo-secure-store` for tokens and sensitive data
- **`Math.random()` for security** -> Replace with `crypto.randomUUID()` or `crypto.getRandomValues()`
- **HTTP URL** -> Replace with HTTPS
- **Missing input validation** -> Add Zod schema validation on API route request bodies
- **User enumeration** -> Return generic "Invalid credentials" message regardless of whether email exists
- **Debug code in production** -> Gate behind `__DEV__` or remove entirely

## Phase 4 -- Final Report

```
## Security Audit Fix Summary -- Run N

### Vulnerabilities Fixed
| # | Severity | Category | File(s) | Vulnerability | Fix Applied |
|---|----------|----------|---------|--------------|-------------|

### Security Regression Tests Added
| Test File | What It Covers |
|-----------|---------------|

### RLS Policy Changes (if any)
| Migration File | Tables Affected | Policy Description |
|---------------|----------------|-------------------|

### Quality Gates
- Mobile: PASS/FAIL (X suites, Y tests)
- Admin: PASS/FAIL (X suites, Y tests)
- TSC: 0 errors (both)
- ESLint: 0 errors (both)
- 300-line limit: All files compliant

### Commits
| Hash | Message |
|------|---------|
```

Then immediately proceed to Run N+1 (back to Phase 1).

## Rules

- **No new features** -- only fix security vulnerabilities in existing code
- **Minimal fixes** -- don't refactor surrounding code or add improvements beyond the security fix
- **Both codebases** -- always check both mobile and admin unless explicitly scoped
- **Security regression tests required** -- every fix must include a test that verifies the vulnerability is patched
- **Never modify applied migrations** -- create new migration files for RLS/policy changes
- **Mobile mocks**: `jest.mock()`. Admin mocks: `vi.mock()`
- **Admin ESLint**: `--max-warnings 0`. Jest: `--forceExit`
- **Don't fix test files** -- vulnerabilities in test code are not real vulnerabilities
- **Don't fix `.env.example`** -- placeholder values in example env files are intentional
- **Don't flag rate limiting** -- rate limiting is handled at the infrastructure level, not in application code
- **Don't flag DoS** -- denial of service is out of scope for this audit
- **Focus on exploitability** -- only flag vulnerabilities with a concrete exploit path, not theoretical best practices
- **Protected files apply** -- do not modify files listed in CLAUDE.md's "Protected Files" section
