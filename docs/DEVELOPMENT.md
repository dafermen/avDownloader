# Development guide

## Prerequisites

- Node.js 20 or later.
- npm.
- FFmpeg and yt-dlp available in `PATH`, or explicit environment paths.
- Content and test fixtures that the developer has the right to use.

Install dependencies with `npm ci`. Copy `.env.example` to a private `.env`
only if using Node's `--env-file` option or another process manager; the
application does not automatically load `.env`.

## Start and verify

```bash
npm start
npm test
npm run check:syntax
```

The canonical port is 5177. Before starting another process, verify that the
port is not already in use. Use `npm run dev` only during active editing.

## Repository conventions

- Code identifiers and technical documentation are English.
- User-visible strings must exist in Spanish and English in `public/i18n.js`.
- Provider-specific behavior belongs in `providers/`.
- Route order is explicit in `server.js`; specific API routes precede static
  file handling.
- Public or non-obvious functions need JSDoc for parameters, return values,
  errors, side effects, and security-sensitive assumptions.
- No production Linux path may depend on a Windows `.exe`.
- Never weaken the loopback default, bearer-profile validation, owner checks,
  HTTPS requirement, rate limits, or administrative audit to simplify a test.
- Local video and audio containers, codecs, codec/container combinations, and
  bitrate values are explicit allowlists in `server.js`; never pass arbitrary
  codecs, extensions, paths, or FFmpeg arguments from the browser.
- Multi-audio changes must preserve the 64 KiB metadata limit, 20-source limit,
  declared byte accounting, streaming writes, per-source clip validation,
  cleanup, persistence, and restart behavior.
- Trusted proxy headers are accepted only from a loopback peer. Keep proxy
  regression tests when changing authentication or address handling.

## Adding a provider

1. Add `providers/name.js`.
2. Implement `id`, `matches`, `validate`, `isMediaHost`, and `analyze`.
3. Add it to `providers/index.js`.
4. Add synthetic parser fixtures and unit tests.
5. Add URL, SSRF, contract, regression, and provider-monitoring tests.
6. Document supported URL forms and known limitations.

Never support private, sign-in-gated, paid, or DRM-protected content.

## Changing an endpoint

Update `docs/API.md`, `public/docs.html`, contract tests, integration tests, and
the frontend caller. Preserve opaque references and JSON error handling.

Media endpoint changes must also preserve `mediaKind`, `outputFormat`,
`videoCodec`/`audioCodec`, output content type, all-source cleanup, restart
persistence, and HTTP range downloads.

## Changing dependencies

Review the license and runtime purpose, update `THIRD_PARTY_LICENSES.md`, run
the production dependency audit, and verify Linux installation from a clean
checkout.

## Definition of done

A change is complete only when code, tests, English documentation, bilingual UI
strings where applicable, changelog, and current status agree. A deployable
change must pass `npm run verify:deploy` and the manual release checklist.
