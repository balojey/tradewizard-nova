/**
 * NewsData Tools Infrastructure
 *
 * This module provides the tool infrastructure for autonomous news agents,
 * including tool types, interfaces, input/output schemas, and execution wrappers.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6
 */

import { z } from 'zod';
import type { NewsDataClient } from '../utils/newsdata-client.js';
import type { ToolCache } from '../utils/tool-cache.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Tool execution context
 *
 * Provides access to shared resources needed by all tools:
 * - newsDataClient: For fetching news data
 * - cache: For caching tool results within a session
 * - auditLog: For logging all tool calls
 * - agentName: Name of the agent using the tool
 */
export interface ToolContext {
  newsDataClient: NewsDataClient;
  cache: ToolCache;
  auditLog: ToolAuditEntry[];
  agentName: string;
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
  articleCount?: number;
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
// News Article Output Type
// ============================================================================

/**
 * Standardized news article format
 *
 * All news tools return articles in this consistent format,
 * regardless of the underlying NewsData API response structure.
 */
export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: {
    id: string;
    name: string;
    priority: number;
  };
  content: {
    description?: string;
    fullContent?: string;
    keywords?: string[];
  };
  metadata: {
    publishedAt: string;
    language: string;
    countries?: string[];
    categories?: string[];
  };
  ai?: {
    sentiment?: 'positive' | 'negative' | 'neutral';
    sentimentStats?: {
      positive: number;
      negative: number;
      neutral: number;
    };
    tags?: string[];
    summary?: string;
  };
  crypto?: {
    coins?: string[];
  };
  market?: {
    symbols?: string[];
    organizations?: string[];
  };
}

// ============================================================================
// Tool Input Schemas (Zod)
// ============================================================================

/**
 * Input schema for fetchLatestNews tool
 */
export const FetchLatestNewsInputSchema = z.object({
  query: z.string().optional().describe('Search query for article content'),
  queryInTitle: z.string().optional().describe('Search query for article titles only'),
  timeframe: z
    .enum(['1h', '6h', '12h', '24h', '48h'])
    .optional()
    .default('24h')
    .describe('Time window for news'),
  countries: z.array(z.string()).optional().describe('Country codes to include (e.g., ["us", "uk"])'),
  categories: z.array(z.string()).optional().describe('News categories to include'),
  languages: z.array(z.string()).optional().default(['en']).describe('Language codes'),
  sentiment: z
    .enum(['positive', 'negative', 'neutral'])
    .optional()
    .describe('Filter by sentiment'),
  size: z.number().min(1).max(50).optional().default(20).describe('Number of articles to return'),
  removeDuplicates: z.boolean().optional().default(true).describe('Remove duplicate articles'),
});

export type FetchLatestNewsInput = z.infer<typeof FetchLatestNewsInputSchema>;

/**
 * Input schema for fetchArchiveNews tool
 */
export const FetchArchiveNewsInputSchema = z.object({
  fromDate: z.string().describe('Start date (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)'),
  toDate: z.string().describe('End date (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)'),
  query: z.string().optional().describe('Search query for article content'),
  queryInTitle: z.string().optional().describe('Search query for article titles only'),
  countries: z.array(z.string()).optional().describe('Country codes to include'),
  categories: z.array(z.string()).optional().describe('News categories to include'),
  languages: z.array(z.string()).optional().default(['en']).describe('Language codes'),
  size: z.number().min(1).max(50).optional().default(20).describe('Number of articles to return'),
  removeDuplicates: z.boolean().optional().default(true).describe('Remove duplicate articles'),
});

export type FetchArchiveNewsInput = z.infer<typeof FetchArchiveNewsInputSchema>;

/**
 * Input schema for fetchCryptoNews tool
 */
export const FetchCryptoNewsInputSchema = z.object({
  coins: z.array(z.string()).optional().describe('Crypto symbols (e.g., ["btc", "eth", "ada"])'),
  query: z.string().optional().describe('Search query for article content'),
  queryInTitle: z.string().optional().describe('Search query for article titles only'),
  timeframe: z.string().optional().describe('Time window for news'),
  fromDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  toDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
  sentiment: z
    .enum(['positive', 'negative', 'neutral'])
    .optional()
    .describe('Filter by sentiment'),
  languages: z.array(z.string()).optional().default(['en']).describe('Language codes'),
  size: z.number().min(1).max(50).optional().default(20).describe('Number of articles to return'),
  removeDuplicates: z.boolean().optional().default(true).describe('Remove duplicate articles'),
});

