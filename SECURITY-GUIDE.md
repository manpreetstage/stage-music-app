# 🔒 SECURITY GUIDE - Stage Music Platform

## ⚠️ IMPORTANT: API Keys Security

### What Happened?
API keys were accidentally shared in a conversation. These keys are now **COMPROMISED** and must be **REVOKED IMMEDIATELY**.

---

## 🚨 IMMEDIATE ACTION REQUIRED

### Step 1: Revoke ALL Exposed Keys

#### 1. OpenAI API Key
```
1. Go to: https://platform.openai.com/api-keys
2. Find your current key
3. Click "Delete" or "Revoke"
4. Generate a new key
5. Save it securely in .env file
```

#### 2. AWS Access Keys (CRITICAL!)
```
1. Go to: https://console.aws.amazon.com/iam/
2. Click "Users" → Your username
3. Go to "Security credentials" tab
4. Find "Access keys" section
5. Click "Deactivate" on the exposed key
6. Delete it after deactivation
7. Create new access key
8. Download credentials (only chance!)
9. Add to .env file
10. Enable MFA on your AWS account
```

#### 3. Claude API Key
```
1. Go to: https://console.anthropic.com/settings/keys
2. Find current key
3. Click "Revoke"
4. Generate new key
5. Save to .env
```

#### 4. Google Gemini API Key
```
1. Go to: https://makersuite.google.com/app/apikey
2. Delete exposed key
3. Create new API key
4. Save to .env
```

#### 5. ElevenLabs API Key
```
1. Go to: https://elevenlabs.io/app/settings/api-keys
2. Revoke current key
3. Generate new key
4. Save to .env
```

#### 6. Epidemic Sound API Token
```
1. Login to: https://www.epidemicsound.com/
2. Go to API settings
3. Revoke current token
4. Generate new token
5. Save to .env
```

---

## ✅ Secure Storage Method

### Use .env File (Already Created)

**Location:** `/Users/manpreetsingh/Thinking/stage-music-app/.env`

**Steps:**
1. Open `.env` file
2. After revoking old keys, add new keys
3. Never commit this file to git (already in .gitignore)
4. Never share this file with anyone

**Example:**
```env
# After regenerating, add new keys here
OPENAI_API_KEY=sk-proj-NEW_KEY_HERE
AWS_ACCESS_KEY_ID=NEW_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=NEW_SECRET_KEY
CLAUDE_API_KEY=sk-ant-NEW_KEY
# etc.
```

---

## 🛡️ Security Best Practices

### DO ✅
- ✅ Store keys in `.env` file
- ✅ Use environment variables in code
- ✅ Keep `.env` in `.gitignore`
- ✅ Rotate keys regularly (every 90 days)
- ✅ Use different keys for dev/production
- ✅ Enable MFA on all accounts
- ✅ Monitor API usage regularly

### DON'T ❌
- ❌ Share keys in chat/email
- ❌ Hardcode keys in source code
- ❌ Commit `.env` to git
- ❌ Use same key across projects
- ❌ Share keys with team members
- ❌ Post keys in public forums
- ❌ Store keys in screenshots

---

## 🔍 How to Check if Keys Were Misused

### AWS CloudTrail
```
1. Go to AWS Console → CloudTrail
2. Check "Event history"
3. Look for unusual activities
4. Check regions you don't use
```

### OpenAI Usage Dashboard
```
1. Go to: https://platform.openai.com/usage
2. Check recent API calls
3. Look for unexpected usage
```

### Monitor Billing
- Check all platforms for unexpected charges
- Set up billing alerts
- Review usage patterns

---

## 🚀 Safe Development Workflow

### 1. Local Development
```bash
# Use .env file
# Never commit it
# Keys stay on your machine
```

### 2. Production Deployment
```bash
# Use platform environment variables
# Heroku: heroku config:set KEY=value
# AWS: Use AWS Secrets Manager
# Vercel: Project settings → Environment Variables
```

### 3. Team Collaboration
```bash
# Share .env.example (without real keys)
# Each developer creates own .env
# Use team secrets manager (1Password, etc.)
```

---

## 📋 Checklist

After following this guide, verify:

- [ ] All 6 API keys revoked on platforms
- [ ] New keys generated
- [ ] New keys added to `.env` file
- [ ] `.env` file in `.gitignore`
- [ ] MFA enabled on AWS
- [ ] Billing alerts set up
- [ ] No hardcoded keys in code
- [ ] Server using `process.env.KEY_NAME`

---

## 💡 Additional Security Measures

### AWS IAM Best Practices
1. Create separate IAM user for this app
2. Give minimum required permissions only
3. Enable MFA
4. Rotate access keys every 90 days
5. Use AWS Secrets Manager for production

### Key Rotation Schedule
```
Every 90 days:
- Regenerate all API keys
- Update .env file
- Delete old keys
- Test application
```

---

## 🆘 If Keys Were Already Misused

### Signs of Compromise:
- Unexpected API charges
- Unknown API calls in logs
- AWS resources created that you didn't create
- Unusual activity alerts

### Immediate Actions:
1. Revoke ALL keys immediately
2. Check billing for all platforms
3. Review access logs
4. Contact platform support
5. File security incident report
6. Change account passwords
7. Enable MFA everywhere

---

## 📞 Support Contacts

### Emergency Contacts:
- **AWS Support:** https://console.aws.amazon.com/support/
- **OpenAI Support:** https://help.openai.com/
- **Anthropic Support:** https://www.anthropic.com/
- **Google Cloud Support:** https://cloud.google.com/support

---

## ✅ Summary

**What to do RIGHT NOW:**
1. ⏰ Revoke all 6 exposed API keys (15 minutes)
2. 🔑 Generate new keys (5 minutes)
3. 💾 Save to `.env` file (2 minutes)
4. 🔒 Enable MFA on critical accounts (10 minutes)
5. 📊 Check billing/usage (5 minutes)
6. ✅ Verify everything works (5 minutes)

**Total Time: ~45 minutes**

**Priority: URGENT - Do this before continuing development!**

---

**Remember: Security is not optional. Take these 45 minutes NOW to secure your accounts!**
