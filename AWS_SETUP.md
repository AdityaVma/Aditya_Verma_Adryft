# AWS Setup Guide

## Prerequisites

- AWS Account with credits
- AWS CLI installed and configured
- Appropriate IAM permissions

## 1. RDS PostgreSQL Setup

### Via AWS Console:

1. Go to AWS RDS Console
2. Click "Create database"
3. Choose:
   - Engine: PostgreSQL 15
   - Template: Free tier (or Dev/Test for better performance)
   - DB instance identifier: `study-collab-db`
   - Master username: `studycollab`
   - Master password: (create a strong password)
   - Instance configuration: db.t3.micro (free tier) or db.t3.small
   - Storage: 20 GB SSD
   - Enable automatic backups
   - Public access: Yes (for development, No for production)
   - VPC security group: Create new or use existing
4. Click "Create database"
5. Wait for status to become "Available"
6. Copy the endpoint URL

### Connection String Format:
```
postgresql://studycollab:YOUR_PASSWORD@your-endpoint.region.rds.amazonaws.com:5432/postgres
```

## 2. ElastiCache Redis Setup

### Via AWS Console:

1. Go to AWS ElastiCache Console
2. Click "Create" → "Redis cluster"
3. Choose:
   - Cluster mode: Disabled (for MVP)
   - Name: `study-collab-redis`
   - Engine version: 7.x
   - Node type: cache.t3.micro (free tier eligible)
   - Number of replicas: 0 (for MVP)
   - Subnet group: Create new or use existing
   - Security group: Same as RDS or create new
4. Click "Create"
5. Wait for status to become "Available"
6. Copy the primary endpoint

### Connection String Format:
```
redis://your-endpoint.region.cache.amazonaws.com:6379
```

## 3. Security Group Configuration

Ensure your security group allows:
- PostgreSQL: Port 5432 from your IP
- Redis: Port 6379 from your IP
- For production: Only allow from your VPC/ECS tasks

## 4. Update Environment Variables

Create `.env` file in project root:

```bash
# Database
DATABASE_URL="postgresql://studycollab:YOUR_PASSWORD@your-rds-endpoint.region.rds.amazonaws.com:5432/postgres"

# Redis
REDIS_URL="redis://your-redis-endpoint.region.cache.amazonaws.com:6379"

# JWT Secrets (generate strong random strings)
JWT_SECRET="your-32-character-or-longer-secret-key"
JWT_REFRESH_SECRET="your-32-character-or-longer-refresh-secret"

# AWS Configuration
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"

# Environment
NODE_ENV="development"
```

## 5. Initialize Database

Once RDS is ready:

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed initial data
cd packages/db
pnpm prisma:seed
```

## 6. Test Connection

```bash
# Test database connection
cd packages/db
pnpm prisma studio

# Test Redis connection
redis-cli -h your-redis-endpoint.region.cache.amazonaws.com ping
```

## Cost Optimization Tips

1. **Free Tier Eligible Resources:**
   - RDS: db.t3.micro with 20GB storage (750 hours/month free for 12 months)
   - ElastiCache: cache.t3.micro (750 hours/month free for 12 months)

2. **Stop Resources When Not in Use:**
   - RDS can be stopped for up to 7 days
   - ElastiCache: Delete and recreate when needed (data is not persistent in dev)

3. **Use AWS Credits:**
   - Apply your credits in AWS Billing Console
   - Monitor usage in Cost Explorer

## Troubleshooting

### Cannot connect to RDS:
- Check security group allows your IP on port 5432
- Verify "Public accessibility" is enabled
- Check VPC and subnet configuration

### Cannot connect to Redis:
- Check security group allows your IP on port 6379
- Verify you're using the primary endpoint
- Check VPC and subnet configuration

### Connection timeout:
- Ensure resources are in "Available" state
- Check network connectivity
- Verify endpoint URLs are correct
