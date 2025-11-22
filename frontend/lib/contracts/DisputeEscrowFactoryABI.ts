export const DisputeEscrowFactoryABI = [
  // Read functions
  {
    inputs: [],
    name: 'usdc',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'service', type: 'address' }],
    name: 'serviceToEscrow',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'escrow', type: 'address' }],
    name: 'isValidEscrow',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'service', type: 'address' }],
    name: 'getServiceEscrow',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'isOperator',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'isDisputeAgent',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { internalType: 'bytes', name: 'publicKey', type: 'bytes' },
      { internalType: 'string', name: 'metadataURI', type: 'string' },
    ],
    name: 'registerService',
    outputs: [{ internalType: 'address', name: 'escrowContract', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'operator', type: 'address' }],
    name: 'setOperator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'disputeAgent', type: 'address' }],
    name: 'setDisputeAgent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'operator', type: 'address' }],
    name: 'revokeOperator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'disputeAgent', type: 'address' }],
    name: 'revokeDisputeAgent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'service', type: 'address' },
      { indexed: false, internalType: 'address', name: 'escrowContract', type: 'address' },
      { indexed: false, internalType: 'bytes', name: 'publicKey', type: 'bytes' },
    ],
    name: 'ServiceRegistered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'escrowContract', type: 'address' },
      { indexed: true, internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'RoleGrantedToEscrow',
    type: 'event',
  },
] as const;

// Role constants
export const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775'; // keccak256("ADMIN_ROLE")
export const OPERATOR_ROLE = '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'; // keccak256("OPERATOR_ROLE")
export const DISPUTE_AGENT_ROLE = '0x6b7d6b7cf1c6c9e7e8b6e8f0e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8'; // keccak256("DISPUTE_AGENT_ROLE")
