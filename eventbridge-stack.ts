import * as cdk from 'aws-cdk-lib'
import * as events from 'aws-cdk-lib/aws-events'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'

export class EventBridgeStack extends cdk.Stack {
  public readonly eventBus: events.EventBus
  public readonly deadLetterQueue: sqs.Queue

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Event bus
    this.eventBus = new events.EventBus(this, 'EventBus', {
      eventBusName: 'study-collab-events',
    })

    // Dead letter queue for failed events
    this.deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', {
      queueName: 'study-collab-dlq',
      retentionPeriod: cdk.Duration.days(14),
    })

    // Event rules
    new events.Rule(this, 'SessionCompletedRule', {
      eventBus: this.eventBus,
      eventPattern: {
        source: ['study-service'],
        detailType: ['session_completed'],
      },
      ruleName: 'session-completed-rule',
      description: 'Route session completed events to leaderboard service',
    })

    // Archive for event replay
    new events.Archive(this, 'EventArchive', {
      sourceEventBus: this.eventBus,
      archiveName: 'study-collab-archive',
      retention: cdk.Duration.days(30),
      eventPattern: {
        source: ['study-service'],
      },
    })

    // Outputs
    new cdk.CfnOutput(this, 'EventBusName', {
      value: this.eventBus.eventBusName,
      description: 'EventBridge Event Bus Name',
      exportName: 'StudyCollabEventBusName',
    })

    new cdk.CfnOutput(this, 'EventBusArn', {
      value: this.eventBus.eventBusArn,
      description: 'EventBridge Event Bus ARN',
      exportName: 'StudyCollabEventBusArn',
    })
  }
}
