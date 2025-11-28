import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

interface FunctionStackProps extends cdk.StackProps {
  tables: {
    users: dynamodb.Table;
    characters: dynamodb.Table;
    conversations: dynamodb.Table;
    messages: dynamodb.Table;
    subscriptions: dynamodb.Table;
  };
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

export class FunctionStack extends cdk.Stack {
  public readonly functions: {
    register: lambda.Function;
    confirm: lambda.Function;
    login: lambda.Function;
    getProfile: lambda.Function;
    updateProfile: lambda.Function;
    createCharacter: lambda.Function;
    listCharacters: lambda.Function;
    getCharacter: lambda.Function;
    updateCharacter: lambda.Function;
    deleteCharacter: lambda.Function;
    createConversation: lambda.Function;
    listConversations: lambda.Function;
    getMessages: lambda.Function;
    transcribe: lambda.Function;
    wsConnect: lambda.Function;
    wsDisconnect: lambda.Function;
    wsMessage: lambda.Function;
  };

  constructor(scope: Construct, id: string, props: FunctionStackProps) {
    super(scope, id, props);

    const { tables, userPool, userPoolClient } = props;

    const backendRoot = path.join(__dirname, '../../..');
    const lambdaPath = path.join(backendRoot, 'src/functions');

    const commonEnvironment = {
      USERS_TABLE: tables.users.tableName,
      CHARACTERS_TABLE: tables.characters.tableName,
      CONVERSATIONS_TABLE: tables.conversations.tableName,
      MESSAGES_TABLE: tables.messages.tableName,
      SUBSCRIPTIONS_TABLE: tables.subscriptions.tableName,
      USER_POOL_ID: userPool.userPoolId,
      COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
      GROQ_API_KEY_SECRET_NAME: 'velora/groq-api-key',
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    };

    const sharedPath = path.join(backendRoot, '../shared/src');

    const commonBundling = {
      minify: true,
      sourceMap: true,
      target: 'es2022',
      externalModules: ['@aws-sdk/*'],
      esbuildArgs: {
        '--alias:@velora/shared': sharedPath,
      },
    };

    const registerFunction = new lambdaNodejs.NodejsFunction(this, 'RegisterFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'auth/register.ts'),
      functionName: 'velora-register',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const confirmFunction = new lambdaNodejs.NodejsFunction(this, 'ConfirmFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'auth/confirm.ts'),
      functionName: 'velora-confirm',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const loginFunction = new lambdaNodejs.NodejsFunction(this, 'LoginFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'auth/login.ts'),
      functionName: 'velora-login',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const getProfileFunction = new lambdaNodejs.NodejsFunction(this, 'GetProfileFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'users/profile.ts'),
      functionName: 'velora-get-profile',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const updateProfileFunction = new lambdaNodejs.NodejsFunction(this, 'UpdateProfileFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'users/updateProfile.ts'),
      functionName: 'velora-update-profile',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const createCharacterFunction = new lambdaNodejs.NodejsFunction(this, 'CreateCharacterFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'characters/create.ts'),
      functionName: 'velora-create-character',
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const listCharactersFunction = new lambdaNodejs.NodejsFunction(this, 'ListCharactersFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'characters/list.ts'),
      functionName: 'velora-list-characters',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const getCharacterFunction = new lambdaNodejs.NodejsFunction(this, 'GetCharacterFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'characters/get.ts'),
      functionName: 'velora-get-character',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const updateCharacterFunction = new lambdaNodejs.NodejsFunction(this, 'UpdateCharacterFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'characters/update.ts'),
      functionName: 'velora-update-character',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const deleteCharacterFunction = new lambdaNodejs.NodejsFunction(this, 'DeleteCharacterFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'characters/delete.ts'),
      functionName: 'velora-delete-character',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const createConversationFunction = new lambdaNodejs.NodejsFunction(this, 'CreateConversationFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'conversations/create.ts'),
      functionName: 'velora-create-conversation',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const listConversationsFunction = new lambdaNodejs.NodejsFunction(this, 'ListConversationsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'conversations/list.ts'),
      functionName: 'velora-list-conversations',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const getMessagesFunction = new lambdaNodejs.NodejsFunction(this, 'GetMessagesFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'chat/history.ts'),
      functionName: 'velora-get-messages',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const transcribeFunction = new lambdaNodejs.NodejsFunction(this, 'TranscribeFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'chat/transcribe.ts'),
      functionName: 'velora-transcribe',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const wsConnectFunction = new lambdaNodejs.NodejsFunction(this, 'WsConnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'chat/websocket/connect.ts'),
      functionName: 'velora-ws-connect',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const wsDisconnectFunction = new lambdaNodejs.NodejsFunction(this, 'WsDisconnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'chat/websocket/disconnect.ts'),
      functionName: 'velora-ws-disconnect',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    const wsMessageFunction = new lambdaNodejs.NodejsFunction(this, 'WsMessageFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'chat/websocket/message.ts'),
      functionName: 'velora-ws-message',
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      environment: commonEnvironment,
      bundling: commonBundling,
    });

    [registerFunction, confirmFunction, loginFunction].forEach(fn => {
      userPool.grant(fn, 'cognito-idp:AdminInitiateAuth', 'cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserPassword');
    });

    const allFunctions = [
      registerFunction,
      confirmFunction,
      loginFunction,
      getProfileFunction,
      updateProfileFunction,
      createCharacterFunction,
      listCharactersFunction,
      getCharacterFunction,
      updateCharacterFunction,
      deleteCharacterFunction,
      createConversationFunction,
      listConversationsFunction,
      getMessagesFunction,
      transcribeFunction,
      wsConnectFunction,
      wsDisconnectFunction,
      wsMessageFunction,
    ];

    allFunctions.forEach(fn => {
      tables.users.grantReadWriteData(fn);
      tables.characters.grantReadWriteData(fn);
      tables.conversations.grantReadWriteData(fn);
      tables.messages.grantReadWriteData(fn);
      tables.subscriptions.grantReadWriteData(fn);

      fn.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue'],
          resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:velora/groq-api-key-*`],
        })
      );
    });

    wsMessageFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['execute-api:ManageConnections'],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:*`],
      })
    );

    this.functions = {
      register: registerFunction,
      confirm: confirmFunction,
      login: loginFunction,
      getProfile: getProfileFunction,
      updateProfile: updateProfileFunction,
      createCharacter: createCharacterFunction,
      listCharacters: listCharactersFunction,
      getCharacter: getCharacterFunction,
      updateCharacter: updateCharacterFunction,
      deleteCharacter: deleteCharacterFunction,
      createConversation: createConversationFunction,
      listConversations: listConversationsFunction,
      getMessages: getMessagesFunction,
      transcribe: transcribeFunction,
      wsConnect: wsConnectFunction,
      wsDisconnect: wsDisconnectFunction,
      wsMessage: wsMessageFunction,
    };
  }
}
