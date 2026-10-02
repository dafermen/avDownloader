# ADR: optional demo gate configured through a private env file

Status: accepted by explicit owner instruction on 2026-10-02.

The owner requested a minimal, optional portfolio-entry barrier. The existing
external welcome service now reads `DEMO_MODE` and `DEMO_PASSWORD` per site.
This supersedes manual verifier editing for routine password rotation, while
preserving the welcome form and server-side scrypt verification. Existing legacy
hashed configuration remains accepted for rollback. The current deployment stays enabled.

The implementation is outside the app process. Disabling it does not disable app
authorization or pilot expiration. Missing settings never imply public access.
Plain passwords reside only in private server env files; the runtime derives its
verifier and keeps short-lived sessions in memory. Restart revokes every session.
Email invitation codes and local development integration are deferred.

Native access/admin tokens, quotas and job ownership remain mandatory. The private pilot expires at 2026-10-10T04:00:00Z (midnight after October 9 in New York), even when DEMO_MODE=false. Manual format/provider/identity-protection acceptance is still pending under the existing owner-approved exception.

See [configuration, testing and rollback](DEMO_MODE.md).
