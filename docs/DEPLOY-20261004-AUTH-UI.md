# Token input and cooldown correction — 2026-10-04

Target: `20261004-auth-ui`. Rollback: `20261004-upload-ui`.
Evidence: repeated 401 then 429 responses on health/jobs/upload-config while
the existing token independently authenticated successfully on the server.

- 62 development tests PASS, zero skipped/failed.
- Regression verifies five invalid credentials still trigger the existing
  15-minute block and that valid credentials cannot bypass it.
- Browser acceptance: explicit token submission, no requests while typing,
  polling pause, real 429 cooldown and accurate upload/status messaging.
- Windows and Linux deployment gates: all 15 configured checks PASS, audit 0.
- Chrome acceptance: PASS at 1440/390 px using synthetic local credentials.
- HTTPS: valid existing token authenticates; no native token remains rejected;
  demo session required; 6 GiB upload settings and v24 assets verified.
- Active: `/opt/avdownloader/releases/20261004-auth-ui`, health PASS.
- No active jobs at restart; in-memory authentication cooldowns reset normally.
- Private env, Nginx, service sandbox, demo config and expiry hashes unchanged.
- Evidence: `/var/backups/avdownloader-auth-ui-20261004/delivery.json` and
  release `reports/predeploy-report.json`.
- Full owner 5 GiB conversion remains pending; no private media used.

Existing Dario Meneses manual provider/format/identity pilot exception expires
after October 9, 2026; no extension or protection removal. The deployment
restarts only after checking for active jobs. No credentials or data are
changed. Restore the previous release symlink and restart avdownloader for
rollback. Reverting also restores the problematic input behavior.
