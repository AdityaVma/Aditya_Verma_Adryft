import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { Construct } from 'constructs'

interface ApiGatewayStackProps extends cdk.StackProps {
  vpc: ec2.Vpc
  loadBalancer: elbv2.ApplicationLoadBalancer
}

export class ApiGatewayStack extends cdk.Stack {
  public readonly restApi: apigateway.RestApi
  public readonly webSocketApi: apigatewayv2.CfnApi

  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props)

    const { vpc, loadBalancer } = props

    // REST API Gateway
    this.restApi = new apigateway.RestApi(this, 'RestApi', {
      restApiName: 'study-collab-api',
      description: 'Study Collab REST API',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    })

    // VPC Link for ALB integration
    const vpcLink = new apigateway.VpcLink(this, 'VpcLink', {
      targets: [loadBalancer],
      vpcLinkName: 'study-collab-vpc-link',
    })

    // Proxy all requests to ALB
    const integration = new apigateway.Integration({
      type: apigateway.IntegrationType.HTTP_PROXY,
      integrationHttpMethod: 'ANY',
      uri: `http://${loadBalancer.loadBalancerDnsName}/{proxy}`,
      options: {
        connectionType: apigateway.ConnectionType.VPC_LINK,
        vpcLink,
        requestParameters: {
          'integration.request.path.proxy': 'method.request.path.proxy',
        },
      },
    })

    // Add proxy resource
    const proxyResource = this.restApi.root.addResource('{proxy+}')
    proxyResource.addMethod('ANY', integration, {
      requestParameters: {
        'method.request.path.proxy': true,
      },
    })

    // WebSocket API
    this.webSocketApi = new apigatewayv2.CfnApi(this, 'WebSocketApi', {
      name: 'study-collab-websocket',
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action',
    })

    // WebSocket stage
    const webSocketStage = new apigatewayv2.CfnStage(this, 'WebSocketStage', {
      apiId: this.webSocketApi.ref,
      stageName: 'prod',
      autoDeploy: true,
    })

    // Outputs
    new cdk.CfnOutput(this, 'RestApiUrl', {
      value: this.restApi.url,
      description: 'REST API Gateway URL',
      exportName: 'StudyCollabRestApiUrl',
    })

    new cdk.CfnOutput(this, 'WebSocketApiUrl', {
      value: `wss://${this.webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/${webSocketStage.stageName}`,
      description: 'WebSocket API URL',
      exportName: 'StudyCollabWebSocketApiUrl',
    })
  }
}
