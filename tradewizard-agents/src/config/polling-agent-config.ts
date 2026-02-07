/**
 * Configuration for the Autonomous Polling Agent
 * 
 * This configuration controls the behavior of the autonomous polling agent,
 * which uses LangChain's tool-calling capabilities to fetch and analyze
 * Polymarket data autonomously.
 */

/**
 * Polling Agent Configuration Interface
 * 
 * Controls autonomous mode, tool usage limits, timeouts, and fallback behavior.
 */
export interface PollingAgentConfig {
  /**
   * Enable autonomous mode with tool-calling capabilities
   * 
   * When true, the polling agent can autonomously fetch related markets,
   * historical prices, cross-market data, and perform momentum analysis.
   * 
   * When false, the agent falls back to basic polling analysis using
   * only pre-fetched data from the workflow state.
   * 
   * @default false
   */
  autonomous: boolean;

  /**
   * Maximum number of tool calls per analysis
   * 
   * Limits the number of tools the agent can invoke to control latency
   * and API usage. The agent will prioritize essential tools when
   * approaching this limit.
   * 
   * @default 5
   */
  maxToolCalls: number;

  /**
   * Timeout for agent execution in milliseconds
   * 
   * The autonomous agent has a longer timeout than the basic agent
   * (45 seconds vs 30 seconds) to account for tool execution time.
   * 
   * @default 45000 (45 seconds)
   */
  timeout: number;

  /**
   * Enable tool result caching
   * 
   * When true, tool results are cached within an analysis session
   * to avoid redundant API calls for the same data.
   * 
   * @default true
   */
  cacheEnabled: boolean;

  /**
   * Fallback to basic polling agent on error
   * 
   * When true, if the autonomous agent fails or times out, the system
   * will fall back to the basic polling agent using pre-fetched data.
   * 
   * When false, agent failures will be reported as errors without fallback.
   * 
   * @default true
   */
  fallbackToBasic: boolean;
}

/**
 * Default polling agent configuration
 * 
 * Conservative defaults that prioritize reliability over advanced features.
 * Autonomous mode is disabled by default for backward compatibility.
 */
export const DEFAULT_POLLING_AGENT_CONFIG: PollingAgentConfig = {
  autonomous: false,
  maxToolCalls: 5,
  timeout: 45000,
  cacheEnabled: true,
  fallbackToBasic: true,
};

/**
 * Load polling agent configuration from environment variables
 * 
 * Environment variables:
 * - POLLING_AGENT_AUTONOMOUS: Enable autonomous mode (true/false)
 * - POLLING_AGENT_MAX_TOOL_CALLS: Maximum tool calls per analysis
 * - POLLING_AGENT_TIMEOUT: Timeout in milliseconds
 * - POLLING_AGENT_CACHE_ENABLED: Enable tool result caching (true/false)
 * - POLLING_AGENT_FALLBACK_TO_BASIC: Enable fallback to basic agent (true/false)
 * 
 * @returns Polling agent configuration
 */
export function loadPollingAgentConfig(): PollingAgentConfig {
  return {
    autonomous: process.env.POLLING_AGENT_AUTONOMOUS === 'true',
    maxToolCalls: parseInt(process.env.POLLING_AGENT_MAX_TOOL_CALLS || '5', 10),
    timeout: parseInt(process.env.POLLING_AGENT_TIMEOUT || '45000', 10),
    cacheEnabled: process.env.POLLING_AGENT_CACHE_ENABLED !== 'false',
    fallbackToBasic: process.env.POLLING_AGENT_FALLBACK_TO_BASIC !== 'false',
  };
}
