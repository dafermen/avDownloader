# Architecture

## Context

vDownloader is a local or private-server web application. A browser analyzes a
supported public video URL, selects a local video for video conversion,
audio-only or subtitle extraction/generation, or selects one or more local audio files. The Node.js
service validates input, creates an opaque selection, queues FFmpeg work,
persists safe job metadata, and serves the completed video, audio, or subtitle output.

```text
Browser
  |  HTTP JSON, opaque IDs, local upload
  v
Node.js HTTP server
  |-- provider registry -> public provider pages and allowlisted CDNs
  |-- queue and retry scheduler
  |-- persistence -> JOB_DIR/jobs.json
  |-- static interface and local third-party assets
  |-- FFmpeg / yt-dlp process -> allowlisted media or existing subtitles
  `-- transcription worker -> cached Transformers.js Whisper -> SRT/WebVTT
```

## Components

- `server.js`: explicit HTTP router, upload handling, media proxy, queue,
  persistence, FFmpeg execution, cleanup, and administration.
- `transcription-worker.js`: isolated local Whisper inference, PCM validation,
  timestamp normalization, and SRT/WebVTT rendering.
- `providers/`: provider matching, page validation, page analysis, media-host
  allowlists, yt-dlp integration, and HLS parsing.
- `public/`: browser interface, bilingual dictionaries, shared video/audio
  trimming, ordered audio joining, subtitle selection, format/codec selection, panel, Identity protection, and English
  web documentation.
- `deploy/`: least-privilege systemd and HTTPS Nginx starting templates.
- `scripts/`: maintenance, syntax checks, mutation testing, and the deployment
  quality gate.
- `test/`: tests grouped by quality concern with synthetic fixtures.
- `data/jobs/`: runtime-only persisted state, temporary sources, and prepared
  outputs.

Remote security remains inside the explicit router: bearer profiles establish
an actor and role, jobs persist an owner ID, user lists and downloads are
owner-filtered, and admin routes are separately authorized and audited. Local
mode binds to loopback and uses the built-in `local` administrator.

## Important boundaries

1. Provider URLs cross an untrusted Internet boundary and must pass explicit
   page and media allowlists.
2. Signed CDN URLs stay in server memory and are represented externally by
   opaque UUIDs.
3. Uploaded video and audio files are untrusted binary input and must satisfy
   distinct control headers, extension/MIME pairs, size, duration, range,
   output-profile, and storage quota checks. Video-to-audio extraction requires
   both upload and extraction headers, keeps video-source validation, and uses
   only the audio profile allowlist. Multi-audio requests use a bounded
   length-prefixed envelope and stream each declared file to its own UUID path.
   Subtitle jobs accept only an opaque YouTube track selection, a bounded
   embedded-track ordinal, or allowlisted local transcription language/model
   profiles and the SRT/WebVTT output allowlist.
4. FFmpeg, yt-dlp, and the transcription worker are child processes. Arguments
   must be structured, paths controlled by the server, and failures treated as
   data rather than shell commands.
5. Identity protection coordinates are not biometric identifiers, but they are
   still sensitive job metadata and must not leave the private service.

## State and recovery

Jobs are queued in memory and persisted atomically to `jobs.json`. Signed URLs
are never persisted. After process recovery, unfinished remote jobs are marked
to refresh their media links. Local job sources use relative UUID filenames
inside `JOB_DIR`. Persisted local jobs retain only allowlisted container and
codec IDs. Extracted-audio jobs retain a validated video source with an audio
output profile; joined audio jobs additionally retain ordered relative source
names and clip ranges. Subtitle jobs retain only a validated public source and
language, a UUID-owned local source and track ordinal, or a UUID-owned local
source plus allowlisted transcription language/model profile. Paths, final
extensions, content types, and FFmpeg/yt-dlp arguments are reconstructed by the
server rather than trusted from disk.

YouTube yt-dlp downloads use UUID-owned staging names and continuation mode.
A recoverable network failure retains only those partial bytes for the next
automatic retry or administrative restart. Their size is persisted and counts
toward the normal storage quota. Success, explicit cancellation, expiration,
and job deletion remove the complete staging prefix. The browser sees only the
public job stage, never a staging path, provider format ID, or signed URL.

Generated subtitles follow a two-stage job. FFmpeg extracts the selected range
to mono 16 kHz PCM inside `JOB_DIR`; a disposable Node worker loads an
allowlisted Whisper model through Transformers.js, writes SRT/WebVTT, and the
server deletes the PCM in all terminal paths. Model artifacts are the only
network-fetched transcription data and live in `TRANSCRIPTION_CACHE_DIR`.

When Nginx terminates TLS, the Node service remains on loopback. Forwarding
headers are trusted only from a loopback peer, the last forwarded client
address is validated as an IP address, and remote users still authenticate with
bearer profiles. This prevents a proxied remote request from becoming the
built-in local administrator.

## Quality attributes

- Security: allowlists, opaque references, loopback/token administration.
- Privacy: local face detection, no frame upload to third-party recognition.
- Resilience: retries, link refresh, restart, cancellation, and persistence.
- Portability: Node.js 20+, system FFmpeg and yt-dlp on Linux.
- Remote defense: opt-in network binding, HTTPS requirement, rate limits,
  failed-authentication blocking, owner quotas, CSP, and audit events.
- Maintainability: provider registry, English docs, bilingual UI dictionary.

See `docs/adr/` for decisions that should not be rediscovered.
