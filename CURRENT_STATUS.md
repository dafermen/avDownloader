# Current vDownloader status

Last updated: 2026-10-01

## Current phase

vDownloader is in a functional local/private phase. It has modular providers,
remote and local video trimming/transcoding, multi-source audio
trimming/joining/transcoding, a persistent queue, administration, and Identity
protection for files from the user's computer.

The repository now also has a standardized documentation and quality
engineering baseline. A deployment is not approved merely because the
development suite passes: the thirteen-category automated gate and the manual
release checklist are both required.

Identity protection refers to visual face pixelation. Remote access profiles
now provide lightweight job ownership and `user/admin` authorization, but they
are not biometric identity and do not constitute a complete account platform.

## Completed functionality

- General-purpose interface on port 5177.
- Project name normalized as `vDownloader`; expected Windows working folder:
  `C:\Projects\vDownloader`.
- Spanish and English interface with a persisted device-local choice.
- English-only project and web documentation.
- Providers: YouTube, XVideos, Pornhub, and XNXX.
- MP4/HLS qualities and preview through opaque references.
- Adaptive YouTube video/audio merging through FFmpeg.
- Visual start/end trimming.
- Local editor for MP4, M4V, MOV, and WebM:
  - `blob:` preview without immediate upload;
  - temporary upload only during export, with progress;
  - `MAX_UPLOAD_GB` limit, 2 GB by default;
  - relative UUID source inside `JOB_DIR`;
  - MP4 and MOV output with H.264/H.265 plus AAC;
  - WebM output with VP9 plus Opus;
  - MKV output with compatible H.264/H.265/VP9 plus AAC/Opus combinations;
  - YUV420p video for broad decoder compatibility;
  - source and output cleanup together;
  - `x-vdownloader-upload: 1` cross-origin defense.
- Local audio editor:
  - browser-local preview before upload;
  - MP3, M4A, AAC, WAV, FLAC, OGG, and Opus inputs;
  - one to twenty selected sources with an independent precise start/end range;
  - visible ordered source list with move and remove controls;
  - persistent FFmpeg concatenation after 48 kHz stereo normalization;
  - MP3/MP3, M4A/AAC, OGG/Vorbis or Opus, Opus/Opus, FLAC/FLAC, and WAV/PCM
    output profiles;
  - allowlisted 96–320 kbps values for lossy codecs;
  - `x-vdownloader-audio: 1` cross-origin defense;
  - `x-vdownloader-audio-join: 1` defense for a versioned, streaming,
    length-prefixed multi-file envelope;
  - 20-source, 64 KiB metadata, upload-size, per-clip, and 12-hour combined
    duration bounds;
  - server-owned codec, container, filename, and content-type profiles;
  - shared queue, persistence, restart, cancellation, quota, expiration,
    cleanup, owner isolation, panel, and HTTP range downloads.
- Identity protection:
  - all-face detection with MediaPipe Tasks Vision and BlazeFace;
  - library, WASM, and model served locally without an interface CDN;
  - up to four samples per second and 900 per clip;
  - conservative tracking that covers movement to the next position;
  - up to 1.5 seconds of tolerance for brief detector losses;
  - configurable intensity and a 40% default margin;
  - canvas-based pixelated preview;
  - normalized tracking registered through a temporary single-use UUID;
  - FFmpeg moving mask and `pixelize` filter;
  - persisted tracking for administrative restarts;
  - `x-vdownloader-identity: 1` cross-origin defense;
  - visible warning about false negatives and other personal signals.
- Queue with configurable concurrency, ETA, cancellation, and retries.
- Rate-aware browser polling: active jobs use a 1.5-second interval, the global
  panel uses 5 seconds without overlapping reads, hidden tabs pause panel
  polling, and HTTP 429 honors `Retry-After` without a false terminal error.
- Refresh of temporary CDN links.
- Persistence and recovery after restart.
- Typed and resumable video/audio downloads through HTTP Range.
- Storage quota, expiration, and cleanup.
- Global panel and FFmpeg/yt-dlp diagnostics.
- Administrative restart that preserves source, quality, trim, and protection.
- Signed CDN URLs hidden from the browser and `jobs.json`.
- MIT license, third-party inventory, and web documentation.
- Linux CI with system FFmpeg and yt-dlp.
- Linux deployment starting templates:
  - an unprivileged systemd unit with read-only system/application paths,
    bounded writable job storage, and no Linux capabilities;
  - an HTTPS Nginx configuration that streams uploads and overwrites forwarded
    headers.
