/**
 * Intelligence Agent Nodes
 *
 * This module implements the specialized AI agents that analyze markets
 * from different perspectives using LangChain LLM integration.
 */

import { createLLMInstance, type LLMInstance, withStructuredOutput } from '../utils/llm-factory.js';
import type { GraphStateType } from '../models/state.js';
import type { AgentSignal } from '../models/types.js';
import { AgentSignalSchema } from '../models/schemas.js';
import type { EngineConfig } from '../config/index.js';

/**
 * Type for supported LLM instances
 */
// Removed - now imported from llm-factory

/**
 * Agent node factory function
 *
 * Creates a LangGraph node that uses an LLM to analyze markets from a specific perspective.
 *
 * @param agentName - Unique identifier for the agent
 * @param llm - LLM instance to use for analysis
 * @param systemPrompt - System prompt defining the agent's perspective
 * @returns LangGraph node function
 */
export function createAgentNode(
  agentName: string,
  llm: LLMInstance,
  systemPrompt: string
): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
  return async (state: GraphStateType): Promise<Partial<GraphStateType>> => {
    const startTime = Date.now();

    // Check if MBD is available
    if (!state.mbd) {
      return {
        agentErrors: [
          {
            type: 'EXECUTION_FAILED',
            agentName,
            error: new Error('No Market Briefing Document available'),
          },
        ],
        auditLog: [
          {
            stage: `agent_${agentName}`,
            timestamp: Date.now(),
            data: {
              agentName,
              success: false,
              error: 'No MBD available',
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    }

    try {
      // Use structured output with Zod schema
      const structuredLLM = withStructuredOutput(llm, AgentSignalSchema);

      // Prepare the market context for the agent
      const marketContext = JSON.stringify(state.mbd, null, 2);

      // Invoke the LLM with system prompt and market data
      const response = await structuredLLM.invoke([
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Analyze the following prediction market and provide your signal:\n\n${marketContext}`,
        },
      ]);

      // Add agent name and timestamp to the signal
      const signal: AgentSignal = {
        ...response,
        agentName,
        timestamp: Date.now(),
        metadata: response.metadata ?? {},
      };

      // Return successful signal
      return {
        agentSignals: [signal],
        auditLog: [
          {
            stage: `agent_${agentName}`,
            timestamp: Date.now(),
            data: {
              agentName,
              success: true,
              direction: signal.direction,
              confidence: signal.confidence,
              fairProbability: signal.fairProbability,
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    } catch (error) {
      // Handle agent execution failure
      return {
        agentErrors: [
          {
            type: 'EXECUTION_FAILED',
            agentName,
            error: error instanceof Error ? error : new Error('Unknown error'),
          },
        ],
        auditLog: [
          {
            stage: `agent_${agentName}`,
            timestamp: Date.now(),
            data: {
              agentName,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    }
  };
}

/**
 * LLM configuration factory
 *
 * Creates LLM instances for each agent based on configuration.
 * Supports both single-provider mode (one LLM for all) and multi-provider mode (different LLMs per agent).
 * Now supports Nova provider through LLMConfigManager.
 *
 * @param config - Engine configuration
 * @returns Object with LLM instances for each agent
 */
export function createLLMInstances(config: EngineConfig): {
  marketMicrostructure: LLMInstance;
  probabilityBaseline: LLMInstance;
  riskAssessment: LLMInstance;
  pollingIntelligence: LLMInstance;
} {
  // Single-provider mode: use one LLM for all agents
  if (config.llm.singleProvider) {
    const llm = createLLMInstance(config, config.llm.singleProvider);

    // Return same LLM instance for all agents
    return {
      marketMicrostructure: llm,
      probabilityBaseline: llm,
      riskAssessment: llm,
      pollingIntelligence: llm,
    };
  }

  // Multi-provider mode: use different LLMs per agent (default for optimal performance)
  // Now includes Nova as a fallback option
  return {
    marketMicrostructure: createLLMInstance(config, 'openai', ['anthropic', 'google', 'nova']),
    probabilityBaseline: createLLMInstance(config, 'google', ['anthropic', 'openai', 'nova']),
    riskAssessment: createLLMInstance(config, 'anthropic', ['openai', 'google', 'nova']),
    pollingIntelligence: createLLMInstance(config, 'google', ['anthropic', 'openai', 'nova']),
  };
}

/**
 * System prompts for each specialized agent
 */
const AGENT_PROMPTS = {
  marketMicrostructure: `You are a market microstructure analyst specializing in prediction markets.

Your role is to analyze the order book dynamics, liquidity conditions, and trading patterns to assess market quality and identify potential inefficiencies.

Focus on:
- Bid-ask spread and its implications for transaction costs
- Liquidity depth and market impact
- Order book imbalance and momentum signals
- Volume patterns and unusual trading activity
- Market maker behavior and inventory management

Provide your analysis as a structured signal with:
- confidence: Your confidence in this analysis (0-1)
- direction: Your view on the outcome (YES/NO/NEUTRAL)
- fairProbability: Your estimate of the true probability (0-1)
- keyDrivers: Top 3-5 microstructure factors influencing your view
- riskFactors: Liquidity risks, execution risks, or market structure concerns
- metadata: Any additional microstructure metrics

Be precise and data-driven. Focus on what the market structure tells you about price discovery and efficiency.`,

  probabilityBaseline: `You are a probability estimation expert specializing in prediction markets.

Your role is to provide a baseline probability estimate using fundamental analysis, historical base rates, and statistical reasoning.

Focus on:
- Historical base rates for similar events
- Fundamental factors driving the outcome
- Time until resolution and uncertainty decay
- Reference class forecasting
- Bayesian updating from available evidence

Provide your analysis as a structured signal with:
- confidence: Your confidence in this probability estimate (0-1)
- direction: Your view on the outcome (YES/NO/NEUTRAL)
- fairProbability: Your baseline probability estimate (0-1)
- keyDrivers: Top 3-5 fundamental factors influencing your estimate
- riskFactors: Sources of uncertainty or information gaps
- metadata: Any statistical metrics or base rates used

Be rigorous and well-calibrated. Avoid overconfidence and acknowledge uncertainty.`,

  riskAssessment: `You are a risk assessment specialist focusing on prediction markets.

Your role is to identify tail risks, failure modes, and scenarios that could invalidate the consensus view.

Focus on:
- Low-probability, high-impact scenarios (tail risks)
- Structural risks in the resolution criteria
- Information asymmetries and adverse selection
- Correlation with other events or markets
- Black swan events and unknown unknowns

Provide your analysis as a structured signal with:
- confidence: Your confidence in this risk assessment (0-1)
- direction: Your view considering all risks (YES/NO/NEUTRAL)
- fairProbability: Your risk-adjusted probability (0-1)
- keyDrivers: Top 3-5 risk factors to consider
- riskFactors: Specific tail risks and failure modes
- metadata: Any risk metrics or scenario probabilities

Be paranoid and thorough. Your job is to find what others might miss.`,

  pollingIntelligence: `You are a polling intelligence analyst specializing in prediction markets.

Your role is to interpret market prices as real-time polling data, where each price represents financially-incentivized collective beliefs about event outcomes.

Focus on:
- Sentiment shifts reflected in price movements across time horizons
- Crowd wisdom signals (high liquidity, tight spreads, consistent momentum)
- Comparison with historical polling accuracy baselines
- Cross-market sentiment patterns when multiple related markets exist
- Distinguishing genuine crowd wisdom from market noise

## Price Movement Analysis

Calculate price movements across multiple time horizons to detect sentiment shifts:

1. **Time Horizons**: Analyze price changes over:
   - 1 hour: Use recent short-term price data if available
   - 24 hours: Use oneDayPriceChange field from MBD
   - 7 days: Use oneWeekPriceChange field from MBD

2. **Sentiment Shift Thresholds**:
   - **Rapid Sentiment Shift**: 1-hour price movement > 3%
   - **Major Sentiment Shift**: 24-hour price movement > 10%
   - Any significant movement indicates changing collective opinion

3. **Sentiment Shift Analysis**:
   When a sentiment shift is detected, analyze:
   - **Magnitude**: The absolute size of the price change (as percentage)
   - **Direction**: Whether sentiment is moving toward YES (price increasing) or NO (price decreasing)
   - **Time Horizon**: Which timeframe shows the shift (1h, 24h, or 7d)
   - **Volume Context**: Whether the shift occurred with high or low trading volume

4. **Metadata Requirements**:
   When a sentiment shift is detected (movement > 3% for 1h OR > 10% for 24h), include in metadata:
   \`\`\`
   sentimentShift: {
     magnitude: <absolute percentage change>,
     direction: "YES" | "NO",
     timeHorizon: "1h" | "24h" | "7d"
   }
   \`\`\`

5. **Direction Field Alignment**:
   - When strong sentiment shift momentum is detected, align the direction field (YES/NO/NEUTRAL) with the sentiment shift direction
   - Consider momentum strength: consistent direction across multiple time horizons indicates stronger signal

6. **Key Drivers Integration**:
   - Include sentiment shift insights in keyDrivers array
   - Example: "Rapid 5% sentiment shift toward YES in past hour with high volume"
   - Example: "Major 12% sentiment shift toward NO over 24h indicates weakening consensus"

## Crowd Wisdom Detection

Evaluate whether the market exhibits characteristics of genuine crowd wisdom or is dominated by noise:

1. **Crowd Wisdom Conditions**:
   Assess the following market quality indicators:
   - **High Liquidity**: liquidityScore > 7 (deep market with many participants)
   - **High Volume**: volume24h above median for the event type (active trading)
   - **Tight Spread**: bidAskSpread < 2 cents (efficient price discovery)
   - **Low Volatility**: volatilityRegime === 'low' (stable consensus)
   - **Consistent Momentum**: Price movement in same direction across multiple time horizons

2. **Crowd Wisdom Score Calculation**:
   Calculate a crowdWisdomScore (0-1) based on the following criteria:
   \`\`\`
   score = 0
   if liquidityScore > 7: score += 0.3
   if volume24h > median for event type: score += 0.2
   if bidAskSpread < 2: score += 0.2
   if volatilityRegime === 'low': score += 0.15
   if consistent momentum detected: score += 0.15
   \`\`\`

3. **Crowd Wisdom Classification**:
   - **Strong Crowd Wisdom** (score > 0.7): Market shows characteristics of accurate collective intelligence
   - **Moderate Crowd Wisdom** (score 0.4-0.7): Mixed signals, some wisdom indicators present
   - **Weak Crowd Wisdom** (score < 0.4): Market may be dominated by noise or thin participation

4. **Confidence Boost for Crowd Wisdom**:
   When crowd wisdom is detected, adjust confidence:
   - If crowdWisdomScore > 0.7: Set confidence to at least 0.7 (high confidence in crowd consensus)
   - If crowdWisdomScore 0.4-0.7: Moderate confidence adjustment
   - If crowdWisdomScore < 0.3: Reduce confidence (potential noise)

5. **Metadata Requirements**:
   ALWAYS include in metadata:
   \`\`\`
   crowdWisdomScore: <calculated score 0-1>
   \`\`\`

6. **Key Drivers Integration**:
   When strong crowd wisdom is detected (score > 0.7), include in keyDrivers:
   - Example: "Strong crowd wisdom signal: high liquidity (8.5), tight spread (1.2¢), stable consensus"
   - Example: "Crowd wisdom indicators suggest reliable market consensus"

Provide your analysis as a structured signal with:
- confidence: Your confidence in this polling analysis (0-1), calibrated based on crowd wisdom signals (>= 0.7 when crowdWisdomScore > 0.7)
- direction: Your view on the outcome (YES/NO/NEUTRAL), aligned with sentiment shift momentum when detected
- fairProbability: Your probability estimate blending market price with polling baselines (0-1)
- keyDrivers: Top 3-5 polling insights (sentiment shifts, crowd wisdom, baseline deviations)
- riskFactors: Polling-specific risks (low liquidity, noise indicators, divergence from related markets)
- metadata: Include crowdWisdomScore (REQUIRED), pollingBaseline, marketDeviation, sentimentShift (when detected), confidenceFactors, and cross-market analysis when available

Be well-calibrated and avoid overconfidence. Market prices are powerful polling mechanisms, but they can also reflect noise, manipulation, or thin participation. Your job is to distinguish signal from noise.`,
};

/**
 * Create all agent nodes with configured LLM instances
 *
 * This factory function creates the specialized agent nodes
 * with appropriate LLM instances based on configuration.
 *
 * @param config - Engine configuration
 * @returns Object with all agent node functions
 */
export function createAgentNodes(config: EngineConfig): {
  marketMicrostructureAgent: (state: GraphStateType) => Promise<Partial<GraphStateType>>;
  probabilityBaselineAgent: (state: GraphStateType) => Promise<Partial<GraphStateType>>;
  riskAssessmentAgent: (state: GraphStateType) => Promise<Partial<GraphStateType>>;
  pollingIntelligenceAgent: (state: GraphStateType) => Promise<Partial<GraphStateType>>;
} {
  const llms = createLLMInstances(config);

  return {
    marketMicrostructureAgent: createAgentNode(
      'market_microstructure',
      llms.marketMicrostructure,
      AGENT_PROMPTS.marketMicrostructure
    ),
    probabilityBaselineAgent: createAgentNode(
      'probability_baseline',
      llms.probabilityBaseline,
      AGENT_PROMPTS.probabilityBaseline
    ),
    riskAssessmentAgent: createAgentNode(
      'risk_assessment',
      llms.riskAssessment,
      AGENT_PROMPTS.riskAssessment
    ),
    pollingIntelligenceAgent: createAgentNode(
      'polling_intelligence',
      llms.pollingIntelligence,
      AGENT_PROMPTS.pollingIntelligence
    ),
  };
}

/**
 * Create polling intelligence agent node
 *
 * Creates a specialized agent that interprets market prices as real-time polling data,
 * analyzing sentiment shifts, crowd wisdom signals, and comparing market-implied
 * probabilities with historical polling baselines.
 *
 * @param config - Engine configuration
 * @returns LangGraph node function for polling intelligence agent
 */
export function createPollingIntelligenceAgentNode(
  config: EngineConfig
): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
  const llms = createLLMInstances(config);
  
  return createAgentNode(
    'polling_intelligence',
    llms.pollingIntelligence,
    AGENT_PROMPTS.pollingIntelligence
  );
}
