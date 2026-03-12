# TradeWizard

> AI-powered prediction trading platform providing intelligent analysis and trading recommendations for real-world outcomes on Polymarket.

## What is TradeWizard?

TradeWizard transforms prediction markets from speculative guessing into guided, intelligence-driven trading. Our multi-agent AI system analyzes markets from multiple perspectives to provide explainable trade recommendations with clear reasoning, catalysts, and risk scenarios.

## Repository Structure

```
├── tradewizard-agents/     # Backend: AI analysis engine with CLI & monitoring
├── tradewizard-frontend/   # Frontend: Next.js web application
├── docs/                   # Product and technical documentation
└── .kiro/                  # AI assistant configuration and specs
```

## System Components

### Backend: TradeWizard Agents (Primary System)
- **Complete AI Analysis Engine**: Market discovery, analysis, and scheduling
- **LLM Provider**: Amazon Nova (Bedrock) - cost-effective, high-performance
- **Workflow**: LangGraph with 15+ specialized AI agents
- **Database**: Supabase PostgreSQL for results persistence
- **Monitoring**: 24/7 automated analysis with configurable intervals
- **CLI**: Command-line interface for manual analysis and debugging

### Frontend: Web Application
- **Framework**: Next.js 16 with App Router
- **Authentication**: Magic Link for seamless wallet connection
- **Features**: Live market data, AI recommendations, portfolio management
- **Analytics**: Bloomberg Terminal-style market intelligence

## Quick Start

### Prerequisites

- Node.js 18+
- AWS account with Amazon Nova access (Bedrock)
- Supabase account (free tier works)
- AWS credentials configured locally

### 1. Set Up Database

```bash
cd tradewizard-agents

# Link to Supabase project
npx supabase link --project-ref your-project-ref

# Push database schema
npx supabase db push

# Generate TypeScript types (optional)
npx supabase gen types typescript --linked > src/database/types.ts
```

### 2. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit .env with your credentials:
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
LLM_SINGLE_PROVIDER=bedrock-nova
BEDROCK_NOVA_DEFAULT_MODEL=amazon.nova-pro-v1:0
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### 3. Install & Build

```bash
npm install
npm run build
```

### 4. Test & Run

```bash
# Test with a single market analysis
npm run cli -- analyze <polymarket-condition-id>

# Start automated monitoring (24/7)
npm run monitor:start

# Check monitor status
npm run monitor:status
```

### Using Alternative LLM Providers

TradeWizard supports OpenAI, Anthropic, and Google:

```bash
# OpenAI (GPT-4)
LLM_SINGLE_PROVIDER=openai
OPENAI_API_KEY=your_key
OPENAI_DEFAULT_MODEL=gpt-4o

# Anthropic (Claude)
LLM_SINGLE_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key
ANTHROPIC_DEFAULT_MODEL=claude-3-5-sonnet-20241022

# Google (Gemini)
LLM_SINGLE_PROVIDER=google
GOOGLE_API_KEY=your_key
GOOGLE_DEFAULT_MODEL=gemini-2.0-flash-exp
```

### Frontend Setup (Optional)

```bash
cd tradewizard-frontend
npm install
cp .env.example .env.local
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Key Features

### Multi-Agent AI Analysis
- **Market Intelligence**: Specialized agents analyze news, polling, sentiment, and market dynamics
- **Adversarial Testing**: Cross-examination agents challenge assumptions and identify risks
- **Consensus Engine**: Probability fusion from multiple analytical perspectives

### Professional Trading Interface
- **AI Recommendations**: Clear buy/sell signals with detailed reasoning
- **Risk Assessment**: Scenario analysis and position sizing guidance
- **Real-time Data**: Live market prices and news integration
- **Portfolio Management**: Track positions and performance analytics

### Polymarket Integration
- **Direct Trading**: Execute trades through regulated prediction market infrastructure
- **Market Discovery**: Browse and analyze thousands of real-world outcome markets
- **Wallet Integration**: Seamless authentication via Magic Link

## Technology Stack

### TradeWizard Agents (Monitor & CLI) - Primary System
- **Runtime**: Node.js 18+ with TypeScript
- **AI Framework**: LangGraph for multi-agent workflows
- **LLM Provider**: Amazon Nova (Bedrock) - cost-effective, high-performance
- **Alternative Providers**: OpenAI, Anthropic, Google
- **Features**: Market discovery, scheduling, data persistence
- **Database**: Supabase (PostgreSQL)
- **Testing**: Vitest with property-based testing (fast-check)

### Frontend
- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS 4
- **State Management**: React Query (@tanstack/react-query)
- **Authentication**: Magic Link SDK
- **Blockchain**: ethers.js v5 and viem

## Development

### Common Commands

#### TradeWizard Agents (Monitor & CLI) - Primary System
```bash
cd tradewizard-agents

# Monitor service
npm run monitor:start    # Start monitoring
npm run monitor:stop     # Stop monitoring
npm run monitor:status   # Check status
npm run monitor:trigger  # Manual trigger

