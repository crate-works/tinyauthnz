# tinyauthnz: Current-State Specification

This document describes the behavior visible in the current codebase. It is a guide for maintainers and coding agents, not a claim that every listed flow is complete or production-ready. Treat items marked unfinished as TODOs, not as supported behavior.

## What It Does

The project is an early-stage web application for managing access to licensed data.

- A Koa server serves Pug pages and static assets. The current server listens on port `3001` and requires `SESSION_SECRET` to start.
- Users can log in with a username and password. Password verification uses bcrypt, and the logged-in user is stored in a signed Koa session.
- An admin middleware protects the `/users` management routes. Those routes list users, create users, and display a user page; update, delete, and password-reset behavior is unfinished.
- Licence records have a URI and name. The UI and routes can list and create licences, but licence routes do not currently require admin authentication.
- Users can be associated with licences, and applications can be represented in the database. Application submission and review are not complete.
- `/entitlements` is a legacy compatibility endpoint that returns licence URIs for the supplied `x-rems-user-id`. It does not authenticate the caller or validate the API key.
- OIDC provider configuration and an adapter have been started, but the provider is not mounted by the server and the SQLite adapter is unfinished. OIDC is not a working feature of the running application.

## What Is Good

- The project is small and its main layers are apparent: Koa startup, route handlers, data access modules, and Pug views.
- SQL statements generally use bound parameters for caller-supplied values.
- Password verification uses bcrypt rather than comparing stored plaintext passwords.
- Zod is used to validate request bodies and to check some database result shapes.
- The admin middleware provides a starting point for access control, and sessions are signed using a required secret.
- The code already separates several domain concepts: users, licences, and applications.

These are useful foundations, but they do not by themselves make the service secure or production-ready.

## Developer Environment

Use SQLite as the default local development database. It is a good fit for a small, single-process application: it keeps setup lightweight, requires no database server, and makes it easy to create disposable test data. Keep the database file local and untracked; create it from migrations and an explicit seed command rather than relying on a pre-existing developer database.

SQLite is not automatically the right production choice. Revisit the decision if the service needs multiple application instances sharing a database, substantial concurrent writes, or managed database operations. If those needs arise, PostgreSQL is a reasonable production target; keep persistence behind a clear data-access boundary so that decision does not force a rewrite of route and domain logic.

The current repository is not yet a reliable fresh-checkout developer environment: database setup is not wired into server startup, the schema differs between setup paths, `manage_db.ts` drops data, and SQLite files are not ignored by `.gitignore`.

## TODOs

### Priority 0: Security and data integrity

- **Protect every sensitive route.** Apply authorization to licence management and any endpoint that exposes or changes user entitlements. Define whether each operation is admin-only, user-owned, or intended for a trusted service.
- **Secure `/entitlements`.** Authenticate and authorize callers, validate identity and API credentials, and prevent callers from selecting another user's ID. Do not expose this endpoint externally until that is fixed.
- **Make session cookies deployment-safe.** Enable `secure` when served over HTTPS, document the HTTPS requirement, and review session lifetime, renewal, and cookie policy.
- **Remove development OIDC settings before enabling OIDC.** Replace hard-coded clients and redirect URIs, restrict CORS, and review supported grants, PKCE, keys, claims, consent, and account mapping.
- **Unify database ownership and bootstrap.** `server.ts` currently calls neither `init()` nor `migrate()`, and `src/database.ts`'s migration only updates `user_version` without creating tables. `manage_db.ts` drops and recreates tables at module startup, so running it destroys existing data. `authentication.ts` has a separate optional `init(true)` that also drops tables, and its schema omits `users.is_admin` and `applications.text` even though current models expect those columns; it also declares user/licence link IDs as `TEXT` while the other setup uses integers. In addition, `src/Licence.ts` opens the connection from `authentication.ts`, while `src/User.ts` and `src/Application.ts` use `src/database.ts`. Choose one canonical schema and one shared database module/connection, add versioned non-destructive migrations and constraints (including unique usernames), and have startup validate/apply migrations. Keep destructive reset behavior as an explicit, development-only command.
- **Make local SQLite setup reproducible and non-destructive.** Add explicit migration and seed commands, make reset behavior opt-in and clearly development-only, document the required Node.js version, and ignore local SQLite database/journal files. Tests should use a separate temporary database.

### Priority 1: Make core flows correct

- **Fix login outcomes.** Return a useful failure response for invalid credentials and unknown users; avoid unhandled errors for ordinary authentication failures.
- **Finish user management.** Implement or remove the current update, delete, and password-reset stubs. Enforce input rules and handle duplicate usernames in both application logic and the database.
- **Finish licence management.** Add authorization, validate URIs and references, correct the add/remove-user queries, and implement or remove unfinished detail/delete actions.
- **Finish application submission and review.** Add the POST route used by the form, persist applications, define who may view and approve them, and fix `Application.byId` to query the applications table.
- **Handle missing records consistently.** Several model lookups parse a possibly missing row as a required schema, which can throw instead of returning a not-found result. Define consistent not-found behavior for route handlers.
- **Remove or complete obsolete code paths.** Identify duplicate database/authentication functions and legacy endpoints, then keep one supported implementation for each behavior.

### Priority 2: OIDC, tests, and maintainability

- **Decide whether OIDC is in scope.** If yes, implement and test the adapter and interaction routes before mounting the provider. If not, remove misleading unused provider code and dependencies.
- **Add automated tests.** Cover login success/failure, access-control boundaries, entitlement isolation, database migrations, and user/licence/application workflows. The current `npm test` script invokes Jest, but Jest and test files are absent.
- **Make installation and type-checking reproducible.** Verify that every imported package is declared (including `koa`, `@koa/router`, and `zod`), add any required Node.js types and scripts, and validate from a clean install.
- **Improve error handling and validation.** Return appropriate HTTP status codes and user-facing errors; validate route inputs and database constraints instead of relying on casts or uncaught exceptions.
- **Update `README.md` to match the implementation.** Document the actual port (`3001`), required `SESSION_SECRET`, safe database setup, available workflows, known stubs, and test commands. Do not document seed credentials as usable until the seed path is wired and confirmed.
- **Clarify deployment and operational requirements.** Document supported Node.js versions, database location/backups, HTTPS, logging, and configuration through environment variables.
- **Choose production persistence based on deployment needs.** Keep SQLite for local development; decide whether production can remain a single-instance SQLite deployment or needs PostgreSQL for shared multi-instance access and higher write concurrency.

## Boundaries and Assumptions

- This specification describes the code as currently present; it does not define a final product policy for who may grant access or how applications should be approved.
- Do not treat the OIDC code, password reset, application submission, or `/entitlements` authentication as implemented merely because related files, templates, or TODO comments exist.
- Before deployment, resolve all Priority 0 items and add tests that demonstrate the intended authorization rules.