# Amazon Nova 2 Models - Upgrade Guide

## Overview

Amazon released Nova 2 models in December 2025 with significant improvements over the original Nova v1 models. TradeWizard now supports both Nova v1 and Nova 2 models.

## What's New in Nova 2

### Nova 2 Lite (`global.amazon.nova-2-lite-v1:0`)

**Key Features:**
- **1M token context window** (vs 300K for Nova Lite v1)
- **Extended reasoning capabilities** with step-by-step thinking
- **Multimodal inputs**: text, images, video, documents
- **Three reasoning levels**: low, medium, high (configurable)
- **Built-in tools**: web grounding and code interpreter

**Pricing:**
- Input: $0.30 per 1M tokens ($0.0003 per 1K)
- Output: $2.50 per 1M tokens ($0.0025 per 1K)
- **Note**: 5-10x more expensive than Nova Lite v1, but competitive with Claude Haiku and GPT-4o Mini

**Performance:**
- Equal or better on 13/15 benchmarks vs Claude Haiku 4.5
- Equal or better on 11/17 benchmarks vs GPT-5 Mini
- Equal or better on 14/18 benchmarks vs Gemini Flash 2.5

**Best For:**
- Complex reasoning tasks requiring step-by-step analysis
- Long-context applications (up to 1M tokens)
- Agentic workflows with tool use
- Business process automation

### Nova 2 Pro (`global.amazon.nova-2-pro-v1:0`)

**Status:** Preview (requires Nova Forge access)

**Key Features:**
- Most intelligent Nova model for highly complex tasks
- 1M token context window
- Extended reasoning capabilities
- Multimodal support

**Pricing:** Similar to Nova Pro v1 (estimated $0.80/$3.20 per 1M tokens)

**Best For:**
- Most complex reasoning and analysis tasks
- Multi-step workflows requiring highest intelligence
- Custom model distillation (via Nova Forge)

## Model Comparison

| Model | Context | Input Cost | Output Cost | Best Use Case |
|-------|---------|------------|-------------|---------------|
| **Nova Micro v1** | 128K | $0.035/1M | $0.14/1M | Ultra-low cost, simple tasks |
| **Nova Lite v1** | 300K | $0.06/1M | $0.24/1M | Balanced cost/performance |
| **Nova Pro v1** | 300K | $0.80/1M | $3.20/1M | Complex reasoning |
| **Nova 2 Lite** | 1M | $0.30/1M | $2.50/1M | Advanced reasoning, long context |
| **Nova 2 Pro** | 1M | $0.80/1M (est.) | $3.20/1M (est.) | Most complex tasks (preview) |

## Migration Guide

### Option 1: Keep Using Nova v1 (Recommended for Cost-Sensitive)

No changes needed. Nova v1 models remain available and are significantly cheaper:

```bash
# .env
NOVA_MODEL_NAME=amazon.nova-lite-v1:0  # Still works!
```

**Cost per 100 analyses:** $0.20-0.40

### Option 2: Upgrade to Nova 2 Lite (Recommended for Quality)

Update your configuration to use Nova 2 Lite:

```bash
# .env
NOVA_MODEL_NAME=global.amazon.nova-2-lite-v1:0
```

**Cost per 100 analyses:** $1.50-2.00

**Benefits:**
- 3x larger context window (1M vs 300K tokens)
- Extended reasoning capabilities
- Better performance on complex tasks
- Competitive with Claude Haiku and GPT-4o Mini

### Option 3: Mixed Configuration

Use Nova v1 for cost-sensitive agents and Nova 2 for complex reasoning:

```bash
# .env
# Default to Nova Lite v1 for cost savings
NOVA_MODEL_NAME=amazon.nova-lite-v1:0

# Use Nova 2 Lite for specific agents requiring advanced reasoning
MARKET_AGENT_PROVIDER=nova
MARKET_AGENT_MODEL=global.amazon.nova-2-lite-v1:0

RISK_AGENT_PROVIDER=nova
RISK_AGENT_MODEL=global.amazon.nova-2-lite-v1:0
```

## Configuration Examples

### Single-Provider Mode with Nova 2 Lite

```bash
# .env
LLM_SINGLE_PROVIDER=nova
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
NOVA_MODEL_NAME=global.amazon.nova-2-lite-v1:0
```

### Multi-Provider Mode with Nova 2

```bash
# .env
# Use Nova 2 Lite for most agents
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
NOVA_MODEL_NAME=global.amazon.nova-2-lite-v1:0

# Mix with other providers for specific needs
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-4o
```

## Extended Reasoning (Nova 2 Only)

Nova 2 models support extended reasoning with configurable thinking budgets:

