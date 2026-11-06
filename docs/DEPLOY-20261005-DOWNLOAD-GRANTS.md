# Authenticated streaming download correction — 2026-10-05

Target release: `20261005-download-grants`. Planned rollback:
`20261004-auth-feedback`.

## Reported failure and root cause

A completed conversion could not be downloaded from the private HTTPS pilot.
Direct browser navigation to `/api/jobs/:id/download` does not carry the native
bearer credential stored in `sessionStorage`, so the server correctly returned
HTTP 401 with `Se requiere un token de acceso válido`. The conversion duration
and job retention were not the cause. The panel fallback was also unsuitable
for large files because it copied the entire response into a JavaScript Blob.

## Correction

- Every download button first makes an authenticated, non-simple
  `POST /api/jobs/:id/download-access` request.
- The server creates a random 30-minute grant held only in process memory and
  sends it in an HttpOnly, SameSite=Strict cookie scoped to that job's exact
  download path. HTTPS responses also mark it Secure.
- Neither the access token nor the grant appears in a URL, log, persisted job,
  browser history, or frontend-readable storage.
- The browser then uses its native download manager. Node streams the file and
  preserves HTTP Range, so multi-gigabyte output is not buffered in a Blob.
- A new grant can be requested while the retained job still exists. Processing
  time does not consume the ready-file retention window, which starts at
  `completedAt`.

## Pre-deployment evidence

- Development suite: 64 PASS, zero failures or skips.
- Windows deployment gate: all thirteen mandatory categories PASS.
- Mutation score: 3/3 configured mutants killed.
- JavaScript syntax checks: PASS.
- Production dependency audit: zero vulnerabilities.
- Remote E2E: unauthenticated rejection, control-header enforcement, secure
  grant creation, full streamed download, HTTP 206 range, and cross-job cookie
  rejection PASS using lawful synthetic audio.
- Regression: all three UI download locations use the streaming authorization
  helper and no complete-response Blob path remains.
- High-confidence source secret scan: no private key, GitHub token, OpenAI key,
  or AWS access-key pattern found in the release sources.
- VPS preflight: service healthy, one retained job, zero active jobs; existing
  private configuration and persistent job directory remain outside releases.

## Deployment result

- Linux candidate gate: all thirteen mandatory categories PASS; 64 tests,
  mutation score 3/3, syntax checks, and production audit with zero
  vulnerabilities PASS.
- Activated atomically at
  `/opt/avdownloader/releases/20261005-download-grants`; rollback release is
  `/opt/avdownloader/releases/20261004-auth-feedback`.
- Private environment and persistent `/var/lib/avdownloader/jobs` remained
  outside the release. One ready job and zero active jobs were preserved.
- Service restart and post-start health PASS. Versioned `app.js?v=26` and
  `i18n.js?v=7` assets are active.
- Live native remote-mode verification used the retained ready output without
  printing or exporting credentials: direct access returned HTTP 401, grant
  creation returned HTTP 201 with Secure/HttpOnly/Strict cookie attributes,
  and a 128-byte range returned HTTP 206 through the cookie only.
- The public HTTPS endpoint remains protected by the existing external demo
  gate and returns HTTP 401 without a demo session, as designed.
- Rollback link and the unchanged private environment were copied to
  `/var/backups/avdownloader-download-grants-20261005` with restrictive secret
  permissions. Temporary packages, headers, cookies, and verification files
  were removed after validation.

No credential rotation, user-file deletion, pilot extension, GitHub
publication, or authorization weakening was included.

The existing Dario Meneses private-pilot exception for the outstanding manual
provider, format, and identity checks remains valid only through October 9,
2026. Restore the saved `current` link, restart only `avdownloader`, and repeat
health checks to roll back to `20261004-auth-feedback` if a regression appears.
