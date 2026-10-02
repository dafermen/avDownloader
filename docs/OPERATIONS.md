# Operations

## Health and diagnostics

`GET /api/health` reports application status, tool availability, queue limits,
retention, storage, and feature configuration. A missing required dependency
returns a degraded response. Logs are one JSON object per line and are suitable
for `journald`.

## Routine checks

- Exactly one application process owns port 5177.
- FFmpeg and yt-dlp versions are visible and supported.
- Queue depth and active jobs remain within configured concurrency.
- `JOB_DIR` usage remains below quota.
- Terminal jobs expire according to `JOB_TTL_MINUTES`.
- Provider error rate does not indicate a parser or network regression.
- No signed URL, token, cookie, internal path, or personal content appears in
  logs.
- Administrative actions appear as sanitized `administrative_audit` JSON log
  events; the panel also exposes the latest bounded in-memory events.
- Rate-limit and access-profile settings match expected private-server traffic.
- Audio exports report provider `audio`, retain an allowlisted output profile
  and ordered source list, and consume the same queue and storage budget as
  video jobs. Restart and cleanup must cover every joined source.
- When Nginx is used, Node remains on loopback and forwarded addresses in logs
  match the actual remote client rather than the proxy or a supplied spoof.

## Backup and recovery

Application source, configuration inventory, and release evidence may be
backed up. `data/jobs` is temporary operational state, not a durable media
library. If it is backed up for recovery, protect it as sensitive data, encrypt
it, restrict access, and honor retention.

On restart, unfinished remote jobs must refresh media links. Local jobs require
their UUID source files to remain inside `JOB_DIR`; joined audio requires every
ordered source or the recovered task must fail safely.

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
audio transcoding and joining, alternate video codecs, adaptive audio merging,
trimming, and Identity protection before changing it. WAV output and multiple
retained join sources can be substantially larger than compressed single-file
work and must be included in storage-capacity tests.
Per-profile `maxActiveJobs` and `MAX_ACTIVE_JOBS_PER_USER` prevent one actor
from consuming every queue slot; they do not replace operating-system quotas.