```typescript
// Example: Enable extended reasoning in your code
const response = await bedrockRuntime.converse({
  modelId: "global.amazon.nova-2-lite-v1:0",
  messages: [{ role: "user", content: [{ text: "Complex problem..." }] }],
  additionalModelRequestFields: {
    reasoningConfig: {
      type: "enabled",  // or "disabled" (default)
      maxReasoningEffort: "low"  // "low", "medium", or "high"
    }
  }
});
```

**Reasoning Levels:**
- **Low**: Fast, cost-optimized responses
- **Medium**: Balanced reasoning depth
- **High**: Maximum reasoning for complex problems

**Note**: Extended reasoning increases token usage and costs.

## IAM Permissions Update

Update your IAM policy to include Nova 2 models:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-micro-v1:0",
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0",
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0",
        "arn:aws:bedrock:*::foundation-model/global.amazon.nova-2-lite-v1:0",
        "arn:aws:bedrock:*::foundation-model/global.amazon.nova-2-pro-v1:0"
      ]
    }
  ]
}
```

## Regional Availability

**Nova 2 Models:**
- Available via **global cross-region inference**
- Automatically routes to optimal region
- No specific region configuration needed

**Nova v1 Models:**
- Region-specific: us-east-1, us-west-2, eu-west-1, ap-southeast-1

## Testing

Test your configuration with the CLI:

```bash
# Test Nova v1 Lite
npm run cli -- analyze <condition-id> --single-provider nova --model amazon.nova-lite-v1:0

# Test Nova 2 Lite
npm run cli -- analyze <condition-id> --single-provider nova --model global.amazon.nova-2-lite-v1:0
```

## Cost Impact Analysis

### Scenario 1: High-Volume Production (1000 analyses/month)

**Nova Lite v1:**
- Cost: $2-4/month
- Quality: Good
- Context: 300K tokens

**Nova 2 Lite:**
- Cost: $15-20/month
- Quality: Very Good
- Context: 1M tokens

**Recommendation:** Stick with Nova Lite v1 unless you need extended reasoning or larger context.

### Scenario 2: Quality-First Production (100 analyses/month)

**Nova Lite v1:**
- Cost: $0.20-0.40/month
- Quality: Good

**Nova 2 Lite:**
- Cost: $1.50-2.00/month
- Quality: Very Good

**Recommendation:** Upgrade to Nova 2 Lite for better quality at minimal cost increase.

### Scenario 3: Mixed Workload

**Strategy:** Use Nova v1 for simple tasks, Nova 2 for complex reasoning

```bash
# Simple agents: Nova Lite v1
NEWS_AGENT_MODEL=amazon.nova-lite-v1:0
POLLING_AGENT_MODEL=amazon.nova-lite-v1:0

# Complex agents: Nova 2 Lite
MARKET_AGENT_MODEL=global.amazon.nova-2-lite-v1:0
RISK_AGENT_MODEL=global.amazon.nova-2-lite-v1:0
```

**Cost:** $0.80-1.20/100 analyses (balanced)

## Troubleshooting

### "Model not found" Error

**Issue:** Nova 2 models use `global.` prefix and may not be available in all regions.

**Solution:**
1. Ensure you're using the correct model ID: `global.amazon.nova-2-lite-v1:0`
2. Check model access in Bedrock console
3. Request access if needed (usually instant)

### Higher Costs Than Expected

**Issue:** Nova 2 Lite is 5-10x more expensive than Nova Lite v1.

**Solution:**
1. Review your usage patterns
2. Consider using Nova v1 for high-volume workloads
3. Use Nova 2 only for tasks requiring advanced reasoning
4. Disable extended reasoning if not needed

### Extended Reasoning Not Working

**Issue:** Extended reasoning requires specific API parameters.

**Solution:**
1. Ensure you're using Nova 2 models (not v1)
2. Add `reasoningConfig` to your API calls
3. Set `type: "enabled"` and choose reasoning level

## Support and Resources

- **AWS Documentation**: [Amazon Nova User Guide](https://docs.aws.amazon.com/nova/latest/nova2-userguide/)
- **Pricing**: [Amazon Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- **TradeWizard Docs**: [LLM_PROVIDERS.md](./LLM_PROVIDERS.md)

## Summary

- **Nova v1 models remain available** and are significantly cheaper
- **Nova 2 Lite offers superior quality** with 1M context and extended reasoning
- **Choose based on your needs**: cost vs quality vs context size
- **No breaking changes**: existing Nova v1 configurations continue to work
- **Easy migration**: just update `NOVA_MODEL_NAME` environment variable

---

**Last Updated:** January 2026
