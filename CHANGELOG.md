# Changelog

## Guided creation and resumable YouTube staging — candidate 2026-11-05

- Added a task-first quick start for video, audio-only, subtitles, and local
  Identity protection, plus a five-step creation path and batch analysis for
  up to ten links.
- Replaced immediate quality actions with explicit Video/Audio/Subtitles tabs,
  Recommended/Maximum/Small presets, an output review, and one final create
  action. Advanced audio format and codec choices remain available.
- Added queue, download, processing, and finalization stages, followed by
  Download, Create another version, and View Download Center actions.
- Kept failed YouTube yt-dlp partial files for bounded continuation on retry or
  administrative restart. Part bytes are persisted, count toward the storage
  quota, and are removed on success, cancellation, expiration, or deletion.
- Extended bilingual acceptance and resilience coverage. The complete
  development suite passes with 83 tests and no failures.

## Reliable YouTube downloads and audio-only export — candidate 2026-11-04

- Replaced direct FFmpeg access to signed Googlevideo tracks with yt-dlp's
  native downloader followed by local FFmpeg trimming/transcoding. This fixes
  the reproducible HTTP 403 failure for `T27J0SDQ2FM` while retaining opaque
  selections, retries, cancellation, persistence, and provider refresh.
- Added an Audio only card to analyzed YouTube videos with shared trim controls
  and allowlisted MP3, M4A, OGG, Opus, FLAC, and WAV output plus 96–320 kbps
  lossy quality choices.
- Added `POST /api/remote-audio-jobs`, a non-simple control header, owner-aware
  persistent audio jobs, source-name downloads, and bilingual UI text.
- Added parser, selector, privacy, security, and acceptance coverage. A minimal
  live yt-dlp transfer of the reported video's 720p and M4A tracks succeeded;
  a complete multi-hour download was not performed during development.

## Local-audio subtitle generation — candidate 2026-11-02

- Extended **Generate from audio or video** to MP3, M4A, AAC, WAV, FLAC, OGG,
  and Opus while keeping embedded-track extraction restricted to video.
- Added a mode-first bilingual selector, dynamic file restrictions, an audio
  preview, the existing precise range controls, and source-base-name SRT/VTT
  downloads.
- Reused the existing local FFmpeg-to-Whisper pipeline, isolated worker,
  language/model allowlists, persistent queue, restart, quota, cleanup, and
  authenticated download contract. Source audio is not sent to a cloud API.
- Added metadata, acceptance, and synthetic WAV-to-SRT end-to-end coverage.
- Increased the bounded local Whisper range from 30 minutes to 180 minutes
  (3 hours), including the browser preflight, server enforcement, environment
  template, health metadata, documentation, and exact boundary tests.
- Long Whisper jobs now report progress after every internal 30-second chunk
  instead of appearing frozen at 45%; model, overlap, timestamps, and output
  quality remain unchanged.

## Local subtitle generation — candidate 2026-10-20

- Added the bilingual **Generate subtitles from local video** mode for local MP4,
  M4V, MOV, and WebM files with selectable range, spoken language, Whisper
  Tiny/Base accuracy profile, and SRT or WebVTT output.
- Added `POST /api/transcription-jobs`, finite header/profile validation,
  owner-isolated persistent jobs, administrative restart, cancellation,
  retention, typed download, and storage admission.
- Added a shell-free worker using Transformers.js 4.3.1 and quantized Whisper.
  FFmpeg prepares temporary mono 16 kHz PCM; audio stays local, PCM is deleted,
  and downloaded model artifacts are reused from an ignored local cache.
- Added unit coverage for PCM, timestamps, rendering, and metadata; security
  coverage for the dedicated control header; and deterministic HTTP E2E
  coverage with an isolated mock worker. A real Whisper Tiny load/inference was
  also verified on the Windows development machine.
- Added deployment configuration, operations, privacy, architecture, API,
  testing, and third-party license documentation. No remote deployment was
  performed.
- The complete development suite passes with 79 tests and no failures.
- Clarified the source wording in the bilingual interface without changing the
  transcription pipeline, API, queue, or output behavior.
- Subtitle success notices now clear after eight seconds. Starting a subtitle
  download dismisses only its inline result; the persistent Download Center
  job and server-side file remain available until normal expiration or removal.
