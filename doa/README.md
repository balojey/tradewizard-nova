# TradeWizard DOA - Multi-Agent Prediction Market Analysis

A Python-based multi-agent system for analyzing prediction markets on Polymarket using specialized AI agents. Built with LangGraph and Digital Ocean's Gradient AI Platform, this system replicates TradeWizard's market intelligence capabilities within the DOA (Digital Ocean Agents) framework.

## Overview

TradeWizard DOA transforms prediction market analysis from speculative guessing into data-driven intelligence by orchestrating specialized AI agents that examine markets from multiple perspectives: market microstructure, probability baseline, risk assessment, news analysis, polling data, sentiment, price action, and event scenarios.

### Key Features

- **Multi-Agent Intelligence**: 13 specialized agents analyze markets from different perspectives
- **Parallel Execution**: Agents run concurrently using LangGraph's Send API for fast analysis
- **Debate Protocol**: Bull and bear theses are constructed and cross-examined adversarially
- **Consensus Engine**: Unified probability estimates with confidence bands and disagreement metrics
- **Memory System**: Historical context from past analyses informs agent decisions
- **Trade Recommendations**: Actionable signals with entry/target zones, expected value, and risk assessment
- **Full Observability**: Opik integration for LLM tracing, cost tracking, and performance monitoring

## Architecture

### Workflow Overview

```
Market Analysis Request (condition_id)
    ↓
[Market Ingestion] → Fetch market data from Polymarket
    ↓
[Memory Retrieval] → Load historical agent signals for context
    ↓
[Keyword Extraction] → Extract keywords from market/event data
    ↓
[Dynamic Agent Selection] → Determine which agents to activate
    ↓
[Parallel Agent Execution] → All agents analyze simultaneously
    ↓
[Agent Signal Fusion] → Aggregate signals with dynamic weighting
    ↓
[Thesis Construction] → Build bull and bear theses
    ↓
[Cross-Examination] → Test theses against each other
    ↓
[Consensus Engine] → Calculate unified probability estimate
    ↓
[Recommendation Generation] → Create actionable trade recommendation
    ↓
Trade Recommendation Output
```

### Agent Types

**MVP Agents** (always active):
- **Market Microstructure**: Analyzes order book dynamics, liquidity, and trading patterns
- **Probability Baseline**: Provides baseline probability estimates using statistical methods
- **Risk Assessment**: Identifies tail risks and potential failure scenarios

**Event Intelligence Agents**:
- **Breaking News**: Analyzes recent news developments and their market impact
- **Event Impact**: Assesses how events affect market outcomes

**Polling & Statistical Agents**:
- **Polling Intelligence**: Interprets polling data and survey results
- **Historical Pattern**: Identifies patterns from similar past events

**Sentiment & Narrative Agents**:
- **Media Sentiment**: Analyzes media coverage and narrative framing
- **Social Sentiment**: Tracks social media sentiment and discussion volume
- **Narrative Velocity**: Measures how quickly narratives are evolving

**Price Action Agents**:
- **Momentum**: Detects momentum signals and trend strength
- **Mean Reversion**: Identifies overbought/oversold conditions

**Event Scenario Agents**:
- **Catalyst**: Identifies potential catalysts that could move markets
- **Tail Risk**: Models low-probability, high-impact scenarios

## Prerequisites

- Python 3.10+
- Digital Ocean account with Gradient AI access
- Polymarket API access
- Supabase account (or local PostgreSQL)
- Opik account (optional, for observability)

## Setup

### 1. Create Virtual Environment

```bash
cd doa
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Gradient AI Configuration (REQUIRED)
DIGITALOCEAN_INFERENCE_KEY=your_gradient_model_access_key

# LLM Configuration
LLM_MODEL_NAME=llama-3.3-70b-instruct
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000

# Polymarket Configuration
POLYMARKET_GAMMA_API_URL=https://gamma-api.polymarket.com
POLYMARKET_CLOB_API_URL=https://clob.polymarket.com

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
ENABLE_PERSISTENCE=true

# Opik Observability Configuration (OPTIONAL)
# Leave OPIK_API_KEY empty to disable tracking
OPIK_API_KEY=your_opik_api_key
OPIK_PROJECT_NAME=doa-market-analysis
OPIK_WORKSPACE=your_workspace
OPIK_URL_OVERRIDE=
OPIK_TRACK_COSTS=true

# Agent Configuration
AGENT_TIMEOUT_MS=45000
AGENT_MAX_RETRIES=3
ENABLE_MVP_AGENTS=true
ENABLE_EVENT_INTELLIGENCE=true
ENABLE_POLLING_STATISTICAL=true
ENABLE_SENTIMENT_NARRATIVE=true
ENABLE_PRICE_ACTION=true
ENABLE_EVENT_SCENARIO=true
```

