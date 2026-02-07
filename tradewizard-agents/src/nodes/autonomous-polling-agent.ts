/**
 * Autonomous Polling Agent Node
 *
 * This module implements an autonomous polling intelligence agent that uses
 * LangChain's tool-calling capabilities to fetch and research Polymarket data.
 * The agent can autonomously decide which tools to use based on market context.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 14.1, 14.2, 14.4, 12.1, 12.2, 12.3, 12.6
 */

import { createReactAgent } from '@langchain/langgraph/prebuilt';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { createLLMInstance, type LLMInstance } from '../utils/llm-factory.js';
import { createPolymarketClient } from '../utils/polymarket-client.js';
import { ToolCache } from '../utils/tool-cache.js';
import { createPollingTools, getToolUsageSummary } from '../tools/polling-tools.js';
import type { ToolContext, ToolAuditEntry } from '../tools/polling-tools.js';
import type { GraphStateType } from '../models/state.js';
import type { AgentSignal } from '../models/types.js';
import { AgentSignalSchema } from '../models/schemas.js';
import type { EngineConfig } from '../config/index.js';

// ============================================================================
// System Prompt
// ============================================================================

/**
 * System prompt for the autonomous polling agent
 *
 * This prompt defines the agent's role, available tools, analysis strategy,
 * and output format requirements.
 *
 * Implements Requirements 7.2, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
const AUTONOMOUS_POLLING_SYSTEM_PROMPT = `You are an autonomous polling intelligence analyst with the ability to fetch and research Polymarket data.

Your role is to analyze prediction markets as real-time polling systems, where prices represent financially-incentivized collective beliefs.

AVAILABLE TOOLS:
You have access to the following tools to gather data:

1. fetchRelatedMarkets: Find other markets in the same event for cross-market analysis
2. fetchHistoricalPrices: Get price history to analyze sentiment trends over time
3. fetchCrossMarketData: Get comprehensive event-level data for all markets
4. analyzeMarketMomentum: Calculate momentum indicators from price movements
5. detectSentimentShifts: Identify significant sentiment changes across time horizons

ANALYSIS STRATEGY:
Based on the market characteristics, intelligently decide which tools to use:

- For election markets: Prioritize fetchRelatedMarkets and fetchCrossMarketData for cross-market sentiment
- For high-volatility markets: Prioritize fetchHistoricalPrices and analyzeMarketMomentum for trend analysis
- For low-liquidity markets: Fetch related markets to supplement thin data
- For multi-market events: Always fetch event-level context

TOOL USAGE GUIDELINES:
- Limit yourself to 5 tool calls maximum to control latency
- Use tools in sequence to build comprehensive analysis
- Synthesize information from multiple tool results
- Document your data gathering strategy in keyDrivers

ANALYSIS FOCUS:
- Sentiment shifts reflected in price movements
- Crowd wisdom signals (high liquidity, tight spreads, consistent momentum)
- Cross-market sentiment patterns when multiple related markets exist
- Historical trends and momentum indicators
- Comparison with polling baselines

OUTPUT FORMAT:
Provide your analysis as a structured signal with:
- confidence: Your confidence in this polling analysis (0-1)
- direction: Your view on the outcome (YES/NO/NEUTRAL)
- fairProbability: Your probability estimate (0-1)
- keyDrivers: Top 3-5 polling insights including data gathering strategy
- riskFactors: Polling-specific risks and data limitations
- metadata: Include all relevant metrics from tool results

Be well-calibrated and document your reasoning process.`;

// ============================================================================
// Agent Creation
// ============================================================================

/**
 * Create the autonomous polling agent with tools
 *
 * This function creates a ReAct agent configured with polling tools and
 * the autonomous polling system prompt.
 *
 * Implements Requirements 7.1, 7.2, 7.3, 7.4
 *
 * @param config - Engine configuration
 * @param tools - Array of polling tools
 * @returns ReAct agent executor
 */
function createAutonomousPollingAgent(
  config: EngineConfig,
  tools: DynamicStructuredTool[]
) {
  // Create LLM instance (Requirement 7.1)
  // Use Google as primary, with fallbacks to other providers
  const llm: LLMInstance = createLLMInstance(config, 'google', ['openai', 'anthropic']);

  // Create ReAct agent with tools and system prompt (Requirements 7.2, 7.3, 7.4)
  const agent = createReactAgent({
    llm,
    tools,
    messageModifier: AUTONOMOUS_POLLING_SYSTEM_PROMPT,
  });

  return agent;
}

// ============================================================================
// Agent Node Function
// ============================================================================

/**
 * Create the autonomous polling agent node for the workflow
 *
 * This function returns a LangGraph node that executes the autonomous polling
 * agent with tool-calling capabilities. The agent can fetch data, analyze trends,
 * and synthesize information from multiple sources.
 *
 * Implements Requirements 7.5, 7.6, 14.1, 14.2, 14.4, 12.1, 12.2, 12.3, 12.6
 *
 * @param config - Engine configuration
 * @returns LangGraph node function
 */
