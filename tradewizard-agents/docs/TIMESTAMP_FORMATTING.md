# Human-Readable Timestamp Formatting

> Converting ISO 8601 timestamps to natural language for AI agent consumption

## Overview

The Human-Readable Timestamp Formatting feature converts ISO 8601 timestamps to natural language format when presenting data to LLM agents. This improves agent comprehension of temporal context without requiring parsing overhead.

**Key Benefits:**
- ✅ Improved agent understanding of temporal relationships
- ✅ Reduced cognitive load on LLM agents
- ✅ Better analysis quality through clearer time context
- ✅ Zero impact on existing data structures or database schemas
- ✅ Backward compatible with feature flag support

## Quick Start

### Basic Usage

The timestamp formatting is automatically applied when constructing agent context:

```typescript
import { formatMarketContextForAgent } from './utils/agent-context-formatter.js';

// Format complete market context for an agent
const context = formatMarketContextForAgent(state, 'NewsAgent');

// Context now contains human-readable timestamps:
// "Market Expires: January 20, 2025 at 11:59 PM EST"
// "Latest news: 2 hours ago"
// "Previous analysis: 1 day ago"
```

### Format Individual Timestamps

```typescript
import { formatTimestamp } from './utils/timestamp-formatter.js';

// Recent timestamp (< 7 days) - uses relative format
const recent = formatTimestamp('2024-01-15T15:30:00Z');
console.log(recent.formatted); // => "2 hours ago"

// Older timestamp (>= 7 days) - uses absolute format
const older = formatTimestamp('2024-01-01T15:30:00Z');
console.log(older.formatted); // => "January 1, 2024 at 3:30 PM EST"
```

## Configuration

### Environment Variables

Configure timestamp formatting behavior through environment variables:

```bash
# Enable/disable human-readable timestamps (default: true)
ENABLE_HUMAN_READABLE_TIMESTAMPS=true

# Timezone for absolute time formatting (default: America/New_York)
TIMESTAMP_TIMEZONE=America/New_York

# Threshold for relative vs absolute format in days (default: 7)
RELATIVE_TIME_THRESHOLD_DAYS=7
```

### Runtime Configuration

Override configuration at runtime:

```typescript
import { setConfig, getConfig, resetConfig } from './utils/timestamp-formatter.js';

// Disable formatting globally (fallback to ISO 8601)
setConfig({ enabled: false });

// Change timezone to Pacific Time
setConfig({ timezone: 'America/Los_Angeles' });

// Adjust relative time threshold to 14 days
setConfig({ relativeThresholdDays: 14 });

// Multiple options at once
setConfig({
  enabled: true,
  timezone: 'America/Chicago',
  relativeThresholdDays: 3
});

// Check current configuration
const config = getConfig();
console.log(`Formatting enabled: ${config.enabled}`);
console.log(`Timezone: ${config.timezone}`);

// Reset to environment defaults
resetConfig();
```

## Format Types

### Relative Time Format

Used for recent timestamps (within threshold, default 7 days):

| Age | Format |
|-----|--------|
| < 1 minute | "just now" |
| 1-59 minutes | "5 minutes ago" |
| 1-23 hours | "2 hours ago" |
| 1-6 days | "3 days ago" |

**Example:**
```typescript
formatTimestamp('2024-01-15T15:25:00Z')
// => { formatted: '5 minutes ago', formatType: 'relative', ... }
```

### Absolute Time Format

Used for older timestamps (beyond threshold):

**Format Pattern:** "Month Day, Year at Hour:Minute AM/PM Timezone"

**Features:**
- Full month names (January, February, etc.)
- 12-hour clock format (1-12, not 0-23)
- AM/PM indicators
- Timezone abbreviations (EST, EDT, PST, PDT, etc.)
- Automatic daylight saving time handling

**Examples:**
```typescript
// Eastern Time (winter)
formatTimestamp('2024-01-15T20:30:00Z')
// => "January 15, 2024 at 3:30 PM EST"

// Eastern Time (summer - DST)
formatTimestamp('2024-07-15T19:30:00Z')
// => "July 15, 2024 at 3:30 PM EDT"

// Pacific Time
formatTimestamp('2024-01-15T20:30:00Z', { timezone: 'America/Los_Angeles' })
// => "January 15, 2024 at 12:30 PM PST"
```

### Fallback Formats

Graceful handling of invalid or missing timestamps:

| Input | Output |
|-------|--------|
| `null` | "unknown time" |
| `undefined` | "unknown time" |
| Invalid format | "invalid timestamp" |
| Timezone error | "January 15, 2024 at 3:30 PM (UTC)" |

