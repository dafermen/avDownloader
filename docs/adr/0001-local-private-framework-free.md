# ADR 0001: Local/private, framework-free architecture

- Status: Accepted
- Date: 2026-07-29

## Context

The application needs a small educational codebase, direct control of media
streaming, explicit security boundaries, local multimedia tools, and operation
on a developer computer or private Linux server.

## Decision

Use Node.js 20 ES modules and `node:http` without a web framework. Serve the
interface and versioned browser dependencies locally. Run FFmpeg and yt-dlp as
system-managed tools on Linux. Keep provider-specific validation in registered
modules and signed media references opaque.

The supported deployment boundary is localhost or a controlled private server.
Public exposure requires a separate decision covering authentication,
authorization, HTTPS, rate limiting, and isolation.

## Consequences

- Routing and middleware behavior remain visible and educational.
- The project owns more validation, error handling, and HTTP details.
- Provider modules can change independently without weakening the router.
- Linux operations depend on system tool maintenance.
- A future public/multi-user architecture requires deliberate redesign rather
  than configuration alone.
