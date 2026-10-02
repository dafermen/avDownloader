# Demo access gateway for the portfolio VPS

This versioned copy supports the existing shared Nginx/systemd deployment.
Read [the operational guide](../../docs/DEMO_MODE.md) before changing settings.
It does not attach itself to the application's local dev server.

## Files

- `server.mjs`, `config.mjs`, `welcome.html`, `welcome.js`, `style.css`: runtime.
- `security.test.mjs`: synthetic security and configuration tests.
- `.env.example`: empty password template; real `.env` is never committed.
- `config.example.json`: one-site map; production uses a four-site map.

Use Node.js 24. Test with `node --test deploy/demo-access/security.test.mjs`.
Set `DEMO_ACCESS_CONFIG` to the private JSON map when validating or starting:

```sh
DEMO_ACCESS_CONFIG=/etc/innovalogic-demo-access/config.json node deploy/demo-access/server.mjs --check-config
```

The listener is loopback-only on 5192 and accepts the configured
`*.innovalogic.tech` hosts. The existing systemd service runs under the unprivileged
`innovalogic-demo-access` account, with private env files readable only by root and
that service group. Keep the OS sandbox, HTTPS and reverse-proxy protections.

## Reverse-proxy boundary

Nginx must send an internal GET to `/check` with the actual Host and session cookie
for every protected application/API route. `/check` returns 204 when authorized
(or explicitly disabled), 401 when login is needed, and denies expired pilots.
Proxy `/demo-access` and `/demo-access/` directly to the gateway without recursively
applying auth_request. Set trusted Host and X-Real-IP headers; never expose port 5192.
Handle 401 as a browser redirect to `/demo-access` or an API 401, according to Accept.
Keep existing origin controls and native application authorization in place.

Do not use a frontend-only password check or exclude API routes. This directory is
not an automatic bootstrap installer; the existing multi-site VPS configuration
must be preserved. Editing a Windows env file does not update the server.

## Applying settings on the existing VPS

Edit the site's private `.env`, then run `sudo innovalogic-demo-apply`.
All four sessions are revoked on restart; passwords are never printed.
Email invitations and local-dev integration are outside this release.
