# Agent Memory System - Usage Examples

This document provides practical examples of using the Agent Memory System in various scenarios.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Programmatic Access](#programmatic-access)
- [Custom Memory Formatting](#custom-memory-formatting)
- [Evolution Tracking](#evolution-tracking)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Advanced Scenarios](#advanced-scenarios)

## Basic Usage

### Enable and Run Analysis

The simplest way to use the memory system:

```bash
# 1. Enable in .env
echo "MEMORY_SYSTEM_ENABLED=true" >> .env

# 2. Run analysis (first time - no history)
npm run cli -- analyze 0x1234567890abcdef

# 3. Run again (agents now have historical context)
npm run cli -- analyze 0x1234567890abcdef

# 4. View with debug output
npm run cli -- analyze 0x1234567890abcdef --debug
```

### Check Memory Retrieval Status

```bash
# Run with debug to see memory retrieval details
npm run cli -- analyze 0x1234567890abcdef --debug | grep "memory_retrieval"

# Expected output:
# ✓ memory_retrieval: success=true, agentsWithHistory=3, duration=45ms
```

## Programmatic Access

### Retrieve Memory for a Single Agent

```typescript
import { createMemoryRetrievalService } from './src/database/memory-retrieval.js';
import { createSupabaseClientManager } from './src/database/index.js';

async function getAgentHistory() {
  // Setup
  const manager = createSupabaseClientManager();
  await manager.connect();
  const memoryService = createMemoryRetrievalService(manager);

  // Retrieve memory
  const memory = await memoryService.getAgentMemory(
    'Market Microstructure Agent',
    '0x1234567890abcdef',
    3  // Last 3 signals
  );

  // Check results
  if (memory.hasHistory) {
    console.log(`Found ${memory.historicalSignals.length} historical signals`);
    
    memory.historicalSignals.forEach((signal, index) => {
      console.log(`\nSignal ${index + 1}:`);
      console.log(`  Timestamp: ${signal.timestamp.toISOString()}`);
      console.log(`  Direction: ${signal.direction}`);
      console.log(`  Fair Probability: ${(signal.fairProbability * 100).toFixed(1)}%`);
      console.log(`  Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
      console.log(`  Key Drivers: ${signal.keyDrivers.join(', ')}`);
    });
  } else {
    console.log('No historical signals found');
  }

  // Cleanup
  await manager.disconnect();
}

getAgentHistory();
```

### Retrieve Memory for All Agents

```typescript
import { createMemoryRetrievalService } from './src/database/memory-retrieval.js';
import { createSupabaseClientManager } from './src/database/index.js';

async function getAllAgentHistories() {
  const manager = createSupabaseClientManager();
  await manager.connect();
  const memoryService = createMemoryRetrievalService(manager);

  const agentNames = [
    'Market Microstructure Agent',
    'Probability Baseline Agent',
    'Risk Assessment Agent'
  ];

  // Retrieve all memories in parallel
  const allMemories = await memoryService.getAllAgentMemories(
    '0x1234567890abcdef',
    agentNames,
    3
  );

  // Process results
  allMemories.forEach((memory, agentName) => {
    console.log(`\n${agentName}:`);
    console.log(`  Has history: ${memory.hasHistory}`);
    console.log(`  Signal count: ${memory.historicalSignals.length}`);
  });

  await manager.disconnect();
}

getAllAgentHistories();
```

## Custom Memory Formatting

### Format with Different Options

```typescript
import { formatMemoryContext } from './src/utils/memory-formatter.js';
import type { AgentMemoryContext } from './src/database/memory-retrieval.js';

