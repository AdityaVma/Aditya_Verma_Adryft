# Build Plan – Study Collaboration App

Use this as input for AI agents (e.g., Claude/Codex) to implement the product. Stack: Next.js (TypeScript), React Native, Node.js/TypeScript services, PostgreSQL, Redis, Kafka/PubSub, WebRTC with self-hosted TURN/STUN.

## Phase 0 – Repo & Environments
1) Scaffold monorepo (frontend, mobile, services, shared contracts/SDK). Set pnpm/yarn workspaces.
2) Add CI/CD templates (lint, test, build, docker); env management (.env.example), secrets via vault.
3) Define OpenAPI/Proto contracts for gateway ↔ services; generate TypeScript SDKs for FE/BE.
4) Provision Kubernetes manifests (gateway, core services, Postgres, Redis, TURN, ingress, metrics stack).

## Phase 1 – Auth & Identity
1) Implement Auth Service: signup/login, password hashing, JWT/refresh, RBAC.
2) OTP flows: email/SMS send + verify; rate limits; secure code storage.
3) API gateway middleware for auth, refresh rotation, and rate limiting.
4) Frontend auth: guarded routes, login/signup/OTP screens; store tokens in httpOnly cookies.

## Phase 2 – User Profile & Onboarding
1) User Service: profile CRUD, preferences (subjects, awake hours, goals).
2) Onboarding flow (web): capture subjects, awake hours, goals; save via API.
3) Profile display: streaks, totals, collectibles placeholder.

## Phase 3 – Study Sessions & Timers
1) Study Service: session lifecycle (scheduled/active/completed/missed), timer/break logic, session events.
2) WebSocket channel for session state and pod timers; Redis for ticks.
3) Missed-session detection + status updates.
4) Frontend: focus mode setup, timer UI (start/pause/resume/complete), break handling.

## Phase 4 – Practice Engine
1) Question retrieval by subject/chapter/topic/difficulty; pagination.
2) Attempt recording (correctness, time per question); scoring.
3) Post-session generator for 5 custom questions; hook for adaptive difficulty (stub AI call).
4) Frontend practice player: timed questions, per-question feedback, session summary.

## Phase 5 – Pods, WebRTC, Moderation
1) Pod Service: auto-assign + custom pods; membership; presence; shared timers.
2) Signaling Service: WebRTC room management, token issuance; integrate self-hosted TURN/STUN.
3) Moderation (per podmoderations.md): host role, mute all/individual (30s cooldown), lock pod, end session, camera defaults off, reporting auto-mutes, join/rejoin limits, max size, indicators, reconnect with audio fallback, host reassignment.
4) Frontend pods UI: join/leave, audio/video toggles, device selection, host controls, indicators, reporting flow.
5) Mobile parity (React Native) for core pod interactions.

## Phase 6 – Calendar & Reschedule
1) Calendar Service: Google OAuth, sync slots, conflict detection.
2) Reschedule suggestions within awake hours; confirmation flow; status updates.
3) Frontend calendar view + reschedule prompts; notifications hook.

## Phase 7 – Leaderboards & Gamification
1) Leaderboard Service: stream consumer (Kafka/PubSub) aggregating hours/questions; near-real-time cache.
2) Gamification Service: rivers/accessories/collectibles progression rules; profile exposure APIs.
3) Frontend: subject leaderboards (live updates), river/collectible viewer.

## Phase 8 – Recommendations & Feedback
1) Recommendation Service: heuristic topic difficulty adaptation; practice picks; reschedule text generation; acceptance logging.
2) Feedback generation for attempts; topic strength/weakness summaries.
3) Frontend surfaces: recommended practice sets, feedback panels.

## Phase 9 – Notifications
1) Notification Service: providers for email/SMS/push; templating; retries; logging.
2) Triggers: OTP, session reminders, reschedule suggestions, pod invites.
3) Preference management (opt-in/out) in User Service.

## Phase 10 – Observability, Security, QA
1) Observability: structured logging, tracing, metrics; SLOs for latency/availability; dashboards.
2) Security: rate limits (auth, join/rejoin), OTP abuse checks, audit logs for moderation/reporting.
3) Testing: unit/integration for services; contract tests for APIs; e2e smoke for web; load tests for gateway, WebRTC signaling, and timers.
4) Release: canary deploy scripts, rollback plan, health checks, readiness probes.

## Delivery Checklist (per feature)
- APIs defined in OpenAPI and generated SDKs updated.
- DB migrations added and reviewed.
- Happy-path and edge-path tests exist; CI green.
- Frontend wired with data fetching + optimistic handling where needed.
- Docs updated (README/runbooks); feature flags where risky.

