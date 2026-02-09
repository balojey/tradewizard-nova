/**
 * Memory Retrieval Service
 *
 * This module provides functionality for querying and retrieving historical
 * agent signals from the database to enable closed-loop agent analysis.
 */

import type { SupabaseClientManager } from './supabase-client.js';

/**
 * Historical agent signal retrieved from database
 */
export interface HistoricalSignal {
  agentName: string;
  marketId: string;
  timestamp: Date;
  direction: 'YES' | 'NO' | 'NEUTRAL';
  fairProbability: number;
  confidence: number;
  keyDrivers: string[];
  metadata: Record<string, unknown>;
}

/**
 * Memory context for a specific agent
 */
export interface AgentMemoryContext {
  agentName: string;
  marketId: string;
  historicalSignals: HistoricalSignal[];
  hasHistory: boolean;
}

/**
 * Memory retrieval service interface
 */
export interface MemoryRetrievalService {
  /**
   * Retrieve historical signals for a specific agent-market combination
   * @param agentName - Name of the agent
   * @param marketId - Market condition ID
   * @param limit - Maximum number of historical signals to retrieve (default: 3)
   * @returns Agent memory context with historical signals
   */
  getAgentMemory(
    agentName: string,
    marketId: string,
    limit?: number
  ): Promise<AgentMemoryContext>;

  /**
   * Retrieve memory context for all agents for a specific market
   * @param marketId - Market condition ID
   * @param agentNames - List of agent names to retrieve memory for
   * @param limit - Maximum number of historical signals per agent (default: 3)
   * @returns Map of agent name to memory context
   */
  getAllAgentMemories(
    marketId: string,
    agentNames: string[],
    limit?: number
  ): Promise<Map<string, AgentMemoryContext>>;
}

/**
 * Memory Retrieval Service Implementation
 */
export class MemoryRetrievalServiceImpl implements MemoryRetrievalService {
  constructor(private supabaseManager: SupabaseClientManager) {}

  /**
   * Retrieve historical signals for a specific agent-market combination
   */
  async getAgentMemory(
    agentName: string,
    marketId: string,
    limit: number = 3
  ): Promise<AgentMemoryContext> {
    try {
      const client = this.supabaseManager.getClient();

      // Cap limit at 5 for performance (Requirement 4.3)
      const effectiveLimit = Math.min(limit, 5);

      // Query agent_signals table with indexes (Requirements 1.1, 1.2, 4.1, 4.2)
      const { data, error } = await client
        .from('agent_signals')
        .select('*')
        .eq('agent_name', agentName)
        .eq('market_id', marketId)
        .order('created_at', { ascending: false }) // Requirement 1.2
        .limit(effectiveLimit);

      if (error) {
        console.error('[MemoryRetrieval] Query failed:', error);
        return this.emptyContext(agentName, marketId);
      }

      // Requirement 1.4: Return empty result set without error
      if (!data || data.length === 0) {
        return this.emptyContext(agentName, marketId);
      }

      // Transform database rows to HistoricalSignal objects (Requirement 1.5)
      const historicalSignals = data
        .map((row) => this.transformToHistoricalSignal(row))
        .filter((signal) => signal !== null) as HistoricalSignal[];

      return {
        agentName,
        marketId,
        historicalSignals,
        hasHistory: historicalSignals.length > 0,
      };
    } catch (error) {
      // Requirement 9.1: Graceful error handling
      console.error('[MemoryRetrieval] Unexpected error:', error);
      return this.emptyContext(agentName, marketId);
    }
  }

  /**
   * Retrieve memory context for all agents for a specific market
   */
  async getAllAgentMemories(
    marketId: string,
    agentNames: string[],
    limit: number = 3
  ): Promise<Map<string, AgentMemoryContext>> {
    const memoryMap = new Map<string, AgentMemoryContext>();

    // Fetch memories in parallel for all agents
    const memoryPromises = agentNames.map((agentName) =>
      this.getAgentMemory(agentName, marketId, limit)
    );

    const memories = await Promise.all(memoryPromises);

    memories.forEach((memory) => {
      memoryMap.set(memory.agentName, memory);
    });

    return memoryMap;
  }