export function createAutonomousPollingAgentNode(
  config: EngineConfig
): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
  // Initialize PolymarketClient (Requirement 7.1)
  const polymarketClient = createPolymarketClient(config.polymarket);

  return async (state: GraphStateType): Promise<Partial<GraphStateType>> => {
    const startTime = Date.now();
    const agentName = 'autonomous_polling';

    try {
      // Step 1: Check for MBD availability (Requirement 12.1)
      if (!state.mbd) {
        const errorMessage = 'No Market Briefing Document available';
        console.error(`[${agentName}] ${errorMessage}`);

        return {
          agentErrors: [
            {
              type: 'EXECUTION_FAILED',
              agentName,
              error: new Error(errorMessage),
            },
          ],
          auditLog: [
            {
              stage: `agent_${agentName}`,
              timestamp: Date.now(),
              data: {
                agentName,
                success: false,
                error: errorMessage,
                errorContext: 'Missing MBD',
                duration: Date.now() - startTime,
              },
            },
          ],
        };
      }

      // Step 2: Create tool cache with session ID (Requirement 7.5)
      const sessionId = state.mbd.conditionId || 'unknown';
      const cache = new ToolCache(sessionId);

      // Step 3: Create tool audit log
      const toolAuditLog: ToolAuditEntry[] = [];

      // Step 4: Create tool context
      const toolContext: ToolContext = {
        polymarketClient,
        cache,
        auditLog: toolAuditLog,
      };

      // Step 5: Create polling tools with context (Requirement 7.1)
      const tools = createPollingTools(toolContext);

      // Step 6: Create agent executor
      const agent = createAutonomousPollingAgent(config, tools);

      // Step 7: Prepare agent input with market data and keywords (Requirement 7.5)
      const marketContext = JSON.stringify(state.mbd, null, 2);
      const keywordsContext = state.marketKeywords
        ? JSON.stringify(state.marketKeywords, null, 2)
        : 'None';

      const input = {
        messages: [
          {
            role: 'user',
            content: `Analyze the following prediction market and provide your polling intelligence signal.

MARKET DATA:
${marketContext}

KEYWORDS:
${keywordsContext}

Use the available tools to gather additional data as needed, then provide your structured analysis.`,
          },
        ],
      };

      // Step 8: Execute agent with timeout (Requirement 14.1, 14.2)
      const timeoutMs = 45000; // 45 seconds (Requirement 14.1)
      const maxToolCalls = 5; // Limit tool calls (Requirement 14.2)

      // Execute agent with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Agent execution timeout')), timeoutMs);
      });

      const agentPromise = agent.invoke(input, {
        recursionLimit: maxToolCalls + 10, // Allow some extra for agent reasoning
      });

      const result = await Promise.race([agentPromise, timeoutPromise]);

      // Step 9: Parse agent output into AgentSignal (Requirement 7.6)
      const agentOutput = (result as any).messages[(result as any).messages.length - 1].content;

      // Try to parse the output as JSON
      let parsedOutput: any;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = agentOutput.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          parsedOutput = JSON.parse(jsonMatch[1]);
        } else {
          // Try to parse the entire output as JSON
          parsedOutput = JSON.parse(agentOutput);
        }
      } catch (parseError) {
        // If parsing fails, return error
        throw new Error(`Failed to parse agent output as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      // Add agent name and timestamp to create complete signal
      const signalWithMetadata = {
        ...parsedOutput,
        agentName,
        timestamp: Date.now(),
        metadata: parsedOutput.metadata || {},
      };

      // Validate the signal against the schema
      const validationResult = AgentSignalSchema.safeParse(signalWithMetadata);

      if (!validationResult.success) {
        throw new Error(`Agent signal validation failed: ${validationResult.error.message}`);
      }

      const signal: AgentSignal = validationResult.data;

      // Step 10: Add tool usage metadata to signal (Requirement 7.6)
      const toolUsageSummary = getToolUsageSummary(toolAuditLog);
      const cacheStats = cache.getStats();

      signal.metadata.toolUsage = {
        toolsCalled: toolUsageSummary.toolsCalled,
        totalToolTime: toolUsageSummary.totalToolTime,
        cacheHits: cacheStats.hits,
        cacheMisses: cacheStats.misses,
        toolBreakdown: toolUsageSummary.toolBreakdown,
      };

      // Step 11: Return agent signal and audit log (Requirement 7.6)
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
              toolsCalled: toolUsageSummary.toolsCalled,
              totalToolTime: toolUsageSummary.totalToolTime,
              cacheHits: cacheStats.hits,
              cacheMisses: cacheStats.misses,
              duration: Date.now() - startTime,
              toolAudit: toolAuditLog,
            },
          },
        ],
      };
    } catch (error) {
      // Handle all errors gracefully (Requirements 12.1, 12.2, 12.3, 12.6)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage.includes('timeout');

      console.error(`[${agentName}] Error during execution:`, errorMessage);

      // Log error to audit trail (Requirement 12.3)
      return {
        agentErrors: [
          {
            type: 'EXECUTION_FAILED',
            agentName,
            error: error instanceof Error ? error : new Error(errorMessage),
          },
        ],
        auditLog: [
          {
            stage: `agent_${agentName}`,
            timestamp: Date.now(),
            data: {
              agentName,
              success: false,
              error: errorMessage,
              errorContext: isTimeout ? 'Agent execution timeout' : 'Agent execution failed',
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    }
  };
}
