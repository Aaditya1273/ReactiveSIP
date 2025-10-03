# 🚀 ReactiveSIP - Autonomous DeFi Yield Engine:

## Overview

**ReactiveSIP** is the world's first AI-powered Systematic Investment Plan (SIP) platform built on Reactive Network. It combines the innovative **Non-Locking FlashLoan Protocol** with autonomous AI-driven investment management, creating a comprehensive DeFi ecosystem where users can:

- 💰 **Earn from Flash Loans** - Provide liquidity without locking assets
- 🤖 **Automate Investments** - Create SIPs through natural language with AI
- 📊 **Optimize Portfolios** - AI-powered yield optimization and risk management
- ⚡ **Reactive Automation** - Event-driven execution without manual intervention

### The Innovation

In traditional DeFi protocols like Aave, when users provide liquidity to the flash loan pool, their assets are staked and represented by receipt tokens. However, these staked assets remain locked, limiting their usability. Our project introduces a novel solution using Reactive Network to address these limitations and enhance asset liquidity, now enhanced with autonomous SIP management.

video tutorial : [https://www.loom.com/share/ed734581998249eb853a9cff7dce9cad?sid=c2a5d99b-b640-4c2d-bc61-05489a1209e4](https://www.loom.com/share/ed734581998249eb853a9cff7dce9cad?sid=c2a5d99b-b640-4c2d-bc61-05489a1209e4)

deployed FlashLoan Address : [0xff8b1bba3a612e27236347cdbeff220d19028c81e1446a122cbdb224a9443223](https://sepolia.etherscan.io/tx/0xff8b1bba3a612e27236347cdbeff220d19028c81e1446a122cbdb224a9443223)

rvm : [RVM](https://kopli.reactscan.net/rvm/0xafe08919dac82e79ae274eb94441aa2447bb13b6)

## Key Innovation: Reactive Network in DeFi

The core of this project lies in the reactive network’s capabilities. Unlike conventional cross-chain read-then-transaction approaches, our use of the reactive network makes it possible to trigger automatic, on-chain actions in response to specific events. This event-driven framework enables transactions to occur based on predefined conditions without holding assets locked in a pool, giving users dynamic control over their funds.

## 🌟 Unique Features

### Non-Locking FlashLoan Protocol

- **Token Ownership Retained by Users**: In our protocol, users retain full ownership of their tokens while still participating as liquidity providers for flash loans. Instead of transferring tokens to a central pool, users hold their assets directly, enabling full access and control over their funds.

- **Instant Liquidity Management**: In our system, users become liquidity providers by simply approving the flash loan contract. When a user's approval event is detected, our protocol automatically updates the liquidity pool details. If the user transfers assets, the protocol instantly reflects these changes, making the liquidity dynamic and responsive.

- **Event-Triggered Transactions**: This protocol is driven by event-triggered transactions rather than static pools. When users request a flash loan, the reactive network initiates an immediate transaction, taking the required tokens from the liquidity providers and directing them to the flash loan receiver. After the loan is utilized and repaid, the tokens are returned and redistributed among liquidity providers, bypassing the need for any locked assets.

- **Fee Structure**: For each flash loan transaction, a fee of **0.3%** is applied. This fee is distributed among liquidity providers, ensuring a continuous incentive while maintaining the non-locking nature of the protocol.

- **Unmatched Asset Accessibility**: Users maintain full access to their assets, as there is no asset lock-up in the liquidity pool. This structure empowers liquidity providers, enabling them to freely move, trade, or leverage their tokens across other DeFi protocols while still participating in the flash loan ecosystem.

### 🤖 AI-Powered SIP Management (NEW!)

- **Natural Language Interface**: Create and manage SIPs through simple conversation - "Create a SIP with 100 tokens monthly for retirement"
- **Automated Execution**: Reactive Network monitors and executes deposits automatically based on your schedule
- **Portfolio Optimization**: AI analyzes your investments and suggests optimal strategies
- **Emergency Protection**: AI-powered crisis detection with instant fund protection
- **Real-Time Monitoring**: Live portfolio tracking across all your SIP plans
- **Yield Maximization**: Intelligent fund allocation for maximum returns

## How Reactive Network Empowers DeFi Efficiency

The design of this protocol is guided by the philosophy that any event can be the catalyst for a transaction. When users approve, transfer, or interact with the contract, these actions are automatically reflected in the protocol’s ledger, keeping liquidity details updated in real-time. This dynamic reaction mechanism not only ensures liquidity but also empowers users to utilize their tokens across the DeFi ecosystem without sacrificing access or control.

# 🚀 Quick Start

## For SIP Platform (Reactive Mainnet)

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete instructions.

```bash
# Install dependencies
npm run install:all

# Deploy contracts to Reactive Mainnet
cd contract
forge script script/DeploySIP.s.sol:DeploySIP --rpc-url https://mainnet-rpc.rnk.dev/ --broadcast --legacy

# Start AI Agent
cd ../ai-agent
npm run dev

# Start Frontend
cd ../frontend
npm run dev
```

Visit http://localhost:5173/sip for the SIP Dashboard!

## Network Configuration (Reactive Mainnet)

```
Network Name: Reactive Mainnet
RPC URL: https://mainnet-rpc.rnk.dev/
Chain ID: 1597
Currency Symbol: REACT
Block Explorer: https://reactscan.net/
System Contract: 0x0000000000000000000000000000000000fffFfF
```

# Deployment & Testing (Legacy FlashLoan)

To deploy testnet contracts to Sepolia, follow these steps, making sure you substitute the appropriate keys, addresses, and endpoints where necessary. You will need the following environment variables configured appropriately to follow this script:

```
export SEPOLIA_RPC=
export SEPOLIA_PRIVATE_KEY=
export REACTIVE_RPC=https://kopli-rpc.rkt.ink
export REACTIVE_PRIVATE_KEY=
export SYSTEM_CONTRACT_ADDR=0x0000000000000000000000000000000000FFFFFF
export CALLBACK_SENDER_ADDR=0x33Bbb7D0a2F1029550B0e91f653c4055DC9F4Dd8
export USER_PUBLIC_KEY=
export TOKEN_ADDRESS=
```

If the user does not have a predefined token, deploy a token contract on the Sepolia network. This token will be used in the flash loan contract.

```
forge create --rpc-url $SEPOLIA_RPC --private-key $SEPOLIA_PRIVATE_KEY src/StraightFlashLoan/token.sol:Token --legacy
```

Output: Assign the deployed token address to TOKEN_ADDRESS:

```
export TOKEN_ADDRESS=
```

Once the token is deployed, mint tokens to the user's address.

```
cast send $TOKEN_ADDRESS "mint(address,uint256)" $USER_PUBLIC_KEY 1000000000000000000  --rpc-url $SEPOLIA_RPC --private-key $SEPOLIA_PRIVATE_KEY --legacy
```

Deploy the FlashLoan contract, providing the token address and the callback sender address.

```
forge create --rpc-url $SEPOLIA_RPC --private-key $SEPOLIA_PRIVATE_KEY src/StraightFlashLoan/FlashLoan.sol:FlashLoan --constructor-args $TOKEN_ADDRESS $CALLBACK_SENDER_ADDR --value 0.01ether  --legacy
```

Output: Assign the deployed flash loan contract address to FLASHLOAN_ADDR:

```
export FLASHLOAN_ADDR=
```

Deploy the ReactiveFlashLoan contract, configured to monitor liquidity providers. This contract will be set up to listen for events and manage liquidity updates.

```
forge create --rpc-url $REACTIVE_RPC --private-key $REACTIVE_PRIVATE_KEY src/StraightFlashLoan/ReactiveFlashLoan.sol:ReactiveFlashLoan --constructor-args $SYSTEM_CONTRACT_ADDR $FLASHLOAN_ADDR $TOKEN_ADDRESS  --legacy
```

Approve the FlashLoan contract to access the tokens, enabling it to use liquidity from the user's token balance.

```
cast send $TOKEN_ADDRESS "approve(address,uint256)" $FLASHLOAN_ADDR 1000000000000000000  --rpc-url $SEPOLIA_RPC --private-key $SEPOLIA_PRIVATE_KEY --legacy
```
