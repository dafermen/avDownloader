# Upload preview fix — 2026-10-04

Target release: `20261004-upload-ui`; rollback: `20261004-upload`.
Scope: correct the false 2048 MB rejection; retain 6 GiB upload / 12 GiB quota.

- Development suite: 61 PASS, zero skipped/failed.
- Chrome desktop/mobile: PASS, remote mode without a native token reproduces
  the former failure and now consults the effective settings before selection.
- Both optional-limit modes, delayed/failed settings and retries covered.
- Read-only preview endpoint contains no profiles, secrets, jobs or paths.
- Native authentication for uploads, health and jobs remains required.
- Full 5 GiB real-media conversion remains pending: owner media unavailable.
- Windows and Linux deployment gates: all 15 configured checks PASS;
  production audit: zero vulnerabilities.
- Deployed `/opt/avdownloader/releases/20261004-upload-ui`, health PASS.
- Live HTTPS: demo session without native token receives exactly the 6 GiB
  settings; diagnostics/jobs remain 401; no demo session receives 401.
- Updated versioned browser assets verified through HTTPS.
- Private config, credentials, Nginx, service isolation and pilot expiry hashes
  unchanged. No user job or media removed and no GitHub writes.
- Delivery evidence: `/var/backups/avdownloader-upload-ui-20261004/delivery.json`.
- Linux report: release `reports/predeploy-report.json`.

The existing Dario Meneses private-pilot exception for outstanding manual
provider/format/identity checks remains valid only through October 9, 2026.
No extension, GitHub publication, credential rotation or authorization bypass.
Residual risks: untested real-media formats/conversion and the owner's 5 GiB
file. Restore the previous release symlink and restart avdownloader to roll back;
private configuration and job storage are unchanged by this correction.
