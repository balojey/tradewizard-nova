# Design Document: TradeWizard Agents Cleanup

## Overview

This design document outlines the technical approach for cleaning up the tradewizard-agents directory by making autonomous agents the default configuration and removing unnecessary documentation. The cleanup involves modifying configuration files, updating environment variable defaults, removing obsolete code, and deleting outdated documentation files.

### Goals

1. Make autonomous mode the default for all agents (polling and news agents)
2. Update all configuration files and environment variable examples to reflect autonomous-first approach
3. Remove non-autonomous agent implementations while preserving shared utilities
4. Delete unnecessary markdown documentation files while keeping critical operational docs
5. Maintain backward compatibility for users who need to disable autonomous mode

### Non-Goals

1. Modifying the autonomous agent implementations themselves
2. Changing the agent execution logic or workflow
3. Removing any active code that is currently in use
4. Altering the database schema or migration files
5. Modifying the frontend application

## Architecture

### Configuration System Architecture

The configuration system follows a layered approach:

```
Environment Variables (.env files)
         ↓
Configuration Loaders (loadPollingAgentConfig, loadNewsAgentsConfig)
         ↓
Default Constants (DEFAULT_POLLING_AGENT_CONFIG, DEFAULT_NEWS_AGENT_CONFIG)
         ↓
Main Configuration (loadConfig in src/config/index.ts)
         ↓
Agent Initialization
```

### Current State

**Configuration Defaults:**
- `autonomous: false` in DEFAULT_POLLING_AGENT_CONFIG
- `autonomous: false` in DEFAULT_NEWS_AGENT_CONFIG
- Environment variables require explicit `=== 'true'` check (opt-in)

**Agent Files:**
- `src/nodes/agents.ts` - Contains legacy agent implementations
- `src/nodes/autonomous-polling-agent.ts` - Autonomous polling agent
- `src/nodes/autonomous-news-agents.ts` - Autonomous news agents

**Documentation Files:**
- 20+ markdown files across root, docs/, scripts/, and supabase/ directories
- Mix of current operational docs and outdated migration/troubleshooting guides

### Target State

**Configuration Defaults:**
- `autonomous: true` in DEFAULT_POLLING_AGENT_CONFIG
- `autonomous: true` in DEFAULT_NEWS_AGENT_CONFIG
- Environment variables default to true unless explicitly set to false (opt-out)

**Agent Files:**
- Remove non-autonomous implementations from agents.ts
- Preserve autonomous agent files unchanged
- Keep shared utility functions if they exist

**Documentation Files:**
- Only essential operational documentation remains
- All migration, troubleshooting, and AWS-specific docs removed
- Clear documentation structure

## Components and Interfaces

### 1. Configuration File Updates

#### src/config/polling-agent-config.ts

**Changes Required:**
- Update `DEFAULT_POLLING_AGENT_CONFIG.autonomous` from `false` to `true`
- Update `loadPollingAgentConfig()` to parse environment variable with default true
- Update documentation comments to reflect autonomous-first approach

**Current Implementation:**
```typescript
export const DEFAULT_POLLING_AGENT_CONFIG: PollingAgentConfig = {
  autonomous: false,  // ← Change to true
  maxToolCalls: 5,
  timeout: 45000,
  cacheEnabled: true,
  fallbackToBasic: true,
};

export function loadPollingAgentConfig(): PollingAgentConfig {
  return {
    autonomous: process.env.POLLING_AGENT_AUTONOMOUS === 'true',  // ← Change logic
    // ... rest of config
  };
}
```

**Target Implementation:**
```typescript
export const DEFAULT_POLLING_AGENT_CONFIG: PollingAgentConfig = {
  autonomous: true,  // ← Changed
  maxToolCalls: 5,
  timeout: 45000,
  cacheEnabled: true,
  fallbackToBasic: true,
};

export function loadPollingAgentConfig(): PollingAgentConfig {
  return {
    autonomous: process.env.POLLING_AGENT_AUTONOMOUS !== 'false',  // ← Changed to opt-out
    // ... rest of config
  };
}
```

