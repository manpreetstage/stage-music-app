# 🔥 Firebase (Google Cloud Run) Deployment

## Prerequisites
- Google Cloud account (free tier)
- gcloud CLI installed

---

## Step 1: Install Google Cloud CLI (Local)

### Mac:
```bash
brew install --cask google-cloud-sdk
```

### Verify:
```bash
gcloud --version
```

---

## Step 2: Login & Setup

```bash
# Login to Google Cloud
gcloud auth login

# Set project (or create new)
gcloud config set project YOUR-PROJECT-ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

---

## Step 3: Update server.js (Already Done)

Your server.js should use PORT from environment:
```javascript
const PORT = process.env.PORT || 3000;
```

---

## Step 4: Deploy to Cloud Run

```bash
cd /Users/manpreetsingh/Thinking/stage-music-app

# Deploy (this will build and deploy automatically!)
gcloud run deploy stage-music-app \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars="AWS_REGION=ap-south-1,AWS_BUCKET_NAME=stage-music-files" \
  --set-secrets="AWS_ACCESS_KEY_ID=aws-key:latest,AWS_SECRET_ACCESS_KEY=aws-secret:latest"

# You'll be prompted:
# - Service name: stage-music-app
# - Region: asia-south1 (Mumbai)
# - Allow unauthenticated: Y
```

**Wait 3-5 minutes for build and deploy...**

---

## Step 5: Set Environment Variables (Secrets)

### Option A: Using Google Secret Manager (Recommended)

```bash
# Create secrets
echo -n "YOUR_AWS_ACCESS_KEY" | gcloud secrets create aws-key --data-file=-
echo -n "YOUR_AWS_SECRET_KEY" | gcloud secrets create aws-secret --data-file=-

# Grant access to Cloud Run
gcloud secrets add-iam-policy-binding aws-key \
  --member="serviceAccount:YOUR-PROJECT-NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding aws-secret \
  --member="serviceAccount:YOUR-PROJECT-NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Option B: Direct Environment Variables (Simpler)

```bash
gcloud run services update stage-music-app \
  --update-env-vars="AWS_ACCESS_KEY_ID=YOUR_KEY,AWS_SECRET_ACCESS_KEY=YOUR_SECRET,AWS_REGION=ap-south-1,AWS_BUCKET_NAME=stage-music-files"
```

---

## Step 6: Get URL & Test

```bash
# Get service URL
gcloud run services describe stage-music-app --region=asia-south1 --format="value(status.url)"

# Example output:
# https://stage-music-app-xxxxxxxxx-uc.a.run.app
```

**Open URL in browser - App should be live!** 🎉

---

## Cost Estimate

**Cloud Run Free Tier:**
- 2 million requests/month
- 360,000 GB-seconds/month
- Free HTTPS

**For small traffic: Completely FREE!**

---

## Update App (Re-deploy)

```bash
cd /Users/manpreetsingh/Thinking/stage-music-app

# Make changes to code

# Re-deploy
gcloud run deploy stage-music-app \
  --source . \
  --region asia-south1
```

---

## View Logs

```bash
gcloud run logs read stage-music-app --region=asia-south1 --limit=50
```

---

## Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=stage-music-app \
  --domain=yourdomain.com \
  --region=asia-south1
```

---

## Delete Service

```bash
gcloud run services delete stage-music-app --region=asia-south1
```

---

## ⚠️ Important Notes

1. **SQLite Database:**
   - Cloud Run is stateless
   - Database will reset on each deploy
   - **Use Cloud SQL (PostgreSQL/MySQL) for production**

2. **File Storage:**
   - Use S3 (already using) ✅
   - Don't store files locally

3. **Sessions:**
   - Consider Redis for session storage in production

---

## Migration to Cloud SQL (Recommended for Production)

```bash
# Create Cloud SQL instance
gcloud sql instances create stage-music-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=asia-south1

# Create database
gcloud sql databases create stage_music --instance=stage-music-db
```

Then update server.js to use PostgreSQL instead of SQLite.

---

## Summary

✅ Easier than EC2
✅ Auto-scaling
✅ HTTPS included
✅ Pay per use (likely free)
⚠️ SQLite won't persist (need Cloud SQL)

Ready to deploy? Run the commands! 🚀
