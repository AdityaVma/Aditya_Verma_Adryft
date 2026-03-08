#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const network_stack_1 = require("../lib/network-stack");
const database_stack_1 = require("../lib/database-stack");
const ecs_stack_1 = require("../lib/ecs-stack");
const apigateway_stack_1 = require("../lib/apigateway-stack");
const eventbridge_stack_1 = require("../lib/eventbridge-stack");
const app = new cdk.App();
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};
// Network infrastructure
const networkStack = new network_stack_1.NetworkStack(app, 'StudyCollabNetworkStack', {
    env,
    description: 'VPC and networking resources for Study Collab',
});
// Database and cache
const databaseStack = new database_stack_1.DatabaseStack(app, 'StudyCollabDatabaseStack', {
    env,
    vpc: networkStack.vpc,
    description: 'RDS PostgreSQL and ElastiCache Redis for Study Collab',
});
// ECS cluster and services
const ecsStack = new ecs_stack_1.EcsStack(app, 'StudyCollabEcsStack', {
    env,
    vpc: networkStack.vpc,
    databaseSecurityGroup: databaseStack.databaseSecurityGroup,
    cacheSecurityGroup: databaseStack.cacheSecurityGroup,
    databaseSecret: databaseStack.databaseSecret,
    redisEndpoint: databaseStack.redisEndpoint,
    description: 'ECS Fargate services for Study Collab',
});
// API Gateway
const apiGatewayStack = new apigateway_stack_1.ApiGatewayStack(app, 'StudyCollabApiGatewayStack', {
    env,
    vpc: networkStack.vpc,
    loadBalancer: ecsStack.loadBalancer,
    description: 'API Gateway and WebSocket API for Study Collab',
});
// EventBridge
const eventBridgeStack = new eventbridge_stack_1.EventBridgeStack(app, 'StudyCollabEventBridgeStack', {
    env,
    description: 'EventBridge event bus for Study Collab',
});
// Add dependencies
databaseStack.addDependency(networkStack);
ecsStack.addDependency(databaseStack);
apiGatewayStack.addDependency(ecsStack);
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFvQztBQUNwQyxpREFBa0M7QUFDbEMsd0RBQW1EO0FBQ25ELDBEQUFxRDtBQUNyRCxnREFBMkM7QUFDM0MsOERBQXlEO0FBQ3pELGdFQUEyRDtBQUUzRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtBQUV6QixNQUFNLEdBQUcsR0FBRztJQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtJQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxXQUFXO0NBQ3RELENBQUE7QUFFRCx5QkFBeUI7QUFDekIsTUFBTSxZQUFZLEdBQUcsSUFBSSw0QkFBWSxDQUFDLEdBQUcsRUFBRSx5QkFBeUIsRUFBRTtJQUNwRSxHQUFHO0lBQ0gsV0FBVyxFQUFFLCtDQUErQztDQUM3RCxDQUFDLENBQUE7QUFFRixxQkFBcUI7QUFDckIsTUFBTSxhQUFhLEdBQUcsSUFBSSw4QkFBYSxDQUFDLEdBQUcsRUFBRSwwQkFBMEIsRUFBRTtJQUN2RSxHQUFHO0lBQ0gsR0FBRyxFQUFFLFlBQVksQ0FBQyxHQUFHO0lBQ3JCLFdBQVcsRUFBRSx1REFBdUQ7Q0FDckUsQ0FBQyxDQUFBO0FBRUYsMkJBQTJCO0FBQzNCLE1BQU0sUUFBUSxHQUFHLElBQUksb0JBQVEsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUU7SUFDeEQsR0FBRztJQUNILEdBQUcsRUFBRSxZQUFZLENBQUMsR0FBRztJQUNyQixxQkFBcUIsRUFBRSxhQUFhLENBQUMscUJBQXFCO0lBQzFELGtCQUFrQixFQUFFLGFBQWEsQ0FBQyxrQkFBa0I7SUFDcEQsY0FBYyxFQUFFLGFBQWEsQ0FBQyxjQUFjO0lBQzVDLGFBQWEsRUFBRSxhQUFhLENBQUMsYUFBYTtJQUMxQyxXQUFXLEVBQUUsdUNBQXVDO0NBQ3JELENBQUMsQ0FBQTtBQUVGLGNBQWM7QUFDZCxNQUFNLGVBQWUsR0FBRyxJQUFJLGtDQUFlLENBQUMsR0FBRyxFQUFFLDRCQUE0QixFQUFFO0lBQzdFLEdBQUc7SUFDSCxHQUFHLEVBQUUsWUFBWSxDQUFDLEdBQUc7SUFDckIsWUFBWSxFQUFFLFFBQVEsQ0FBQyxZQUFZO0lBQ25DLFdBQVcsRUFBRSxnREFBZ0Q7Q0FDOUQsQ0FBQyxDQUFBO0FBRUYsY0FBYztBQUNkLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxvQ0FBZ0IsQ0FBQyxHQUFHLEVBQUUsNkJBQTZCLEVBQUU7SUFDaEYsR0FBRztJQUNILFdBQVcsRUFBRSx3Q0FBd0M7Q0FDdEQsQ0FBQyxDQUFBO0FBRUYsbUJBQW1CO0FBQ25CLGFBQWEsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDekMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUNyQyxlQUFlLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0FBRXZDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcclxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcclxuaW1wb3J0IHsgTmV0d29ya1N0YWNrIH0gZnJvbSAnLi4vbGliL25ldHdvcmstc3RhY2snXHJcbmltcG9ydCB7IERhdGFiYXNlU3RhY2sgfSBmcm9tICcuLi9saWIvZGF0YWJhc2Utc3RhY2snXHJcbmltcG9ydCB7IEVjc1N0YWNrIH0gZnJvbSAnLi4vbGliL2Vjcy1zdGFjaydcclxuaW1wb3J0IHsgQXBpR2F0ZXdheVN0YWNrIH0gZnJvbSAnLi4vbGliL2FwaWdhdGV3YXktc3RhY2snXHJcbmltcG9ydCB7IEV2ZW50QnJpZGdlU3RhY2sgfSBmcm9tICcuLi9saWIvZXZlbnRicmlkZ2Utc3RhY2snXHJcblxyXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpXHJcblxyXG5jb25zdCBlbnYgPSB7XHJcbiAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcclxuICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxufVxyXG5cclxuLy8gTmV0d29yayBpbmZyYXN0cnVjdHVyZVxyXG5jb25zdCBuZXR3b3JrU3RhY2sgPSBuZXcgTmV0d29ya1N0YWNrKGFwcCwgJ1N0dWR5Q29sbGFiTmV0d29ya1N0YWNrJywge1xyXG4gIGVudixcclxuICBkZXNjcmlwdGlvbjogJ1ZQQyBhbmQgbmV0d29ya2luZyByZXNvdXJjZXMgZm9yIFN0dWR5IENvbGxhYicsXHJcbn0pXHJcblxyXG4vLyBEYXRhYmFzZSBhbmQgY2FjaGVcclxuY29uc3QgZGF0YWJhc2VTdGFjayA9IG5ldyBEYXRhYmFzZVN0YWNrKGFwcCwgJ1N0dWR5Q29sbGFiRGF0YWJhc2VTdGFjaycsIHtcclxuICBlbnYsXHJcbiAgdnBjOiBuZXR3b3JrU3RhY2sudnBjLFxyXG4gIGRlc2NyaXB0aW9uOiAnUkRTIFBvc3RncmVTUUwgYW5kIEVsYXN0aUNhY2hlIFJlZGlzIGZvciBTdHVkeSBDb2xsYWInLFxyXG59KVxyXG5cclxuLy8gRUNTIGNsdXN0ZXIgYW5kIHNlcnZpY2VzXHJcbmNvbnN0IGVjc1N0YWNrID0gbmV3IEVjc1N0YWNrKGFwcCwgJ1N0dWR5Q29sbGFiRWNzU3RhY2snLCB7XHJcbiAgZW52LFxyXG4gIHZwYzogbmV0d29ya1N0YWNrLnZwYyxcclxuICBkYXRhYmFzZVNlY3VyaXR5R3JvdXA6IGRhdGFiYXNlU3RhY2suZGF0YWJhc2VTZWN1cml0eUdyb3VwLFxyXG4gIGNhY2hlU2VjdXJpdHlHcm91cDogZGF0YWJhc2VTdGFjay5jYWNoZVNlY3VyaXR5R3JvdXAsXHJcbiAgZGF0YWJhc2VTZWNyZXQ6IGRhdGFiYXNlU3RhY2suZGF0YWJhc2VTZWNyZXQsXHJcbiAgcmVkaXNFbmRwb2ludDogZGF0YWJhc2VTdGFjay5yZWRpc0VuZHBvaW50LFxyXG4gIGRlc2NyaXB0aW9uOiAnRUNTIEZhcmdhdGUgc2VydmljZXMgZm9yIFN0dWR5IENvbGxhYicsXHJcbn0pXHJcblxyXG4vLyBBUEkgR2F0ZXdheVxyXG5jb25zdCBhcGlHYXRld2F5U3RhY2sgPSBuZXcgQXBpR2F0ZXdheVN0YWNrKGFwcCwgJ1N0dWR5Q29sbGFiQXBpR2F0ZXdheVN0YWNrJywge1xyXG4gIGVudixcclxuICB2cGM6IG5ldHdvcmtTdGFjay52cGMsXHJcbiAgbG9hZEJhbGFuY2VyOiBlY3NTdGFjay5sb2FkQmFsYW5jZXIsXHJcbiAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBhbmQgV2ViU29ja2V0IEFQSSBmb3IgU3R1ZHkgQ29sbGFiJyxcclxufSlcclxuXHJcbi8vIEV2ZW50QnJpZGdlXHJcbmNvbnN0IGV2ZW50QnJpZGdlU3RhY2sgPSBuZXcgRXZlbnRCcmlkZ2VTdGFjayhhcHAsICdTdHVkeUNvbGxhYkV2ZW50QnJpZGdlU3RhY2snLCB7XHJcbiAgZW52LFxyXG4gIGRlc2NyaXB0aW9uOiAnRXZlbnRCcmlkZ2UgZXZlbnQgYnVzIGZvciBTdHVkeSBDb2xsYWInLFxyXG59KVxyXG5cclxuLy8gQWRkIGRlcGVuZGVuY2llc1xyXG5kYXRhYmFzZVN0YWNrLmFkZERlcGVuZGVuY3kobmV0d29ya1N0YWNrKVxyXG5lY3NTdGFjay5hZGREZXBlbmRlbmN5KGRhdGFiYXNlU3RhY2spXHJcbmFwaUdhdGV3YXlTdGFjay5hZGREZXBlbmRlbmN5KGVjc1N0YWNrKVxyXG5cclxuYXBwLnN5bnRoKClcclxuIl19