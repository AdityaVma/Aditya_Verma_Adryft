Below is a concise end-to-end system design derived from `prd.md`. Tech stack confirmed: Next.js (TypeScript), React Native, Node.js/TypeScript services, PostgreSQL, Redis, Kafka/PubSub, and WebRTC for audio+video pods.

## Architecture Overview
- **Clients**: Web (React/Next.js), Mobile (React Native). Shared design system + API SDK.
- **API Gateway**: HTTPS + auth (JWT/refresh, rate limiting), routes to microservices.
- **Core Services** (containerized, stateless where possible):
  - Auth & Identity
  - User Profile & Preferences
  - Study Sessions & Timers
  - Practice/Questions
  - Pods & RTC Signaling
  - Leaderboard & Analytics
  - Calendar & Notifications
  - Gamification (Rivers/Landscapes)
  - Recommendation/AI
- **Data**:
  - OLTP: PostgreSQL (primary), Redis (caching, sessions, rate limits, timer ticks), S3/GCS (media, assets).
  - OLAP: BigQuery/Redshift for analytics; event bus (Kafka/PubSub) for streams.
- **Realtime**: WebSockets (w/ fallback) for presence, pod timers, leaderboards; WebRTC for A/V with self-hosted TURN.
- **Infra**: Kubernetes, Ingress, autoscaling; CI/CD with lint/test/build; secrets via vault; self-hosted TURN/STUN nodes.

## Frontend Architecture
- **Framework**: Next.js (TypeScript; SSR/SSG for marketing, CSR for app shell); React Query/RTK Query for data.
- **State**:
  - Local/UI: Zustand/Recoil.
  - Server/cache: React Query; WebSocket channel for presence/timers/leaderboards.
- **Auth**: JWT (short-lived) + refresh in httpOnly cookies; OTP screens; guarded routes.
- **Key Modules**:
  - Onboarding (subjects, awake hours, goals)
  - Focus Mode (setup, timer, practice mode, pod selection/opt-out)
  - Pods (presence, A/V via WebRTC SDK, shared timer)
  - Practice player (timed questions, feedback)
  - Post-session review (5 questions, insights)
  - Leaderboards (subject-wise, live)
  - Explore/Profile (stats, streaks, collectibles, custom pods)
  - Calendar (slot view, reschedule suggestions)
  - River/Landscape viewer (progress visualization)
- **Observability**: Sentry, web vitals, feature flags.

## Backend Services (suggested responsibilities)
- **Auth Service**: Signup/login, OTP (email/SMS via provider), password reset, JWT/refresh, RBAC.
- **User Service**: Profile, preferences, awake hours, goals, collectibles.
- **Study Service**: Session lifecycle, timers, break logic, pod/solo mode, session events, missed-session detection.
- **Practice Service**: Question selection (subject/chapter/topic/difficulty), attempt recording, timing, scoring; generates post-session 5 Qs.
- **Pod Service**: Pod assignment, membership, presence; integrates with RTC signaling service (WebRTC); shared timers; pods support audio + video; enforces moderation controls (role, mute/lock, reporting).
- **RTC/Signaling Service**: Token generation for WebRTC A/V, room management, ICE servers (self-hosted TURN/STUN).
- **Leaderboard Service**: Aggregates hours/questions; near-real-time updates via stream.
- **Calendar Service**: Google Calendar sync, conflict checks, reschedule suggestions; slot proposals within awake hours.
- **Gamification Service**: River progression, accessories unlocks, collectibles issuance.
- **Recommendation/AI Service**: Topic difficulty adaptation, practice picks, smart reschedule text, performance feedback.
- **Notification Service**: Email/SMS/push; templates for OTP, reminders, reschedules.
- **Analytics/Event Service**: Event ingestion (Kafka), warehousing, dashboards.

