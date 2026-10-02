# Contributing to vDownloader

Thank you for improving vDownloader. Contributions must preserve responsible
use, privacy, security allowlists, and the local/private deployment scope.

## Development workflow

1. Read `AGENTS.md`, `CURRENT_STATUS.md`, and `docs/DEVELOPMENT.md`.
2. Create a focused branch and describe one problem clearly.
3. Add or update tests for observable behavior.
4. Keep Spanish and English interface strings synchronized.
5. Update English documentation when behavior, configuration, or operations
   change.
6. Run `npm test` while developing.
7. Run `npm run verify:deploy` and complete
   `docs/RELEASE_CHECKLIST.md` before a release or deployment.
8. Open a pull request using the repository template.

## Code expectations

- Use Node.js 20 or later and ES modules.
- Keep provider-specific logic in `providers/`.
- Never expose signed media URLs, internal paths, credentials, tokens, or
  cookies.
- Never add DRM, authentication, paywall, or access-control bypasses.
- Use system FFmpeg and yt-dlp on Linux.
- Add JSDoc for public or non-obvious functions, including inputs, outputs,
  errors, side effects, and security assumptions.

## Test expectations

Every behavior change needs the smallest relevant test and a regression test
when fixing a defect. The required categories and commands are documented in
`docs/TESTING.md`. A failed or incomplete category blocks deployment unless a
written, time-limited exception is approved and recorded.

## Commit and pull request guidance

- Use an imperative, descriptive subject.
- Do not mix unrelated refactoring with behavior changes.
- Explain risk and rollback.
- Include exact commands and results; do not claim tests that were not run.
- Do not commit videos, `data/jobs`, `.env`, logs, reports, provider cookies, or
  personal data.