  /**
   * Create empty memory context
   */
  private emptyContext(agentName: string, marketId: string): AgentMemoryContext {
    return {
      agentName,
      marketId,
      historicalSignals: [],
      hasHistory: false,
    };
  }

  /**
   * Transform database row to HistoricalSignal
   * Implements validation logic (Requirements 10.1-10.5)
   */
  private transformToHistoricalSignal(row: any): HistoricalSignal | null {
    // Requirement 10.1: Validate required fields
    if (!row.agent_name || !row.market_id || !row.direction) {
      console.warn('[MemoryRetrieval] Signal missing required fields:', {
        agent_name: row.agent_name,
        market_id: row.market_id,
        direction: row.direction,
      });
      return null;
    }

    // Requirement 10.3: Validate probability range
    if (
      row.fair_probability !== null &&
      row.fair_probability !== undefined &&
      (row.fair_probability < 0 || row.fair_probability > 1)
    ) {
      console.warn('[MemoryRetrieval] Invalid fair_probability:', row.fair_probability);
      return null;
    }

    // Requirement 10.4: Validate confidence range
    if (
      row.confidence !== null &&
      row.confidence !== undefined &&
      (row.confidence < 0 || row.confidence > 1)
    ) {
      console.warn('[MemoryRetrieval] Invalid confidence:', row.confidence);
      return null;
    }

    // Requirement 10.5: Validate direction enum
    const validDirections = ['YES', 'NO', 'NEUTRAL', 'LONG_YES', 'LONG_NO', 'NO_TRADE'];
    if (!validDirections.includes(row.direction)) {
      console.warn('[MemoryRetrieval] Invalid direction:', row.direction);
      return null;
    }

    // Normalize direction to YES/NO/NEUTRAL format
    let normalizedDirection: 'YES' | 'NO' | 'NEUTRAL';
    if (row.direction === 'LONG_YES' || row.direction === 'YES') {
      normalizedDirection = 'YES';
    } else if (row.direction === 'LONG_NO' || row.direction === 'NO') {
      normalizedDirection = 'NO';
    } else {
      normalizedDirection = 'NEUTRAL';
    }

    // Parse key_drivers from JSON
    let keyDrivers: string[] = [];
    if (row.key_drivers) {
      try {
        if (Array.isArray(row.key_drivers)) {
          keyDrivers = row.key_drivers;
        } else if (typeof row.key_drivers === 'string') {
          keyDrivers = JSON.parse(row.key_drivers);
        }
      } catch (error) {
        console.warn('[MemoryRetrieval] Failed to parse key_drivers:', error);
        keyDrivers = [];
      }
    }

    // Parse metadata from JSON
    let metadata: Record<string, unknown> = {};
    if (row.metadata) {
      try {
        if (typeof row.metadata === 'object' && !Array.isArray(row.metadata)) {
          metadata = row.metadata;
        } else if (typeof row.metadata === 'string') {
          metadata = JSON.parse(row.metadata);
        }
      } catch (error) {
        console.warn('[MemoryRetrieval] Failed to parse metadata:', error);
        metadata = {};
      }
    }

    return {
      agentName: row.agent_name,
      marketId: row.market_id,
      timestamp: new Date(row.created_at),
      direction: normalizedDirection,
      fairProbability: row.fair_probability ?? 0,
      confidence: row.confidence ?? 0,
      keyDrivers,
      metadata,
    };
  }
}

/**
 * Create a memory retrieval service instance
 */
export function createMemoryRetrievalService(
  supabaseManager: SupabaseClientManager
): MemoryRetrievalService {
  return new MemoryRetrievalServiceImpl(supabaseManager);
}
