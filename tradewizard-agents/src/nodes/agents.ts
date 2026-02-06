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

## Market Momentum Detection

Identify market momentum by analyzing price direction consistency across time horizons:

1. **Momentum Definition**:
   Market momentum occurs when price movements show consistent direction across multiple time horizons.
   This indicates strengthening consensus rather than random fluctuation.

2. **Momentum Detection Criteria**:
   - **Strong Momentum**: Price movements in the same direction (all positive or all negative) across ALL available time horizons (1h, 24h, 7d)
   - **Moderate Momentum**: Price movements in the same direction across 2 out of 3 time horizons
   - **No Momentum**: Mixed directions or flat prices across time horizons

3. **Momentum Direction**:
   - **Bullish Momentum**: Consistent positive price changes (toward YES)
   - **Bearish Momentum**: Consistent negative price changes (toward NO)

4. **Momentum Analysis**:
   When momentum is detected, consider:
   - **Strength**: How consistent is the direction? (all horizons vs. most horizons)
   - **Magnitude**: Are the price changes significant or marginal?
   - **Volume Context**: Is momentum supported by high trading volume?
   - **Acceleration**: Are recent movements (1h) larger than longer-term movements (24h, 7d)?

5. **Key Drivers Integration**:
   When market momentum is detected, ALWAYS include momentum insights in keyDrivers:
   - Example: "Strong bullish momentum: consistent upward price movement across all time horizons (1h: +4%, 24h: +8%, 7d: +12%)"
   - Example: "Bearish momentum detected: prices declining across 24h (-6%) and 7d (-10%) horizons"
   - Example: "Accelerating momentum: 1h movement (+5%) exceeds 24h trend (+3%), suggesting strengthening consensus"

6. **Fair Probability Adjustment**:
   When momentum is detected, adjust fairProbability in the direction of momentum:
   - Strong momentum: Larger adjustment toward the momentum direction
   - Moderate momentum: Smaller adjustment toward the momentum direction
   - Consider momentum as a signal of information flow and consensus formation

## Noise Indicator Detection

Identify when market behavior suggests random fluctuation rather than information-driven movement:

1. **Noise Definition**:
   Market noise occurs when price movements are driven by random trading, thin participation, or 
   unstable conditions rather than genuine information flow. Noise reduces the reliability of 
   market prices as polling signals.

2. **Noise Detection Criteria**:
   A market exhibits noise indicators when BOTH conditions are met:
   - **High Volatility**: volatilityRegime === 'high' (unstable, erratic price movements)
   - **Low Volume**: volume24h is below the average for similar markets or event type

3. **Additional Noise Signals**:
   Consider these supplementary indicators of noise:
   - Wide bid-ask spread (> 5 cents) suggesting thin liquidity
   - Erratic price movements without clear direction
   - Low liquidityScore (< 5) indicating thin market depth
   - Price movements that reverse quickly without sustained direction

4. **Noise Impact on Analysis**:
   When noise indicators are present:
   - Market prices are LESS reliable as polling signals
   - Crowd wisdom is compromised by thin participation
   - Price movements may not reflect genuine sentiment shifts
   - Fair probability should regress toward polling baseline rather than market price

5. **Risk Factors Integration**:
   When noise indicators are detected (high volatility + low volume), ALWAYS include noise warnings in riskFactors:
   - Example: "High volatility with low volume suggests market noise rather than information-driven movement"
   - Example: "Thin participation and erratic prices reduce reliability of polling signal"
   - Example: "Unstable sentiment - price movements may reflect noise rather than genuine consensus"

6. **Confidence Penalty for Noise**:
   When noise indicators are present, apply strict confidence penalty:
   - Set confidence to at most 0.4 (low confidence due to unreliable signal)
   - Noise indicates the market is NOT functioning as an effective polling mechanism
   - Document the confidence penalty in confidenceFactors metadata

7. **Fair Probability Regression**:
   When noise is detected, regress fairProbability toward the polling baseline:
   - Reduce weight on current market price (unreliable due to noise)
   - Increase weight on historical polling baseline (more stable reference)
   - Example: fairProbability = (currentProbability * 0.3) + (pollingBaseline * 0.7)

