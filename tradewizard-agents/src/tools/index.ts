/**
 * Tools Module - Barrel Export
 *
 * This module exports all tool-related functionality for the autonomous polling agent.
 * It provides a centralized entry point for importing tools, types, and utilities.
 *
 * Requirements: 1.1
 */

// Export main tool creation function
export { createPollingTools } from './polling-tools.js';

// Export tool context and audit types
export type {
  ToolContext,
  ToolAuditEntry,
  ToolResult,
  ToolError,
} from './polling-tools.js';

// Export tool input schemas
export {
  FetchRelatedMarketsInputSchema,
  FetchHistoricalPricesInputSchema,
  FetchCrossMarketDataInputSchema,
  AnalyzeMarketMomentumInputSchema,
  DetectSentimentShiftsInputSchema,
} from './polling-tools.js';

// Export tool input types
export type {
  FetchRelatedMarketsInput,
  FetchHistoricalPricesInput,
  FetchCrossMarketDataInput,
  AnalyzeMarketMomentumInput,
  DetectSentimentShiftsInput,
} from './polling-tools.js';

// Export tool output types
export type {
  FetchRelatedMarketsOutput,
  FetchHistoricalPricesOutput,
  FetchCrossMarketDataOutput,
  AnalyzeMarketMomentumOutput,
  DetectSentimentShiftsOutput,
} from './polling-tools.js';

// Export tool utility functions
export {
  executeToolWithWrapper,
  isToolError,
  validateToolInput,
  createToolError,
  logToolCall,
  getToolUsageSummary,
} from './polling-tools.js';

// Export individual tool functions (for testing and direct use)
export {
  fetchRelatedMarkets,
  fetchHistoricalPrices,
  fetchCrossMarketData,
  analyzeMarketMomentum,
  detectSentimentShifts,
} from './polling-tools.js';
