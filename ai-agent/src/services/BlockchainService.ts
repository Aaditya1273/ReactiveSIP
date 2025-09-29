import { ethers } from 'ethers';

export interface BlockchainConfig {
  rpcUrl: string;
  chainId: number;
  privateKey: string;
  sipManagerAddress: string;
  reactiveSIPAddress: string;
  tokenAddress: string;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private sipManagerContract: ethers.Contract;
  private reactiveSIPContract: ethers.Contract;
  private tokenContract: ethers.Contract;

  // ABIs (simplified - you'll need to add full ABIs)
  private SIP_MANAGER_ABI = [
    'function createSIP(address token, uint256 depositAmount, uint256 frequency, string memory planName) external returns (uint256)',
    'function executeSIPDeposit(uint256 planId) external',
    'function batchExecuteSIPDeposits(uint256[] calldata planIds) external',
    'function pauseSIP(uint256 planId) external',
    'function resumeSIP(uint256 planId) external',
    'function cancelSIP(uint256 planId) external',
    'function getUserPlans(address user) external view returns (uint256[] memory)',
    'function getSIPPlan(uint256 planId) external view returns (address, address, uint256, uint256, uint256, uint256, uint256, bool, string memory, uint256)',
    'function getPortfolio(address user) external view returns (uint256, uint256, uint256)',
    'function isDepositDue(uint256 planId) external view returns (bool)',
    'function totalPlansCreated() external view returns (uint256)',
    'function totalValueLocked() external view returns (uint256)',
    'event SIPCreated(uint256 indexed planId, address indexed user, address token, uint256 depositAmount, uint256 frequency, string planName)',
    'event SIPDeposit(uint256 indexed planId, address indexed user, uint256 amount, uint256 timestamp)'
  ];

  private REACTIVE_SIP_ABI = [
    'function triggerSIPDeposit(uint256 planId, uint256 chain_id) external',
    'function batchTriggerSIPDeposits(uint256[] calldata planIds, uint256 chain_id) external',
    'function emergencyTrigger(address user, string calldata reason, uint256 chain_id) external',
    'function addAuthorizedAgent(address agent) external'
  ];