- Continuity through `AGENTS.md` and this file.
- Structured English documentation under `docs/`, including architecture, API,
  development, testing, deployment, operations, security, troubleshooting,
  release checklist, and architecture decisions.
- GitHub issue forms and pull request quality template.
- GitHub repository metadata, Linux CI and MIT badges, safe clone instructions,
  and a real sanitized application screenshot in the repository README.
- Test suites grouped by acceptance, unit, property/invariant, fuzz,
  integration, contract, end-to-end, regression, security, resilience,
  performance, compatibility, fixtures, and helpers.
- Baseline mutation testing with three deliberate provider-utility mutants.
- Cross-platform `npm run verify:deploy` quality gate with a machine-readable
  report, syntax checks, and production dependency audit.
- Identity protection manual review workflow:
  - anonymous spatial tracks labeled Person 1, Person 2, and so on;
  - inclusion/exclusion of individual tracks without biometric recognition;
  - manual missing-region creation at the current sampled point;
  - canvas selection, movement, resizing, and point deletion;
  - automatic protected-path playback and explicit review confirmation before
    export;
  - manual-only operation when the detector finds no face.
- Expanded administration:
  - status, provider, and date filters;
  - checkbox selection and audited bulk restart;
  - manual expired-job/file cleanup and reclaimed-byte result;
  - bounded persisted lifecycle events for each job;
  - current-process administrative audit in the panel and JSON logs.
- Secure remote-access foundation:
  - loopback-only binding by default;
  - opt-in bearer profiles with `user/admin` roles and owner-isolated jobs;
  - per-profile and default active-job limits;
  - per-address rate limiting and invalid-token blocking;
  - required built-in TLS or explicitly trusted HTTPS reverse proxy;
  - CSP, frame denial, no-referrer, permissions policy, and HSTS under HTTPS;
  - access tokens retained only in `sessionStorage`;
  - FFmpeg spawned without a shell, from `JOB_DIR`, with a reduced environment.
  - forwarded addresses and HTTPS state trusted only from a loopback peer;
  - proxy-appended client address validation prevents remote requests from
    inheriting localhost privileges;
  - non-HTTPS remote-mode requests rejected with HTTP 426.

## Completed validation

On Windows, 2026-07-28:

- `npm test`: 18 passing tests, 0 failures.
- `node --check server.js`: passed.
- `node --check public/app.js`: passed.
- `node --check` for every file in `providers/`: passed.
- Identity tests:
  - times, coordinates, sample limits, and region limits;
  - FFmpeg temporal-mask construction;
  - rejection of face registration without the control header.
- Direct FFmpeg test:
  - synthetic H.264 source with audio;
  - two regions at different times and positions;
  - decodable output with H.264 video and AAC audio.
- End-to-end HTTP test:
  - tracking registration through an opaque UUID;
  - temporary upload of a synthetic MP4;
  - `ready` job with `identityProtected: true`;
  - public protected-clip quality label;
  - 73,264-byte download;
  - 320×180 H.264 video and 48 kHz AAC-LC audio.
- Reinforced-tracking stress test:
  - 900 samples with a moving region across 225 seconds;
  - job completed as `ready` in approximately 16 seconds;
  - protected MP4 output of 3,042,037 bytes;
  - atomic persistence confirmed after the job.
- Local resources checked through HTTP GET:
  - MediaPipe module: HTTP 200;
  - WASM JavaScript loader: HTTP 200;
  - WASM: HTTP 200 with `application/wasm`;
  - BlazeFace TFLite: HTTP 200.
- Interface checked in headless Chrome:
  - main page and `app.js?v=18` loaded;
  - Identity protection controls present;
  - visible 40% default margin.
- Service verified on port 5177:
  - `/api/health` returns `status: ok`;
  - `identityProtection.enabled` returns `true`;
  - `identityProtection.maxSamples` returns `900`;
  - FFmpeg and yt-dlp are available;
  - exactly one service instance is listening.
- Project relocation validated on 2026-07-29:
  - content moved to `C:\Projects\vDownloader`;
  - `npm test`: 18 passing tests from the new location;
  - all mandatory syntax checks passed;
  - service started from the new location and `/api/health` returned `ok`;
  - the previous folder remained empty, pending release of the Windows session
    lock before removal.
