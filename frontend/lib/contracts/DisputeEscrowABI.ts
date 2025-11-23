export const DisputeEscrowABI = [
  // Read functions
  {
    inputs: [{ internalType: 'bytes32', name: 'requestId', type: 'bytes32' }],
    name: 'requests',
    outputs: [
      { internalType: 'address', name: 'buyer', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'escrowedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'nextDeadline', type: 'uint256' },
      { internalType: 'enum DisputeEscrow.RequestStatus', name: 'status', type: 'uint8' },
      { internalType: 'bytes32', name: 'apiResponseHash', type: 'bytes32' },
      { internalType: 'address', name: 'disputeAgent', type: 'address' },
      { internalType: 'bool', name: 'buyerRefunded', type: 'bool' },
      { internalType: 'bool', name: 'sellerRejected', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'requestId', type: 'bytes32' }],
    name: 'getRequestStatus',
    outputs: [{ internalType: 'enum DisputeEscrow.RequestStatus', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'serviceProvider',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'allocatedBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getUnallocatedBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'requestId', type: 'bytes32' }],
    name: 'canSellerRespond',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { internalType: 'bytes32', name: 'requestId', type: 'bytes32' },
      { internalType: 'address', name: 'buyer', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'bytes32', name: 'apiResponseHash', type: 'bytes32' },
    ],
    name: 'confirmEscrow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'requestId', type: 'bytes32' }],
    name: 'releaseEscrow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'requestId', type: 'bytes32' },
    ],
    name: 'openDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'requestId', type: 'bytes32' },
      { internalType: 'bool', name: 'acceptRefund', type: 'bool' },
    ],
    name: 'respondToDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'requestId', type: 'bytes32' }],
    name: 'escalateDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'requestId', type: 'bytes32' }],
    name: 'earlyRelease',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'requestId', type: 'bytes32' }],
    name: 'cancelDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'requestId', type: 'bytes32' },
      { internalType: 'bool', name: 'refundBuyer', type: 'bool' },
    ],
    name: 'resolveDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'requestId', type: 'bytes32' },
      { indexed: false, internalType: 'bytes32', name: 'apiResponseHash', type: 'bytes32' },
    ],
    name: 'EscrowConfirmed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'requestId', type: 'bytes32' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'EscrowReleased',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'requestId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'buyer', type: 'address' },
    ],
    name: 'DisputeOpened',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'requestId', type: 'bytes32' },
      { indexed: false, internalType: 'bool', name: 'accepted', type: 'bool' },
    ],
    name: 'DisputeResponded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'bytes32', name: 'requestId', type: 'bytes32' }],
    name: 'DisputeEscalated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'requestId', type: 'bytes32' },
      { indexed: false, internalType: 'bool', name: 'buyerRefunded', type: 'bool' },
      { indexed: true, internalType: 'address', name: 'disputeAgent', type: 'address' },
    ],
    name: 'DisputeResolved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'bytes32', name: 'requestId', type: 'bytes32' }],
    name: 'DisputeCancelled',
    type: 'event',
  },
] as const;

// RequestStatus enum mapping
export enum RequestStatus {
  ServiceInitiated = 0,
  Escrowed = 1,
  EscrowReleased = 2,
  DisputeOpened = 3,
  SellerAccepted = 4,
  DisputeEscalated = 5,
  DisputeResolved = 6,
}

export const RequestStatusLabels: Record<RequestStatus, string> = {
  [RequestStatus.ServiceInitiated]: 'Service Initiated',
  [RequestStatus.Escrowed]: 'Escrowed',
  [RequestStatus.EscrowReleased]: 'Escrow Released',
  [RequestStatus.DisputeOpened]: 'Dispute Opened',
  [RequestStatus.SellerAccepted]: 'Seller Accepted',
  [RequestStatus.DisputeEscalated]: 'Dispute Escalated',
  [RequestStatus.DisputeResolved]: 'Dispute Resolved',
};
