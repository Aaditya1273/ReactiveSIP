import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  ShowChart as ShowChartIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import './sipDashboard.css';

const SIPDashboard = () => {
  const [account, setAccount] = useState('');
  const [portfolio, setPortfolio] = useState(null);
  const [sipPlans, setSipPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  
  // New SIP form state
  const [newSIP, setNewSIP] = useState({
    amount: '',
    frequency: 'monthly',
    planName: ''
  });

  // Contract addresses - Update these after deployment
  const SIP_MANAGER_ADDRESS = process.env.REACT_APP_SIP_MANAGER_ADDRESS || '0x...';
  const TOKEN_ADDRESS = process.env.REACT_APP_TOKEN_ADDRESS || '0x...';
  const AI_AGENT_URL = process.env.REACT_APP_AI_AGENT_URL || 'http://localhost:3001';

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (account) {
      loadPortfolioData();
    }
  }, [account]);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setAccount(accounts[0]);
        toast.success('Wallet connected!');
      } else {
        toast.error('Please install MetaMask!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const loadPortfolioData = async () => {
    try {
      setLoading(true);
      
      // Fetch portfolio from AI agent API
      const portfolioRes = await fetch(`${AI_AGENT_URL}/api/portfolio/${account}`);
      const portfolioData = await portfolioRes.json();
      setPortfolio(portfolioData);

      // Fetch SIP plans
      const plansRes = await fetch(`${AI_AGENT_URL}/api/plans/${account}`);
      const plansData = await plansRes.json();
      setSipPlans(plansData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading portfolio:', error);
      setLoading(false);
      toast.error('Failed to load portfolio data');
    }
  };

  const handleCreateSIP = async () => {
    try {
      if (!newSIP.amount || !newSIP.planName) {
        toast.error('Please fill all fields');
        return;
      }

      setLoading(true);

      // First, approve the SIP Manager to spend tokens
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tokenABI = ['function approve(address spender, uint256 amount) external returns (bool)'];
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, tokenABI, signer);
      
      const amountWei = ethers.parseEther(newSIP.amount);
      const approveTx = await tokenContract.approve(SIP_MANAGER_ADDRESS, amountWei * BigInt(100)); // Approve for 100 deposits
      await approveTx.wait();
      toast.success('Token approval successful!');

      // Create SIP via AI agent
      const response = await fetch(`${AI_AGENT_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Create a SIP plan with ${newSIP.amount} tokens ${newSIP.frequency} named ${newSIP.planName}`,
          userAddress: account
        })
      });

      const result = await response.json();
      
      if (result.action === 'sip_created') {
        toast.success('SIP plan created successfully!');
        setOpenDialog(false);
        setNewSIP({ amount: '', frequency: 'monthly', planName: '' });
        loadPortfolioData();
      } else {
        toast.error(result.message);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error creating SIP:', error);
      setLoading(false);
      toast.error('Failed to create SIP');
    }
  };

  const handlePauseSIP = async (planId) => {
    try {
      setLoading(true);
      const response = await fetch(`${AI_AGENT_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Pause SIP plan ${planId}`,
          userAddress: account
        })
      });

      const result = await response.json();
      toast.success('SIP plan paused!');
      loadPortfolioData();
      setLoading(false);
    } catch (error) {
      console.error('Error pausing SIP:', error);
      setLoading(false);
      toast.error('Failed to pause SIP');
    }
  };

  const handleResumeSIP = async (planId) => {
    try {
      setLoading(true);
      const response = await fetch(`${AI_AGENT_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Resume SIP plan ${planId}`,
          userAddress: account
        })
      });

      const result = await response.json();
      toast.success('SIP plan resumed!');
      loadPortfolioData();
      setLoading(false);
    } catch (error) {
      console.error('Error resuming SIP:', error);
      setLoading(false);
      toast.error('Failed to resume SIP');
    }
  };

  const handleChatSubmit = async () => {
    if (!chatMessage.trim()) return;

    try {
      setChatHistory([...chatHistory, { role: 'user', content: chatMessage }]);
      setChatMessage('');

      const response = await fetch(`${AI_AGENT_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatMessage,
          userAddress: account
        })
      });

      const result = await response.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: result.message }]);

      // Reload data if action was performed
      if (result.action && result.action !== 'general') {
        loadPortfolioData();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const formatAmount = (amount) => {
    return (Number(amount) / 1e18).toFixed(2);
  };

  const formatFrequency = (seconds) => {
    if (seconds === 86400) return 'Daily';
    if (seconds === 604800) return 'Weekly';
    if (seconds === 2592000) return 'Monthly';
    return `Every ${seconds}s`;
  };

  return (
    <Container maxWidth="xl" className="sip-dashboard">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h3" component="h1" fontWeight="bold">
            🚀 ReactiveSIP Dashboard
          </Typography>
          <Box>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{ mr: 2 }}
            >
              Create SIP
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => setChatOpen(!chatOpen)}
            >
              💬 AI Assistant
            </Button>
          </Box>
        </Box>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Portfolio Summary Cards */}
        {portfolio && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card className="stat-card">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AccountBalanceIcon sx={{ mr: 1, color: '#4CAF50' }} />
                    <Typography variant="h6">Total Invested</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {formatAmount(portfolio.totalInvested)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    REACT Tokens
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card className="stat-card">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUpIcon sx={{ mr: 1, color: '#2196F3' }} />
                    <Typography variant="h6">Total Yield</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {formatAmount(portfolio.totalYield)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    REACT Tokens
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card className="stat-card">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ShowChartIcon sx={{ mr: 1, color: '#FF9800' }} />
                    <Typography variant="h6">Total Value</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {formatAmount(Number(portfolio.totalInvested) + Number(portfolio.totalYield))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    REACT Tokens
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card className="stat-card">
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>Active Plans</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {portfolio.activePlans}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    SIP Plans Running
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* SIP Plans List */}
        <Typography variant="h5" sx={{ mb: 2 }} fontWeight="bold">
          Your SIP Plans
        </Typography>
        
        <Grid container spacing={3}>
          {sipPlans.map((plan) => (
            <Grid item xs={12} md={6} lg={4} key={plan.planId}>
              <Card className="sip-card">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {plan.planName}
                    </Typography>
                    <Chip 
                      label={plan.isActive ? 'Active' : 'Paused'} 
                      color={plan.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Deposit Amount
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatAmount(plan.depositAmount)} REACT
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatFrequency(plan.frequency)}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Deposited: {formatAmount(plan.totalDeposited)} REACT
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Yield Earned: {formatAmount(plan.totalYieldEarned)} REACT
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {plan.isActive ? (
                      <Tooltip title="Pause SIP">
                        <IconButton 
                          color="warning" 
                          onClick={() => handlePauseSIP(plan.planId)}
                        >
                          <PauseIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Resume SIP">
                        <IconButton 
                          color="success" 
                          onClick={() => handleResumeSIP(plan.planId)}
                        >
                          <PlayIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Create SIP Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New SIP Plan</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Plan Name"
              value={newSIP.planName}
              onChange={(e) => setNewSIP({ ...newSIP, planName: e.target.value })}
              sx={{ mt: 2, mb: 2 }}
            />
            <TextField
              fullWidth
              label="Deposit Amount (REACT)"
              type="number"
              value={newSIP.amount}
              onChange={(e) => setNewSIP({ ...newSIP, amount: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select
                value={newSIP.frequency}
                onChange={(e) => setNewSIP({ ...newSIP, frequency: e.target.value })}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateSIP} variant="contained" disabled={loading}>
              Create SIP
            </Button>
          </DialogActions>
        </Dialog>

        {/* AI Chat Panel */}
        {chatOpen && (
          <Card className="chat-panel" sx={{ position: 'fixed', bottom: 20, right: 20, width: 400, maxHeight: 500 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>🤖 AI Assistant</Typography>
              <Box sx={{ height: 300, overflowY: 'auto', mb: 2 }}>
                {chatHistory.map((msg, idx) => (
                  <Box 
                    key={idx} 
                    sx={{ 
                      mb: 1, 
                      p: 1, 
                      bgcolor: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="body2">{msg.content}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ask me anything..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                />
                <Button variant="contained" onClick={handleChatSubmit}>Send</Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
};

export default SIPDashboard;