- Language and documentation update validated on 2026-07-29:
  - Spanish and English dictionaries cover every static and dynamic UI key;
  - interface language is stored in `localStorage` and applied after reload;
  - English mode uses generic localized fallbacks instead of displaying Spanish
    API errors;
  - `README.md`, `public/docs.html`, `AGENTS.md`, `CURRENT_STATUS.md`, and
    `THIRD_PARTY_LICENSES.md` are maintained in English;
  - `npm test`: 19 passing tests, including automated translation-key coverage;
  - all mandatory syntax checks, including `public/i18n.js`: passed;
  - `/`, `/i18n.js`, and `/docs.html` return HTTP 200;
  - the main page serves `app.js?v=19` and the language selector;
  - the documentation page declares `<html lang="en">`;
  - `/api/health` returns `status: ok` with one service instance on port 5177.
- Documentation and quality baseline validated on 2026-07-29:
  - `npm test`: 39 passing tests, 0 failures;
  - `npm run verify:deploy`: passed all thirteen configured categories;
  - mutation score: 3 of 3 configured mutants killed;
  - deterministic fuzzing: 7,000 generated source/media-host inputs evaluated;
  - concurrency smoke test: 50 parallel job-list requests succeeded;
  - parser performance/resource budget: passed;
  - all mandatory JavaScript syntax checks: passed;
  - `npm audit --omit=dev`: 0 known vulnerabilities;
  - `reports/predeploy-report.json`: generated with every automated check
    marked as passed;
  - the gate was executed from Windows after validating its cross-platform npm
    launcher;
  - the service was started from `C:\Projects\vDownloader`, `/api/health`
    returned HTTP 200 with `status: ok`, and `/docs.html` returned HTTP 200 with
    the deployment quality-gate section.
- Identity, administration, and remote-security increment validated on
  2026-07-31:
  - `npm test`: 41 passing tests, 0 failures;
  - `npm run verify:deploy`: all thirteen categories, syntax checks, and
    production dependency audit passed;
  - production dependency audit: 0 known vulnerabilities;
  - access-profile validation, bulk restart authorization, expired cleanup,
    and audit recording have automated security tests;
  - bilingual visible-key coverage includes the new controls;
  - the running service bound to `127.0.0.1`, returned healthy status, reported
    local admin role and remote access disabled;
  - `/` returned HTTP 200 with manual Identity editor, bulk controls, CSP, and
    `X-Frame-Options: DENY`;
  - automated headless Chrome inspection was attempted but the local Chrome GPU
    process failed in this execution environment, so visual browser validation
    remains pending.
- Local service recovery and XVideos real-page validation on 2026-08-01:
  - no process was listening on port 5177, which caused the browser-level
    `Failed to fetch` message before any provider analysis occurred;
  - `npm test`: 41 passing tests, 0 failures;
  - all mandatory JavaScript syntax checks passed;
  - one stable `node server.js` instance was started from
    `C:\Projects\vDownloader` and `/api/health` returned `status: ok`;
  - the reported XVideos page was analyzed successfully through the local API,
    with a duration of 485 seconds and 720p, 480p, 360p, and 240p qualities;
  - no provider code change was required.
- Polling/rate-limit regression corrected on 2026-08-01:
  - one visible tab now produces approximately 54 routine API requests per
    minute while monitoring a job, below half of the default 120 budget;
  - panel reads are coalesced and hidden tabs do not run the panel interval;
  - job monitoring treats HTTP 429 as temporary, honors `Retry-After`, exposes
    a bilingual waiting message, and resumes the same job;
  - `npm test`: 42 passing tests, 0 failures, including the new regression;
  - all mandatory JavaScript syntax checks passed;
  - documentation, README, and changelog were updated.
- Local service start verified again on 2026-08-01:
  - an older Node instance on port 5177 reported a cached degraded yt-dlp
    status even though the packaged Windows development binary was available;
  - only the identified vDownloader process was restarted;
  - `/api/health` returned `status: ok` with FFmpeg available and yt-dlp
    version `2026.07.04`;
  - no application code change was required.

Validation from earlier phases:

- Synthetic unprotected local flow with video and audio.
- Pornhub returning 1080p, 720p, 480p, and 240p for a public URL.
- Administrative restart, loopback restrictions, and opaque references.

Validation on Windows, 2026-10-01:

- `npm test`: 48 passing tests, 0 failures.
- `npm run check:syntax`: passed for the server, frontend, translations, and
  every provider module.
- `npm run verify:deploy`: passed all thirteen required categories, syntax
  checks, mutation score 3/3, and the production dependency audit.
