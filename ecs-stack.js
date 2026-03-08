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
exports.EcsStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const ecr = __importStar(require("aws-cdk-lib/aws-ecr"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const SERVICES = [
    { name: 'auth', port: 3001, pathPrefix: '/api/auth' },
    { name: 'user', port: 3002, pathPrefix: '/api/user' },
    { name: 'study', port: 3003, pathPrefix: '/api/study' },
    { name: 'practice', port: 3005, pathPrefix: '/api/practice' },
    { name: 'pod', port: 3006, pathPrefix: '/api/pods' },
    { name: 'leaderboard', port: 3007, pathPrefix: '/api/leaderboard' },
    { name: 'reference', port: 3008, pathPrefix: '/api/reference' },
];
class EcsStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { vpc, databaseSecurityGroup, cacheSecurityGroup, databaseSecret, redisEndpoint } = props;
        // ECS Cluster
        this.cluster = new ecs.Cluster(this, 'Cluster', {
            vpc,
            clusterName: 'study-collab-cluster',
            containerInsights: true,
        });
        // Application Load Balancer
        this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
            vpc,
            internetFacing: true,
            loadBalancerName: 'study-collab-alb',
        });
        // Service security group (allow ALB to reach all service ports)
        const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
            vpc,
            description: 'Security group for ECS services',
            allowAllOutbound: true,
        });
        const albSg = this.loadBalancer.connections.securityGroups[0];
        for (const { port } of SERVICES) {
            serviceSecurityGroup.addIngressRule(ec2.Peer.securityGroupId(albSg.securityGroupId), ec2.Port.tcp(port), `Allow ALB to service port ${port}`);
        }
        databaseSecurityGroup.addIngressRule(serviceSecurityGroup, ec2.Port.tcp(5432), 'Allow ECS to RDS');
        cacheSecurityGroup.addIngressRule(serviceSecurityGroup, ec2.Port.tcp(6379), 'Allow ECS to Redis');
        // JWT secret (must exist: study-collab/jwt with JWT_SECRET, JWT_REFRESH_SECRET)
        const jwtSecret = secretsmanager.Secret.fromSecretNameV2(this, 'JwtSecret', 'study-collab/jwt');
        // Listener with path-based rules (default: fixed 404)
        const listener = this.loadBalancer.addListener('HttpListener', {
            port: 80,
            defaultAction: elbv2.ListenerAction.fixedResponse(404, {
                contentType: 'application/json',
                messageBody: JSON.stringify({ error: 'Not Found', path: 'No matching service' }),
            }),
        });
        for (const svc of SERVICES) {
            const targetGroup = new elbv2.ApplicationTargetGroup(this, `${svc.name}TargetGroup`, {
                vpc,
                port: svc.port,
                protocol: elbv2.ApplicationProtocol.HTTP,
                targetType: elbv2.TargetType.IP,
                healthCheck: {
                    path: '/health',
                    interval: cdk.Duration.seconds(30),
                    timeout: cdk.Duration.seconds(5),
                    healthyThresholdCount: 2,
                    unhealthyThresholdCount: 3,
                },
            });
            listener.addAction(`${svc.name}Rule`, {
                priority: SERVICES.indexOf(svc) + 1,
                conditions: [elbv2.ListenerCondition.pathPatterns([`${svc.pathPrefix}*`, `${svc.pathPrefix}`])],
                action: elbv2.ListenerAction.forward([targetGroup]),
            });
            this.createService(svc.name, svc.port, vpc, serviceSecurityGroup, targetGroup, databaseSecret, redisEndpoint, jwtSecret);
        }
        new cdk.CfnOutput(this, 'LoadBalancerDNS', {
            value: this.loadBalancer.loadBalancerDnsName,
            description: 'Application Load Balancer DNS',
            exportName: 'StudyCollabALBDns',
        });
        new cdk.CfnOutput(this, 'ClusterName', {
            value: this.cluster.clusterName,
            description: 'ECS Cluster Name',
            exportName: 'StudyCollabClusterName',
        });
    }
    createService(serviceName, port, vpc, securityGroup, targetGroup, databaseSecret, redisEndpoint, jwtSecret) {
        const repo = new ecr.Repository(this, `${serviceName}Repo`, {
            repositoryName: `study-collab-${serviceName}`,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
        const taskDefinition = new ecs.FargateTaskDefinition(this, `${serviceName}TaskDef`, {
            memoryLimitMiB: 512,
            cpu: 256,
        });
        databaseSecret.grantRead(taskDefinition.taskRole);
        jwtSecret.grantRead(taskDefinition.taskRole);
        if (serviceName === 'practice') {
            taskDefinition.taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'));
        }
        if (serviceName === 'pod') {
            taskDefinition.taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonChimeSDKMediaPipelinesServiceLinkedRolePolicy'));
        }
        const logGroup = new logs.LogGroup(this, `${serviceName}LogGroup`, {
            logGroupName: `/ecs/study-collab/${serviceName}`,
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const container = taskDefinition.addContainer(`${serviceName}Container`, {
            image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: serviceName,
                logGroup,
            }),
            environment: {
                PORT: port.toString(),
                NODE_ENV: 'production',
                REDIS_URL: `redis://${redisEndpoint}:6379`,
            },
            secrets: {
                DATABASE_URL: ecs.Secret.fromSecretsManager(databaseSecret, 'connectionString'),
                JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret, 'JWT_SECRET'),
                JWT_REFRESH_SECRET: ecs.Secret.fromSecretsManager(jwtSecret, 'JWT_REFRESH_SECRET'),
            },
        });
        container.addPortMappings({
            containerPort: port,
            protocol: ecs.Protocol.TCP,
        });
        const service = new ecs.FargateService(this, `${serviceName}Service`, {
            cluster: this.cluster,
            taskDefinition,
            desiredCount: 1,
            securityGroups: [securityGroup],
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            serviceName: `study-collab-${serviceName}`,
        });
        service.attachToApplicationTargetGroup(targetGroup);
        const scaling = service.autoScaleTaskCount({
            minCapacity: 1,
            maxCapacity: 10,
        });
        scaling.scaleOnCpuUtilization(`${serviceName}CpuScaling`, {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60),
        });
    }
}
exports.EcsStack = EcsStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWNzLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWNzLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFrQztBQUNsQyx5REFBMEM7QUFDMUMseURBQTBDO0FBQzFDLDhFQUErRDtBQUMvRCx5REFBMEM7QUFDMUMsMkRBQTRDO0FBQzVDLCtFQUFnRTtBQUNoRSx5REFBMEM7QUFXMUMsTUFBTSxRQUFRLEdBQUc7SUFDZixFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFO0lBQ3JELEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUU7SUFDckQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRTtJQUN2RCxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFO0lBQzdELEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUU7SUFDcEQsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLGtCQUFrQixFQUFFO0lBQ25FLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRTtDQUN2RCxDQUFBO0FBRVYsTUFBYSxRQUFTLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2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O1lBQ2YsY0FBYyxFQUFFLENBQUMsYUFBYSxDQUFDO1lBQy9CLFVBQVUsRUFBRTtnQkFDVixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUI7YUFDL0M7WUFDRCxXQUFXLEVBQUUsZ0JBQWdCLFdBQVcsRUFBRTtTQUMzQyxDQUFDLENBQUE7UUFFRixPQUFPLENBQUMsOEJBQThCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFbkQsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDO1lBQ3pDLFdBQVcsRUFBRSxDQUFDO1lBQ2QsV0FBVyxFQUFFLEVBQUU7U0FDaEIsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsV0FBVyxZQUFZLEVBQUU7WUFDeEQsd0JBQXdCLEVBQUUsRUFBRTtZQUM1QixlQUFlLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3pDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztTQUMzQyxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUE5S0QsNEJBOEtDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xyXG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMidcclxuaW1wb3J0ICogYXMgZWNzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MnXHJcbmltcG9ydCAqIGFzIGVsYnYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lbGFzdGljbG9hZGJhbGFuY2luZ3YyJ1xyXG5pbXBvcnQgKiBhcyBlY3IgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcidcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncydcclxuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJ1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSdcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcclxuXHJcbmludGVyZmFjZSBFY3NTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xyXG4gIHZwYzogZWMyLlZwY1xyXG4gIGRhdGFiYXNlU2VjdXJpdHlHcm91cDogZWMyLlNlY3VyaXR5R3JvdXBcclxuICBjYWNoZVNlY3VyaXR5R3JvdXA6IGVjMi5TZWN1cml0eUdyb3VwXHJcbiAgZGF0YWJhc2VTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldFxyXG4gIHJlZGlzRW5kcG9pbnQ6IHN0cmluZ1xyXG59XHJcblxyXG5jb25zdCBTRVJWSUNFUyA9IFtcclxuICB7IG5hbWU6ICdhdXRoJywgcG9ydDogMzAwMSwgcGF0aFByZWZpeDogJy9hcGkvYXV0aCcgfSxcclxuICB7IG5hbWU6ICd1c2VyJywgcG9ydDogMzAwMiwgcGF0aFByZWZpeDogJy9hcGkvdXNlcicgfSxcclxuICB7IG5hbWU6ICdzdHVkeScsIHBvcnQ6IDMwMDMsIHBhdGhQcmVmaXg6ICcvYXBpL3N0dWR5JyB9LFxyXG4gIHsgbmFtZTogJ3ByYWN0aWNlJywgcG9ydDogMzAwNSwgcGF0aFByZWZpeDogJy9hcGkvcHJhY3RpY2UnIH0sXHJcbiAgeyBuYW1lOiAncG9kJywgcG9ydDogMzAwNiwgcGF0aFByZWZpeDogJy9hcGkvcG9kcycgfSxcclxuICB7IG5hbWU6ICdsZWFkZXJib2FyZCcsIHBvcnQ6IDMwMDcsIHBhdGhQcmVmaXg6ICcvYXBpL2xlYWRlcmJvYXJkJyB9LFxyXG4gIHsgbmFtZTogJ3JlZmVyZW5jZScsIHBvcnQ6IDMwMDgsIHBhdGhQcmVmaXg6ICcvYXBpL3JlZmVyZW5jZScgfSxcclxuXSBhcyBjb25zdFxyXG5cclxuZXhwb3J0IGNsYXNzIEVjc1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICBwdWJsaWMgcmVhZG9ubHkgY2x1c3RlcjogZWNzLkNsdXN0ZXJcclxuICBwdWJsaWMgcmVhZG9ubHkgbG9hZEJhbGFuY2VyOiBlbGJ2Mi5BcHBsaWNhdGlvbkxvYWRCYWxhbmNlclxyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRWNzU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcclxuXHJcbiAgICBjb25zdCB7IHZwYywgZGF0YWJhc2VTZWN1cml0eUdyb3VwLCBjYWNoZVNlY3VyaXR5R3JvdXAsIGRhdGFiYXNlU2VjcmV0LCByZWRpc0VuZHBvaW50IH0gPSBwcm9wc1xyXG5cclxuICAgIC8vIEVDUyBDbHVzdGVyXHJcbiAgICB0aGlzLmNsdXN0ZXIgPSBuZXcgZWNzLkNsdXN0ZXIodGhpcywgJ0NsdXN0ZXInLCB7XHJcbiAgICAgIHZwYyxcclxuICAgICAgY2x1c3Rlck5hbWU6ICdzdHVkeS1jb2xsYWItY2x1c3RlcicsXHJcbiAgICAgIGNvbnRhaW5lckluc2lnaHRzOiB0cnVlLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyXHJcbiAgICB0aGlzLmxvYWRCYWxhbmNlciA9IG5ldyBlbGJ2Mi5BcHBsaWNhdGlvbkxvYWRCYWxhbmNlcih0aGlzLCAnQUxCJywge1xyXG4gICAgICB2cGMsXHJcbiAgICAgIGludGVybmV0RmFjaW5nOiB0cnVlLFxyXG4gICAgICBsb2FkQmFsYW5jZXJOYW1lOiAnc3R1ZHktY29sbGFiLWFsYicsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIFNlcnZpY2Ugc2VjdXJpdHkgZ3JvdXAgKGFsbG93IEFMQiB0byByZWFjaCBhbGwgc2VydmljZSBwb3J0cylcclxuICAgIGNvbnN0IHNlcnZpY2VTZWN1cml0eUdyb3VwID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKHRoaXMsICdTZXJ2aWNlU2VjdXJpdHlHcm91cCcsIHtcclxuICAgICAgdnBjLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBFQ1Mgc2VydmljZXMnLFxyXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBhbGJTZyA9IHRoaXMubG9hZEJhbGFuY2VyLmNvbm5lY3Rpb25zLnNlY3VyaXR5R3JvdXBzWzBdXHJcbiAgICBmb3IgKGNvbnN0IHsgcG9ydCB9IG9mIFNFUlZJQ0VTKSB7XHJcbiAgICAgIHNlcnZpY2VTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKGVjMi5QZWVyLnNlY3VyaXR5R3JvdXBJZChhbGJTZy5zZWN1cml0eUdyb3VwSWQpLCBlYzIuUG9ydC50Y3AocG9ydCksIGBBbGxvdyBBTEIgdG8gc2VydmljZSBwb3J0ICR7cG9ydH1gKVxyXG4gICAgfVxyXG5cclxuICAgIGRhdGFiYXNlU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShzZXJ2aWNlU2VjdXJpdHlHcm91cCwgZWMyLlBvcnQudGNwKDU0MzIpLCAnQWxsb3cgRUNTIHRvIFJEUycpXHJcbiAgICBjYWNoZVNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoc2VydmljZVNlY3VyaXR5R3JvdXAsIGVjMi5Qb3J0LnRjcCg2Mzc5KSwgJ0FsbG93IEVDUyB0byBSZWRpcycpXHJcblxyXG4gICAgLy8gSldUIHNlY3JldCAobXVzdCBleGlzdDogc3R1ZHktY29sbGFiL2p3dCB3aXRoIEpXVF9TRUNSRVQsIEpXVF9SRUZSRVNIX1NFQ1JFVClcclxuICAgIGNvbnN0IGp3dFNlY3JldCA9IHNlY3JldHNtYW5hZ2VyLlNlY3JldC5mcm9tU2VjcmV0TmFtZVYyKHRoaXMsICdKd3RTZWNyZXQnLCAnc3R1ZHktY29sbGFiL2p3dCcpXHJcblxyXG4gICAgLy8gTGlzdGVuZXIgd2l0aCBwYXRoLWJhc2VkIHJ1bGVzIChkZWZhdWx0OiBmaXhlZCA0MDQpXHJcbiAgICBjb25zdCBsaXN0ZW5lciA9IHRoaXMubG9hZEJhbGFuY2VyLmFkZExpc3RlbmVyKCdIdHRwTGlzdGVuZXInLCB7XHJcbiAgICAgIHBvcnQ6IDgwLFxyXG4gICAgICBkZWZhdWx0QWN0aW9uOiBlbGJ2Mi5MaXN0ZW5lckFjdGlvbi5maXhlZFJlc3BvbnNlKDQwNCwge1xyXG4gICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgbWVzc2FnZUJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdOb3QgRm91bmQnLCBwYXRoOiAnTm8gbWF0Y2hpbmcgc2VydmljZScgfSksXHJcbiAgICAgIH0pLFxyXG4gICAgfSlcclxuXHJcbiAgICBmb3IgKGNvbnN0IHN2YyBvZiBTRVJWSUNFUykge1xyXG4gICAgICBjb25zdCB0YXJnZXRHcm91cCA9IG5ldyBlbGJ2Mi5BcHBsaWNhdGlvblRhcmdldEdyb3VwKHRoaXMsIGAke3N2Yy5uYW1lfVRhcmdldEdyb3VwYCwge1xyXG4gICAgICAgIHZwYyxcclxuICAgICAgICBwb3J0OiBzdmMucG9ydCxcclxuICAgICAgICBwcm90b2NvbDogZWxidjIuQXBwbGljYXRpb25Qcm90b2NvbC5IVFRQLFxyXG4gICAgICAgIHRhcmdldFR5cGU6IGVsYnYyLlRhcmdldFR5cGUuSVAsXHJcbiAgICAgICAgaGVhbHRoQ2hlY2s6IHtcclxuICAgICAgICAgIHBhdGg6ICcvaGVhbHRoJyxcclxuICAgICAgICAgIGludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcclxuICAgICAgICAgIGhlYWx0aHlUaHJlc2hvbGRDb3VudDogMixcclxuICAgICAgICAgIHVuaGVhbHRoeVRocmVzaG9sZENvdW50OiAzLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBsaXN0ZW5lci5hZGRBY3Rpb24oYCR7c3ZjLm5hbWV9UnVsZWAsIHtcclxuICAgICAgICBwcmlvcml0eTogU0VSVklDRVMuaW5kZXhPZihzdmMpICsgMSxcclxuICAgICAgICBjb25kaXRpb25zOiBbZWxidjIuTGlzdGVuZXJDb25kaXRpb24ucGF0aFBhdHRlcm5zKFtgJHtzdmMucGF0aFByZWZpeH0qYCwgYCR7c3ZjLnBhdGhQcmVmaXh9YF0pXSxcclxuICAgICAgICBhY3Rpb246IGVsYnYyLkxpc3RlbmVyQWN0aW9uLmZvcndhcmQoW3RhcmdldEdyb3VwXSksXHJcbiAgICAgIH0pXHJcblxyXG4gICAgICB0aGlzLmNyZWF0ZVNlcnZpY2Uoc3ZjLm5hbWUsIHN2Yy5wb3J0LCB2cGMsIHNlcnZpY2VTZWN1cml0eUdyb3VwLCB0YXJnZXRHcm91cCwgZGF0YWJhc2VTZWNyZXQsIHJlZGlzRW5kcG9pbnQsIGp3dFNlY3JldClcclxuICAgIH1cclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9hZEJhbGFuY2VyRE5TJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5sb2FkQmFsYW5jZXIubG9hZEJhbGFuY2VyRG5zTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyIEROUycsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdTdHVkeUNvbGxhYkFMQkRucycsXHJcbiAgICB9KVxyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbHVzdGVyTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuY2x1c3Rlci5jbHVzdGVyTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdFQ1MgQ2x1c3RlciBOYW1lJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ1N0dWR5Q29sbGFiQ2x1c3Rlck5hbWUnLFxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlU2VydmljZShcclxuICAgIHNlcnZpY2VOYW1lOiBzdHJpbmcsXHJcbiAgICBwb3J0OiBudW1iZXIsXHJcbiAgICB2cGM6IGVjMi5WcGMsXHJcbiAgICBzZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cCxcclxuICAgIHRhcmdldEdyb3VwOiBlbGJ2Mi5BcHBsaWNhdGlvblRhcmdldEdyb3VwLFxyXG4gICAgZGF0YWJhc2VTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldCxcclxuICAgIHJlZGlzRW5kcG9pbnQ6IHN0cmluZyxcclxuICAgIGp3dFNlY3JldDogc2VjcmV0c21hbmFnZXIuSVNlY3JldFxyXG4gICkge1xyXG4gICAgY29uc3QgcmVwbyA9IG5ldyBlY3IuUmVwb3NpdG9yeSh0aGlzLCBgJHtzZXJ2aWNlTmFtZX1SZXBvYCwge1xyXG4gICAgICByZXBvc2l0b3J5TmFtZTogYHN0dWR5LWNvbGxhYi0ke3NlcnZpY2VOYW1lfWAsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgIH0pXHJcblxyXG4gICAgY29uc3QgdGFza0RlZmluaXRpb24gPSBuZXcgZWNzLkZhcmdhdGVUYXNrRGVmaW5pdGlvbih0aGlzLCBgJHtzZXJ2aWNlTmFtZX1UYXNrRGVmYCwge1xyXG4gICAgICBtZW1vcnlMaW1pdE1pQjogNTEyLFxyXG4gICAgICBjcHU6IDI1NixcclxuICAgIH0pXHJcblxyXG4gICAgZGF0YWJhc2VTZWNyZXQuZ3JhbnRSZWFkKHRhc2tEZWZpbml0aW9uLnRhc2tSb2xlKVxyXG4gICAgand0U2VjcmV0LmdyYW50UmVhZCh0YXNrRGVmaW5pdGlvbi50YXNrUm9sZSlcclxuXHJcbiAgICBpZiAoc2VydmljZU5hbWUgPT09ICdwcmFjdGljZScpIHtcclxuICAgICAgdGFza0RlZmluaXRpb24udGFza1JvbGUuYWRkTWFuYWdlZFBvbGljeShcclxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkJlZHJvY2tGdWxsQWNjZXNzJylcclxuICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChzZXJ2aWNlTmFtZSA9PT0gJ3BvZCcpIHtcclxuICAgICAgdGFza0RlZmluaXRpb24udGFza1JvbGUuYWRkTWFuYWdlZFBvbGljeShcclxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkNoaW1lU0RLTWVkaWFQaXBlbGluZXNTZXJ2aWNlTGlua2VkUm9sZVBvbGljeScpXHJcbiAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsIGAke3NlcnZpY2VOYW1lfUxvZ0dyb3VwYCwge1xyXG4gICAgICBsb2dHcm91cE5hbWU6IGAvZWNzL3N0dWR5LWNvbGxhYi8ke3NlcnZpY2VOYW1lfWAsXHJcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBjb250YWluZXIgPSB0YXNrRGVmaW5pdGlvbi5hZGRDb250YWluZXIoYCR7c2VydmljZU5hbWV9Q29udGFpbmVyYCwge1xyXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21FY3JSZXBvc2l0b3J5KHJlcG8sICdsYXRlc3QnKSxcclxuICAgICAgbG9nZ2luZzogZWNzLkxvZ0RyaXZlcnMuYXdzTG9ncyh7XHJcbiAgICAgICAgc3RyZWFtUHJlZml4OiBzZXJ2aWNlTmFtZSxcclxuICAgICAgICBsb2dHcm91cCxcclxuICAgICAgfSksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgUE9SVDogcG9ydC50b1N0cmluZygpLFxyXG4gICAgICAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXHJcbiAgICAgICAgUkVESVNfVVJMOiBgcmVkaXM6Ly8ke3JlZGlzRW5kcG9pbnR9OjYzNzlgLFxyXG4gICAgICB9LFxyXG4gICAgICBzZWNyZXRzOiB7XHJcbiAgICAgICAgREFUQUJBU0VfVVJMOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihkYXRhYmFzZVNlY3JldCwgJ2Nvbm5lY3Rpb25TdHJpbmcnKSxcclxuICAgICAgICBKV1RfU0VDUkVUOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihqd3RTZWNyZXQsICdKV1RfU0VDUkVUJyksXHJcbiAgICAgICAgSldUX1JFRlJFU0hfU0VDUkVUOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihqd3RTZWNyZXQsICdKV1RfUkVGUkVTSF9TRUNSRVQnKSxcclxuICAgICAgfSxcclxuICAgIH0pXHJcblxyXG4gICAgY29udGFpbmVyLmFkZFBvcnRNYXBwaW5ncyh7XHJcbiAgICAgIGNvbnRhaW5lclBvcnQ6IHBvcnQsXHJcbiAgICAgIHByb3RvY29sOiBlY3MuUHJvdG9jb2wuVENQLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBzZXJ2aWNlID0gbmV3IGVjcy5GYXJnYXRlU2VydmljZSh0aGlzLCBgJHtzZXJ2aWNlTmFtZX1TZXJ2aWNlYCwge1xyXG4gICAgICBjbHVzdGVyOiB0aGlzLmNsdXN0ZXIsXHJcbiAgICAgIHRhc2tEZWZpbml0aW9uLFxyXG4gICAgICBkZXNpcmVkQ291bnQ6IDEsXHJcbiAgICAgIHNlY3VyaXR5R3JvdXBzOiBbc2VjdXJpdHlHcm91cF0sXHJcbiAgICAgIHZwY1N1Ym5ldHM6IHtcclxuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTLFxyXG4gICAgICB9LFxyXG4gICAgICBzZXJ2aWNlTmFtZTogYHN0dWR5LWNvbGxhYi0ke3NlcnZpY2VOYW1lfWAsXHJcbiAgICB9KVxyXG5cclxuICAgIHNlcnZpY2UuYXR0YWNoVG9BcHBsaWNhdGlvblRhcmdldEdyb3VwKHRhcmdldEdyb3VwKVxyXG5cclxuICAgIGNvbnN0IHNjYWxpbmcgPSBzZXJ2aWNlLmF1dG9TY2FsZVRhc2tDb3VudCh7XHJcbiAgICAgIG1pbkNhcGFjaXR5OiAxLFxyXG4gICAgICBtYXhDYXBhY2l0eTogMTAsXHJcbiAgICB9KVxyXG4gICAgc2NhbGluZy5zY2FsZU9uQ3B1VXRpbGl6YXRpb24oYCR7c2VydmljZU5hbWV9Q3B1U2NhbGluZ2AsIHtcclxuICAgICAgdGFyZ2V0VXRpbGl6YXRpb25QZXJjZW50OiA3MCxcclxuICAgICAgc2NhbGVJbkNvb2xkb3duOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXHJcbiAgICAgIHNjYWxlT3V0Q29vbGRvd246IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcbiJdfQ==