import { ethers } from 'ethers';

const DISPUTE_ESCALATED_SIGNATURE = ethers.id('DisputeEscalated(bytes32)');
const REQUEST_ID = '0x1111111111111111111111111111111111111111111111111111111111111111';

export const mockWebhookEvent = {
  webhookId: 'wh_test123',
  id: 'whevt_test456',
  createdAt: new Date().toISOString(),
  type: 'GRAPHQL' as const,
  event: {
    data: {
      block: {
        logs: [{
          account: { address: '0x1234567890123456789012345678901234567890' },
          topics: [
            DISPUTE_ESCALATED_SIGNATURE,
            REQUEST_ID
          ],
          data: '0x',
          transaction: {
            hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
          }
        }]
      }
    },
    sequenceNumber: '10000000718580233008',
    network: 'BASE_MAINNET'
  }
};

export const mockServiceRequest = {
  buyer: '0xBuyer1234567890123456789012345678901234',
  amount: 1000000n, // 1 USDC (6 decimals)
  escrowedAt: BigInt(Date.now() - 3600000), // 1 hour ago
  nextDeadline: BigInt(Date.now() + 3600000), // 1 hour from now
  status: 5, // DisputeEscalated
  apiResponseHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
  disputeAgent: '0x0000000000000000000000000000000000000000',
  buyerRefunded: false,
  sellerRejected: true
};

export const mockAPIResponseData = {
  id: 'test-123',
  request_id: '0x1111111111111111111111111111111111111111111111111111111111111111',
  response_hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
  input_data: {
    endpoint: '/api/translate',
    method: 'POST',
    body: {
      text: 'Hello world',
      from: 'en',
      to: 'es'
    }
  },
  output_data: {
    status: 500,
    error: 'Internal server error',
    message: 'Translation service temporarily unavailable'
  },
  timestamp: new Date().toISOString(),
  service_provider: '0xSeller123456789012345678901234567890123',
  buyer_address: '0xBuyer1234567890123456789012345678901234',
  amount: 1.0
};

export const mockServiceMetadata = {
  name: 'Premium Translation API',
  description: 'High-quality translation service supporting 100+ languages with 99.9% uptime guarantee',
  category: 'Language Services',
  pricing: {
    model: 'per-request',
    rate: 1.0,
    currency: 'USDC'
  },
  terms: 'Service guarantees 99.9% uptime. Refunds provided for service failures.',
  endpoints: [
    {
      path: '/api/translate',
      method: 'POST',
      description: 'Translate text between languages'
    },
    {
      path: '/api/detect',
      method: 'POST',
      description: 'Detect language of text'
    }
  ],
  sla: {
    uptime: '99.9%',
    responseTime: '< 2 seconds',
    refundPolicy: 'Full refund for service errors (5xx status codes)'
  }
};

// Different test scenarios
export const testScenarios = {
  // Scenario 1: Clear service failure - should refund
  serviceFailed: {
    apiResponse: {
      ...mockAPIResponseData,
      output_data: {
        status: 500,
        error: 'Internal server error',
        message: 'Service unavailable'
      }
    },
    expectedDecision: {
      refund: true,
      reason: 'Service returned 500 error, violating SLA'
    }
  },

  // Scenario 2: Successful service - should not refund
  serviceSuccess: {
    apiResponse: {
      ...mockAPIResponseData,
      output_data: {
        status: 200,
        translation: 'Hola mundo',
        confidence: 0.99
      }
    },
    expectedDecision: {
      refund: false,
      reason: 'Service delivered successfully as described'
    }
  },

  // Scenario 3: Partial failure - ambiguous case
  partialFailure: {
    apiResponse: {
      ...mockAPIResponseData,
      output_data: {
        status: 200,
        translation: null,
        error: 'Translation confidence too low',
        fallback: 'Unable to translate'
      }
    },
    expectedDecision: {
      refund: true,
      reason: 'Service failed to provide the requested translation'
    }
  },

  // Scenario 4: Rate limit error - buyer's fault
  rateLimitError: {
    apiResponse: {
      ...mockAPIResponseData,
      output_data: {
        status: 429,
        error: 'Rate limit exceeded',
        message: 'Too many requests from this buyer'
      }
    },
    expectedDecision: {
      refund: false,
      reason: 'Rate limit exceeded by buyer, not a service failure'
    }
  }
};