## API Reference

### Core Functions

#### `formatTimestamp(timestamp, options?)`

Main formatting function that automatically chooses relative or absolute format.

**Parameters:**
- `timestamp` - ISO 8601 string, Unix timestamp number, or null/undefined
- `options` - Optional formatting options
  - `timezone` - IANA timezone name (default: 'America/New_York')
  - `relativeThresholdDays` - Days threshold for relative vs absolute (default: 7)
  - `referenceTime` - Reference time for relative calculations (default: now)

**Returns:** `FormattedTimestamp` object with:
- `formatted` - Human-readable timestamp string
- `formatType` - 'relative', 'absolute', or 'fallback'
- `original` - Original timestamp value

**Examples:**
```typescript
// Basic usage
formatTimestamp('2024-01-15T15:30:00Z')

// With custom timezone
formatTimestamp('2024-01-15T15:30:00Z', {
  timezone: 'America/Los_Angeles'
})

// With custom threshold
formatTimestamp('2024-01-15T15:30:00Z', {
  relativeThresholdDays: 14
})

// Unix timestamp
formatTimestamp(1705330200000)

// Null handling
formatTimestamp(null) // => "unknown time"
```

#### `formatRelativeTime(timestamp, referenceTime?)`

Format timestamp as relative time (e.g., "2 hours ago").

**Parameters:**
- `timestamp` - ISO 8601 string or Unix timestamp number
- `referenceTime` - Optional reference time (default: now)

**Returns:** Relative time string

**Examples:**
```typescript
formatRelativeTime('2024-01-15T15:30:00Z')
// => "just now" | "5 minutes ago" | "2 hours ago"

// With custom reference time
const refTime = new Date('2024-01-15T15:30:00Z');
formatRelativeTime('2024-01-15T15:00:00Z', refTime)
// => "30 minutes ago"
```

#### `formatAbsoluteTime(timestamp, timezone?)`

Format timestamp as absolute time (e.g., "January 15, 2024 at 3:30 PM EST").

**Parameters:**
- `timestamp` - ISO 8601 string or Unix timestamp number
- `timezone` - IANA timezone name (default: 'America/New_York')

**Returns:** Absolute time string with timezone

**Examples:**
```typescript
formatAbsoluteTime('2024-01-15T20:30:00Z')
// => "January 15, 2024 at 3:30 PM EST"

formatAbsoluteTime('2024-01-15T20:30:00Z', 'America/Los_Angeles')
// => "January 15, 2024 at 12:30 PM PST"
```

#### `formatTimestampBatch(timestamps, options?)`

Batch format multiple timestamps efficiently.

**Parameters:**
- `timestamps` - Array of timestamps (ISO 8601, Unix, or null/undefined)
- `options` - Optional formatting options (same as `formatTimestamp`)

**Returns:** Array of `FormattedTimestamp` objects

**Example:**
```typescript
const timestamps = [
  '2024-01-15T15:30:00Z',
  '2024-01-01T12:00:00Z',
  null,
  1705330200000
];

const formatted = formatTimestampBatch(timestamps);
// => [
//   { formatted: '2 hours ago', formatType: 'relative', ... },
//   { formatted: 'January 1, 2024 at 12:00 PM EST', formatType: 'absolute', ... },
//   { formatted: 'unknown time', formatType: 'fallback', ... },
//   { formatted: '2 hours ago', formatType: 'relative', ... }
// ]
```

### Agent Context Functions

#### `formatMarketContextForAgent(state, agentName)`

Format complete market context for an agent with human-readable timestamps.

**Parameters:**
- `state` - LangGraph state (readonly)
- `agentName` - Name of the agent receiving the context

**Returns:** Formatted context string for LLM prompt

**Example:**
```typescript
const context = formatMarketContextForAgent(state, 'NewsAgent');
// Returns comprehensive formatted string with:
// - Market overview with human-readable expiry
// - News articles with publication times
// - Agent's previous analysis with timestamps
// - Other agents' signals with timestamps
```

#### `formatMarketBriefingForAgent(mbd)`

Format Market Briefing Document with human-readable timestamps.

**Parameters:**
- `mbd` - Market Briefing Document (readonly)

**Returns:** Formatted MBD string

#### `formatExternalDataForAgent(externalData)`

Format external data (news, polling, social) with human-readable timestamps.

**Parameters:**
- `externalData` - External data from state (readonly)

**Returns:** Formatted external data string

#### `formatAgentSignalsForAgent(signals)`

Format agent signals with human-readable timestamps.

**Parameters:**
- `signals` - Array of agent signals (readonly)

**Returns:** Formatted signals string

### Configuration Functions

