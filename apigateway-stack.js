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
exports.ApiGatewayStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const apigatewayv2 = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
class ApiGatewayStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { vpc, loadBalancer } = props;
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
        });
        // VPC Link for ALB integration
        const vpcLink = new apigateway.VpcLink(this, 'VpcLink', {
            targets: [loadBalancer],
            vpcLinkName: 'study-collab-vpc-link',
        });
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
        });
        // Add proxy resource
        const proxyResource = this.restApi.root.addResource('{proxy+}');
        proxyResource.addMethod('ANY', integration, {
            requestParameters: {
                'method.request.path.proxy': true,
            },
        });
        // WebSocket API
        this.webSocketApi = new apigatewayv2.CfnApi(this, 'WebSocketApi', {
            name: 'study-collab-websocket',
            protocolType: 'WEBSOCKET',
            routeSelectionExpression: '$request.body.action',
        });
        // WebSocket stage
        const webSocketStage = new apigatewayv2.CfnStage(this, 'WebSocketStage', {
            apiId: this.webSocketApi.ref,
            stageName: 'prod',
            autoDeploy: true,
        });
        // Outputs
        new cdk.CfnOutput(this, 'RestApiUrl', {
            value: this.restApi.url,
            description: 'REST API Gateway URL',
            exportName: 'StudyCollabRestApiUrl',
        });
        new cdk.CfnOutput(this, 'WebSocketApiUrl', {
            value: `wss://${this.webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/${webSocketStage.stageName}`,
            description: 'WebSocket API URL',
            exportName: 'StudyCollabWebSocketApiUrl',
        });
    }
}
exports.ApiGatewayStack = ApiGatewayStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpZ2F0ZXdheS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwaWdhdGV3YXktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQWtDO0FBRWxDLHVFQUF3RDtBQUN4RCwyRUFBNEQ7QUFTNUQsTUFBYSxlQUFnQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSTVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMkI7UUFDbkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFdkIsTUFBTSxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFFbkMsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDckQsV0FBVyxFQUFFLGtCQUFrQjtZQUMvQixXQUFXLEVBQUUsdUJBQXVCO1lBQ3BDLGFBQWEsRUFBRTtnQkFDYixTQUFTLEVBQUUsTUFBTTtnQkFDakIsbUJBQW1CLEVBQUUsSUFBSTtnQkFDekIsb0JBQW9CLEVBQUUsSUFBSTtnQkFDMUIsWUFBWSxFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJO2dCQUNoRCxnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixjQUFjLEVBQUUsSUFBSTthQUNyQjtZQUNELDJCQUEyQixFQUFFO2dCQUMzQixZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUU7b0JBQ1osY0FBYztvQkFDZCxlQUFlO29CQUNmLFlBQVk7b0JBQ1osV0FBVztvQkFDWCxzQkFBc0I7aUJBQ3ZCO2FBQ0Y7U0FDRixDQUFDLENBQUE7UUFFRiwrQkFBK0I7UUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDdEQsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDO1lBQ3ZCLFdBQVcsRUFBRSx1QkFBdUI7U0FDckMsQ0FBQyxDQUFBO1FBRUYsNEJBQTRCO1FBQzVCLE1BQU0sV0FBVyxHQUFHLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUM3QyxJQUFJLEVBQUUsVUFBVSxDQUFDLGVBQWUsQ0FBQyxVQUFVO1lBQzNDLHFCQUFxQixFQUFFLEtBQUs7WUFDNUIsR0FBRyxFQUFFLFVBQVUsWUFBWSxDQUFDLG1CQUFtQixVQUFVO1lBQ3pELE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsVUFBVSxDQUFDLGNBQWMsQ0FBQyxRQUFRO2dCQUNsRCxPQUFPO2dCQUNQLGlCQUFpQixFQUFFO29CQUNqQixnQ0FBZ0MsRUFBRSwyQkFBMkI7aUJBQzlEO2FBQ0Y7U0FDRixDQUFDLENBQUE7UUFFRixxQkFBcUI7UUFDckIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQy9ELGFBQWEsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRTtZQUMxQyxpQkFBaUIsRUFBRTtnQkFDakIsMkJBQTJCLEVBQUUsSUFBSTthQUNsQztTQUNGLENBQUMsQ0FBQTtRQUVGLGdCQUFnQjtRQUNoQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ2hFLElBQUksRUFBRSx3QkFBd0I7WUFDOUIsWUFBWSxFQUFFLFdBQVc7WUFDekIsd0JBQXdCLEVBQUUsc0JBQXNCO1NBQ2pELENBQUMsQ0FBQTtRQUVGLGtCQUFrQjtRQUNsQixNQUFNLGNBQWMsR0FBRyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3ZFLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUc7WUFDNUIsU0FBUyxFQUFFLE1BQU07WUFDakIsVUFBVSxFQUFFLElBQUk7U0FDakIsQ0FBQyxDQUFBO1FBRUYsVUFBVTtRQUNWLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3BDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUc7WUFDdkIsV0FBVyxFQUFFLHNCQUFzQjtZQUNuQyxVQUFVLEVBQUUsdUJBQXVCO1NBQ3BDLENBQUMsQ0FBQTtRQUVGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDekMsS0FBSyxFQUFFLFNBQVMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLGdCQUFnQixJQUFJLENBQUMsTUFBTSxrQkFBa0IsY0FBYyxDQUFDLFNBQVMsRUFBRTtZQUM1RyxXQUFXLEVBQUUsbUJBQW1CO1lBQ2hDLFVBQVUsRUFBRSw0QkFBNEI7U0FDekMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBekZELDBDQXlGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcclxuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInXHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknXHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXl2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJ1xyXG5pbXBvcnQgKiBhcyBlbGJ2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWxhc3RpY2xvYWRiYWxhbmNpbmd2MidcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcclxuXHJcbmludGVyZmFjZSBBcGlHYXRld2F5U3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICB2cGM6IGVjMi5WcGNcclxuICBsb2FkQmFsYW5jZXI6IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBcGlHYXRld2F5U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIHB1YmxpYyByZWFkb25seSByZXN0QXBpOiBhcGlnYXRld2F5LlJlc3RBcGlcclxuICBwdWJsaWMgcmVhZG9ubHkgd2ViU29ja2V0QXBpOiBhcGlnYXRld2F5djIuQ2ZuQXBpXHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBcGlHYXRld2F5U3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcclxuXHJcbiAgICBjb25zdCB7IHZwYywgbG9hZEJhbGFuY2VyIH0gPSBwcm9wc1xyXG5cclxuICAgIC8vIFJFU1QgQVBJIEdhdGV3YXlcclxuICAgIHRoaXMucmVzdEFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ1Jlc3RBcGknLCB7XHJcbiAgICAgIHJlc3RBcGlOYW1lOiAnc3R1ZHktY29sbGFiLWFwaScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU3R1ZHkgQ29sbGFiIFJFU1QgQVBJJyxcclxuICAgICAgZGVwbG95T3B0aW9uczoge1xyXG4gICAgICAgIHN0YWdlTmFtZTogJ3Byb2QnLFxyXG4gICAgICAgIHRocm90dGxpbmdSYXRlTGltaXQ6IDEwMDAsXHJcbiAgICAgICAgdGhyb3R0bGluZ0J1cnN0TGltaXQ6IDIwMDAsXHJcbiAgICAgICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxyXG4gICAgICAgIGRhdGFUcmFjZUVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgbWV0cmljc0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xyXG4gICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxyXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxyXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXHJcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICAgICAnWC1BbXotRGF0ZScsXHJcbiAgICAgICAgICAnWC1BcGktS2V5JyxcclxuICAgICAgICAgICdYLUFtei1TZWN1cml0eS1Ub2tlbicsXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgIH0pXHJcblxyXG4gICAgLy8gVlBDIExpbmsgZm9yIEFMQiBpbnRlZ3JhdGlvblxyXG4gICAgY29uc3QgdnBjTGluayA9IG5ldyBhcGlnYXRld2F5LlZwY0xpbmsodGhpcywgJ1ZwY0xpbmsnLCB7XHJcbiAgICAgIHRhcmdldHM6IFtsb2FkQmFsYW5jZXJdLFxyXG4gICAgICB2cGNMaW5rTmFtZTogJ3N0dWR5LWNvbGxhYi12cGMtbGluaycsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIFByb3h5IGFsbCByZXF1ZXN0cyB0byBBTEJcclxuICAgIGNvbnN0IGludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuSW50ZWdyYXRpb24oe1xyXG4gICAgICB0eXBlOiBhcGlnYXRld2F5LkludGVncmF0aW9uVHlwZS5IVFRQX1BST1hZLFxyXG4gICAgICBpbnRlZ3JhdGlvbkh0dHBNZXRob2Q6ICdBTlknLFxyXG4gICAgICB1cmk6IGBodHRwOi8vJHtsb2FkQmFsYW5jZXIubG9hZEJhbGFuY2VyRG5zTmFtZX0ve3Byb3h5fWAsXHJcbiAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICBjb25uZWN0aW9uVHlwZTogYXBpZ2F0ZXdheS5Db25uZWN0aW9uVHlwZS5WUENfTElOSyxcclxuICAgICAgICB2cGNMaW5rLFxyXG4gICAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgICAnaW50ZWdyYXRpb24ucmVxdWVzdC5wYXRoLnByb3h5JzogJ21ldGhvZC5yZXF1ZXN0LnBhdGgucHJveHknLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIEFkZCBwcm94eSByZXNvdXJjZVxyXG4gICAgY29uc3QgcHJveHlSZXNvdXJjZSA9IHRoaXMucmVzdEFwaS5yb290LmFkZFJlc291cmNlKCd7cHJveHkrfScpXHJcbiAgICBwcm94eVJlc291cmNlLmFkZE1ldGhvZCgnQU5ZJywgaW50ZWdyYXRpb24sIHtcclxuICAgICAgcmVxdWVzdFBhcmFtZXRlcnM6IHtcclxuICAgICAgICAnbWV0aG9kLnJlcXVlc3QucGF0aC5wcm94eSc6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIFdlYlNvY2tldCBBUElcclxuICAgIHRoaXMud2ViU29ja2V0QXBpID0gbmV3IGFwaWdhdGV3YXl2Mi5DZm5BcGkodGhpcywgJ1dlYlNvY2tldEFwaScsIHtcclxuICAgICAgbmFtZTogJ3N0dWR5LWNvbGxhYi13ZWJzb2NrZXQnLFxyXG4gICAgICBwcm90b2NvbFR5cGU6ICdXRUJTT0NLRVQnLFxyXG4gICAgICByb3V0ZVNlbGVjdGlvbkV4cHJlc3Npb246ICckcmVxdWVzdC5ib2R5LmFjdGlvbicsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIFdlYlNvY2tldCBzdGFnZVxyXG4gICAgY29uc3Qgd2ViU29ja2V0U3RhZ2UgPSBuZXcgYXBpZ2F0ZXdheXYyLkNmblN0YWdlKHRoaXMsICdXZWJTb2NrZXRTdGFnZScsIHtcclxuICAgICAgYXBpSWQ6IHRoaXMud2ViU29ja2V0QXBpLnJlZixcclxuICAgICAgc3RhZ2VOYW1lOiAncHJvZCcsXHJcbiAgICAgIGF1dG9EZXBsb3k6IHRydWUsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIE91dHB1dHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZXN0QXBpVXJsJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5yZXN0QXBpLnVybCxcclxuICAgICAgZGVzY3JpcHRpb246ICdSRVNUIEFQSSBHYXRld2F5IFVSTCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdTdHVkeUNvbGxhYlJlc3RBcGlVcmwnLFxyXG4gICAgfSlcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2ViU29ja2V0QXBpVXJsJywge1xyXG4gICAgICB2YWx1ZTogYHdzczovLyR7dGhpcy53ZWJTb2NrZXRBcGkucmVmfS5leGVjdXRlLWFwaS4ke3RoaXMucmVnaW9ufS5hbWF6b25hd3MuY29tLyR7d2ViU29ja2V0U3RhZ2Uuc3RhZ2VOYW1lfWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnV2ViU29ja2V0IEFQSSBVUkwnLFxyXG4gICAgICBleHBvcnROYW1lOiAnU3R1ZHlDb2xsYWJXZWJTb2NrZXRBcGlVcmwnLFxyXG4gICAgfSlcclxuICB9XHJcbn1cclxuIl19