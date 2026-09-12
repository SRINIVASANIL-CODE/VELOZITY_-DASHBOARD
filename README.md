# Velozity Client Project Dashboard

Real-time client project dashboard with role-based access control (Admin / Project
Manager / Developer) and a live, role-filtered activity feed.

- **Frontend:** React 18 + TypeScript (Vite), React Router, Socket.io client
- **Backend:** Node.js + Express + TypeScript, Prisma ORM, PostgreSQL, Socket.io, node-cron
- **Auth:** JWT access token (15 min, in-memory on the client) + JWT refresh token
  (7 days, HttpOnly cookie, rotated on every use)

## Local setup (Docker — preferred)

```bash
git clone <repo-url>
cd velozity-dashboard
docker compose up --build
```

This starts Postgres and the backend (migrations run automatically on boot, followed
by the seed script). Then, in a second terminal, run the frontend separately (it's not
containerized so you get fast HMR while developing):

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173. Seed accounts (password for all: `Password123!`):

| Role | Email |
|---|---|
| Admin | admin@velozity.dev |
| Project Manager | priya.pm@velozity.dev, marcus.pm@velozity.dev |
| Developer | ravi.dev@velozity.dev, sara.dev@velozity.dev, diego.dev@velozity.dev, fatima.dev@velozity.dev |

## Local setup (without Docker)

```bash
# 1. Postgres running locally, then:
cd backend
cp .env.example .env   # point DATABASE_URL at your local Postgres
npm install
npm run prisma:migrate
npm run seed
npm run dev             # API + WebSocket server on :4000

# 2. In a second terminal:
cd frontend
cp .env.example .env
npm install
npm run dev              # Vite dev server on :5173
```

## Database schema

Postgres via Prisma (`backend/prisma/schema.prisma`). Core tables:

- **User** — `role` enum (ADMIN / PROJECT_MANAGER / DEVELOPER). Indexed on `role`.
- **RefreshToken** — one row per issued refresh token, so tokens can be individually
  revoked/rotated instead of relying on JWT expiry alone. Indexed on `userId`.
- **Client** — the agency's clients.
- **Project** — belongs to a `Client` and a `managerId` (the PM who owns it). Indexed
  on `managerId` (every PM-scoped query filters on it) and `clientId`.
- **Task** — belongs to a `Project`, optionally has an `assigneeId`. Indexed on
  `projectId`, `assigneeId`, `status`, `priority`, `dueDate` individually (each is a
  common filter), plus a composite `(isOverdue, dueDate)` index for the cron sweep's
  `WHERE isOverdue = false AND dueDate < now()` query.
- **ActivityEvent** — append-only log; a status change writes exactly one row here in
  the same DB transaction as the task update, so the log can never drift from what
  actually happened. Composite index on `(projectId, createdAt)` since every feed
  query is "latest N for project(s) X" or "events since timestamp Y".
  Indexed separately on `actorId`.
- **Notification** — per-user, `read` boolean. Composite indexes on `(userId, read)`
  and `(userId, createdAt)` to match the bell's two access patterns (unread count,
  newest-first list).

## Architectural decisions

- **WebSocket library: Socket.io**, not raw `ws`. This app needs rooms (role-scoped
  feed channels), automatic reconnect/backoff, and a request/response-style handshake
  for auth — Socket.io gives all three out of the box. Raw WebSocket would mean
  hand-rolling room fan-out and reconnect logic for no real benefit at this scale.
- **Role-filtered feed, implemented as rooms, not a firehose + client-side filter.**
  On connect, a socket joins exactly one room based on its role: `feed:admin`,
  `feed:pm:<pmId>`, or `feed:dev:<devId>`. When a task status changes, the server emits
  to up to three rooms (the acting task's project manager, the assignee, and always
  `feed:admin`) — never to everyone. This means a Developer's browser never even
  receives another developer's task events; filtering isn't a client-side courtesy,
  it's enforced by what the server sends. The exact same rule is expressed as a
  Prisma `where` clause (`activityVisibilityWhere`) for the REST catch-up endpoint,
  so "what you'd get by polling" and "what you get pushed live" can't disagree.
