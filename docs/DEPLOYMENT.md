# Deployment

vDownloader is designed for localhost or a private Linux server. It is not
hardened for direct public Internet exposure.

## Release gate

Deployment is blocked until:

1. `npm run verify:deploy` passes.
2. `reports/predeploy-report.json` records every automated check as passed.
3. `docs/RELEASE_CHECKLIST.md` is completed with manual acceptance, real media,
   browser, provider, audio/video, restart, storage, and rollback evidence.
4. `CURRENT_STATUS.md` and `CHANGELOG.md` describe the candidate accurately.
5. No secrets, videos, cookies, signed URLs, logs, or job data are included.

See `docs/TESTING.md` for the thirteen mandatory categories.

## Linux prerequisites

```bash
sudo apt update
sudo apt install -y nodejs npm ffmpeg pipx
pipx install yt-dlp
```

Install Node.js 20 or later from an appropriate maintained source for the
distribution. Do not copy `node_modules` or `.exe` files from Windows.

## Install

```bash
git clone https://github.com/dafermen/avDownloader.git
cd avDownloader
YOUTUBE_DL_SKIP_DOWNLOAD=true YOUTUBE_DL_SKIP_PYTHON_CHECK=1 npm ci --omit=optional
npm run verify:deploy
npm start
```

Use the reviewed templates under `deploy/` as a starting point. They run the
process through systemd as the unprivileged `vdownloader` account, make the
application tree read-only, grant write access only to
`/var/lib/vdownloader/jobs`, and terminate HTTPS through Nginx. Replace every
example path, domain, certificate, and token before installation.

Remote access is fail-closed. Configure `REMOTE_ACCESS_ENABLED=true`, strong
`ACCESS_TOKENS_JSON` profiles, and either built-in `HTTPS_KEY_PATH` plus
`HTTPS_CERT_PATH` or a trusted TLS-terminating reverse proxy with
`TRUSTED_HTTPS_PROXY=true`. Without these conditions the process refuses remote
startup. Keep localhost mode for development.

For reverse-proxy mode, keep `HOST=127.0.0.1`, set
`REMOTE_ACCESS_ENABLED=true` and `TRUSTED_HTTPS_PROXY=true`, and define bearer
profiles. The proxy must overwrite forwarded headers as shown in
`deploy/nginx/vdownloader.conf`. vDownloader trusts them only from an immediate
loopback peer and uses the validated remote address for authentication failure
tracking and rate limiting.

```bash
sudo cp deploy/systemd/vdownloader.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vdownloader
sudo nginx -t
sudo systemctl reload nginx
```

Full directory, ownership, environment-file, and Nginx instructions are in
`deploy/README.md`.

## Configuration

Use `.env.example` as an inventory, not as a secret file. Production secrets
belong in the service manager or secret store. At minimum review storage,
upload, concurrency, retry, retention, tool paths, and `ADMIN_TOKEN`.

## Verification and rollback

After starting:

1. Verify `/api/health`.
2. Load `/` and `/docs.html`.
3. Prepare a short lawful synthetic/local clip and verify every enabled local
   container/codec profile with `ffprobe` and representative players.
4. Trim and join synthetic WAV sources, export every supported audio
   format/codec pair, and verify content type, duration, join order, decoding,
   administrative restart, all-source cleanup, and HTTP 206 resume.
5. Confirm queue, cancellation, restart, cleanup, and storage metrics.

Keep the previous tested release available. A rollback must stop the candidate,
restore the compatible application version, retain only schema-compatible safe
job state, restart once, and recheck health. Never restore expired signed URLs.
