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
| `POST /api/video-audio-jobs` | Binary video body, validated range, and allowlisted audio format/codec/bitrate headers | Public extracted-audio job, HTTP 202 |
| `POST /api/audio-jobs` | Binary audio body, validated `x-upload-*`, format, codec, and bitrate headers | Public single-source audio job, HTTP 202 |
| `POST /api/audio-join-jobs` | Versioned streaming envelope containing 2–20 ordered audio sources and bounded metadata | Public joined-audio job, HTTP 202 |
| `POST /api/subtitle-jobs` | JSON with opaque caption `selectionId` and `outputFormat` (`srt` or `vtt`) | Public remote-subtitle job, HTTP 202 |
| `POST /api/subtitle-upload-jobs` | Binary local video, validated range, subtitle format, and bounded track ordinal | Public local-subtitle job, HTTP 202 |
| `POST /api/transcription-jobs` | Binary local video, validated range, subtitle format, language, and model profile | Public generated-subtitle job, HTTP 202 |
| `POST /api/identity-tracks` | Normalized sampled face boxes | Single-use opaque tracking ID |
| `GET /api/jobs` | None | `{ jobs, stats }` |
| `GET /api/jobs/:id` | UUID path | Public job |
| `DELETE /api/jobs/:id` | UUID path | Cancelled job or deletion result |
| `POST /api/jobs/:id/restart` | Administration headers | Restarted job, HTTP 202 |
| `POST /api/jobs/:id/download-access` | `x-vdownloader-download: 1` plus normal bearer authorization | HTTP 201, unchanged download path, expiry, and a job-scoped HttpOnly cookie |
| `GET /api/jobs/:id/download` | Optional HTTP Range | Completed video, audio, or subtitle bytes with the profile's content type |
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
  "stage": "queued",
  "filename": "video-1080p.mp4",
  "provider": "youtube",
  "mediaKind": "video",
  "outputFormat": "mp4",
  "videoCodec": null,
  "audioCodec": null,
  "subtitleGenerated": false,
  "transcriptionModelProfile": null,
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

`stage` is a presentation-safe phase within the job lifecycle: `queued`,
`downloading`, `processing`, or `finalizing`. It never contains provider URLs,
process output, or internal paths.

## Required control headers

- Upload: `x-vdownloader-upload: 1`
- Video audio extraction: `x-vdownloader-upload: 1` and
  `x-vdownloader-audio-extract: 1`
- Audio upload: `x-vdownloader-audio: 1`
- Audio join: `x-vdownloader-audio-join: 1`
- Remote subtitle export: `x-vdownloader-subtitle: 1`
- Local subtitle export: `x-vdownloader-upload: 1` and
  `x-vdownloader-subtitle: 1`
- Local speech-to-text: the two local subtitle headers plus
  `x-vdownloader-transcription: 1`
- Identity tracking: `x-vdownloader-identity: 1`
- Download grant: `x-vdownloader-download: 1`
- Restart: `x-vdownloader-admin: 1`
- Remote restart when configured: `x-admin-token: <ADMIN_TOKEN>`

Single-file upload contracts require `Content-Length`, `Content-Type`,
`x-upload-name`, `x-upload-duration`, `x-upload-start`, and `x-upload-end`.
Video uploads additionally use `x-video-format`, `x-video-codec`, and
`x-video-audio-codec`. Accepted combinations are MP4/MOV with H.264 or H.265
and AAC; WebM with VP9 and Opus; and MKV with H.264/H.265 plus AAC/Opus or VP9
plus Opus.

Video-to-audio requests accept the same MP4, M4V, MOV, and WebM source
extension/MIME pairs and range headers as video uploads. They use
`x-audio-format`, `x-audio-codec`, and, for lossy output,
`x-audio-bitrate`. The server maps only the first compatible audio stream,
discards video, and derives the output filename, extension, MIME type, and
FFmpeg encoder from the profile allowlist. A video without a compatible audio
track finishes with a safe user-facing error.

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

