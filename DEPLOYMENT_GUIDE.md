# 🚀 ReactiveSIP Deployment Guide

Complete guide to deploy ReactiveSIP - Autonomous DeFi Yield Engine on Reactive Mainnet

## 📋 Prerequisites

- Node.js >= v18.18
- Foundry (for smart contracts)
- MetaMask wallet
- REACT tokens on Reactive Mainnet
- OpenAI API Key (for AI agent)

## 🌐 Network Configuration

### Reactive Mainnet
- **Network Name**: Reactive Mainnet
- **RPC URL**: https://mainnet-rpc.rnk.dev/
- **Chain ID**: 1597
- **Currency Symbol**: REACT
- **Block Explorer**: https://reactscan.net/
- **System Contract**: 0x0000000000000000000000000000000000fffFfF

## 📦 Installation

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd ReactiveSIP

# Install frontend dependencies
cd frontend
npm install

# Install AI agent dependencies
cd ../ai-agent
npm install

# Install contract dependencies
cd ../contract
forge install
```

## 🔧 Environment Setup

### Contract Environment (.env in contract folder)

```bash
# Create .env file in contract directory
cd contract
cp .env.example .env

# Edit .env with your values
REACTIVE_RPC=https://mainnet-rpc.rnk.dev/
REACTIVE_PRIVATE_KEY=your_private_key_here
SYSTEM_CONTRACT_ADDR=0x0000000000000000000000000000000000fffFfF
CALLBACK_SENDER_ADDR=0x33Bbb7D0a2F1029550B0e91f653c4055DC9F4Dd8
```

### AI Agent Environment (.env in ai-agent folder)

```bash
# Create .env file in ai-agent directory
cd ../ai-agent
cp .env.example .env

# Edit .env with your values
REACTIVE_RPC_URL=https://mainnet-rpc.rnk.dev/
REACTIVE_CHAIN_ID=1597
OPENAI_API_KEY=your_openai_api_key_here
AI_AGENT_PRIVATE_KEY=your_private_key_here
PORT=3001
```

### Frontend Environment (.env in frontend folder)

```bash
# Create .env file in frontend directory
cd ../frontend
touch .env

# Add these variables (will be updated after contract deployment)
REACT_APP_SIP_MANAGER_ADDRESS=
REACT_APP_REACTIVE_SIP_ADDRESS=
REACT_APP_TOKEN_ADDRESS=
REACT_APP_AI_AGENT_URL=http://localhost:3001
```

## 📝 Step-by-Step Deployment

### Step 1: Deploy Smart Contracts

```bash
cd contract

# Deploy to Reactive Mainnet
forge script script/DeploySIP.s.sol:DeploySIP \
  --rpc-url $REACTIVE_RPC \
  --private-key $REACTIVE_PRIVATE_KEY \
  --broadcast \
  --legacy

# Save the deployed addresses from the output
# Example output:
# Token: 0x...
# SIPManager: 0x...
# ReactiveSIP: 0x...
```

### Step 2: Update Environment Variables

Update the `.env` files with deployed contract addresses:

**ai-agent/.env**
```bash
SIP_MANAGER_ADDRESS=0x... # From deployment output
REACTIVE_SIP_ADDRESS=0x... # From deployment output
TOKEN_ADDRESS=0x... # From deployment output
SYSTEM_CONTRACT_ADDRESS=0x0000000000000000000000000000000000fffFfF
```

**frontend/.env**
```bash
REACT_APP_SIP_MANAGER_ADDRESS=0x... # From deployment output
REACT_APP_REACTIVE_SIP_ADDRESS=0x... # From deployment output
REACT_APP_TOKEN_ADDRESS=0x... # From deployment output
REACT_APP_AI_AGENT_URL=http://localhost:3001
```

### Step 3: Authorize AI Agent

The AI agent needs to be authorized to trigger SIP deposits:

```bash
# Using cast (Foundry)
cast send $REACTIVE_SIP_ADDRESS \
  "addAuthorizedAgent(address)" \
  $AI_AGENT_ADDRESS \
  --rpc-url $REACTIVE_RPC \
  --private-key $REACTIVE_PRIVATE_KEY \
  --legacy
```

### Step 4: Start AI Agent

```bash
cd ai-agent

# Build TypeScript
npm run build

# Start the agent
npm start

# Or for development
npm run dev
```

The AI agent will start on port 3001 and begin monitoring for SIP deposits.

### Step 5: Start Frontend

```bash
cd frontend

# Start development server
npm run dev

