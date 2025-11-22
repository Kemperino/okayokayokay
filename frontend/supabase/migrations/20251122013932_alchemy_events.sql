-- Create alchemy_events table for storing Alchemy webhook payloads
create table if not exists public.alchemy_events (
  id bigint generated always as identity primary key,
  type text,                   -- e.g. event type from Alchemy ("ADDRESS_ACTIVITY", etc.)
  network text,                -- chain/network name if available
  tx_hash text,                -- main transaction hash (if relevant)
  block_number bigint,         -- block number (if relevant)
  raw_payload jsonb not null,  -- full payload from Alchemy
  created_at timestamptz default now()
);

-- Index for common queries
create index idx_alchemy_events_type on alchemy_events(type);
create index idx_alchemy_events_network on alchemy_events(network);
create index idx_alchemy_events_tx_hash on alchemy_events(tx_hash);
create index idx_alchemy_events_created_at on alchemy_events(created_at desc);

-- Enable RLS
alter table alchemy_events enable row level security;

-- Policy: Allow anonymous inserts (for webhook endpoint using service role)
-- Service role bypasses RLS, but we define policies for regular authenticated users

-- Allow authenticated users to read all events
create policy "Authenticated users can view alchemy events"
  on alchemy_events for select
  using (auth.role() = 'authenticated');

-- Note: Inserts will be done via service role key which bypasses RLS
