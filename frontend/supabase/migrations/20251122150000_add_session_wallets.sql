-- Add session_wallets table for anonymous CDP wallets
-- Each browser session gets its own CDP wallet (no authentication required)

create table if not exists session_wallets (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  cdp_wallet_name text not null unique, -- CDP wallet identifier
  wallet_address text not null unique, -- EVM wallet address from CDP
  network text not null default 'base-mainnet',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for fast lookups
create index idx_session_wallets_session_id on session_wallets(session_id);
create index idx_session_wallets_wallet_address on session_wallets(wallet_address);

-- RLS policies
alter table session_wallets enable row level security;

-- Allow anonymous access (session validation happens in application code)
create policy "Allow anonymous access to session wallets"
  on session_wallets for all
  using (true)
  with check (true);

-- Update timestamp trigger
create trigger session_wallets_updated_at
  before update on session_wallets
  for each row
  execute function update_updated_at_column();

-- Update resource_requests to support anonymous usage and match new requirements
-- Drop the existing primary key and recreate the table structure

-- First, drop existing constraints and indexes that depend on the table
drop index if exists idx_resource_requests_resource_id;
drop index if exists idx_resource_requests_user_address;
drop index if exists idx_resource_requests_status;
drop index if exists idx_resource_requests_tx_hash;
drop index if exists idx_resource_requests_created_at;

-- Drop and recreate resource_requests table with new schema
drop table if exists resource_requests cascade;

create table resource_requests (
  -- Request identifier (32-byte hex string, reused as EIP-3009 nonce)
  request_id text not null,

  -- User address (wallet making the request)
  user_address text not null,

  -- Input and output data
  input_data jsonb not null,
  output_data jsonb,

  -- Seller address (merchant public key)
  seller_address text not null,

  -- Seller information (cached .well-known/x402 data from the resource)
  seller_description jsonb,

  -- Transaction hash (empty at beginning, filled by Alchemy webhook)
  tx_hash text,

  -- Metadata
  resource_url text,
  status text not null default 'pending', -- pending, paid, completed, failed
  error_message text,

  -- Timestamps
  created_at timestamptz not null default now(),
  completed_at timestamptz,

  -- Composite primary key: request_id + user_address
  primary key (request_id, user_address)
);

-- Indexes for better query performance
create index idx_resource_requests_user_address on resource_requests(user_address);
create index idx_resource_requests_seller_address on resource_requests(seller_address);
create index idx_resource_requests_status on resource_requests(status);
create index idx_resource_requests_tx_hash on resource_requests(tx_hash);
create index idx_resource_requests_created_at on resource_requests(created_at desc);

-- RLS policies for resource_requests
alter table resource_requests enable row level security;

-- Allow users to view their own requests
create policy "Users can view their own resource requests"
  on resource_requests for select
  using (user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Allow anonymous users to view all requests (for now, can be restricted later)
create policy "Anonymous users can view all resource requests"
  on resource_requests for select
  using (true);

-- Allow service role to insert/update requests
create policy "Service role can manage resource requests"
  on resource_requests for all
  using (true);

-- Enable realtime for resource_requests table
alter publication supabase_realtime add table resource_requests;
