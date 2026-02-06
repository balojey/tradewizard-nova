# Amazon Nova Integration Troubleshooting Guide

This guide provides solutions for common issues when integrating Amazon Nova models with TradeWizard.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [IAM Permission Issues](#iam-permission-issues)
- [Model Access Issues](#model-access-issues)
- [Configuration Issues](#configuration-issues)
- [Runtime Errors](#runtime-errors)
- [Performance Issues](#performance-issues)
- [Cost and Billing Issues](#cost-and-billing-issues)

## Authentication Issues

### Issue: "Authentication failed" or "Invalid AWS credentials"

**Symptoms:**
- Error message: `UnrecognizedClientException: The security token included in the request is invalid`
- Error message: `InvalidSignatureException: The request signature we calculated does not match`
- Nova models fail to initialize

**Causes:**
- Missing or incorrect AWS credentials
- Expired credentials
- Credentials with extra spaces or newlines
- Wrong credential format

**Solutions:**

1. **Verify credentials are set correctly:**
   ```bash
   # Check if environment variables are set
   echo $AWS_ACCESS_KEY_ID
   echo $AWS_SECRET_ACCESS_KEY
   echo $AWS_REGION
   ```

2. **Check .env file format:**
   ```bash
   # Correct format (no quotes, no spaces)
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   AWS_REGION=us-east-1
   ```

3. **Test credentials with AWS CLI:**
   ```bash
   aws sts get-caller-identity
   ```
   
   Expected output:
   ```json
   {
     "UserId": "AIDAI...",
     "Account": "123456789012",
     "Arn": "arn:aws:iam::123456789012:user/tradewizard-bedrock"
   }
   ```

4. **Regenerate access keys if needed:**
   - Go to [IAM Console](https://console.aws.amazon.com/iam/)
   - Select your user
   - Security credentials tab
   - Create new access key
   - Update .env file with new credentials

### Issue: "Credentials have expired"

**Symptoms:**
- Error message: `ExpiredTokenException: The security token included in the request is expired`
- Works initially but fails after some time

**Causes:**
- Using temporary credentials (STS tokens) that have expired
- Session tokens not refreshed

**Solutions:**

1. **Use long-term IAM user credentials instead of temporary tokens**
2. **If using temporary credentials, implement automatic refresh:**
   ```typescript
   import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
   
   const credentials = fromTemporaryCredentials({
     params: {
       RoleArn: "arn:aws:iam::123456789012:role/YourRole",
     },
   });
   ```

3. **For EC2/ECS deployments, use IAM roles instead of access keys**

## IAM Permission Issues

### Issue: "Access Denied" or "UnauthorizedException"

**Symptoms:**
- Error message: `AccessDeniedException: User: arn:aws:iam::123456789012:user/tradewizard is not authorized to perform: bedrock:InvokeModel`
- Authentication succeeds but model invocation fails

**Causes:**
- IAM user/role lacks required Bedrock permissions
- IAM policy doesn't include Nova model ARNs
- Bedrock service not enabled in account

**Solutions:**

1. **Verify IAM permissions:**
   ```bash
   # Check current user's policies
   aws iam list-attached-user-policies --user-name tradewizard-bedrock
   aws iam list-user-policies --user-name tradewizard-bedrock
   ```

2. **Attach minimum required policy:**
   
   Create a policy named `BedrockNovaAccess`:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "bedrock:InvokeModel",
           "bedrock:InvokeModelWithResponseStream"
         ],
         "Resource": [
           "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-micro-v1:0",
           "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0",
           "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0"
         ]
       }
     ]
   }
   ```

3. **Attach policy to user:**
   ```bash
   aws iam put-user-policy \
     --user-name tradewizard-bedrock \
     --policy-name BedrockNovaAccess \
     --policy-document file://bedrock-nova-policy.json
   ```

4. **For development, use managed policy (less secure):**
   ```bash
   aws iam attach-user-policy \
     --user-name tradewizard-bedrock \
     --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
   ```

### Issue: "Insufficient permissions for model access"

**Symptoms:**
- Error message: `AccessDeniedException: You don't have access to the model with the specified model ID`
- IAM permissions look correct but still can't access models

**Causes:**
- Model access not requested in Bedrock console
- Model access request pending approval
- Model not available in selected region

**Solutions:**

1. **Request model access in Bedrock console:**
   - Go to [Amazon Bedrock Console](https://console.aws.amazon.com/bedrock/)
   - Click "Model access" in left sidebar
   - Click "Manage model access"
   - Find "Amazon" provider
   - Check boxes for Nova Micro, Nova Lite, Nova Pro
   - Click "Request model access"
   - Wait for approval (usually instant)

2. **Verify model access status:**
   ```bash
   aws bedrock list-foundation-models \
     --region us-east-1 \
     --query 'modelSummaries[?contains(modelId, `nova`)]'
   ```

3. **Check if models are available in your region:**
   - Nova models are available in: us-east-1, us-west-2, eu-west-1, ap-southeast-1
   - Update AWS_REGION in .env if needed

## Model Access Issues

### Issue: "Model not found" or "ResourceNotFoundException"

**Symptoms:**
- Error message: `ResourceNotFoundException: The specified model identifier is not found`
- Error message: `ValidationException: The provided model identifier is invalid`

**Causes:**
- Incorrect model ID format
- Typo in model name
- Model not available in region
- Model access not granted

**Solutions:**

1. **Verify model ID format:**
   ```bash
   # Correct format
   NOVA_MODEL_NAME=amazon.nova-lite-v1:0
   
   # Incorrect formats (will fail)
   NOVA_MODEL_NAME=nova-lite
   NOVA_MODEL_NAME=amazon.nova-lite
   NOVA_MODEL_NAME=amazon.nova-lite-v1
   ```

2. **List available Nova models:**
   ```bash
   aws bedrock list-foundation-models \
     --region us-east-1 \
     --by-provider amazon \
     --query 'modelSummaries[?contains(modelId, `nova`)].{ModelId:modelId,Name:modelName}'
   ```

3. **Test model access:**
   ```bash
   aws bedrock invoke-model \
     --region us-east-1 \
     --model-id amazon.nova-lite-v1:0 \
     --body '{"prompt":"Hello","max_tokens":10}' \
     --cli-binary-format raw-in-base64-out \
     output.json
   ```

### Issue: "Region not supported"

**Symptoms:**
- Error message: `InvalidParameterException: Bedrock is not available in the specified region`
- Models work in one region but not another

**Causes:**
- Bedrock not available in selected region
- Nova models not available in selected region

**Solutions:**

1. **Use a supported region:**
   ```bash
   # Supported regions for Nova (as of 2026)
   AWS_REGION=us-east-1      # US East (N. Virginia) - Recommended
   AWS_REGION=us-west-2      # US West (Oregon)
   AWS_REGION=eu-west-1      # Europe (Ireland)
   AWS_REGION=ap-southeast-1 # Asia Pacific (Singapore)
   ```

2. **Check latest region availability:**
   - Visit [AWS Bedrock Regions](https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-regions.html)
   - Verify Nova models are listed for your region

3. **Update configuration:**
   ```bash
   # .env
   AWS_REGION=us-east-1
   ```

## Configuration Issues

### Issue: "Configuration invalid" or "Missing required configuration"

**Symptoms:**
- Error message: `Configuration validation failed: AWS_REGION is required`
- Application fails to start
- Nova models not initialized

**Causes:**
- Missing required environment variables
- Typos in variable names
- .env file not loaded

**Solutions:**

1. **Verify all required variables are set:**
   ```bash
   # Required variables
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   NOVA_MODEL_NAME=amazon.nova-lite-v1:0
   ```

2. **Check for typos:**
   ```bash
   # Correct variable names
   AWS_ACCESS_KEY_ID     # Not AWS_ACCESS_KEY or ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY # Not AWS_SECRET_KEY or SECRET_ACCESS_KEY
   AWS_REGION            # Not AWS_DEFAULT_REGION
   NOVA_MODEL_NAME       # Not NOVA_MODEL or NOVA_MODEL_ID
   ```

3. **Verify .env file is loaded:**
   ```typescript
   // Add debug logging
   console.log('AWS_REGION:', process.env.AWS_REGION);
   console.log('NOVA_MODEL_NAME:', process.env.NOVA_MODEL_NAME);
   ```

4. **Check .env file location:**
   - Should be in project root: `tradewizard-agents/.env`
   - Not in subdirectories

### Issue: "Invalid parameter value"

**Symptoms:**
- Error message: `ValidationException: 1 validation error detected: Value at 'temperature' failed to satisfy constraint`
- Model parameters rejected

**Causes:**
- Parameter values outside valid range
- Wrong parameter types

**Solutions:**

1. **Verify parameter ranges:**
   ```bash
   # Valid ranges
   NOVA_TEMPERATURE=0.7      # Must be 0.0-1.0
   NOVA_MAX_TOKENS=2048      # Must be positive integer
   NOVA_TOP_P=0.9            # Must be 0.0-1.0
   ```

2. **Use default values if unsure:**
   ```bash
   # Safe defaults
   NOVA_TEMPERATURE=0.7
   NOVA_MAX_TOKENS=2048
   NOVA_TOP_P=0.9
   ```

3. **Remove optional parameters:**
   ```bash
   # Minimal configuration
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   NOVA_MODEL_NAME=amazon.nova-lite-v1:0
   # Optional parameters commented out
   ```

## Runtime Errors

### Issue: "Throttling" or "Rate limit exceeded"

**Symptoms:**
- Error message: `ThrottlingException: Rate exceeded`
- Error message: `TooManyRequestsException: Too many requests`
- Intermittent failures during high load

**Causes:**
- Exceeding Nova rate limits (200 RPM for Micro/Lite, 100 RPM for Pro)
- Exceeding token throughput limits
- Burst traffic

**Solutions:**

1. **Implement exponential backoff (already handled by TradeWizard):**
   ```typescript
   // Automatic retry with backoff
   const result = await retryWithBackoff(
     () => novaModel.invoke(prompt),
     { maxRetries: 3, initialDelay: 1000 }
   );
   ```

2. **Request quota increase:**
   - Go to [AWS Service Quotas](https://console.aws.amazon.com/servicequotas/)
   - Search for "Bedrock"
   - Request increase for "Invocations per minute"

3. **Distribute load across regions:**
   ```bash
   # Use multiple regions for higher throughput
   AWS_REGION=us-east-1  # Primary
   AWS_REGION_FALLBACK=us-west-2  # Fallback
   ```

4. **Reduce request rate:**
   ```bash
   # .env
   ANALYSIS_INTERVAL_HOURS=48  # Increase from 24 to 48
   MAX_MARKETS_PER_CYCLE=2     # Decrease from 3 to 2
   ```

### Issue: "Connection timeout"

**Symptoms:**
- Error message: `TimeoutError: Connection timed out after 30000ms`
- Requests hang indefinitely
- Intermittent connectivity issues

**Causes:**
- Network connectivity issues
- Firewall blocking HTTPS traffic
- AWS service outage
- High latency to AWS region

**Solutions:**

1. **Check network connectivity:**
   ```bash
   # Test connectivity to Bedrock endpoint
   curl -I https://bedrock-runtime.us-east-1.amazonaws.com
   ```

2. **Verify firewall rules:**
   - Allow outbound HTTPS (port 443)
   - Allow connections to *.amazonaws.com

3. **Increase timeout:**
   ```typescript
   // In bedrock-client.ts
   const client = new BedrockRuntimeClient({
     region: config.awsRegion,
     requestHandler: {
       requestTimeout: 60000, // Increase to 60 seconds
     },
   });
   ```

4. **Check AWS service health:**
   - Visit [AWS Service Health Dashboard](https://status.aws.amazon.com/)
   - Check Bedrock service status in your region

5. **Use region with lower latency:**
   ```bash
   # Test latency to different regions
   ping bedrock-runtime.us-east-1.amazonaws.com
   ping bedrock-runtime.us-west-2.amazonaws.com
   ping bedrock-runtime.eu-west-1.amazonaws.com
   ```

### Issue: "Invalid request format"

**Symptoms:**
- Error message: `ValidationException: Invalid request body`
- Error message: `SerializationException: Failed to parse request`

**Causes:**
- Incorrect request payload format
- Missing required fields
- Invalid JSON

**Solutions:**

1. **Verify LangChain integration:**
   ```typescript
   // Correct usage
   import { BedrockChat } from "@langchain/community/chat_models/bedrock";
   
   const model = new BedrockChat({
     model: "amazon.nova-lite-v1:0",
     region: "us-east-1",
     temperature: 0.7,
   });
   ```

2. **Check for custom request modifications:**
   - Ensure no manual request body modifications
   - Let LangChain handle request formatting

3. **Update LangChain dependencies:**
   ```bash
   npm update @langchain/community @langchain/core
   ```

## Performance Issues

### Issue: "High latency" or "Slow responses"

**Symptoms:**
- Requests take >5 seconds to complete
- Timeout warnings in logs
- Poor user experience

**Causes:**
- Using distant AWS region
- Network latency
- Large token outputs
- Nova Pro model (slower than Lite/Micro)

**Solutions:**

1. **Use region closest to deployment:**
   ```bash
   # If deployed in US East
   AWS_REGION=us-east-1
   
   # If deployed in Europe
   AWS_REGION=eu-west-1
   ```

2. **Switch to faster model:**
   ```bash
   # Nova Lite is faster than Nova Pro
   NOVA_MODEL_NAME=amazon.nova-lite-v1:0
   
   # Nova Micro is fastest
   NOVA_MODEL_NAME=amazon.nova-micro-v1:0
   ```

3. **Reduce max tokens:**
   ```bash
   # Lower max tokens for faster responses
   NOVA_MAX_TOKENS=1024  # Instead of 2048
   ```

4. **Monitor latency:**
   ```typescript
   // Add latency tracking
   const start = Date.now();
   const result = await model.invoke(prompt);
   const latency = Date.now() - start;
   console.log(`Nova latency: ${latency}ms`);
   ```

### Issue: "High memory usage"

**Symptoms:**
- Application memory usage increases over time
- Out of memory errors
- Performance degradation

**Causes:**
- Memory leaks in Bedrock client
- Not reusing client instances
- Large response caching

**Solutions:**

1. **Reuse Bedrock client instances:**
   ```typescript
   // Create client once
   const client = new BedrockClient({ region: "us-east-1" });
   
   // Reuse for all requests
   export function getBedrockClient() {
     return client;
   }
   ```

2. **Implement response streaming:**
   ```typescript
   // Use streaming for large responses
   const stream = await model.stream(prompt);
   for await (const chunk of stream) {
     process(chunk);
   }
   ```

3. **Clear caches periodically:**
   ```typescript
   // Clear old cache entries
   setInterval(() => {
     cache.clear();
   }, 3600000); // Every hour
   ```

## Cost and Billing Issues

### Issue: "Unexpected high costs"

**Symptoms:**
- AWS bill higher than expected
- Rapid cost increase
- Cost alerts triggered

**Causes:**
- Using Nova Pro instead of Lite/Micro
- High request volume
- Large token outputs
- No cost monitoring

**Solutions:**

1. **Switch to cheaper model:**
   ```bash
   # Nova Micro is 10x cheaper than Pro
   NOVA_MODEL_NAME=amazon.nova-micro-v1:0
   
   # Nova Lite is 13x cheaper than Pro
   NOVA_MODEL_NAME=amazon.nova-lite-v1:0
   ```

2. **Enable cost tracking:**
   ```bash
   # .env
   OPIK_TRACK_COSTS=true
   ```

3. **Set up billing alerts:**
   - Go to [AWS Billing Console](https://console.aws.amazon.com/billing/)
   - Create budget alerts at $10, $50, $100

4. **Reduce request volume:**
   ```bash
   # .env
   ANALYSIS_INTERVAL_HOURS=48  # Analyze less frequently
   MAX_MARKETS_PER_CYCLE=1     # Analyze fewer markets
   ```

5. **Monitor costs in Opik:**
   - View per-agent costs
   - Track daily/monthly totals
   - Identify cost spikes

### Issue: "Cannot track Nova costs in Opik"

**Symptoms:**
- Nova usage not appearing in Opik dashboard
- Cost calculations missing
- Incomplete observability

**Causes:**
- Opik integration not configured for Nova
- Cost tracking disabled
- Missing Nova pricing data

**Solutions:**

1. **Verify Opik configuration:**
   ```bash
   # .env
   OPIK_API_KEY=your_key_here
   OPIK_TRACK_COSTS=true
   ```

2. **Check Nova cost tracking implementation:**
   ```typescript
   // Ensure Nova costs are tracked
   trackNovaInvocation(
     agentName,
     modelVariant,
     inputTokens,
     outputTokens,
     latencyMs
   );
   ```

3. **Verify pricing data:**
   ```typescript
   // Check Nova pricing is defined
   const pricing = getNovaPricing("amazon.nova-lite-v1:0");
   console.log(pricing); // Should show input/output costs
   ```

## Getting Help

If you're still experiencing issues after trying these solutions:

1. **Check application logs:**
   ```bash
   # View recent logs
   tail -f logs/tradewizard.log
   
   # Search for errors
   grep -i "error" logs/tradewizard.log
   ```

2. **Enable debug logging:**
   ```bash
   # .env
   LOG_LEVEL=debug
   ```

3. **Review Opik traces:**
   - Go to Opik dashboard
   - Filter by Nova provider
   - Examine failed traces

4. **Contact support:**
   - **AWS Bedrock:** [https://aws.amazon.com/support/](https://aws.amazon.com/support/)
   - **TradeWizard:** Check [README.md](../README.md#troubleshooting)

5. **Community resources:**
   - AWS Bedrock documentation: [https://docs.aws.amazon.com/bedrock/](https://docs.aws.amazon.com/bedrock/)
   - LangChain Bedrock guide: [https://python.langchain.com/docs/integrations/chat/bedrock](https://python.langchain.com/docs/integrations/chat/bedrock)

---

**Last Updated:** February 2026