- New subtitle jobs now download with the source video's exact safe base name,
  replacing only the extension with `.srt` or `.vtt`. UTF-8 download headers
  preserve spaces, case, and supported accents without allowing path injection.

## Existing subtitle export — candidate 2026-10-20

- Added an independent bilingual **Export subtitles** workflow for existing
  YouTube caption tracks and embedded local-video subtitle streams.
- Added SRT and WebVTT output through opaque YouTube track selections or a
  bounded local subtitle-stream ordinal; no timed-text URL is exposed.
- Added persistent, owner-isolated subtitle jobs with queueing, restart,
  expiration, quota, cleanup, typed resumable download, and event history.
- Added parser, metadata, security, acceptance, and real FFmpeg end-to-end
  coverage using a synthetic captioned MP4 fixture.
- Reject zero-byte process outputs instead of advertising them as ready, and
  harden download-stream errors so an empty or missing output cannot terminate
  the server with a second HTTP response.
- Automatic speech transcription remains intentionally out of scope for this
  release; the feature exports only caption tracks that already exist.
- The complete development suite passes with 70 tests and no failures.

## Clear local-media workflows — candidate 2026-10-20

- Replaced the ambiguous local result selector with three top-level tasks:
  **Create a video**, **Extract audio from a video**, and **Edit audio files**.
- Removed the duplicate video-extraction action from the existing-audio card;
  each workflow now has one canonical entry point and only relevant controls.
- Added consistent four-step guidance and preflight summaries with source,
  format, codec or quality, and selected interval or combined duration.
- Ready jobs now scroll into view and focus their Download action.
- Fixed local editors ignoring their initial hidden state and appearing as an
  empty player before a file was selected. Updated the README's real capture.
- Preserved every upload endpoint and processing contract. The complete
  67-test development suite passes; no remote deployment was performed and
  browser visual acceptance remains pending.

## Local video audio extraction — candidate 2026-10-07

- Added an Audio only mode to the local video editor with the same precise
  start/end selection used for video exports.
- Added a dedicated **Extract from a video** action to the audio card. It opens
  the video picker, selects Audio only, and moves the user to the correct
  editor so a video is no longer mistaken for an existing audio input.
- Replaced the programmatic hidden-input click with the browser's native label
  association for embedded-browser compatibility. Selecting a video through
  the audio-file control also redirects safely to extraction, and the same
  video can be selected again after a failed or cancelled attempt.
- Fixed the video-picker change event being mistaken for an override file,
  which silently stopped video metadata loading and left Extract audio without
  a source. Both export actions now show an explicit message when no loaded
  source or valid range is available instead of returning silently.
- Added bounded MP3, M4A/AAC, OGG/Vorbis or Opus, Opus, FLAC, and WAV output
  profiles, including 96, 128, 192, 256, and 320 kbps lossy qualities.
- Added `POST /api/video-audio-jobs` with both upload and extraction control
  headers, exact source validation, streaming disk writes, quota admission,
  audio-only FFmpeg mapping, typed downloads, persistence, and restart support.
- The complete 66-test development suite and syntax checks pass. Synthetic
  MP4-to-MP3 E2E coverage includes typed output, HTTP 206, process-restart
  recovery, and administrative restart. The healthy localhost service on port
  5177 now runs this candidate with exactly one listener; no remote deployment
  was performed. User visual acceptance remains pending.

## Authenticated streaming downloads — deployed 2026-10-05

- Fixed remote Download links that navigated without the bearer header and
  returned `Se requiere un token de acceso válido` after long conversions.
- Download buttons now create a random 30-minute, job-scoped HttpOnly cookie
  through an authenticated non-simple request. Native access tokens and grants
  never appear in URLs or persisted jobs.
- Completed files stream through the browser download manager with HTTP Range;
  multi-gigabyte outputs are no longer copied into a JavaScript Blob.
- Added remote end-to-end coverage for unauthorized access, grant creation,
  cookie restrictions, full streaming, byte ranges, and cross-job rejection.
- The 64-test development suite and all thirteen deployment-gate categories
  pass on Windows and Linux; syntax checks pass and the production audit
  reports zero vulnerabilities.