- `npm audit --omit=dev`: 0 known vulnerabilities.
- Media end-to-end tests:
  - starts the complete service on a temporary loopback port;
  - uses an isolated temporary `JOB_DIR`;
  - creates a standards-compliant synthetic WAV tone;
  - uploads a selected one-second range through `POST /api/audio-jobs`;
  - transcodes it through real FFmpeg to 128 kbps MP3;
  - verifies public `mediaKind`, provider, output format, content type, complete
    download, 128-byte HTTP 206 response, and job cleanup.
  - joins two independently trimmed synthetic WAV sources through the streaming
    envelope, downloads typed WAV, restarts the complete Node process, restores
    the task, administratively restarts it, and completes it again;
  - generates a synthetic H.264/AAC MP4, uploads a selected range, transcodes
    it to WebM with VP9/Opus, and downloads a typed output.
- Unit, acceptance, and security checks validate format/MIME pairs, compatible
  container/codec matrices, bitrate behavior, bilingual keys, interface
  controls, both audio control headers, and API wiring.
- Trusted-proxy tests verify validated remote address resolution, ignore direct
  spoofed headers, reject malformed forwarding, preserve verified HTTPS, and
  require secure transport for remote-mode clients.
- Compatibility tests verify root continuity/governance documents and the
  systemd/Nginx security invariants, including no Linux `.exe` dependency.
- The stable service was restarted from `C:\Projects\vDownloader`; exactly one
  process listens on `127.0.0.1:5177`.
- The isolated `/api/health` checks return FFmpeg/yt-dlp status and expose the
  audio and video output matrices plus the 20-source join bound.
- Acceptance tests confirm `/app.js?v=22`, multi-audio controls, video codec
  controls, both audio endpoints, and English web documentation are wired.
- A real headless-browser capture of the empty main interface succeeded and
  was visually inspected. It shows the video and audio tools without private
  media, signed provider URLs, administrator tokens, or job data. The capture
  is published from `docs/images/vdownloader-home.png` in the GitHub README.
- The complete pre-publication gate was rerun on 2026-10-01: all thirteen test
  categories, JavaScript syntax checks, mutation score 3/3, and the production
  dependency audit passed; the audit reported 0 known vulnerabilities.
- The 68 Git publication candidates were checked for high-confidence private
  keys and common provider/API token formats. No real secret was found; the
  only generic secret-assignment matches were the empty `ADMIN_TOKEN` example
  and the documented `change-this-secret` placeholder.
- Ignore rules were expanded so all of `data/jobs`, `.env.*` except the example,
  npm credentials, private-key containers, logs, reports, local tools, and
  operating-system metadata remain outside the repository.
- The first real Ubuntu workflow correctly failed its deployment gate when
  quoted npm glob patterns were not expanded by its POSIX shell. The main, unit, and E2E
  scripts now use Node discovery or explicit files so they are portable across
  Windows and Linux. A compatibility regression test enforces this invariant.
- GitHub-maintained checkout and Node setup actions are pinned to the immutable
  commits for official versions 7.0.1 and 7.0.0 instead of mutable major tags.
- The corrected source commit `5b16a1b` passed Linux CI run `36958072570` on a
  clean Ubuntu runner: system FFmpeg and yt-dlp installation, npm dependency
  installation, all deployment-gate categories, and the live health-endpoint
  check completed successfully.
- The project is published on the `main` branch at
  `https://github.com/dafermen/avDownloader` with repository documentation,
  issue forms, pull request template, Linux CI, and the sanitized real capture.

## Validation still pending

- Complete `docs/RELEASE_CHECKLIST.md` with a real release candidate. The
  automated gate does not replace manual acceptance.
- Install and exercise the new systemd and Nginx templates on the target Linux
  distribution, including video/audio media, permissions, storage, restart,
  proxy headers, HTTPS, and rollback.
- Manually test a real video with faces in the browser and review the overlay
  across the entire range.
- Manually validate anonymous person selection, zero-detection manual mode,
  point add/move/resize/delete, complete-path playback, and review enforcement.
- Test small, profile, partially covered faces and faces entering or leaving
  the frame.
- Confirm recovery of a protected job when restarting the process during
  processing.
- Use the panel to restart one `ready` and one active job.
- Confirm that Cancel during `restarting` prevents a new execution.
- Test remote access with `ADMIN_TOKEN`.
- Test remote bearer profiles over real HTTPS from another computer, including
  user/admin separation, owner visibility, per-user limits, invalid-token
  blocking, large authenticated downloads, and reverse-proxy configuration.
- Add operating-system or container sandboxing for FFmpeg before treating
  arbitrary hostile uploads as a supported public threat model.
- Repeat a real YouTube download with separate audio.
- Review the panel on a mobile screen.
- Test real MOV and WebM inputs and every MP4/MOV/WebM/MKV output profile in
  representative players.
