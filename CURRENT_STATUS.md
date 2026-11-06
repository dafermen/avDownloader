# Current vDownloader status

## Recovery visibility, subtitle workshop, estimates, notifications, diagnostics, and visual QA — local candidate, 2026-11-05

YouTube jobs now expose only safe resumable-state metadata: preserved byte
count, approximate percentage, and the byte position used by the current
attempt. Active and panel cards explain when a transfer is resuming. Owners can
explicitly discard a terminal job's UUID-owned partial through the protected
`DELETE /api/jobs/:id/partial` route; no provider URL or format ID is exposed.

Remote video and YouTube audio creation now display a preflight estimate for
final size, processing time, and available configured storage, including long
job and insufficient-space warnings. The Download Center offers opt-in browser
notifications, an optional local completion tone, a ready-task badge/tab count,
and a downloadable diagnostic JSON. The report contains public versions,
queue/storage state, bounded sanitized lifecycle events, and dependency status;
it excludes tokens, URLs, paths, media, and subtitle text.

The local subtitle workflow has a third mode, **Edit and embed subtitles**. It
imports a bounded SRT, exposes structured text/start/end fields, supports cue
addition/removal and browser-local WebVTT preview, downloads normalized edited
SRT, and translates English cue text to Spanish with the fixed local
`Xenova/opus-mt-en-es` worker. Translation preserves cue count/order/timestamps.
The complete video and validated SRT stream into a persistent job that creates
an H.264/AAC MP4 with either selectable `mov_text` or permanently burned text.
The private SRT participates in quota, persistence, restart, expiration, and
cleanup; browser requests cannot choose filesystem paths, model URLs, filters,
codecs, or FFmpeg arguments.

Playwright 1.65.0 plus axe-core 4.14.0 now cover deterministic Spanish desktop
and English mobile entry points for video, audio, and subtitles, serious/
critical accessibility checks, and four reviewed Chromium screenshot baselines
under `test/visual/__snapshots__`. The deployment gate runs this suite, and
Linux CI installs Playwright Chromium first. Accessibility findings corrected
low-contrast secondary text and the brand accessible name.

Executed validation at this checkpoint: the complete regression suite passed
87/87 tests; the real FFmpeg E2E test produced both selectable and burned MP4
outputs; and both Playwright visual/accessibility tests matched the four
reviewed baselines. `npm run verify:deploy` passed all thirteen automated test
categories, JavaScript syntax, the 3/3 mutation check, and the production
dependency audit with zero reported vulnerabilities. Real model translation,
browser notification permission, an interrupted YouTube resume, cross-player
subtitle selection, and the manual release checklist remain manual validation
items and must not be claimed as completed.

## Guided creation workflow and resumable YouTube parts — local candidate, 2026-11-05

The home page now begins with a task-first quick start for Video, Audio only,
Subtitles, or local Identity protection. Remote analysis uses progressive
disclosure: the user first chooses the output type, then a Recommended,
Maximum-quality, or Small-file preset, reviews the result, and explicitly
creates the job. Advanced audio format/codec controls remain available in a
collapsed section. Up to ten URLs can be analyzed sequentially in one batch.

Active job cards now expose queue, download, processing, and finalization
stages. A ready result offers Download, Create another version, and View
Download Center actions. Spanish and English dictionaries cover every new
visible label.

YouTube network failures retain UUID-owned yt-dlp partial files so a retry or
administrative restart can continue rather than starting from zero. Partial
bytes are persisted and included in storage accounting. They are removed on
success, cancellation, expiration, or job deletion. Provider URLs and format
IDs remain server-only.

The complete development suite passes with 83 tests and no failures, including
new bilingual acceptance and resumable-staging resilience assertions. The full
syntax gate passes. Sanitized Chrome renders were reviewed at 1440 px and the
500 px mobile breakpoint; the new captures are in `docs/images/`. A live
analysis of `T27J0SDQ2FM` returned six video qualities, audio, and caption
tracks without exposing a Googlevideo URL. Interactive controls, a real
interrupted/resumed YouTube transfer, the manual release checklist, and remote
deployment are still pending at this checkpoint.

`npm run verify:deploy` also passed all thirteen automated categories, syntax,
3/3 mutation checks, and the production dependency audit with zero reported
vulnerabilities. GitHub-hosted Linux CI run `42158057063` also passed the
deployment gate and system-tool health check on Node.js 20 / Ubuntu. The manual
release checklist remains required before deployment.

## Reliable YouTube download and audio export — local candidate, 2026-11-04

The reported YouTube video `T27J0SDQ2FM` analyzed correctly but two 720p jobs
failed after three attempts with HTTP 403. The current design passed signed
Googlevideo URLs directly to FFmpeg. A controlled diagnosis proved that yt-dlp
could retrieve both format 136 video and format 140 M4A while FFmpeg could not
open the same provider-bound URL, even with yt-dlp's advertised HTTP headers.

YouTube video jobs now use yt-dlp's native downloader to retrieve the selected
allowlisted format IDs into UUID-owned staging files. FFmpeg only operates on
the local result when trimming or transcoding is required. Staging files are
removed after success, failure, or cancellation; signed URLs and format IDs are
not returned to the browser or persisted. Retry and administrative restart
reanalyze the original page before running again.

Analyzed YouTube results now include an independent **Audio only** card sharing
the same range controls. It exports MP3, M4A, OGG, Opus, FLAC, or WAV with the
existing compatible-codec matrix and 96–320 kbps lossy allowlist through
`POST /api/remote-audio-jobs`. The route requires the non-simple
`x-vdownloader-audio-extract: 1` header, accepts only an opaque selection, and
creates ordinary owner-isolated persistent audio jobs with queueing, retries,
cancellation, restart, quota, retention, and authenticated range downloads.

The complete development suite passes with 82 tests and no failures; the full
syntax gate passes. A live yt-dlp minimal transfer of the reported video's 720p
and M4A tracks succeeded. The complete 3:48-hour output was not downloaded as
part of validation. Visual desktop/mobile acceptance and remote deployment
remain pending.

The updated candidate is running at `http://localhost:5177`. Health reports
FFmpeg and yt-dlp operational and advertises YouTube as a remote audio source.
A live analysis of the reported URL returned six video qualities plus one
opaque audio selection, and the serialized browser response contained no
Googlevideo URL. The temporary diagnostic artifact was removed.

## Local-audio subtitle generation — local candidate, 2026-11-02

The local subtitle tool now asks for the method before the file: embedded-track
extraction remains restricted to MP4, M4V, MOV, and WebM video, while
**Generate from audio or video** also accepts MP3, M4A, AAC, WAV, FLAC, OGG,
and Opus. Audio sources receive a browser-local preview and the same precise
range, language, Whisper Tiny/Base, SRT/WebVTT, queue, persistence, restart,
quota, cleanup, and authenticated-download behavior as video transcription.

`POST /api/transcription-jobs` reuses the explicit video and audio extension
and MIME allowlists and still requires upload, subtitle, and transcription
control headers. FFmpeg maps only the first audio stream into temporary mono
16 kHz PCM; the isolated local Whisper worker and cleanup behavior are
unchanged. Source media keeps its safe base name in the subtitle download.

The default and absolute selected-range limit is now 180 minutes (3 hours),
reported by `/api/health` and consumed by the browser preflight. Exact boundary
coverage accepts 3:00:00 and rejects longer ranges. Long Whisper Base jobs can
require substantial CPU time and temporary storage but remain protected by the
existing queue, working-size admission, cancellation, and cleanup controls.

The complete development suite passes with 80 tests and no failures. The new
coverage includes metadata validation, bilingual acceptance checks, and a
synthetic WAV-to-SRT HTTP end-to-end job. The complete syntax gate passes. The
updated local service is healthy on `http://localhost:5177`, advertises all
eleven video/audio transcription inputs, and has an idle queue. Manual visual
acceptance with a representative user audio file remains pending; no remote
deployment was performed.

A real 46:10 M4A/Whisper Base job exposed a progress-reporting gap: after PCM
extraction and model loading, the Transformers.js pipeline stayed at 45% while
actively consuming CPU across its internal 30-second chunks. The worker now
wraps the unchanged model-generation calls and emits bounded progress after
each completed chunk. Unit coverage validates exact chunk counts and monotonic
progress; syntax checks pass. The already-running pre-fix job was deliberately
left uninterrupted and later completed successfully. The full suite now passes
as recorded in the current candidate above; no deployment was performed.

## Local subtitle generation — local candidate, 2026-10-20

The local subtitle workflow now clearly separates **Extract existing track**
from **Generate subtitles from local video**. Generation accepts a selected range,
automatic or explicit language, a Fast (Whisper Tiny) or Balanced (Whisper
Base) profile, and SRT or WebVTT. The browser uploads only on generation and
the resulting job uses the existing owner-isolated persistent queue, restart,
cancellation, quota, expiration, event history, and authenticated download.

`POST /api/transcription-jobs` requires all upload/subtitle/transcription
control headers. The server validates source type, exact bytes, time range,
maximum transcription duration, language, profile, and format. FFmpeg extracts
temporary mono 16 kHz PCM. A shell-free `transcription-worker.js` process loads
an allowlisted quantized Whisper model through Transformers.js, renders timed
text, and never sends source audio to a cloud transcription API. Temporary PCM
is removed on every result path. Models are downloaded once into the ignored
local cache and may be preloaded for offline operation.