- Deployed as `/opt/avdownloader/releases/20261005-download-grants`. Live
  validation on the retained 2.1 GB ready job confirmed HTTP 401 without
  authorization, HTTP 201 grant creation, and HTTP 206 range streaming through
  the scoped cookie. The job, credentials, private configuration, and pilot
  expiry were preserved.

## Visible token-validation feedback — deployed 2026-10-04

Validate access now displays a full-width persistent status banner with checking,
success, rejection, empty input, expired demo, rate-limit or network outcomes.
Background diagnostics no longer overwrite this result. A valid credential
with degraded tools is distinguished from an authentication failure. Only
successful credentials are saved for the tab, and known rejected credentials
are not re-sent during export. The input never submits partial tokens.

62 tests PASS; Windows/Linux gates PASS; Chrome desktop/mobile PASS. Live HTTPS PASS.
Active release: `/opt/avdownloader/releases/20261004-auth-feedback`.
A root-only `/etc/avdownloader/access-token.txt` contains the existing native token
for owner retrieval on the server; no credential rotation or export.
The private VPS has distinct ADMIN_TOKEN and ACCESS_TOKENS_JSON credentials;
remote access requires the latter profile's token. No key rotation, GitHub
publication or permission changes are included. See release evidence in
`docs/DEPLOY-20261004-AUTH-FEEDBACK.md`.


## Explicit token validation and cooldown — deployed 2026-10-04

Remote logs confirmed 401 attempts followed by 429 responses that also blocked
the upload-config endpoint. Typing formerly submitted incomplete native tokens
through both job and health requests. The access field now waits for the
explicit Validate access button; editing pauses API polling and exports.
Only submitted credentials are saved in tab sessionStorage. The client respects
Retry-After, and the server reports the remaining existing 15-minute auth block.
Unavailable diagnostics no longer claim FFmpeg/yt-dlp are missing. Upload errors
distinguish demo expiry and rate limits from general configuration failures.

62 tests PASS; Windows/Linux gates PASS; Chrome 1440/390 PASS. Live HTTPS checks PASS.
Active release: `/opt/avdownloader/releases/20261004-auth-ui`.
Native permissions, demo protection, quotas and pilot expiry remain unchanged.
Release evidence: `docs/DEPLOY-20261004-AUTH-UI.md`. No GitHub publication.


## Upload preview limit correction — deployed 2026-10-04

Fixed the stale 2 GiB browser fallback when native authentication prevents
reading `/api/health`. Video and audio selection now await the current
`/api/upload-config`, which returns only three non-sensitive size fields.
The endpoint retains HTTPS and rate limits; the VPS demo gate still protects it.
Jobs, exports and diagnostics retain native authentication and owner isolation.
Settings failures produce bilingual retry guidance, not an invented limit.
Asset versions were advanced to refresh existing browser code.
Windows/Linux deployment gates and live HTTPS checks PASS. Active release:
`/opt/avdownloader/releases/20261004-upload-ui`; rollback: `20261004-upload`.

Validation: 61 tests PASS, Chrome 1440/390 px PASS using synthetic files and
no native token. Covers delayed config, 5 GiB admission to browser decoding,
7 GiB rejection at a 6 GiB cap, audio checks, quota-only mode, error/retry
and ES/EN messages. The synthetic file does not prove real media decoding or
a full 5 GiB conversion. Deployment gates and server delivery are recorded in
[release evidence](docs/DEPLOY-20261004-UPLOAD-UI.md).


## Configurable large uploads — deployed 2026-10-04

The private pilot now uses `UPLOAD_LIMIT_ENABLED=true`, `MAX_UPLOAD_GB=6`,
`MAX_STORAGE_GB=12` and `UPLOAD_TIMEOUT_MINUTES=180`. Its private settings are
in `/etc/avdownloader/avdownloader.env`; restart `avdownloader` after edits.
Setting `UPLOAD_LIMIT_ENABLED=false` removes the per-upload cap, not the
aggregate storage quota. Nginx streams directly to Node with no competing
body-size cap. Node enforces the effective size and exact Content-Length.
The root development `.env` is read on Node.js 20.12+; process variables win.

