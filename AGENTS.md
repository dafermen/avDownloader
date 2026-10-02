# Mandatory agent instructions

This file applies to the entire repository. Every new Codex session must read
this file and `CURRENT_STATUS.md` in full before editing.

## Project objective

vDownloader is a general-purpose web application that runs locally or on a
private server. It analyzes supported public videos, allows quality selection
and trimming, and prepares an MP4 through FFmpeg. The interface supports
Spanish and English. Project documentation and code identifiers are written in
English.

Use the project only with content the user has the right to download. Do not add
mechanisms that bypass authentication, private content, paywalls, access
restrictions, or DRM.

## Mandatory start of every session

1. Read `CURRENT_STATUS.md` and confirm the current phase.
2. Read `README.md` and the affected sections of `public/docs.html`.
3. Inspect processes and port 5177 before starting the service. Do not run two
   instances or two `node --watch` processes on the same port.
4. Run `npm test` and syntax checks before attributing a regression to a
   provider.
5. If Git does not recognize the repository, do not invent history or use
   destructive operations. Preserve existing files and record the limitation.

## Technical decisions that must be preserved

- Default port: `5177`.
- Node.js 20 or later, ES modules, and a framework-free `node:http` server.
- Linux uses system `ffmpeg` and `yt-dlp`, or the `FFMPEG_PATH` and
  `YT_DLP_PATH` locations. Never add or depend on `.exe` files in production.
- Windows is a development environment and may use optional binaries installed
  through npm.
- Providers live in `providers/` and are registered in `providers/index.js`.
  Do not mix site-specific rules into the router.
- The interface serves HLS.js locally. Do not introduce a frontend CDN without
  an explicit decision and documentation.
- Identity protection serves MediaPipe, WASM, and BlazeFace locally. Do not
  replace them with a CDN or send frames to an external API.
- Manual Identity protection uses anonymous spatial track IDs only. Do not add
  biometric recognition, embeddings, names, or automatic identity matching.
- The local editor accepts MP4, M4V, MOV, and WebM. The preview uses a browser
  `blob:` URL, and the source is uploaded only when exporting. Output is limited
  to the explicit MP4/MOV/WebM/MKV container and H.264/H.265/VP9 plus AAC/Opus
  compatibility matrix in `server.js`.
- The local audio tool accepts MP3, M4A, AAC, WAV, FLAC, OGG, and Opus and
  exports only the MP3/M4A/OGG/Opus/FLAC/WAV format/codec matrix in
  `server.js`. It can join 2–20 ordered, individually trimmed sources.
  Compressed bitrates are an explicit allowlist; never accept raw FFmpeg
  arguments, client paths, or arbitrary output extensions.
- Spanish and English interface strings live in `public/i18n.js`. Keep both
  languages complete when visible behavior changes. Documentation remains
  English-only.
- Project-owned code uses the MIT license. Keep
  `THIRD_PARTY_LICENSES.md` current when dependencies or binaries change.

## Security invariants

- Accept only HTTPS and page/CDN hosts explicitly included by each provider.
  Every media URL must pass through the allowlist to prevent SSRF.
- Signed CDN URLs are private and must not appear in JSON responses, HTML,
  logs, `localStorage`, `jobs.json`, or documentation.
- The browser receives `selectionId` values and opaque UUID media references.
- Do not store or commit videos, cookies, credentials, CDN tokens,
  `ADMIN_TOKEN`, or content from `data/jobs`.
- Remote administrative restart requires `ADMIN_TOKEN` in the `x-admin-token`
  header. Without a configured token, it can work only from loopback.
- Every restart request also requires `x-vdownloader-admin: 1`. Preserve this
  non-standard header as a defense against simple cross-origin requests.
- Every local upload requires `x-vdownloader-upload: 1`, `Content-Length`, and
  validated `x-upload-*` metadata. Do not accept client-provided paths or
  return internal paths.
- Every audio upload requires `x-vdownloader-audio: 1`, `Content-Length`,
  validated `x-upload-*` metadata, and an allowlisted `x-audio-format`,
  `x-audio-codec`, and bitrate profile. Audio joins require
  `x-vdownloader-audio-join: 1`, 2–20 sources, at most 64 KiB of length-prefixed
  metadata, exact declared byte accounting, and a combined range of at most 12
  hours. Preserve streaming writes; never buffer complete joined media in RAM.
