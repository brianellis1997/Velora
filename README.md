# Velora - AI Companion Service

Your personalized AI companion experience. Create unique characters and engage in meaningful conversations powered by Groq AI.

## Architecture

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: AWS Lambda + TypeScript
- **API**: AWS API Gateway (HTTP + WebSocket)
- **Database**: Amazon DynamoDB
- **Auth**: AWS Cognito
- **AI**: Groq API
- **Infrastructure**: AWS CDK

## Project Structure

```
velora/
├── packages/
│   ├── frontend/          # Next.js application
│   ├── backend/           # Lambda functions + AWS CDK infrastructure
│   └── shared/            # Shared TypeScript types
├── package.json           # Root workspace configuration
└── pnpm-workspace.yaml    # pnpm monorepo configuration
```

## Prerequisites

1. **Node.js** 20+ and **pnpm** 8+
2. **AWS Account** with CLI configured
3. **Groq API Key** (already in your AWS Secrets Manager)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

This will install dependencies for all packages in the monorepo.

### 2. Configure AWS CLI

If you haven't already:

```bash
aws configure
```

Enter your AWS credentials when prompted.

### 3. Deploy Infrastructure

```bash
cd packages/backend/infrastructure
pnpm install
pnpm cdk bootstrap  # Only needed once per AWS account
pnpm cdk deploy --all
```

This will deploy:
- DynamoDB tables
- Cognito User Pool
- Lambda functions
- API Gateway (HTTP + WebSocket)
- Secrets Manager (Groq API key)

After deployment completes, note the output values:
- `HttpApiUrl`
- `WebSocketApiUrl`
- `UserPoolId`
- `UserPoolClientId`

### 4. Configure Frontend Environment

Create `packages/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=<HttpApiUrl from CDK output>
NEXT_PUBLIC_WS_URL=<WebSocketApiUrl from CDK output>
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<UserPoolId from CDK output>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<UserPoolClientId from CDK output>
NEXT_PUBLIC_AWS_REGION=us-east-1
```

### 5. Run Frontend Locally

```bash
cd packages/frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Register**: Create an account at `/register`
2. **Login**: Sign in at `/login`
3. **Create Character**: Describe your ideal AI companion
4. **Chat**: Start a real-time conversation with streaming responses

## Features

### Phase 1 (Current)
- User authentication (Cognito)
- Character creation from natural language prompts
- Real-time WebSocket chat with streaming
- Chat history persistence
- Dashboard with character management

### Phase 2 (Planned)
- Advanced character customization
- Multiple characters per user
- Conversation search and filtering
- Character avatar uploads
- Usage analytics

### Phase 3 (Planned)
- Subscription tiers
- Stripe payment integration
- Pay-per-message credits
- Rate limiting per tier

### Phase 4 (Future)
- Video generation
- Voice synthesis
- Character marketplace

## Development

### Build all packages

```bash
pnpm build
```

### Run tests

```bash
pnpm test
```

### Deploy infrastructure

```bash
pnpm deploy:infra
```

### Clean build artifacts

```bash
pnpm clean
```

## Key Technologies

- **Groq API**: High-speed LLM inference (300+ tokens/sec)
- **AWS Lambda**: Serverless compute
- **DynamoDB**: NoSQL database with auto-scaling
- **API Gateway WebSocket**: Real-time bidirectional communication
- **Next.js**: React framework with SSR
- **TypeScript**: Type-safe development across full stack
- **Tailwind CSS**: Utility-first CSS framework

## Cost Estimation

For 1,000 monthly active users (50 messages each):
- AWS: ~$25/month
- Groq API: ~$1/month
- **Total**: ~$26/month

Per-user cost: $0.026

## Troubleshooting

### CDK Deployment Fails

Make sure you've bootstrapped your AWS account:
```bash
cd packages/backend/infrastructure
pnpm cdk bootstrap
```

### WebSocket Connection Fails

1. Check that `NEXT_PUBLIC_WS_URL` is set correctly
2. Verify the WebSocket API is deployed
3. Check CloudWatch logs for errors

### Character Creation Hangs

1. Verify Groq API key is in AWS Secrets Manager
2. Check Lambda function has permissions to access Secrets Manager
3. Review CloudWatch logs for the create-character Lambda

### Authentication Errors

1. Ensure Cognito User Pool ID and Client ID are correct
2. Check that auto-confirmation is enabled if testing
3. Verify email delivery settings in Cognito

## License

Apache License 2.0
