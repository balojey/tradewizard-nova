# TradeWizard

> AI-powered prediction trading platform providing intelligent analysis and trading recommendations for real-world outcomes on Polymarket.

## Overview

TradeWizard transforms prediction markets from speculative guessing into guided, intelligence-driven trading. Our multi-agent AI system analyzes markets from multiple perspectives to provide explainable trade recommendations with clear reasoning, catalysts, and risk scenarios.

## Architecture

```
├── tradewizard-agents/     # Node.js backend with CLI and monitoring service (Primary)
├── tradewizard-frontend/   # Web application (Next.js + React)
├── doa/                    # Python workflow service (Alternative deployment option)
├── docs/                   # Product and technical documentation
└── .kiro/                  # AI assistant configuration and specs
```

### System Components

**🟢 TradeWizard Agents (tradewizard-agents/)** - Primary System
- **Purpose**: Complete AI-powered market analysis system with CLI and monitoring
- **LLM Provider**: Amazon Nova (cost-effective, high-performance models)
- **Features**: Market discovery, scheduled analysis, data persistence
- **Workflow Execution**: Built-in LangGraph workflow with 15+ specialized AI agents
- **Database**: Supabase PostgreSQL for storing analysis results
- **Monitoring**: 24/7 automated market monitoring with configurable intervals

**🎨 Frontend (tradewizard-frontend/)**
- **Modern Web App**: Next.js 16 with App Router and TypeScript
- **Seamless Trading**: Magic Link authentication with Polymarket integration
- **Real-time UI**: Live market data and AI recommendations
- **Professional Analytics**: Bloomberg Terminal-style market intelligence

**🐍 DOA Workflow Service (doa/)** - Alternative Deployment Option
- **Purpose**: Standalone Python service for remote workflow execution
- **LLM Provider**: Digital Ocean's Gradient AI Platform (Llama models)
- **Use Case**: Optional microservice architecture for separating concerns
- **Note**: Not required for standard deployment

### How They Work Together

```
┌─────────────────────────────────────────────────────────────┐
│  tradewizard-agents (Complete System)                       │
│  - Discovers markets                                        │
│  - Executes LangGraph workflow with Amazon Nova             │
│  - Runs 15+ specialized AI agents                           │
│  - Schedules analysis                                       │
│  - Stores results in Supabase                               │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 🚀 Recommended Setup: TradeWizard with Amazon Nova

**Get the full system running in 5 minutes!**

#### Prerequisites

Before starting, you'll need:
- Node.js 18+
- AWS account with Amazon Nova access (Bedrock)
- Supabase account (free tier works)
- AWS credentials configured

#### Step 1: Set Up Database

```bash
# 1. Create a Supabase project at https://supabase.com
# 2. Get your project URL and keys from Settings → API

# 3. Link to your Supabase project
cd tradewizard-agents
npx supabase link --project-ref your-project-ref

# 4. Push database schema
npx supabase db push

# 5. Generate TypeScript types (optional but recommended)
npx supabase gen types typescript --linked > src/database/types.ts
```

#### Step 2: Configure TradeWizard with Amazon Nova

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and set:
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your_access_key
# AWS_SECRET_ACCESS_KEY=your_secret_key
# LLM_SINGLE_PROVIDER=bedrock-nova
# BEDROCK_NOVA_DEFAULT_MODEL=amazon.nova-pro-v1:0
# SUPABASE_URL and SUPABASE_KEY
# NEWSDATA_API_KEY (optional)

# 3. Build the project
npm run build

# 4. Test with a single market analysis
npm run cli -- analyze <polymarket-condition-id>
```

#### Step 3: Start Automated Monitoring

```bash
# Start the monitor service for 24/7 automated analysis
npm run monitor:start

# Check monitor status
npm run monitor:status

# Trigger manual analysis
npm run monitor:trigger

# View health and logs
npm run monitor:health
```

### 🔧 Alternative: Other LLM Providers

TradeWizard supports multiple LLM providers:

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

### 🐍 Alternative: DOA Workflow Service (Microservice Architecture)

For advanced deployments requiring service separation, see [DOA Setup Guide](doa/README.md).

### 🎨 Frontend Setup (Optional)

