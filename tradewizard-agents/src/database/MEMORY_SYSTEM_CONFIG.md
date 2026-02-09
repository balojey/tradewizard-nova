# Agent Memory System Configuration

## Overview

The Agent Memory System enables agents to access and reference their previous analysis outputs for the same market, transforming TradeWizard from an open-loop to a closed-loop system. This feature is controlled by a feature flag and can be configured via environment variables.

## Feature Flag

The memory system is **disabled by default** and must be explicitly enabled via configuration.

### Environment Variable

```bash
MEMORY_SYSTEM_ENABLED=true
```

Set this to `true` to enable the memory system. When disabled, agents operate without historical context (existing behavior).

## Configuration Options

### 1. Enable/Disable Memory System

**Environment Variable:** `MEMORY_SYSTEM_ENABLED`  
**Type:** Boolean  
**Default:** `false`  
**Description:** Master switch for the entire memory system. When disabled, all memory retrieval is skipped and agents receive empty memory context.

**Example:**
```bash
# Enable memory system
MEMORY_SYSTEM_ENABLED=true

# Disable memory system (default)
MEMORY_SYSTEM_ENABLED=false
```

### 2. Maximum Signals Per Agent

**Environment Variable:** `MEMORY_SYSTEM_MAX_SIGNALS_PER_AGENT`  
**Type:** Integer (1-10)  
**Default:** `3`  
**Description:** Maximum number of historical signals to retrieve per agent-market combination. Higher values provide more context but increase query time and memory usage.

**Example:**
```bash
# Retrieve last 5 signals per agent
MEMORY_SYSTEM_MAX_SIGNALS_PER_AGENT=5

# Retrieve only the most recent signal
MEMORY_SYSTEM_MAX_SIGNALS_PER_AGENT=1
```

**Recommendations:**
- **Development/Testing:** 3-5 signals for comprehensive context
- **Production:** 3 signals (balances context with performance)
- **High-frequency markets:** 1-2 signals to minimize latency

### 3. Query Timeout

**Environment Variable:** `MEMORY_SYSTEM_QUERY_TIMEOUT_MS`  
**Type:** Integer (milliseconds)  
**Default:** `5000` (5 seconds)  
**Description:** Maximum time to wait for memory retrieval before timing out. Prevents slow database queries from blocking the workflow.

**Example:**
```bash
# Increase timeout for slower databases
MEMORY_SYSTEM_QUERY_TIMEOUT_MS=10000

# Decrease timeout for faster response
MEMORY_SYSTEM_QUERY_TIMEOUT_MS=3000
```

**Recommendations:**
- **Development:** 5000ms (5 seconds) - allows for debugging
- **Production:** 5000ms (5 seconds) - balances reliability with performance
- **High-performance:** 3000ms (3 seconds) - faster failover

### 4. Retry Attempts

**Environment Variable:** `MEMORY_SYSTEM_RETRY_ATTEMPTS`  
**Type:** Integer (0-5)  
**Default:** `3`  
**Description:** Number of retry attempts for rate limit errors. Uses exponential backoff between retries.

**Example:**
```bash
# More aggressive retry strategy
MEMORY_SYSTEM_RETRY_ATTEMPTS=5

# No retries (fail fast)
MEMORY_SYSTEM_RETRY_ATTEMPTS=0
```

**Recommendations:**
- **Development:** 3 retries (good balance)
- **Production:** 3 retries (handles transient failures)
- **Rate-limited environments:** 5 retries with longer timeout

## Complete Configuration Example

### Development Environment

```bash
# .env.development
MEMORY_SYSTEM_ENABLED=true
MEMORY_SYSTEM_MAX_SIGNALS_PER_AGENT=5
MEMORY_SYSTEM_QUERY_TIMEOUT_MS=10000
MEMORY_SYSTEM_RETRY_ATTEMPTS=3
```

### Production Environment

```bash
# .env.production
MEMORY_SYSTEM_ENABLED=true
MEMORY_SYSTEM_MAX_SIGNALS_PER_AGENT=3
MEMORY_SYSTEM_QUERY_TIMEOUT_MS=5000
MEMORY_SYSTEM_RETRY_ATTEMPTS=3
```

### Disabled (Default)

```bash
# .env
MEMORY_SYSTEM_ENABLED=false
# Other settings are ignored when disabled
```

## Rollout Strategy

### Phase 1: Testing (Memory System Disabled)
```bash
MEMORY_SYSTEM_ENABLED=false
```
- Deploy code with feature flag disabled
- Monitor for regressions in existing functionality
- Validate that agents continue to work normally