#### src/config/news-agents-config.ts

**Changes Required:**
- Update `DEFAULT_NEWS_AGENT_CONFIG.autonomous` from `false` to `true`
- Update `loadNewsAgentsConfig()` to parse environment variables with default true for all three agents
- Update documentation comments

**Current Implementation:**
```typescript
export const DEFAULT_NEWS_AGENT_CONFIG: NewsAgentConfig = {
  autonomous: false,  // ← Change to true
  maxToolCalls: 5,
  timeout: 45000,
  cacheEnabled: true,
  fallbackToBasic: true,
};

export function loadNewsAgentsConfig(): NewsAgentsConfig {
  return {
    breakingNewsAgent: {
      autonomous: process.env.BREAKING_NEWS_AGENT_AUTONOMOUS === 'true',  // ← Change logic
      // ...
    },
    mediaSentimentAgent: {
      autonomous: process.env.MEDIA_SENTIMENT_AGENT_AUTONOMOUS === 'true',  // ← Change logic
      // ...
    },
    marketMicrostructureAgent: {
      autonomous: process.env.MARKET_MICROSTRUCTURE_AGENT_AUTONOMOUS === 'true',  // ← Change logic
      // ...
    },
  };
}
```

**Target Implementation:**
```typescript
export const DEFAULT_NEWS_AGENT_CONFIG: NewsAgentConfig = {
  autonomous: true,  // ← Changed
  maxToolCalls: 5,
  timeout: 45000,
  cacheEnabled: true,
  fallbackToBasic: true,
};

export function loadNewsAgentsConfig(): NewsAgentsConfig {
  return {
    breakingNewsAgent: {
      autonomous: process.env.BREAKING_NEWS_AGENT_AUTONOMOUS !== 'false',  // ← Changed to opt-out
      // ...
    },
    mediaSentimentAgent: {
      autonomous: process.env.MEDIA_SENTIMENT_AGENT_AUTONOMOUS !== 'false',  // ← Changed to opt-out
      // ...
    },
    marketMicrostructureAgent: {
      autonomous: process.env.MARKET_MICROSTRUCTURE_AGENT_AUTONOMOUS !== 'false',  // ← Changed to opt-out
      // ...
    },
  };
}
```

#### src/config/index.ts

**Changes Required:**
- Update `getDefaultConfig()` to show autonomous: true in default configuration
- Update schema defaults if they exist
- Ensure configuration validation accepts the new defaults

**Current State:**
The file already loads polling and news agent configs via `loadPollingAgentConfig()` and `loadNewsAgentsConfig()`, so changes to those functions will automatically propagate.

**Verification Needed:**
- Check that `getDefaultConfig()` function returns correct defaults
- Verify schema validation in `EngineConfigSchema` handles autonomous mode correctly

### 2. Environment Variable File Updates

#### Files to Update:
- `.env.example`
- `.env.development.example`
- `.env.production.example`
- `.env.staging.example`
- `.env.monitor.example` (if it exists)

**Changes Required:**

**Current Format:**
```bash
# Autonomous mode disabled by default for backward compatibility
POLLING_AGENT_AUTONOMOUS=false
BREAKING_NEWS_AGENT_AUTONOMOUS=false
MEDIA_SENTIMENT_AGENT_AUTONOMOUS=false
MARKET_MICROSTRUCTURE_AGENT_AUTONOMOUS=false
```

**Target Format:**
```bash
# Autonomous mode enabled by default (recommended)
# Set to false to disable autonomous mode if needed
POLLING_AGENT_AUTONOMOUS=true
BREAKING_NEWS_AGENT_AUTONOMOUS=true
MEDIA_SENTIMENT_AGENT_AUTONOMOUS=true
MARKET_MICROSTRUCTURE_AGENT_AUTONOMOUS=true
```

**Documentation Updates:**
- Add comments explaining autonomous mode is now the default
- Provide examples of how to disable if needed
- Update the configuration philosophy section

### 3. Agent Code Cleanup

#### src/nodes/agents.ts Analysis

