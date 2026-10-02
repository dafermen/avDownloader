# Dependencies, licenses, and external services

This document describes third-party components used directly by
**vDownloader 1.0.0**. It is a technical compliance inventory; it is not legal
advice and does not modify the original licenses.

## Runtime dependencies

| Component | Current version | Declared license | Purpose |
|---|---:|---|---|
| [`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static) | 5.2.0 | GPL-3.0-or-later | Provides the FFmpeg binary used to remux, trim, and convert audio. |
| [`hls.js`](https://github.com/video-dev/hls.js) | 1.6.13 | Apache-2.0 | Plays HLS manifests in browsers that support Media Source Extensions. |
| [`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision) | 0.10.35 | Apache-2.0 | Detects faces locally in the browser for Identity protection. |
| [BlazeFace Short Range](https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector) | float16, revision 1 | Apache-2.0 (MediaPipe) | Local TFLite model used to locate faces; distributed in `public/models/`. |
| [`youtube-dl-exec`](https://github.com/microlinkhq/youtube-dl-exec) | 3.0.22 | MIT | Adapts yt-dlp execution for Node.js; vDownloader uses the system tool on Linux. |
| [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) | Independently updated | Unlicense; artifacts may include components under other licenses | Retrieves public YouTube metadata and formats. |

Exact versions, including transitive npm dependencies, are pinned in
`package-lock.json`. Installed license texts are available in the respective
`node_modules` directories after running `npm ci`.

## Binary considerations

### FFmpeg

The `ffmpeg-static` package declares `GPL-3.0-or-later`. FFmpeg explains that
its effective license depends on the options and libraries used to build it. If
a binary copy is redistributed, review and satisfy its notice, license, and
corresponding-source obligations. See the [official FFmpeg legal
page](https://ffmpeg.org/legal.html) and the installed
`node_modules/ffmpeg-static/LICENSE`.

Running vDownloader on a private server does not turn processed videos or
third-party content into GPL software. Software licensing and content rights
are separate matters.

### yt-dlp

The main yt-dlp code uses the Unlicense, but distribution files may include MIT,
ISC, GPL, or other licensed components. On Linux, vDownloader runs the
system-managed tool through `YT_DLP_PATH` or `PATH`; other development
environments may use the artifact installed by npm. See the [official yt-dlp
license section](https://github.com/yt-dlp/yt-dlp#license).

## CDNs and temporary links

A CDN is the external network from which a provider delivers media; it is not a
library included in vDownloader.

| Provider | Media hosts authorized by vDownloader |
|---|---|
| YouTube | `*.googlevideo.com` |
| XVideos | `*.xvideos-cdn.com` |
| Pornhub | `*.phncdn.com` |
| XNXX | `*.xnxx-cdn.com` |

Providers commonly sign URLs with tokens and expiration dates. A URL stopping
is normal and does not indicate that HLS.js, FFmpeg, or yt-dlp lost its license.
When a job must retry, vDownloader analyzes the original page again and refreshes
the required tracks together.

## Localhost is not an exception

vDownloader is designed to run locally or on a controlled server, but it does
not work without Internet access: it must query provider pages and CDNs. Running
it on `localhost` does not grant rights to a video or remove site terms,
regional restrictions, copyright, or other applicable obligations.

Users must process only their own content, compatibly licensed content, or
content they are authorized to use. vDownloader does not bypass DRM,
authentication, or access restrictions.

## Interface resources

The interface does not load libraries, fonts, styles, or scripts from
third-party CDNs:

- `hls.js` is served from the installed dependency at `/vendor/hls.min.js`.
- MediaPipe Tasks Vision and its WASM binaries are served from
  `/vendor/mediapipe/`; the BlazeFace model is served from `/models/`.
- Typography uses operating-system fonts.
- CSS, JavaScript, HTML, and the favicon are served from `public/`.

Analyzed thumbnails and media still come from providers because they are part
of the requested operation.

## Pre-distribution checklist

1. Keep `LICENSE` with the MIT license for project-owned vDownloader code.
2. Keep this document and dependency notices.
3. Do not copy `node_modules` between operating systems; run `npm ci` at the destination.
4. Review the effective license of the exact FFmpeg and yt-dlp binaries being distributed.
5. Provide license texts, attribution, and corresponding source when required by an artifact's license.
6. Do not include videos, cookies, temporary tokens, or `data/jobs` files in a distribution.

## License for project-owned code

Project-owned vDownloader code is distributed under the MIT license included in
`LICENSE`. This license does not replace or modify the independent licenses of
FFmpeg, HLS.js, MediaPipe, BlazeFace, youtube-dl-exec, yt-dlp, or their
components.
