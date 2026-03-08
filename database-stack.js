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
exports.DatabaseStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const elasticache = __importStar(require("aws-cdk-lib/aws-elasticache"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaNode = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const path = __importStar(require("path"));
class DatabaseStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { vpc } = props;
        // Database security group
        this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
            vpc,
            description: 'Security group for RDS PostgreSQL',
            allowAllOutbound: true,
        });
        // Cache security group
        this.cacheSecurityGroup = new ec2.SecurityGroup(this, 'CacheSecurityGroup', {
            vpc,
            description: 'Security group for ElastiCache Redis',
            allowAllOutbound: true,
        });
        // Database credentials
        this.databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
            secretName: 'study-collab/database',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'studycollab' }),
                generateStringKey: 'password',
                excludePunctuation: true,
                includeSpace: false,
            },
        });
        // RDS PostgreSQL
        this.database = new rds.DatabaseInstance(this, 'Database', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_15_5,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
            securityGroups: [this.databaseSecurityGroup],
            credentials: rds.Credentials.fromSecret(this.databaseSecret),
            databaseName: 'studycollab',
            allocatedStorage: 20,
            maxAllocatedStorage: 100,
            storageEncrypted: true,
            backupRetention: cdk.Duration.days(7),
            deletionProtection: false, // Set to true in production
            removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
            multiAz: false, // Set to true in production
        });
        // ElastiCache subnet group
        const cacheSubnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
            description: 'Subnet group for ElastiCache Redis',
            subnetIds: vpc.selectSubnets({
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            }).subnetIds,
        });
        // ElastiCache Redis
        this.cacheCluster = new elasticache.CfnCacheCluster(this, 'CacheCluster', {
            cacheNodeType: 'cache.t3.micro',
            engine: 'redis',
            numCacheNodes: 1,
            vpcSecurityGroupIds: [this.cacheSecurityGroup.securityGroupId],
            cacheSubnetGroupName: cacheSubnetGroup.ref,
            engineVersion: '7.0',
            port: 6379,
        });
        this.redisEndpoint = this.cacheCluster.attrRedisEndpointAddress;
        // Custom resource: add connectionString to database secret (for ECS task definitions)
        const updateSecretFn = new lambdaNode.NodejsFunction(this, 'DbSecretUpdateFn', {
            entry: path.join(__dirname, '../lambdas/db-secret-update.ts'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(30),
        });
        this.databaseSecret.grantReadWrite(updateSecretFn);
        const provider = new cr.Provider(this, 'DbSecretUpdateProvider', {
            onEventHandler: updateSecretFn,
        });
        const customResource = new cdk.CustomResource(this, 'DbSecretUpdate', {
            serviceToken: provider.serviceToken,
            properties: {
                SecretArn: this.databaseSecret.secretArn,
                Endpoint: this.database.dbInstanceEndpointAddress,
                DbName: 'studycollab',
            },
        });
        customResource.node.addDependency(this.database);
        // Outputs
        new cdk.CfnOutput(this, 'DatabaseEndpoint', {
            value: this.database.dbInstanceEndpointAddress,
            description: 'RDS PostgreSQL endpoint',
            exportName: 'StudyCollabDatabaseEndpoint',
        });
        new cdk.CfnOutput(this, 'DatabaseSecretArn', {
            value: this.databaseSecret.secretArn,
            description: 'Database credentials secret ARN',
            exportName: 'StudyCollabDatabaseSecretArn',
        });
        new cdk.CfnOutput(this, 'RedisEndpoint', {
            value: this.redisEndpoint,
            description: 'ElastiCache Redis endpoint',
            exportName: 'StudyCollabRedisEndpoint',
        });
    }
}
exports.DatabaseStack = DatabaseStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2Utc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRhYmFzZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFDbEMseURBQTBDO0FBQzFDLHlEQUEwQztBQUMxQyx5RUFBMEQ7QUFDMUQsK0VBQWdFO0FBQ2hFLCtEQUFnRDtBQUNoRCwwRUFBMkQ7QUFDM0QsaUVBQWtEO0FBRWxELDJDQUE0QjtBQU01QixNQUFhLGFBQWMsU0FBUSxHQUFHLENBQUMsS0FBSztJQVExQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXlCO1FBQ2pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXZCLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFFckIsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQ2hGLEdBQUc7WUFDSCxXQUFXLEVBQUUsbUNBQW1DO1lBQ2hELGdCQUFnQixFQUFFLElBQUk7U0FDdkIsQ0FBQyxDQUFBO1FBRUYsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzFFLEdBQUc7WUFDSCxXQUFXLEVBQUUsc0NBQXNDO1lBQ25ELGdCQUFnQixFQUFFLElBQUk7U0FDdkIsQ0FBQyxDQUFBO1FBRUYsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN0RSxVQUFVLEVBQUUsdUJBQXVCO1lBQ25DLG9CQUFvQixFQUFFO2dCQUNwQixvQkFBb0IsRUFBRSxJQUFJLENB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bXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXHJcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJ1xyXG5pbXBvcnQgKiBhcyByZHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJkcydcclxuaW1wb3J0ICogYXMgZWxhc3RpY2FjaGUgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVsYXN0aWNhY2hlJ1xyXG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInXHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJ1xyXG5pbXBvcnQgKiBhcyBsYW1iZGFOb2RlIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzJ1xyXG5pbXBvcnQgKiBhcyBjciBmcm9tICdhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzJ1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXHJcblxyXG5pbnRlcmZhY2UgRGF0YWJhc2VTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xyXG4gIHZwYzogZWMyLlZwY1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2VTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGRhdGFiYXNlOiByZHMuRGF0YWJhc2VJbnN0YW5jZVxyXG4gIHB1YmxpYyByZWFkb25seSBkYXRhYmFzZVNlY3JldDogc2VjcmV0c21hbmFnZXIuU2VjcmV0XHJcbiAgcHVibGljIHJlYWRvbmx5IGRhdGFiYXNlU2VjdXJpdHlHcm91cDogZWMyLlNlY3VyaXR5R3JvdXBcclxuICBwdWJsaWMgcmVhZG9ubHkgY2FjaGVDbHVzdGVyOiBlbGFzdGljYWNoZS5DZm5DYWNoZUNsdXN0ZXJcclxuICBwdWJsaWMgcmVhZG9ubHkgY2FjaGVTZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cFxyXG4gIHB1YmxpYyByZWFkb25seSByZWRpc0VuZHBvaW50OiBzdHJpbmdcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IERhdGFiYXNlU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcclxuXHJcbiAgICBjb25zdCB7IHZwYyB9ID0gcHJvcHNcclxuXHJcbiAgICAvLyBEYXRhYmFzZSBzZWN1cml0eSBncm91cFxyXG4gICAgdGhpcy5kYXRhYmFzZVNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0RhdGFiYXNlU2VjdXJpdHlHcm91cCcsIHtcclxuICAgICAgdnBjLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBSRFMgUG9zdGdyZVNRTCcsXHJcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIENhY2hlIHNlY3VyaXR5IGdyb3VwXHJcbiAgICB0aGlzLmNhY2hlU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnQ2FjaGVTZWN1cml0eUdyb3VwJywge1xyXG4gICAgICB2cGMsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgZ3JvdXAgZm9yIEVsYXN0aUNhY2hlIFJlZGlzJyxcclxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZSxcclxuICAgIH0pXHJcblxyXG4gICAgLy8gRGF0YWJhc2UgY3JlZGVudGlhbHNcclxuICAgIHRoaXMuZGF0YWJhc2VTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdEYXRhYmFzZVNlY3JldCcsIHtcclxuICAgICAgc2VjcmV0TmFtZTogJ3N0dWR5LWNvbGxhYi9kYXRhYmFzZScsXHJcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XHJcbiAgICAgICAgc2VjcmV0U3RyaW5nVGVtcGxhdGU6IEpTT04uc3RyaW5naWZ5KHsgdXNlcm5hbWU6ICdzdHVkeWNvbGxhYicgfSksXHJcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICdwYXNzd29yZCcsXHJcbiAgICAgICAgZXhjbHVkZVB1bmN0dWF0aW9uOiB0cnVlLFxyXG4gICAgICAgIGluY2x1ZGVTcGFjZTogZmFsc2UsXHJcbiAgICAgIH0sXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIFJEUyBQb3N0Z3JlU1FMXHJcbiAgICB0aGlzLmRhdGFiYXNlID0gbmV3IHJkcy5EYXRhYmFzZUluc3RhbmNlKHRoaXMsICdEYXRhYmFzZScsIHtcclxuICAgICAgZW5naW5lOiByZHMuRGF0YWJhc2VJbnN0YW5jZUVuZ2luZS5wb3N0Z3Jlcyh7XHJcbiAgICAgICAgdmVyc2lvbjogcmRzLlBvc3RncmVzRW5naW5lVmVyc2lvbi5WRVJfMTVfNSxcclxuICAgICAgfSksXHJcbiAgICAgIGluc3RhbmNlVHlwZTogZWMyLkluc3RhbmNlVHlwZS5vZihcclxuICAgICAgICBlYzIuSW5zdGFuY2VDbGFzcy5UMyxcclxuICAgICAgICBlYzIuSW5zdGFuY2VTaXplLk1JQ1JPXHJcbiAgICAgICksXHJcbiAgICAgIHZwYyxcclxuICAgICAgdnBjU3VibmV0czoge1xyXG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNlY3VyaXR5R3JvdXBzOiBbdGhpcy5kYXRhYmFzZVNlY3VyaXR5R3JvdXBdLFxyXG4gICAgICBjcmVkZW50aWFsczogcmRzLkNyZWRlbnRpYWxzLmZyb21TZWNyZXQodGhpcy5kYXRhYmFzZVNlY3JldCksXHJcbiAgICAgIGRhdGFiYXNlTmFtZTogJ3N0dWR5Y29sbGFiJyxcclxuICAgICAgYWxsb2NhdGVkU3RvcmFnZTogMjAsXHJcbiAgICAgIG1heEFsbG9jYXRlZFN0b3JhZ2U6IDEwMCxcclxuICAgICAgc3RvcmFnZUVuY3J5cHRlZDogdHJ1ZSxcclxuICAgICAgYmFja3VwUmV0ZW50aW9uOiBjZGsuRHVyYXRpb24uZGF5cyg3KSxcclxuICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uOiBmYWxzZSwgLy8gU2V0IHRvIHRydWUgaW4gcHJvZHVjdGlvblxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5TTkFQU0hPVCxcclxuICAgICAgbXVsdGlBejogZmFsc2UsIC8vIFNldCB0byB0cnVlIGluIHByb2R1Y3Rpb25cclxuICAgIH0pXHJcblxyXG4gICAgLy8gRWxhc3RpQ2FjaGUgc3VibmV0IGdyb3VwXHJcbiAgICBjb25zdCBjYWNoZVN1Ym5ldEdyb3VwID0gbmV3IGVsYXN0aWNhY2hlLkNmblN1Ym5ldEdyb3VwKHRoaXMsICdDYWNoZVN1Ym5ldEdyb3VwJywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ1N1Ym5ldCBncm91cCBmb3IgRWxhc3RpQ2FjaGUgUmVkaXMnLFxyXG4gICAgICBzdWJuZXRJZHM6IHZwYy5zZWxlY3RTdWJuZXRzKHtcclxuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxyXG4gICAgICB9KS5zdWJuZXRJZHMsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIEVsYXN0aUNhY2hlIFJlZGlzXHJcbiAgICB0aGlzLmNhY2hlQ2x1c3RlciA9IG5ldyBlbGFzdGljYWNoZS5DZm5DYWNoZUNsdXN0ZXIodGhpcywgJ0NhY2hlQ2x1c3RlcicsIHtcclxuICAgICAgY2FjaGVOb2RlVHlwZTogJ2NhY2hlLnQzLm1pY3JvJyxcclxuICAgICAgZW5naW5lOiAncmVkaXMnLFxyXG4gICAgICBudW1DYWNoZU5vZGVzOiAxLFxyXG4gICAgICB2cGNTZWN1cml0eUdyb3VwSWRzOiBbdGhpcy5jYWNoZVNlY3VyaXR5R3JvdXAuc2VjdXJpdHlHcm91cElkXSxcclxuICAgICAgY2FjaGVTdWJuZXRHcm91cE5hbWU6IGNhY2hlU3VibmV0R3JvdXAucmVmLFxyXG4gICAgICBlbmdpbmVWZXJzaW9uOiAnNy4wJyxcclxuICAgICAgcG9ydDogNjM3OSxcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5yZWRpc0VuZHBvaW50ID0gdGhpcy5jYWNoZUNsdXN0ZXIuYXR0clJlZGlzRW5kcG9pbnRBZGRyZXNzXHJcblxyXG4gICAgLy8gQ3VzdG9tIHJlc291cmNlOiBhZGQgY29ubmVjdGlvblN0cmluZyB0byBkYXRhYmFzZSBzZWNyZXQgKGZvciBFQ1MgdGFzayBkZWZpbml0aW9ucylcclxuICAgIGNvbnN0IHVwZGF0ZVNlY3JldEZuID0gbmV3IGxhbWJkYU5vZGUuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0RiU2VjcmV0VXBkYXRlRm4nLCB7XHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhcy9kYi1zZWNyZXQtdXBkYXRlLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgIH0pXHJcbiAgICB0aGlzLmRhdGFiYXNlU2VjcmV0LmdyYW50UmVhZFdyaXRlKHVwZGF0ZVNlY3JldEZuKVxyXG5cclxuICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IGNyLlByb3ZpZGVyKHRoaXMsICdEYlNlY3JldFVwZGF0ZVByb3ZpZGVyJywge1xyXG4gICAgICBvbkV2ZW50SGFuZGxlcjogdXBkYXRlU2VjcmV0Rm4sXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IGN1c3RvbVJlc291cmNlID0gbmV3IGNkay5DdXN0b21SZXNvdXJjZSh0aGlzLCAnRGJTZWNyZXRVcGRhdGUnLCB7XHJcbiAgICAgIHNlcnZpY2VUb2tlbjogcHJvdmlkZXIuc2VydmljZVRva2VuLFxyXG4gICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgU2VjcmV0QXJuOiB0aGlzLmRhdGFiYXNlU2VjcmV0LnNlY3JldEFybixcclxuICAgICAgICBFbmRwb2ludDogdGhpcy5kYXRhYmFzZS5kYkluc3RhbmNlRW5kcG9pbnRBZGRyZXNzLFxyXG4gICAgICAgIERiTmFtZTogJ3N0dWR5Y29sbGFiJyxcclxuICAgICAgfSxcclxuICAgIH0pXHJcbiAgICBjdXN0b21SZXNvdXJjZS5ub2RlLmFkZERlcGVuZGVuY3kodGhpcy5kYXRhYmFzZSlcclxuXHJcbiAgICAvLyBPdXRwdXRzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGF0YWJhc2VFbmRwb2ludCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuZGF0YWJhc2UuZGJJbnN0YW5jZUVuZHBvaW50QWRkcmVzcyxcclxuICAgICAgZGVzY3JpcHRpb246ICdSRFMgUG9zdGdyZVNRTCBlbmRwb2ludCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdTdHVkeUNvbGxhYkRhdGFiYXNlRW5kcG9pbnQnLFxyXG4gICAgfSlcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGF0YWJhc2VTZWNyZXRBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmRhdGFiYXNlU2VjcmV0LnNlY3JldEFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdEYXRhYmFzZSBjcmVkZW50aWFscyBzZWNyZXQgQVJOJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ1N0dWR5Q29sbGFiRGF0YWJhc2VTZWNyZXRBcm4nLFxyXG4gICAgfSlcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVkaXNFbmRwb2ludCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMucmVkaXNFbmRwb2ludCxcclxuICAgICAgZGVzY3JpcHRpb246ICdFbGFzdGlDYWNoZSBSZWRpcyBlbmRwb2ludCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdTdHVkeUNvbGxhYlJlZGlzRW5kcG9pbnQnLFxyXG4gICAgfSlcclxuICB9XHJcbn1cclxuIl19