# Release and deployment checklist

Copy this file into the release evidence system and complete every field.
Never store private videos, signed URLs, cookies, tokens, or personal data in
the evidence.

## Candidate

- Version or commit:
- Date and time:
- Tester:
- Target environment:
- Node.js version:
- FFmpeg version:
- yt-dlp version:
- Rollback version:

## Automated quality gate

- [ ] `npm run verify:deploy` passed.
- [ ] `reports/predeploy-report.json` shows all checks passed.
- [ ] CI passed on Linux from a clean installation.
- [ ] Production dependency audit has no blocking vulnerability.

## Manual acceptance and end-to-end

- [ ] Spanish and English primary journeys were reviewed.
- [ ] Main page, documentation, analysis, quality selection, trimming, panel,
      cancellation, restart, and download work.
- [ ] A short lawful local video was trimmed and exported through every enabled
      MP4/MOV/WebM/MKV container and H.264/H.265/VP9 plus AAC/Opus profile.
- [ ] A short lawful local video with audio was trimmed and its selected range
      was extracted through every enabled MP3/M4A/OGG/Opus/FLAC/WAV profile.
      Confirm no video stream remains, duration and quality are correct, the
      filename/content type match, administrative restart works, a process
      restart recovers the job, cleanup removes its source, and HTTP 206 resumes.
- [ ] Two or more synthetic or lawful local audio files were previewed,
      individually trimmed, reordered, joined, and exported through every
      MP3/M4A/OGG/Opus/FLAC/WAV codec profile with correct duration, join
      boundaries, decoding, filename, content type, restart, cleanup, and HTTP
      206 resume.
- [ ] Existing YouTube and embedded subtitle tracks were exported to both SRT
      and WebVTT, including missing-track, restart, cleanup, and zero-byte
      failure behavior.
- [ ] A lawful spoken local video generated reviewed SRT and WebVTT with every
      enabled Whisper profile, automatic and explicit language, first-use
      model download, cache reuse, cancellation/restart, and temporary PCM
      cleanup. A silent/no-audio source failed safely or produced no misleading
      ready file.
- [ ] A lawful adaptive video test contains synchronized video and audio.
- [ ] A lawful HLS test selects and exports the requested quality.
- [ ] Range download resumes correctly.
- [ ] A remote authenticated download starts from every UI location without a
      token in the URL, streams without a complete browser Blob, and resumes
      with HTTP 206 through its job-scoped HttpOnly cookie.
- [ ] Identity protection overlay and final output were reviewed across the
      entire selected range; limitations were communicated.
- [ ] Manual face-region add, move, resize, delete, anonymous person selection,
      and mandatory full-path confirmation were exercised.

## Providers and regression

- [ ] Supported providers were checked with public, lawful test URLs.
- [ ] Failed or unavailable providers are documented without weakening
      security allowlists.
- [ ] Previously fixed signed-link, small-file, audio, restart, and persistence
      regressions were checked.

## Operations, security, and compatibility

- [ ] One process owns the configured port.
- [ ] Health endpoint is healthy in the target environment.
- [ ] Storage quota, retention, cleanup, concurrency, retry, and cancellation
      behavior were checked.
- [ ] Logs contain no secret, signed URL, internal path, or personal content.
- [ ] Linux uses system FFmpeg and yt-dlp; no Windows executable was deployed.
- [ ] Secrets are supplied by the service manager and file permissions are
      restrictive.
- [ ] The systemd unit runs as `vdownloader`, limits writable paths and Linux
      capabilities, and successfully processes representative video and audio.
- [ ] The reverse proxy overwrites forwarding headers, Node remains bound to
      loopback, and a proxied remote request cannot obtain local administrator
      privileges.
- [ ] Remote user/admin authorization, owner isolation, active-job limits,
      rate limiting, failed-token blocking, and administrative audit were
      validated when remote mode is enabled.
- [ ] HTTPS, authentication, authorization, rate limits, and isolation are in
      place if access extends beyond a trusted private boundary.
- [ ] Backup and rollback were tested or verified.

## Decision

- [ ] Approved for deployment.
- [ ] Blocked.

Approver:

Known residual risks and expiration date for any approved exception:


## Executed private-pilot candidate: 2026-10-04

See [completed upload-release evidence](DEPLOY-20261004-UPLOAD.md) for actual
results, owner-authorized scope, inherited time-limited exceptions and rollback.
The blank checklist above remains the template; unchecked manual items are not claimed.

## Executed upload UI correction: 2026-10-04

See [upload UI release evidence](DEPLOY-20261004-UPLOAD-UI.md). Existing private-pilot manual exceptions and expiry remain unchanged.

## Token-input correction: 2026-10-04

See [release evidence](DEPLOY-20261004-AUTH-UI.md). Existing time-limited manual exceptions remain unchanged.

## Access-validation feedback: 2026-10-04

See [release evidence](DEPLOY-20261004-AUTH-FEEDBACK.md). Existing time-limited manual exceptions are unchanged.

## Authenticated streaming download correction: 2026-10-05

See [release evidence](DEPLOY-20261005-DOWNLOAD-GRANTS.md). The existing
time-limited private-pilot exception is unchanged; no unchecked manual item is
claimed by the automated download-path validation.
