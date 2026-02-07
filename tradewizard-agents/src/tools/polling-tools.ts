/**
 * Polling Tools Infrastructure
 *
 * This module provides the tool infrastructure for the autonomous polling agent,
 * including tool types, interfaces, input/output schemas, and execution wrappers.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { z } from 'zod';
import type { PolymarketClient } from '../utils/polymarket-client.js';
import type { ToolCache } from '../utils/tool-cache.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Tool execution context
 *
 * Provides access to shared resources needed by all tools:
 * - polymarketClient: For fetching market data
 * - cache: For caching tool results within a session
 * - auditLog: For logging all tool calls
 */
export interface ToolContext {
  polymarketClient: PolymarketClient;
  cache: ToolCache;
  auditLog: ToolAuditEntry[];
}

/**
 * Tool audit log entry
 *
 * Records details of each tool invocation for debugging and analysis.
 */
export interface ToolAuditEntry {
  toolName: string;
  timestamp: number;
  params: any;
  result?: any;
  error?: string;
  duration: number;
  cacheHit: boolean;
}

/**
 * Tool execution result
 *
 * Standardized result format for all tools.
 */
export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Tool error
 *
 * Structured error object returned when tool execution fails.
 */
export interface ToolError {
  error: true;
  message: string;
  toolName: string;
  code?: string;
}

// ============================================================================
// Tool Input Schemas (Zod)
// ============================================================================

/**
 * Input schema for fetchRelatedMarkets tool
 */
export const FetchRelatedMarketsInputSchema = z.object({
  conditionId: z.string().describe('The condition ID of the market to find related markets for'),
  minVolume: z
    .number()
    .optional()
    .default(100)
    .describe('Minimum 24h volume in USD to include (default: 100)'),
});

export type FetchRelatedMarketsInput = z.infer<typeof FetchRelatedMarketsInputSchema>;

/**
 * Input schema for fetchHistoricalPrices tool
 */
export const FetchHistoricalPricesInputSchema = z.object({
  conditionId: z.string().describe('The condition ID of the market'),
  timeHorizon: z
    .enum(['1h', '24h', '7d', '30d'])
    .describe('Time horizon for historical data (1h, 24h, 7d, or 30d)'),
});

export type FetchHistoricalPricesInput = z.infer<typeof FetchHistoricalPricesInputSchema>;

/**
 * Input schema for fetchCrossMarketData tool
 */
export const FetchCrossMarketDataInputSchema = z.object({
  eventId: z.string().describe('The event ID to fetch cross-market data for'),
  maxMarkets: z
    .number()
    .optional()
    .default(20)
    .describe('Maximum number of markets to return (default: 20)'),
});

export type FetchCrossMarketDataInput = z.infer<typeof FetchCrossMarketDataInputSchema>;

/**
 * Input schema for analyzeMarketMomentum tool
 */
export const AnalyzeMarketMomentumInputSchema = z.object({
  conditionId: z.string().describe('The condition ID of the market to analyze'),
});

export type AnalyzeMarketMomentumInput = z.infer<typeof AnalyzeMarketMomentumInputSchema>;

/**
 * Input schema for detectSentimentShifts tool
 */
export const DetectSentimentShiftsInputSchema = z.object({
  conditionId: z.string().describe('The condition ID of the market to analyze'),
  threshold: z
    .number()
    .optional()
    .default(0.05)
    .describe('Minimum price change to flag as shift (default: 0.05 = 5%)'),
});

export type DetectSentimentShiftsInput = z.infer<typeof DetectSentimentShiftsInputSchema>;

// ============================================================================
// Tool Output Types
// ============================================================================

/**
 * Output type for fetchRelatedMarkets tool
 */
export interface FetchRelatedMarketsOutput {
  eventId: string;
  eventTitle: string;
  markets: Array<{
    conditionId: string;
    question: string;
    currentProbability: number;
    volume24h: number;
    liquidityScore: number;
  }>;
  totalMarkets: number;
}

/**
 * Output type for fetchHistoricalPrices tool
 */
export interface FetchHistoricalPricesOutput {
  conditionId: string;
  timeHorizon: string;
  dataPoints: Array<{
    timestamp: number;
    probability: number;
  }>;
  priceChange: number;
  trend: 'uptrend' | 'downtrend' | 'sideways';
}

/**
 * Output type for fetchCrossMarketData tool
 */
export interface FetchCrossMarketDataOutput {
  eventId: string;
  eventTitle: string;
  eventDescription: string;
  totalVolume: number;
  totalLiquidity: number;
  markets: Array<{
    conditionId: string;
    question: string;
    currentProbability: number;
    volume24h: number;
    liquidityScore: number;
    volumeRank: number;
  }>;
  aggregateSentiment: {
    averageProbability: number;
    weightedAverageProbability: number;
    sentimentDirection: 'bullish' | 'bearish' | 'neutral';
  };
}

