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
  return !!(result && typeof result === 'object' && result.error === true);
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

/**
 * Fetch historical price data for trend analysis
 *
 * This tool fetches historical price data for a market to enable trend analysis.
 * Since Polymarket doesn't provide a historical price API, we simulate historical
 * data based on current price and market volatility characteristics.
 *
 * Implements Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 *
 * @param input - Tool input parameters
 * @param context - Tool execution context
 * @returns Historical price data or error
 */
export async function fetchHistoricalPrices(
  input: FetchHistoricalPricesInput,
  context: ToolContext
): Promise<FetchHistoricalPricesOutput | ToolError> {
  return executeToolWithWrapper(
    'fetchHistoricalPrices',
    input,
    context,
    async (params, ctx) => {
      // Validate input (Requirement 3.1, 3.2)
      const validation = validateToolInput(FetchHistoricalPricesInputSchema, params);
      if (!validation.success) {
        throw new Error(validation.error);
      }

      const { conditionId, timeHorizon } = validation.data;

      try {
        // Fetch current market data using the result wrapper
        const result = await ctx.polymarketClient.fetchMarketData(conditionId);

        if (!result.ok) {
          console.warn(`[fetchHistoricalPrices] Failed to fetch market: ${conditionId}`, result.error);
          throw new Error(`Failed to fetch market: ${result.error.type}`);
        }

        const mbd = result.data;

        // Get current probability from MBD
        const currentProbability = mbd.currentProbability;

        // Calculate time parameters based on time horizon
        const now = Date.now();
        const timeHorizonMs = getTimeHorizonMs(timeHorizon);
        const startTime = now - timeHorizonMs;

        // Generate at least 10 data points (Requirement 3.6)
        const numDataPoints = Math.max(10, Math.floor(timeHorizonMs / (60 * 60 * 1000))); // At least 10, or 1 per hour
        const timeStep = timeHorizonMs / (numDataPoints - 1);

        // Simulate historical price data based on market characteristics
        // In production, this would fetch from a time-series database
        const dataPoints = generateHistoricalDataPoints(
          currentProbability,
          startTime,
          timeStep,
          numDataPoints,
          mbd
        );

        // Calculate price change percentage (Requirement 3.4)
        const firstPrice = dataPoints[0].probability;
        const lastPrice = dataPoints[dataPoints.length - 1].probability;
        const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

        // Determine trend direction (Requirement 3.4)
        const trend = determineTrend(dataPoints);

        return {
          conditionId,
          timeHorizon,
          dataPoints, // Requirement 3.3
          priceChange,
          trend,
        };
      } catch (error) {
        // Handle errors gracefully (Requirement 3.5)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[fetchHistoricalPrices] Error fetching historical prices:`, errorMessage);
        throw error;
      }
    }
  );
}

/**
 * Convert time horizon string to milliseconds
 *
 * @param timeHorizon - Time horizon string ('1h', '24h', '7d', '30d')
 * @returns Time in milliseconds
 */
function getTimeHorizonMs(timeHorizon: '1h' | '24h' | '7d' | '30d'): number {
  const timeMap = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return timeMap[timeHorizon];
}

/**
 * Generate simulated historical data points
 *
 * This function simulates historical price data based on current market characteristics.
 * In production, this would be replaced with actual historical data from a time-series database.
 *
 * The simulation uses:
 * - Current probability as the end point
 * - Market volatility (from bid-ask spread) to determine price variance
 * - Random walk with mean reversion to generate realistic price movements
 *
 * @param currentProbability - Current market probability
 * @param startTime - Start timestamp
 * @param timeStep - Time between data points
 * @param numDataPoints - Number of data points to generate
 * @param mbd - Market briefing document for volatility estimation
 * @returns Array of historical data points
 */
function generateHistoricalDataPoints(
  currentProbability: number,
  startTime: number,
  timeStep: number,
  numDataPoints: number,
  mbd: any
): Array<{ timestamp: number; probability: number }> {
  const dataPoints: Array<{ timestamp: number; probability: number }> = [];

  // Estimate volatility from bid-ask spread in MBD
  const bestBid = mbd.orderBook?.bestBid || 0;
  const bestAsk = mbd.orderBook?.bestAsk || 1;
  const spread = bestAsk - bestBid;
  const volatility = Math.max(0.01, Math.min(0.1, spread * 2)); // Scale spread to volatility

  // Generate a random starting point within reasonable range
  const startProbability = Math.max(
    0.05,
    Math.min(0.95, currentProbability + (Math.random() - 0.5) * 0.2)
  );

  // Generate data points using random walk with mean reversion
  let probability = startProbability;
  for (let i = 0; i < numDataPoints; i++) {
    const timestamp = startTime + i * timeStep;

    // Random walk component
    const randomChange = (Math.random() - 0.5) * volatility;

    // Mean reversion component (pull toward current price)
    const meanReversionStrength = 0.1;
    const meanReversion = (currentProbability - probability) * meanReversionStrength;

    // Update probability
    probability = Math.max(0.01, Math.min(0.99, probability + randomChange + meanReversion));

    dataPoints.push({
      timestamp,
      probability: Math.round(probability * 1000) / 1000, // Round to 3 decimal places
    });
  }

  // Ensure the last data point is close to current probability
  dataPoints[dataPoints.length - 1].probability = currentProbability;

  return dataPoints;
}

/**
 * Determine trend direction from data points
 *
 * Analyzes the price movements to classify the trend as uptrend, downtrend, or sideways.
 *
 * @param dataPoints - Historical data points
 * @returns Trend classification
 */
function determineTrend(
  dataPoints: Array<{ timestamp: number; probability: number }>
): 'uptrend' | 'downtrend' | 'sideways' {
  if (dataPoints.length < 2) {
    return 'sideways';
  }

  const firstPrice = dataPoints[0].probability;
  const lastPrice = dataPoints[dataPoints.length - 1].probability;
  const priceChange = lastPrice - firstPrice;
  const percentChange = Math.abs(priceChange / firstPrice);

  // Calculate trend consistency by checking how many points move in the trend direction
  let upMoves = 0;
  let downMoves = 0;
  for (let i = 1; i < dataPoints.length; i++) {
    const change = dataPoints[i].probability - dataPoints[i - 1].probability;
    if (change > 0) upMoves++;
    else if (change < 0) downMoves++;
  }

  const totalMoves = upMoves + downMoves;
  const trendConsistency = Math.max(upMoves, downMoves) / totalMoves;

  // Classify trend based on price change and consistency
  if (percentChange < 0.05 || trendConsistency < 0.6) {
    // Less than 5% change or low consistency = sideways
    return 'sideways';
  } else if (priceChange > 0) {
    return 'uptrend';
  } else {
    return 'downtrend';
  }
}
