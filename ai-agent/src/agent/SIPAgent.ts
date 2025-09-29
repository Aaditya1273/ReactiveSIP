import { BlockchainService } from '../services/BlockchainService';
import { AIService } from '../services/AIService';

export interface AgentResponse {
  message: string;
  action?: string;
  data?: any;
  suggestions?: string[];
}

export class SIPAgent {
  private blockchainService: BlockchainService;
  private aiService: AIService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private conversationHistory: Map<string, any[]> = new Map();

  constructor(blockchainService: BlockchainService, aiService: AIService) {
    this.blockchainService = blockchainService;
    this.aiService = aiService;
  }

  /**
   * Process natural language message from user
   */
  async processMessage(message: string, userAddress: string): Promise<AgentResponse> {
    try {
      // Get conversation history
      const history = this.conversationHistory.get(userAddress) || [];
      
      // Analyze intent using AI
      const intent = await this.aiService.analyzeIntent(message, history);
      
      // Update history
      history.push({ role: 'user', content: message });
      this.conversationHistory.set(userAddress, history);

      // Route to appropriate handler
      let response: AgentResponse;

      switch (intent.action) {
        case 'create_sip':
          response = await this.handleCreateSIP(intent.parameters, userAddress);
          break;
        case 'check_portfolio':
          response = await this.handleCheckPortfolio(userAddress);
          break;
        case 'pause_sip':
          response = await this.handlePauseSIP(intent.parameters, userAddress);
          break;
        case 'resume_sip':
          response = await this.handleResumeSIP(intent.parameters, userAddress);
          break;
        case 'cancel_sip':
          response = await this.handleCancelSIP(intent.parameters, userAddress);
          break;
        case 'emergency':
          response = await this.handleEmergency(userAddress);
          break;
        case 'optimize':
          response = await this.handleOptimize(userAddress);
          break;
        default:
          response = await this.handleGeneral(message, userAddress);
      }

      // Add response to history
      history.push({ role: 'assistant', content: response.message });
      this.conversationHistory.set(userAddress, history);

      return response;
    } catch (error: any) {
      console.error('Error processing message:', error);
      return {
        message: `I encountered an error: ${error.message}. Please try again.`,
        action: 'error'
      };
    }
  }

  /**
   * Handle SIP creation
   */
  private async handleCreateSIP(parameters: any, userAddress: string): Promise<AgentResponse> {
    try {
      const { amount, frequency, planName } = parameters;

      // Validate parameters
      if (!amount || !frequency) {
        return {
          message: "I need more information to create your SIP. Please specify the deposit amount and frequency (e.g., 'daily', 'weekly', 'monthly').",
          suggestions: [
            "Create a SIP with 100 tokens monthly",
            "Set up daily investment of 10 tokens",
            "Start weekly SIP of 50 tokens"
          ]
        };
      }

      // Convert frequency to seconds
      const frequencySeconds = this.convertFrequencyToSeconds(frequency);

      // Create SIP on blockchain
      const tx = await this.blockchainService.createSIP(
        userAddress,
        amount,
        frequencySeconds,
        planName || `SIP Plan ${Date.now()}`
      );

      return {
        message: `🎉 Perfect! I've created your ${planName || 'SIP plan'} with ${amount} tokens ${frequency}. Your first deposit will be processed shortly. Transaction: ${tx.hash}`,
        action: 'sip_created',
        data: {
          transactionHash: tx.hash,
          amount,
          frequency,
          planName
        },
        suggestions: [
          "Show my portfolio",
          "Create another SIP",
          "Check my plans"
        ]
      };
    } catch (error: any) {
      return {
        message: `Failed to create SIP: ${error.message}. Please ensure you have approved the SIP Manager contract and have sufficient balance.`,
        action: 'error'
      };
    }
  }