The complete development suite passes with 79 tests and no failures; static
syntax validation also passes. The E2E suite uses a
deterministic worker fixture to stay network-independent, while a real Whisper
Tiny model load and inference was verified on this Windows development machine.
The first-use model download, Tiny/Base accuracy, languages, silence/noise,
long-video resources, and final caption review still require manual release
evidence on the target Linux host. No remote deployment was performed.
The validated local candidate is running at `http://localhost:5177`; health
reports transcription enabled with Fast and Balanced profiles and an idle queue.
The bilingual source wording was clarified without changing the transcription
pipeline, API, queue, or output behavior.
Subtitle success notices now auto-dismiss after eight seconds. A successful
download start dismisses the tool's inline result after three seconds, while
the persistent Download Center job and output file remain available under the
existing retention and manual-removal rules.
New local and YouTube subtitle jobs preserve the source video's safe base name
and replace only its extension with `.srt` or `.vtt`. Content-Disposition now
provides an ASCII fallback plus RFC 5987 UTF-8 encoding for spaces and accents;
existing persisted jobs retain their previously assigned filenames.

## Existing subtitle export — local candidate, 2026-10-20

The interface now has a fourth independent workflow, **Export subtitles**.
For YouTube it analyzes published and automatic caption tracks, exposes only
opaque selection UUIDs, and exports the selected track as SRT or WebVTT through
yt-dlp. For MP4, M4V, MOV, and WebM it previews the file locally, accepts a
bounded embedded-track number and time range, uploads only on export, and uses
FFmpeg to create SRT or WebVTT. The feature exports existing tracks; it does not
transcribe speech and does not call a cloud transcription API.

Subtitle jobs use the existing owner-isolated persistent queue, storage quota,
administrative restart, cancellation, expiration, cleanup, event history, and
authenticated native download. Output format, MIME type, extension, process
arguments, language key, and local track ordinal are revalidated by the server.
YouTube timed-text URLs do not reach browser JSON or persisted job state.

Unit coverage validates bounded local metadata, provider coverage verifies that
caption URLs are removed, security coverage enforces the non-simple control
headers, and an end-to-end test creates a synthetic MP4 subtitle stream and
downloads a real SRT result. Processing now rejects zero-byte outputs, and the
download stream no longer attempts a second HTTP response after headers have
been sent. Real YouTube caption availability and a visual desktop/mobile review
remain manual pre-deployment checks; no remote deployment was performed.

The complete development suite passes with 70 tests and no failures; static
syntax validation also passes.

## Clear local-media workflows — local candidate, 2026-10-20

The local interface now starts with three explicit tasks: **Create a video**,
**Extract audio from a video**, and **Edit audio files**. Only the selected
workflow is visible. The former result selector remains an internal control so
the stable `/api/upload-jobs`, `/api/video-audio-jobs`, `/api/audio-jobs`, and
`/api/audio-join-jobs` contracts and their security checks are unchanged.

The duplicated Extract from a video action was removed from the existing-audio
card. Both visible editors now show the same four-step sequence and a concise
preflight summary with the source, output profile, and selected interval or
duration. When a job becomes ready, its card scrolls into view and keyboard
focus moves to the authenticated Download action. Spanish and English strings,
the GitHub README, and the in-application English documentation describe the
new workflow.

At that workflow checkpoint, the development suite passed with 67 tests and no
failures. Fresh desktop and narrow-window captures were
reviewed, the empty editor display found during that review was corrected, and
the README now uses the new real application capture. Interactive acceptance
with representative user media is still pending; no remote deployment was
performed.

## Local video audio extraction — local candidate, 2026-10-07

The local video editor now switches between converted video and audio-only
output. A selected range can be exported as MP3, M4A/AAC, OGG with Vorbis or
Opus, Opus, FLAC, or WAV. Lossy profiles expose only 96, 128, 192, 256, and
320 kbps; FLAC and WAV disable bitrate. Identity protection is hidden for
audio-only output because no video frames are emitted.

The separate audio card now exposes two explicit source paths: **Extract from
a video** opens the video picker and preselects audio-only output, while
**Select audio files** retains the existing trim/join/transcode workflow. This
removes the misleading path that previously rejected a selected video with an
audio-extension message. The video picker uses native label activation instead
of a scripted hidden-input click for embedded-browser compatibility. An
accidentally selected video from the audio input is redirected to the extractor,
and clearing the picker value permits selecting the same file again.