# CLI commands
npm run cli -- analyze <condition-id>
npm run cli -- history <condition-id>

# Testing
npm test                 # Run all tests
npm run test:e2e         # E2E tests
```

#### Frontend
```bash
cd tradewizard-frontend

npm run dev    # Start dev server
npm run build  # Build for production
npm run lint   # ESLint checking
```

## Documentation

### Getting Started
- **[TradeWizard Agents (tradewizard-agents/README.md)](tradewizard-agents/README.md)** - Primary system with Amazon Nova
- **[Frontend (tradewizard-frontend/README.md)](tradewizard-frontend/README.md)** - Frontend development guide

### Product Documentation
- [Product Overview](docs/TradeWizard.md) - Detailed product specification
- [AI Debate Protocol](docs/TradeWizard%20Debate%20Protocol.md) - Multi-agent system design
- [Technical Architecture](docs/Trade%20Wizard%20—%20Market%20Debate%20League%20(agent%20System%20Specification).md) - System specification

### Architecture Overview

**Recommended Architecture:**

TradeWizard Agents with Amazon Nova provides a complete, integrated solution:
- Built-in LangGraph workflow execution
- Cost-effective Amazon Nova models (Bedrock)
- Integrated monitoring and scheduling
- Direct database persistence
- Simple deployment and maintenance

**Alternative Architectures:**

1. **Multi-Provider Setup**
   - Use OpenAI, Anthropic, or Google instead of Amazon Nova
   - Same integrated architecture
   - Configure via LLM_SINGLE_PROVIDER environment variable

## Configuration

### Environment Variables

#### TradeWizard Agents (tradewizard-agents/.env) - Primary Configuration

**Recommended: Amazon Nova (Bedrock)**
```bash
# AWS Bedrock Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# LLM Configuration
LLM_SINGLE_PROVIDER=bedrock-nova
BEDROCK_NOVA_DEFAULT_MODEL=amazon.nova-pro-v1:0
# Alternative models: amazon.nova-lite-v1:0, amazon.nova-micro-v1:0

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# External APIs
NEWSDATA_API_KEY=your_newsdata_key

# Monitor Configuration
ANALYSIS_INTERVAL_HOURS=24
MAX_MARKETS_PER_CYCLE=3

# Observability (optional)
OPIK_API_KEY=your_opik_api_key
OPIK_PROJECT_NAME=tradewizard-analysis
```

**Alternative: Other LLM Providers**
```bash
# OpenAI
LLM_SINGLE_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
OPENAI_DEFAULT_MODEL=gpt-4o

# Anthropic
LLM_SINGLE_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_DEFAULT_MODEL=claude-3-5-sonnet-20241022

# Google
LLM_SINGLE_PROVIDER=google
GOOGLE_API_KEY=your_google_key
GOOGLE_DEFAULT_MODEL=gemini-2.0-flash-exp

# Database and other settings remain the same
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
NEWSDATA_API_KEY=your_newsdata_key
```

#### Frontend (.env.local)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Magic Link
NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=your_magic_key

# Polymarket
NEXT_PUBLIC_POLYMARKET_API_URL=https://clob.polymarket.com
```

## Deployment

### Recommended Architecture

```
Production Setup:
1. TradeWizard Agents → AWS EC2, Digital Ocean Droplet, or Docker
2. Frontend → Vercel
3. Database → Supabase (managed PostgreSQL)
4. LLM Provider → Amazon Nova (Bedrock)
```

### TradeWizard Agents (Primary System)

**Deploy with Amazon Nova:**

```bash
cd tradewizard-agents

# Configure environment for production
cp .env.example .env.production
# Set AWS credentials and Amazon Nova configuration
# AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
# LLM_SINGLE_PROVIDER=bedrock-nova
# BEDROCK_NOVA_DEFAULT_MODEL=amazon.nova-pro-v1:0

# Build the project
npm run build

# Start monitor service
npm run monitor:start

# Or use PM2 for process management
pm2 start dist/cli-monitor.js --name tradewizard-monitor
pm2 save
pm2 startup
```

**Docker Deployment:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["npm", "run", "monitor:start"]
```

### Frontend
- **Recommended**: Deploy to Vercel (automatic Next.js optimization)
- **Alternative**: Docker with nginx

See [TradeWizard Agents Deployment Guide](tradewizard-agents/docs/DEPLOYMENT.md) for detailed instructions.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality
- TypeScript strict mode with no `any` types
- ESLint + Prettier for consistent formatting
- Property-based testing for correctness properties
- Comprehensive test coverage requirements

## License

This project is proprietary software. All rights reserved.

## Support

- 📧 Email: support@tradewizard.ai
- 📖 Documentation: [docs/](docs/)
- 🐛 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions

---

**Disclaimer**: TradeWizard provides AI-generated analysis for educational and informational purposes. All trading involves risk. Past performance does not guarantee future results. Please trade responsibly.