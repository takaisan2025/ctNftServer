# Production Reliability Implementation Plan

> For agentic workers: implement each task with a failing regression test, then verify the full nonce suite before release.

**Goal:** Strengthen connection handling, task completion, scheduling, and Redis secret handling without changing public routes, response payloads, or business decisions.

**Architecture:** Keep the existing modules and task entry point. Correct lifecycle boundaries in the MySQL pools, Redis helper, and callback task; prevent local timer overlap. Read Redis credentials from the ignored production environment file and rotate the exposed credential after both PM2 services are ready to use the new setting.

**Tech Stack:** Node.js, node:test, MySQL `mysql` pool, Redis v3, PM2.

**Spec:** User-approved scope and unchanged-interface constraint in this conversation, 2026-10-01.

## Global Constraints

- Do not alter public HTTP paths, methods, status codes, or response schemas.
- Do not alter transaction ordering, nonce decisions, gas rules, or callback status decisions.
- Back up production files and Redis configuration before every production mutation.
- Stop rollout and restore the prior files if process health, API test route, or txpool status regresses.
- Preserve production-only files and configuration; deploy only reviewed files.

## Tasks

### 1. MySQL connection lifecycle

- [x] Add a regression test showing a pooled connection remains checked out until query callback completion, including query errors, for both pool modules.
- [x] Confirm the test fails on the existing implementation.
- [x] Move `conn.release()` into a `finally` block within each query callback, retaining returned values and errors.
- [x] Run the regression tests and nonce suite.

### 2. Redis flag clearing

- [x] Add a regression test showing `removeString` resolves only after deletion and preserves its previous-value return contract.
- [x] Confirm the test fails on the existing implementation.
- [x] Use an atomic Redis GET-and-DEL Lua command with a callback-backed Promise.
- [x] Run the regression tests and nonce suite.

### 3. Callback task completion

- [x] Add a regression test showing a callback task does not clear its running flag before HTTP and status update finish.
- [x] Confirm the test fails on the existing implementation.
- [x] Await all callback promises and preserve each existing response-to-status mapping.
- [x] Run the regression tests and nonce suite.

### 4. Background timer overlap

- [x] Add a regression test showing a second tick of the same job is skipped while the first runs, while different jobs remain independent.
- [x] Confirm the test fails on the existing implementation.
- [x] Add local single-flight protection to the scheduler wrapper; keep intervals unchanged.
- [x] Run the regression tests and nonce suite.

### 5. Redis credential migration

- [x] Add a regression test proving the Redis client reads a runtime secret and does not contain an embedded password.
- [x] Confirm the test fails on the existing implementation.
- [x] Load the ignored `.env` from the repository root in both API and background entry paths; fail clearly if the secret is missing.
- [x] Identify current Redis consumers and the persistent Redis configuration before rotation.
- [x] Deploy the code and runtime environment safely, rotate the credential, restart the two PM2 services, and verify both reconnect.

### 6. Production rollout and verification

- [x] Compare reviewed local files to S2 baseline and create a full targeted backup.
- [x] Deploy only reviewed runtime files, one risk group at a time, restarting the affected PM2 service.
- [x] Verify API test route 200, PM2 stable, Redis connectivity, and txpool pending/queued status after each phase.
- [x] Commit and push reviewed source and tests; confirm remote commit and clean local worktree.

## Deferred boundary

The callback URL acceptance rule and Redis `KEYS` scan semantics require separate compatibility analysis. Their changes could reject existing callers or change nonce-adjacent snapshots, so this rollout records the risk without changing those behaviors.

Global TLS verification is also disabled by several legacy callback task modules. Removing that override requires checking every current callback target's certificate behavior, so it is outside this compatibility-preserving rollout.

## Verification notes

- The 48 focused regression tests pass locally; all six deployed runtime files match the tested bytes on S2.
- S2's local and public API test routes return HTTP 200; both PM2 services remain online and txpool returns no pending or queued transactions after the Redis rotation.
- A temporary Redis flag passed set/remove/read verification; the primary MySQL pool returned `SELECT 1` successfully.
- The PHP MySQL pool's `SELECT 1` could not resolve its configured host (`ENOTFOUND`). Its connection configuration was not changed in this rollout; this is tracked as a separate infrastructure issue.
