# Security

## Supported security scope

vDownloader is intended for localhost or a controlled private server. Local
mode binds to `127.0.0.1`. Optional remote mode provides configuration-based
bearer profiles, `user`/`admin` authorization, owner-isolated jobs, per-user
active-job limits, request rate limits, failed-authentication blocking,
built-in TLS or trusted HTTPS-proxy enforcement, security headers, and
administrative audit events.

This is not a complete public identity platform: there is no account database,
self-service registration, password reset, MFA, OIDC/SSO, or tenant billing.
Direct public Internet exposure still requires a hardened identity/reverse
proxy layer, operating-system sandboxing, monitoring, backups, and review.

## Threat model

Primary untrusted inputs are provider URLs, provider HTML and manifests, signed
media links, HTTP request bodies and headers, uploaded media, filenames,
Identity protection coordinates, persisted job state, and child-process output.

## Required controls

- Accept only HTTPS source pages matched and validated by a registered provider.
- Accept media only from explicit provider CDN allowlists.
- Never follow an input to localhost, private IP space, metadata services, file
  URLs, or arbitrary redirects.
- Keep signed URLs in memory behind opaque UUIDs; never persist or log them.
- Keep uploaded filenames informational and generate server-owned UUID paths.
- Require distinct control headers for video upload, single-audio upload,
  multi-audio join, tracking registration, and restart.
- Keep container/codec pairs on server allowlists. Bound join metadata to 64
  KiB and 20 sources, verify exact byte accounting, stream media to UUID-owned
  files, and remove every partial or job-owned source on failure/cleanup.
- Require `ADMIN_TOKEN` outside loopback.
- Pass structured FFmpeg/yt-dlp arguments without an intervening shell.
- Limit upload size, storage, clip duration, samples, coordinates, retries, and
  concurrency.
- Serve HLS.js, MediaPipe, WASM, and the face model locally.
- Keep remote mode disabled unless strong access profiles and HTTPS are ready.
- Keep bearer and administrator tokens in process secrets and browser
  `sessionStorage`, never URLs, logs, persisted jobs, or local history.
- Spawn FFmpeg without a shell, with a controlled working directory and reduced
  environment. Use the supplied unprivileged systemd unit for Linux and add a
  container or stronger OS sandbox for a public hostile-media threat model.

## Remote configuration

`REMOTE_ACCESS_ENABLED=true` requires at least one profile in
`ACCESS_TOKENS_JSON` and either both HTTPS certificate paths or
`TRUSTED_HTTPS_PROXY=true`. Each profile has a unique ID, a token of at least 24
characters, `user` or `admin` role, and optional `maxActiveJobs`. Generate much
longer random tokens in production and inject JSON through the service manager
or secret store rather than a committed file.

When `TRUSTED_HTTPS_PROXY=true`, keep Node bound to `127.0.0.1` and prevent
direct network access to port 5177. The application accepts forwarded client
and protocol values only from a loopback peer. The supplied Nginx template
overwrites `X-Forwarded-For` and `X-Forwarded-Proto`; do not replace this with a
configuration that preserves client-supplied forwarding headers. A request
forwarded from a remote address still requires a valid bearer profile and never
inherits the loopback administrator. Remote-mode requests whose client is not
loopback are rejected with HTTP 426 unless native TLS or the trusted local
proxy verifies HTTPS.

Reviewed starting templates and installation guidance live in `deploy/`.

Example shape (replace every token with a cryptographically random secret):

```json
[
  { "id": "operator", "token": "replace-with-a-long-random-admin-secret", "role": "admin", "maxActiveJobs": 8 },
  { "id": "student-1", "token": "replace-with-a-different-random-secret", "role": "user", "maxActiveJobs": 2 }
]
```

## Secrets and sensitive data

Never commit `.env`, tokens, credentials, cookies, videos, `data/jobs`, reports,
or logs. Identity tracking boxes contain no images or embeddings, but they can
still reveal movement and must follow job retention.

## Dependency and release security

Before deployment, run the security suite and production dependency audit as
part of `npm run verify:deploy`. Review new dependency licenses and provenance.
Linux uses system FFmpeg and yt-dlp so operating-system update policy applies.

## Reporting a vulnerability

Do not publish exploit details, private URLs, credentials, signed links, or
personal content in a public issue. Contact the repository owner privately with
a synthetic reproduction and sanitized impact description.

## Out of scope

The project must not add mechanisms to bypass authentication, private content,
paywalls, geofencing access controls, or DRM.
