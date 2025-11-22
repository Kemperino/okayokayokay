-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Dispute status enum
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

-- User roles enum
create type user_role as enum (
  'buyer',
  'seller',
  'dispute_agent',
  'keeper'
);

-- Transactions table
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  request_id bytea not null unique, -- 32-byte identifier (reused as EIP-3009 nonce)
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id text not null, -- Public key for resource authentication
  amount numeric not null,
  status dispute_status not null default 'service_initiated',

  -- Metadata
  resource_url text,
  payment_settled_at timestamptz,
  dispute_window_expires_at timestamptz,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Disputes table
create table disputes (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  filed_by uuid not null references auth.users(id) on delete cascade,

  -- Dispute details
  claim_description text not null,
  evidence jsonb default '[]'::jsonb, -- Array of evidence items

  -- Resolution
  resolved_in_favor_of user_role,
  resolution_details text,
  agent_vote_results jsonb, -- Voting results from dispute agents

  -- Timestamps
  filed_at timestamptz not null default now(),
  resolved_at timestamptz,
  escalated_at timestamptz,

  -- Constraints
  constraint disputes_transaction_unique unique (transaction_id)
);

-- Dispute agents table
create table dispute_agents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stake_amount numeric not null,
  total_votes_cast integer not null default 0,
  successful_votes integer not null default 0,
  reputation_score numeric not null default 0,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint dispute_agents_user_unique unique (user_id)
);

-- Agent votes table
create table agent_votes (
  id uuid primary key default uuid_generate_v4(),
  dispute_id uuid not null references disputes(id) on delete cascade,
  agent_id uuid not null references dispute_agents(id) on delete cascade,

  vote_for user_role not null, -- 'buyer' or 'seller'
  vote_rationale text,

  voted_at timestamptz not null default now(),

  constraint agent_votes_unique unique (dispute_id, agent_id)
);

-- User profiles table (extends auth.users)
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role user_role not null default 'buyer',
  wallet_address text,

  -- Statistics
  total_transactions integer not null default 0,
  total_disputes_filed integer not null default 0,
  total_disputes_received integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Transaction flags table (for validated/flagged transactions)
create table transaction_flags (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  flagged_by uuid not null references auth.users(id) on delete cascade,

  flag_type text not null, -- 'validated', 'suspicious', etc.
  flag_note text,

  created_at timestamptz not null default now(),

  constraint transaction_flags_unique unique (transaction_id, flagged_by, flag_type)
);

-- Alchemy events table for storing Alchemy webhook payloads
create table alchemy_events (
  id bigint generated always as identity primary key,
  type text,
  network text,
  tx_hash text,
  block_number bigint,
  raw_payload jsonb not null,

  -- TransferWithAuthorization event fields
  authorizer text,
  nonce text,
  from_address text,
  to_address text,
  amount text,

  created_at timestamptz default now()
);