**Approach:**
1. Read the entire agents.ts file to identify non-autonomous implementations
2. Identify which functions/classes are non-autonomous agent implementations
3. Identify which functions/classes are shared utilities used by other code
4. Remove only the non-autonomous agent implementations
5. Preserve shared utilities and helper functions

**Expected Structure:**
Based on the code signatures, agents.ts contains:
- `createAgentNode()` - Generic agent node creator (likely shared utility)
- `createLLMInstances()` - LLM instance factory (likely shared utility)
- `createAgentNodes()` - Agent node factory (may contain non-autonomous logic)
- `createPollingIntelligenceAgentNode()` - Specific agent creator (may be non-autonomous)

**Decision Logic:**
- If a function is imported by autonomous agent files → Keep it (shared utility)
- If a function creates non-autonomous agent nodes → Remove it
- If a function is generic infrastructure → Keep it (shared utility)
- If a function is only used by workflow for non-autonomous agents → Remove it

**Verification Steps:**
1. Search for imports of agents.ts in autonomous agent files
2. Search for imports of agents.ts in workflow.ts
3. Identify which exports are actually used
4. Remove unused non-autonomous implementations

### 4. Documentation File Removal

#### Files to Remove

**Root Directory:**
- `AWS_SALES_PITCH.md`
- `AWS_SALES_PITCH_SHORT.md`
- `AWS_SUPPORT_CASE_TEMPLATE.md`
- `AWS_SUPPORT_RESPONSE.md`
- `AWS_SUPPORT_RESPONSE_V2.md`
- `PRODUCTION_DEPLOYMENT_SUMMARY.md`

**docs/ Directory:**
- `NOVA_2_UPGRADE.md`
- `NOVA_MIGRATION_COMPLETE.md`
- `NOVA_TOOL_CALLING_FIX.md`
- `NOVA_TOOL_CALLING_MIGRATION.md`
- `NOVA_TROUBLESHOOTING.md`
- `BEDROCK_PERMISSIONS_TROUBLESHOOTING.md`
- `LANGGRAPH_TROUBLESHOOTING.md`
- `DIRECT_MARKET_DISCOVERY_MIGRATION.md`
- `E2E_DEPLOYMENT_CHECKLIST.md`
- `E2E_QUICK_START.md`
- `E2E_TEST_SUMMARY.md`
- `E2E_TESTING_GUIDE.md`
- `INCIDENT_RESPONSE.md`
- `LOG_AGGREGATION.md`
- `MONITORING_ALERTS.md`
- `PERFORMANCE_TESTING.md`
- `PRODUCTION_DEPLOYMENT.md` (duplicate of root DEPLOYMENT.md)
- `PRODUCTION_READINESS.md`
- `ROLLBACK_PROCEDURE.md`
- `TIMESTAMP_FORMATTING.md`
- `SUPABASE_CHECKPOINTER.md`
- `MEMORY_SYSTEM_EXAMPLES.md`
- `MEMORY_SYSTEM_QUICK_START.md`

**scripts/ Directory:**
- `AWS_SUPPORT_ESCALATION_RESPONSE.md`

**supabase/ Directory:**
- `DASHBOARD_SETUP.md`
- `DEPLOYMENT_COMPLETE.md`

#### Files to Keep

**Root Directory:**
- `README.md` - Main project documentation
- `DEPLOYMENT.md` - Deployment instructions
- `CLI.md` - CLI usage documentation
- `CLI-MONITOR.md` - Monitoring service documentation

**docs/ Directory:**
- `DEPLOYMENT.md` - Detailed deployment guide
- `EXAMPLES.md` - Usage examples
- `RUNBOOK.md` - Operational runbook
- `README.md` - Documentation index
- `OPIK_GUIDE.md` - Observability setup
- `LLM_PROVIDERS.md` - LLM configuration guide
- `ADVANCED_AGENT_LEAGUE.md` - Advanced agent documentation
- `AUTONOMOUS_NEWS_AGENTS.md` - Autonomous agent documentation
- `EXTERNAL_DATA_SOURCES.md` - Data source configuration

**supabase/ Directory:**
- `README.md` - Supabase setup documentation

