# Secure Distributed Systems Lab

This repository has been repurposed from a starter template into a **hands-on lab for secure distributed systems** with NestJS.

## Mission

Design, build, and harden backend services that communicate across boundaries safely and reliably.

The lab starts with a reservations domain and evolves through incremental, testable improvements in:

- security controls,
- distributed-systems correctness,
- and production readiness.

## Current repository scope

- `apps/reservations`: reservations service (API layer, domain service, DTOs, repository usage).
- `libs/common`: shared building blocks for config and database abstractions.

## Lab operating principles

Each PR should improve at least one of these dimensions:

1. **Security posture**
   - strict input validation and sanitization,
   - explicit authn/authz boundaries,
   - secret/config hygiene,
   - least-privilege data access patterns.
2. **Distributed behavior**
   - idempotent write workflows,
   - retry-safe operations and timeout handling,
   - consistency-aware failure-mode design.
3. **Operability**
   - structured logging and correlation IDs,
   - health/readiness checks,
   - clear runbooks and predictable local dev flow.
4. **Maintainability**
   - strong module boundaries,
   - reusable shared libraries with low coupling,
   - meaningful unit/e2e coverage.

## Development workflow

```bash
# install dependencies
pnpm install

# run the app in watch mode
pnpm run start:dev

# run unit tests
pnpm run test

# run e2e tests
pnpm run test:e2e

# lint and auto-fix
pnpm run lint
```

## Near-term roadmap

- Add authentication and authorization middleware/guards for mutating endpoints.
- Introduce request-scoped correlation IDs and structured logs.
- Add resilience controls (timeouts, retries, fallback behavior) for downstream failures.
- Expand e2e coverage for security and consistency edge cases.
- Document threat model assumptions and non-goals in `/docs`.

## Definition of done for lab changes

A change is considered complete when it includes:

- clear intent tied to at least one lab principle,
- automated tests (or documented reason if not feasible),
- operational considerations (logging/errors/config),
- and concise documentation updates when behavior changes.
