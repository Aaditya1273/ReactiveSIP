import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIConfig {
  geminiApiKey: string;
  model: string;
}

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private modelName: string;

  constructor(config: AIConfig) {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.modelName = config.model || 'gemini-pro';
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    console.log('✅ AI service initialized with Gemini model:', this.modelName);
  }

  /**
   * Analyze user intent from natural language
   */
  async analyzeIntent(message: string, history: any[]): Promise<any> {
    try {
      const systemPrompt = `You are an AI assistant for a DeFi SIP (Systematic Investment Plan) platform on Reactive Network.
Your job is to analyze user messages and extract their intent and parameters.

Possible intents:
- create_sip: User wants to create a new SIP plan
- check_portfolio: User wants to see their portfolio
- pause_sip: User wants to pause a SIP plan
- resume_sip: User wants to resume a paused SIP plan
- cancel_sip: User wants to cancel a SIP plan
- emergency: User needs emergency fund protection
- optimize: User wants portfolio optimization suggestions
- general: General query or conversation

Extract parameters like:
- amount: Investment amount (in tokens)
- frequency: Investment frequency (daily, weekly, monthly)
- planName: Name for the SIP plan
- planId: ID of an existing plan

Respond in JSON format:
{
  "action": "intent_name",
  "parameters": {
    "param1": "value1",
    ...
  },
  "confidence": 0.95
}`;

      // Build conversation context
      let contextText = systemPrompt + '\n\nConversation history:\n';
      history.slice(-5).forEach((msg: any) => {
        contextText += `${msg.role}: ${msg.content}\n`;
      });
      contextText += `\nUser: ${message}\n\nAnalyze the intent and respond with JSON:`;

      const result = await this.model.generateContent(contextText);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('Intent analyzed:', parsed);
        return parsed;
      }
      
      throw new Error('No valid JSON in response');
    } catch (error: any) {
      console.error('Error analyzing intent:', error);
      return {
        action: 'general',
        parameters: {},
        confidence: 0.5
      };
    }
  }

  /**
   * Generate optimization suggestions
   */
  async generateOptimizationSuggestions(portfolio: any, plans: any[]): Promise<string> {
    try {
      const prompt = `You are a DeFi portfolio optimization expert. Analyze this portfolio and provide optimization suggestions:

Portfolio:
- Total Invested: ${portfolio.totalInvested} tokens
- Total Yield: ${portfolio.totalYield} tokens
- Active Plans: ${portfolio.activePlans}

SIP Plans:
${plans.map((p, i) => `
${i + 1}. ${p.planName}
   - Deposit: ${p.depositAmount} tokens ${this.formatFrequency(p.frequency)}
   - Total Deposited: ${p.totalDeposited} tokens
   - Yield Earned: ${p.totalYieldEarned} tokens
   - Status: ${p.isActive ? 'Active' : 'Paused'}
`).join('\n')}

Provide 3-5 actionable optimization suggestions to maximize returns and minimize risk.
Focus on:
1. Diversification
2. Frequency optimization
3. Amount allocation
4. Risk management
5. Yield maximization

Be specific and practical.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text() || 'Unable to generate suggestions at this time.';
    } catch (error: any) {
      console.error('Error generating optimization suggestions:', error);
      return 'Unable to generate optimization suggestions at this time. Please try again later.';
    }
  }

  /**
   * Generate general response
   */
  async generateResponse(message: string, userAddress: string): Promise<string> {
    try {
      const prompt = `You are a helpful AI assistant for ReactiveSIP, a DeFi platform for automated Systematic Investment Plans (SIP) on Reactive Network.

You help users:
- Create and manage SIP plans
- Monitor their portfolio
- Optimize their investments
- Understand DeFi concepts
- Navigate the platform

Be friendly, concise, and helpful. Use emojis appropriately.
Always encourage smart investing and risk management.

User message: ${message}

Respond helpfully:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text() || 'I apologize, but I couldn\'t process that. Could you rephrase?';
    } catch (error: any) {
      console.error('Error generating response:', error);
      return 'I apologize, but I\'m having trouble responding right now. Please try again.';
    }
  }

  /**
   * Analyze market conditions (placeholder for future implementation)
   */
  async analyzeMarketConditions(): Promise<any> {
    // This would integrate with price feeds, market data APIs, etc.
    return {
      sentiment: 'neutral',
      volatility: 'medium',
      recommendation: 'continue_with_caution'
    };
  }

  /**
   * Generate risk assessment
   */
  async generateRiskAssessment(portfolio: any): Promise<string> {
    try {
      const prompt = `You are a DeFi risk assessment expert. Assess the risk level of this portfolio:

Total Invested: ${portfolio.totalInvested} tokens
Total Yield: ${portfolio.totalYield} tokens
Active Plans: ${portfolio.activePlans}

Provide:
1. Overall risk level (Low/Medium/High)
2. Key risk factors
3. Risk mitigation suggestions

Be concise and actionable.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text() || 'Unable to assess risk at this time.';
    } catch (error: any) {
      console.error('Error generating risk assessment:', error);
      return 'Unable to assess risk at this time. Please try again later.';
    }
  }

  // Helper methods
  private formatFrequency(seconds: number): string {
    if (seconds === 86400) return 'daily';
    if (seconds === 604800) return 'weekly';
    if (seconds === 2592000) return 'monthly';
    if (seconds === 3600) return 'hourly';
    return `every ${seconds} seconds`;
  }
}