  private ERC20_ABI = [
    'function balanceOf(address account) external view returns (uint256)',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)'
  ];

  constructor(config: BlockchainConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);

    this.sipManagerContract = new ethers.Contract(
      config.sipManagerAddress,
      this.SIP_MANAGER_ABI,
      this.wallet
    );

    this.reactiveSIPContract = new ethers.Contract(
      config.reactiveSIPAddress,
      this.REACTIVE_SIP_ABI,
      this.wallet
    );

    this.tokenContract = new ethers.Contract(
      config.tokenAddress,
      this.ERC20_ABI,
      this.wallet
    );

    console.log('✅ Blockchain service initialized');
    console.log(`📍 SIP Manager: ${config.sipManagerAddress}`);
    console.log(`📍 Reactive SIP: ${config.reactiveSIPAddress}`);
    console.log(`📍 Token: ${config.tokenAddress}`);
  }

  /**
   * Create a new SIP plan
   */
  async createSIP(
    userAddress: string,
    amount: string,
    frequency: number,
    planName: string
  ): Promise<ethers.TransactionResponse> {
    try {
      const amountWei = ethers.parseEther(amount);
      
      // Check if user has approved the SIP Manager
      const allowance = await this.tokenContract.allowance(
        userAddress,
        await this.sipManagerContract.getAddress()
      );

      if (allowance < amountWei) {
        throw new Error('Insufficient allowance. Please approve the SIP Manager contract first.');
      }

      const tx = await this.sipManagerContract.createSIP(
        await this.tokenContract.getAddress(),
        amountWei,
        frequency,
        planName
      );

      await tx.wait();
      console.log(`✅ SIP created: ${tx.hash}`);
      
      return tx;
    } catch (error: any) {
      console.error('Error creating SIP:', error);
      throw new Error(`Failed to create SIP: ${error.message}`);
    }
  }

  /**
   * Execute a SIP deposit
   */
  async executeSIPDeposit(planId: number): Promise<ethers.TransactionResponse> {
    try {
      const tx = await this.sipManagerContract.executeSIPDeposit(planId);
      await tx.wait();
      console.log(`✅ SIP deposit executed for plan ${planId}: ${tx.hash}`);
      return tx;
    } catch (error: any) {
      console.error('Error executing SIP deposit:', error);
      throw new Error(`Failed to execute SIP deposit: ${error.message}`);
    }
  }

  /**
   * Pause a SIP plan
   */
  async pauseSIP(planId: number): Promise<ethers.TransactionResponse> {
    try {
      const tx = await this.sipManagerContract.pauseSIP(planId);
      await tx.wait();
      console.log(`⏸️ SIP paused for plan ${planId}: ${tx.hash}`);
      return tx;
    } catch (error: any) {
      console.error('Error pausing SIP:', error);
      throw new Error(`Failed to pause SIP: ${error.message}`);
    }
  }

  /**
   * Resume a SIP plan
   */
  async resumeSIP(planId: number): Promise<ethers.TransactionResponse> {
    try {
      const tx = await this.sipManagerContract.resumeSIP(planId);
      await tx.wait();
      console.log(`▶️ SIP resumed for plan ${planId}: ${tx.hash}`);
      return tx;
    } catch (error: any) {
      console.error('Error resuming SIP:', error);
      throw new Error(`Failed to resume SIP: ${error.message}`);
    }
  }

  /**
   * Cancel a SIP plan
   */
  async cancelSIP(planId: number): Promise<ethers.TransactionResponse> {
    try {
      const tx = await this.sipManagerContract.cancelSIP(planId);
      await tx.wait();
      console.log(`🛑 SIP cancelled for plan ${planId}: ${tx.hash}`);
      return tx;
    } catch (error: any) {
      console.error('Error cancelling SIP:', error);
      throw new Error(`Failed to cancel SIP: ${error.message}`);
    }
  }

  /**
   * Get user's portfolio
   */
  async getPortfolio(userAddress: string): Promise<any> {
    try {
      const [totalInvested, totalYield, activePlans] = 
        await this.sipManagerContract.getPortfolio(userAddress);

      return {
        totalInvested: totalInvested.toString(),
        totalYield: totalYield.toString(),
        activePlans: Number(activePlans)
      };
    } catch (error: any) {
      console.error('Error getting portfolio:', error);
      throw new Error(`Failed to get portfolio: ${error.message}`);
    }
  }

  /**
   * Get user's SIP plans
   */
  async getUserPlans(userAddress: string): Promise<any[]> {
    try {
      const planIds = await this.sipManagerContract.getUserPlans(userAddress);
      
      const plans = await Promise.all(
        planIds.map(async (planId: bigint) => {
          const plan = await this.sipManagerContract.getSIPPlan(planId);
          return {
            planId: Number(planId),
            user: plan[0],
            token: plan[1],
            depositAmount: plan[2].toString(),
            frequency: Number(plan[3]),
            lastDepositTime: Number(plan[4]),
            totalDeposited: plan[5].toString(),
            totalYieldEarned: plan[6].toString(),
            isActive: plan[7],
            planName: plan[8],
            createdAt: Number(plan[9])
          };
        })
      );

      return plans;
    } catch (error: any) {
      console.error('Error getting user plans:', error);
      throw new Error(`Failed to get user plans: ${error.message}`);
    }
  }

  /**
   * Monitor and execute pending SIPs
   */
  async monitorAndExecutePendingSIPs(): Promise<void> {
    try {
      console.log('🔍 Monitoring pending SIPs...');
      
      // Get all plans (you'd need to implement a way to track all active plans)
      // For now, this is a placeholder
      const totalPlans = await this.sipManagerContract.totalPlansCreated();
      const pendingPlans: number[] = [];

      for (let i = 1; i <= Number(totalPlans); i++) {
        const isDue = await this.sipManagerContract.isDepositDue(i);
        if (isDue) {
          pendingPlans.push(i);
        }
      }

      if (pendingPlans.length > 0) {
        console.log(`📋 Found ${pendingPlans.length} pending SIPs`);
        
        // Batch execute using Reactive Network
        const tx = await this.reactiveSIPContract.batchTriggerSIPDeposits(
          pendingPlans,
          1597 // Reactive Mainnet chain ID
        );
        
        await tx.wait();
        console.log(`✅ Batch executed ${pendingPlans.length} SIPs: ${tx.hash}`);
      } else {
        console.log('✓ No pending SIPs');
      }
    } catch (error: any) {
      console.error('Error monitoring SIPs:', error);
    }
  }

  /**
   * Trigger emergency protocol
   */
  async triggerEmergency(userAddress: string, reason: string): Promise<ethers.TransactionResponse> {
    try {
      const tx = await this.reactiveSIPContract.emergencyTrigger(
        userAddress,
        reason,
        1597
      );
      
      await tx.wait();
      console.log(`🚨 Emergency triggered for ${userAddress}: ${tx.hash}`);
      return tx;
    } catch (error: any) {
      console.error('Error triggering emergency:', error);
      throw new Error(`Failed to trigger emergency: ${error.message}`);
    }
  }

  /**
   * Get global statistics
   */
  async getGlobalStats(): Promise<any> {
    try {
      const totalPlans = await this.sipManagerContract.totalPlansCreated();
      const totalValueLocked = await this.sipManagerContract.totalValueLocked();

      return {
        totalPlans: Number(totalPlans),
        totalValueLocked: totalValueLocked.toString()
      };
    } catch (error: any) {
      console.error('Error getting global stats:', error);
      throw new Error(`Failed to get global stats: ${error.message}`);
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.tokenContract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error: any) {
      console.error('Error getting balance:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }
}
