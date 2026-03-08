import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
interface EcsStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    databaseSecurityGroup: ec2.SecurityGroup;
    cacheSecurityGroup: ec2.SecurityGroup;
    databaseSecret: secretsmanager.Secret;
    redisEndpoint: string;
}
export declare class EcsStack extends cdk.Stack {
    readonly cluster: ecs.Cluster;
    readonly loadBalancer: elbv2.ApplicationLoadBalancer;
    constructor(scope: Construct, id: string, props: EcsStackProps);
    private createService;
}
export {};
