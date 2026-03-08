import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

interface EcsStackProps extends cdk.StackProps {
  vpc: ec2.Vpc
  databaseSecurityGroup: ec2.SecurityGroup
  cacheSecurityGroup: ec2.SecurityGroup
  databaseSecret: secretsmanager.Secret
  redisEndpoint: string
}

const SERVICES = [
  { name: 'auth', port: 3001, pathPrefix: '/api/auth' },
  { name: 'user', port: 3002, pathPrefix: '/api/user' },
  { name: 'study', port: 3003, pathPrefix: '/api/study' },
  { name: 'practice', port: 3005, pathPrefix: '/api/practice' },
  { name: 'pod', port: 3006, pathPrefix: '/api/pods' },
  { name: 'leaderboard', port: 3007, pathPrefix: '/api/leaderboard' },
  { name: 'reference', port: 3008, pathPrefix: '/api/reference' },
] as const

export class EcsStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer

  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props)

    const { vpc, databaseSecurityGroup, cacheSecurityGroup, databaseSecret, redisEndpoint } = props

    // ECS Cluster
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: 'study-collab-cluster',
      containerInsights: true,
    })

    // Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      loadBalancerName: 'study-collab-alb',
    })

    // Service security group (allow ALB to reach all service ports)
    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
      vpc,
      description: 'Security group for ECS services',
      allowAllOutbound: true,
    })

    const albSg = this.loadBalancer.connections.securityGroups[0]
    for (const { port } of SERVICES) {
      serviceSecurityGroup.addIngressRule(ec2.Peer.securityGroupId(albSg.securityGroupId), ec2.Port.tcp(port), `Allow ALB to service port ${port}`)
    }

    databaseSecurityGroup.addIngressRule(serviceSecurityGroup, ec2.Port.tcp(5432), 'Allow ECS to RDS')
    cacheSecurityGroup.addIngressRule(serviceSecurityGroup, ec2.Port.tcp(6379), 'Allow ECS to Redis')

    // JWT secret (must exist: study-collab/jwt with JWT_SECRET, JWT_REFRESH_SECRET)
    const jwtSecret = secretsmanager.Secret.fromSecretNameV2(this, 'JwtSecret', 'study-collab/jwt')

    // Listener with path-based rules (default: fixed 404)
    const listener = this.loadBalancer.addListener('HttpListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        contentType: 'application/json',
        messageBody: JSON.stringify({ error: 'Not Found', path: 'No matching service' }),
      }),
    })

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
      })

      listener.addAction(`${svc.name}Rule`, {
        priority: SERVICES.indexOf(svc) + 1,
        conditions: [elbv2.ListenerCondition.pathPatterns([`${svc.pathPrefix}*`, `${svc.pathPrefix}`])],
        action: elbv2.ListenerAction.forward([targetGroup]),
      })

      this.createService(svc.name, svc.port, vpc, serviceSecurityGroup, targetGroup, databaseSecret, redisEndpoint, jwtSecret)
    }

    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'Application Load Balancer DNS',
      exportName: 'StudyCollabALBDns',
    })

    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: 'StudyCollabClusterName',
    })
  }

  private createService(
    serviceName: string,
    port: number,
    vpc: ec2.Vpc,
    securityGroup: ec2.SecurityGroup,
    targetGroup: elbv2.ApplicationTargetGroup,
    databaseSecret: secretsmanager.Secret,
    redisEndpoint: string,
    jwtSecret: secretsmanager.ISecret
  ) {
    const repo = new ecr.Repository(this, `${serviceName}Repo`, {
      repositoryName: `study-collab-${serviceName}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    const taskDefinition = new ecs.FargateTaskDefinition(this, `${serviceName}TaskDef`, {
      memoryLimitMiB: 512,
      cpu: 256,
    })

    databaseSecret.grantRead(taskDefinition.taskRole)
    jwtSecret.grantRead(taskDefinition.taskRole)

    if (serviceName === 'practice') {
      taskDefinition.taskRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess')
      )
    }

    if (serviceName === 'pod') {
      taskDefinition.taskRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonChimeSDKMediaPipelinesServiceLinkedRolePolicy')
      )
    }

    const logGroup = new logs.LogGroup(this, `${serviceName}LogGroup`, {
      logGroupName: `/ecs/study-collab/${serviceName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

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
    })

    container.addPortMappings({
      containerPort: port,
      protocol: ecs.Protocol.TCP,
    })

    const service = new ecs.FargateService(this, `${serviceName}Service`, {
      cluster: this.cluster,
      taskDefinition,
      desiredCount: 1,
      securityGroups: [securityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      serviceName: `study-collab-${serviceName}`,
    })

    service.attachToApplicationTargetGroup(targetGroup)

    const scaling = service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 10,
    })
    scaling.scaleOnCpuUtilization(`${serviceName}CpuScaling`, {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    })
  }
}
