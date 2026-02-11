# Market Intelligence Engine

> Multi-agent system for prediction market analysis using LangGraph and Opik observability

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)

## Overview

The Market Intelligence Engine transforms raw prediction market data from Polymarket into explainable, probability-driven trade recommendations. The system follows a structured debate protocol where specialized AI agents independently analyze markets, construct competing theses, challenge each other's assumptions, and reach consensus on fair probability estimates.

### Core Principles

1. **Adversarial Reasoning** - Multiple agents with different perspectives prevent groupthink and expose weak assumptions
2. **Explainability First** - Every recommendation traces back to specific data signals and agent reasoning
3. **Graceful Degradation** - Partial failures in any component do not crash the entire pipeline

### Key Features

- 🤖 **Multi-Agent Analysis**: Specialized AI agents analyze markets from different perspectives
- 🔄 **Structured Debate Protocol**: Bull and bear theses compete through adversarial testing
- 📊 **Probability-Driven**: Consensus probability estimates with uncertainty quantification
- 🔍 **Full Observability**: Complete tracing and debugging with Opik integration
- 🎯 **Actionable Recommendations**: Clear trade signals with entry/exit zones and risk assessment
- 🛡️ **Robust Error Handling**: Graceful degradation and comprehensive error recovery
- 🔧 **Autonomous News Agents**: AI agents that autonomously fetch and research news data using LangChain tools
- 🧠 **Agent Memory System**: Closed-loop analysis where agents access and build upon their historical outputs

## Architecture

The Market Intelligence Engine is built on **LangGraph**, a framework for building stateful, multi-agent workflows, with **Opik** for comprehensive observability and tracing.

### LangGraph Workflow

```
┌─────────────────┐
│  Polymarket API │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              LANGGRAPH STATE GRAPH WORKFLOW                  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Node: Market Ingestion                               │  │
│  │ - Fetch market data from Polymarket APIs             │  │
│  │ - Transform into Market Briefing Document (MBD)      │  │
│  │ - Update graph state with MBD                        │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Node: Memory Context Retrieval                       │  │
│  │ - Query historical agent signals from database       │  │
│  │ - Retrieve last 3-5 signals per agent for market     │  │
│  │ - Format as structured memory context                │  │
│  │ - Populate memoryContext in graph state              │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Parallel Nodes: Intelligence Agents                  │  │
│  │ ┌────────────────────────────────────────────────┐  │  │
│  │ │ Market Microstructure Agent (GPT-4-turbo)      │  │  │
│  │ │ - Order book analysis, spread, momentum        │  │  │
│  │ │ - Receives own historical signals as context   │  │  │
│  │ └────────────────────────────────────────────────┘  │  │
│  │ ┌────────────────────────────────────────────────┐  │  │
│  │ │ Probability Baseline Agent (Gemini-1.5-flash)  │  │  │
│  │ │ - Naive baseline probability estimate          │  │  │
│  │ │ - Receives own historical signals as context   │  │  │
│  │ └────────────────────────────────────────────────┘  │  │
│  │ ┌────────────────────────────────────────────────┐  │  │
│  │ │ Risk Assessment Agent (Claude-3-sonnet)        │  │  │
│  │ │ - Tail risks and failure modes                 │  │  │
│  │ │ - Receives own historical signals as context   │  │  │
│  │ └────────────────────────────────────────────────┘  │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Node: Thesis Construction                            │  │
│  │ - Generate bull thesis (YES outcome)                 │  │
│  │ - Generate bear thesis (NO outcome)                  │  │
│  │ - Calculate market edge                              │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Node: Cross-Examination                              │  │
│  │ - Evidence test (factual verification)               │  │
│  │ - Causality test (correlation vs causation)          │  │
│  │ - Timing test (catalyst timeline)                    │  │
│  │ - Liquidity test (execution feasibility)             │  │
│  │ - Tail risk test (low-probability scenarios)         │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Node: Consensus Engine                               │  │
│  │ - Calculate weighted consensus probability           │  │
│  │ - Compute confidence bands                           │  │
│  │ - Classify probability regime                        │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Node: Recommendation Generation                      │  │
│  │ - Calculate expected value                           │  │
│  │ - Determine trade direction                          │  │
│  │ - Generate entry/target zones                        │  │
│  │ - Create natural language explanation                │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ Trade Output  │
              └───────────────┘
```