```bash
cd tradewizard-frontend
npm install
cp .env.example .env.local
# Configure your environment variables
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Key Features

### 🤖 Multi-Agent Analysis
- **Market Intelligence**: Specialized agents analyze news, polling, sentiment, and market dynamics
- **Adversarial Testing**: Cross-examination agents challenge assumptions and identify risks
- **Consensus Engine**: Probability fusion from multiple analytical perspectives

### 📊 Professional Trading Interface
- **AI Recommendations**: Clear buy/sell signals with detailed reasoning
- **Risk Assessment**: Scenario analysis and position sizing guidance
- **Real-time Data**: Live market prices and news integration
- **Portfolio Management**: Track positions and performance analytics

### 🔗 Polymarket Integration
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

### DOA Workflow Service (Optional)
- **Runtime**: Python 3.10+ with type hints
- **AI Framework**: LangGraph for multi-agent workflows
- **LLM Provider**: Digital Ocean Gradient AI (Llama-3.3-70b, Llama-3.1-8b)
- **HTTP Framework**: FastAPI or Flask for service endpoints
- **Testing**: pytest with Hypothesis for property-based testing
- **Use Case**: Microservice architecture for service separation

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

#### DOA Workflow Service (Optional)
```bash
cd doa

# Start service locally
export DIGITALOCEAN_API_TOKEN=your_token
gradient agent run
# Service runs on http://localhost:8080

# Deploy to production
gradient agent deploy

# Test the service
curl --location 'http://localhost:8080/run' \
    --header 'Content-Type: application/json' \
    --data '{"condition_id": "0x1234567890abcdef"}'

# Run tests
pytest
pytest --cov=.  # With coverage

# Code quality
black . --line-length=120
flake8 . --max-line-length=120
```

## Documentation

### Getting Started
- **[TradeWizard Agents (tradewizard-agents/README.md)](tradewizard-agents/README.md)** - Primary system with Amazon Nova
- **[Frontend (tradewizard-frontend/README.md)](tradewizard-frontend/README.md)** - Frontend development guide
- **[DOA Workflow Service (doa/README.md)](doa/README.md)** - Optional Python microservice

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

2. **Microservice Architecture (Advanced)**
   - DOA service handles workflow execution remotely
   - TradeWizard monitor handles scheduling and persistence
   - Separates concerns for complex deployments
   - See [DOA Setup Guide](doa/README.md) for details

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

**Advanced: Remote Workflow Execution via DOA Service**
```bash
# Remote DOA Workflow Service (optional microservice architecture)
WORKFLOW_SERVICE_URL=http://localhost:8080/run
WORKFLOW_SERVICE_TIMEOUT_MS=120000
DIGITALOCEAN_API_TOKEN=your_api_token

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# External APIs
NEWSDATA_API_KEY=your_newsdata_key

# Monitor Configuration
ANALYSIS_INTERVAL_HOURS=24
MAX_MARKETS_PER_CYCLE=3
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

#### DOA Workflow Service (doa/.env) - Optional
```bash
# Digital Ocean Gradient AI (REQUIRED for DOA service)
DIGITALOCEAN_INFERENCE_KEY=your_gradient_model_access_key

# LLM Configuration
LLM_MODEL_NAME=llama-3.3-70b-instruct
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000

# Polymarket Configuration
POLYMARKET_GAMMA_API_URL=https://gamma-api.polymarket.com
POLYMARKET_CLOB_API_URL=https://clob.polymarket.com

# Database (for agent memory system)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ENABLE_PERSISTENCE=true

# Observability (optional)
OPIK_API_KEY=your_opik_api_key
OPIK_PROJECT_NAME=doa-market-analysis
OPIK_WORKSPACE=your_workspace
OPIK_TRACK_COSTS=true

# Agent Configuration
AGENT_TIMEOUT_MS=45000
AGENT_MAX_RETRIES=3
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

### DOA Workflow Service (Optional Microservice)

**Deploy to Digital Ocean Gradient AI Platform:**

```bash
cd doa

# Configure agent name in .gradient/agent.yml
# agent_name: tradewizard-doa-agent

# Deploy to Gradient AI Platform
gradient agent deploy

# The deployment will return an endpoint URL like:
# https://agents.do-ai.run/<DEPLOYED_AGENT_ID>/main/run
```

**Configure TradeWizard to use deployed DOA service:**

```bash
cd tradewizard-agents

# Set WORKFLOW_SERVICE_URL to your deployed DOA service URL
# Example: WORKFLOW_SERVICE_URL=https://agents.do-ai.run/<DEPLOYED_AGENT_ID>/main/run
# Set DIGITALOCEAN_API_TOKEN for authentication

npm run build
npm run monitor:start
```

See [TradeWizard Agents Deployment Guide](tradewizard-agents/docs/DEPLOYMENT.md) and [DOA Deployment Guide](doa/README.md#deployment) for detailed instructions.

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