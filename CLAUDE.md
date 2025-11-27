# Velora Project - Claude Code Instructions

## Project Overview
Velora is an AI companion web service where users create customized AI companions and chat with them in real-time using streaming responses.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand
- **Backend**: AWS Lambda (Node.js 20.x), TypeScript
- **Infrastructure**: AWS CDK, deployed via `cdk deploy --all`
- **Database**: DynamoDB (5 tables: users, characters, conversations, messages, subscriptions)
- **Auth**: AWS Cognito User Pools
- **AI**: Groq API (llama-3.3-70b-versatile model)
- **Real-time**: WebSocket API Gateway for streaming chat

## AWS Configuration
- **Account ID**: 932193695204
- **IAM User**: brianellis1997
- **Region**: us-east-1
- **Required IAM Policy**: AdministratorAccess (for CDK deployments)

## Key Paths
- Infrastructure CDK: `packages/backend/infrastructure/`
- Lambda functions: `packages/backend/src/functions/`
- Shared types: `packages/shared/src/`
- Frontend: `packages/frontend/`

## Environment Variables
- `GROQ_API_KEY`: Required for deployment. Set in `packages/backend/infrastructure/.env`
- Copy from `.env.example` if needed

## Deployment Commands
```bash
# From project root
cd packages/backend/infrastructure

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy all stacks
cdk deploy --all --require-approval never

# Destroy all stacks
cdk destroy --all
```

## Common Issues & Solutions
1. **pnpm not found**: Run `eval "$(/opt/homebrew/bin/brew shellenv)"` or restart terminal
2. **CDK dependencies missing**: Run `npm install` in infrastructure folder
3. **Docker bundling fails**: Install esbuild globally: `npm install -g esbuild`
4. **@velora/shared not resolved**: Bundling config uses esbuild alias to resolve workspace package

## Stacks Created
1. VeloraDatabaseStack - DynamoDB tables
2. VeloraAuthStack - Cognito + Secrets Manager
3. VeloraFunctionStack - 14 Lambda functions
4. VeloraApiStack - HTTP API + WebSocket API

## Deployed API URLs (Production)
- HTTP API: https://xntr5d5nsg.execute-api.us-east-1.amazonaws.com/
- WebSocket: wss://1wk8j531gd.execute-api.us-east-1.amazonaws.com/production

## Cognito Configuration
- User Pool ID: us-east-1_5BqDl5OAT
- Client ID: 28r7iet0u3nqnsnaa1vgt2n91p

## Frontend
- Environment file: `packages/frontend/.env.local`
- Run locally: `cd packages/frontend && pnpm dev`