### 4. Set Up Database

Run the database migrations to create required tables:

```bash
python -m database.migrations.001_initial_schema
```

Or manually execute the SQL in `database/migrations/001_initial_schema.sql` against your Supabase database.

## Running Locally

### Start the Agent

```bash
export DIGITALOCEAN_API_TOKEN=your_token
gradient agent run
```

The agent will start on `http://localhost:8080` and expose the following endpoints:

- `POST /run` - Analyze a market by condition ID
- `GET /health` - Health check endpoint

### Interactive Usage

**Analyze a market via API:**

```bash
curl --location 'http://localhost:8080/run' \
    --header 'Content-Type: application/json' \
    --data '{
        "condition_id": "0x1234567890abcdef"
    }'
```

Response:
```json
{
    "status": "success",
    "condition_id": "0x1234567890abcdef",
    "market_question": "Will Biden win the 2024 election?",
    "recommendation": {
        "action": "LONG_YES",
        "entry_zone": [0.51, 0.53],
        "target_zone": [0.56, 0.58],
        "expected_value": 4.20,
        "win_probability": 0.62,
        "liquidity_risk": "low"
    },
    "consensus_probability": 0.542,
    "market_probability": 0.525,
    "edge": 0.017,
    "agent_signals": [
        {
            "agent_name": "market_microstructure",
            "direction": "YES",
            "fair_probability": 0.55,
            "confidence": 0.82
        }
    ],
    "analysis_metadata": {
        "duration_ms": 12400,
        "cost_usd": 0.23,
        "agents_executed": 13,
        "llm_calls": 47
    }
}
```

## Usage

### CLI Commands

#### Analyze a Market

```bash
python main.py analyze <condition_id>
```

Example:
```bash
python main.py analyze 0x1234567890abcdef
```

Output:
```
🔍 Analyzing market: Will Biden win the 2024 election?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Market Data Ingested
   Current Price: 52.5¢
   Liquidity: $2.4M
   24h Volume: $156K

🧠 Memory Retrieved
   Found 3 historical analyses for this market

🤖 Agents Activated: 13 agents
   MVP: Market Microstructure, Probability Baseline, Risk Assessment
   Event Intelligence: Breaking News, Event Impact
   Polling: Polling Intelligence, Historical Pattern
   Sentiment: Media Sentiment, Social Sentiment, Narrative Velocity
   Price Action: Momentum, Mean Reversion
   Event Scenario: Catalyst, Tail Risk

⚡ Agent Signals (13/13 completed)
   ✓ Market Microstructure: YES 55% (confidence: 0.82)
   ✓ Probability Baseline: YES 53% (confidence: 0.75)
   ✓ Risk Assessment: YES 51% (confidence: 0.68)
   ... (10 more agents)

🎯 Thesis Construction
   Bull Thesis: YES at 56% (edge: 3.5%)
   Bear Thesis: NO at 48% (edge: 4.5%)

⚔️  Cross-Examination
   Bull Score: 0.65 (survived 4/5 tests)
   Bear Score: 0.45 (survived 2/5 tests)

🎲 Consensus Probability
   Consensus: 54.2% (confidence band: 51.8% - 56.6%)
   Disagreement Index: 0.12 (low)
   Regime: high-confidence

💡 Trade Recommendation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Action: LONG_YES
Entry Zone: 51.0¢ - 53.0¢
Target Zone: 56.0¢ - 58.0¢
Expected Value: +$4.20 per $100 invested
Win Probability: 62%
Liquidity Risk: low

Summary:
Strong polling fundamentals and positive media sentiment support a YES position.
The market is slightly underpricing the consensus probability, creating a 
favorable entry opportunity.

Core Thesis:
Recent polling shows consistent lead in key swing states, with improving 
favorability ratings. Media narrative has shifted positively following recent 
policy announcements.

Key Catalysts:
- Upcoming debate performance
- Q3 economic data release
- Swing state polling updates

Failure Scenarios:
- Unexpected scandal or controversy
- Economic downturn
- Third-party candidate surge

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Analysis complete in 12.4s | Cost: $0.23 | 13 agents | 47 LLM calls
```

