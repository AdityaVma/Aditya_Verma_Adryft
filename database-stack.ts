import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as elasticache from 'aws-cdk-lib/aws-elasticache'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs'
import * as cr from 'aws-cdk-lib/custom-resources'
import { Construct } from 'constructs'
import * as path from 'path'

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance
  public readonly databaseSecret: secretsmanager.Secret
  public readonly databaseSecurityGroup: ec2.SecurityGroup
  public readonly cacheCluster: elasticache.CfnCacheCluster
  public readonly cacheSecurityGroup: ec2.SecurityGroup
  public readonly redisEndpoint: string

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props)

    const { vpc } = props

    // Database security group
    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for RDS PostgreSQL',
      allowAllOutbound: true,
    })

    // Cache security group
    this.cacheSecurityGroup = new ec2.SecurityGroup(this, 'CacheSecurityGroup', {
      vpc,
      description: 'Security group for ElastiCache Redis',
      allowAllOutbound: true,
    })

    // Database credentials
    this.databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: 'study-collab/database',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'studycollab' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
      },
    })

    // RDS PostgreSQL
    this.database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_5,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
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
    })

    // ElastiCache subnet group
    const cacheSubnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
      description: 'Subnet group for ElastiCache Redis',
      subnetIds: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }).subnetIds,
    })

    // ElastiCache Redis
    this.cacheCluster = new elasticache.CfnCacheCluster(this, 'CacheCluster', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [this.cacheSecurityGroup.securityGroupId],
      cacheSubnetGroupName: cacheSubnetGroup.ref,
      engineVersion: '7.0',
      port: 6379,
    })

    this.redisEndpoint = this.cacheCluster.attrRedisEndpointAddress

    // Custom resource: add connectionString to database secret (for ECS task definitions)
    const updateSecretFn = new lambdaNode.NodejsFunction(this, 'DbSecretUpdateFn', {
      entry: path.join(__dirname, '../lambdas/db-secret-update.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
    })
    this.databaseSecret.grantReadWrite(updateSecretFn)

    const provider = new cr.Provider(this, 'DbSecretUpdateProvider', {
      onEventHandler: updateSecretFn,
    })

    const customResource = new cdk.CustomResource(this, 'DbSecretUpdate', {
      serviceToken: provider.serviceToken,
      properties: {
        SecretArn: this.databaseSecret.secretArn,
        Endpoint: this.database.dbInstanceEndpointAddress,
        DbName: 'studycollab',
      },
    })
    customResource.node.addDependency(this.database)

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.dbInstanceEndpointAddress,
      description: 'RDS PostgreSQL endpoint',
      exportName: 'StudyCollabDatabaseEndpoint',
    })

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
      description: 'Database credentials secret ARN',
      exportName: 'StudyCollabDatabaseSecretArn',
    })

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.redisEndpoint,
      description: 'ElastiCache Redis endpoint',
      exportName: 'StudyCollabRedisEndpoint',
    })
  }
}
