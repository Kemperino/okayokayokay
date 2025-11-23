# Dispute Agent Migration Guide

## Changes Made for Base Mainnet and New Data Structure

### 1. Network Configuration
- Updated supported networks to include `base-mainnet`
- Chain ID for Base Mainnet: `8453`
- Updated validator to accept Base mainnet network

### 2. Database Structure Changes

#### Old Structure (api_responses table)
```
- Table: api_responses
- Query by: response_hash
- Fields: request_data, response_data
```

#### New Structure (resource_requests table)
```
- Table: resource_requests
- Query by: request_id (directly, no need for response_hash)
- Fields: input_data (user input), output_data (service response)
```

### 3. Type Updates
- Renamed `APIResponseData` to `ResourceRequestData`
- Updated DisputeContext to use `resourceRequestData` instead of `apiResponseData`
- New fields:
  - `input_data`: What the user requested from the service
  - `output_data`: What the service returned to the user

### 4. Supabase Integration
- Function renamed: `fetchAPIResponseData` → `fetchResourceRequestData`
- Now queries `resource_requests` table directly by `request_id`
- No longer needs `apiResponseHash` from blockchain

### 5. LLM Prompt Improvements
- Enhanced to explicitly analyze the relationship between input and output data
- Better sections:
  - "USER INPUT DATA (What the user requested)"
  - "SERVICE OUTPUT DATA (What the service returned)"
- System prompt updated to focus on input-output matching

### 6. Files Modified
- `types/index.ts` - New ResourceRequestData interface
- `supabase.ts` - Query resource_requests table
- `webhook-handler.ts` - Use new function and field names
- `llm.ts` - Enhanced prompts for input/output analysis
- `validator.ts` - Support base-mainnet network

### 7. Database Setup
Run the provided `supabase-schema.sql` in your Supabase SQL editor to create the required tables:
- `resource_requests` - Main table for API interactions
- `dispute_resolutions` - Audit trail (optional)
- `dispute_events` - Dispute history (optional)

### 8. Environment Variables
Update your `.env.local` or `.env` file:
```env
# Update RPC URL for Base Mainnet
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY

# Update Factory Contract Address for Base Mainnet
FACTORY_CONTRACT_ADDRESS=0x...your-mainnet-factory-address

# Chain ID for Base Mainnet
CHAIN_ID=8453
NETWORK_NAME=base-mainnet
```

### Migration Steps
1. Update your Supabase database with the new schema
2. Update environment variables for Base mainnet
3. Deploy the updated code
4. Test with a sample dispute on mainnet

### Benefits of New Structure
- **Direct querying**: No need to fetch apiResponseHash from blockchain first
- **Clearer data model**: `input_data` and `output_data` clearly show the request/response relationship
- **Better LLM decisions**: The model can now directly compare what was requested vs. what was delivered
- **Simpler flow**: One less blockchain call needed