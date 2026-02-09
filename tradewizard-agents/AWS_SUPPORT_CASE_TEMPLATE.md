# AWS Support Case Template - Bedrock Account-Level Access Issue

## 🚨 KEY POINT: This is a SERVICE QUOTA issue!
- ❌ **All on-demand inference quotas are set to 0**
- ❌ Quotas are marked as "not adjustable" via API
- ❌ Root credentials fail (proves it's not IAM)
- ❌ All models fail (all have 0 quota)
- ✅ Can list models (metadata access works)
- **Root Cause:** Service quotas need to be increased by AWS Support
- **Quota Codes:** L-CFA4FA0D (Micro), L-70423BF8 (Lite), L-CE33604C (Pro)

---

## Case Type
**Select:** "Service limit increase" (THIS IS A QUOTA ISSUE!)

## Severity
**Select:** "General guidance" (or "System impaired" if you have Business/Enterprise support)

## Subject Line
```
Bedrock on-demand inference quotas set to 0 - Need quota increase for account 800762439770
```

## Case Description

Copy and paste this into the case description:

---

### Issue Summary
My AWS account (800762439770) cannot invoke any Amazon Bedrock foundation models because **all on-demand model inference quotas are set to 0**. The quotas are marked as "not adjustable" via the Service Quotas API, requiring AWS Support intervention to increase them.

**Root Cause Identified:** Service quota limitation, not IAM permissions.

### Account Information
- **Account ID:** 800762439770
- **Primary Region:** us-east-1
- **Issue:** All on-demand inference quotas = 0
- **Use Case:** AI-powered prediction market analysis platform (TradeWizard)

### Error Details
**Error Message:**
```
ValidationException: Operation not allowed
```

**API Calls Failing:**
- `bedrock-runtime:InvokeModel`
- `bedrock-runtime:InvokeModelWithResponseStream`
- `bedrock-runtime:Converse`

### What Works ✅
1. `bedrock:ListFoundationModels` - Successfully lists all available models
2. `bedrock:GetFoundationModel` - Successfully retrieves model metadata
3. Bedrock console access - Can view model catalog and model access page
4. Model access page shows "automatic access for serverless models"
5. Account has valid payment method and no billing issues

### What Doesn't Work ❌
1. **Cannot invoke ANY foundation model from this account**
2. **Issue persists with root account credentials** (not IAM user-specific)
3. Tested models:
   - amazon.nova-micro-v1:0
   - amazon.nova-lite-v1:0
   - amazon.nova-2-lite-v1:0
   - amazon.nova-pro-v1:0
   - us.amazon.nova-micro-v1:0 (inference profile)
   - anthropic.claude-3-haiku-20240307-v1:0
4. Fails in both us-east-1 and us-west-2 regions
5. Fails with both InvokeModel and Converse APIs
6. Fails regardless of IAM permissions (even with AmazonBedrockFullAccess)

### Service Quota Analysis (ROOT CAUSE)

I've identified that **all on-demand model inference quotas are set to 0** for this account:

**Amazon Nova Models:**
- Quota Code: L-CFA4FA0D - "On-demand model inference tokens per minute for Amazon Nova Micro" = **0**
- Quota Code: L-70423BF8 - "On-demand model inference tokens per minute for Amazon Nova Lite" = **0**
- Quota Code: L-CE33604C - "On-demand model inference tokens per minute for Amazon Nova Pro" = **0**

**Other Models (also 0):**
- Anthropic Claude (all variants): **0**
- Meta Llama (all variants): **0**
- Mistral (all variants): **0**
- All other foundation models: **0**

**Quota Status:**
- All quotas marked as `"Adjustable": false`
- Cannot be increased via Service Quotas API
- Requires AWS Support intervention

**Verification Command:**
```bash
aws service-quotas list-service-quotas \
  --service-code bedrock \
  --region us-east-1 \
  --query 'Quotas[?contains(QuotaName, `On-demand`) && contains(QuotaName, `Nova`)]'
```

This explains why:
1. All model invocations fail with "Operation not allowed"
2. Issue affects root credentials (not IAM-related)
3. All models fail (all have 0 quota)
4. All regions fail (quotas are account-wide)

### IAM Permissions (For Reference)
While this is clearly an account-level issue (not IAM-related), for completeness:

**IAM User Created:** tradewizard-bedrock  
**Policies Attached:**
- AmazonBedrockFullAccess (managed policy)
- AmazonBedrockMarketplaceAccess (managed policy)
- Custom inline policy with bedrock:InvokeModel permissions

**However:** The same error occurs with root account credentials, proving IAM is not the issue.

### Testing Performed

**Test 1: AWS CLI with root account credentials**
```bash
aws bedrock-runtime invoke-model \
  --model-id "amazon.nova-micro-v1:0" \
  --body '{"messages":[{"role":"user","content":[{"text":"Hello"}]}],"inferenceConfig":{"maxTokens":10}}' \
  --region us-east-1 \
  output.json

Result: ValidationException: Operation not allowed ❌
```

**Test 2: AWS CLI with IAM user credentials (tradewizard-bedrock)**
```bash
# Same command with IAM user credentials (AmazonBedrockFullAccess policy)
Result: ValidationException: Operation not allowed ❌
```

**Test 3: Different regions (with root credentials)**
- us-east-1: Failed ❌
- us-west-2: Failed ❌

**Test 4: Different models (with root credentials)**
- Amazon Nova (all variants): Failed ❌
- Anthropic Claude: Failed ❌
- Inference profiles: Failed ❌

**Test 5: Converse API (with root credentials)**
```bash
aws bedrock-runtime converse \
  --model-id "amazon.nova-micro-v1:0" \
  --messages '[{"role":"user","content":[{"text":"Hello"}]}]' \
  --region us-east-1

Result: ValidationException: Operation not allowed ❌
```

**Test 6: Bedrock Playground in Console**
- Attempted to use Chat playground with root account
- [Please specify if this works or also fails]

### Diagnostic Information

**SDK/CLI Versions:**
- AWS CLI: Latest version
- AWS SDK for JavaScript: @aws-sdk/client-bedrock-runtime v3.984.0
- Node.js: v18+

**Request Format:**
Using the correct request format as documented in AWS Bedrock documentation for Nova models (Converse API format with messages array).

**Model Access Status:**
The Bedrock console's "Model access" page indicates:
- "Legacy model access request system is no longer needed"
- "Automatic access for all serverless models"
- No pending access requests
- All Nova models show as available

### Impact
This is blocking our production application (TradeWizard) from using Amazon Bedrock for AI-powered market analysis. We specifically need Amazon Nova models for cost-effective inference at scale.

**Business Impact:**
- Cannot deploy production AI features
- Blocking development and testing
- Considering alternative cloud providers if not resolved

### Request
**Please investigate and enable Amazon Bedrock model invocation capabilities for account 800762439770.**

This appears to be an account-level service restriction that requires backend enablement by AWS. Since the issue persists with root credentials and affects all models across all regions, this is clearly not an IAM configuration issue.

### Additional Context
- **Account Status:** Active, valid payment method on file
- **No billing issues or alerts**
- **Not in an AWS Organization** (no SCPs restricting access)
- **Account created:** [Specify when if known]
- **First time using Bedrock:** Yes
- **Model Access page status:** Shows "automatic access for serverless models"
- **No pending access requests**
- **Console access:** Can view all Bedrock pages and model catalog

### Specific Questions for AWS Support
1. **Is there a backend flag or setting that needs to be enabled for this account to invoke Bedrock models?**
2. **Are there any account-level restrictions or holds preventing Bedrock usage?**
3. **Is there an additional opt-in or verification step required beyond the console's "automatic access"?**
4. **Are there any regional restrictions on account 800762439770?**
5. **Is there a service quota set to zero that needs to be increased?**
6. **Can you check the account's Bedrock service status in your internal systems?**

Thank you for your assistance in resolving this issue.

---

## Attachments (Optional)

If the support form allows attachments, you can attach:
1. Screenshot of the error from AWS CLI
2. Screenshot of the Model Access page showing "automatic access"
3. Screenshot of IAM policies attached to the user

## Contact Preferences

**Preferred contact language:** English

**Preferred contact method:** Email (or Web if you want faster response)

## After Submitting

1. **Note your Case ID** - You'll receive one immediately
2. **Expected response time:**
   - Basic Support: 12-24 hours
   - Developer Support: 12 hours  
   - Business Support: 1 hour
   - Enterprise Support: 15 minutes

3. **Check your email** - AWS will send updates to your account email

4. **Be ready to provide:**
   - CloudTrail logs if requested
   - Additional diagnostic output
   - Screenshots of console pages

## Follow-up Actions

Once AWS Support responds:

1. **If they ask for CloudTrail logs:**
   ```bash
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=EventName,AttributeValue=InvokeModel \
     --max-results 10 \
     --region us-east-1 \
     --output json > cloudtrail-logs.json
   ```

2. **If they ask for more diagnostic info:**
   Run: `./scripts/deep-diagnostic.sh > diagnostic-output.txt`

3. **If they enable access:**
   Test immediately: `npx tsx scripts/test-bedrock-nova.ts`

## Escalation Path

If the first response doesn't resolve the issue:

1. **Reply with emphasis:**
   - "This is an **account-level restriction**, not IAM-related"
   - "Issue affects **root account credentials**"
   - "Blocking production deployment of AI features"
   - "All models fail across all regions"
   - Request escalation to **Bedrock service team backend engineers**

2. **Ask specifically:**
   - "Can you check the account's Bedrock service enablement status in your internal systems?"
   - "Is there a backend flag or database entry that needs to be toggled for account 800762439770?"
   - "Can you verify this account has full Bedrock runtime access enabled?"
   - "Are there any compliance or verification holds on this account?"

3. **Emphasize the key diagnostic:**
   - "Root credentials fail with the same error - this proves it's not IAM"
   - "Can list models but cannot invoke - suggests partial service access"
   - "Model access page says 'automatic' but invocation is blocked"

## Alternative: AWS Support Chat

If available, you can also try AWS Support Chat:
1. Go to: https://console.aws.amazon.com/support/home
2. Look for "Chat with support" option
3. Use the same information above
4. Chat is often faster for simple enablement issues

---

**Good luck! AWS Support is usually very helpful with service enablement issues like this.**