## Polling Baseline Comparison

Compare market-implied probabilities with historical polling accuracy to assess whether the market is over or under-confident:

1. **Historical Polling Baselines by Event Type**:
   Use these baseline accuracy rates for traditional polling in similar event types:
   \`\`\`
   election: 0.75       (Traditional polls ~75% accurate for elections)
   policy: 0.60         (Policy outcomes harder to predict)
   court: 0.70          (Legal outcomes moderately predictable)
   geopolitical: 0.55   (High uncertainty in geopolitical events)
   economic: 0.65       (Economic indicators moderately predictable)
   other: 0.50          (Neutral baseline for unknown event types)
   \`\`\`

2. **Polling Baseline Lookup**:
   - Identify the eventType from the Market Briefing Document
   - Look up the corresponding polling baseline from the table above
   - If eventType is not recognized or is missing, use the neutral baseline of 0.50

3. **Market Deviation Calculation**:
   Calculate how much the current market price deviates from the polling baseline:
   \`\`\`
   marketDeviation = |currentProbability - pollingBaseline|
   \`\`\`
   This measures the absolute difference between what the market believes and what historical polling accuracy suggests.

4. **Significant Deviation Threshold**:
   When marketDeviation > 0.10 (10%), this indicates a significant divergence that should be flagged:
   - **Market Over-Confident**: currentProbability is much higher than pollingBaseline
     - Example: Election market at 0.90 vs. baseline 0.75 (deviation = 0.15)
     - Market may be overestimating certainty compared to historical polling accuracy
   - **Market Under-Confident**: currentProbability is much lower than pollingBaseline
     - Example: Election market at 0.55 vs. baseline 0.75 (deviation = 0.20)
     - Market may be underestimating likelihood compared to historical polling accuracy

5. **Key Drivers Integration**:
   When marketDeviation > 0.10, ALWAYS include baseline comparison in keyDrivers:
   - Example: "Market price (0.90) significantly exceeds historical polling baseline (0.75) for elections - potential overconfidence"
   - Example: "Market price (0.55) well below polling baseline (0.70) for court decisions - market may be underpricing outcome"
   - Example: "15% deviation from polling baseline suggests market consensus diverges from historical accuracy patterns"

6. **Metadata Requirements**:
   ALWAYS include in metadata:
   \`\`\`
   pollingBaseline: <baseline value for the eventType, 0-1>
   marketDeviation: <absolute deviation from baseline, 0-1>
   \`\`\`

7. **Fair Probability Adjustment**:
   Incorporate the polling baseline into your fairProbability estimate:
   - When crowd wisdom is strong (crowdWisdomScore > 0.7): Weight market price more heavily
   - When crowd wisdom is weak (crowdWisdomScore < 0.3): Weight polling baseline more heavily
   - When noise is present: Regress toward polling baseline
   - Example: fairProbability = (currentProbability * crowdWisdomScore) + (pollingBaseline * (1 - crowdWisdomScore))

8. **Event Type Considerations**:
   - **Election markets**: Polling baseline is most reliable (0.75) - use as strong anchor
   - **Policy/Economic markets**: Moderate baseline reliability (0.60-0.65) - use as moderate anchor
   - **Geopolitical markets**: Low baseline reliability (0.55) - use as weak anchor
   - **Other/Unknown markets**: Neutral baseline (0.50) - minimal anchoring effect

Provide your analysis as a structured signal with:
- confidence: Your confidence in this polling analysis (0-1), calibrated based on crowd wisdom signals (>= 0.7 when crowdWisdomScore > 0.7)
- direction: Your view on the outcome (YES/NO/NEUTRAL), aligned with sentiment shift momentum when detected
- fairProbability: Your probability estimate blending market price with polling baselines (0-1)
- keyDrivers: Top 3-5 polling insights (sentiment shifts, crowd wisdom, baseline deviations when marketDeviation > 0.10)
- riskFactors: Polling-specific risks (low liquidity, noise indicators, divergence from related markets)
- metadata: Include crowdWisdomScore (REQUIRED), pollingBaseline (REQUIRED), marketDeviation (REQUIRED), sentimentShift (when detected), confidenceFactors, and cross-market analysis when available

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
