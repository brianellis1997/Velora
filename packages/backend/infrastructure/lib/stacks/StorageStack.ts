import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class StorageStack extends cdk.Stack {
  public readonly characterAssetsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.characterAssetsBucket = new s3.Bucket(this, 'CharacterAssetsBucket', {
      bucketName: `velora-character-assets-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          enabled: true,
          expiration: cdk.Duration.days(90),
        },
      ],
    });

    new cdk.CfnOutput(this, 'CharacterAssetsBucketName', {
      value: this.characterAssetsBucket.bucketName,
      exportName: 'VeloraCharacterAssetsBucketName',
    });
  }
}
