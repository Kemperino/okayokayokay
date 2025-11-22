# Implementation Summary: Contract Status Display

## What Was Implemented

Added blockchain contract status display to resource request cards. Each resource request now shows both the database status (from the API) and the on-chain escrow contract status.

## Files Created/Modified

### New Files

1. **`frontend/lib/actions/get-contract-status.ts`**
   - Server action to fetch contract status from blockchain
   - Handles cases where escrow address is missing
   - Provides fallback messages ("No escrow", "Not found", "Error fetching")
   - Exports batch fetching for efficiency

2. **`frontend/components/ContractStatusBadge.tsx`**
   - Client component that displays contract status
   - Fetches status on mount using server action
   - Shows loading state while fetching
   - Color-coded badges based on status:
     - Blue: Escrowed
     - Green: Released
     - Orange: Dispute Opened
     - Red: Dispute Escalated
     - Purple: Resolved/Accepted
     - Gray: Fallback/error states

3. **`frontend/lib/contracts/helpers.ts`**
   - Helper to get escrow contract address for a merchant
   - Uses factory contract to look up merchant's escrow
   - Address formatting utilities

### Modified Files

1. **`frontend/components/ResourceRequestHistory.tsx`**
   - Added `escrow_contract_address` to interface
   - Import and use `ContractStatusBadge` component
   - Display escrow contract address in card details
   - Updated layout to show both DB status and contract status side-by-side

2. **`frontend/app/api/proxy-resource/route.ts`**
   - Import `getEscrowAddressForMerchant` helper
   - Fetch escrow address from factory contract when creating resource requests
   - Populate `escrow_contract_address` field correctly (instead of using payment recipient)
   - Handle both success and failure cases

3. **`frontend/lib/contracts/index.ts`**
   - Export new helper functions

## How It Works

### Data Flow

1. **When a resource request is made:**
   ```
   User → /api/proxy-resource → x402 payment → Get merchant address
                                                    ↓
                                     Query factory for escrow contract
                                                    ↓
                                     Save escrow_contract_address to DB
   ```

2. **When viewing resource requests:**
   ```
   Page loads → ResourceRequestHistory component
                         ↓
                 Maps each request → ContractStatusBadge
                                            ↓
                                   getContractStatus() server action
                                            ↓
                              Query blockchain for request status
                                            ↓
                              Display status badge with color coding
   ```

### Status Mapping

The component queries the smart contract and displays the `RequestStatus` enum:

| Contract Status | Display Label | Color |
|----------------|---------------|-------|
| 0 | Service Initiated | Gray |
| 1 | Escrowed | Blue |
| 2 | Escrow Released | Green |
| 3 | Dispute Opened | Orange |
| 4 | Seller Accepted | Purple |
| 5 | Dispute Escalated | Red |
| 6 | Dispute Resolved | Purple |

### Fallback Behavior

If escrow contract address is not set or status cannot be fetched:
- "No escrow" - No escrow contract address in database
- "Not found" - Request not found on blockchain
- "Error fetching" - RPC error or network issue

## UI Preview

Each resource request card now shows:

```
┌─────────────────────────────────────────────────────┐
│ Weather API                          [COMPLETED] ←DB│
│ /weather                            [Escrowed] ←Chain│
│                                                      │
│ Params: city=London                                 │
│ Seller: 0x1234...5678                               │
│ Tx: 0xabcd...ef01                                   │
│ Escrow: 0x9876...5432                               │
│ 2025-11-22 10:30:45 AM                              │
└─────────────────────────────────────────────────────┘
```

## Environment Variables Required

Make sure these are set in `.env.local`:

```bash
# Factory contract address
NEXT_PUBLIC_DISPUTE_ESCROW_FACTORY_ADDRESS=0x...

# Base RPC URL (optional, uses public endpoint if not set)
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
```

## Testing

### 1. Test with Existing Requests (No Escrow Address)

Requests created before this implementation will have `escrow_contract_address: null`.

**Expected behavior:** Shows "No escrow" in gray badge

### 2. Test with New Requests (With Escrow Address)

New requests will populate the escrow address from the factory.

**Expected behavior:**
- If merchant is registered: Shows actual contract status
- If merchant is not registered: Shows "Not found"

### 3. Test Error Handling

Disconnect internet or use invalid RPC URL.

**Expected behavior:** Shows "Error fetching" in gray badge

## Performance Considerations

### Current Implementation (Per-Request Queries)

Each card makes its own RPC call to fetch status. This is acceptable for:
- Small number of requests (< 20)
- Testing and development

### Optimization for Production (Future)

For production with many requests, consider:

1. **Batch Queries:**
   ```typescript
   // In the page component
   const statuses = await batchGetContractStatuses(
     requests.map(r => ({
       requestId: r.request_id,
       escrowContractAddress: r.escrow_contract_address
     }))
   );
   ```

2. **Server-Side Fetching:**
   Fetch all statuses on server before rendering, pass to component as props

3. **Caching:**
   Cache status results for a few seconds to avoid redundant queries

4. **Multicall Contract:**
   Use a multicall contract to batch all RPC calls into one

## Next Steps

1. **Deploy factory contract** and set `NEXT_PUBLIC_DISPUTE_ESCROW_FACTORY_ADDRESS`

2. **Test with real merchants:**
   - Merchant registers service → Factory deploys escrow contract
   - Buyer makes request → Escrow address saved to DB
   - View request → See contract status

3. **Add dispute actions:**
   - If status is "Escrowed", show "Open Dispute" button
   - If status is "Dispute Opened", show "Escalate" button
   - Link to dispute management page

4. **Optimize if needed:**
   - If showing many requests, implement batch fetching
   - Add loading skeleton instead of text

## Troubleshooting

### "No escrow" showing for all requests

**Cause:** Escrow address not being populated when creating requests

**Fix:** Check that factory contract address is set and factory is returning valid addresses

### "Error fetching" showing for all requests

**Cause:** RPC connection issue or invalid contract address

**Fix:**
1. Verify `NEXT_PUBLIC_BASE_RPC_URL` is correct
2. Verify factory contract is deployed at the configured address
3. Check browser console for detailed error messages

### Status not updating after transaction

**Cause:** Status is fetched once on component mount

**Fix:** Add refresh button or polling interval to re-fetch status

## Related Documentation

- Contract utilities: `frontend/lib/contracts/README.md`
- Database schema proposal: `database-schema-proposal.md`
- Smart contracts: `contracts/src/DisputeEscrow.sol`