  /**
   * Handle portfolio check
   */
  private async handleCheckPortfolio(userAddress: string): Promise<AgentResponse> {
    try {
      const portfolio = await this.blockchainService.getPortfolio(userAddress);
      const plans = await this.blockchainService.getUserPlans(userAddress);

      const totalValue = Number(portfolio.totalInvested) + Number(portfolio.totalYield);
      const roi = portfolio.totalInvested > 0 
        ? ((Number(portfolio.totalYield) / Number(portfolio.totalInvested)) * 100).toFixed(2)
        : '0.00';

      let message = `📊 **Your Portfolio Summary**\n\n`;
      message += `💰 Total Invested: ${this.formatAmount(portfolio.totalInvested)} tokens\n`;
      message += `📈 Total Yield: ${this.formatAmount(portfolio.totalYield)} tokens\n`;
      message += `💎 Total Value: ${this.formatAmount(totalValue)} tokens\n`;
      message += `📊 ROI: ${roi}%\n`;
      message += `🎯 Active Plans: ${portfolio.activePlans}\n\n`;

      if (plans.length > 0) {
        message += `**Your SIP Plans:**\n`;
        plans.forEach((plan: any, index: number) => {
          message += `${index + 1}. ${plan.planName} - ${this.formatAmount(plan.depositAmount)} tokens ${this.formatFrequency(plan.frequency)}\n`;
          message += `   Status: ${plan.isActive ? '✅ Active' : '⏸️ Paused'}\n`;
          message += `   Deposited: ${this.formatAmount(plan.totalDeposited)} tokens\n`;
        });
      }

      return {
        message,
        action: 'portfolio_shown',
        data: { portfolio, plans },
        suggestions: [
          "Optimize my portfolio",
          "Create a new SIP",
          "Pause a plan"
        ]
      };
    } catch (error: any) {
      return {
        message: `Failed to fetch portfolio: ${error.message}`,
        action: 'error'
      };
    }
  }

  /**
   * Handle SIP pause
   */
  private async handlePauseSIP(parameters: any, userAddress: string): Promise<AgentResponse> {
    try {
      const { planId } = parameters;

      if (!planId) {
        const plans = await this.blockchainService.getUserPlans(userAddress);
        const activePlans = plans.filter((p: any) => p.isActive);

        if (activePlans.length === 0) {
          return {
            message: "You don't have any active SIP plans to pause.",
            suggestions: ["Create a new SIP", "Show my portfolio"]
          };
        }

        let message = "Which SIP plan would you like to pause?\n\n";
        activePlans.forEach((plan: any, index: number) => {
          message += `${index + 1}. ${plan.planName} (Plan ID: ${plan.planId})\n`;
        });

        return {
          message,
          action: 'select_plan',
          data: { plans: activePlans }
        };
      }

      const tx = await this.blockchainService.pauseSIP(planId);

      return {
        message: `⏸️ Your SIP plan has been paused successfully. You can resume it anytime. Transaction: ${tx.hash}`,
        action: 'sip_paused',
        data: { transactionHash: tx.hash, planId },
        suggestions: ["Show my portfolio", "Resume this plan", "Create new SIP"]
      };
    } catch (error: any) {
      return {
        message: `Failed to pause SIP: ${error.message}`,
        action: 'error'
      };
    }
  }

  /**
   * Handle SIP resume
   */
  private async handleResumeSIP(parameters: any, userAddress: string): Promise<AgentResponse> {
    try {
      const { planId } = parameters;

      if (!planId) {
        const plans = await this.blockchainService.getUserPlans(userAddress);
        const pausedPlans = plans.filter((p: any) => !p.isActive);

        if (pausedPlans.length === 0) {
          return {
            message: "You don't have any paused SIP plans to resume.",
            suggestions: ["Create a new SIP", "Show my portfolio"]
          };
        }

        let message = "Which SIP plan would you like to resume?\n\n";
        pausedPlans.forEach((plan: any, index: number) => {
          message += `${index + 1}. ${plan.planName} (Plan ID: ${plan.planId})\n`;
        });

        return {
          message,
          action: 'select_plan',
          data: { plans: pausedPlans }
        };
      }

      const tx = await this.blockchainService.resumeSIP(planId);

      return {
        message: `▶️ Your SIP plan has been resumed successfully! Deposits will continue as scheduled. Transaction: ${tx.hash}`,
        action: 'sip_resumed',
        data: { transactionHash: tx.hash, planId },
        suggestions: ["Show my portfolio", "Optimize portfolio", "Create new SIP"]
      };
    } catch (error: any) {
      return {
        message: `Failed to resume SIP: ${error.message}`,
        action: 'error'
      };
    }
  }

