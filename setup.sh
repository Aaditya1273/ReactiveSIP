#!/bin/bash

# ReactiveSIP Setup Script
# This script helps you set up the ReactiveSIP platform

echo "🚀 ReactiveSIP Setup Script"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo -e "${BLUE}Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js >= v18.18${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo -e "${YELLOW}⚠️  Foundry not found. Install from https://getfoundry.sh/${NC}"
else
    echo -e "${GREEN}✅ Foundry found${NC}"
fi

echo ""
echo -e "${BLUE}Installing dependencies...${NC}"

# Install root dependencies
echo -e "${YELLOW}Installing root dependencies...${NC}"
npm install

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd frontend && npm install && cd ..

# Install AI agent dependencies
echo -e "${YELLOW}Installing AI agent dependencies...${NC}"
cd ai-agent && npm install && cd ..

echo ""
echo -e "${GREEN}✅ Dependencies installed successfully!${NC}"
echo ""

# Setup environment files
echo -e "${BLUE}Setting up environment files...${NC}"

if [ ! -f "contract/.env" ]; then
    cp contract/.env.example contract/.env
    echo -e "${GREEN}✅ Created contract/.env${NC}"
    echo -e "${YELLOW}⚠️  Please edit contract/.env with your configuration${NC}"
else
    echo -e "${YELLOW}⚠️  contract/.env already exists${NC}"
fi

if [ ! -f "ai-agent/.env" ]; then
    cp ai-agent/.env.example ai-agent/.env
    echo -e "${GREEN}✅ Created ai-agent/.env${NC}"
    echo -e "${YELLOW}⚠️  Please edit ai-agent/.env with your configuration${NC}"
else
    echo -e "${YELLOW}⚠️  ai-agent/.env already exists${NC}"
fi

if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    echo -e "${GREEN}✅ Created frontend/.env${NC}"
    echo -e "${YELLOW}⚠️  Please edit frontend/.env with your configuration${NC}"
else
    echo -e "${YELLOW}⚠️  frontend/.env already exists${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Edit the .env files with your configuration:"
echo "   - contract/.env (add private key, RPC URL)"
echo "   - ai-agent/.env (add OpenAI API key, private key)"
echo "   - frontend/.env (will be updated after contract deployment)"
echo ""
echo "2. Deploy contracts to Reactive Mainnet:"
echo "   cd contract"
echo "   forge script script/DeploySIP.s.sol:DeploySIP --rpc-url https://mainnet-rpc.rnk.dev/ --broadcast --legacy"
echo ""
echo "3. Update frontend/.env and ai-agent/.env with deployed contract addresses"
echo ""
echo "4. Start the services:"
echo "   Terminal 1: cd ai-agent && npm run dev"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "5. Visit http://localhost:5173/sip to access the SIP Dashboard!"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   - README.md - Project overview"
echo "   - DEPLOYMENT_GUIDE.md - Detailed deployment instructions"
echo "   - README_SIP.md - SIP feature documentation"
echo "   - UPGRADE_SUMMARY.md - What's new in this version"
echo ""
echo -e "${GREEN}Happy building! 🚀${NC}"