### Phase 2: Pilot (10% of Markets)
```bash
MEMORY_SYSTEM_ENABLED=true
MEMORY_SYSTEM_MAX_SIGNALS_PER_AGENT=3
MEMORY_SYSTEM_QUERY_TIMEOUT_MS=5000
MEMORY_SYSTEM_RETRY_ATTEMPTS=3
```
- Enable for a small subset of markets
- Monitor performance metrics (latency, error rate)
- Validate memory context quality

### Phase 3: Gradual Rollout (50% of Markets)
- Same configuration as Phase 2
- Expand to half of all markets
- Continue monitoring and validation

### Phase 4: Full Production (100% of Markets)
- Same configuration as Phase 2
- Enable for all markets
- Full production rollout

## Monitoring

### Key Metrics to Track

1. **Memory Retrieval Latency**
   - Target: <100ms (p95)
   - Alert: >200ms (p95)

2. **Memory Retrieval Error Rate**
   - Target: <1%
   - Alert: >5%

3. **Memory Context Size**
   - Average: 2-5 KB per agent
   - Maximum: 12.5 KB per agent

4. **Evolution Event Frequency**
   - Track direction changes, probability shifts, confidence changes

### Audit Log Fields

When memory retrieval runs, it logs the following information:

```typescript
{
  stage: 'memory_retrieval',
  timestamp: number,
  data: {
    success: boolean,
    marketId?: string,
    totalAgents?: number,
    agentsWithHistory?: number,
    totalSignals?: number,
    maxSignalsPerAgent?: number,
    queryTimeoutMs?: number,
    duration: number,
    error?: string,
    reason?: string
  }
}
```

## Troubleshooting

### Memory System Not Working

**Symptom:** Agents don't reference previous analysis

**Check:**
1. Verify `MEMORY_SYSTEM_ENABLED=true` in environment
2. Check audit logs for memory retrieval stage
3. Verify database connectivity
4. Check that historical signals exist in `agent_signals` table

### High Latency

**Symptom:** Workflow execution is slower than expected

**Solutions:**
1. Reduce `MEMORY_SYSTEM_MAX_SIGNALS_PER_AGENT` to 1-2
2. Decrease `MEMORY_SYSTEM_QUERY_TIMEOUT_MS` to 3000ms
3. Verify database indexes exist on `agent_signals` table
4. Check database query performance

### Frequent Timeouts

**Symptom:** Memory retrieval frequently times out

**Solutions:**
1. Increase `MEMORY_SYSTEM_QUERY_TIMEOUT_MS` to 10000ms
2. Optimize database queries and indexes
3. Check database connection pool settings
4. Consider reducing `MEMORY_SYSTEM_MAX_SIGNALS_PER_AGENT`

### Rate Limit Errors

**Symptom:** Supabase rate limit errors in logs

**Solutions:**
1. Increase `MEMORY_SYSTEM_RETRY_ATTEMPTS` to 5
2. Increase `MEMORY_SYSTEM_QUERY_TIMEOUT_MS` to allow for retries
3. Implement request throttling at application level
4. Upgrade Supabase plan for higher rate limits

## Rollback Procedure

If issues arise after enabling the memory system:

1. **Immediate Rollback:**
   ```bash
   MEMORY_SYSTEM_ENABLED=false
   ```
   - No code deployment required
   - Agents continue functioning with empty memory context
   - No data loss or corruption

2. **Investigate Issues:**
   - Review audit logs for error patterns
   - Check database performance metrics
   - Validate memory context quality

3. **Fix and Re-enable:**
   - Address identified issues
   - Test in development environment
   - Re-enable with `MEMORY_SYSTEM_ENABLED=true`

## Performance Impact

### Expected Latency Impact

- **Memory Retrieval:** 35-75ms (with indexes)
- **Total Workflow Impact:** <100ms (target)
- **Parallel Retrieval:** All agents fetched concurrently

### Database Load

- **Queries per Analysis:** 4 (one per agent)
- **Queries per Hour (100 analyses):** 400
- **Storage Growth:** ~400 rows/day, 146K rows/year

### Memory Overhead

- **Per Agent:** 2-5 KB (average), 12.5 KB (maximum)
- **Total (4 agents):** 10-50 KB per workflow execution

## Security Considerations

### Data Access Control

- Leverage Supabase Row-Level Security (RLS) policies
- Agents can only access signals for authorized markets
- API keys stored in environment variables, never in code

### Data Privacy

- No personally identifiable information (PII) in agent signals
- All data is market analysis metadata
- Consider implementing 180-day retention policy

### Audit Trail

- All memory retrieval operations logged
- Full traceability for debugging and compliance
- Includes success/failure status and error details

## Additional Resources

- [Design Document](../.kiro/specs/agent-memory-system/design.md)
- [Requirements Document](../.kiro/specs/agent-memory-system/requirements.md)
- [Implementation Tasks](../.kiro/specs/agent-memory-system/tasks.md)
