# TestFlight Build & Deploy

Build the iOS production app and submit it to TestFlight in one shot.

## Worktree Awareness

If the current working directory is inside a worktree (path contains `.claude/worktrees/`), run all commands (quality gates, eas build, fastlane) from that worktree directory. Do not switch to the main working directory.

## Steps

1. Run pre-flight checks before building:

```bash
npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit
```

If lint or tsc fails, stop and fix. If only the known ImageViewer test failures occur, proceed.

2. Build the production iOS app via EAS:

```bash
eas build --platform ios --profile production --non-interactive
```

3. Wait for the build to complete. EAS will output the build URL and status.

4. Once the build succeeds, submit to TestFlight **with email notifications suppressed** (testers can still update from the TestFlight app):

```bash
fastlane pilot upload \
  --ipa <path-to-ipa> \
  --notify_external_testers false
```

5. Report to the user:
   - Build status (success/failure)
   - Build URL from EAS
   - Submit status
   - New version/build number (from EAS auto-increment)
   - Note: testers were NOT emailed but can update from the TestFlight app

## Rules

- ALWAYS run quality gates before building — never ship broken code
- NEVER skip the pre-flight step
- If the build fails, investigate the error and report it — do not retry blindly
- If submit fails due to missing credentials or App Store Connect issues, report the error clearly
- The `--non-interactive` flag is required so the command doesn't hang waiting for input