/**
 * Output type for analyzeMarketMomentum tool
 */
export interface AnalyzeMarketMomentumOutput {
  conditionId: string;
  momentum: {
    score: number; // -1 to +1
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: 'strong' | 'moderate' | 'weak';
    confidence: number; // 0-1
  };
  timeHorizons: {
    '1h': { priceChange: number; velocity: number };
    '24h': { priceChange: number; velocity: number };
    '7d': { priceChange: number; velocity: number };
  };
}

/**
 * Output type for detectSentimentShifts tool
 */
export interface DetectSentimentShiftsOutput {
  conditionId: string;
  shifts: Array<{
    timeHorizon: '1h' | '24h' | '7d';
    magnitude: number;
    direction: 'toward_yes' | 'toward_no';
    classification: 'minor' | 'moderate' | 'major';
    timestamp: number;
  }>;
  hasSignificantShift: boolean;
}

// ============================================================================
// Tool Execution Wrapper
// ============================================================================

/**
 * Execute a tool with error handling, caching, and audit logging
 *
 * This wrapper provides consistent error handling, caching, and audit logging
 * for all tool executions. It implements Requirements 1.3, 1.4, 1.5, 1.6.
 *
 * @param toolName - Name of the tool being executed
 * @param params - Tool input parameters
 * @param context - Tool execution context
 * @param executor - Tool execution function
 * @returns Tool result or error
 */
export async function executeToolWithWrapper<TInput, TOutput>(
  toolName: string,
  params: TInput,
  context: ToolContext,
  executor: (params: TInput, context: ToolContext) => Promise<TOutput>
): Promise<TOutput | ToolError> {
  const startTime = Date.now();
  let cacheHit = false;

  try {
    // Check cache first (Requirement 1.6)
    const cached = context.cache.get(toolName, params);
    if (cached !== null) {
      cacheHit = true;

      // Log cache hit to audit trail (Requirement 1.3)
      context.auditLog.push({
        toolName,
        timestamp: Date.now(),
        params,
        result: cached,
        duration: Date.now() - startTime,
        cacheHit: true,
      });

      return cached as TOutput;
    }

    // Check rate limits (Requirement 1.5)
    // Note: Rate limiting is handled by PolymarketClient internally

    // Execute tool function
    const result = await executor(params, context);

    // Cache result (Requirement 1.6)
    context.cache.set(toolName, params, result);

    // Log successful execution to audit trail (Requirement 1.3)
    const duration = Date.now() - startTime;
    context.auditLog.push({
      toolName,
      timestamp: Date.now(),
      params,
      result,
      duration,
      cacheHit: false,
    });

    return result;
  } catch (error) {
    // Calculate duration
    const duration = Date.now() - startTime;

    // Create structured error (Requirement 1.4)
    const toolError: ToolError = {
      error: true,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      toolName,
      code: error instanceof Error && 'code' in error ? (error as any).code : undefined,
    };

    // Log error to audit trail (Requirement 1.3)
    context.auditLog.push({
      toolName,
      timestamp: Date.now(),
      params,
      error: toolError.message,
      duration,
      cacheHit,
    });

    // Return structured error instead of throwing (Requirement 1.4)
    return toolError;
  }
}

/**
 * Type guard to check if a result is a tool error
 *
 * @param result - Tool result to check
 * @returns True if result is a ToolError
 */
export function isToolError(result: any): result is ToolError {
  return result && typeof result === 'object' && result.error === true;
}

/**
 * Validate tool input against schema
 *
 * This function validates tool input parameters against a Zod schema
 * and returns a validation error if the input is invalid.
 * Implements Requirement 1.2.
 *
 * @param schema - Zod schema to validate against
 * @param input - Input parameters to validate
 * @returns Validated input or validation error
 */