#### Query Analysis History

```bash
python main.py history <condition_id>
```

Shows past analyses for a market with timestamps, recommendations, and outcomes.

#### Start Continuous Monitoring

```bash
python main.py monitor
```

Continuously monitors configured markets and generates alerts on significant changes.

### Programmatic Usage

```python
from main import analyze_market
from config import load_config

# Load configuration
config = load_config()

# Analyze a market
result = await analyze_market(
    condition_id="0x1234567890abcdef",
    config=config
)

# Access recommendation
print(f"Action: {result.recommendation.action}")
print(f"Entry Zone: {result.recommendation.entry_zone}")
print(f"Expected Value: ${result.recommendation.expected_value}")

# Access agent signals
for signal in result.agent_signals:
    print(f"{signal.agent_name}: {signal.direction} {signal.fair_probability}")
```

## Deployment

### 1. Configure Agent Name

Edit `.gradient/agent.yml`:

```yaml
agent_name: tradewizard-doa-agent
```

### 2. Deploy to Gradient AI Platform

```bash
gradient agent deploy
```

The deployment process will:
- Package your agent code and dependencies
- Upload to DigitalOcean's Gradient AI Platform
- Provision serverless infrastructure
- Return a deployed agent ID and endpoint URL

### 3. Invoke Deployed Agent

```bash
# Analyze a market
curl --location 'https://agents.do-ai.run/<DEPLOYED_AGENT_ID>/main/run' \
    --header 'Content-Type: application/json' \
    --header 'Authorization: Bearer <DIGITALOCEAN_API_TOKEN>' \
    --data '{
        "condition_id": "0x1234567890abcdef"
    }'
```

### 4. Monitor Deployed Agent

View logs and metrics in the Gradient AI dashboard:

```
https://cloud.digitalocean.com/gen-ai/agents/<DEPLOYED_AGENT_ID>
```

### Environment Variables for Deployment

Ensure these environment variables are configured in your deployment:

```bash
# Required for deployment
DIGITALOCEAN_INFERENCE_KEY=your_inference_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Optional for observability
OPIK_API_KEY=your_opik_api_key
OPIK_PROJECT_NAME=doa-market-analysis
```

### Deployment Best Practices

1. **Use production environment variables**: Copy `.env.production` to `.env` before deploying
2. **Enable persistence**: Set `ENABLE_PERSISTENCE=true` to store analysis history
3. **Configure timeouts**: Adjust `AGENT_TIMEOUT_MS` based on expected latency
4. **Enable Opik tracking**: Set `OPIK_API_KEY` for production observability
5. **Test locally first**: Always test with `gradient agent run` before deploying

### Scaling Considerations

The deployed agent automatically scales based on:
- **Request volume**: Handles concurrent market analyses
- **Agent parallelization**: All 13 agents run in parallel per analysis
- **Cold start optimization**: First request may take 2-3s longer

For high-volume production use:
- Consider using MVP agents only (`ENABLE_ADVANCED_AGENTS=false`)
- Implement request queuing for rate limiting
- Cache market data to reduce API calls
- Use smaller LLM models for faster response times

## Project Structure

