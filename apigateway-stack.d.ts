import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
interface ApiGatewayStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    loadBalancer: elbv2.ApplicationLoadBalancer;
}
export declare class ApiGatewayStack extends cdk.Stack {
    readonly restApi: apigateway.RestApi;
    readonly webSocketApi: apigatewayv2.CfnApi;
    constructor(scope: Construct, id: string, props: ApiGatewayStackProps);
}
export {};