### GraphState Schema

The LangGraph workflow uses a shared state object that flows through all nodes:

```typescript
const GraphState = Annotation.Root({
  // Input
  conditionId: Annotation<string>,
  
  // Market Ingestion Output
  mbd: Annotation<MarketBriefingDocument | null>,
  ingestionError: Annotation<IngestionError | null>,
  
  // Memory Context (Agent Memory System)
  memoryContext: Annotation<Map<string, AgentMemoryContext>>,
  
  // Agent Signals Output
  agentSignals: Annotation<AgentSignal[]>,
  agentErrors: Annotation<AgentError[]>,
  
  // Thesis Construction Output
  bullThesis: Annotation<Thesis | null>,
  bearThesis: Annotation<Thesis | null>,
  
  // Cross-Examination Output
  debateRecord: Annotation<DebateRecord | null>,
  
  // Consensus Output
  consensus: Annotation<ConsensusProbability | null>,
  consensusError: Annotation<RecommendationError | null>,
  
  // Final Recommendation
  recommendation: Annotation<TradeRecommendation | null>,
  
  // Audit Trail
  auditLog: Annotation<AuditEntry[]>
});
```

### Data Flow

```
Polymarket APIs
      ↓
MarketBriefingDocument (MBD)
      ↓
AgentSignal[] (parallel execution)
      ↓
{bull: Thesis, bear: Thesis}
      ↓
DebateRecord (cross-examination)
      ↓
ConsensusProbability
      ↓
TradeRecommendation
```

## Quick Start

### Prerequisites

- **Node.js 18+** and npm/yarn
- **API Keys** for at least one LLM provider:
  - OpenAI (GPT-4) - Recommended for multi-provider mode
  - Anthropic (Claude) - Optional for multi-provider mode
  - Google (Gemini) - Optional for multi-provider mode
  - Amazon Nova (AWS Bedrock) - Optional, ultra-low cost option
- **Opik API Key** (optional, for observability)

### Installation

1. **Clone and install dependencies:**

```bash
cd tradewizard-agents
npm install
```

2. **Configure environment variables:**

```bash
cp .env.example .env
```

