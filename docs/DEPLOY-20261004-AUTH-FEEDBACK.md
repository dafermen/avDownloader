# Access-validation feedback — 2026-10-04

Target: `20261004-auth-feedback`. Rollback: `20261004-auth-ui`.
Server diagnosis: the native profile token works; ADMIN_TOKEN is a different
legacy credential. The UI previously showed generic help for rejected tokens
in a narrow low-contrast grid cell, making the button appear nonfunctional.

- Development suite: 62 tests PASS.
- Browser acceptance covers explicit pending/success/rejection, empty input,
  network failure, demo expiry, cooldown and valid/degraded status in ES/EN.
- Full-width accessible feedback is independent of background health polling.
- Windows/Linux gates: all 15 checks PASS; production audit 0.
- Chrome 1440/390 PASS; ES/EN results and polling persistence checked.
- HTTPS native/demo authentication, exact 6 GiB settings and v25 assets PASS.
- Active release: `/opt/avdownloader/releases/20261004-auth-feedback`.
- Backup/evidence: `/var/backups/avdownloader-auth-feedback-20261004`.
- Existing native admin token was copied only on the server into
  `/etc/avdownloader/access-token.txt`, root-owned mode 0600, for the owner.
  No secret exported, displayed or committed; no credential rotation.
- Private service/demo configuration and pilot-expiry hashes unchanged.
- Service healthy, no active jobs at restart; data retained.
- Full owner 5 GiB conversion remains pending; no private media used.

Existing Dario Meneses manual provider/format/identity exception remains valid
only through October 9, 2026. Native/demo permissions, quotas and expiry stay
unchanged. Activate only with no active jobs. Roll back the release symlink
and restart avdownloader. No GitHub writes or credential rotation.