- **Missed-event catch-up is a DB read, not an in-memory buffer.** `GET
  /api/activity?since=<ISO timestamp>` re-runs the same role-scoped query with a
  `createdAt > since` filter. The client tracks the timestamp of the newest event it
  has and calls this on every socket `connect` event (which fires on first load and
  on every reconnect), so a dropped connection followed by a reconnect always backfills
  correctly, even across a server restart.
- **Background job: node-cron**, not a Bull/Redis queue. The overdue sweep is a single,
  stateless, idempotent `UPDATE ... WHERE dueDate < now() AND NOT done AND NOT
  isOverdue` running every 5 minutes — it has no per-job payload, no retry/backoff
  need, and no reason to depend on Redis. If overdue detection grew into something
  needing distributed workers or per-task retry logic, Bull would be the right call;
  for one recurring UPDATE it would be unused infrastructure.
- **Refresh token in an HttpOnly cookie; access token in memory only** (never
  `localStorage`). This means an XSS payload can read neither token directly — the
  access token isn't in any storage a script can query, and the refresh cookie isn't
  readable from JS at all. Refresh tokens are stored server-side and rotated (old one
  revoked, new one issued) on every use, so a leaked refresh token has a short useful
  window.
- **Role enforcement happens twice, deliberately.** `requireRole()` middleware gates
  entire routes (e.g. only ADMIN/PROJECT_MANAGER can `POST /api/tasks`). Underneath
  that, every service function re-derives a Prisma `where` clause from the caller's
  identity (`taskVisibilityWhere`, `projectVisibilityWhere`) — so a Developer hitting
  `PATCH /api/tasks/:id/status` for a task assigned to someone else gets a 403 from the
  service layer even though the route itself is open to any authenticated user. This
  is what stops a modified/forged-role token or a guessed task ID from reaching data
  the route-level check alone wouldn't catch.

## Known limitations

- No automated test suite (unit/integration tests) included — given the time box,
  effort went into the real-time/RBAC correctness the brief weights most heavily.
- No rate limiting or brute-force lockout on `/api/auth/login`.
- File/image uploads (e.g. avatars, task attachments) are out of scope.
- The activity feed keeps at most the last 100 events client-side; there's no
  infinite-scroll pagination into older history yet, only the DB-backed 20-on-load /
  since-timestamp catch-up.
- Notification delivery assumes the recipient's socket is connected for the live push;
  offline recipients see the notification the next time they load `/api/notifications`
  (it's persisted, just not pushed instantly).
- Docker Compose only containerizes Postgres + backend; the frontend runs via `npm run
  dev` locally (or can be built and deployed separately, e.g. to Vercel).

## Explanation (for the submission form)

The hardest problem was making the real-time feed's role filtering airtight without
duplicating the access-control logic in two places that could quietly drift apart. I
solved it by treating "who can see this event" as one rule with two expressions: a
Prisma `where` clause for the REST catch-up query, and a matching Socket.io room
assignment for live pushes. Both derive from the same three cases (admin/global,
PM/own-projects, developer/own-tasks), so there's no world where a user's live feed
and their "what did I miss" fetch disagree. For the role-filtered feed specifically,
each socket joins exactly one scoped room on connect, and a status-change event fans
out to at most three rooms server-side — filtering happens before the event leaves the
server, not in the browser. Catch-up on reconnect works by having the client remember
its newest event's timestamp and re-querying `since=<that timestamp>` on every socket
`connect` event, which fires identically on first load and on reconnect.

One thing I'd do differently: extract the visibility rules (`activityVisibilityWhere`,
`taskVisibilityWhere`, room-naming) into a single shared policy module instead of
three parallel implementations, to make the "two expressions of one rule" guarantee
enforced by the type system rather than by convention.
