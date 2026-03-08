# Deploy Study Collab to AWS

This guide walks you through connecting and deploying the Study Collaboration App on AWS using CDK.

## Prerequisites

- **AWS Account** with permissions for VPC, RDS, ElastiCache, ECS, ECR, API Gateway, EventBridge, IAM, Secrets Manager
- **AWS CLI** installed and configured (`aws configure`)
- **Node.js 20+** and **pnpm 8+**
- **Docker** (for building and pushing container images)

Install dependencies from the **repository root** before deploying:

```bash
pnpm install
```

## Architecture Overview

- **VPC** with public, private, and isolated subnets
- **RDS PostgreSQL 15** and **ElastiCache Redis 7** in isolated subnets
- **ECS Fargate** cluster with one service per backend (auth, user, study, practice, pod, leaderboard, reference)
- **Application Load Balancer** with path-based routing (`/api/auth*`, `/api/user*`, etc.)
- **API Gateway** (REST) in front of the ALB for a single public API URL
- **EventBridge** for session-completed events (leaderboard updates)
- **ECR** repositories for each service image

## Step 1: Bootstrap CDK (once per account/region)

```bash
cd infrastructure
pnpm install
npx cdk bootstrap aws://ACCOUNT_ID/REGION
```

Replace `ACCOUNT_ID` and `REGION` (e.g. `us-east-1`). If you use the default profile, you can run:

```bash
npx cdk bootstrap
```

## Step 2: Create required secrets in AWS

Backend services need JWT and (optionally) OTP secrets. Create them in Secrets Manager **before** first deploy:

```bash
# JWT secrets (required for auth, user, and all services that validate tokens)
aws secretsmanager create-secret \
  --name study-collab/jwt \
  --secret-string '{"JWT_SECRET":"YOUR_32_CHAR_OR_LONGER_ACCESS_SECRET","JWT_REFRESH_SECRET":"YOUR_32_CHAR_OR_LONGER_REFRESH_SECRET"}'

# Optional: OTP / email (if you use OTP)
# aws secretsmanager create-secret --name study-collab/otp --secret-string '{"OTP_SECRET":"..."}'
```

Generate strong values, e.g.:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 3: Build and push Docker images

Each service must be built and pushed to ECR. The CDK stack creates ECR repositories; deploy the stacks first (Step 4), then push images.

From the **repository root**, use the shared backend Dockerfile and build arg `SERVICE`:

```bash
# Set registry (replace ACCOUNT_ID and REGION)
export ECR_REGISTRY=ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com
aws ecr get-login-password --region REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Build and push all services
./scripts/build-push-ecr.sh REGION ACCOUNT_ID
```

Or build/push one service:

```bash
docker build -f Dockerfile.backend --build-arg SERVICE=auth -t $ECR_REGISTRY/study-collab-auth:latest .
docker push $ECR_REGISTRY/study-collab-auth:latest
```

## Step 4: Deploy CDK stacks

From the **repository root** (so that `infrastructure` and `packages` are available):

```bash
cd infrastructure
pnpm install
pnpm run build
npx cdk deploy --all --require-approval never
```

Or deploy in order (recommended first time):

```bash
npx cdk deploy StudyCollabNetworkStack
npx cdk deploy StudyCollabDatabaseStack
npx cdk deploy StudyCollabEcsStack
npx cdk deploy StudyCollabApiGatewayStack
npx cdk deploy StudyCollabEventBridgeStack
```

Note: The database stack creates RDS and ElastiCache; it may take 10–15 minutes. After the first deploy, a one-time custom resource runs to write the RDS connection string into the database secret.

## Step 5: Run database migrations

After the first deploy, run Prisma migrations against the RDS instance. Use the connection string from Secrets Manager:

```bash
# Get DATABASE_URL from Secrets Manager (replace SECRET_ARN with output from CDK)
aws secretsmanager get-secret-value --secret-id study-collab/database --query SecretString --output text | jq -r '.connectionString // "postgresql://"+.username+":"+.password+"@RDS_ENDPOINT:5432/studycollab"'
```

Set `DATABASE_URL` and run migrations from the `packages/db` package:

```bash
cd packages/db
export DATABASE_URL="postgresql://..."
pnpm prisma migrate deploy
pnpm prisma db seed
```

You can run this from a machine that can reach RDS (e.g. a bastion, or temporarily from your laptop if RDS is in a public subnet for dev). For production, run migrations from a one-off ECS task or CI/CD.

## Step 6: Frontend configuration

Point the Next.js app to the deployed API:

1. Set `NEXT_PUBLIC_API_URL` to your API Gateway REST API URL (from CDK output `StudyCollabApiGatewayStack.RestApiUrl`).
2. Set `NEXT_PUBLIC_WS_URL` to your WebSocket API URL if you use it (from `StudyCollabApiGatewayStack.WebSocketApiUrl`).

Example `.env.production` for the web app:

```env
NEXT_PUBLIC_API_URL=https://xxxx.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_WS_URL=wss://xxxx.execute-api.us-east-1.amazonaws.com/prod
```

Then build and deploy the Next.js app (e.g. Vercel, Amplify, or S3 + CloudFront):

```bash
cd apps/web
pnpm build
```

## Step 7: Get outputs

After deploy, useful outputs:

```bash
npx cdk deploy --outputs-file ../cdk-outputs.json
```

Or from the AWS Console:

- **REST API URL**: API Gateway → study-collab-api → Stages → prod → Invoke URL
- **ALB DNS**: EC2 → Load Balancers → study-collab-alb
- **ECS Cluster**: ECS → Clusters → study-collab-cluster
- **RDS endpoint**: RDS → Databases → (your instance)
- **Redis endpoint**: ElastiCache → Redis → (your cluster)

## Cost and cleanup

- **Development**: Use single-AZ RDS and Redis, one NAT gateway, and minimal ECS tasks to reduce cost.
- **Destroy** (remove all resources):

```bash
cd infrastructure
npx cdk destroy --all
```

Delete the Secrets Manager secrets and ECR images if you want to remove everything.

## Troubleshooting

| Issue | Check |
|-------|--------|
| 502/503 from API | ECS tasks healthy? Target groups show healthy targets? Security groups allow ALB → tasks and tasks → RDS/Redis? |
| Database connection failed | Secret has `connectionString`? Run the custom resource (re-deploy Database stack). Security group allows ECS → RDS on 5432. |
| Auth returns 401 | JWT secret created in Secrets Manager as `study-collab/jwt` with `JWT_SECRET` and `JWT_REFRESH_SECRET`? |
| Images not found | ECR repos created by ECS stack; build and push images with the same names (`study-collab-auth`, etc.). |

## Next steps

- Add a custom domain to API Gateway and use ACM certificates.
- Deploy the Next.js app to Amplify or S3/CloudFront and set CORS on the API.
- Enable WAF on API Gateway for production.
- Turn on RDS and ElastiCache backups and multi-AZ if needed.