export type FetchCryptoNewsInput = z.infer<typeof FetchCryptoNewsInputSchema>;

/**
 * Input schema for fetchMarketNews tool
 */
export const FetchMarketNewsInputSchema = z.object({
  symbols: z.array(z.string()).optional().describe('Stock symbols (e.g., ["AAPL", "TSLA"])'),
  organizations: z
    .array(z.string())
    .optional()
    .describe('Organization names (e.g., ["Apple", "Tesla"])'),
  query: z.string().optional().describe('Search query for article content'),
  queryInTitle: z.string().optional().describe('Search query for article titles only'),
  timeframe: z.string().optional().describe('Time window for news'),
  fromDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  toDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
  sentiment: z
    .enum(['positive', 'negative', 'neutral'])
    .optional()
    .describe('Filter by sentiment'),
  countries: z.array(z.string()).optional().describe('Country codes to include'),
  languages: z.array(z.string()).optional().default(['en']).describe('Language codes'),
  size: z.number().min(1).max(50).optional().default(20).describe('Number of articles to return'),
  removeDuplicates: z.boolean().optional().default(true).describe('Remove duplicate articles'),
});

export type FetchMarketNewsInput = z.infer<typeof FetchMarketNewsInputSchema>;

// ============================================================================
// Tool Execution Wrapper
// ============================================================================

/**
 * Execute a tool with error handling, caching, and audit logging
 *
 * This wrapper provides consistent error handling, caching, and audit logging
 * for all tool executions. It implements Requirements 1.3, 1.4, 1.6.
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
        articleCount: Array.isArray(cached) ? cached.length : undefined,
      });

      return cached as TOutput;
    }

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
      articleCount: Array.isArray(result) ? result.length : undefined,
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
      const errorMessages = error.issues
        .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
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
  totalArticles: number;
} {
  const toolBreakdown: Record<string, number> = {};
  let totalToolTime = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  let errors = 0;
  let totalArticles = 0;

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

    // Count articles
    if (entry.articleCount !== undefined) {
      totalArticles += entry.articleCount;
    }
  }

  return {
    toolsCalled: auditLog.length,
    totalToolTime,
    cacheHits,
    cacheMisses,
    errors,
    toolBreakdown,
    totalArticles,
  };
}

/**
 * Transform NewsData API article to standardized NewsArticle format
 *
 * Converts the NewsData.io API response format to our standardized
 * NewsArticle interface for consistent handling across all tools.
 *
 * @param article - NewsData API article
 * @returns Standardized NewsArticle
 */
export function transformNewsDataArticle(article: any): NewsArticle {
  return {
    id: article.article_id,
    title: article.title,
    url: article.link,
    source: {
      id: article.source_id,
      name: article.source_name,
      priority: article.source_priority || 0,
    },
    content: {
      description: article.description,
      fullContent: article.content,
      keywords: article.keywords,
    },
    metadata: {
      publishedAt: article.pubDate,
      language: article.language,
      countries: article.country,
      categories: article.category,
    },
    ai: article.sentiment || article.sentiment_stats || article.ai_tag || article.ai_summary
      ? {
          sentiment: article.sentiment,
          sentimentStats: article.sentiment_stats,
          tags: article.ai_tag,
          summary: article.ai_summary,
        }
      : undefined,
    crypto: article.coin
      ? {
          coins: article.coin,
        }
      : undefined,
    market: article.symbol || article.ai_org
      ? {
          symbols: article.symbol,
          organizations: article.ai_org,
        }
      : undefined,
  };
}

/**
 * Generate cache key for tool parameters
 *
 * Creates a deterministic cache key by sorting object keys recursively.
 *
 * @param toolName - Name of the tool
 * @param params - Tool parameters
 * @returns Cache key string
 */
export function generateCacheKey(toolName: string, params: any): string {
  const sortedParams = sortObject(params);
  return `${toolName}:${JSON.stringify(sortedParams)}`;
}

/**
 * Sort object keys recursively for consistent serialization
 *
 * @param obj - Object to sort
 * @returns Sorted object
 */
function sortObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sortObject(item)).sort();
  }

  const sorted: Record<string, any> = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    sorted[key] = sortObject(obj[key]);
  }

  return sorted;
}
