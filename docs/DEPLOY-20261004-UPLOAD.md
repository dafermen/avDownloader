# Upload release evidence — 2026-10-04

Scope: user-authorized private-server update for a 5 GiB video and optional
upload cap. Release `20261004-upload`; rollback `20261002`.

- [x] Windows deployment report passed every configured check.
- [x] Linux candidate deployment report passed every configured check.
- [x] 59 development tests passed; no tests skipped or failing.
- [x] Production audit reported zero vulnerabilities.
- [x] Existing synthetic audio/video conversion, range and cleanup tests passed.
- [x] Declared 5 GiB upload crossed TLS, Nginx and native/demo authentication.
- [x] Partial upload removal and bounded streaming memory verified.
- [x] UI limit checks passed locally at 1440 and 390 pixels.
- [x] Service health, storage settings, credentials and expiry preserved.
- [x] Previous release and private config backed up; automatic rollback prepared.
- [ ] Full user-provided 5 GiB media conversion: not performed; file not supplied.
- [ ] Live Chrome authenticated check: credential export rejected; server-side
  HTTPS verification and local Chrome checks completed instead.
- [ ] Complete real-player/provider/identity acceptance: remains under the
  existing Dario Meneses exception through October 9, 2026, New York.

Decision: deployed only to the existing protected private pilot. No general
release approval, expiry extension or GitHub/CI publication is claimed.
Linux gate was executed directly on the isolated server candidate.

Recovery: atomically restore `/opt/avdownloader/current` to the previous
release; restore env and Nginx from `/var/backups/avdownloader-upload-20261004`;
validate Nginx, restart avdownloader, reload Nginx and verify health. Retain data.
Never print or commit the backup environment file.