## Data Models

### Configuration Data Structures

#### PollingAgentConfig
```typescript
interface PollingAgentConfig {
  autonomous: boolean;        // Changed default: false → true
  maxToolCalls: number;       // Unchanged: 5
  timeout: number;            // Unchanged: 45000
  cacheEnabled: boolean;      // Unchanged: true
  fallbackToBasic: boolean;   // Unchanged: true
}
```

#### NewsAgentConfig
```typescript
interface NewsAgentConfig {
  autonomous: boolean;        // Changed default: false → true
  maxToolCalls: number;       // Unchanged: 5
  timeout: number;            // Unchanged: 45000
  cacheEnabled: boolean;      // Unchanged: true
  fallbackToBasic: boolean;   // Unchanged: true
}
```

#### NewsAgentsConfig
```typescript
interface NewsAgentsConfig {
  breakingNewsAgent: NewsAgentConfig;        // autonomous default: false → true
  mediaSentimentAgent: NewsAgentConfig;      // autonomous default: false → true
  marketMicrostructureAgent: NewsAgentConfig; // autonomous default: false → true
}
```

### Environment Variable Mapping

| Environment Variable | Current Default | New Default | Type |
|---------------------|----------------|-------------|------|
| POLLING_AGENT_AUTONOMOUS | false (opt-in) | true (opt-out) | boolean |
| BREAKING_NEWS_AGENT_AUTONOMOUS | false (opt-in) | true (opt-out) | boolean |
| MEDIA_SENTIMENT_AGENT_AUTONOMOUS | false (opt-in) | true (opt-out) | boolean |
| MARKET_MICROSTRUCTURE_AGENT_AUTONOMOUS | false (opt-in) | true (opt-out) | boolean |

### File Removal Manifest

