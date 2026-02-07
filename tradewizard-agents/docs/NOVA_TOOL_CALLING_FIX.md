# Nova Tool Calling Fix

## Problem

The error `Currently, tool calling through Bedrock is only supported for Anthropic models` occurs because the codebase is using the **old Bedrock API** (`BedrockChat` from `@langchain/community`) which doesn't support tool calling for Nova models.

## Root Cause

- **Current Implementation**: Uses `BedrockChat` from `@langchain/community/chat_models/bedrock`
- **Issue**: This uses the older Bedrock InvokeModel API which only supports tool calling for Anthropic Claude models
- **Nova Support**: Amazon Nova models DO support tool calling, but only through the newer **Bedrock Converse API**

## Solution

Switch from `BedrockChat` to `ChatBedrockConverse` from `@langchain/aws`.

### Key Differences

| Feature | BedrockChat (Old) | ChatBedrockConverse (New) |
|---------|------------------|---------------------------|
| Package | `@langchain/community` | `@langchain/aws` |
| API | InvokeModel | Converse |
| Tool Calling | Claude only | Claude + Nova + others |
| Nova Support | ❌ No tool calling | ✅ Full tool calling |

## Implementation Steps

### 1. Install Required Package

```bash
npm install @langchain/aws
```

### 2. Update bedrock-client.ts

Replace `BedrockChat` with `ChatBedrockConverse`:

```typescript
import { ChatBedrockConverse } from '@langchain/aws';

export class BedrockClient {
  createChatModel(): ChatBedrockConverse {
    // Handle Nova 2 models with 'global.' prefix
    let modelId = this.config.modelId;
    if (modelId.startsWith('global.')) {
      modelId = modelId.replace('global.', '');
    }

    const modelConfig: any = {
      model: modelId,  // ChatBedrockConverse uses 'model' not 'modelId'
      region: this.config.region,
      temperature: this.config.temperature ?? 0.7,
    };

    // Add optional parameters
    if (this.config.maxTokens !== undefined) {
      modelConfig.maxTokens = this.config.maxTokens;
    }

    if (this.config.topP !== undefined) {
      modelConfig.topP = this.config.topP;
    }

    // Add credentials if provided
    if (this.config.credentials) {
      modelConfig.credentials = {
        accessKeyId: this.config.credentials.accessKeyId,
        secretAccessKey: this.config.credentials.secretAccessKey,
      };
    }

    return new ChatBedrockConverse(modelConfig);
  }
}
```

### 3. Update llm-factory.ts

Update the import and type definitions:

```typescript
import { ChatBedrockConverse } from '@langchain/aws';

export type LLMInstance = 
  | ChatOpenAI 
  | ChatAnthropic 
  | ChatGoogleGenerativeAI 
  | ChatBedrockConverse;
```

### 4. Remove Nova-Specific Workarounds

The `withStructuredOutput` wrapper in `llm-factory.ts` that checks for `BedrockChat` and uses JSON mode can be removed or simplified, since `ChatBedrockConverse` supports tool calling natively.

## Verification

After making these changes:

1. **Test tool calling**: Run your agents and verify they can use tools
2. **Check Opik logs**: Confirm no more "tool calling not supported" errors
3. **Validate responses**: Ensure Nova models are generating proper tool calls

## References

- [AWS Nova Tool Use Documentation](https://docs.aws.amazon.com/nova/latest/userguide/tool-use.html)
- [LangChain ChatBedrockConverse Docs](https://docs.langchain.com/oss/javascript/integrations/chat/bedrock_converse)
- [AWS Blog: Tool Choice with Amazon Nova](https://aws.amazon.com/blogs/machine-learning/tool-choice-with-amazon-nova-models/)

## Additional Notes

### Nova Model Support

All Nova models support tool calling via the Converse API:
- ✅ amazon.nova-micro-v1:0
- ✅ amazon.nova-lite-v1:0
- ✅ amazon.nova-pro-v1:0
- ✅ global.amazon.nova-2-lite-v1:0
- ✅ global.amazon.nova-2-pro-v1:0

### Tool Choice Options

Nova supports these tool choice modes:
- `auto`: Model decides whether to use tools
- `any`: Model must use at least one tool
- `tool`: Model must use a specific tool

### Known Limitations

- Custom Bedrock models are not yet supported by the Converse API
- Some advanced features may have different behavior compared to the old API
