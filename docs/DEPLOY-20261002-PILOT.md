# DEPLOY-20261002 — Private test pilot

- Owner/approver: Dario Meneses, explicit approval in central deployment chat on 2026-10-02.
- Target: https://avdownloader.innovalogic.tech/, Ubuntu test VPS.
- Candidate: current clean working-tree source packaged on 2026-10-02; no application code changes.
- Runtime: Node 24.18.0, system FFmpeg, Linux yt-dlp 2026.8.19.
- Automated gate: PASS in Windows and Linux, all 13 categories. Production dependency audit: zero vulnerabilities. Reports retained with the server release and local project.
- Runtime/browser acceptance: unprivileged restricted service; invalid native token denied; synthetic audio conversion, download and range checks passed; HTTPS outer authentication tested with valid/invalid/missing passwords; browser desktop/mobile load passed.
- Limits: 2 GiB storage, 0.5 GiB upload, one simultaneous conversion, two active jobs per profile, 60 minute retention.
- Secrets: generated server-side outside Git, restrictive environment-file permissions. Separate outer login, native access token and admin token.

## Written time-limited exception

Approved for a password-protected personal test pilot only, until the end of October 9, 2026, America/New_York. The owner expressly accepted pending manual format/provider/identity-overlay checks and the risk of feature failures or unexpected output. This does not claim general release readiness or validated anonymization.

The complete manual format/player matrix, provider tests and full face/identity-overlay review are deferred under this exception. All automated categories passed; no automated failures are waived. Media requiring identity protection must be reviewed by a human before sharing.

## Expiry and rollback

`avdownloader-pilot-expiry.timer` closes the HTTPS site at 2026-10-10T04:00:00Z. The HTTP ACME challenge remains available for certificate renewal. The service and files are preserved; no data is deleted. Earlier containment uses `/usr/local/sbin/expire-avdownloader-pilot`. Reopening after expiry requires a new owner decision or completion of acceptance.

There was no previous public application at this domain; rollback returns the domain to an unavailable response while retaining the private service and evidence. A private initial server configuration backup is retained under `/var/backups/innovalogic-staging`.


## DEMO-ACCESS-20261002 — Welcome form

The owner subsequently approved a Nexo-style welcome form for the outer gate. It replaces HTTP Basic with scrypt password verification and an eight-hour opaque session. Native tokens, resource limits, residual manual checks and the approved pilot expiry are unchanged.
