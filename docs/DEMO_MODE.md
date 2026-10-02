# Optional portfolio demo access

Updated: 2026-10-02. Approved by the owner for the test-server demos.

Demo: https://avdownloader.innovalogic.tech/

## What these variables control

`DEMO_MODE` controls the **external server gateway**, not an application feature flag.
The shared service `innovalogic-demo-access` protects browser pages and APIs through
Nginx `auth_request`. Merely adding these variables to the root development `.env`
does not enable this gateway in Windows or change a deployed site.

```dotenv
DEMO_MODE=true
DEMO_PASSWORD=""
```

The example intentionally has no working password. Supply a private password before
enabling it. Use the exact strings `true` or `false`:

- `true`: the visitor must enter the password at `/demo-access`.
- `false`: bypass only the outer demo gate. Internal application permissions remain.
- With `true`, the password must contain 8â€“256 characters, on one line, with at
  least eight non-leading/trailing-whitespace characters. Quote values containing
  spaces or `#`. Missing/invalid configuration fails closed.

## Change the deployed settings

Private file: `/etc/innovalogic-demo-access/avdownloader/.env`.

```sh
sudo nano /etc/innovalogic-demo-access/avdownloader/.env
sudo innovalogic-demo-apply
```

The apply command validates all four private files before restarting the shared
service. A validation failure leaves the previously running configuration in use.
A successful restart applies changes and revokes existing sessions for all four
demos. Changes are not hot-reloaded; no application rebuild is required.

All four deployed demos currently retain `DEMO_MODE=true` and their existing keys.
The files are owned by root, group `innovalogic-demo-access`, mode `0640`, in private
directories with mode `0750`, outside the web root. Never commit real `.env` files,
print passwords in logs, or put them in `VITE_*`/`NEXT_PUBLIC_*` variables.

## Password and session behavior

The operator writes a password directly; there is no manual hash-generation step.
On startup the gateway derives a salted scrypt verifier in memory. A successful
login grants an opaque, host-bound, eight-hour session, using a Secure, HttpOnly,
SameSite=Strict cookie. Only hashes of session tokens remain in process memory.
Logout, restart and expiration revoke access. Origin validation and login limits
remain enabled. The shared key is a portfolio gate, not individual user identity.

Native access/admin tokens, quotas and job ownership remain mandatory. The private pilot expires at 2026-10-10T04:00:00Z (midnight after October 9 in New York), even when DEMO_MODE=false. Manual format/provider/identity-protection acceptance is still pending under the existing owner-approved exception.

## Versioned deployment component

The source, tests and secret-free template are in [deploy/demo-access](../deploy/demo-access/README.md).
Node.js 24 is required. The same component is mirrored in the four project repositories;
the VPS runs **one shared instance**, not one per application. Keep the five runtime
files synchronized when updating the component. `config.example.json` is a one-site
example; never overwrite the VPS multi-site configuration with it.

The existing map `/etc/innovalogic-demo-access/config.json` selects each private env
file and preserves pilot expiry. The loopback listener is `127.0.0.1:5192`.
The operational procedure and example reverse-proxy boundary are in the bundle README.
The root application's `.env.example` intentionally does not claim to read these settings.

## Verification and rollback

```sh
node --test deploy/demo-access/security.test.mjs
```

Five automated cases cover enabled/disabled modes, missing/invalid settings, password
rotation, session revocation, host isolation, expiry, origin checks and rate limits.
They passed on Windows and Linux on 2026-10-02. The four deployed sites passed HTTPS
login, authenticated-page access, logout and rejection of `/.env` requests.

Before a gateway release, back up its systemd unit and private configuration. Deploy
code separately from configuration, validate using `server.mjs --check-config`, run
tests, then restart the shared service. Roll back code/service paths if verification
fails; do not replace current private env files with the example or delete app data.
Private server backups and release evidence are retained by the deployment operator.

## Deferred work

Local-development integration and individual invitations or one-time codes by email
are not implemented by this server-only change. They require separate application
integration. No new account system or commercial-production approval is implied.
