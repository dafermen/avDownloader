# vDownloader — Documentation map and maintenance

## DOC-STD-20261002 — Canonical sources

Documentation standard v1.0 · reviewed 2026-10-02. Primary language: English.

Private video/audio processing application with native HTTP server.

The avDownloader public repository corresponds to the local vDownloader folder. The private pilot is authorized through October 9, 2026, with access cutoff at 2026-10-10T04:00:00Z. DEMO_MODE does not replace native bearer profiles, quotas or expiry. Manual provider, codec and identity-overlay acceptance remains separate from automated results. Preserve English documentation and use only synthetic evidence.

| Need | Authoritative source |
| --- | --- |
| Presentation | [README.md](../README.md) |
| Current state | [CURRENT_STATUS.md](../CURRENT_STATUS.md) |
| Development | [docs/DEVELOPMENT.md](DEVELOPMENT.md) |
| Architecture | [docs/ARCHITECTURE.md](ARCHITECTURE.md) |
| API / contracts | [docs/API.md](API.md) |
| Testing | [docs/TESTING.md](TESTING.md) |
| Security | [docs/SECURITY.md](SECURITY.md) |
| Deployment | [docs/DEPLOYMENT.md](DEPLOYMENT.md) |
| Operations | [docs/OPERATIONS.md](OPERATIONS.md) |
| Troubleshooting | [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| Demo access | [docs/DEMO_MODE.md](DEMO_MODE.md) |
| Release checklist | [docs/RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) |
| In-app manual | [public/docs.html](../public/docs.html) |
| History | [CHANGELOG.md](../CHANGELOG.md) |
| Decisions | [docs/adr/README.md](adr/README.md) |

Start with the presentation and current state, then read the user guide to try the product, development/architecture to contribute, or deployment/operations to maintain it. The existing detailed index remains valid.

### Evidence and updates

Keep current state, change history and decisions separate. Existing dated test results remain historical evidence. Adding this map does not rerun every documented command or complete pending product acceptance. Record actual checks, their environment and unresolved limits before publication.

Update the source guide whenever commands, configuration, behavior, permissions or deployment change. Keep existing links and portal routes stable. Use real screenshots with synthetic data; never publish env values, access keys, user data or operational logs. A local commit, a remote commit and a deployed artifact are separate states.
