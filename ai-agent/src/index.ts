import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { SIPAgent } from './agent/SIPAgent';
import { BlockchainService } from './services/BlockchainService';
import { AIService } from './services/AIService';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const blockchainService = new BlockchainService({
  rpcUrl: process.env.REACTIVE_RPC_URL || 'https://mainnet-rpc.rnk.dev/',
  chainId: 1597,
  privateKey: process.env.AI_AGENT_PRIVATE_KEY!,
  sipManagerAddress: process.env.SIP_MANAGER_ADDRESS!,
  reactiveSIPAddress: process.env.REACTIVE_SIP_ADDRESS!,
  tokenAddress: process.env.TOKEN_ADDRESS!
});

const aiService = new AIService({
  openaiApiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview'
});

const sipAgent = new SIPAgent(blockchainService, aiService);

// REST API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, userAddress } = req.body;
    
    if (!message || !userAddress) {
      return res.status(400).json({ error: 'Message and userAddress required' });
    }

    const response = await sipAgent.processMessage(message, userAddress);
    res.json(response);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/portfolio/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const portfolio = await blockchainService.getPortfolio(address);
    res.json(portfolio);
  } catch (error: any) {
    console.error('Portfolio error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/plans/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const plans = await blockchainService.getUserPlans(address);
    res.json(plans);
  } catch (error: any) {
    console.error('Plans error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/execute-sip', async (req, res) => {
  try {
    const { planId } = req.body;
    
    if (!planId) {
      return res.status(400).json({ error: 'planId required' });
    }

    const tx = await blockchainService.executeSIPDeposit(planId);
    res.json({ success: true, transactionHash: tx.hash });
  } catch (error: any) {
    console.error('Execute SIP error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await blockchainService.getGlobalStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket Server for real-time updates
const server = app.listen(PORT, () => {
  console.log(`🤖 ReactiveSIP AI Agent running on port ${PORT}`);
  console.log(`🌐 Network: Reactive Mainnet (Chain ID: 1597)`);
  console.log(`📡 RPC: ${process.env.REACTIVE_RPC_URL || 'https://mainnet-rpc.rnk.dev/'}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'chat') {
        const response = await sipAgent.processMessage(
          message.content,
          message.userAddress
        );
        ws.send(JSON.stringify({ type: 'chat_response', data: response }));
      } else if (message.type === 'subscribe_portfolio') {
        // Subscribe to portfolio updates
        const portfolio = await blockchainService.getPortfolio(message.userAddress);
        ws.send(JSON.stringify({ type: 'portfolio_update', data: portfolio }));
      }
    } catch (error: any) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Start automated monitoring
sipAgent.startAutomatedMonitoring();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  sipAgent.stopAutomatedMonitoring();
  server.close();
  process.exit(0);
});

export { app, sipAgent, blockchainService, aiService };
