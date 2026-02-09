# AWS Support Case Response - Initial Bedrock Access Request

## Copy and paste this into your AWS Support case reply:

---

Hello,

Thank you for clarifying the requirements for initial Bedrock access. I understand I need to request the default TPM/RPM/TPD limits for initial access.

**IMPORTANT NOTE:** I am requesting AWS's standard default service quotas (not custom increases). These are the default limits AWS provides to all accounts. My actual usage will be minimal (~1.6M tokens/day for hourly analysis), which is only 0.03% of the default daily quota. I simply need Bedrock enabled with AWS's standard defaults.

Here is the requested information for the Nova models I need:

---

## Amazon Nova Micro

**Current TPM:** 0  
**Current RPM:** 0  
**Current TPD:** 0  

**Required default TPM:** 4,000,000 (4M tokens per minute)  
**Required default RPM:** 2,000 (requests per minute)  
**Required TPD:** 5,760,000,000 (5.76B tokens per day)

**Quota Codes:**
- TPM: L-CFA4FA0D
- RPM: L-E118F160

---

## Amazon Nova Lite

**Current TPM:** 0  
**Current RPM:** 0  
**Current TPD:** 0  

**Required default TPM:** 4,000,000 (4M tokens per minute)  
**Required default RPM:** 2,000 (requests per minute)  
**Required TPD:** 5,760,000,000 (5.76B tokens per day)

**Quota Codes:**
- TPM: L-70423BF8
- RPM: L-E386A278

---

## Amazon Nova Pro

**Current TPM:** 0  
**Current RPM:** 0  
**Current TPD:** 0  

**Required default TPM:** 1,000,000 (1M tokens per minute)  
**Required default RPM:** 250 (requests per minute)  
**Required TPD:** 1,152,000,000 (1.152B tokens per day)

**Quota Codes:**
- TPM: L-CE33604C
- RPM: L-F2717A44

---

## Amazon Nova 2 Lite (Primary Model for Production)

**Current TPM:** 0  
**Current RPM:** 0  
**Current TPD:** 0  

**Required default TPM:** 4,000,000 (4M tokens per minute) - estimated based on Nova Lite  
**Required default RPM:** 2,000 (requests per minute) - estimated based on Nova Lite  
**Required TPD:** 5,760,000,000 (5.76B tokens per day)

**Note:** This is our primary production model. If there are specific quota codes for Nova 2 Lite, please apply those defaults.

---

## Additional Context

**Use Case:** Production AI application (TradeWizard) for prediction market analysis using multi-agent LLM workflows.

**Realistic Usage Pattern:**
- **Frequency:** Hourly market analysis (24 analyses per day maximum)
- **Tokens per analysis:** ~50,000 tokens (multi-agent workflow with 5-7 agents)
- **Daily token usage:** ~1,200,000 tokens/day (24 analyses × 50K tokens)
- **Peak usage:** Occasional burst analysis during market events

**Why requesting AWS default quotas:**
These are the standard default service quotas that AWS provides to all accounts. Our actual usage will be well below these limits:

- **TPM (4M):** We'll use ~833 tokens/minute on average (50K tokens/hour)
- **RPM (2,000):** We'll make ~1-2 requests/minute during analysis
- **TPD (5.76B):** We'll use ~1.2M tokens/day (~0.02% of the daily limit)

The default quotas provide significant headroom for:
- Development and testing
- Occasional burst analysis during major market events
- Future scaling as the platform grows

**Why these models:**
- **Nova Micro:** Development and testing (~100K tokens/day)
- **Nova Lite:** Backup/fallback model (~100K tokens/day)
- **Nova 2 Lite:** Primary production model (~1.2M tokens/day)
- **Nova Pro:** Complex reasoning tasks (occasional use, ~200K tokens/day)

**Total estimated daily usage across all models:** ~1.6M tokens/day

This is well within the default quota limits and represents responsible, cost-conscious usage of AWS Bedrock services.

I'm requesting the AWS default service quota values for these models to enable initial access to Amazon Bedrock. These are the standard default limits as shown in the Service Quotas console.

Please let me know if you need any additional information to process this request.

Thank you for your assistance!

Best regards

---

## Summary of Requested Limits

| Model | TPM (Tokens/Min) | RPM (Requests/Min) | TPD (Tokens/Day) |
|-------|------------------|-------------------|------------------|
| Nova Micro | 4,000,000 | 2,000 | 5,760,000,000 |
| Nova Lite | 4,000,000 | 2,000 | 5,760,000,000 |
| Nova Pro | 1,000,000 | 250 | 1,152,000,000 |
| Nova 2 Lite | 4,000,000 | 2,000 | 5,760,000,000 |

**Note:** These are the AWS default service quota values for on-demand inference, not custom increases.

---

## What These Limits Mean

**TPM (Tokens Per Minute):**
- Total tokens (input + output) that can be processed per minute
- Nova Micro/Lite: 4M tokens/min = ~4,000 requests at 1K tokens each
- Nova Pro: 1M tokens/min = ~1,000 requests at 1K tokens each

**RPM (Requests Per Minute):**
- Maximum number of API calls per minute
- Nova Micro/Lite: 2,000 requests/min
- Nova Pro: 250 requests/min

**TPD (Tokens Per Day):**
- Daily token budget
- Nova Micro/Lite: 5.76B tokens/day = ~4,000 tokens/min sustained
- Nova Pro: 1.152B tokens/day = ~800 tokens/min sustained

These default limits are more than sufficient for our production workload.

---

## After Approval

Once these default quotas are applied, I will:

1. Test immediately with: `npx tsx scripts/test-bedrock-nova.ts`
2. Deploy TradeWizard to production
3. Monitor usage and request increases if needed

Expected timeline: 24-48 hours for approval

Thank you!
