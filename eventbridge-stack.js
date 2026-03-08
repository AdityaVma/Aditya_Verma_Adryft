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
exports.EventBridgeStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const sqs = __importStar(require("aws-cdk-lib/aws-sqs"));
class EventBridgeStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Event bus
        this.eventBus = new events.EventBus(this, 'EventBus', {
            eventBusName: 'study-collab-events',
        });
        // Dead letter queue for failed events
        this.deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', {
            queueName: 'study-collab-dlq',
            retentionPeriod: cdk.Duration.days(14),
        });
        // Event rules
        new events.Rule(this, 'SessionCompletedRule', {
            eventBus: this.eventBus,
            eventPattern: {
                source: ['study-service'],
                detailType: ['session_completed'],
            },
            ruleName: 'session-completed-rule',
            description: 'Route session completed events to leaderboard service',
        });
        // Archive for event replay
        new events.Archive(this, 'EventArchive', {
            sourceEventBus: this.eventBus,
            archiveName: 'study-collab-archive',
            retention: cdk.Duration.days(30),
            eventPattern: {
                source: ['study-service'],
            },
        });
        // Outputs
        new cdk.CfnOutput(this, 'EventBusName', {
            value: this.eventBus.eventBusName,
            description: 'EventBridge Event Bus Name',
            exportName: 'StudyCollabEventBusName',
        });
        new cdk.CfnOutput(this, 'EventBusArn', {
            value: this.eventBus.eventBusArn,
            description: 'EventBridge Event Bus ARN',
            exportName: 'StudyCollabEventBusArn',
        });
    }
}
exports.EventBridgeStack = EventBridgeStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRicmlkZ2Utc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJldmVudGJyaWRnZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFDbEMsK0RBQWdEO0FBQ2hELHlEQUEwQztBQUcxQyxNQUFhLGdCQUFpQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSTdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFdkIsWUFBWTtRQUNaLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDcEQsWUFBWSxFQUFFLHFCQUFxQjtTQUNwQyxDQUFDLENBQUE7UUFFRixzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQzVELFNBQVMsRUFBRSxrQkFBa0I7WUFDN0IsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztTQUN2QyxDQUFDLENBQUE7UUFFRixjQUFjO1FBQ2QsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUM1QyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsWUFBWSxFQUFFO2dCQUNaLE1BQU0sRUFBRSxDQUFDLGVBQWUsQ0FBQztnQkFDekIsVUFBVSxFQUFFLENBQUMsbUJBQW1CLENBQUM7YUFDbEM7WUFDRCxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLFdBQVcsRUFBRSx1REFBdUQ7U0FDckUsQ0FBQyxDQUFBO1FBRUYsMkJBQTJCO1FBQzNCLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3ZDLGNBQWMsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUM3QixXQUFXLEVBQUUsc0JBQXNCO1lBQ25DLFNBQVMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDaEMsWUFBWSxFQUFFO2dCQUNaLE1BQU0sRUFBRSxDQUFDLGVBQWUsQ0FBQzthQUMxQjtTQUNGLENBQUMsQ0FBQTtRQUVGLFVBQVU7UUFDVixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZO1lBQ2pDLFdBQVcsRUFBRSw0QkFBNEI7WUFDekMsVUFBVSxFQUFFLHlCQUF5QjtTQUN0QyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXO1lBQ2hDLFdBQVcsRUFBRSwyQkFBMkI7WUFDeEMsVUFBVSxFQUFFLHdCQUF3QjtTQUNyQyxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUFwREQsNENBb0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xyXG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cydcclxuaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnXHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXHJcblxyXG5leHBvcnQgY2xhc3MgRXZlbnRCcmlkZ2VTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGV2ZW50QnVzOiBldmVudHMuRXZlbnRCdXNcclxuICBwdWJsaWMgcmVhZG9ubHkgZGVhZExldHRlclF1ZXVlOiBzcXMuUXVldWVcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcclxuXHJcbiAgICAvLyBFdmVudCBidXNcclxuICAgIHRoaXMuZXZlbnRCdXMgPSBuZXcgZXZlbnRzLkV2ZW50QnVzKHRoaXMsICdFdmVudEJ1cycsIHtcclxuICAgICAgZXZlbnRCdXNOYW1lOiAnc3R1ZHktY29sbGFiLWV2ZW50cycsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIERlYWQgbGV0dGVyIHF1ZXVlIGZvciBmYWlsZWQgZXZlbnRzXHJcbiAgICB0aGlzLmRlYWRMZXR0ZXJRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0RlYWRMZXR0ZXJRdWV1ZScsIHtcclxuICAgICAgcXVldWVOYW1lOiAnc3R1ZHktY29sbGFiLWRscScsXHJcbiAgICAgIHJldGVudGlvblBlcmlvZDogY2RrLkR1cmF0aW9uLmRheXMoMTQpLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBFdmVudCBydWxlc1xyXG4gICAgbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdTZXNzaW9uQ29tcGxldGVkUnVsZScsIHtcclxuICAgICAgZXZlbnRCdXM6IHRoaXMuZXZlbnRCdXMsXHJcbiAgICAgIGV2ZW50UGF0dGVybjoge1xyXG4gICAgICAgIHNvdXJjZTogWydzdHVkeS1zZXJ2aWNlJ10sXHJcbiAgICAgICAgZGV0YWlsVHlwZTogWydzZXNzaW9uX2NvbXBsZXRlZCddLFxyXG4gICAgICB9LFxyXG4gICAgICBydWxlTmFtZTogJ3Nlc3Npb24tY29tcGxldGVkLXJ1bGUnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1JvdXRlIHNlc3Npb24gY29tcGxldGVkIGV2ZW50cyB0byBsZWFkZXJib2FyZCBzZXJ2aWNlJyxcclxuICAgIH0pXHJcblxyXG4gICAgLy8gQXJjaGl2ZSBmb3IgZXZlbnQgcmVwbGF5XHJcbiAgICBuZXcgZXZlbnRzLkFyY2hpdmUodGhpcywgJ0V2ZW50QXJjaGl2ZScsIHtcclxuICAgICAgc291cmNlRXZlbnRCdXM6IHRoaXMuZXZlbnRCdXMsXHJcbiAgICAgIGFyY2hpdmVOYW1lOiAnc3R1ZHktY29sbGFiLWFyY2hpdmUnLFxyXG4gICAgICByZXRlbnRpb246IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcclxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XHJcbiAgICAgICAgc291cmNlOiBbJ3N0dWR5LXNlcnZpY2UnXSxcclxuICAgICAgfSxcclxuICAgIH0pXHJcblxyXG4gICAgLy8gT3V0cHV0c1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0V2ZW50QnVzTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuZXZlbnRCdXMuZXZlbnRCdXNOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0V2ZW50QnJpZGdlIEV2ZW50IEJ1cyBOYW1lJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ1N0dWR5Q29sbGFiRXZlbnRCdXNOYW1lJyxcclxuICAgIH0pXHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0V2ZW50QnVzQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5ldmVudEJ1cy5ldmVudEJ1c0FybixcclxuICAgICAgZGVzY3JpcHRpb246ICdFdmVudEJyaWRnZSBFdmVudCBCdXMgQVJOJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ1N0dWR5Q29sbGFiRXZlbnRCdXNBcm4nLFxyXG4gICAgfSlcclxuICB9XHJcbn1cclxuIl19