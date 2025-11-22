-- Supabase schema for dispute resolution agent
-- This creates the necessary tables for the dispute agent to function

-- Resource requests table (main table for storing API interactions)
CREATE TABLE IF NOT EXISTS resource_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(66) UNIQUE NOT NULL, -- bytes32 hex string (0x + 64 chars)
  input_data JSONB NOT NULL, -- User provided input when calling the resource
  output_data JSONB NOT NULL, -- Server API response to the user
  response_hash VARCHAR(66), -- Optional: hash of the response
  service_provider VARCHAR(42), -- Ethereum address
  buyer_address VARCHAR(42), -- Ethereum address
  amount NUMERIC, -- Amount in USDC (or smallest unit)
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by request_id
CREATE INDEX idx_resource_requests_request_id ON resource_requests(request_id);

-- Index for faster lookups by buyer
CREATE INDEX idx_resource_requests_buyer ON resource_requests(buyer_address);

-- Index for faster lookups by service provider
CREATE INDEX idx_resource_requests_provider ON resource_requests(service_provider);

-- Optional: Dispute resolutions table for audit trail
CREATE TABLE IF NOT EXISTS dispute_resolutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(66) NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  refund_decision BOOLEAN NOT NULL,
  reason TEXT,
  transaction_hash VARCHAR(66),
  agent_address VARCHAR(42),
  confidence NUMERIC,
  resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for dispute resolutions
CREATE INDEX idx_dispute_resolutions_request_id ON dispute_resolutions(request_id);

-- Optional: Dispute events table for tracking dispute history
CREATE TABLE IF NOT EXISTS dispute_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(66) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- e.g., 'DisputeOpened', 'DisputeEscalated', 'DisputeResolved'
  contract_address VARCHAR(42),
  transaction_hash VARCHAR(66),
  block_number BIGINT,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for dispute events
CREATE INDEX idx_dispute_events_request_id ON dispute_events(request_id);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE resource_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_events ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (adjust based on your needs)
-- Allow service role full access
CREATE POLICY "Service role has full access to resource_requests" ON resource_requests
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to dispute_resolutions" ON dispute_resolutions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to dispute_events" ON dispute_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');