# Or build for production
npm run build
npm run preview
```

The frontend will be available at http://localhost:5173

## 🧪 Testing the System

### 1. Get Test Tokens

```bash
# Mint tokens to your address
cast send $TOKEN_ADDRESS \
  "mint(address,uint256)" \
  $YOUR_ADDRESS \
  1000000000000000000000 \
  --rpc-url $REACTIVE_RPC \
  --private-key $REACTIVE_PRIVATE_KEY \
  --legacy
```

### 2. Approve SIP Manager

```bash
# Approve SIP Manager to spend your tokens
cast send $TOKEN_ADDRESS \
  "approve(address,uint256)" \
  $SIP_MANAGER_ADDRESS \
  1000000000000000000000 \
  --rpc-url $REACTIVE_RPC \
  --private-key $REACTIVE_PRIVATE_KEY \
  --legacy
```

### 3. Create Your First SIP

Option A - Using Frontend:
1. Navigate to http://localhost:5173/sip
2. Click "Create SIP"
3. Fill in the details
4. Submit

Option B - Using AI Agent:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a SIP plan with 100 tokens monthly for retirement",
    "userAddress": "0xYourAddress"
  }'
```

Option C - Direct Contract Call:
```bash
cast send $SIP_MANAGER_ADDRESS \
  "createSIP(address,uint256,uint256,string)" \
  $TOKEN_ADDRESS \
  100000000000000000000 \
  2592000 \
  "My First SIP" \
  --rpc-url $REACTIVE_RPC \
  --private-key $REACTIVE_PRIVATE_KEY \
  --legacy
```

## 🔍 Monitoring

### Check SIP Status

```bash
# Get your SIP plans
cast call $SIP_MANAGER_ADDRESS \
  "getUserPlans(address)" \
  $YOUR_ADDRESS \
  --rpc-url $REACTIVE_RPC

# Get portfolio
cast call $SIP_MANAGER_ADDRESS \
  "getPortfolio(address)" \
  $YOUR_ADDRESS \
  --rpc-url $REACTIVE_RPC
```

### Monitor AI Agent Logs

```bash
# The AI agent logs will show:
# - SIP deposits being monitored
# - Automated executions
# - User interactions
# - Errors and warnings
```

### View on Block Explorer

Visit https://reactscan.net/ and search for your contract addresses to view transactions.

## 🎯 Key Features

### 1. Natural Language SIP Creation
Talk to the AI agent in plain English:
- "Create a SIP with 50 tokens monthly"
- "Show my portfolio"
- "Pause my retirement plan"

### 2. Automated Deposits
The Reactive Network automatically triggers deposits based on your schedule.

### 3. Portfolio Optimization
AI-powered suggestions to maximize your returns.

### 4. Emergency Protection
Instant fund protection with emergency protocols.

## 🔒 Security Best Practices

1. **Never commit private keys** to version control
2. **Use hardware wallets** for production deployments
3. **Test thoroughly** on testnet before mainnet
4. **Monitor contract events** for suspicious activity
5. **Keep dependencies updated** regularly

## 🐛 Troubleshooting

### Contract Deployment Fails
- Check you have enough REACT for gas
- Verify RPC URL is correct
- Ensure private key has proper format (with 0x prefix)

### AI Agent Can't Connect
- Verify contract addresses in .env
- Check OpenAI API key is valid
- Ensure RPC endpoint is accessible

### Frontend Not Loading Data
- Verify AI agent is running on port 3001
- Check contract addresses in frontend .env
- Ensure MetaMask is connected to Reactive Mainnet

### SIP Deposits Not Executing
- Verify AI agent is authorized in ReactiveSIP contract
- Check user has approved SIP Manager
- Ensure sufficient token balance

## 📚 API Reference

### AI Agent Endpoints

**POST /api/chat**
```json
{
  "message": "Create a SIP with 100 tokens monthly",
  "userAddress": "0x..."
}
```

**GET /api/portfolio/:address**
Returns user portfolio data

**GET /api/plans/:address**
Returns user's SIP plans

**POST /api/execute-sip**
```json
{
  "planId": 1
}
```

## 🎉 Next Steps

1. **Integrate with DeFi Protocols**: Connect to yield farms for better returns
2. **Add More Chains**: Expand beyond Reactive Mainnet
3. **Enhanced AI Features**: More sophisticated portfolio optimization
4. **Mobile App**: Build native mobile applications
5. **Social Features**: Share strategies with the community

## 📞 Support

- Documentation: See README.md
- Issues: Open a GitHub issue
- Community: Join our Discord/Telegram

## 📄 License

MIT License - See LICENSE file for details

---

Built with ❤️ for Reactive Network
Powered by AI, Secured by Blockchain
