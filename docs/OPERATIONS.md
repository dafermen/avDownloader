# Operations

## Health and diagnostics

`GET /api/health` reports application status, tool availability, queue limits,
retention, storage, and feature configuration. A missing required dependency
returns a degraded response. Logs are one JSON object per line and are suitable
for `journald`.

The Download Center's **Export diagnostics** action calls
`GET /api/diagnostics` with an explicit control header and downloads a bounded
JSON report. It is intended for support attachments: verify it contains no
secret, URL, path, media content, or subtitle text before sharing. Recent
events live only in a bounded in-memory ring and reset with the process.

## Routine checks

- Exactly one application process owns port 5177.
- FFmpeg and yt-dlp versions are visible and supported.
- Queue depth and active jobs remain within configured concurrency.
- `JOB_DIR` usage remains below quota.
- Terminal jobs expire according to `JOB_TTL_MINUTES`.
- Job retention starts at `completedAt`, so processing time does not consume the
  ready-file window. Remote download grants are generated only when Download is
  selected, expire after 30 minutes, and can be refreshed by selecting Download
  again while the job remains retained.
- Provider error rate does not indicate a parser or network regression.
- No signed URL, token, cookie, internal path, or personal content appears in
  logs.
- Administrative actions appear as sanitized `administrative_audit` JSON log
  events; the panel also exposes the latest bounded in-memory events.
- Rate-limit and access-profile settings match expected private-server traffic.
- Audio exports report provider `audio`, retain an allowlisted output profile,
  and consume the same queue and storage budget as video jobs. Joined jobs keep
  their ordered audio source list; video-to-audio jobs keep their UUID-owned
  video source. Restart and cleanup must cover every retained source.
- Generated subtitle jobs report provider `transcription`. Monitor the first
  model download, cache size, CPU/RAM use, and temporary PCM space. Audio is
  local; only public model artifacts are fetched from Hugging Face.
- Subtitle-composition jobs report provider `subtitle-compose` and retain one
  UUID-owned video plus a private normalized SRT. Both count toward quota and
  must survive restart or be removed together. Local translation is serialized
  to one fixed English-to-Spanish worker; monitor its first model download,
  model-cache size, CPU, and RAM.
- Failed YouTube jobs can retain resumable staging bytes. The panel reports
  their safe size/percentage. Verify successful continuation or use the
  terminal **Discard partial** action; expiration and job deletion also remove
  the complete UUID staging prefix.
- When Nginx is used, Node remains on loopback and forwarded addresses in logs
  match the actual remote client rather than the proxy or a supplied spoof.

## Backup and recovery

Application source, configuration inventory, and release evidence may be
backed up. `data/jobs` is temporary operational state, not a durable media
library. If it is backed up for recovery, protect it as sensitive data, encrypt
it, restrict access, and honor retention.

On restart, unfinished remote jobs must refresh media links. Local jobs require
their UUID source files to remain inside `JOB_DIR`; video-to-audio extraction
requires its original video source, and joined audio requires every ordered
source. A recovered task with a missing source must fail safely.

## Incident response

1. Stop new external access without deleting evidence.
2. Record time, version, sanitized symptoms, and affected job IDs.
3. Rotate `ADMIN_TOKEN` and any proxy credentials if exposure is suspected.
4. Remove leaked logs or artifacts from distribution; do not paste secrets into
   issues.
5. Reproduce with synthetic content, add a regression test, and run the full
   deployment gate.
6. Document recovery and prevention in `CURRENT_STATUS.md` and the changelog.

## Capacity

Increasing `MAX_CONCURRENT_JOBS` increases CPU, memory, disk I/O, temporary
storage, and provider traffic. Benchmark representative copying, video and
audio transcoding, video-to-audio extraction, audio joining, alternate video
codecs, adaptive audio merging, trimming, and Identity protection before
changing it. Include both Whisper Tiny and Base with the longest permitted
clip; inference is CPU- and memory-intensive and occupies a queue slot. WAV
output, retained extraction sources, and multiple retained
join sources can be substantially larger than compressed single-file work and
must be included in storage-capacity tests.
Per-profile `maxActiveJobs` and `MAX_ACTIVE_JOBS_PER_USER` prevent one actor
from consuming every queue slot; they do not replace operating-system quotas.
