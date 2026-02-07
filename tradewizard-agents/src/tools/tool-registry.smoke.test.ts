/**
 * Smoke test for tool registry
 *
 * This test verifies that the tool registry exports work correctly
 * and that tools can be created with proper structure.
 */

import { describe, it, expect } from 'vitest';
import { createPollingTools } from './index.js';
import type { ToolContext } from './index.js';
import { ToolCache } from '../utils/tool-cache.js';
import { createPolymarketClient } from '../utils/polymarket-client.js';
import { loadConfig } from '../config/index.js';

describe('Tool Registry', () => {
  it('should export createPollingTools function', () => {
    expect(createPollingTools).toBeDefined();
    expect(typeof createPollingTools).toBe('function');
  });

  it('should create an array of tools', () => {
    const config = loadConfig();
    const polymarketClient = createPolymarketClient(config.polymarket);
    const cache = new ToolCache('test-session');
    const auditLog: any[] = [];

    const context: ToolContext = {
      polymarketClient,
      cache,
      auditLog,
    };

    const tools = createPollingTools(context);

    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBe(5);
  });

  it('should create tools with correct names', () => {
    const config = loadConfig();
    const polymarketClient = createPolymarketClient(config.polymarket);
    const cache = new ToolCache('test-session');
    const auditLog: any[] = [];

    const context: ToolContext = {
      polymarketClient,
      cache,
      auditLog,
    };

    const tools = createPollingTools(context);
    const toolNames = tools.map(tool => tool.name);

    expect(toolNames).toContain('fetchRelatedMarkets');
    expect(toolNames).toContain('fetchHistoricalPrices');
    expect(toolNames).toContain('fetchCrossMarketData');
    expect(toolNames).toContain('analyzeMarketMomentum');
    expect(toolNames).toContain('detectSentimentShifts');
  });

  it('should create tools with descriptions', () => {
    const config = loadConfig();
    const polymarketClient = createPolymarketClient(config.polymarket);
    const cache = new ToolCache('test-session');
    const auditLog: any[] = [];

    const context: ToolContext = {
      polymarketClient,
      cache,
      auditLog,
    };

    const tools = createPollingTools(context);

    for (const tool of tools) {
      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it('should create tools with schemas', () => {
    const config = loadConfig();
    const polymarketClient = createPolymarketClient(config.polymarket);
    const cache = new ToolCache('test-session');
    const auditLog: any[] = [];

    const context: ToolContext = {
      polymarketClient,
      cache,
      auditLog,
    };

    const tools = createPollingTools(context);

    for (const tool of tools) {
      expect(tool.schema).toBeDefined();
      expect(typeof tool.schema).toBe('object');
    }
  });

  it('should create tools with func property', () => {
    const config = loadConfig();
    const polymarketClient = createPolymarketClient(config.polymarket);
    const cache = new ToolCache('test-session');
    const auditLog: any[] = [];

    const context: ToolContext = {
      polymarketClient,
      cache,
      auditLog,
    };

    const tools = createPollingTools(context);

    for (const tool of tools) {
      expect(tool.func).toBeDefined();
      expect(typeof tool.func).toBe('function');
    }
  });
});