```typescript
interface FileRemovalManifest {
  rootFiles: string[];      // Files to remove from tradewizard-agents/
  docsFiles: string[];      // Files to remove from tradewizard-agents/docs/
  scriptsFiles: string[];   // Files to remove from tradewizard-agents/scripts/
  supabaseFiles: string[];  // Files to remove from tradewizard-agents/supabase/
}

const removalManifest: FileRemovalManifest = {
  rootFiles: [
    'AWS_SALES_PITCH.md',
    'AWS_SALES_PITCH_SHORT.md',
    'AWS_SUPPORT_CASE_TEMPLATE.md',
    'AWS_SUPPORT_RESPONSE.md',
    'AWS_SUPPORT_RESPONSE_V2.md',
    'PRODUCTION_DEPLOYMENT_SUMMARY.md'
  ],
  docsFiles: [
    'NOVA_2_UPGRADE.md',
    'NOVA_MIGRATION_COMPLETE.md',
    'NOVA_TOOL_CALLING_FIX.md',
    'NOVA_TOOL_CALLING_MIGRATION.md',
    'NOVA_TROUBLESHOOTING.md',
    'BEDROCK_PERMISSIONS_TROUBLESHOOTING.md',
    'LANGGRAPH_TROUBLESHOOTING.md',
    'DIRECT_MARKET_DISCOVERY_MIGRATION.md',
    'E2E_DEPLOYMENT_CHECKLIST.md',
    'E2E_QUICK_START.md',
    'E2E_TEST_SUMMARY.md',
    'E2E_TESTING_GUIDE.md',
    'INCIDENT_RESPONSE.md',
    'LOG_AGGREGATION.md',
    'MONITORING_ALERTS.md',
    'PERFORMANCE_TESTING.md',
    'PRODUCTION_DEPLOYMENT.md',
    'PRODUCTION_READINESS.md',
    'ROLLBACK_PROCEDURE.md',
    'TIMESTAMP_FORMATTING.md',
    'SUPABASE_CHECKPOINTER.md',
    'MEMORY_SYSTEM_EXAMPLES.md',
    'MEMORY_SYSTEM_QUICK_START.md'
  ],
  scriptsFiles: [
    'AWS_SUPPORT_ESCALATION_RESPONSE.md'
  ],
  supabaseFiles: [
    'DASHBOARD_SETUP.md',
    'DEPLOYMENT_COMPLETE.md'
  ]
};
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Configuration Defaults to Autonomous Mode

*For any* configuration loading scenario where autonomous-related environment variables are not set, the loaded configuration should have autonomous mode enabled (true) for all agents (polling agent and all three news agents).

**Validates: Requirements 1.3**

### Property 2: Environment Variables Override Defaults

*For any* configuration value and corresponding environment variable, when the environment variable is explicitly set, the loaded configuration should use the environment variable value instead of the default value.

**Validates: Requirements 9.2**

### Property 3: Configuration Loader Respects Explicit Opt-Out

*For any* agent (polling or news agents), when its autonomous environment variable is explicitly set to "false", the loaded configuration should have autonomous mode disabled for that specific agent.

**Validates: Requirements 7.2**

### Property 4: Configuration Validation Accepts Boolean Values

*For any* autonomous mode configuration setting, the configuration validation should accept both true and false boolean values without errors, rejecting only non-boolean values.

**Validates: Requirements 7.4**

### Property 5: Configuration Loading with Missing Environment Variables

*For any* subset of environment variables that are undefined or missing, the configuration loader should successfully load configuration without errors, using appropriate defaults for missing values.

**Validates: Requirements 5.1, 5.2**

### Example Test Cases

The following are specific examples that validate particular scenarios:

#### Example 1: Default Polling Agent Config Has Autonomous True
Verify that `DEFAULT_POLLING_AGENT_CONFIG.autonomous === true`

**Validates: Requirements 1.1**

#### Example 2: Default News Agent Config Has Autonomous True
Verify that `DEFAULT_NEWS_AGENT_CONFIG.autonomous === true` and all three news agents in `DEFAULT_NEWS_AGENTS_CONFIG` have `autonomous === true`

**Validates: Requirements 1.2, 1.5**

#### Example 3: Environment Example Files Show Autonomous Enabled
Verify that `.env.example`, `.env.development.example`, `.env.production.example`, and `.env.staging.example` all contain autonomous environment variables set to `true`

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

#### Example 4: Autonomous Agent Files Unchanged
Verify that `autonomous-polling-agent.ts` and `autonomous-news-agents.ts` have identical content before and after cleanup (file hash comparison)

**Validates: Requirements 3.2**

#### Example 5: Agent Node Exports Reference Autonomous Implementations
Verify that agent node exports only include autonomous agent implementations and do not export non-autonomous agent nodes

**Validates: Requirements 3.4**

#### Example 6: Workflow Uses Autonomous Agents
Verify that `workflow.ts` imports and uses only autonomous agent nodes

**Validates: Requirements 3.5**

#### Example 7: Removed Files Do Not Exist
Verify that all files in the removal manifest (AWS sales pitch files, NOVA migration docs, E2E docs, etc.) do not exist in their respective directories

**Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 4.8, 4.10, 4.11**

#### Example 8: Preserved Files Still Exist
Verify that all files in the keep list (README.md, DEPLOYMENT.md, CLI.md, CLI-MONITOR.md, EXAMPLES.md, RUNBOOK.md, OPIK_GUIDE.md, LLM_PROVIDERS.md, supabase/README.md) still exist after cleanup

**Validates: Requirements 4.4, 4.9, 4.12, 8.3**

#### Example 9: Explicit False Disables Polling Agent Autonomous Mode
Verify that when `POLLING_AGENT_AUTONOMOUS=false` is set, the loaded configuration has `pollingAgent.autonomous === false`

**Validates: Requirements 7.1**

#### Example 10: Fallback Mechanism Works with Autonomous Disabled
Verify that when autonomous mode is disabled, the fallback mechanism still functions correctly (agents can execute with pre-fetched data)

**Validates: Requirements 7.3**

#### Example 11: Warning Logged When Autonomous Explicitly Disabled
Verify that when any autonomous environment variable is set to "false", a warning message is logged indicating autonomous mode has been explicitly disabled

**Validates: Requirements 7.5**

#### Example 12: Configuration Loads Successfully Without Environment Variables
Verify that calling `loadConfig()` with no environment variables set succeeds without throwing errors

**Validates: Requirements 10.1**

#### Example 13: Configuration Validation Passes with New Defaults
Verify that the configuration schema validation passes when using the new default values (autonomous: true)

**Validates: Requirements 10.4**

#### Example 14: Agent Initialization Succeeds with Autonomous Mode
Verify that agents can be initialized successfully using configuration with autonomous mode enabled by default

**Validates: Requirements 10.5**

## Error Handling

### Configuration Loading Errors

**Scenario:** Invalid environment variable values
- **Detection:** Configuration validation fails with Zod schema errors
- **Handling:** Log detailed validation errors, fall back to safe defaults where possible
- **User Impact:** System logs show which configuration values are invalid

**Scenario:** Missing required API keys
- **Detection:** Configuration validation detects missing required fields
- **Handling:** Throw configuration error with clear message about missing keys
- **User Impact:** Application fails to start with actionable error message

### File Removal Errors

**Scenario:** File marked for deletion is still referenced in code
- **Detection:** Pre-deletion verification checks imports and references
- **Handling:** Skip deletion of referenced file, log warning
- **User Impact:** File is preserved, cleanup continues for other files

**Scenario:** File deletion fails due to permissions
- **Detection:** File system operation throws permission error
- **Handling:** Log error with file path, continue with remaining deletions
- **User Impact:** Some files may remain, but cleanup is not completely blocked

### Agent Initialization Errors

**Scenario:** Autonomous agent initialization fails
- **Detection:** Agent node creation throws error
- **Handling:** If `fallbackToBasic: true`, attempt to use fallback mechanism
- **User Impact:** System may fall back to non-autonomous mode if available

**Scenario:** Tool calling fails in autonomous mode
- **Detection:** Tool execution throws error during agent execution
- **Handling:** Agent catches error, logs it, and continues with available data
- **User Impact:** Analysis may be less comprehensive but still completes

### Backward Compatibility Errors

**Scenario:** User explicitly sets autonomous=false but non-autonomous code is removed
- **Detection:** Configuration loads with autonomous=false but no fallback available
- **Handling:** Log warning that non-autonomous mode is deprecated, use autonomous mode anyway
- **User Impact:** System uses autonomous mode despite user preference (with warning)

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests:**
- Verify specific configuration constant values (DEFAULT_POLLING_AGENT_CONFIG, DEFAULT_NEWS_AGENT_CONFIG)
- Test specific environment variable parsing scenarios (explicit true, explicit false, undefined)
- Verify file existence/non-existence after cleanup
- Test agent initialization with specific configurations
- Verify logging behavior for warnings and errors

**Property-Based Tests:**
- Test configuration loading with randomly generated environment variable combinations
- Verify environment variable override behavior across all configuration fields
- Test configuration validation with randomly generated valid and invalid inputs
- Verify autonomous mode opt-out behavior across all agents with random combinations

### Unit Testing Focus

Unit tests should focus on:
1. **Configuration Constants:** Verify DEFAULT_POLLING_AGENT_CONFIG and DEFAULT_NEWS_AGENT_CONFIG have autonomous: true
2. **Environment File Content:** Parse .env.example files and verify autonomous variables are set to true
3. **File Cleanup Verification:** Check that removed files don't exist and preserved files do exist
4. **Specific Scenarios:** Test explicit false values, missing env vars, validation with new defaults
5. **Integration Points:** Verify workflow uses autonomous agents, exports are correct

### Property-Based Testing Focus

Property tests should focus on:
1. **Configuration Loading:** Test with 100+ random combinations of environment variables
2. **Environment Variable Override:** Verify any env var overrides its corresponding default
3. **Opt-Out Behavior:** Test that setting any agent's autonomous to false disables it
4. **Validation Robustness:** Test schema validation with random valid and invalid inputs
5. **Default Behavior:** Verify autonomous defaults to true across all possible missing env var combinations

### Property Test Configuration

- **Minimum iterations:** 100 per property test
- **Test library:** fast-check (TypeScript property-based testing library)
- **Tag format:** `// Feature: tradewizard-agents-cleanup, Property {number}: {property_text}`

