#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { NetworkStack } from '../lib/network-stack'
import { DatabaseStack } from '../lib/database-stack'
import { EcsStack } from '../lib/ecs-stack'
import { ApiGatewayStack } from '../lib/apigateway-stack'
import { EventBridgeStack } from '../lib/eventbridge-stack'

const app = new cdk.App()

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
}

// Network infrastructure
const networkStack = new NetworkStack(app, 'StudyCollabNetworkStack', {
  env,
  description: 'VPC and networking resources for Study Collab',
})

// Database and cache
const databaseStack = new DatabaseStack(app, 'StudyCollabDatabaseStack', {
  env,
  vpc: networkStack.vpc,
  description: 'RDS PostgreSQL and ElastiCache Redis for Study Collab',
})

// ECS cluster and services
const ecsStack = new EcsStack(app, 'StudyCollabEcsStack', {
  env,
  vpc: networkStack.vpc,
  databaseSecurityGroup: databaseStack.databaseSecurityGroup,
  cacheSecurityGroup: databaseStack.cacheSecurityGroup,
  databaseSecret: databaseStack.databaseSecret,
  redisEndpoint: databaseStack.redisEndpoint,
  description: 'ECS Fargate services for Study Collab',
})

// API Gateway
const apiGatewayStack = new ApiGatewayStack(app, 'StudyCollabApiGatewayStack', {
  env,
  vpc: networkStack.vpc,
  loadBalancer: ecsStack.loadBalancer,
  description: 'API Gateway and WebSocket API for Study Collab',
})

// EventBridge
const eventBridgeStack = new EventBridgeStack(app, 'StudyCollabEventBridgeStack', {
  env,
  description: 'EventBridge event bus for Study Collab',
})

// Add dependencies
databaseStack.addDependency(networkStack)
ecsStack.addDependency(databaseStack)
apiGatewayStack.addDependency(ecsStack)

app.synth()
