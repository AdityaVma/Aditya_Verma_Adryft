# Study Collaboration App MVP

A study collaboration platform enabling students to study with AI-powered practice, join 1-on-1 audio study pods, track progress through leaderboards, and maintain focus with timer-based sessions.

## Tech Stack

- **Frontend**: Next.js 14 (TypeScript, React, Tailwind CSS)
- **Backend**: Node.js/TypeScript microservices (Express.js)
- **Database**: PostgreSQL 15 (Prisma ORM)
- **Cache**: Redis 7
- **Real-time**: WebSocket (API Gateway), Amazon Chime SDK (audio calls)
- **AI**: Amazon Bedrock (Claude for practice feedback)
- **Infrastructure**: AWS (ECS Fargate, RDS, ElastiCache, EventBridge)

## Project Structure

```
.
├── apps/
│   └── web/                 # Next.js frontend
├── services/
│   ├── auth/                # Authentication service (port 3001)
│   ├── user/                # User profile service (port 3002)
│   ├── study/               # Study session service (port 3003/3004)
│   ├── practice/            # Practice question service (port 3005)
│   ├── pod/                 # Pod management service (port 3006)
│   ├── leaderboard/         # Leaderboard service (port 3007)
│   ├── reference/           # Subject/topic reference data service (port 3008)
│   ├── websocket/           # WebSocket service (port 3009)
│   └── jobs/                # Background jobs scheduler
├── packages/
│   ├── types/               # Shared TypeScript types
│   └── db/                  # Prisma database client
└── docker-compose.yml       # Local development environment
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker and Docker Compose

### Installation

1. Clone the repository and install dependencies:

```bash
pnpm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Start local database and Redis:

```bash
pnpm docker:up
```

4. Generate Prisma client and run migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

5. Seed the database with initial data:

```bash
cd packages/db
pnpm prisma:seed
```

### Development

Start all services in development mode:

```bash
pnpm dev
```

Individual commands:

- `pnpm build` - Build all packages and services
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all code
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Type check all TypeScript
- `pnpm db:studio` - Open Prisma Studio (database GUI)

### Docker Commands

- `pnpm docker:up` - Start PostgreSQL and Redis
- `pnpm docker:down` - Stop and remove containers

## Architecture

The system follows a microservices architecture with 9 core services:

1. **Auth Service (3001)** - User authentication, JWT tokens, OTP verification
2. **User Service (3002)** - Profile management, onboarding, statistics
3. **Study Service (3003/3004)** - Session lifecycle, timers, WebSocket updates
4. **Practice Service (3005)** - Question delivery, adaptive difficulty, AI feedback
5. **Pod Service (3006)** - 1-on-1 pod matching, Chime SDK integration
6. **Leaderboard Service (3007)** - Score aggregation, rankings, real-time updates
7. **Reference Service (3008)** - Subject and topic reference data
8. **WebSocket Service (3009)** - Real-time WebSocket connections and broadcasting
9. **Jobs Service** - Background jobs (session cleanup, data archival, leaderboard reconciliation)

## Features

### MVP Scope

- ✅ User authentication (email/password, OTP)
- ✅ Study sessions with focus timers
- ✅ AI-powered adaptive practice questions
- ✅ 1-on-1 audio study pods
- ✅ Subject-based leaderboards
- ✅ User statistics and streaks

### Post-MVP

- Video calls in pods
- Group pods (3+ users)
- Mobile apps (React Native)
- Calendar integration
- Gamification (rivers/landscapes)
- Advanced AI recommendations

## Database Schema

See `packages/db/prisma/schema.prisma` for the complete schema.

Key models:
- `User` - User accounts
- `UserProfile` - User preferences and statistics
- `Session` - Study sessions
- `Question` - Practice questions
- `PracticeAttempt` - Question attempts with AI feedback
- `Pod` - Study pods
- `PodMembership` - Pod membership records
- `Subject` & `Topic` - Content organization

## API Documentation

API documentation will be available at `/api/docs` when services are running.

## Testing

```bash
# Run all tests
pnpm test

# Run tests for specific service
pnpm --filter @study-collab/auth-service test

# Run tests in watch mode
pnpm --filter @study-collab/auth-service test:watch
```

## Deployment (AWS)

Deploy the full stack to AWS with CDK:

1. **Prerequisites**: AWS CLI configured, Docker, Node 20+, pnpm. Run `pnpm install` from the repo root.
2. **Secrets**: Create `study-collab/jwt` in Secrets Manager with `JWT_SECRET` and `JWT_REFRESH_SECRET` (see [docs/DEPLOY_AWS.md](docs/DEPLOY_AWS.md)).
3. **Bootstrap** (once per account/region): `cd infrastructure && npx cdk bootstrap`
4. **Deploy**: `cd infrastructure && npx cdk deploy --all`
5. **Build & push images**: From repo root, `./scripts/build-push-ecr.sh <REGION> <ACCOUNT_ID>`
6. **Migrations**: Run Prisma migrate and seed against the RDS endpoint (see deploy doc).

Full step-by-step guide: **[docs/DEPLOY_AWS.md](docs/DEPLOY_AWS.md)**.

## Contributing

This is an MVP project. Contribution guidelines will be added as the project matures.

## License

Proprietary - All rights reserved
