escrow contract for dispute resolution contract. 
for now, we assume that disputes are done on a per-service basis (later: batch disputes).

Payments are settled by facilitator through x402. In v1, the facilitator can only transfer with auth and our operator will have to append more information to each transfer. So, after a payment is made to this escrow contract (or another vault controlled by this contract), the operator will assign metadata to the funds, such as the recipient, sender, API response hash etc. 

# Contracts

## Factory

- register_service_provider:
    - service provider can register
    - some metadata on provider (IPFS)
    - post public key
    - creates a new DisputeEscrow contract

## DisputeEscrow

- receive payment: 
- create purchase:
    - amount of USDC, from, to, nonce
    - ID of order (user + nonce?)
    - funds are in escrow until delay passed
    - direct transfer (called by facilitator)
    - OR: called by operator (assume first)
- get status for request ID
- file_dispute:
    - user can file dispute
    - service provider has time to either say yes or no
- service_respond_dispute:
    - either yes or no
- refund_dispute:
    - user can withdraw refunded disputes
- withdraw:
    - service provider can claim funds that passed delay and are NOT in dispute
- escalate_dispute:
    - user can escalate a dispute where the service said no
- cancel_dispute:
    - user can cancel a dispute
- agent_respond_dispute
    - agent responds to dispute