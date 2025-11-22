## DisputeEscrow Implementation Progress

| Function              | Spec Name                 | Status                 |
| --------------------- | ------------------------- | ---------------------- |
| `confirmEscrow`       | create purchase           | ⏳ Working in Progress |
| `releaseEscrow`       | withdraw                  | ✅ Implemented         |
| `openDispute`         | file_dispute              | ✅ Implemented         |
| `respondToDispute`    | service_respond_dispute   | ✅ Implemented         |
| `getRequestStatus`    | get status for request ID | ✅ Implemented         |
| `escalateDispute`     | escalate_dispute          | ❌ Missing             |
| `refundDispute`       | refund_dispute            | ❌ Missing             |
| `cancelDispute`       | cancel_dispute            | ❌ Missing             |
| `agentRespondDispute` | agent_respond_dispute     | ❌ Missing             |
| receive payment       | receive payment           | ❌ Missing             |

## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
