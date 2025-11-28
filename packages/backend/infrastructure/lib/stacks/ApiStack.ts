import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigatewayv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface ApiStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  functions: {
    register: lambda.Function;
    confirm: lambda.Function;
    login: lambda.Function;
    getProfile: lambda.Function;
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
}

export class ApiStack extends cdk.Stack {
  public readonly httpApi: apigatewayv2.HttpApi;
  public readonly wsApi: apigatewayv2.WebSocketApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { userPool, functions } = props;

    const httpApi = new apigatewayv2.HttpApi(this, 'VeloraHttpApi', {
      apiName: 'velora-http-api',
      description: 'Velora HTTP API',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'],
        maxAge: cdk.Duration.days(1),
      },
    });

    const authorizer = new apigatewayv2Authorizers.HttpUserPoolAuthorizer('CognitoAuthorizer', userPool, {
      userPoolClients: [props.userPoolClient],
    });

    httpApi.addRoutes({
      path: '/auth/register',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('RegisterIntegration', functions.register),
    });

    httpApi.addRoutes({
      path: '/auth/confirm',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('ConfirmIntegration', functions.confirm),
    });

    httpApi.addRoutes({
      path: '/auth/login',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('LoginIntegration', functions.login),
    });

    httpApi.addRoutes({
      path: '/users/profile',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('GetProfileIntegration', functions.getProfile),
      authorizer,
    });

    httpApi.addRoutes({
      path: '/characters',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('CreateCharacterIntegration', functions.createCharacter),
      authorizer,
    });

    httpApi.addRoutes({
      path: '/characters',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('ListCharactersIntegration', functions.listCharacters),
      authorizer,
    });

    httpApi.addRoutes({
      path: '/characters/{characterId}',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('GetCharacterIntegration', functions.getCharacter),
      authorizer,
    });

    httpApi.addRoutes({
      path: '/characters/{characterId}',
      methods: [apigatewayv2.HttpMethod.PUT],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('UpdateCharacterIntegration', functions.updateCharacter),
      authorizer,
    });

    httpApi.addRoutes({
      path: '/characters/{characterId}',
      methods: [apigatewayv2.HttpMethod.DELETE],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('DeleteCharacterIntegration', functions.deleteCharacter),
      authorizer,
    });

    httpApi.addRoutes({
      path: '/conversations',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('CreateConversationIntegration', functions.createConversation),
      authorizer,
    });

    httpApi.addRoutes({
      path: '/conversations',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('ListConversationsIntegration', functions.listConversations),
      authorizer,
    });

    httpApi.addRoutes({
      path: '/conversations/{conversationId}/messages',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('GetMessagesIntegration', functions.getMessages),
      authorizer,
    });

    httpApi.addRoutes({
      path: '/chat/transcribe',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('TranscribeIntegration', functions.transcribe),
      authorizer,
    });

    const wsApi = new apigatewayv2.WebSocketApi(this, 'VeloraWebSocketApi', {
      apiName: 'velora-websocket-api',
      description: 'Velora WebSocket API for real-time chat',
      connectRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration('ConnectIntegration', functions.wsConnect),
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration('DisconnectIntegration', functions.wsDisconnect),
      },
      defaultRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration('MessageIntegration', functions.wsMessage),
      },
    });

    const wsStage = new apigatewayv2.WebSocketStage(this, 'VeloraWebSocketStage', {
      webSocketApi: wsApi,
      stageName: 'production',
      autoDeploy: true,
    });

    this.httpApi = httpApi;
    this.wsApi = wsApi;

    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: httpApi.url || '',
      exportName: 'VeloraHttpApiUrl',
    });

    new cdk.CfnOutput(this, 'WebSocketApiUrl', {
      value: wsStage.url,
      exportName: 'VeloraWebSocketApiUrl',
    });
  }
}