function demonstrateFormatting(memory: AgentMemoryContext) {
  // 1. Human-readable format (default)
  const humanFormat = formatMemoryContext(memory, {
    maxLength: 1000,
    dateFormat: 'human',
    includeMetadata: false
  });
  console.log('Human format:', humanFormat.text);

  // 2. ISO timestamp format
  const isoFormat = formatMemoryContext(memory, {
    maxLength: 1000,
    dateFormat: 'iso',
    includeMetadata: false
  });
  console.log('\nISO format:', isoFormat.text);

  // 3. Relative time format
  const relativeFormat = formatMemoryContext(memory, {
    maxLength: 1000,
    dateFormat: 'relative',
    includeMetadata: false
  });
  console.log('\nRelative format:', relativeFormat.text);

  // 4. With metadata
  const withMetadata = formatMemoryContext(memory, {
    maxLength: 2000,
    dateFormat: 'human',
    includeMetadata: true
  });
  console.log('\nWith metadata:', withMetadata.text);

  // 5. Compact format (shorter)
  const compact = formatMemoryContext(memory, {
    maxLength: 500,
    dateFormat: 'relative',
    includeMetadata: false
  });
  console.log('\nCompact format:', compact.text);
  console.log('Truncated:', compact.truncated);
}
```

### Custom Formatting Function

```typescript
import type { HistoricalSignal } from './src/database/memory-retrieval.js';

function customFormat(signals: HistoricalSignal[]): string {
  if (signals.length === 0) {
    return 'No previous analysis available.';
  }

  let output = `You have analyzed this market ${signals.length} times before.\n\n`;

  // Show only the most recent signal in detail
  const latest = signals[0];
  output += `Most Recent Analysis (${latest.timestamp.toLocaleDateString()}):\n`;
  output += `  Your view: ${latest.direction} at ${(latest.fairProbability * 100).toFixed(0)}%\n`;
  output += `  Confidence: ${(latest.confidence * 100).toFixed(0)}%\n\n`;

  // Show trend
  if (signals.length > 1) {
    const previous = signals[1];
    const probChange = latest.fairProbability - previous.fairProbability;
    const confChange = latest.confidence - previous.confidence;

    output += `Changes since previous analysis:\n`;
    output += `  Probability: ${probChange > 0 ? '+' : ''}${(probChange * 100).toFixed(1)}%\n`;
    output += `  Confidence: ${confChange > 0 ? '+' : ''}${(confChange * 100).toFixed(1)}%\n`;
  }

  return output;
}
```

## Evolution Tracking

### Track Signal Evolution

```typescript
import { EvolutionTrackerImpl } from './src/utils/evolution-tracker.js';
import type { AgentSignal } from './src/models/types.js';
import type { HistoricalSignal } from './src/database/memory-retrieval.js';

async function trackEvolution(
  newSignal: AgentSignal,
  historicalSignals: HistoricalSignal[]
) {
  const tracker = new EvolutionTrackerImpl();
  
  // Detect evolution events
  const events = tracker.trackEvolution(newSignal, historicalSignals);

  // Process events
  if (events.length === 0) {
    console.log('No significant changes detected');
  } else {
    console.log(`Detected ${events.length} evolution events:`);
    
    events.forEach(event => {
      console.log(`\n${event.type}:`);
      console.log(`  Description: ${event.description}`);
      console.log(`  Magnitude: ${event.magnitude.toFixed(2)}`);
      console.log(`  Previous: ${JSON.stringify(event.previousValue)}`);
      console.log(`  Current: ${JSON.stringify(event.currentValue)}`);
    });
  }

  return events;
}

// Example usage
const newSignal: AgentSignal = {
  agentName: 'Market Microstructure Agent',
  timestamp: Date.now(),
  direction: 'NO',  // Changed from YES
  fairProbability: 0.35,  // Changed from 0.65
  confidence: 0.80,
  keyDrivers: ['New polling data', 'Market sentiment shift']
};

const historicalSignals: HistoricalSignal[] = [{
  agentName: 'Market Microstructure Agent',
  marketId: '0x1234567890abcdef',
  timestamp: new Date('2025-01-15'),
  direction: 'YES',
  fairProbability: 0.65,
  confidence: 0.75,
  keyDrivers: ['Strong momentum', 'Historical precedent'],
  metadata: {}
}];

trackEvolution(newSignal, historicalSignals);
// Output:
// Detected 2 evolution events:
//
// direction_change:
//   Description: Direction changed from YES to NO
//   Magnitude: 1.00
//   Previous: "YES"
//   Current: "NO"
//
// probability_shift:
//   Description: Fair probability shifted by 30.0%
//   Magnitude: 0.30
//   Previous: 0.65
//   Current: 0.35
```

### Log Evolution Events

```typescript
import { EvolutionTrackerImpl } from './src/utils/evolution-tracker.js';

