-- Complete database schema for okayokayokay dispute resolution platform
-- Consolidated from multiple migrations into single file

-- Note: gen_random_uuid() is built into modern Postgres, no extension needed

-- Enums
create type dispute_status as enum (
  'service_initiated',
  'escrowed',
  'escrow_released',
  'dispute_opened',
  'seller_accepted',
  'dispute_escalated',
  'dispute_resolved',
  'master_review_escalation'
);

create type user_role as enum (
  'buyer',
  'seller',
  'dispute_agent',
  'keeper'
);

-- Session wallets table for anonymous CDP wallets
-- Each browser session gets its own CDP wallet (no authentication required)
create table session_wallets (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  cdp_wallet_name text not null unique,
  wallet_address text not null unique,
  network text not null default 'base-mainnet',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Transactions table (for dispute escrow tracking)
create table transactions (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique, -- 32-byte hex identifier (reused as EIP-3009 nonce)
  buyer_id text not null, -- Wallet address (no auth required)
  seller_id text not null, -- Merchant wallet address
  amount numeric not null,
  status dispute_status not null default 'service_initiated',
  resource_url text,
  payment_settled_at timestamptz,
  dispute_window_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Disputes table
create table disputes (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  filed_by text not null, -- Wallet address
  claim_description text not null,
  evidence jsonb default '[]'::jsonb,
  resolved_in_favor_of user_role,
  resolution_details text,
  agent_vote_results jsonb,
  filed_at timestamptz not null default now(),
  resolved_at timestamptz,
  escalated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint disputes_transaction_unique unique (transaction_id)
);

-- Dispute agents table
create table dispute_agents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique, -- Wallet address
  stake_amount numeric not null,
  total_votes_cast integer not null default 0,
  successful_votes integer not null default 0,
  reputation_score numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Agent votes table
create table agent_votes (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references disputes(id) on delete cascade,
  agent_id uuid not null references dispute_agents(id) on delete cascade,
  vote_for user_role not null,
  vote_rationale text,
  voted_at timestamptz not null default now(),
  constraint agent_votes_unique unique (dispute_id, agent_id)
);

-- User profiles table (optional, for display names and stats)
create table user_profiles (
  wallet_address text primary key,
  display_name text,
  role user_role not null default 'buyer',
  total_transactions integer not null default 0,
  total_disputes_filed integer not null default 0,
  total_disputes_received integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Transaction flags table
create table transaction_flags (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  flagged_by text not null, -- Wallet address
  flag_type text not null,
  flag_note text,
  created_at timestamptz not null default now(),
  constraint transaction_flags_unique unique (transaction_id, flagged_by, flag_type)
);

-- Alchemy events table for storing webhook payloads
create table alchemy_events (
  id bigint generated always as identity primary key,
  type text,
  network text,
  tx_hash text,
  block_number bigint,
  raw_payload jsonb not null,
  authorizer text,
  nonce text,
  from_address text,
  to_address text,
  amount text,
  created_at timestamptz default now()
);

-- Resources table for x402 resource catalog
create table resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  base_url text not null,
  well_known_url text not null,
  well_known_data jsonb,
  payment_address text,
  price_per_request numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Resource requests table (x402 request/response logging)
create table resource_requests (
  request_id text not null,
  user_address text not null,
  input_data jsonb not null,
  output_data jsonb,
  seller_address text not null,
  seller_description jsonb,
  tx_hash text,
  resource_url text,
  status text not null default 'pending',
  error_message text,
  escrow_contract_address text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (request_id, user_address)
);

comment on column resource_requests.escrow_contract_address is 'The DisputeEscrow contract address where funds were sent (from transferWithAuth)';

-- Indexes for better query performance
create index idx_session_wallets_session_id on session_wallets(session_id);
create index idx_session_wallets_wallet_address on session_wallets(wallet_address);

create index idx_transactions_buyer on transactions(buyer_id);
create index idx_transactions_seller on transactions(seller_id);
create index idx_transactions_status on transactions(status);
create index idx_transactions_created on transactions(created_at desc);

create index idx_disputes_transaction on disputes(transaction_id);
create index idx_disputes_filed_by on disputes(filed_by);
create index idx_disputes_filed_at on disputes(filed_at desc);

create index idx_agent_votes_dispute on agent_votes(dispute_id);
create index idx_agent_votes_agent on agent_votes(agent_id);

create index idx_user_profiles_role on user_profiles(role);

create index idx_alchemy_events_type on alchemy_events(type);
create index idx_alchemy_events_network on alchemy_events(network);
create index idx_alchemy_events_tx_hash on alchemy_events(tx_hash);
create index idx_alchemy_events_created_at on alchemy_events(created_at desc);
create index idx_alchemy_events_authorizer on alchemy_events(authorizer);
create index idx_alchemy_events_nonce on alchemy_events(nonce);
create index idx_alchemy_events_from_address on alchemy_events(from_address);
create index idx_alchemy_events_to_address on alchemy_events(to_address);

create index idx_resources_is_active on resources(is_active);
create index idx_resources_created_at on resources(created_at desc);

create index idx_resource_requests_user_address on resource_requests(user_address);
create index idx_resource_requests_seller_address on resource_requests(seller_address);
create index idx_resource_requests_status on resource_requests(status);
create index idx_resource_requests_tx_hash on resource_requests(tx_hash);
create index idx_resource_requests_created_at on resource_requests(created_at desc);
create index idx_resource_requests_escrow_contract on resource_requests(escrow_contract_address);

-- Row Level Security (RLS) policies
alter table session_wallets enable row level security;
alter table transactions enable row level security;
alter table disputes enable row level security;
alter table dispute_agents enable row level security;
alter table agent_votes enable row level security;
alter table user_profiles enable row level security;
alter table transaction_flags enable row level security;
alter table alchemy_events enable row level security;
alter table resources enable row level security;
alter table resource_requests enable row level security;

-- Session wallets policies
create policy "Allow anonymous access to session wallets"
  on session_wallets for all
  using (true)
  with check (true);

-- Transactions policies (allow all for service role)
create policy "Allow all access to transactions"
  on transactions for all
  using (true);

-- Disputes policies (allow all for service role)
create policy "Allow all access to disputes"
  on disputes for all
  using (true);

-- User profiles policies
create policy "Anyone can view user profiles"
  on user_profiles for select
  using (true);

create policy "Allow all modifications to user profiles"
  on user_profiles for all
  using (true);

-- Dispute agents policies
create policy "Anyone can view active dispute agents"
  on dispute_agents for select
  using (is_active = true);

create policy "Allow all modifications to dispute agents"
  on dispute_agents for all
  using (true);

-- Agent votes policies
create policy "Anyone can view agent votes"
  on agent_votes for select
  using (true);

create policy "Allow all modifications to agent votes"
  on agent_votes for all
  using (true);

-- Transaction flags policies
create policy "Anyone can view transaction flags"
  on transaction_flags for select
  using (true);

create policy "Allow all modifications to transaction flags"
  on transaction_flags for all
  using (true);

-- Alchemy events policies
create policy "Anyone can view alchemy events"
  on alchemy_events for select
  using (true);

create policy "Service role can manage alchemy events"
  on alchemy_events for all
  using (true);

-- Resources policies
create policy "Anyone can view active resources"
  on resources for select
  using (is_active = true);

create policy "Service role can manage resources"
  on resources for all
  using (true);

-- Resource requests policies
create policy "Anyone can view all resource requests"
  on resource_requests for select
  using (true);

create policy "Service role can manage resource requests"
  on resource_requests for all
  using (true);

-- Functions for automatic timestamp updates
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger session_wallets_updated_at
  before update on session_wallets
  for each row execute function update_updated_at_column();

create trigger update_transactions_updated_at
  before update on transactions
  for each row execute function update_updated_at_column();

create trigger update_disputes_updated_at
  before update on disputes
  for each row execute function update_updated_at_column();

create trigger update_dispute_agents_updated_at
  before update on dispute_agents
  for each row execute function update_updated_at_column();

create trigger update_user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at_column();

create trigger update_resources_updated_at
  before update on resources
  for each row execute function update_updated_at_column();

-- Enable realtime for resource_requests table
alter publication supabase_realtime add table resource_requests;
