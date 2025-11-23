export interface AlchemyWebhookPayload {
  webhookId: string;
  id: string;
  createdAt: string;
  type: 'GRAPHQL';
  event: {
    data: {
      block: {
        logs: Array<{
          account: { address: string };
          topics: string[];
          data: string;
          transaction: {
            hash: string;
          };
        }>;
      };
    };
    sequenceNumber: string;
    network: string;
  };
}

export type WebhookEvent = AlchemyWebhookPayload;

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

export interface ResourceRequestData {
  id?: string;
  request_id: string;
  input_data: any;  // User provided input when calling the resource
  output_data: any; // Server API response to the user
  response_hash?: string;
  timestamp?: string;
  service_provider?: string;
  buyer_address?: string;
  amount?: number;
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
  resourceRequestData: ResourceRequestData;
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
