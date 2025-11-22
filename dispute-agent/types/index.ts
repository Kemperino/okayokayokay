export interface WebhookEvent {
  // Blockchain event data
  event: string; // "DisputeEscalated"
  contractAddress: string; // DisputeEscrow contract address
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  args: {
    requestId: string; // bytes32
  };
  network: string; // e.g., "base-sepolia"
}

export interface ServiceRequest {
  buyer: string;
  amount: bigint;
  escrowedAt: bigint;
  nextDeadline: bigint;
  status: number;
  apiResponseHash: string;
  disputeAgent: string;
  buyerRefunded: boolean;
  sellerRejected: boolean;
}

export interface APIResponseData {
  id: string;
  request_id: string;
  response_hash: string;
  request_data: any;
  response_data: any;
  timestamp: string;
  service_provider: string;
  buyer_address: string;
  amount: number;
}

export interface LLMDecision {
  refund: boolean;
  reason: string;
  confidence?: number;
}

export interface DisputeContext {
  requestId: string;
  contractAddress: string;
  serviceRequest: ServiceRequest;
  apiResponseData: APIResponseData;
  serviceMetadata?: any; // Service description from metadata URI
  disputeHistory?: any[]; // Previous dispute events if any
}

export enum RequestStatus {
  ServiceInitiated = 0,
  Escrowed = 1,
  EscrowReleased = 2,
  DisputeOpened = 3,
  SellerAccepted = 4,
  DisputeEscalated = 5,
  DisputeResolved = 6
}