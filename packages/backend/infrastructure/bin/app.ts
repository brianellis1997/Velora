#!/usr/bin/env node
import 'source-map-support/register';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/stacks/DatabaseStack';
import { AuthStack } from '../lib/stacks/AuthStack';
import { ApiStack } from '../lib/stacks/ApiStack';
import { FunctionStack } from '../lib/stacks/FunctionStack';

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const databaseStack = new DatabaseStack(app, 'VeloraDatabaseStack', {
  env,
  description: 'Velora Database Stack - DynamoDB tables',
});

const authStack = new AuthStack(app, 'VeloraAuthStack', {
  env,
  description: 'Velora Authentication Stack - Cognito User Pool',
});

const functionStack = new FunctionStack(app, 'VeloraFunctionStack', {
  env,
  description: 'Velora Function Stack - Lambda functions',
  tables: databaseStack.tables,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});

const apiStack = new ApiStack(app, 'VeloraApiStack', {
  env,
  description: 'Velora API Stack - API Gateway',
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  functions: functionStack.functions,
});

cdk.Tags.of(app).add('Project', 'Velora');
cdk.Tags.of(app).add('Environment', process.env.ENVIRONMENT || 'development');
