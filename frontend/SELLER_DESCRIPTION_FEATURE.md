# Seller Description Feature

This feature automatically populates the `seller_description` field in the `resource_requests` table by fetching `.well-known/x402` metadata from resources.

## Overview

When a resource request is made, the system now:
1. Fetches the `.well-known/x402` metadata from the resource URL
2. Caches the result for 1 hour to avoid repeated network calls
3. Stores the complete x402 metadata in the `seller_description` field
4. Displays the resource description in the UI

## Components

### 1. Well-Known Fetcher (`lib/x402/well-known-fetcher.ts`)

Core utility for fetching and caching `.well-known/x402` data.

**Key functions:**
- `fetchWellKnown(resourceUrl)` - Fetches and caches .well-known/x402 data
- `extractDescription(wellKnownData, resourcePath?)` - Extracts description from metadata
- `clearWellKnownCache()` - Clears the cache (for testing/manual refresh)
- `getCacheStats()` - Returns cache statistics

**Cache behavior:**
- Duration: 1 hour (60 minutes)
- In-memory storage (per server instance)
- Caches both successful responses and failures to avoid hammering failing endpoints
- Keyed by base URL (e.g., `https://example.com`)

### 2. Proxy Resource Route (`app/api/proxy-resource/route.ts`)

Updated to fetch seller descriptions when processing requests.

**Changes:**
- Calls `fetchWellKnown()` before making the x402 request
- Populates `seller_description` field with the fetched data
- Falls back to `resource.well_known_data` if fetch fails

### 3. Resource Request History UI (`components/ResourceRequestHistory.tsx`)

Updated to display seller descriptions in the request list.

**Changes:**
- Updated interface to match actual `resource_requests` schema
- Added `getSellerDescription()` helper to extract description from x402 metadata
- Displays description prominently above the resource path
- Shows seller address for transparency

### 4. Backfill Script (`scripts/backfill-seller-descriptions.ts`)

Script to populate `seller_description` for existing records.

**Usage:**
```bash
yarn backfill:seller-descriptions
```

**What it does:**
- Finds all `resource_requests` with null `seller_description`
- Fetches `.well-known/x402` for each unique resource URL
- Updates the database with the fetched data
- Provides progress feedback and statistics

## Database Schema

The `resource_requests` table includes:

```sql
seller_description jsonb  -- Cached .well-known/x402 data from the resource
```

This field stores the complete x402 well-known response, which includes:
- `x402Version` - Protocol version
- `accepts[]` - Array of payment configurations
  - `description` - Human-readable resource description
  - `resource` - Resource URL
  - `payTo` - Payment address
  - `maxAmountRequired` - Price
  - `network`, `asset`, etc.

## Example Flow

1. User makes a request to a resource (e.g., weather API)
2. System fetches `https://resource.com/.well-known/x402`
3. Response includes description: "Mock weather API providing weather data for any location..."
4. Description is cached and stored in `seller_description`
5. UI displays the description above the request path

## Cache Management

The cache is:
- **Automatic**: No manual management needed
- **Per-instance**: Each server instance has its own cache
- **Time-based**: Entries expire after 1 hour
- **Failure-tolerant**: Caches null for failed fetches to avoid repeated errors

To clear the cache (e.g., for testing):
```typescript
import { clearWellKnownCache } from '@/lib/x402/well-known-fetcher';
clearWellKnownCache();
```

## Future Enhancements

Potential improvements:
1. **Persistent cache**: Store in database/Redis for multi-instance deployments
2. **Selective refresh**: Add UI button to manually refresh descriptions
3. **Background job**: Periodically update all cached descriptions
4. **Localization**: Support multiple languages if x402 protocol adds i18n
5. **Rich metadata**: Display additional x402 fields (price, network, etc.)

## Testing

To test the feature:

1. Make a resource request via the UI
2. Check that the description appears in the request history
3. Verify the cache is working by checking logs for "Cache hit" messages
4. Run the backfill script on existing data:
   ```bash
   yarn backfill:seller-descriptions
   ```

## Troubleshooting

**Description not showing?**
- Check that the resource has a `.well-known/x402` endpoint
- Verify the endpoint returns valid JSON with `accepts[].description`
- Check server logs for fetch errors

**Cache not working?**
- Cache is in-memory and resets on server restart
- Each server instance has its own cache
- Consider persistent cache for production

**Backfill script fails?**
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check that resource URLs are valid and accessible
- Review error messages for specific failures