Validation: 59 tests PASS, all 13 deployment categories plus syntax and
production audit PASS on Windows/Linux, zero production vulnerabilities.
Tests cover >4 GiB sizes, both modes, quota ceilings, invalid settings,
streaming and aborted-upload cleanup. Chrome local candidate checks at
1440/390 pixels verified the 6 GiB UI ceiling and disabled-cap behavior.
Authenticated HTTPS on the VPS admitted a declared 5 GiB request, streamed
64 KiB and removed the partial source after cancellation. The owner's full
5 GiB file was not uploaded or converted. A live Chrome check requiring
credential export was blocked by automatic approval; no credentials were exported.

Release: `/opt/avdownloader/releases/20261004-upload`. Previous release:
`/opt/avdownloader/releases/20261002`. Private rollback configuration:
`/var/backups/avdownloader-upload-20261004`. Tokens, demo authentication,
service isolation and October 9 pilot expiry are unchanged. No GitHub writes.
The existing owner-approved manual format/provider/identity exception remains
time-limited; large real-media user acceptance is still pending.

## Documentation navigation candidate — 2026-10-03

InnovaLogic visual family, reading paths, collapsible navigation where applicable, code copy and keyboard image enlargement. Local validation and delivery status are recorded in docs/WEB_NAVIGATION.md.

All notable project changes are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
semantic versioning for published releases.

## [Unreleased]

- Reduced and coalesced browser polling so one active tab remains below the
  default API request budget, and made job monitoring recover from HTTP 429 by
  honoring `Retry-After` instead of reporting a false preparation failure.

### Added

- Multi-audio editing with 2–20 ordered sources, an independent trim range for
  every source, streaming upload, persistent restart-safe joining, and complete
  source cleanup.
- Allowlisted audio output profiles for MP3, M4A/AAC, OGG/Vorbis or Opus,
  Opus, FLAC, and WAV/PCM with compatible bitrate behavior.
- Local video conversion to MP4, MOV, WebM, or MKV through compatible H.264,
  H.265, or VP9 video and AAC or Opus audio profiles.
- End-to-end coverage for a real two-source audio join and MP4-to-WebM
  VP9/Opus conversion in addition to the existing WAV-to-MP3 journey.

- Spanish and English interface with English project documentation.
- Local video trimming and Identity protection.
- YouTube, XVideos, Pornhub, and XNXX providers.
- Persistent jobs, configurable concurrency, retries, signed-link refresh, and
  administrative restart.
- Structured documentation under `docs/`.
- Thirteen-category deployment quality gate with a machine-readable report.
- GitHub issue forms, pull request template, and Linux continuous integration.
- Anonymous person selection and manual point editing for Identity protection,
  including adding, moving, resizing, and deleting regions plus mandatory
  full-path visual review before protected export.
- Administrative filters, bulk restart, expired-job cleanup, storage controls,
  job lifecycle history, and sanitized administrative audit.
- Opt-in remote profiles with user/admin authorization, job ownership,
  per-user limits, rate limiting, failed-authentication blocking, HTTPS or
  trusted-proxy enforcement, security headers, and reduced FFmpeg environment.
- A local audio editor with browser preview, precise per-source trimming,
  ordered joining, six output containers with compatible codecs, selectable
  lossy bitrate, temporary uploads, persistent jobs, administrative restart,
  cleanup, and resumable downloads.
- An isolated end-to-end test that creates a synthetic WAV, transcodes a
  selected range to MP3 through the real HTTP API and FFmpeg, and verifies HTTP
  range download behavior.
- Linux deployment templates for an unprivileged, restricted systemd service
  and an HTTPS Nginx reverse proxy.

### Security

- Provider page and CDN allowlists to reduce SSRF risk.
- Opaque media references that keep signed CDN URLs out of browser responses
  and persisted jobs.
- Non-simple control headers for administration, local upload, and Identity
  protection registration.
- A distinct non-simple control header and allowlisted codec/container profiles
  for local audio uploads.
- Trusted reverse-proxy headers are accepted only from loopback, validated, and
  resolved from the proxy-appended address so a remote client cannot claim
  localhost administrator privileges.

## [1.0.0] - 2026-07-29

### Added

- Initial functional local/private release.
