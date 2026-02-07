/**
 * Tool Cache
 *
 * Provides session-scoped caching for tool results to avoid redundant API calls
 * within a single analysis session.
 *
 * Requirements: 1.6, 13.3, 13.4, 13.5
 */

// ============================================================================
// Types
// ============================================================================

export interface CacheEntry {
  result: any;
  timestamp: number;
  params: any;
}

export interface CacheStats {
  hits: number;
  misses: number;
}

// ============================================================================
// Tool Cache Class
// ============================================================================

/**
 * Session-scoped cache for tool results
 *
 * The cache is scoped to a single analysis session (identified by sessionId)
 * and expires when the analysis completes. This prevents redundant API calls
 * for the same tool with identical parameters within a session.
 */
export class ToolCache {
  private cache: Map<string, CacheEntry> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private sessionId: string;

  /**
   * Create a new ToolCache instance
   *
   * @param sessionId - Unique identifier for the analysis session (e.g., conditionId)
   */
  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Generate cache key from tool name and parameters
   *
   * @param toolName - Name of the tool
   * @param params - Tool parameters
   * @returns Cache key string
   */
  private generateCacheKey(toolName: string, params: any): string {
    // Sort object keys for consistent key generation
    const sortedParams = this.sortObject(params);
    return `${toolName}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Sort object keys recursively for consistent serialization
   *
   * @param obj - Object to sort
   * @returns Sorted object
   */
  private sortObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObject(item));
    }

    const sorted: Record<string, any> = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      sorted[key] = this.sortObject(obj[key]);
    }

    return sorted;
  }

  /**
   * Get cached result for a tool call
   *
   * @param toolName - Name of the tool
   * @param params - Tool parameters
   * @returns Cached result or null if not found
   */
  get(toolName: string, params: any): any | null {
    const key = this.generateCacheKey(toolName, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.result;
  }

  /**
   * Store tool result in cache
   *
   * @param toolName - Name of the tool
   * @param params - Tool parameters
   * @param result - Tool result to cache
   */
  set(toolName: string, params: any, result: any): void {
    const key = this.generateCacheKey(toolName, params);

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      params,
    });
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   *
   * @returns Object with hits and misses counts
   */
  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * Get session ID
   *
   * @returns Session ID string
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get cache size (number of entries)
   *
   * @returns Number of cached entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if a tool call result is cached
   *
   * @param toolName - Name of the tool
   * @param params - Tool parameters
   * @returns True if cached, false otherwise
   */
  has(toolName: string, params: any): boolean {
    const key = this.generateCacheKey(toolName, params);
    return this.cache.has(key);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new ToolCache instance
 *
 * @param sessionId - Unique identifier for the analysis session
 * @returns ToolCache instance
 */
export function createToolCache(sessionId: string): ToolCache {
  return new ToolCache(sessionId);
}
