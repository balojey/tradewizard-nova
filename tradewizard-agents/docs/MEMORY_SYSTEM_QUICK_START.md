# Agent Memory System - Quick Start Guide

## 5-Minute Setup

### 1. Enable the Memory System

Add to your `.env` file:

```bash
MEMORY_SYSTEM_ENABLED=true
```

That's it! The memory system is now active.

### 2. Run Your First Analysis

```bash
npm run cli -- analyze 0x1234567890abcdef
```

The first time you analyze a market, agents won't have historical context. Run it again:

```bash
npm run cli -- analyze 0x1234567890abcdef
```

Now agents will reference their previous analysis!

### 3. Check the Results

Look for memory context in the audit log:

```bash
npm run cli -- analyze 0x1234567890abcdef --debug
```

Search for the `memory_retrieval` stage in the output.

## Common Tasks

### Check if Memory System is Working

```bash
# Run analysis with debug output
npm run cli -- analyze <conditionId> --debug

# Look for this in the output:
# ✓ Memory retrieval: 3 agents with history
```

### View Historical Signals

```typescript
import { createMemoryRetrievalService } from './src/database/memory-retrieval';
import { createSupabaseClientManager } from './src/database';

const manager = createSupabaseClientManager();
await manager.connect();

const memoryService = createMemoryRetrievalService(manager);
const memory = await memoryService.getAgentMemory(
  'Market Microstructure Agent',
  '0x1234567890abcdef'
);

console.log(memory.historicalSignals);
```

### Disable Memory System

```bash
# In .env
MEMORY_SYSTEM_ENABLED=false
```

Agents will continue to work normally without historical context.

## Configuration Options

```bash
# .env

# Enable/disable (default: false)
MEMORY_SYSTEM_ENABLED=true

# Number of historical signals per agent (default: 3, max: 5)
MEMORY_MAX_SIGNALS_PER_AGENT=3

# Query timeout in milliseconds (default: 5000)
MEMORY_QUERY_TIMEOUT_MS=5000

# Retry attempts for rate limits (default: 3)
MEMORY_RETRY_ATTEMPTS=3
```

## What Agents See

When agents have historical signals, they see:

```
## Your Previous Analysis

Previous Analysis History (3 signals):

Analysis from Jan 15, 2025 14:30 UTC:
  Direction: YES
  Fair Probability: 65.0%
  Confidence: 75.0%
  Key Drivers:
    • Strong polling momentum
    • Historical precedent favors outcome
    • Market sentiment shifting

[... more signals ...]

## Instructions for Using Memory Context

1. Review your previous analysis before generating new analysis
2. Identify what has changed since your last analysis
3. If your view has changed, explain the reasoning
4. If your view remains consistent, acknowledge continuity
5. Reference specific changes when relevant
```

## Troubleshooting

### Memory retrieval returns empty context

**Check 1**: Is the feature enabled?
```bash
echo $MEMORY_SYSTEM_ENABLED  # Should be "true"
```

**Check 2**: Do historical signals exist?
```sql
SELECT COUNT(*) FROM agent_signals 
WHERE market_id = 'your-market-id';
```

**Check 3**: Are database indexes present?
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'agent_signals';
-- Should see: idx_agent_signals_market_id, idx_agent_signals_agent_name
```

### Memory retrieval is slow

**Solution**: Verify indexes exist (see Check 3 above)

If missing, create them:
```sql
CREATE INDEX IF NOT EXISTS idx_agent_signals_market_id 
ON agent_signals(market_id);

CREATE INDEX IF NOT EXISTS idx_agent_signals_agent_name 
ON agent_signals(agent_name);
```

### Database connection errors

**Check connection**:
```bash
npm run cli -- checkpoint <conditionId>
```

**Verify credentials**:
```bash
echo $SUPABASE_URL
echo $SUPABASE_KEY
```

## Benefits

- ✅ **Consistency**: Agents maintain consistent reasoning over time
- ✅ **Explainability**: Agents explain changes in their analysis
- ✅ **Context**: Agents understand market evolution
- ✅ **Quality**: Better analysis through continuity

## Next Steps

- Read the [Complete Configuration Guide](../src/database/MEMORY_SYSTEM_CONFIG.md)
- Review the [Design Document](../.kiro/specs/agent-memory-system/design.md)
- Check the [Requirements](../.kiro/specs/agent-memory-system/requirements.md)

## Support

For detailed troubleshooting, see:
- [Memory System Configuration](../src/database/MEMORY_SYSTEM_CONFIG.md#troubleshooting)
- [Database Module README](../src/database/README.md)

## Key Points

1. **Zero Migration Required**: Works with existing database schema
2. **Graceful Degradation**: Never fails the workflow
3. **Feature Flag**: Easy to enable/disable
4. **Backward Compatible**: Existing code works unchanged
5. **Performance**: Adds < 100ms to analysis time