function logEvolutionEvents(events: EvolutionEvent[]) {
  // Add to audit log
  const auditEntry = {
    stage: 'evolution_tracking',
    timestamp: Date.now(),
    data: {
      eventCount: events.length,
      events: events.map(e => ({
        type: e.type,
        description: e.description,
        magnitude: e.magnitude
      }))
    }
  };

  console.log('Evolution audit entry:', JSON.stringify(auditEntry, null, 2));
}
```

## Error Handling

### Handle Memory Retrieval Errors

```typescript
import { createMemoryRetrievalService } from './src/database/memory-retrieval.js';
import { createSupabaseClientManager } from './src/database/index.js';

async function safeMemoryRetrieval(agentName: string, marketId: string) {
  const manager = createSupabaseClientManager();
  
  try {
    await manager.connect();
    const memoryService = createMemoryRetrievalService(manager);

    // Set timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );

    const memoryPromise = memoryService.getAgentMemory(agentName, marketId);

    // Race between memory retrieval and timeout
    const memory = await Promise.race([memoryPromise, timeoutPromise]);

    return memory;
  } catch (error) {
    console.error('Memory retrieval failed:', error);
    
    // Return empty context (graceful degradation)
    return {
      agentName,
      marketId,
      historicalSignals: [],
      hasHistory: false
    };
  } finally {
    await manager.disconnect();
  }
}
```

### Retry Logic

```typescript
async function memoryRetrievalWithRetry(
  agentName: string,
  marketId: string,
  maxRetries: number = 3
) {
  const manager = createSupabaseClientManager();
  await manager.connect();
  const memoryService = createMemoryRetrievalService(manager);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const memory = await memoryService.getAgentMemory(agentName, marketId);
      console.log(`Memory retrieval succeeded on attempt ${attempt}`);
      return memory;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Exponential backoff
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed - return empty context
  console.error('All retry attempts failed:', lastError);
  return {
    agentName,
    marketId,
    historicalSignals: [],
    hasHistory: false
  };
}
```

## Testing

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryRetrievalService } from './src/database/memory-retrieval.js';
import { createSupabaseClientManager } from './src/database/index.js';

describe('Memory Retrieval', () => {
  let manager: SupabaseClientManager;
  let memoryService: MemoryRetrievalService;

  beforeEach(async () => {
    manager = createSupabaseClientManager();
    await manager.connect();
    memoryService = createMemoryRetrievalService(manager);
  });

  afterEach(async () => {
    await manager.disconnect();
  });

  it('should retrieve historical signals', async () => {
    const memory = await memoryService.getAgentMemory(
      'Market Microstructure Agent',
      '0x1234567890abcdef',
      3
    );

    expect(memory).toBeDefined();
    expect(memory.agentName).toBe('Market Microstructure Agent');
    expect(memory.marketId).toBe('0x1234567890abcdef');
    expect(Array.isArray(memory.historicalSignals)).toBe(true);
  });

  it('should return empty context when no history exists', async () => {
    const memory = await memoryService.getAgentMemory(
      'Nonexistent Agent',
      'nonexistent-market',
      3
    );

    expect(memory.hasHistory).toBe(false);
    expect(memory.historicalSignals).toHaveLength(0);
  });

  it('should limit results to specified count', async () => {
    const memory = await memoryService.getAgentMemory(
      'Market Microstructure Agent',
      '0x1234567890abcdef',
      2
    );

    expect(memory.historicalSignals.length).toBeLessThanOrEqual(2);
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { analyzeMarket } from './src/workflow.js';

describe('Memory System Integration', () => {
  it('should include memory context in workflow', async () => {
    // First analysis (no history)
    const result1 = await analyzeMarket('0x1234567890abcdef');
    
    const memoryLog1 = result1.auditLog.find(
      entry => entry.stage === 'memory_retrieval'
    );
    expect(memoryLog1?.data.agentsWithHistory).toBe(0);

    // Second analysis (with history)
    const result2 = await analyzeMarket('0x1234567890abcdef');
    
    const memoryLog2 = result2.auditLog.find(
      entry => entry.stage === 'memory_retrieval'
    );
    expect(memoryLog2?.data.agentsWithHistory).toBeGreaterThan(0);
  });
});
```