A browser-level regression found and fixed a change-handler argument collision:
the DOM `change` event was previously interpreted as a video override, so the
file never reached metadata loading and **Extract audio** returned with no
registered source. The native handler now calls the loader without forwarding
the event. Both video-audio extraction and existing-audio export were exercised
in headless Chrome with synthetic three-second media; each endpoint returned
HTTP 202 and both outputs reached `ready`. Temporary media, test jobs, and the
diagnostic script were removed afterward. Missing-source and invalid-range
guards now display visible bilingual feedback rather than returning silently.

`POST /api/video-audio-jobs` requires both `x-vdownloader-upload: 1` and
`x-vdownloader-audio-extract: 1`, validates the original video extension/MIME,
streams the temporary source to a UUID-owned path, and derives every FFmpeg
argument, output extension, and content type from server-owned allowlists. The
result is an ordinary persisted audio job with cancellation, cleanup, owner
isolation, administrative restart, resumable download, and storage accounting.

The complete development suite passes with 66 tests and no failures, and the
syntax gate passes. Synthetic MP4-to-MP3 E2E coverage confirms typed output,
HTTP 206, persisted recovery after a process restart, and administrative
restart with the retained video source. The localhost service was restarted on
port 5177 with this candidate, reports healthy with one listener and no queued
work, and advertises all six extraction formats. User visual acceptance with a
representative local file remains pending; no remote deployment was performed.

## Authenticated streaming downloads — deployed 2026-10-05

The reported completed-file failure was not a conversion or job-session
expiry. Direct browser navigation to `/api/jobs/:id/download` could not attach
the native bearer token stored in `sessionStorage`, so remote mode returned
`Se requiere un token de acceso válido`. The panel's authenticated fallback
also loaded the entire output into a JavaScript Blob, which is unsafe for the
multi-gigabyte uploads now supported.

All download buttons now request a random 30-minute grant with
`x-vdownloader-download: 1`. The server stores only the grant in memory and
sets it as an HttpOnly, SameSite=Strict cookie scoped to that job's exact
download path (and Secure under HTTPS). The access token and grant never enter
the URL, logs, job persistence, or browser history. Native streaming and HTTP
Range remain active, so the complete output is not buffered in browser memory.
Processing time does not consume the ready-file retention window because
`JOB_TTL_MINUTES` starts at `completedAt`.

The Windows and Linux deployment gates passed all thirteen mandatory
categories, syntax checks, mutation score 3/3, and the production dependency
audit with zero vulnerabilities. The complete development suite has 64 passing
tests and no failures. Live verification against the retained 2.1 GB ready job
confirmed HTTP 401 without authorization, HTTP 201 grant creation, and HTTP
206 for a 128-byte range using only the job-scoped cookie. The service is
healthy, the existing job remains ready, and no credential or user file was
changed. Active release: `/opt/avdownloader/releases/20261005-download-grants`;
rollback: `20261004-auth-feedback`. See
`docs/DEPLOY-20261005-DOWNLOAD-GRANTS.md`.

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

## Documentation web navigation v1 — local candidate, 2026-10-03

InnovaLogic documentation theme, reading paths and reading controls are implemented. 55 tests PASS; documentation JavaScript syntax PASS; browser at 1440 and 390 px PASS. No media provider or paid API calls. See [navigation maintenance and evidence](docs/WEB_NAVIGATION.md). GitHub and server delivery of this revision are pending; earlier deployment status below remains historical evidence.

Last updated: 2026-11-05

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

## DEPLOY-20261002 — Private Linux pilot approved and published

- Owner requested avdownloader.innovalogic.tech with password protection.
- Prepared an unprivileged systemd service on 127.0.0.1:5177 with Node 24, system FFmpeg and isolated Linux yt-dlp. Persistent jobs are separate; storage is limited to 2 GiB, individual uploads to 0.5 GiB and conversion concurrency to one.
- Remote mode requires native access profiles; an independent admin token is generated outside Git. The outer HTTPS gate is active and requires a separate strong password before the native application token.
- `npm run verify:deploy` passed on Windows and Linux, all 13 categories, syntax checks, dependency audit with zero vulnerabilities. Reports retained on both systems.
- The actual hardened service rejected an invalid token and converted synthetic WAV to MP3, downloaded it and returned HTTP 206 range bytes. No user media was used.
- Full manual format/provider/identity-overlay acceptance remains pending. Dario Meneses explicitly approved a private test pilot through 2026-10-09. Public access expires automatically at 2026-10-10T04:00:00Z (midnight after October 9 in New York), with data retained. See docs/DEPLOY-20261002-PILOT.md for the exception and residual risks.


## DEMO-ACCESS-20261002 — Welcome form

Owner approved a Nexo-style demo welcome screen in place of HTTP Basic. The existing outer password opens an eight-hour host-bound session. Native access/admin tokens and the authorized October 9 pilot deadline remain unchanged. Authentication, authenticated API, logout and mobile browser checks passed.

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
