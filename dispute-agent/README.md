# Dispute Resolution Agent

Automated second-layer dispute resolution agent for x402 payment disputes. This agent monitors DisputeEscalated events from DisputeEscrow contracts and automatically resolves disputes using LLM reasoning.

## Architecture

The agent operates as a serverless function (Vercel) with the following flow:

1. **Webhook Trigger** - Receives blockchain events via webhook
2. **Validation** - Verifies event authenticity and parameters
3. **Data Retrieval** - Fetches API response data from Supabase
4. **LLM Decision** - Analyzes dispute context and makes refund decision
5. **On-chain Resolution** - Executes dispute resolution on the smart contract

## Setup

### Prerequisites

- Node.js 18+
- Yarn package manager
- Vercel CLI (`npm i -g vercel`)
- Private key with DISPUTE_AGENT_ROLE granted by the factory contract
- OpenAI API key for LLM reasoning
- Supabase project with API response data

### Installation

```bash
cd dispute-agent
yarn install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure environment variables:
```
# Blockchain
PRIVATE_KEY=<agent_private_key>
RPC_URL=<rpc_endpoint>
FACTORY_CONTRACT_ADDRESS=<factory_address>
CHAIN_ID=84532  # Base Sepolia

# Supabase
SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_KEY=<service_role_key>

# OpenAI
OPENAI_API_KEY=<your_openai_key>
OPENAI_MODEL=gpt-4-turbo-preview

# Webhook Security
WEBHOOK_SECRET=<random_secret>

# Agent Settings
MAX_DISPUTE_AMOUNT_USD=10000
RESOLUTION_CONFIDENCE_THRESHOLD=0.8
```

### Development

Run locally with Vercel dev server:
```bash
yarn dev
```

The webhook endpoint will be available at:
```
http://localhost:3000/api/webhook
```

### Deployment

Deploy to Vercel:
```bash
yarn deploy
```

After deployment, configure your blockchain event monitoring service (e.g., Alchemy webhooks) to send DisputeEscalated events to:
```
https://your-vercel-domain.vercel.app/api/webhook
```

## Webhook Event Format

The agent expects webhook events in the following format:

```json
{
  "event": "DisputeEscalated",
  "contractAddress": "0x...",
  "transactionHash": "0x...",
  "blockNumber": 123456,
  "timestamp": 1234567890,
  "args": {
    "requestId": "0x..."
  },
  "network": "base-sepolia"
}
```

## Security Considerations

- **Private Key**: Store securely, never commit to version control
- **Webhook Secret**: Use to verify webhook authenticity
- **Role Validation**: Agent must have DISPUTE_AGENT_ROLE from factory
- **Amount Limits**: Configure MAX_DISPUTE_AMOUNT_USD for safety
- **Confidence Threshold**: Set minimum confidence for automated decisions

## Monitoring

The agent logs all activities including:
- Webhook receipt and validation
- Blockchain interactions
- LLM decisions and reasoning
- Transaction hashes for on-chain resolutions

Monitor logs via Vercel dashboard or integrate with your preferred logging service.

## Error Handling

The agent handles various failure scenarios:
- Invalid webhook data returns 400
- Missing API response data returns 404
- LLM failures default to buyer refund (conservative approach)
- Blockchain errors are logged and returned as 500

## Testing

Test the agent locally using curl:

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: your-webhook-secret" \
  -d '{
    "event": "DisputeEscalated",
    "contractAddress": "0x...",
    "transactionHash": "0x...",
    "blockNumber": 123456,
    "args": {
      "requestId": "0x..."
    },
    "network": "base-sepolia"
  }'
```

## LLM Prompt Customization

To customize the LLM reasoning, set the `CUSTOM_SYSTEM_PROMPT` environment variable or modify the default prompt in `lib/llm.ts`.

## Database Schema

The agent expects the following Supabase tables:

- `api_responses` - Stores API request/response data
- `dispute_resolutions` - Audit trail of agent decisions (optional)
- `dispute_events` - Historical dispute events (optional)
- `transactions` - Transaction details (optional)