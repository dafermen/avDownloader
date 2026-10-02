# HTTP API

The API is local/private. Loopback runs as the `local` administrator. Optional
remote mode authenticates bearer profiles and authorizes `user` or `admin`
operations while isolating jobs by owner.
JSON errors use `{ "error": "message" }`. Internal paths, signed media URLs,
tokens, and child-process details must never appear in responses.

## Endpoints

| Method and path | Input | Successful output |
|---|---|---|
| `POST /api/analyze` | JSON `{ "url": "https://..." }` | Video metadata and qualities with opaque `selectionId` values |
| `POST /api/jobs` | JSON with `selectionId`, optional `start`, `end` | Public job, HTTP 202 |
| `POST /api/upload-jobs` | Binary body, validated `x-upload-*`, and allowlisted video format/codec headers | Public local-video job, HTTP 202 |
| `POST /api/audio-jobs` | Binary audio body, validated `x-upload-*`, format, codec, and bitrate headers | Public single-source audio job, HTTP 202 |
| `POST /api/audio-join-jobs` | Versioned streaming envelope containing 2–20 ordered audio sources and bounded metadata | Public joined-audio job, HTTP 202 |
| `POST /api/identity-tracks` | Normalized sampled face boxes | Single-use opaque tracking ID |
| `GET /api/jobs` | None | `{ jobs, stats }` |
| `GET /api/jobs/:id` | UUID path | Public job |
| `DELETE /api/jobs/:id` | UUID path | Cancelled job or deletion result |
| `POST /api/jobs/:id/restart` | Administration headers | Restarted job, HTTP 202 |
| `GET /api/jobs/:id/download` | Optional HTTP Range | Completed video or audio bytes with the profile's content type |
| `GET /api/media/:id` | Opaque media UUID | Proxied media or rewritten HLS |
| `GET /api/health` | None | Dependency, queue, storage, and feature status |
| `POST /api/admin/jobs/restart` | Admin headers and `{ "ids": ["uuid"] }` | Bulk restart result, HTTP 202 |
| `POST /api/admin/jobs/cleanup` | Admin headers and `{ "scope": "expired" }` | Removed count and reclaimed known bytes |
| `GET /api/admin/audit` | Admin headers | Bounded current-process administrative events |

## Public job

```json
{
  "id": "uuid",
  "status": "queued",
  "progress": 0,
  "filename": "video-1080p.mp4",
  "provider": "youtube",
  "mediaKind": "video",
  "outputFormat": "mp4",
  "videoCodec": null,
  "audioCodec": null,
  "quality": "1080p",
  "size": null,
  "error": null,
  "attempts": 0,
  "maxRetries": 2,
  "etaSeconds": null,
  "createdAt": 0,
  "completedAt": null,
  "restartCount": 0,
  "lastRestartedAt": null,
  "identityProtected": false,
  "downloadUrl": null,
  "events": [{ "at": 0, "type": "created" }]
}
```

Administrative job lists also include `ownerId`. Regular users never receive
another owner's job or owner identifier.

Valid states are `queued`, `processing`, `retrying`, `restarting`, `ready`,
`error`, and `cancelled`. Contract changes require tests under `test/contract/`
and a documentation update.

## Required control headers

- Upload: `x-vdownloader-upload: 1`
- Audio upload: `x-vdownloader-audio: 1`
- Audio join: `x-vdownloader-audio-join: 1`
- Identity tracking: `x-vdownloader-identity: 1`
- Restart: `x-vdownloader-admin: 1`
- Remote restart when configured: `x-admin-token: <ADMIN_TOKEN>`

Single-file upload contracts require `Content-Length`, `Content-Type`,
`x-upload-name`, `x-upload-duration`, `x-upload-start`, and `x-upload-end`.
Video uploads additionally use `x-video-format`, `x-video-codec`, and
`x-video-audio-codec`. Accepted combinations are MP4/MOV with H.264 or H.265
and AAC; WebM with VP9 and Opus; and MKV with H.264/H.265 plus AAC/Opus or VP9
plus Opus.

Audio uploads additionally require `x-audio-format` and `x-audio-codec`.
Accepted pairs are MP3/MP3, M4A/AAC, OGG/Vorbis or Opus, Opus/Opus,
FLAC/FLAC, and WAV/PCM signed 16-bit little endian. Lossy codecs use
`x-audio-bitrate` values of 96, 128, 192, 256, or 320 kbps; unsupported values
fall back to 192 kbps. FLAC and WAV ignore bitrate.

`POST /api/audio-join-jobs` uses content type
`application/vnd.vdownloader.audio-join`. A four-byte big-endian metadata
length is followed by UTF-8 JSON and then each declared source's raw bytes in
order. Metadata version 1 declares `outputFormat`, `audioCodec`, `bitrate`, and
2–20 sources containing encoded `name`, `type`, `size`, `duration`, `start`,
and `end`. The total source size remains under `MAX_UPLOAD_GB`, total selected
duration remains under 12 hours, and metadata is limited to 64 KiB. Files are
streamed directly to UUID-owned paths; the complete request is never buffered
in server memory. Client-provided file paths and FFmpeg arguments are never
accepted.

Accepted audio inputs are MP3, M4A, AAC, WAV, FLAC, OGG, and Opus. The job
response uses `mediaKind: "audio"`, identifies the selected `outputFormat`, and
reports provider `audio`, `audioCodec`, and the output profile. Joined jobs keep
the source order and each source's validated clip across persistence and
administrative restart. The download response sets the matching content type
and supports HTTP 206 like video downloads.

Remote API calls use `Authorization: Bearer <access-token>`. Tokens are defined
in `ACCESS_TOKENS_JSON`, never accepted in query strings, and never returned by
the API. A `user` sees only owned jobs and cannot call administrative routes.
An `admin` can inspect and manage all jobs. Opaque media previews remain
capability URLs so native video/HLS requests do not need tokens.

## Status conventions

- `200`: successful read, cancellation, or deletion.
- `202`: accepted asynchronous creation or restart.
- `400`: invalid input.
- `403`: missing or invalid control authorization.
- `404`: unknown or expired resource.
- `405`: unsupported method.
- `413`: upload or storage limit exceeded.
- `426`: remote mode received a request without verified HTTPS.
- `502`: provider or media upstream failure.
- `503`: degraded required dependency state.
