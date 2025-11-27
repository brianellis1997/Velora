# Velora Deployment Guide

Complete guide to deploying Velora to AWS.

## Prerequisites Checklist

- [ ] AWS Account with admin access
- [ ] AWS CLI installed and configured
- [ ] Node.js 20+ installed
- [ ] pnpm 8+ installed
- [ ] Groq API key

## Step-by-Step Deployment

### Step 1: Install Dependencies

```bash
# From the root of the project
pnpm install
```

### Step 2: Set Up Groq API Key (Required)

Create `packages/backend/infrastructure/.env`:

```bash
cd packages/backend/infrastructure
cp .env.example .env
```

Then edit `.env` and add your Groq API key:

```
GROQ_API_KEY=your_groq_api_key_here
```

Get your API key from: https://console.groq.com/keys

### Step 3: Bootstrap AWS CDK (First Time Only)

```bash
cd packages/backend/infrastructure
pnpm cdk bootstrap
```

This creates the necessary S3 buckets and IAM roles for CDK deployments.

### Step 4: Deploy Infrastructure

```bash
# From packages/backend/infrastructure
pnpm cdk deploy --all --require-approval never
```

This will deploy 4 stacks:
1. **VeloraDatabaseStack**: DynamoDB tables
2. **VeloraAuthStack**: Cognito + Secrets Manager
3. **VeloraFunctionStack**: Lambda functions
4. **VeloraApiStack**: API Gateway

**Expected Duration**: 5-10 minutes

### Step 5: Save CDK Outputs

After deployment completes, you'll see outputs like:

```
VeloraApiStack.HttpApiUrl = https://abc123.execute-api.us-east-1.amazonaws.com
VeloraApiStack.WebSocketApiUrl = wss://xyz789.execute-api.us-east-1.amazonaws.com/production
VeloraAuthStack.UserPoolId = us-east-1_aBcDeFgHi
VeloraAuthStack.UserPoolClientId = 1a2b3c4d5e6f7g8h9i0j
```

**Save these values** - you'll need them for the frontend.

### Step 6: Configure Frontend

Create `packages/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://abc123.execute-api.us-east-1.amazonaws.com
NEXT_PUBLIC_WS_URL=wss://xyz789.execute-api.us-east-1.amazonaws.com/production
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_aBcDeFgHi
NEXT_PUBLIC_COGNITO_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
NEXT_PUBLIC_AWS_REGION=us-east-1
```

Replace the placeholder values with your actual CDK outputs.

### Step 7: Test Locally

```bash
cd packages/frontend
pnpm dev
```

Open http://localhost:3000 and test:
1. Register a new account
2. Login
3. Create a character
4. Start a chat conversation

### Step 8: Deploy Frontend to AWS Amplify (Optional)

#### Option A: Using AWS Amplify Console

1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Connect your Git repository
4. Set build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd packages/frontend
        - npm install -g pnpm
        - pnpm install
    build:
      commands:
        - pnpm build
  artifacts:
    baseDirectory: packages/frontend/.next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - packages/frontend/node_modules/**/*
```

5. Add environment variables in Amplify console
6. Deploy

#### Option B: Using Vercel

```bash
cd packages/frontend
vercel
```

Follow the prompts and add environment variables when asked.

## Post-Deployment Configuration

### Enable Auto-Confirmation for Testing

By default, Cognito requires email verification. For testing, you can enable auto-confirmation:

1. Go to AWS Lambda Console
2. Find the "velora-register" function
3. Add environment variable: `AUTO_CONFIRM_USERS=true`

### Monitor Your Deployment

1. **CloudWatch Logs**: Check Lambda function logs
   - `/aws/lambda/velora-register`
   - `/aws/lambda/velora-ws-message`
   - etc.

2. **DynamoDB**: Verify tables are created
   - velora-users
   - velora-characters
   - velora-conversations
   - velora-messages
   - velora-subscriptions

3. **API Gateway**: Test endpoints
   ```bash
   curl https://your-api-url.com/auth/register -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"Test1234","username":"testuser"}'
   ```

## Troubleshooting

### Issue: CDK Deploy Fails with "No default VPC"

**Solution**: CDK doesn't need a VPC for this project. If you see this error, check that you're using the correct AWS region.

### Issue: Lambda Functions Timeout

**Solution**:
1. Check Lambda logs in CloudWatch
2. Verify Groq API key is accessible
3. Increase timeout in FunctionStack.ts if needed

### Issue: WebSocket Connections Fail

**Solution**:
1. Verify WebSocket URL format: `wss://...` (not `https://`)
2. Check API Gateway WebSocket API is deployed
3. Test WebSocket with wscat:
   ```bash
   npm install -g wscat
   wscat -c wss://your-ws-url.com
   ```

### Issue: Cognito Email Not Sending

**Solution**:
1. Check Cognito SES sandbox mode (limited to verified emails)
2. For production, move out of SES sandbox or use SNS
3. For testing, enable auto-confirmation (see above)

## Updating the Deployment

### Update Infrastructure

```bash
cd packages/backend/infrastructure
pnpm cdk diff  # Preview changes
pnpm cdk deploy --all
```

### Update Lambda Functions

Lambda functions are automatically updated when you deploy the infrastructure stack.

### Update Frontend

If using Amplify, push to your Git repository and Amplify will auto-deploy.

If using Vercel, run `vercel --prod` from the frontend directory.

## Cleanup (Destroy Everything)

**WARNING**: This will delete all data permanently!

```bash
cd packages/backend/infrastructure
pnpm cdk destroy --all
```

## Production Checklist

Before going to production:

- [ ] Remove hardcoded Groq API key, use env variable
- [ ] Configure custom domain name
- [ ] Set up CloudWatch alarms for errors
- [ ] Enable CloudWatch detailed monitoring
- [ ] Configure DynamoDB auto-scaling
- [ ] Set up WAF for API Gateway
- [ ] Configure CORS properly
- [ ] Enable CloudTrail for audit logging
- [ ] Set up backup strategies
- [ ] Configure rate limiting per user tier
- [ ] Add error tracking (Sentry, etc.)
- [ ] Set up CI/CD pipeline
- [ ] Review IAM permissions (least privilege)
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring dashboards

## Cost Optimization

1. **DynamoDB**: Using on-demand billing (pay-per-request)
2. **Lambda**: Optimize memory allocation (currently 512MB-1024MB)
3. **API Gateway**: HTTP API is cheaper than REST API
4. **Messages**: TTL set to 90 days to auto-delete old messages
5. **CloudWatch**: Set log retention to 7-30 days

## Security Best Practices

1. **Never commit secrets** to Git
2. **Use AWS Secrets Manager** for API keys
3. **Enable MFA** for Cognito users
4. **Configure API throttling** to prevent abuse
5. **Use HTTPS/WSS only** for all communication
6. **Validate all inputs** on backend
7. **Implement rate limiting** per user
8. **Review CloudWatch logs** regularly

## Support

For deployment issues:
1. Check AWS CloudWatch Logs
2. Review CDK synthesis output
3. Verify all environment variables
4. Test each component individually
