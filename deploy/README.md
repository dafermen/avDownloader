# Linux service templates

These templates are a reviewed starting point for a private Linux installation;
replace domains and paths before use. Do not expose the Node.js port directly.

## Runtime account and directories

```bash
sudo useradd --system --home /var/lib/vdownloader --shell /usr/sbin/nologin vdownloader
sudo install -d -o root -g root -m 0755 /opt/vdownloader/current
sudo install -d -o vdownloader -g vdownloader -m 0700 /var/lib/vdownloader/jobs
sudo install -d -o root -g vdownloader -m 0750 /etc/vdownloader
```

Deploy the tested application under `/opt/vdownloader/current`. Create
`/etc/vdownloader/vdownloader.env` with mode `0640`, owned by
`root:vdownloader`. For reverse-proxy access it must include values equivalent
to:

```text
PORT=5177
HOST=127.0.0.1
JOB_DIR=/var/lib/vdownloader/jobs
FFMPEG_PATH=ffmpeg
YT_DLP_PATH=yt-dlp
REMOTE_ACCESS_ENABLED=true
TRUSTED_HTTPS_PROXY=true
ACCESS_TOKENS_JSON=[{"id":"replace-user","token":"replace-with-at-least-24-random-characters","role":"user","maxActiveJobs":2}]
ADMIN_TOKEN=replace-with-an-independent-random-secret
```

Never commit the real environment file. Generate independent random tokens,
restrict its permissions, and use an operating-system secret manager when
available.

## systemd

```bash
sudo cp deploy/systemd/vdownloader.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vdownloader
sudo systemctl status vdownloader
sudo journalctl -u vdownloader -f
```

The unit runs without root privileges, restarts after failures, makes the
application and operating system read-only, grants write access only to the job
directory, and removes Linux capabilities. Confirm the FFmpeg build works under
these restrictions with lawful synthetic media before deployment.

## Nginx and HTTPS

Replace `vdownloader.example.com` and the certificate paths in
`deploy/nginx/vdownloader.conf`, install it in the Nginx `http` context, then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

The proxy overwrites forwarding headers so clients cannot claim localhost,
streams large uploads, and sends the real address and HTTPS state to the
application. Keep Node bound to `127.0.0.1:5177`. Complete the remote-access
checks in `docs/RELEASE_CHECKLIST.md` from a second device before use.