- The panel token is stored only in `sessionStorage`, never in a URL.
- The application is not hardened for direct Internet exposure.
  Authentication, HTTPS, rate limiting, and isolation are required first.
- Local mode must bind to loopback. Remote mode must remain opt-in and fail
  closed unless access profiles and built-in or trusted-proxy HTTPS are ready.
- Bearer profiles enforce owner-isolated jobs, user/admin authorization, and
  active-job limits. Never return, persist, or log access tokens.
- Trusted proxy headers are valid only when the immediate peer is loopback.
  Use the validated proxy-appended client address for authentication and rate
  limiting; a proxied remote request must never inherit local administrator
  privileges.

## Job and multimedia invariants

- A restarted job preserves its ID, source URL, provider, quality, filename,
  and trim range. It removes the previous output, clears progress/errors, and
  refreshes signed URLs before running FFmpeg.
- A protected local job also preserves `identityProtection`. Coordinates are
  normalized, the temporary reference is a single-use UUID, and it must never
  be replaced with biometric data or persisted images.
- A local job stores `sourceFilename` as a relative UUID name inside `JOB_DIR`.
  The temporary source remains available for restarts and is removed with the
  job or when it expires. Partial uploads are always removed.
- `MAX_UPLOAD_GB` limits a single upload or the combined sources of one join
  and can never exceed `MAX_STORAGE_GB`. The quota counts every temporary
  source and every ready output.
- Do not reuse persisted URLs after restarting the process. Recovered jobs must
  be marked `needsRefresh`.
- Keep concurrency within `MAX_CONCURRENT_JOBS` and avoid duplicate IDs in
  `jobQueue`.
- Remote video is copied when compatible. Local files use only the allowlisted
  container/codec matrix, and pixel format remains YUV420p. Verify both video
  and audio with representative players, especially H.265, VP9, and separate
  tracks.
- Audio jobs share ownership, queue, persistence, restart, cancellation,
  expiration, quota, and HTTP range behavior with video jobs. Restore only
  allowlisted output profiles and derive extensions/content types server-side.
  Joined jobs must preserve order and per-source clips; restart and cleanup
  must validate and cover every UUID-owned source.
- Cancelling a job during restart must prevent it from being queued again.
- Job owner IDs and bounded safe event history persist across restarts. A user
  may list, inspect, cancel, or download only owned jobs; admins may manage all.

## Main files

- `server.js`: API, queue, FFmpeg, persistence, proxy, and administration.
- `providers/`: validation and analysis for each site.
- `public/app.js`: interaction, trimming, panel, and administrative restart.
- `public/i18n.js`: Spanish and English UI dictionaries and language handling.
- `public/index.html` and `public/styles.css`: interface.
- `public/docs.html`: complete English documentation visible from the app.
- `test/server.test.js`: tests using `node:test`.
- `.github/workflows/linux-ci.yml`: automated Ubuntu validation.
- `deploy/`: unprivileged systemd and trusted Nginx starting templates.
- `CURRENT_STATUS.md`: living status and next steps.

## Minimum validation before delivery

```text
npm test
node --check server.js
node --check public/app.js
node --check public/i18n.js
node --check providers/index.js
node --check providers/youtube.js
node --check providers/xvideos.js
node --check providers/pornhub.js
node --check providers/xnxx.js
node --check providers/utils.js
```

When the API or job flow changes, add a test. When visible behavior changes,
update both UI language dictionaries, `README.md`, and `public/docs.html`.

## Mandatory deployment gate

Before any deployment or release, all thirteen test categories in
`docs/TESTING.md` must be evaluated. Run `npm run verify:deploy`, retain the
generated `reports/predeploy-report.json` as release evidence, and complete
`docs/RELEASE_CHECKLIST.md`. A skipped, unknown, flaky, or failed category
blocks deployment unless a named owner records a written, time-limited
exception with risk and rollback. Never claim manual acceptance or real-media
validation that was not performed.

## Mandatory end of every session

1. Update `CURRENT_STATUS.md` with the date, actual changes, and executed tests.
2. Clearly separate completed work from pending or unvalidated work.
3. Record decisions and risks that another session should not rediscover.
4. Do not claim a manual validation that was not performed.
5. If the service remains active, confirm `/api/health`; do not document a PID,
   because it changes between restarts.
