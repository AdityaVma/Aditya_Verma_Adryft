import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
export declare class EventBridgeStack extends cdk.Stack {
    readonly eventBus: events.EventBus;
    readonly deadLetterQueue: sqs.Queue;
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