### Test Organization

```
tradewizard-agents/
├── src/
│   ├── config/
│   │   ├── polling-agent-config.test.ts          # Unit tests for polling config
│   │   ├── polling-agent-config.property.test.ts # Property tests for polling config
│   │   ├── news-agents-config.test.ts            # Unit tests for news config
│   │   ├── news-agents-config.property.test.ts   # Property tests for news config
│   │   └── index.test.ts                         # Unit tests for main config
│   └── nodes/
│       ├── agents.test.ts                        # Unit tests for agent exports
│       └── workflow.test.ts                      # Unit tests for workflow integration
└── scripts/
    └── verify-cleanup.test.ts                    # Unit tests for file cleanup verification
```

### Example Property Test

```typescript
// Feature: tradewizard-agents-cleanup, Property 1: Configuration Defaults to Autonomous Mode
import * as fc from 'fast-check';
import { loadPollingAgentConfig, loadNewsAgentsConfig } from './config';

describe('Property 1: Configuration Defaults to Autonomous Mode', () => {
  it('should default to autonomous=true when env vars are not set', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Generate random env vars for other settings, but exclude autonomous vars
          maxToolCalls: fc.option(fc.integer({ min: 1, max: 20 })),
          timeout: fc.option(fc.integer({ min: 1000, max: 120000 })),
          cacheEnabled: fc.option(fc.boolean()),
          fallbackToBasic: fc.option(fc.boolean()),
        }),
        (envVars) => {
          // Set up environment with random values but no autonomous vars
          const originalEnv = process.env;
          process.env = {
            ...envVars,
            POLLING_AGENT_AUTONOMOUS: undefined,
            BREAKING_NEWS_AGENT_AUTONOMOUS: undefined,
            MEDIA_SENTIMENT_AGENT_AUTONOMOUS: undefined,
            MARKET_MICROSTRUCTURE_AGENT_AUTONOMOUS: undefined,
          };

          try {
            const pollingConfig = loadPollingAgentConfig();
            const newsConfig = loadNewsAgentsConfig();

            // Verify all agents default to autonomous=true
            expect(pollingConfig.autonomous).toBe(true);
            expect(newsConfig.breakingNewsAgent.autonomous).toBe(true);
            expect(newsConfig.mediaSentimentAgent.autonomous).toBe(true);
            expect(newsConfig.marketMicrostructureAgent.autonomous).toBe(true);
          } finally {
            process.env = originalEnv;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Example Unit Test

```typescript
// Unit test for Example 1: Default Polling Agent Config Has Autonomous True
import { DEFAULT_POLLING_AGENT_CONFIG } from './polling-agent-config';