#### `getConfig()`

Get current global configuration.

**Returns:** Readonly copy of current configuration

**Example:**
```typescript
const config = getConfig();
console.log(`Formatting enabled: ${config.enabled}`);
console.log(`Timezone: ${config.timezone}`);
console.log(`Threshold: ${config.relativeThresholdDays} days`);
```

#### `setConfig(config)`

Set global configuration (runtime override).

**Parameters:**
- `config` - Partial configuration to merge with current config

**Example:**
```typescript
setConfig({ enabled: false });
setConfig({ timezone: 'America/Los_Angeles' });
setConfig({ relativeThresholdDays: 14 });
```

#### `resetConfig()`

Reset configuration to defaults from environment variables.

**Example:**
```typescript
setConfig({ timezone: 'America/Los_Angeles' });
resetConfig(); // Back to America/New_York (from env)
```

#### `isTimestampFormattingEnabled()`

Check if human-readable timestamp formatting is enabled.

**Returns:** `true` if enabled, `false` otherwise

**Example:**
```typescript
if (isTimestampFormattingEnabled()) {
  console.log('Using human-readable timestamps');
}
```

## Integration Examples

### Agent Node Integration

```typescript
import { formatMarketContextForAgent } from '../utils/agent-context-formatter.js';

export function createAgentNode(agentName: string) {
  return async (state: GraphStateType) => {
    // Format context with human-readable timestamps
    const marketContext = formatMarketContextForAgent(state, agentName);
    
    // Use in LLM prompt
    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Analyze the following prediction market:\n\n${marketContext}`
      }
    ];
    
    // Call LLM with formatted context
    const response = await llm.invoke(messages);
    
    return { agentSignals: [response] };
  };
}
```

### Custom Formatting

```typescript
import { formatTimestamp } from './utils/timestamp-formatter.js';

// Format market data for custom display
function formatMarketForDisplay(market: Market) {
  const expiry = formatTimestamp(market.expiryTimestamp);
  const created = formatTimestamp(market.createdAt);
  
  return `
    Market: ${market.question}
    Created: ${created.formatted}
    Expires: ${expiry.formatted}
    Current Price: ${market.price}
  `;
}
```

### Batch Processing

```typescript
import { formatTimestampBatch } from './utils/timestamp-formatter.js';

// Format multiple news articles
function formatNewsArticles(articles: NewsArticle[]) {
  const timestamps = articles.map(a => a.publishedAt);
  const formatted = formatTimestampBatch(timestamps);
  
  return articles.map((article, i) => ({
    ...article,
    publishedAtFormatted: formatted[i].formatted
  }));
}
```

## Deployment

### Feature Flag Rollout

The timestamp formatting feature includes a feature flag for gradual rollout:

**Phase 1: Deploy with feature disabled**
```bash
# .env.production
ENABLE_HUMAN_READABLE_TIMESTAMPS=false
```

Deploy the code without enabling the feature. This ensures zero impact.

**Phase 2: Enable for testing**
```bash
# .env.staging
ENABLE_HUMAN_READABLE_TIMESTAMPS=true
```

Enable in staging environment and monitor agent performance.

**Phase 3: Gradual production rollout**

Enable for a percentage of requests using a feature flag service, or enable globally:

```bash
# .env.production
ENABLE_HUMAN_READABLE_TIMESTAMPS=true
```

**Phase 4: Monitor and adjust**

Monitor metrics:
- Agent analysis quality
- LLM token usage (may decrease)
- Error rates
- Performance impact

### Rollback Procedure

If issues arise, disable the feature immediately:

```bash
# .env.production
ENABLE_HUMAN_READABLE_TIMESTAMPS=false
```

Or at runtime:

```typescript
import { setConfig } from './utils/timestamp-formatter.js';
setConfig({ enabled: false });
```

**No data loss or corruption** - the feature only affects formatting, not storage.

## Performance

### Benchmarks

Timestamp formatting is highly optimized:

| Operation | Time | Notes |
|-----------|------|-------|
| Single timestamp | < 1ms | Typical case |
| Batch of 100 | < 50ms | Efficient batch processing |
| Agent context | < 10ms | Complete context formatting |

### Optimization Strategies

1. **Timezone caching** - date-fns-tz automatically caches timezone rules
2. **Batch processing** - Process multiple timestamps in single pass
3. **Lazy evaluation** - Only format when constructing agent context
4. **No memoization overhead** - Simple, stateless functions

### Memory Usage

- **Zero memory leaks** - No persistent state or caching
- **Minimal allocation** - String concatenation only
- **Garbage collection friendly** - Short-lived objects

## Troubleshooting

### Common Issues

#### Timestamps showing as "invalid timestamp"

**Problem:** Input timestamp is not in valid ISO 8601 format.

**Solutions:**
- Verify timestamp format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Check for null/undefined values
- Ensure Unix timestamps are in milliseconds (not seconds)
- Review error logs for specific parsing errors

#### Wrong timezone displayed

**Problem:** Timestamps showing incorrect timezone.

**Solutions:**
- Check `TIMESTAMP_TIMEZONE` environment variable
- Verify IANA timezone name is correct (e.g., 'America/New_York')
- Ensure timezone data is available in runtime environment
- Test with `formatAbsoluteTime` directly to isolate issue

#### Relative time not updating

**Problem:** Relative timestamps not changing over time.

**Solutions:**
- Relative time is calculated at formatting time, not stored
- Ensure you're calling `formatTimestamp` each time you need current relative time
- Check `referenceTime` option if using custom reference
- Verify system clock is correct

#### Feature flag not working

**Problem:** Formatting still enabled/disabled despite configuration.

**Solutions:**
- Restart application after changing environment variables
- Check `.env` file is being loaded correctly
- Verify no runtime `setConfig` calls are overriding environment
- Use `getConfig()` to check current configuration

#### Performance degradation

**Problem:** Timestamp formatting causing slowdowns.

**Solutions:**
- Profile to identify bottleneck (should be < 1ms per timestamp)
- Check for excessive batch sizes (> 1000 timestamps)
- Verify timezone data is cached properly
- Consider disabling formatting if performance is critical

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
import { formatTimestamp } from './utils/timestamp-formatter.js';

const result = formatTimestamp('2024-01-15T15:30:00Z');
console.log('Formatted:', result.formatted);
console.log('Format type:', result.formatType);
console.log('Original:', result.original);
```