```
doa/
├── .gradient/
│   └── agent.yml          # Deployment configuration
├── agents/                 # Intelligence agent implementations
│   ├── agent_factory.py   # Factory for creating agent nodes
│   ├── market_microstructure.py
│   ├── probability_baseline.py
│   ├── risk_assessment.py
│   ├── breaking_news.py
│   ├── event_impact.py
│   ├── polling_intelligence.py
│   ├── historical_pattern.py
│   ├── media_sentiment.py
│   ├── social_sentiment.py
│   ├── narrative_velocity.py
│   ├── momentum.py
│   ├── mean_reversion.py
│   ├── catalyst.py
│   └── tail_risk.py
├── nodes/                  # LangGraph workflow nodes
│   ├── market_ingestion.py
│   ├── memory_retrieval.py
│   ├── keyword_extraction.py
│   ├── dynamic_agent_selection.py
│   ├── agent_signal_fusion.py
│   ├── thesis_construction.py
│   ├── cross_examination.py
│   ├── consensus_engine.py
│   └── recommendation_generation.py
├── models/                 # Data models and state definitions
│   ├── types.py           # Pydantic models
│   └── state.py           # LangGraph state
├── tools/                  # External integrations
│   └── polymarket_client.py
├── database/               # Persistence layer
│   ├── supabase_client.py
│   ├── persistence.py
│   ├── memory_retrieval.py
│   └── migrations/
│       └── 001_initial_schema.sql
├── utils/                  # Utilities
│   ├── llm_factory.py
│   ├── audit_logger.py
│   └── result.py
├── main.py                 # Main workflow and entry point (LangGraph workflow)
├── config.py               # Configuration management
├── prompts.py              # All agent prompts
├── requirements.txt
├── .env.example
└── README.md
```

## Sample Input/Output

### Market Analysis Input

```json
{
    "condition_id": "0x1234567890abcdef"
}
```

### Analysis Output

```json
{
    "status": "success",
    "condition_id": "0x1234567890abcdef",
    "market_question": "Will Biden win the 2024 election?",
    "recommendation": {
        "action": "LONG_YES",
        "entry_zone": [0.51, 0.53],
        "target_zone": [0.56, 0.58],
        "expected_value": 4.20,
        "win_probability": 0.62,
        "liquidity_risk": "low",
        "explanation": {
            "summary": "Strong polling fundamentals and positive media sentiment support a YES position. The market is slightly underpricing the consensus probability, creating a favorable entry opportunity.",
            "core_thesis": "Recent polling shows consistent lead in key swing states, with improving favorability ratings. Media narrative has shifted positively following recent policy announcements.",
            "key_catalysts": [
                "Upcoming debate performance",
                "Q3 economic data release",
                "Swing state polling updates"
            ],
            "failure_scenarios": [
                "Unexpected scandal or controversy",
                "Economic downturn",
                "Third-party candidate surge"
            ]
        }
    },
    "consensus_probability": 0.542,
    "market_probability": 0.525,
    "edge": 0.017,
    "confidence_band": [0.518, 0.566],
    "disagreement_index": 0.12,
    "agent_signals": [
        {
            "agent_name": "market_microstructure",
            "direction": "YES",
            "fair_probability": 0.55,
            "confidence": 0.82,
            "key_drivers": [
                "Strong bid-side liquidity",
                "Decreasing spread indicates confidence",
                "Volume surge on YES side"
            ],
            "risk_factors": [
                "Low overall liquidity could amplify moves",
                "Recent volatility suggests uncertainty"
            ]
        },
        {
            "agent_name": "polling_intelligence",
            "direction": "YES",
            "fair_probability": 0.58,
            "confidence": 0.89,
            "key_drivers": [
                "Consistent polling lead in swing states",
                "Improving favorability ratings",
                "Strong demographic support"
            ],
            "risk_factors": [
                "Polling errors in 2016 and 2020",
                "Late-deciding voters remain uncertain"
            ]
        }
    ],
    "thesis_construction": {
        "bull_thesis": {
            "probability": 0.56,
            "edge": 0.035,
            "supporting_agents": [
                "polling_intelligence",
                "media_sentiment",
                "momentum"
            ],
            "key_arguments": [
                "Polling fundamentals remain strong",
                "Positive media narrative momentum",
                "Historical patterns favor incumbent"
            ]
        },
        "bear_thesis": {
            "probability": 0.48,
            "edge": 0.045,
            "supporting_agents": [
                "tail_risk",
                "catalyst",
                "mean_reversion"
            ],
            "key_arguments": [
                "Economic uncertainty could shift sentiment",
                "Potential for unexpected events",
                "Market may be overextended"
            ]
        }
    },
    "cross_examination": {
        "bull_score": 0.65,
        "bear_score": 0.45,
        "bull_survived_tests": 4,
        "bear_survived_tests": 2,
        "total_tests": 5
    },
    "analysis_metadata": {
        "duration_ms": 12400,
        "cost_usd": 0.23,
        "agents_executed": 13,
        "llm_calls": 47,
        "timestamp": "2024-02-20T15:30:00Z"
    }
}
```

