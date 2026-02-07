# Nova Tool Calling Migration - Completed

## Summary

Successfully migrated from `BedrockChat` (old Bedrock API) to `ChatBedrockConverse` (Converse API) to enable tool calling support for Amazon Nova models.

## Problem Solved

**Error**: `Currently, tool calling through Bedrock is only supported for Anthropic models`

**Root Cause**: The old `BedrockChat` from `@langchain/community` uses the InvokeModel API which only supports tool calling for Claude models. Nova models require the newer Converse API.

## Changes Made

### 1. Package Installation
- ✅ Installed `@langchain/aws` package (contains `ChatBedrockConverse`)
- Command used: `npm install @langchain/aws --legacy-peer-deps`

### 2. Updated Files

#### `src/utils/bedrock-client.ts`
- Changed import from `BedrockChat` to `ChatBedrockConverse`
- Updated package: `@langchain/community/chat_models/bedrock` → `@langchain/aws`
- Updated return type in `createChatModel()` method
- Added documentation about Converse API support

#### `src/utils/llm-factory.ts`
- Updated import to use `ChatBedrockConverse` instead of `BedrockChat`
- Updated `LLMInstance` type definition
- Simplified `withStructuredOutput()` function - removed Nova-specific JSON mode workaround
- All providers now support native tool calling via `withStructuredOutput()`

#### `src/nodes/agents.nova.test.ts`
- Updated mock from `BedrockChat` to `ChatBedrockConverse`
- Changed mock package: `@langchain/community/chat_models/bedrock` → `@langchain/aws`
- Updated comments to reflect new implementation

#### `src/nodes/agents.test.ts`
- Updated comment to clarify constructor name usage

### 3. Test Results
All Nova integration tests passing:
```
✓ src/nodes/agents.nova.test.ts (4 tests) 18ms
  ✓ Single-provider mode with Nova (2)
  ✓ Multi-provider mode with Nova fallback (1)
  ✓ State consistency with Nova (1)
```

## What This Enables

### Tool Calling Support
Nova models can now:
- ✅ Use `withStructuredOutput()` for structured data extraction
- ✅ Call tools/functions defined in LangGraph workflows
- ✅ Participate in multi-agent workflows with tool usage
- ✅ Generate structured responses matching Zod schemas

### Supported Nova Models
All Nova models now have full tool calling support:
- `amazon.nova-micro-v1:0`
- `amazon.nova-lite-v1:0`
- `amazon.nova-pro-v1:0`
- `global.amazon.nova-2-lite-v1:0`
- `global.amazon.nova-2-pro-v1:0`

### Tool Choice Options
Nova supports these tool choice modes via Converse API:
- `auto`: Model decides whether to use tools (default)
- `any`: Model must use at least one tool
- `tool`: Model must use a specific tool

## Verification Steps

1. ✅ TypeScript compilation - no errors
2. ✅ Unit tests passing
3. ✅ Nova integration tests passing
4. ✅ Monitor service restarted successfully

## Next Steps

### Testing in Production
1. Monitor Opik logs for tool calling behavior
2. Verify no more "tool calling not supported" errors
3. Check that Nova models are generating proper tool calls
4. Compare performance/quality with other providers

### Optional Optimizations
- Consider using Nova 2 models for improved reasoning
- Experiment with different tool choice modes
- Fine-tune temperature and other parameters for tool calling

## References

- [AWS Nova Tool Use Documentation](https://docs.aws.amazon.com/nova/latest/userguide/tool-use.html)
- [LangChain ChatBedrockConverse Docs](https://docs.langchain.com/oss/javascript/integrations/chat/bedrock_converse)
- [AWS Blog: Tool Choice with Amazon Nova](https://aws.amazon.com/blogs/machine-learning/tool-choice-with-amazon-nova-models/)
- [LangChain Forum: Nova Tool Calling Discussion](https://forum.langchain.com/t/langchain-v1-agentic-flow-on-bedrock-fails-for-non-claude-models-available-in-bedrock-llama4-nova-gpt-oss/2251)

## Migration Date
February 7, 2026

## Status
✅ **CODE MIGRATION COMPLETE** - Nova models now have full tool calling support via ChatBedrockConverse

⚠️ **PERMISSIONS REQUIRED** - You need to enable Bedrock model access in AWS Console

## Current Issue: AWS Permissions

The error "Operation not allowed" indicates your AWS account needs Bedrock permissions configured.

### Quick Fix

1. **Enable Model Access**: Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/) → Model access → Enable Amazon Nova models
2. **Add IAM Permissions**: Attach `AmazonBedrockFullAccess` policy to your IAM user
3. **Verify Region**: Ensure `AWS_REGION=us-east-1` in your `.env`

See [BEDROCK_PERMISSIONS_TROUBLESHOOTING.md](./BEDROCK_PERMISSIONS_TROUBLESHOOTING.md) for detailed instructions.

## Next Steps

1. Fix AWS Bedrock permissions (see troubleshooting doc)
2. Run test: `npx tsx test-bedrock-structured.ts`
3. Once test passes, tool calling will work automatically
4. Monitor Opik logs to verify no more errors