## Testing

### Unit Tests

Test specific examples and edge cases:

```typescript
import { describe, it, expect } from 'vitest';
import { formatTimestamp } from './utils/timestamp-formatter.js';

describe('Timestamp Formatter', () => {
  it('formats recent timestamps as relative time', () => {
    const result = formatTimestamp('2024-01-15T15:30:00Z');
    expect(result.formatType).toBe('relative');
    expect(result.formatted).toMatch(/ago$/);
  });
  
  it('handles null timestamps gracefully', () => {
    const result = formatTimestamp(null);
    expect(result.formatted).toBe('unknown time');
    expect(result.formatType).toBe('fallback');
  });
});
```

### Property-Based Tests

Verify universal properties across random inputs:

```typescript
import fc from 'fast-check';
import { formatTimestamp } from './utils/timestamp-formatter.js';

it('converts any valid ISO 8601 timestamp to human-readable format', () => {
  fc.assert(
    fc.property(
      fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
      (date) => {
        const result = formatTimestamp(date.toISOString());
        
        // Should not contain ISO 8601 patterns
        expect(result.formatted).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
        
        // Should be human-readable
        expect(result.formatType).toMatch(/^(relative|absolute)$/);
      }
    ),
    { numRuns: 100 }
  );
});
```

## Best Practices

### Do's ✅

- **Use for agent prompts** - Format timestamps when constructing LLM prompts
- **Keep state immutable** - Never modify original timestamps in state
- **Handle null values** - Always check for null/undefined before formatting
- **Use batch processing** - Format multiple timestamps together when possible
- **Test edge cases** - Test DST transitions, null values, invalid formats
- **Monitor performance** - Track formatting time in production

### Don'ts ❌

- **Don't store formatted timestamps** - Always format on-demand from ISO 8601
- **Don't modify state** - Formatting is read-only, never mutate input
- **Don't assume timezone** - Always specify timezone explicitly or use default
- **Don't skip error handling** - Always handle invalid timestamps gracefully
- **Don't cache formatted strings** - Relative times change, format fresh each time
- **Don't use for database storage** - Store ISO 8601, format for display only

## Related Documentation

- **[Requirements Document](../.kiro/specs/human-readable-agent-timestamps/requirements.md)** - Feature requirements
- **[Design Document](../.kiro/specs/human-readable-agent-timestamps/design.md)** - Architecture and design decisions
- **[Tasks Document](../.kiro/specs/human-readable-agent-timestamps/tasks.md)** - Implementation plan
- **[date-fns Documentation](https://date-fns.org/)** - Date manipulation library
- **[date-fns-tz Documentation](https://github.com/marnusw/date-fns-tz)** - Timezone support

## Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Test with debug mode enabled
4. Check related documentation
5. Open an issue with reproduction steps

---

**Built with date-fns and date-fns-tz**