## API Reference

### Input Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `condition_id` | string | Yes | Polymarket condition ID (hex string) |

### Output Fields

| Field | Description |
|-------|-------------|
| `status` | Analysis status: `success`, `error`, `no_edge` |
| `condition_id` | The analyzed market condition ID |
| `market_question` | Human-readable market question |
| `recommendation` | Trade recommendation with action, zones, and explanation |
| `consensus_probability` | Unified probability estimate from all agents |
| `market_probability` | Current market price/probability |
| `edge` | Trading edge (consensus - market probability) |
| `confidence_band` | Lower and upper bounds of consensus estimate |
| `disagreement_index` | Measure of agent disagreement (0-1) |
| `agent_signals` | Individual agent analyses and signals |
| `thesis_construction` | Bull and bear thesis details |
| `cross_examination` | Adversarial testing results |
| `analysis_metadata` | Performance metrics (duration, cost, etc.) |

## Project Structure

## Data Models

### MarketBriefingDocument

Primary input to all intelligence agents:

```python
{
    "market_id": "0x1234...",
    "condition_id": "0xabcd...",
    "event_type": "election",
    "question": "Will Biden win the 2024 election?",
    "resolution_criteria": "Resolves YES if...",
    "expiry_timestamp": 1704067200,
    "current_probability": 0.525,
    "liquidity_score": 8.5,
    "bid_ask_spread": 0.02,
    "volatility_regime": "medium",
    "volume_24h": 156000.0
}
```

### AgentSignal

Output from individual agents:

```python
{
    "agent_name": "market_microstructure",
    "timestamp": 1704067200,
    "confidence": 0.82,
    "direction": "YES",
    "fair_probability": 0.55,
    "key_drivers": [
        "Strong bid-side liquidity",
        "Decreasing spread indicates confidence",
        "Volume surge on YES side"
    ],
    "risk_factors": [
        "Low overall liquidity could amplify moves",
        "Recent volatility suggests uncertainty"
    ],
    "metadata": {}
}
```

### TradeRecommendation

Final actionable output:

```python
{
    "market_id": "0x1234...",
    "action": "LONG_YES",
    "entry_zone": (0.51, 0.53),
    "target_zone": (0.56, 0.58),
    "expected_value": 4.20,
    "win_probability": 0.62,
    "liquidity_risk": "low",
    "explanation": {
        "summary": "Strong polling fundamentals...",
        "core_thesis": "Recent polling shows...",
        "key_catalysts": ["Upcoming debate", "Q3 data"],
        "failure_scenarios": ["Unexpected scandal", "Economic downturn"]
    },
    "metadata": {
        "consensus_probability": 0.542,
        "market_probability": 0.525,
        "edge": 0.017,
        "confidence_band": (0.518, 0.566)
    }
}
```

## Configuration

### Agent Configuration

Control which agents are active:

```python
# config.py
ENABLE_ADVANCED_AGENTS = True  # Enable all 13 agents
# Set to False to use only MVP agents (faster, cheaper)
```

### LLM Configuration

Configure the Gradient AI model:

```python
LLM_MODEL = "meta-llama/llama-3.1-70b-instruct"  # High quality
# Or use smaller models for faster/cheaper analysis:
# LLM_MODEL = "meta-llama/llama-3.1-8b-instruct"
```

### Timeout Configuration

Adjust agent execution timeouts:

```python
AGENT_TIMEOUT_MS = 30000  # 30 seconds per agent
MAX_RETRIES = 3  # Retry failed agents up to 3 times
```

## Customization

### Getting API Keys

Before running the agent, you'll need to obtain API keys:

1. **DigitalOcean API Token**:
   - Go to [API Settings](https://cloud.digitalocean.com/account/api/tokens)
   - Generate a new token with read/write access

2. **DigitalOcean Inference Key**:
   - Go to [GenAI Settings](https://cloud.digitalocean.com/gen-ai)
   - Create or copy your inference key

3. **Supabase Credentials**:
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Get your project URL and anon/service key from Settings → API

4. **Opik API Key** (optional):
   - Sign up at [comet.com/opik](https://www.comet.com/opik)
   - Navigate to Settings → API Keys
   - Generate a new API key

### Adding Custom Agents

1. Create a new agent module in `agents/`:

```python
# agents/my_custom_agent.py
AGENT_NAME = "my_custom_agent"

SYSTEM_PROMPT = """You are a specialized market analyst focusing on [your domain].

Analyze the market and provide:
1. Your assessment of the outcome probability
2. Key factors driving your analysis
3. Risks and uncertainties

Market Data:
{mbd}

Memory Context:
{memory_context}

Provide your analysis as a structured AgentSignal."""
```

2. Register the agent in `main.py`:

```python
from agents.my_custom_agent import AGENT_NAME, SYSTEM_PROMPT

# Add to agent creation
my_custom_agent_node = create_agent_node(AGENT_NAME, SYSTEM_PROMPT, config)
workflow.add_node(AGENT_NAME, my_custom_agent_node)
```

### Customizing Prompts

All prompts are centralized in `prompts.py`. Edit them to change agent behavior:

```python
# prompts.py
MARKET_MICROSTRUCTURE_PROMPT = """You are a market microstructure analyst...

[Customize the prompt here]
"""
```

### Adjusting Consensus Logic

Modify the consensus engine in `nodes/consensus_engine.py`:

```python
# Change weighting strategy
def calculate_weighted_consensus(signals):
    # Custom weighting logic
    weights = [signal.confidence ** 2 for signal in signals]  # Square confidence
    # ... rest of calculation
```

## Testing

### Run All Tests

```bash
pytest
```

### Run Unit Tests Only

```bash
pytest -m "not property"
```

### Run Property-Based Tests

```bash
pytest -m property
```

### Run Specific Test File

```bash
pytest agents/test_agent_factory.py
```

### Run with Coverage

```bash
pytest --cov=. --cov-report=html
```

## Observability

### Opik Integration

TradeWizard DOA integrates with [Opik](https://www.comet.com/opik) for comprehensive LLM observability and performance monitoring.

#### Features

- **Automatic LLM Tracing**: Every LangChain/LangGraph LLM call is automatically traced via OpikCallbackHandler
- **Cost Tracking**: Token usage and estimated costs per analysis and per agent
- **Performance Monitoring**: Latency, success rates, and agent execution times
- **Error Tracking**: Failed calls, retry attempts, and error patterns
- **Cycle Metrics**: Track complete analysis cycles with aggregate statistics
- **Agent Performance**: Compare agent execution times, costs, and confidence levels

#### Configuration

Opik integration is configured through environment variables in your `.env` file:

```bash
# Opik API key - get yours at https://www.comet.com/opik
# Leave empty to disable Opik tracking
OPIK_API_KEY=your_opik_api_key

# Project name for organizing traces in the dashboard
OPIK_PROJECT_NAME=doa-market-analysis

# Workspace identifier (optional, uses default if not specified)
OPIK_WORKSPACE=your_workspace

# Custom Opik instance URL (optional, for self-hosted instances)
OPIK_URL_OVERRIDE=

# Enable cost tracking (true/false)
OPIK_TRACK_COSTS=true
```

#### Enabling Opik

1. **Sign up for Opik**: Visit [https://www.comet.com/opik](https://www.comet.com/opik) and create an account
2. **Get your API key**: Navigate to Settings → API Keys in the Opik dashboard
3. **Configure environment**: Add your `OPIK_API_KEY` to `.env`
4. **Run analysis**: Opik will automatically track all LLM calls

#### Viewing Traces

After running an analysis, view traces in the Opik dashboard:

```
https://www.comet.com/opik/{workspace}/projects/{project_name}/traces
```

Each analysis creates a trace with:
- **Condition ID**: Market identifier for filtering
- **Agent Signals**: Individual agent execution traces
- **Token Usage**: Input/output tokens per LLM call
- **Costs**: Estimated costs based on model pricing
- **Latency**: Execution time for each operation
- **Metadata**: Market data, agent names, confidence scores

#### Programmatic Access

Access Opik metrics programmatically using the `OpikMonitorIntegration` class:

```python
from utils.opik_integration import OpikMonitorIntegration
from config import load_config

config = load_config()
opik_monitor = OpikMonitorIntegration(config)

# Start tracking a cycle
cycle_id = opik_monitor.start_cycle()

# Record market discovery
opik_monitor.record_discovery(market_count=10)

# Record individual analysis
opik_monitor.record_analysis(
    condition_id="0x1234...",
    duration=12400.0,  # milliseconds
    cost=0.23,  # USD
    success=True,
    agent_signals=agent_signals
)

# End cycle and get metrics
metrics = opik_monitor.end_cycle()

# Get aggregate metrics across all cycles
aggregate = opik_monitor.get_aggregate_metrics()
print(f"Total cost: ${aggregate.total_cost:.2f}")
print(f"Average cost per market: ${aggregate.average_cost_per_market:.4f}")
print(f"Success rate: {aggregate.success_rate:.1%}")
```

#### Disabling Opik

To disable Opik tracking:

1. Remove or leave empty the `OPIK_API_KEY` in `.env`
2. The system will automatically detect the missing key and disable tracking
3. All workflow functionality continues normally without observability

#### Graceful Degradation

Opik integration is designed to fail gracefully:
- If Opik API is unreachable, the workflow continues without tracking
- If handler creation fails, a warning is logged and execution proceeds
- Observability failures never block core analysis functionality

View traces in the Opik dashboard at https://www.comet.com/opik

### Audit Logging

All workflow stages are logged with structured audit entries:

```python
{
    "timestamp": 1704067200,
    "stage": "agent_execution",
    "agent_name": "market_microstructure",
    "status": "success",
    "duration_ms": 2340,
    "metadata": {}
}
```

Access audit logs in the database `analysis_history` table.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid condition_id" | Verify the condition ID exists on Polymarket |
| "Gradient AI authentication failed" | Check `GRADIENT_ACCESS_TOKEN` and `GRADIENT_WORKSPACE_ID` |
| "Database connection error" | Verify Supabase credentials and network connectivity |
| "Agent timeout" | Increase `AGENT_TIMEOUT_MS` or use a faster LLM model |
| "Insufficient agent signals" | Ensure at least 2 agents complete successfully |
| "No trading edge detected" | Market is fairly priced; no recommendation generated |

## Performance Optimization

### Reduce Analysis Time

1. **Use smaller LLM models**: Switch to `llama-3.1-8b-instruct`
2. **Disable advanced agents**: Set `ENABLE_ADVANCED_AGENTS=false`
3. **Reduce agent timeout**: Lower `AGENT_TIMEOUT_MS` to 15000
4. **Limit memory retrieval**: Reduce historical context window

### Reduce Costs

1. **Use MVP agents only**: Disable advanced agents
2. **Batch analyses**: Analyze multiple markets in sequence to reuse connections
3. **Cache market data**: Implement caching for frequently accessed markets
4. **Use smaller models**: Trade accuracy for cost with smaller LLMs

## Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Gradient AI Platform](https://docs.digitalocean.com/products/gradient/)
- [Polymarket API Documentation](https://docs.polymarket.com/)
- [Opik Observability](https://www.comet.com/docs/opik/)
- [Supabase Documentation](https://supabase.com/docs)

## License

MIT License - see LICENSE file for details

## Code Style

This project follows [PEP 8](https://peps.python.org/pep-0008/) Python style guidelines:

- **Line length**: Maximum 120 characters
- **Indentation**: 4 spaces (no tabs)
- **Naming conventions**:
  - `snake_case` for functions, variables, and module names
  - `PascalCase` for class names
  - `UPPER_CASE` for constants
- **Docstrings**: All public functions and classes have docstrings
- **Type hints**: Type annotations for function parameters and return values
- **Imports**: Organized in groups (standard library, third-party, local)

### Running Style Checks

```bash
# Install development dependencies
pip install flake8 black mypy

# Check code style
flake8 . --max-line-length=120 --extend-ignore=E203,W503

# Format code
black . --line-length=120

# Type checking
mypy . --ignore-missing-imports
```

## Contributing

Contributions are welcome! Please open an issue or pull request for:
- New agent implementations
- Performance improvements
- Bug fixes
- Documentation enhancements

Before submitting:
1. Ensure code follows PEP 8 style guidelines
2. Add docstrings to all new functions and classes
3. Include type hints for function signatures
4. Write tests for new functionality
5. Update documentation as needed
