# AWS Support Case Response - Service Quota Increase Request

## Copy and paste this into your AWS Support case reply:

---

Hello Tharun,

Thank you for your prompt response! I appreciate your assistance with this service quota increase request.

Here is the requested information in the format you specified:

### Amazon Nova Micro

**Service:** Amazon Bedrock  
**Region:** us-east-1  
**Limit name:** On-demand model inference tokens per minute for Amazon Nova Micro  
**New limit value:** 100,000

**Quota Code:** L-CFA4FA0D  
**Current Value:** 0

---

### Amazon Nova Lite

**Service:** Amazon Bedrock  
**Region:** us-east-1  
**Limit name:** On-demand model inference tokens per minute for Amazon Nova Lite  
**New limit value:** 100,000

**Quota Code:** L-70423BF8  
**Current Value:** 0

---

### Amazon Nova Pro

**Service:** Amazon Bedrock  
**Region:** us-east-1  
**Limit name:** On-demand model inference tokens per minute for Amazon Nova Pro  
**New limit value:** 100,000

**Quota Code:** L-CE33604C  
**Current Value:** 0

---

### Amazon Nova 2 Lite (if available)

**Service:** Amazon Bedrock  
**Region:** us-east-1  
**Limit name:** On-demand model inference tokens per minute for Amazon Nova 2 Lite  
**New limit value:** 100,000

**Note:** This is the model we primarily intend to use for our production workload.

---

### Additional Context

**Use Case:** AI-powered prediction market analysis platform (TradeWizard) using multi-agent LLM workflows for real-time market intelligence.

**Expected Usage Pattern:**
- Production workload with continuous inference
- Estimated 50-100 requests per minute during peak hours
- Average token usage: 500-1000 tokens per request
- Primary model: Amazon Nova 2 Lite (cost-optimized for our use case)

**Why these limits:**
- 100,000 tokens/minute provides adequate headroom for production traffic
- Allows for burst capacity during high-demand periods
- Enables proper load testing before production deployment

**Account Information:**
- Account ID: 800762439770
- Account Type: Production workload
- Valid payment method on file

Please let me know if you need any additional information to process this request.

Thank you for your assistance!

Best regards

---

## Alternative: If they need separate requests per quota

If AWS Support asks you to submit separate requests for each quota, use these individual formats:

### Request 1: Nova Micro
```
Service: Amazon Bedrock
Region: us-east-1
Limit name: On-demand model inference tokens per minute for Amazon Nova Micro
New limit value: 100,000
```

### Request 2: Nova Lite
```
Service: Amazon Bedrock
Region: us-east-1
Limit name: On-demand model inference tokens per minute for Amazon Nova Lite
New limit value: 100,000
```

### Request 3: Nova Pro
```
Service: Amazon Bedrock
Region: us-east-1
Limit name: On-demand model inference tokens per minute for Amazon Nova Pro
New limit value: 100,000
```

## What Happens Next

1. **AWS Support reviews** your request (usually within hours)
2. **Service team approves** the quota increases
3. **You receive email notification** when approved
4. **Test immediately** with: `npx tsx scripts/test-bedrock-nova.ts`
5. **All tests should pass!** ✅

## Expected Timeline

- **Review:** 2-4 hours
- **Approval:** 24-48 hours (often much faster)
- **Notification:** Email when complete

## After Approval

Once you receive the approval email:

1. **Verify quotas increased:**
   ```bash
   aws service-quotas get-service-quota \
     --service-code bedrock \
     --quota-code L-CFA4FA0D \
     --region us-east-1
   ```

2. **Test Nova models:**
   ```bash
   cd tradewizard-agents
   npx tsx scripts/test-bedrock-nova.ts
   ```

3. **Update your .env:**
   ```bash
   LLM_SINGLE_PROVIDER=nova
   NOVA_MODEL_NAME=amazon.nova-2-lite-v1:0
   ```

4. **Deploy TradeWizard:**
   ```bash
   npm run cli -- analyze <conditionId>
   ```

You're almost there! 🚀