## Advanced Scenarios

### Custom Memory Window

```typescript
// Retrieve signals from last 7 days instead of last 3 signals
async function getRecentMemory(agentName: string, marketId: string) {
  const manager = createSupabaseClientManager();
  await manager.connect();
  const client = manager.getClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await client
    .from('agent_signals')
    .select('*')
    .eq('agent_name', agentName)
    .eq('market_id', marketId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Query failed:', error);
    return [];
  }

  return data || [];
}
```

### Memory Summarization

```typescript
// Summarize long memory history into key points
function summarizeMemory(signals: HistoricalSignal[]): string {
  if (signals.length === 0) {
    return 'No previous analysis available.';
  }

  const latest = signals[0];
  const oldest = signals[signals.length - 1];

  // Calculate trends
  const probTrend = latest.fairProbability - oldest.fairProbability;
  const confTrend = latest.confidence - oldest.confidence;

  // Count direction changes
  let directionChanges = 0;
  for (let i = 1; i < signals.length; i++) {
    if (signals[i].direction !== signals[i - 1].direction) {
      directionChanges++;
    }
  }

  return `
Summary of ${signals.length} previous analyses:

Current View: ${latest.direction} at ${(latest.fairProbability * 100).toFixed(0)}%
Probability Trend: ${probTrend > 0 ? '+' : ''}${(probTrend * 100).toFixed(1)}%
Confidence Trend: ${confTrend > 0 ? '+' : ''}${(confTrend * 100).toFixed(1)}%
Direction Changes: ${directionChanges}

Latest Key Drivers:
${latest.keyDrivers.map(d => `• ${d}`).join('\n')}
  `.trim();
}
```

### Cross-Agent Memory Analysis

```typescript
// Compare memory across multiple agents
async function compareAgentMemories(marketId: string) {
  const manager = createSupabaseClientManager();
  await manager.connect();
  const memoryService = createMemoryRetrievalService(manager);

  const agentNames = [
    'Market Microstructure Agent',
    'Probability Baseline Agent',
    'Risk Assessment Agent'
  ];

  const allMemories = await memoryService.getAllAgentMemories(
    marketId,
    agentNames,
    3
  );

  // Analyze consensus
  const latestSignals = Array.from(allMemories.values())
    .filter(m => m.hasHistory)
    .map(m => m.historicalSignals[0]);

  if (latestSignals.length === 0) {
    console.log('No historical signals to compare');
    return;
  }

  // Calculate average probability
  const avgProb = latestSignals.reduce((sum, s) => sum + s.fairProbability, 0) / latestSignals.length;

  // Check for consensus
  const directions = latestSignals.map(s => s.direction);
  const hasConsensus = directions.every(d => d === directions[0]);

  console.log(`\nCross-Agent Analysis:`);
  console.log(`  Average Probability: ${(avgProb * 100).toFixed(1)}%`);
  console.log(`  Direction Consensus: ${hasConsensus ? 'Yes' : 'No'}`);
  console.log(`  Agents with History: ${latestSignals.length}/${agentNames.length}`);

  await manager.disconnect();
}
```

## Best Practices

1. **Always handle errors gracefully** - Memory retrieval should never fail the workflow
2. **Use timeouts** - Prevent slow queries from blocking execution
3. **Limit signal count** - Keep memory context concise (3-5 signals)
4. **Format appropriately** - Choose format based on LLM and use case
5. **Monitor performance** - Track memory retrieval latency in audit logs
6. **Test thoroughly** - Verify behavior with and without historical signals
7. **Document changes** - Log evolution events for debugging and analysis

## Related Documentation

- [Memory System Configuration](../src/database/MEMORY_SYSTEM_CONFIG.md)
- [Quick Start Guide](./MEMORY_SYSTEM_QUICK_START.md)
- [Design Document](../.kiro/specs/agent-memory-system/design.md)
- [Database Module README](../src/database/README.md)