## Data Model (relational sketch)
- users(id, email, phone, password_hash, created_at, rbac_role)
- user_profile(user_id FK, display_name, streak_count, total_hours, total_questions, awake_hours_json, subjects_json)
- auth_otp(id, user_id, channel, code_hash, expires_at, consumed)
- subjects(id, name); chapters(id, subject_id, name); topics(id, chapter_id, name)
- sessions(id, user_id, subject_id, chapter_id, topic_id, mode ENUM{timer, practice}, pod_id NULL, started_at, ended_at, duration_sec, break_plan_json, status ENUM{scheduled, active, completed, missed})
- session_events(id, session_id, event_type, event_payload_json, ts)
- questions(id, subject_id, chapter_id, topic_id, difficulty, body, choices_json, answer, explanation, metadata_json)
- practice_attempts(id, user_id, session_id, question_id, is_correct, time_taken_ms, started_at, ended_at)
- pods(id, subject_id, topic_id, mode, is_private, owner_user_id NULL, status, created_at)
- pod_members(pod_id, user_id, joined_at, left_at)
- leaderboards(subject_id, period ENUM{daily, weekly, all}, total_hours, total_questions, updated_at)
- calendar_slots(id, user_id, start_at, end_at, status ENUM{scheduled, missed, completed, suggested}, source ENUM{app, google}, pod_id NULL)
- collectibles(id, user_id, chapter_id, river_state_json, unlocked_at)
- accessories(id, collectible_id, type, unlocked_at, metadata_json)
- ai_recommendations(id, user_id, type ENUM{practice, reschedule, feedback}, payload_json, created_at, accepted BOOL)

Indexes on user_id, subject/topic, status, time ranges; Redis for presence/timers; materialized views for leaderboards if needed.

## API (representative)
- Auth: POST /auth/signup, POST /auth/login, POST /auth/otp/send, POST /auth/otp/verify, POST /auth/refresh, POST /auth/logout
- User: GET/PUT /user/profile, GET/PUT /user/preferences
- Study: POST /sessions (create w/ mode), POST /sessions/{id}/start, POST /sessions/{id}/complete, POST /sessions/{id}/missed, GET /sessions?range=..., GET /sessions/{id}
- Practice: GET /practice/questions?subject=&topic=&difficulty=, POST /practice/attempts, GET /practice/attempts/{id}, POST /sessions/{id}/post-questions (5 Qs)
- Pods: POST /pods/auto-assign, POST /pods (custom/private), POST /pods/{id}/join, POST /pods/{id}/leave, GET /pods/{id}/presence (WS upgrade), POST /pods/{id}/timer/start|pause|resume
- RTC: POST /rtc/token (room_id, user_id) for SDK/WebRTC
- Leaderboard: GET /leaderboards?subject=&period=
- Calendar: GET /calendar/slots, POST /calendar/slots, POST /calendar/sync/google, POST /calendar/reschedule/suggestions
- Gamification: GET /collectibles, GET /collectibles/{id}, POST /collectibles/{id}/accessories
- Recommendations: GET /recommendations/practice, GET /recommendations/reschedule
- Notifications: POST /notifications/test (internal), webhooks from SMS/email providers
- Analytics: POST /events (batched), GET /metrics (internal/admin)

## Development Task Breakdown
- **Architecture & Foundations**
  - Define repo structure (frontend, backend services, shared contracts/SDK).
  - Set up CI/CD, lint/format/test, Docker/K8s manifests, env/secrets management.
  - Implement API gateway + auth middleware (JWT/refresh, RBAC, rate limit).
- **Auth & Onboarding**
  - Email/SMS OTP flows; password login; secure password storage.
  - Onboarding screens; store subjects/awake hours/goals.
- **User/Profile**
  - Profile CRUD, preferences, streak logic, stats aggregation hooks.
- **Study Sessions**
  - Session creation, timer control, break plans; missed-session detection.
  - WebSocket timer/presence plumbing; persistence of events.
- **Practice Engine**
  - Question fetch by filters; timed attempts; scoring and feedback storage.
  - Post-session 5-question generator; adaptive difficulty stub + hooks to AI.
- **Pods & RTC**
  - Pod matching/creation APIs; presence service; shared timer sync.
  - Integrate WebRTC signaling; self-hosted TURN/STUN config; UI for join/leave/mute/cam; implement moderation controls.
- **Leaderboards**
  - Aggregation workers (stream consumers); API for subject/period; live push channel.
- **Calendar & Reschedule**
  - Google Calendar OAuth + sync; conflict checks; awake-hours constraint.
  - Suggest/reschedule flow; confirmation UI; notifications.
- **Gamification (Rivers)**
  - Data model for rivers/accessories/collectibles; progression rules; profile display.