- Manually test real MP3, M4A, AAC, WAV, FLAC, OGG, and Opus inputs and probe
  every MP3/M4A/OGG/Opus/FLAC/WAV output profile in supported browsers.
- Manually join several long real-world sources, inspect every boundary, and
  confirm ordering, source cleanup, cancellation, and storage accounting.
- Review the audio editor visually on desktop and mobile; automated capture was
  unavailable in the latest Windows run.
- Manually verify both interface languages across analysis, local upload,
  identity protection, progress, errors, and administrative restart.

## Operational decisions and warnings

- Canonical port: 5177.
- Linux uses system `ffmpeg` and `yt-dlp`; do not copy Windows executables.
- `localhost` does not mean providers work without Internet access.
- Confirm that exactly one Node instance exists before diagnosing network
  problems.
- Use `npm start` for stable execution; reserve `npm run dev` for active edits.
- Local sources remain available for the life of the job to support restarts.
  The quota includes both source and output.
- Identity protection stores normalized boxes in `jobs.json`, not images,
  embeddings, facial templates, or names.
- Automatic detection does not guarantee complete anonymization. Review the
  final exported video, voice, tattoos, license plates, background, and metadata.
- Reinforced tracking prioritizes privacy over precision and may pixelate a
  larger area while a face moves or is briefly lost.
- MediaPipe 0.10.35, its WASM, and BlazeFace are served locally. Do not replace
  them with a CDN without reviewing privacy, security, and documentation.
- UI language preference is device-local in `localStorage`. Administrator
  tokens remain in `sessionStorage` and are not part of language state.
- This copy was received without usable Git metadata. Its first publication is
  therefore a new `main` history targeting
  `https://github.com/dafermen/avDownloader.git`; no prior history was invented.
- Any deployment requires `npm run verify:deploy`, its passing report, and a
  completed manual release checklist. A failed, skipped, unknown, or flaky
  category blocks deployment unless a written, time-limited exception records
  owner, risk, and rollback.

## Recommended next steps

1. Complete manual browser validation of the Identity and audio editors on
   desktop and mobile.
2. Run the systemd/Nginx templates and the GitHub Actions workflow on Linux.
3. Validate remote profiles over HTTPS on Linux and decide whether a full
   database/OIDC account system is required.
4. Add stronger OS/container isolation for FFmpeg and resource cgroups.
5. Add a real reverse-proxy integration test and durable external audit
   retention.
6. Expand provider-specific contract monitoring with sanitized synthetic
   fixtures and scheduled availability checks.
7. Complete the release checklist with a real candidate.

## Files modified in the current phase

- Root folder renamed from `xvideos` to `vDownloader`.
- `server.js`
- `public/index.html`
- `public/app.js`
- `public/i18n.js`
- `public/styles.css`
- `public/docs.html`
- `public/models/blaze_face_short_range.tflite`
- `test/server.test.js`
- `test/e2e/audio-tool.e2e.test.js`
- `package.json`
- `package-lock.json`
- `README.md`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `.env.example`
- `docs/`
- `.github/ISSUE_TEMPLATE/`
- `.github/pull_request_template.md`
- `.github/workflows/linux-ci.yml`
- `deploy/`
- `scripts/check-syntax.js`
- `scripts/mutation-check.js`
- `scripts/predeploy-check.js`
- `test/acceptance/`, `test/unit/`, `test/property/`, `test/fuzz/`,
  `test/integration/`, `test/contract/`, `test/e2e/`, `test/regression/`,
  `test/security/`, `test/resilience/`, `test/performance/`,
  `test/compatibility/`, `test/fixtures/`, and `test/helpers/`
- `THIRD_PARTY_LICENSES.md`
- `AGENTS.md`
- `CURRENT_STATUS.md`

## DEMO-ENV-20261002 — Optional portfolio entry gate

The owner authorized publication and test-server deployment of the external demo
gateway and its documentation. `DEMO_MODE=true|false` and private `DEMO_PASSWORD`
are read from a separate server env file, not the root local-development env.
The current test deployment stays protected with the existing keys. The gateway
retains server-side verification, host-bound sessions and native app permissions.
Source, blank template and five passing security/configuration tests are versioned
under `deploy/demo-access`. See `docs/DEMO_MODE.md` and its ADR for operations,
rollback and limits. This documentation release does not accept unrelated tasks,
publish pending app development, enable email invitations or alter pilot expiry.

## DOC-STD-20261002 — Documentation organization

The [documentation map](docs/README.md) now identifies canonical sources and maintenance rules. Existing implementation milestones and pending acceptance are unchanged. Validation and publication are tracked separately for this documentation-only change.