  /**
   * Handle SIP cancellation
   */
  private async handleCancelSIP(parameters: any, userAddress: string): Promise<AgentResponse> {
    try {
      const { planId } = parameters;

      if (!planId) {
        return {
          message: "Please specify which SIP plan you'd like to cancel by providing the Plan ID.",
          suggestions: ["Show my plans", "Show my portfolio"]
        };
      }

      const tx = await this.blockchainService.cancelSIP(planId);

      return {
        message: `🛑 Your SIP plan has been cancelled. Your funds remain safe in the protocol. Transaction: ${tx.hash}`,
        action: 'sip_cancelled',
        data: { transactionHash: tx.hash, planId },
        suggestions: ["Create a new SIP", "Show my portfolio", "Withdraw funds"]
      };
    } catch (error: any) {
      return {
        message: `Failed to cancel SIP: ${error.message}`,
        action: 'error'
      };
    }
  }

  /**
   * Handle emergency situations
   */
  private async handleEmergency(userAddress: string): Promise<AgentResponse> {
    try {
      // Trigger emergency protocol
      await this.blockchainService.triggerEmergency(userAddress, "User initiated emergency");

      return {
        message: `🚨 Emergency protocols activated! All your SIP plans have been paused and your funds are secured. You can withdraw them anytime.`,
        action: 'emergency_activated',
        suggestions: ["Show my portfolio", "Withdraw funds", "Resume plans"]
      };
    } catch (error: any) {
      return {
        message: `Failed to activate emergency protocol: ${error.message}`,
        action: 'error'
      };
    }
  }

  /**
   * Handle portfolio optimization
   */
  private async handleOptimize(userAddress: string): Promise<AgentResponse> {
    try {
      const portfolio = await this.blockchainService.getPortfolio(userAddress);
      const plans = await this.blockchainService.getUserPlans(userAddress);

      // AI-powered optimization suggestions
      const suggestions = await this.aiService.generateOptimizationSuggestions(portfolio, plans);

      return {
        message: `🎯 **Portfolio Optimization Suggestions**\n\n${suggestions}`,
        action: 'optimization_shown',
        data: { suggestions },
        suggestions: [
          "Apply optimization",
          "Show detailed analysis",
          "Keep current strategy"
        ]
      };
    } catch (error: any) {
      return {
        message: `Failed to optimize portfolio: ${error.message}`,
        action: 'error'
      };
    }
  }

  /**
   * Handle general queries
   */
  private async handleGeneral(message: string, userAddress: string): Promise<AgentResponse> {
    const response = await this.aiService.generateResponse(message, userAddress);
    
    return {
      message: response,
      action: 'general',
      suggestions: [
        "Create a SIP plan",
        "Show my portfolio",
        "Help me optimize"
      ]
    };
  }

  /**
   * Start automated monitoring and execution
   */
  startAutomatedMonitoring() {
    console.log('🤖 Starting automated SIP monitoring...');
    
    // Check every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.blockchainService.monitorAndExecutePendingSIPs();
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop automated monitoring
   */
  stopAutomatedMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Stopped automated SIP monitoring');
    }
  }

  // Helper methods
  private convertFrequencyToSeconds(frequency: string): number {
    const freq = frequency.toLowerCase();
    if (freq.includes('day') || freq.includes('daily')) return 86400;
    if (freq.includes('week') || freq.includes('weekly')) return 604800;
    if (freq.includes('month') || freq.includes('monthly')) return 2592000;
    if (freq.includes('hour') || freq.includes('hourly')) return 3600;
    return 86400; // default to daily
  }

  private formatAmount(amount: any): string {
    return (Number(amount) / 1e18).toFixed(2);
  }

  private formatFrequency(seconds: number): string {
    if (seconds === 86400) return 'daily';
    if (seconds === 604800) return 'weekly';
    if (seconds === 2592000) return 'monthly';
    if (seconds === 3600) return 'hourly';
    return `every ${seconds} seconds`;
  }
}
