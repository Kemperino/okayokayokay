# Resources

Paid API resources following the x402 protocol. Deployed at **https://windybay.okay3.xyz**

## Discovery

All resources are discoverable via: https://windybay.okay3.xyz/.well-known/x402

## Example Resource

- **weather-x402** - Mock weather API (see [weather-x402/README.md](./weather-x402/README.md))

## Verification Requirements

All resource responses include cryptographic verification:

```json
{
  "data": { /* resource-specific data */ },
  "dataHash": "SHA-256 hash of the data field",
  "signature": "Cryptographic signature of dataHash signed by merchant private key",
  "merchantPublicKey": "Merchant public key for signature verification"
}
```

Use `merchantPublicKey` to verify the `signature` against the `dataHash` to ensure data authenticity.