Accepted audio-tool inputs are MP3, M4A, AAC, WAV, FLAC, OGG, and Opus. Audio
extraction additionally accepts the local video formats listed above. The job
response uses `mediaKind: "audio"`, identifies the selected `outputFormat`, and
reports provider `audio`, `audioCodec`, and the output profile. Joined jobs keep
the source order and each source's validated clip across persistence and
administrative restart. The download response sets the matching content type
and supports HTTP 206 like video downloads.

YouTube analysis may also return `subtitleTracks`. Each item contains an opaque
`selectionId`, language, display name, and whether the provider marks the track
automatic; it never contains a timed-text URL. `POST /api/subtitle-jobs` accepts
that UUID and `outputFormat: "srt" | "vtt"`. Local subtitle extraction accepts
the normal video upload metadata plus `x-subtitle-format` and a zero-based
`x-subtitle-track` ordinal from 0 through 31. `POST /api/transcription-jobs`
uses the same video metadata plus `x-vdownloader-transcription: 1`,
`x-transcription-language` (`auto`, `es`, `en`, `pt`, `fr`, `de`, or `it`),
and `x-transcription-model` (`fast` or `balanced`). All three endpoints create
`mediaKind: "subtitle"` jobs and derive the filename, extension, MIME type, and
tool arguments server-side. Generated jobs additionally report
`subtitleGenerated: true` and the public model profile; the internal model ID,
cache path, temporary PCM path, and process arguments never appear in JSON.
For subtitle jobs, `filename` preserves the safe source-title base and replaces
the source extension with `.srt` or `.vtt`. Download responses include an ASCII
fallback and an RFC 5987 UTF-8 filename so spaces and supported accents survive.

Remote API calls use `Authorization: Bearer <access-token>`. Tokens are defined
in `ACCESS_TOKENS_JSON`, never accepted in query strings, and never returned by
the API. A `user` sees only owned jobs and cannot call administrative routes.
An `admin` can inspect and manage all jobs. Opaque media previews remain
capability URLs so native video/HLS requests do not need tokens.

Native browser navigation cannot attach an `Authorization` header. The
interface therefore authenticates `POST /api/jobs/:id/download-access` and
receives a random 30-minute grant in an HttpOnly, SameSite=Strict cookie whose
path is restricted to that exact job download. The returned `downloadUrl` has
no query string. The cookie contains neither the access token nor job data and
is never persisted by the server. The following `GET` or `HEAD` streams the
file and preserves HTTP Range without buffering the complete output in browser
memory. Selecting Download again creates a fresh grant.

## Status conventions

- `200`: successful read, cancellation, or deletion.
- `201`: temporary download capability created.
- `202`: accepted asynchronous creation or restart.
- `400`: invalid input.
- `403`: missing or invalid control authorization.
- `404`: unknown or expired resource.
- `405`: unsupported method.
- `413`: upload or storage limit exceeded.
- `426`: remote mode received a request without verified HTTPS.
- `502`: provider or media upstream failure.
- `503`: degraded required dependency state.

## Configurable upload ceiling

Health reports `uploads.limitEnabled`, `maxBytes` (null when disabled),
`effectiveMaxBytes` (always bounded by storage), and `requestTimeoutMs`.
Audio tools share these size limits. Streaming still requires exact Content-Length.

## Upload preview configuration

The editor reads current size limits from `GET /api/upload-config` before validating a selection. This endpoint exposes only three size settings, requires no native bearer token, and retains HTTPS, rate limiting and the external demo gate. Diagnostics and exports still require the native access token. A failed settings request shows a retry message instead of inventing a 2 GiB limit.

## Explicit access validation

Paste the complete native token into **Task administration > Access token**, then select **Validate access**. Typing alone never submits credentials. During editing, API polling and exports pause. HTTP 429 pauses API polling for Retry-After (up to the existing 15-minute authentication cooldown); a blocked check is not reported as missing FFmpeg. The demo password and native token remain separate.

## Visible access-validation results

Access validation shows a full-width persistent result: checking, success, rejection, empty input, demo-session expiry, cooldown or connection failure. Only successfully validated tokens are saved for the tab. In the private VPS env, `ADMIN_TOKEN` is a separate legacy administrative credential; remote access uses the `token` value within `ACCESS_TOKENS_JSON`. A rejected token is not re-sent during export.