Edit `.env` with your API keys. See [Configuration](#configuration) for details.

3. **Build the project:**

```bash
npm run build
```

4. **Run your first analysis:**

```bash
npm run cli -- analyze <polymarket-condition-id>
```

### Example Usage

```bash
# Basic analysis
npm run cli -- analyze 0x1234567890abcdef

# With debug information
npm run cli -- analyze 0x1234567890abcdef --debug

# Budget-friendly single-provider mode
npm run cli -- analyze 0x1234567890abcdef --single-provider openai --model gpt-4o-mini

# With visualization and cost tracking
npm run cli -- analyze 0x1234567890abcdef --visualize --show-costs --opik-trace
```

## Configuration

The Market Intelligence Engine supports flexible configuration through environment variables. See `.env.example` for all options.

### LLM Configuration Modes

The engine supports two LLM configuration modes:

#### 1. Multi-Provider Mode (Default - Optimal Quality)

Uses different LLMs for different agents to get diverse perspectives:

```bash
# .env
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-4-turbo

ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_DEFAULT_MODEL=claude-3-sonnet-20240229

GOOGLE_API_KEY=...
GOOGLE_DEFAULT_MODEL=gemini-1.5-flash

# Optional: Amazon Nova (AWS Bedrock)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
NOVA_MODEL_NAME=amazon.nova-lite-v1:0
```

**Agent-LLM Mapping:**
- Market Microstructure Agent → GPT-4-turbo (OpenAI)
- Probability Baseline Agent → Gemini-2.5-flash (Google)
- Risk Assessment Agent → Claude-3-sonnet (Anthropic)

**Alternative with Nova (Cost-Optimized):**
- Market Microstructure Agent → Nova Pro (Amazon)
- Probability Baseline Agent → Nova Lite (Amazon)
- Risk Assessment Agent → Nova Lite (Amazon)

**Pros:**
- ✅ Diverse perspectives reduce model-specific biases
- ✅ Better quality recommendations
- ✅ Each agent uses the LLM best suited for its task

**Cons:**
- ❌ Higher cost
- ❌ Requires API keys for multiple providers

#### 2. Single-Provider Mode (Budget-Friendly)

Uses one LLM for all agents with different system prompts:

```bash
# .env
LLM_SINGLE_PROVIDER=google
OPENAI_API_KEY=AI...
OPENAI_DEFAULT_MODEL=gemini-2.5-flash
```

**Pros:**
- ✅ Lower cost
- ✅ Simpler API key management
- ✅ Still maintains agent specialization through prompts

**Cons:**
- ❌ Less diverse perspectives
- ❌ Potential for model-specific biases

**Supported Providers:**
- `openai` - Use OpenAI models (gpt-4-turbo, gpt-4o-mini, etc.)
- `anthropic` - Use Anthropic models (claude-3-sonnet, claude-3-haiku, etc.)
- `google` - Use Google models (gemini-1.5-pro, gemini-1.5-flash, etc.)
- `nova` - Use Amazon Nova models (amazon.nova-micro-v1:0, amazon.nova-lite-v1:0, amazon.nova-pro-v1:0)

**Cost Comparison (per 100 analyses):**
- Multi-provider (premium): $10-15
- Multi-provider (Nova-optimized): $0.80-2
- Single-provider (OpenAI gpt-4o-mini): $1-2
- Single-provider (Google Gemini): $0.60-1
- Single-provider (Nova Lite): $0.20-0.40
- Single-provider (Nova Micro): $0.10-0.20 (cheapest)

**For detailed setup instructions for all providers, see [LLM Provider Setup Guide](./docs/LLM_PROVIDERS.md)**

### Opik Configuration

Opik provides LLM tracing, debugging, and cost tracking. Supports both cloud and self-hosted deployments.

#### Cloud Opik (Recommended)

```bash
# .env
OPIK_API_KEY=your_opik_api_key_here
OPIK_PROJECT_NAME=market-intelligence-engine
OPIK_WORKSPACE=default
OPIK_TRACK_COSTS=true
```

Sign up at [https://www.comet.com/opik](https://www.comet.com/opik)

#### Self-Hosted Opik

```bash
# .env
OPIK_BASE_URL=http://localhost:5000
OPIK_PROJECT_NAME=market-intelligence-engine
OPIK_TRACK_COSTS=true
```

See [Opik Setup Guide](#opik-setup-guide) for installation instructions.

### LangGraph Configuration

```bash
# .env
LANGGRAPH_CHECKPOINTER=memory      # Options: memory, sqlite, postgres
LANGGRAPH_RECURSION_LIMIT=25       # Maximum graph execution depth
LANGGRAPH_STREAM_MODE=values       # Options: values, updates
```

**Checkpointer Options:**
- `memory` - In-memory (development, no persistence)
- `sqlite` - File-based persistence (production)
- `postgres` - Database persistence (production, requires DB setup)

### Agent Configuration

```bash
# .env
AGENT_TIMEOUT_MS=10000           # Maximum time per agent in milliseconds
MIN_AGENTS_REQUIRED=2            # Minimum agents needed for consensus
```

### NewsData Configuration

The autonomous news agents require a NewsData.io API key to fetch news data:

```bash
# .env
NEWSDATA_API_KEY=your_newsdata_api_key_here

# Optional: Enable autonomous mode for news agents
BREAKING_NEWS_AGENT_AUTONOMOUS=true
MEDIA_SENTIMENT_AGENT_AUTONOMOUS=true
MARKET_MICROSTRUCTURE_AGENT_AUTONOMOUS=true

# Optional: Configure tool usage limits
BREAKING_NEWS_AGENT_MAX_TOOL_CALLS=5
BREAKING_NEWS_AGENT_TIMEOUT=45000
```

**Get a NewsData API key:**
1. Sign up at [https://newsdata.io](https://newsdata.io)
2. Copy your API key from the dashboard
3. Add it to your `.env` file

**Autonomous Mode:**
- When `autonomous=true`, agents can fetch news data using LangChain tools
- When `autonomous=false`, agents use pre-fetched data from workflow state
- Default is `false` for backward compatibility

See [Autonomous News Agents Documentation](./docs/AUTONOMOUS_NEWS_AGENTS.md) for complete configuration options.

### Agent Memory System Configuration

The Agent Memory System enables closed-loop analysis where agents access and build upon their historical outputs:

```bash
# .env
# Enable/disable memory system
MEMORY_SYSTEM_ENABLED=true

# Maximum historical signals per agent (default: 3)
MEMORY_MAX_SIGNALS_PER_AGENT=3

# Query timeout in milliseconds (default: 5000)
MEMORY_QUERY_TIMEOUT_MS=5000

# Retry attempts for rate limits (default: 3)
MEMORY_RETRY_ATTEMPTS=3
```

**How it works:**
- Before each analysis, agents retrieve their previous 3-5 signals for the same market
- Historical signals are formatted as structured memory context in agent prompts
- Agents reference previous analysis and explain changes in reasoning
- System tracks evolution of agent analysis over time (direction changes, probability shifts, confidence changes)

**Benefits:**
- ✅ More consistent analysis across time periods
- ✅ Agents can explain changes in their reasoning
- ✅ Better tracking of evolving market conditions
- ✅ Improved analysis quality through continuity

**Error Handling:**
- If memory retrieval fails, agents continue with empty memory context (graceful degradation)
- All errors are logged for debugging
- Retry logic with exponential backoff for rate limits

See [Agent Memory System Documentation](./src/database/MEMORY_SYSTEM_CONFIG.md) for complete details.

**Quick Start**: See [Memory System Quick Start Guide](./docs/MEMORY_SYSTEM_QUICK_START.md) for 5-minute setup.

### Human-Readable Timestamp Formatting

The system automatically converts ISO 8601 timestamps to natural language format when presenting data to LLM agents, improving temporal comprehension:

```bash
# .env
# Enable/disable human-readable timestamps (default: true)
ENABLE_HUMAN_READABLE_TIMESTAMPS=true

# Timezone for absolute time formatting (default: America/New_York)
TIMESTAMP_TIMEZONE=America/New_York

# Threshold for relative vs absolute format in days (default: 7)
RELATIVE_TIME_THRESHOLD_DAYS=7
```

**Format Examples:**
- Recent timestamps: "just now", "5 minutes ago", "2 hours ago", "3 days ago"
- Older timestamps: "January 15, 2024 at 3:30 PM EST"
- Automatic DST handling: EST/EDT based on date

**How it works:**
- Timestamps < 7 days old: Relative format ("2 hours ago")
- Timestamps >= 7 days old: Absolute format ("January 15, 2024 at 3:30 PM EST")
- All timestamps in agent prompts are automatically formatted
- Original ISO 8601 timestamps remain unchanged in state and database

**Benefits:**
- ✅ Improved agent understanding of temporal relationships
- ✅ Reduced cognitive load on LLM agents
- ✅ Better analysis quality through clearer time context
- ✅ Zero impact on existing data structures
- ✅ Backward compatible with feature flag support

**Runtime Configuration:**
```typescript
import { setConfig } from './utils/timestamp-formatter.js';

// Disable formatting globally
setConfig({ enabled: false });

// Change timezone
setConfig({ timezone: 'America/Los_Angeles' });

// Adjust threshold
setConfig({ relativeThresholdDays: 14 });
```

See [Timestamp Formatting Documentation](./docs/TIMESTAMP_FORMATTING.md) for complete API reference and examples.

### Consensus Configuration

```bash
# .env
MIN_EDGE_THRESHOLD=0.05                # Minimum edge to recommend trade (5%)
HIGH_DISAGREEMENT_THRESHOLD=0.15       # Disagreement index threshold (15%)
```

## Usage

### CLI Interface

The CLI provides a command-line interface for analyzing markets. See [CLI.md](./CLI.md) for complete documentation.

**Basic Commands:**

```bash
# Analyze a market
npm run cli -- analyze <conditionId> [options]

# Query historical traces
npm run cli -- history <conditionId>

# Inspect checkpoint state
npm run cli -- checkpoint <conditionId>
```

**Common Options:**

- `--debug` - Show debug information and graph state
- `--visualize` - Generate LangGraph workflow visualization
- `--opik-trace` - Display Opik trace URL
- `--single-provider <provider>` - Use single LLM provider
- `--model <model>` - Override default model
- `--show-costs` - Display LLM cost tracking

### Programmatic Usage

```typescript
import { analyzeMarket } from './src/workflow';

// Analyze a market
const result = await analyzeMarket('0x1234567890abcdef');

console.log('Action:', result.recommendation.action);
console.log('Expected Value:', result.recommendation.expectedValue);
console.log('Explanation:', result.recommendation.explanation.summary);
```

### Example Output

```
═══════════════════════════════════════════════════════════════
TRADE RECOMMENDATION
═══════════════════════════════════════════════════════════════

Action: LONG_YES
Expected Value: $12.50 per $100 invested
Win Probability: 62%
Entry Zone: $0.48 - $0.52
Target Zone: $0.60 - $0.65
Liquidity Risk: Low

───────────────────────────────────────────────────────────────
EXPLANATION
───────────────────────────────────────────────────────────────

Summary: Market is underpricing the probability of this outcome
based on strong fundamental catalysts and favorable risk/reward.

Core Thesis: Three major catalysts converge in Q2 2024, creating
a high-probability path to YES resolution.

Key Catalysts:
• Policy announcement expected March 15, 2024
• Historical precedent shows 75% success rate in similar scenarios
• Market sentiment shifting based on recent polling data

Failure Scenarios:
• Unexpected regulatory intervention
• External economic shock disrupting timeline
• Key stakeholder opposition emerges

───────────────────────────────────────────────────────────────
METADATA
───────────────────────────────────────────────────────────────

Market Probability: 50%
Consensus Probability: 62%
Edge: 12%
Confidence Band: [58%, 66%]
```

## Development

### Project Structure

```
tradewizard-agents/
├── src/
│   ├── nodes/              # LangGraph node implementations
│   │   ├── market-ingestion.ts
│   │   ├── agents.ts       # Intelligence agent nodes
│   │   ├── thesis-construction.ts
│   │   ├── cross-examination.ts
│   │   ├── consensus-engine.ts
│   │   └── recommendation-generation.ts
│   ├── models/             # Data models and types
│   │   ├── types.ts        # TypeScript interfaces
│   │   ├── schemas.ts      # Zod schemas
│   │   └── state.ts        # LangGraph state definition
│   ├── utils/              # Utility functions
│   │   ├── polymarket-client.ts
│   │   └── audit-logger.ts
│   ├── config/             # Configuration management
│   │   └── index.ts
│   ├── schemas/            # Additional Zod schemas
│   ├── workflow.ts         # LangGraph workflow definition
│   ├── cli.ts              # CLI interface
│   └── index.ts            # Entry point
├── dist/                   # Compiled JavaScript
├── docs/                   # Additional documentation
├── .env.example            # Environment variable template
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Build

```bash
npm run build
```

Compiles TypeScript to JavaScript in the `dist/` directory.

### Development Mode

```bash
npm run dev
```

Runs the application with hot-reload using `tsx watch`.

### Code Quality

```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check
```

## Testing

The project uses a dual testing approach:

### Unit Tests

Test specific examples, edge cases, and integration points:

```bash
npm test
```

Run specific test files:

```bash
npm test -- market-ingestion.test.ts
npm test -- agents.test.ts
```

### Property-Based Tests

Verify universal properties across randomly generated inputs using fast-check:

```bash
npm test -- *.property.test.ts
```

Property tests validate correctness properties like:
- Market data retrieval completeness
- Agent signal structure validity
- Consensus probability structure
- Trade recommendation validity
- Audit trail completeness

### Integration Tests

Test end-to-end workflows with real API calls:

```bash
npm test -- workflow.integration.test.ts
```

**Note:** Integration tests require valid API keys in `.env`.

### Test Coverage

```bash
npm test -- --coverage
```

**Coverage Goals:**
- Unit test coverage: >80% of code paths
- Property test coverage: 100% of correctness properties
- Integration test coverage: All external API interactions

### End-to-End Testing

For the Automated Market Monitor service, comprehensive E2E testing is available:

```bash
# Run E2E test suite once
npm run test:e2e

# Run continuous 48-hour monitoring
npm run test:e2e:continuous
```

**E2E Testing Documentation:**
- **Quick Start**: `docs/E2E_QUICK_START.md` - 15-minute setup and testing
- **Full Guide**: `docs/E2E_TESTING_GUIDE.md` - Comprehensive 13-test guide
- **Deployment Checklist**: `docs/E2E_DEPLOYMENT_CHECKLIST.md` - Complete deployment checklist
- **Test Summary**: `docs/E2E_TEST_SUMMARY.md` - Overview of E2E testing implementation

The E2E tests verify:
- ✅ Market discovery and analysis
- ✅ Scheduled execution
- ✅ Data persistence in Supabase
- ✅ API quota management
- ✅ Graceful shutdown and restart
- ✅ Health check accuracy
- ✅ Manual triggers
- ✅ Error recovery
- ✅ 48-hour continuous operation

## Deployment

### Node.js Deployment

#### Prerequisites

- Node.js 18+ runtime
- Environment variables configured
- API keys for LLM providers
- (Optional) Opik API key for observability

#### Deployment Steps

1. **Build the application:**

```bash
npm run build
```

2. **Set environment variables:**

```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_API_KEY=...
export OPIK_API_KEY=...
# ... other variables
```

Or use a `.env` file (recommended for production).

3. **Run the application:**

```bash
npm start
```

Or use a process manager like PM2:

```bash
npm install -g pm2
pm2 start dist/index.js --name market-intelligence-engine
```

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t market-intelligence-engine .
docker run -d \
  --env-file .env \
  --name market-intelligence-engine \
  market-intelligence-engine
```

### Environment-Specific Configuration

#### Development

```bash
# .env.development
LOG_LEVEL=debug
LANGGRAPH_CHECKPOINTER=memory
LLM_SINGLE_PROVIDER=openai
OPENAI_DEFAULT_MODEL=gpt-4o-mini
```

#### Production

```bash
# .env.production
LOG_LEVEL=info
LANGGRAPH_CHECKPOINTER=sqlite
AUDIT_TRAIL_RETENTION_DAYS=90
OPIK_TRACK_COSTS=true
```

### Monitoring and Observability

#### Opik Dashboard

Access your Opik dashboard to monitor:
- LLM call traces
- Cost tracking
- Error rates
- Performance metrics
- Graph visualizations

#### Health Checks

The application exposes health check endpoints (if configured):

```bash
curl http://localhost:3000/health
```

#### Logging

Structured logs are written to stdout/stderr. Configure log aggregation:

```bash
# Example with Docker
docker logs -f market-intelligence-engine
```

## Troubleshooting

### Common Issues

#### "No API keys configured"

**Problem:** Missing or invalid LLM provider API keys.

**Solution:**
1. Check `.env` file exists and is properly formatted
2. Verify at least one LLM provider API key is set
3. For single-provider mode, ensure the specified provider has an API key
4. Restart the application after updating `.env`

#### "Market analysis failed"

**Problem:** Unable to fetch market data or analysis failed.

**Solutions:**
- Verify the condition ID is valid (check Polymarket)
- Ensure Polymarket API is accessible (check network)
- Check API rate limits (wait and retry)
- Review error logs for specific failure reason

#### "Configuration invalid"

**Problem:** Invalid configuration values.

**Solutions:**
- Verify `.env` file is properly formatted (no quotes around values)
- Ensure required fields are present
- Check that single-provider configuration matches available API keys
- Validate numeric values are within acceptable ranges

#### Tests timing out

**Problem:** Tests exceed timeout limits.

**Solutions:**
- Increase timeout in `vitest.config.ts`
- Check network connectivity
- Verify API keys are valid
- Use mocked tests for faster execution

#### LangGraph recursion limit exceeded

**Problem:** Graph execution exceeds maximum depth.

**Solutions:**
- Increase `LANGGRAPH_RECURSION_LIMIT` in `.env`
- Check for infinite loops in node logic
- Review conditional edges for proper termination

#### Opik traces not appearing

**Problem:** Traces not showing up in Opik dashboard.

**Solutions:**
- Verify `OPIK_API_KEY` is correct
- Check `OPIK_PROJECT_NAME` matches your project
- Ensure network connectivity to Opik servers
- Review Opik configuration in `.env`
- Check application logs for Opik errors

#### Memory system not working

**Problem:** Agents not receiving historical context or memory retrieval failing.

**Solutions:**
- Verify `MEMORY_SYSTEM_ENABLED=true` in `.env`
- Check database connection: `npm run cli -- checkpoint <conditionId>`
- Verify historical signals exist in database:
  ```sql
  SELECT COUNT(*) FROM agent_signals WHERE market_id = 'your-market-id';
  ```
- Check audit logs for memory retrieval errors
- Ensure database indexes exist:
  ```sql
  SELECT indexname FROM pg_indexes WHERE tablename = 'agent_signals';
  ```
- Increase timeout if needed: `MEMORY_QUERY_TIMEOUT_MS=10000`
- See [Memory System Troubleshooting](./src/database/MEMORY_SYSTEM_CONFIG.md#troubleshooting) for detailed guide

### LangGraph Debugging

#### Using LangGraph Studio

LangGraph Studio provides visual debugging of your workflow:

1. **Install LangGraph Studio:**

```bash
npm install -g @langchain/langgraph-studio
```

2. **Start the studio:**

```bash
langgraph-studio
```

3. **Load your workflow:**

Point the studio to your `workflow.ts` file.

4. **Debug features:**
- Visual graph representation
- Step-by-step execution
- State inspection at each node
- Breakpoints and conditional execution

#### Inspecting Graph State

Use the CLI to inspect checkpoint state:

```bash
npm run cli -- checkpoint <conditionId> --debug
```

This shows the complete graph state at each checkpoint.

#### Enabling Debug Logging

```bash
# .env
LOG_LEVEL=debug
```

This enables verbose logging of all graph operations.

### Opik Debugging

#### Viewing Traces

1. **Access Opik dashboard:**
   - Cloud: https://www.comet.com/opik
   - Self-hosted: Your configured `OPIK_BASE_URL`

2. **Find your trace:**
   - Navigate to your project
   - Search by market ID (condition ID)
   - Filter by date/time

3. **Inspect trace details:**
   - View complete execution timeline
   - Inspect LLM inputs/outputs
   - Check token usage and costs
   - Review error messages

#### Querying Traces Programmatically

```typescript
import { OpikClient } from 'opik';

const client = new OpikClient({
  apiKey: process.env.OPIK_API_KEY
});

// Get traces for a market
const traces = await client.getTraces({
  projectName: 'market-intelligence-engine',
  filter: { threadId: '0x1234567890abcdef' }
});
```

#### Cost Analysis

View cost breakdown in Opik:
- Per-agent costs
- Per-node costs
- Total execution cost
- Cost trends over time

## Documentation

### Additional Resources

- **[CLI Documentation](./CLI.md)** - Complete CLI reference
- **[Autonomous News Agents](./docs/AUTONOMOUS_NEWS_AGENTS.md)** - Autonomous news intelligence agents with tool-calling capabilities
- **[Agent Memory System](./src/database/MEMORY_SYSTEM_CONFIG.md)** - Closed-loop analysis with historical context
- **[Memory System Quick Start](./docs/MEMORY_SYSTEM_QUICK_START.md)** - 5-minute setup guide
- **[Memory System Examples](./docs/MEMORY_SYSTEM_EXAMPLES.md)** - Practical usage examples and code samples
- **[Timestamp Formatting](./docs/TIMESTAMP_FORMATTING.md)** - Human-readable timestamp formatting for AI agents
- **[LLM Provider Setup Guide](./docs/LLM_PROVIDERS.md)** - Setup instructions for OpenAI, Anthropic, Google, and Amazon Nova
- **[Nova Troubleshooting Guide](./docs/NOVA_TROUBLESHOOTING.md)** - Amazon Nova integration troubleshooting
- **[Database Module](./src/database/README.md)** - Supabase PostgreSQL integration
- **[Direct Market Discovery Migration](./docs/DIRECT_MARKET_DISCOVERY_MIGRATION.md)** - Migration guide for direct market fetching
- **[Design Document](./.kiro/specs/market-intelligence-engine/design.md)** - System architecture and design decisions
- **[Requirements Document](./.kiro/specs/market-intelligence-engine/requirements.md)** - Functional requirements
- **[Tasks Document](./.kiro/specs/market-intelligence-engine/tasks.md)** - Implementation plan

### External Documentation

- **[LangGraph Documentation](https://langchain-ai.github.io/langgraph/)** - LangGraph framework
- **[Opik Documentation](https://www.comet.com/docs/opik/)** - Opik observability platform
- **[Polymarket API](https://docs.polymarket.com/)** - Polymarket API reference
- **[fast-check Documentation](https://fast-check.dev/)** - Property-based testing library

### API Reference

See inline TypeScript documentation in source files for detailed API reference.

## License

ISC

---

**Built with ❤️ using LangGraph and Opik**
