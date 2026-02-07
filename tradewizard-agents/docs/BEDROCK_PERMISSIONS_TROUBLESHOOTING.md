# Bedrock "Operation not allowed" Troubleshooting

## Error

```
ValidationException: Operation not allowed
```

## Root Cause

This error occurs when your AWS IAM user/role doesn't have the necessary permissions to access Amazon Bedrock or the specific model you're trying to use.

## Solution Steps

### 1. Enable Model Access in AWS Bedrock Console

1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Navigate to **Model access** in the left sidebar
3. Click **Manage model access** or **Edit**
4. Find **Amazon Nova** models in the list
5. Check the boxes for the models you want to use:
   - ✅ Amazon Nova Micro
   - ✅ Amazon Nova Lite  
   - ✅ Amazon Nova Pro
   - ✅ Amazon Nova 2 Lite (if available)
   - ✅ Amazon Nova 2 Pro (if available)
6. Click **Save changes**
7. Wait for the status to change from "In progress" to "Access granted" (can take a few minutes)

### 2. Add IAM Permissions

Your IAM user needs these permissions:

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
        "arn:aws:bedrock:*::foundation-model/amazon.nova-*",
        "arn:aws:bedrock:*::foundation-model/global.amazon.nova-*"
      ]
    }
  ]
}
```

#### Option A: Attach Managed Policy (Easiest)

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Navigate to **Users** → Select your user
3. Click **Add permissions** → **Attach policies directly**
4. Search for and attach: **AmazonBedrockFullAccess**
5. Click **Add permissions**

#### Option B: Create Custom Policy (More Secure)

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Navigate to **Policies** → **Create policy**
3. Switch to **JSON** tab
4. Paste the policy above
5. Name it: `BedrockNovaAccess`
6. Attach it to your IAM user

### 3. Verify Region Support

Nova models are available in specific regions. Ensure your `AWS_REGION` is set to a supported region:

**Supported Regions:**
- `us-east-1` (N. Virginia) ✅ Recommended
- `us-west-2` (Oregon)
- `eu-west-1` (Ireland)
- `ap-southeast-1` (Singapore)

Update your `.env`:
```bash
AWS_REGION=us-east-1
```

### 4. Test Your Setup

Run the test script:

```bash
npx tsx test-bedrock-structured.ts
```

Expected output:
```
=== Test 1: Basic invoke ===
Basic response: Hello
✅ Basic invoke works
```

If you still see "Operation not allowed", check:
1. Model access is granted (step 1)
2. IAM permissions are attached (step 2)
3. You're using the correct region (step 3)
4. Your AWS credentials are valid

### 5. Alternative: Use AWS CLI to Test

```bash
# Test if you can access Bedrock
aws bedrock list-foundation-models --region us-east-1

# Test if you can invoke Nova
aws bedrock-runtime invoke-model \
  --model-id amazon.nova-lite-v1:0 \
  --body '{"messages":[{"role":"user","content":[{"text":"Hello"}]}],"inferenceConfig":{"temperature":0.7}}' \
  --region us-east-1 \
  output.json
```

If these commands fail, it confirms an IAM/permissions issue.

## Common Issues

### Issue: "Model not found"
**Solution**: Enable model access in Bedrock console (step 1)

### Issue: "Access denied"
**Solution**: Add IAM permissions (step 2)

### Issue: "Region not supported"
**Solution**: Change to a supported region (step 3)

### Issue: "Credentials not found"
**Solution**: Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in `.env`

## Verification Checklist

- [ ] Model access granted in Bedrock console
- [ ] IAM permissions attached to user
- [ ] Using supported region (us-east-1 recommended)
- [ ] AWS credentials in `.env` are valid
- [ ] Test script runs successfully

## Additional Resources

- [AWS Bedrock Model Access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)
- [AWS Bedrock IAM Permissions](https://docs.aws.amazon.com/bedrock/latest/userguide/security-iam.html)
- [Nova Models Documentation](https://docs.aws.amazon.com/nova/latest/userguide/)

## After Fixing Permissions

Once permissions are fixed, the tool calling will work automatically with ChatBedrockConverse. No code changes needed - the migration from BedrockChat to ChatBedrockConverse is already complete.