-- Resources table for x402 resource catalog
create table resources (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  base_url text not null,
  well_known_url text not null,
  well_known_data jsonb, -- Cached .well-known/x402 data

  -- Payment info
  payment_address text,
  price_per_request numeric,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Resource requests table for logging proxied requests
create table resource_requests (
  id uuid primary key default uuid_generate_v4(),
  resource_id uuid not null references resources(id) on delete cascade,

  -- User who initiated this request
  user_address text not null, -- Wallet address of the connected user

  -- Request details
  request_path text not null,
  request_params jsonb,
  request_headers jsonb,

  -- Response details
  response_data jsonb,
  response_status integer,

  -- Payment details
  tx_hash text,
  payment_amount text,
  payment_to_address text,
  nonce text,

  -- Status tracking
  status text not null default 'pending', -- pending, paid, completed, failed
  error_message text,

  created_at timestamptz not null default now(),
  completed_at timestamptz
);


-- Indexes for better query performance
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

create index idx_resource_requests_resource_id on resource_requests(resource_id);
create index idx_resource_requests_user_address on resource_requests(user_address);
create index idx_resource_requests_status on resource_requests(status);
create index idx_resource_requests_tx_hash on resource_requests(tx_hash);
create index idx_resource_requests_created_at on resource_requests(created_at desc);

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
alter table transactions enable row level security;
alter table disputes enable row level security;
alter table dispute_agents enable row level security;
alter table agent_votes enable row level security;
alter table user_profiles enable row level security;
alter table transaction_flags enable row level security;
alter table alchemy_events enable row level security;
alter table resources enable row level security;
alter table resource_requests enable row level security;

-- Enable realtime for resource_requests table
alter publication supabase_realtime add table resource_requests;

-- Transactions policies
create policy "Users can view their own transactions"
  on transactions for select
  using (buyer_id = auth.uid() or seller_id = (select wallet_address from user_profiles where id = auth.uid()));

create policy "Buyers can create transactions"
  on transactions for insert
  with check (buyer_id = auth.uid());

create policy "System can update transactions"
  on transactions for update
  using (true); -- This should be restricted to backend service role in production

-- Disputes policies
create policy "Users can view disputes they're involved in"
  on disputes for select
  using (
    filed_by = auth.uid() or
    exists (
      select 1 from transactions
      where transactions.id = disputes.transaction_id
      and (transactions.buyer_id = auth.uid() or transactions.seller_id = (select wallet_address from user_profiles where id = auth.uid()))
    )
  );

create policy "Users can create disputes on their transactions"
  on disputes for insert
  with check (
    filed_by = auth.uid() and
    exists (
      select 1 from transactions
      where transactions.id = transaction_id
      and transactions.buyer_id = auth.uid()
    )
  );

create policy "Users can update their own disputes"
  on disputes for update
  using (filed_by = auth.uid());

-- User profiles policies
create policy "Users can view all profiles"
  on user_profiles for select
  using (true);

create policy "Users can update their own profile"
  on user_profiles for update
  using (id = auth.uid());

create policy "Users can insert their own profile"
  on user_profiles for insert
  with check (id = auth.uid());

-- Dispute agents policies
create policy "Anyone can view active dispute agents"
  on dispute_agents for select
  using (is_active = true);

create policy "Users can manage their own agent profile"
  on dispute_agents for all
  using (user_id = auth.uid());

-- Agent votes policies
create policy "Agents can view votes on disputes they voted on"
  on agent_votes for select
  using (
    agent_id in (select id from dispute_agents where user_id = auth.uid())
  );

create policy "Agents can cast votes"
  on agent_votes for insert
  with check (
    agent_id in (select id from dispute_agents where user_id = auth.uid() and is_active = true)
  );

-- Transaction flags policies
create policy "Users can view flags on their transactions"
  on transaction_flags for select
  using (
    exists (
      select 1 from transactions
      where transactions.id = transaction_flags.transaction_id
      and (transactions.buyer_id = auth.uid() or transactions.seller_id = (select wallet_address from user_profiles where id = auth.uid()))
    )
  );

create policy "Users can flag transactions they're involved in"
  on transaction_flags for insert
  with check (
    flagged_by = auth.uid() and
    exists (
      select 1 from transactions
      where transactions.id = transaction_id
      and (transactions.buyer_id = auth.uid() or transactions.seller_id = (select wallet_address from user_profiles where id = auth.uid()))
    )
  );

-- Alchemy events policies
create policy "Authenticated users can view alchemy events"
  on alchemy_events for select
  using (auth.role() = 'authenticated');

create policy "Anonymous users can view alchemy events"
  on alchemy_events for select
  using (true);

-- Resources policies
create policy "Anyone can view active resources"
  on resources for select
  using (is_active = true);

create policy "Service role can manage resources"
  on resources for all
  using (true);

-- Resource requests policies
create policy "Users can view their own resource requests"
  on resource_requests for select
  using (user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

create policy "Users can view all resource requests (for now)"
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
create trigger update_transactions_updated_at before update on transactions
  for each row execute function update_updated_at_column();

create trigger update_dispute_agents_updated_at before update on dispute_agents
  for each row execute function update_updated_at_column();

create trigger update_user_profiles_updated_at before update on user_profiles
  for each row execute function update_updated_at_column();

create trigger update_resources_updated_at before update on resources
  for each row execute function update_updated_at_column();