describe('Default Polling Agent Configuration', () => {
  it('should have autonomous mode enabled by default', () => {
    expect(DEFAULT_POLLING_AGENT_CONFIG.autonomous).toBe(true);
  });

  it('should have expected default values for other settings', () => {
    expect(DEFAULT_POLLING_AGENT_CONFIG.maxToolCalls).toBe(5);
    expect(DEFAULT_POLLING_AGENT_CONFIG.timeout).toBe(45000);
    expect(DEFAULT_POLLING_AGENT_CONFIG.cacheEnabled).toBe(true);
    expect(DEFAULT_POLLING_AGENT_CONFIG.fallbackToBasic).toBe(true);
  });
});
```

### Testing Checklist

Before considering the cleanup complete, verify:

- [ ] All unit tests pass
- [ ] All property tests pass (minimum 100 iterations each)
- [ ] Configuration loads successfully with no environment variables
- [ ] Configuration loads successfully with all environment variables set to false
- [ ] Removed files do not exist
- [ ] Preserved files still exist
- [ ] Autonomous agent files are unchanged
- [ ] Workflow uses only autonomous agents
- [ ] Environment example files show autonomous=true
- [ ] Configuration validation passes with new defaults
- [ ] Agents initialize successfully with autonomous mode enabled
- [ ] Warning is logged when autonomous mode is explicitly disabled

