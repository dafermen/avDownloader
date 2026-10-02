# Architecture

## Context

vDownloader is a local or private-server web application. A browser analyzes a
supported public video URL, selects a local video, or selects one or more local audio files. The Node.js service
validates input, creates an opaque selection, queues FFmpeg work, persists safe
job metadata, and serves the completed video or audio output.

```text
Browser
  |  HTTP JSON, opaque IDs, local upload
  v
Node.js HTTP server
  |-- provider registry -> public provider pages and allowlisted CDNs
  |-- queue and retry scheduler
  |-- persistence -> JOB_DIR/jobs.json
  |-- static interface and local third-party assets
  `-- FFmpeg process -> allowlisted video or audio output
```

## Components

- `server.js`: explicit HTTP router, upload handling, media proxy, queue,
  persistence, FFmpeg execution, cleanup, and administration.
- `providers/`: provider matching, page validation, page analysis, media-host
  allowlists, yt-dlp integration, and HLS parsing.
- `public/`: browser interface, bilingual dictionaries, shared video/audio
  trimming, ordered audio joining, format/codec selection, panel, Identity protection, and English
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
   output-profile, and storage quota checks. Multi-audio requests use a bounded
   length-prefixed envelope and stream each declared file to its own UUID path.
4. FFmpeg and yt-dlp are child processes. Arguments must be structured, paths
   controlled by the server, and failures treated as data rather than shell
   commands.
5. Identity protection coordinates are not biometric identifiers, but they are
   still sensitive job metadata and must not leave the private service.

## State and recovery

Jobs are queued in memory and persisted atomically to `jobs.json`. Signed URLs
are never persisted. After process recovery, unfinished remote jobs are marked
to refresh their media links. Local job sources use relative UUID filenames
inside `JOB_DIR`. Persisted local jobs retain only allowlisted container and
codec IDs. Joined audio jobs additionally retain ordered relative source names
and clip ranges. Paths, final extensions, content types, and FFmpeg encoders are
reconstructed by the server rather than trusted from disk.

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
