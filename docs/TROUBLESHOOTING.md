# Troubleshooting

## The page does not open on port 5177

Confirm that one process is listening, start with `npm start`, and request
`http://127.0.0.1:5177/api/health`. Do not start a second watch process on the
same port.

## A provider reports a network failure

Test DNS and HTTPS from the same operating system account that runs the Node.js
service. A browser or TCP check alone does not prove that Node.js, yt-dlp, a
proxy, or a service account has equivalent access. Check sanitized logs and
tool versions. Do not disable TLS validation or broaden CDN allowlists.

## A provider returns no qualities

Update yt-dlp where applicable, reproduce with a lawful public video, and
compare synthetic parser tests. Provider layout changes require a provider
module and fixture update, not generic scraping rules in the router.

## A prepared file is only a few kilobytes

Do not return signed CDN or manifest text as if it were an MP4. Check job errors,
source type, HLS resolution, link refresh, FFmpeg output, and final file probing.

## Video works but audio does not

Verify that adaptive video received its separate audio source and that the final
file contains AAC-LC audio. Re-run regression, integration, and end-to-end media
checks before deployment.

## A local audio export fails

Confirm the input is MP3, M4A, AAC, WAV, FLAC, OGG, or Opus and that the
browser can read its duration. For joins, verify every source has a valid range,
the combined selection is at most 12 hours, and the request contains no more
than 20 sources. MP3, Vorbis, and Opus require `libmp3lame`, `libvorbis`, and
`libopus`; H.265 and VP9 require `libx265` and `libvpx-vp9`. Inspect sanitized
job errors and `/api/health`, then run `npm run test:e2e` with its synthetic
single-audio, audio-join, and video-transcode journeys.

## Remote requests through Nginx are unauthorized

This is expected without a bearer token. Confirm Nginx connects to
`127.0.0.1:5177`, overwrites `X-Forwarded-For` and `X-Forwarded-Proto`, and the
service has `REMOTE_ACCESS_ENABLED=true`, `TRUSTED_HTTPS_PROXY=true`, and valid
`ACCESS_TOKENS_JSON`. Never bypass the check by treating all proxied requests as
localhost.

## Identity protection misses a moving face

Increase margin, review the entire sampled range, and use appropriate source
quality. Automatic detection is not a guarantee. Small, turned, occluded, or
poorly lit faces can be missed, and non-visual identity signals remain.

## The deployment gate fails

Open `reports/predeploy-report.json`, find the first failed command, run that
category directly, and fix the cause. Do not mark it skipped. An unreachable
npm registry blocks the dependency audit and therefore blocks deployment until
the audit can run in an approved connected environment.