export function validateToolInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(input);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return {
        success: false,
        error: `Input validation failed: ${errorMessages}`,
      };
    }
    return {
      success: false,
      error: 'Input validation failed: Unknown error',
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a tool error response
 *
 * @param toolName - Name of the tool
 * @param message - Error message
 * @param code - Optional error code
 * @returns ToolError object
 */
export function createToolError(toolName: string, message: string, code?: string): ToolError {
  return {
    error: true,
    message,
    toolName,
    code,
  };
}

/**
 * Log tool call to audit trail
 *
 * Helper function to add a tool audit entry to the audit log.
 *
 * @param context - Tool execution context
 * @param entry - Audit entry to add
 */
export function logToolCall(context: ToolContext, entry: ToolAuditEntry): void {
  context.auditLog.push(entry);
}

/**
 * Get tool usage summary from audit log
 *
 * Calculates summary statistics from the tool audit log.
 *
 * @param auditLog - Tool audit log entries
 * @returns Summary statistics
 */
export function getToolUsageSummary(auditLog: ToolAuditEntry[]): {
  toolsCalled: number;
  totalToolTime: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  toolBreakdown: Record<string, number>;
} {
  const toolBreakdown: Record<string, number> = {};
  let totalToolTime = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  let errors = 0;

  for (const entry of auditLog) {
    // Count tool calls
    toolBreakdown[entry.toolName] = (toolBreakdown[entry.toolName] || 0) + 1;

    // Sum execution time
    totalToolTime += entry.duration;

    // Count cache hits/misses
    if (entry.cacheHit) {
      cacheHits++;
    } else {
      cacheMisses++;
    }

    // Count errors
    if (entry.error) {
      errors++;
    }
  }

  return {
    toolsCalled: auditLog.length,
    totalToolTime,
    cacheHits,
    cacheMisses,
    errors,
    toolBreakdown,
  };
}

// ============================================================================
// Tool Implementations
// ============================================================================

/**
 * Fetch related markets within the same Polymarket event
 *
 * This tool fetches all markets within the same event as the input market,
 * enabling cross-market sentiment analysis. It filters out the input market
 * and applies a minimum volume threshold to reduce noise.
 *
 * Implements Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 *
 * @param input - Tool input parameters
 * @param context - Tool execution context
 * @returns Related markets data or error
 */
export async function fetchRelatedMarkets(
  input: FetchRelatedMarketsInput,
  context: ToolContext
): Promise<FetchRelatedMarketsOutput | ToolError> {
  return executeToolWithWrapper(
    'fetchRelatedMarkets',
    input,
    context,
    async (params, ctx) => {
      // Validate input (Requirement 2.1)
      const validation = validateToolInput(FetchRelatedMarketsInputSchema, params);
      if (!validation.success) {
        throw new Error(validation.error);
      }

      const { conditionId, minVolume } = validation.data;

      try {
        // Step 1: Find the event containing this market (Requirement 2.2)
        // We need to search through events to find which one contains this market
        const events = await ctx.polymarketClient.discoverPoliticalEvents({
          limit: 100,
          active: true,
        });

        let parentEvent = null;
        for (const event of events) {
          const matchingMarket = event.markets.find(m => m.conditionId === conditionId);
          if (matchingMarket) {
            parentEvent = event;
            break;
          }
        }

        // If event not found, return empty result with warning (Requirement 2.5)
        if (!parentEvent) {
          console.warn(`[fetchRelatedMarkets] No parent event found for market ${conditionId}`);
          return {
            eventId: 'unknown',
            eventTitle: 'Event not found',
            markets: [],
            totalMarkets: 0,
          };
        }

        // Step 2: Fetch all markets in the event (Requirement 2.2)
        const eventWithMarkets = await ctx.polymarketClient.fetchEventWithAllMarkets(parentEvent.id);

        if (!eventWithMarkets) {
          console.warn(`[fetchRelatedMarkets] Failed to fetch markets for event ${parentEvent.id}`);
          return {
            eventId: parentEvent.id,
            eventTitle: parentEvent.title,
            markets: [],
            totalMarkets: 0,
          };
        }

        // Step 3: Filter out the input market (Requirement 2.3)
        let relatedMarkets = eventWithMarkets.markets.filter(
          market => market.conditionId !== conditionId
        );

        // Step 4: Filter by minimum volume threshold (Requirement 2.6)
        // Use volume24hr if available, otherwise fall back to volumeNum
        relatedMarkets = relatedMarkets.filter(market => {
          const volume = market.volume24hr ?? market.volumeNum ?? 0;
          return volume >= minVolume;
        });

        // Step 5: Transform to output format (Requirement 2.4)
        const markets = relatedMarkets.map(market => {
          // Calculate current probability from outcome prices
          const outcomePrices = JSON.parse(market.outcomePrices) as string[];
          const currentProbability = outcomePrices.length > 0 ? parseFloat(outcomePrices[0]) : 0.5;
          
          // Get volume (prefer 24hr, fall back to total)
          const volume24h = market.volume24hr ?? market.volumeNum ?? 0;
          
          // Calculate liquidity score (0-10 scale based on liquidity)
          const liquidityNum = market.liquidityNum ?? market.liquidityClob ?? 0;
          const liquidityScore = Math.min(10, Math.log10(liquidityNum + 1) * 2);

          return {
            conditionId: market.conditionId,
            question: market.question,
            currentProbability,
            volume24h,
            liquidityScore,
          };
        });

        return {
          eventId: eventWithMarkets.event.id,
          eventTitle: eventWithMarkets.event.title,
          markets,
          totalMarkets: markets.length,
        };
      } catch (error) {
        // Handle errors gracefully
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[fetchRelatedMarkets] Error fetching related markets:`, errorMessage);

        // Return empty result on error to maintain graceful degradation
        return {
          eventId: 'error',
          eventTitle: 'Error fetching event',
          markets: [],
          totalMarkets: 0,
        };
      }
    }
  );
}
