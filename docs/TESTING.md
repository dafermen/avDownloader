# Testing strategy and deployment quality gate

## Mandatory policy

No production or private-server deployment may proceed until all thirteen
categories below have been evaluated, the automated gate passes, the manual
items are signed off, and evidence is retained. A category marked skipped,
unknown, flaky, or not applicable blocks deployment unless a named owner
approves a written, time-limited exception with risk and rollback.

Run:

```bash
npm run verify:deploy
```

The command stops on the first failure and writes
`reports/predeploy-report.json`. Reports are local evidence and are intentionally
ignored by Git. CI runs the same gate on Ubuntu.

## Required categories

| # | Category | Command and minimum purpose |
|---:|---|---|
| 1 | Acceptance | `npm run test:acceptance`; verify user outcomes and complete the manual checklist |
| 2 | Unit | `npm run test:unit`; isolate pure functions and parsers |
| 3 | Properties and invariants | `npm run test:property`; verify ranges, coordinates, states, quotas, and opaque-reference invariants over many inputs |
| 4 | Mutation | `npm run test:mutation`; inject deliberate faults into provider utilities and require the tests to kill every configured mutant |
| 5 | Fuzzing | `npm run test:fuzz`; send deterministic malformed and random input through URL trust boundaries |
| 6 | Integration | `npm run test:integration`; exercise the real HTTP router and component boundaries |
| 7 | Contract | `npm run test:contract`; preserve public JSON fields, status codes, and error shape |
| 8 | End-to-end | `npm run test:e2e`; load the application, run real isolated WAV-to-MP3, two-source audio join, and MP4-to-WebM VP9/Opus journeys through HTTP; complete browser/media checks manually |
| 9 | Regression | `npm run test:regression`; preserve fixes for hidden signed URLs and adaptive audio |
| 10 | Security | `npm run test:security` plus `npm audit --omit=dev`; test SSRF and control headers, then audit runtime dependencies |
| 11 | Concurrency and resilience | `npm run test:resilience`; exercise parallel reads and recovery after malformed requests |
| 12 | Performance and resources | `npm run test:performance`; enforce conservative parser CPU and heap budgets; run representative media benchmarks before capacity changes |
| 13 | Compatibility and deployment | `npm run test:compatibility`; verify Node/Linux metadata, system tools, workflow, and environment contract |

`npm test` discovers all `*.test.js` files and is the fast development
regression suite. The deployment gate additionally runs mutation testing,
syntax checks, and the dependency audit.

## Test layout

```text
test/
  acceptance/     user outcomes
  unit/           isolated functions
  property/       generated invariants
  fuzz/           malformed trust-boundary input
  integration/    component interactions
  contract/       public API shape
  e2e/            complete local HTTP journey
  regression/     previously fixed defects
  security/       abuse and trust-boundary cases
  resilience/     concurrency and recovery
  performance/    CPU and heap budgets
  compatibility/  runtime and deployment assumptions
  fixtures/       synthetic, non-personal inputs
  helpers/        reusable test infrastructure
```

## Manual evidence required before deployment

Automated tests cannot prove provider availability, visual correctness, media
quality, or complete anonymization. Complete `docs/RELEASE_CHECKLIST.md` using
lawful test media. Record date, tester, platform, build identifier, result, and
links to sanitized evidence. Never attach signed URLs, tokens, private videos,
cookies, or job storage.

The manual release evidence must include the full identity-protection journey
(automatic tracks, person selection, a missed-face region added manually,
point correction, interrupted and completed review, and protected export), the
administrator journey (filters, bulk restart, expired cleanup, event history,
storage indicators, and audit), and a real HTTPS session from a second device
that verifies user ownership, administrator authorization, rate limiting, and
per-user job quotas.

It must also include per-source audio preview/range selection, ordering and
joining, every supported format/codec pair, and local-video MP4, MOV, WebM, and
MKV profiles. Probe duration, join boundaries, channel layout, sample rate,
video/audio codecs, decoding, content type, filename, restart behavior,
all-source cleanup, and HTTP 206. Automated tests use synthetic tones and a
synthetic audiovisual clip with isolated temporary `JOB_DIR` directories; they
do not replace cross-browser/player testing of every accepted profile.

## Test design rules

- Use deterministic seeds and synthetic fixtures.
- A defect fix requires a regression test that fails without the fix.
- Keep external provider calls out of the default suite.
- Use generous but meaningful resource limits to avoid flaky timing tests.
- Contract changes are intentional only when API and consumer changes land
  together.
- Do not reduce assertions merely to make a failing test green.