- **Recommendations/AI**
  - Service contract; baseline heuristic recommender; interfaces for LLM/scoring.
  - Feedback generation for attempts; topic strength/weakness summarization.
- **Notifications**
  - Provider integration (email/SMS/push); templating; reminders for sessions/pods.
- **Frontend Delivery**
  - App shell, routing, guarded routes; design system.
  - Screens: onboarding, focus mode, practice player, pods, leaderboards, profile/explore, calendar/reschedule, river view.
  - WebSocket integration for timers/presence/leaderboards; optimistic UI for pod actions.
- **Analytics & Observability**
  - Event schema, ingestion API; dashboards; SLOs.
  - Logging/tracing/metrics; error reporting on FE/BE.

## Pod Moderation Controls (MVP)
- **Roles**: Host (creator/first joiner) and participants; roles reset per pod session.
- **Audio**: Everyone can mute/unmute self; host can mute individuals or all; muted users cooldown 30s before self-unmute.
- **Video**: Everyone can toggle camera; host can disable video per user or all; cameras default OFF on join.
- **Room**: Host can lock pod and end session; system auto-ends when all leave or study session completes.
- **Reporting**: In-pod report button (spam/inappropriate/harassment); reported user auto-muted; backend logs reporter, reported, pod, timestamp; manual review.
- **Safeguards**: Join rate limits, rejoin cooldown after exit, configurable max pod size (e.g., 6–8), speaking/mute/camera/focus indicators; auto-reconnect with fallback to audio-only; host disconnect reassigns host to longest-present member.

## AI Agent Work Packages
- **Backend Foundations (Claude/Codex)**: Scaffold repo, API gateway, auth middleware (JWT/refresh/RBAC), common proto/OpenAPI contracts, base CI/CD and Docker/K8s manifests.
- **Auth & Onboarding (Codex)**: Implement signup/login/password + OTP (email/SMS), onboarding prefs (subjects, awake hours, goals), secure password hashing, rate limits.
- **Study Sessions & Timers (Claude)**: Session CRUD, state machine, timer/break logic, WebSocket eventing, missed-session detection.
- **Practice Engine (Codex)**: Question filters, attempt recording, timing/scoring, post-session 5-question generator, AI hook for difficulty adaptation.
- **Pods & Signaling (Claude)**: Pod assignment/custom pods, presence, shared timers, WebRTC signaling integration, self-hosted TURN/STUN config, moderation controls enforcement.
- **RTC Client & UI (Codex)**: WebRTC client flows (audio/video), device selection, mute/cam toggles, host controls (mute all/lock/end), indicators, reconnect/fallback.
- **Leaderboards & Streams (Claude)**: Stream consumers from Kafka/PubSub, aggregation jobs, API + live push channel.
- **Calendar & Reschedule (Codex)**: Google Calendar OAuth/sync, conflict checks, awake-hours constraints, reschedule suggestions, confirmation UX, notifications.
- **Gamification (Claude)**: River/accessory/collectible models, progression rules, profile display APIs.
- **Recommendations/AI (Claude)**: Baseline heuristic recommender, feedback text generation, topic strength summaries, acceptance logging.
- **Notifications (Codex)**: Provider adapters (email/SMS/push), templating, reminders for sessions/pods/reschedules.
- **Frontend App (Codex)**: Next.js TS app shell, routing, guarded routes, design system; pages for onboarding, focus mode, practice player, pods, leaderboards, profile/explore, calendar, river view; React Query + WebSocket wiring; optimistic pod actions.
- **Observability & SLOs (Claude)**: Logging/tracing/metrics setup, dashboards, error reporting, SLO definitions for latency/reliability; load/perf test harness.
- **Security & Abuse (Claude)**: Rate limits, OTP abuse checks, join/rejoin throttles, report logging pipeline, cooldown enforcement, audit trails.
- **Data & Migrations (Codex)**: PostgreSQL schema migrations, seed/reference data (subjects/chapters/topics), indexes, materialized views for leaderboards.
- **QA & Release (Codex)**: Automated tests (unit/integration/e2e smoke), CI gates, canary deploy scripts, rollout/checklist.

Next steps: sequence work in sprints, attach owners (per agent), and add acceptance criteria per work package.

