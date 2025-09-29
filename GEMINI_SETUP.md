# 🤖 Google Gemini API Setup Guide

This guide will help you set up Google Gemini API for the ReactiveSIP AI agent.

## Why Gemini?

Google Gemini is a powerful, cost-effective AI model that provides:
- ✅ **Free tier** with generous limits
- ✅ **Fast response times**
- ✅ **Multimodal capabilities**
- ✅ **Excellent natural language understanding**
- ✅ **Lower costs** compared to other providers

## 📝 Step-by-Step Setup

### 1. Get Your Gemini API Key

1. **Visit Google AI Studio**
   - Go to: https://makersuite.google.com/app/apikey
   - Or: https://aistudio.google.com/app/apikey

2. **Sign in with your Google Account**
   - Use any Google account (Gmail, Workspace, etc.)

3. **Create API Key**
   - Click "Create API Key"
   - Choose "Create API key in new project" or select an existing project
   - Copy the generated API key

4. **Save Your API Key Securely**
   - Store it in a password manager
   - Never commit it to version control
   - Keep it confidential

### 2. Configure Your Environment

1. **Open the AI agent .env file**
   ```bash
   cd ai-agent
   nano .env  # or use your preferred editor
   ```

2. **Add your Gemini API key**
   ```bash
   # AI Configuration (Google Gemini)
   GEMINI_API_KEY=your_actual_api_key_here
   GEMINI_MODEL=gemini-pro
   ```

3. **Save and close the file**

### 3. Verify Installation

1. **Install dependencies** (if not already done)
   ```bash
   cd ai-agent
   npm install
   ```

2. **Test the AI service**
   ```bash
   npm run dev
   ```

3. **Check the logs**
   - You should see: `✅ AI service initialized with Gemini model: gemini-pro`

## 🎯 Available Models

### gemini-pro (Recommended)
- **Best for:** Text generation, chat, analysis
- **Context window:** 32,768 tokens
- **Free tier:** 60 requests per minute
- **Use case:** Perfect for SIP management, portfolio analysis

### gemini-pro-vision
- **Best for:** Image + text understanding
- **Context window:** 16,384 tokens
- **Use case:** Future features with charts/graphs

## 💰 Pricing & Limits

### Free Tier
- **60 requests per minute**
- **1,500 requests per day**
- **1 million tokens per month**
- Perfect for development and testing!

### Paid Tier (if needed)
- **$0.00025 per 1K characters** (input)
- **$0.0005 per 1K characters** (output)
- Much more affordable than alternatives

## 🔧 Configuration Options

### Basic Configuration
```bash
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-pro
```

### Advanced Configuration
```bash
# For higher rate limits (paid tier)
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-pro
GEMINI_TEMPERATURE=0.7  # Creativity level (0-1)
GEMINI_MAX_TOKENS=2048  # Response length
```

## 🧪 Testing Your Setup

### Test 1: Health Check
```bash
curl http://localhost:3001/health
```
Expected: `{"status":"healthy","timestamp":"..."}`

### Test 2: AI Chat
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, can you help me create a SIP?",
    "userAddress": "0x1234567890123456789012345678901234567890"
  }'
```

Expected: AI response with helpful information

### Test 3: Intent Recognition
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a SIP with 100 tokens monthly",
    "userAddress": "0x1234567890123456789012345678901234567890"
  }'
```

Expected: Response indicating SIP creation intent

## 🐛 Troubleshooting

### Error: "API key not valid"
**Solution:**
- Double-check your API key is correct
- Ensure no extra spaces or quotes
- Regenerate the key if needed

### Error: "Cannot find module '@google/generative-ai'"
**Solution:**
```bash
cd ai-agent
npm install @google/generative-ai
```

### Error: "Rate limit exceeded"
**Solution:**
- Wait a minute and try again
- Consider upgrading to paid tier
- Implement request caching

### Error: "Model not found"
**Solution:**
- Use `gemini-pro` (not `gemini-1.0-pro`)
- Check model availability in your region

## 🌍 Regional Availability

Gemini API is available in most countries. If you encounter issues:
1. Check: https://ai.google.dev/available_regions
2. Use a VPN if necessary (for development only)
3. Contact Google AI support

## 🔐 Security Best Practices

### DO ✅
- Store API keys in environment variables
- Use `.env` files (never commit them)
- Rotate keys periodically
- Monitor API usage
- Set up billing alerts

### DON'T ❌
- Hardcode API keys in source code
- Share keys publicly
- Commit `.env` files to Git
- Use production keys in development
- Expose keys in client-side code

## 📊 Monitoring Usage

### Check Your Usage
1. Visit: https://makersuite.google.com/app/apikey
2. Click on your API key
3. View usage statistics

### Set Up Alerts
1. Go to Google Cloud Console
2. Set up billing alerts
3. Monitor daily/monthly usage

## 🚀 Production Deployment

### Environment Variables
```bash
# Production .env
GEMINI_API_KEY=prod_api_key_here
GEMINI_MODEL=gemini-pro
NODE_ENV=production
```

### Rate Limiting
Implement rate limiting in your application:
```typescript
// Example rate limiter
const rateLimit = {
  requests: 0,
  resetTime: Date.now() + 60000,
  max: 60
};
```

### Error Handling
Always handle API errors gracefully:
```typescript
try {
  const response = await model.generateContent(prompt);
  return response.text();
} catch (error) {
  console.error('Gemini API error:', error);
  return fallbackResponse;
}
```

## 📚 Additional Resources

- **Official Documentation:** https://ai.google.dev/docs
- **API Reference:** https://ai.google.dev/api/python/google/generativeai
- **Community Forum:** https://discuss.ai.google.dev/
- **Examples:** https://github.com/google/generative-ai-docs

## 💡 Tips for Best Results

### 1. Craft Clear Prompts
```typescript
// Good prompt
const prompt = `You are a DeFi expert. Analyze this portfolio and provide 3 specific suggestions...`;

// Bad prompt
const prompt = `Help with portfolio`;
```

### 2. Use System Instructions
```typescript
const systemPrompt = `You are an AI assistant for ReactiveSIP...`;
const userPrompt = `Create a SIP with 100 tokens`;
const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}`;
```

### 3. Handle JSON Responses
```typescript
// Extract JSON from response
const jsonMatch = text.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  const data = JSON.parse(jsonMatch[0]);
}
```

### 4. Implement Retries
```typescript
async function callGeminiWithRetry(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

## 🎉 You're Ready!

Your Gemini API is now configured and ready to power the ReactiveSIP AI agent!

**Next Steps:**
1. ✅ API key configured
2. ✅ Dependencies installed
3. ✅ Service tested
4. 🚀 Start building!

---

**Need Help?** Check the [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) or open an issue on GitHub.
