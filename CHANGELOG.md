# Changelog

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
