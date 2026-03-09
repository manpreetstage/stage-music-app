# 🔥 Firebase + Cloud Run Deployment

## Your Project: stage-music-9b140

---

## Quick Deploy (After Login)

### Step 1: Login (You need to do this)
```bash
firebase login
```

### Step 2: Set Project
```bash
cd /Users/manpreetsingh/Thinking/stage-music-app
firebase use stage-music-9b140
```

### Step 3: Deploy to Cloud Run via Firebase
```bash
firebase deploy --only hosting:production
```

---

## But Wait! Express Backend Issue

Your app is Express backend, not static files.

**You need Cloud Run, not just Hosting.**

---

## Solution: Use gcloud with Firebase Project

```bash
# Install gcloud (if not installed)
brew install --cask google-cloud-sdk

# Login
gcloud auth login

# Set Firebase project
gcloud config set project stage-music-9b140

# Deploy to Cloud Run
gcloud run deploy stage-music-app \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --project=stage-music-9b140
```

This will:
1. Build Docker image from Dockerfile
2. Deploy to Cloud Run
3. Give you a URL like: https://stage-music-app-xxx.run.app

---

## Environment Variables

```bash
gcloud run services update stage-music-app \
  --update-env-vars="AWS_ACCESS_KEY_ID=your-key,AWS_SECRET_ACCESS_KEY=your-secret,AWS_REGION=ap-south-1,AWS_BUCKET_NAME=stage-music-files" \
  --project=stage-music-9b140
```

---

## Cost: FREE for low traffic!

Cloud Run free tier:
- 2M requests/month
- 360K GB-seconds/month
