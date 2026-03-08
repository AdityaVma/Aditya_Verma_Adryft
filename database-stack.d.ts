import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
interface DatabaseStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
}
export declare class DatabaseStack extends cdk.Stack {
    readonly database: rds.DatabaseInstance;
    readonly databaseSecret: secretsmanager.Secret;
    readonly databaseSecurityGroup: ec2.SecurityGroup;
    readonly cacheCluster: elasticache.CfnCacheCluster;
    readonly cacheSecurityGroup: ec2.SecurityGroup;
    readonly redisEndpoint: string;
    constructor(scope: Construct, id: string, props: DatabaseStackProps);
}
export {};
