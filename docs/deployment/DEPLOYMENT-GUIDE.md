# 🚀 DEPLOYMENT GUIDE - STAGE MUSIC APP

**Last Updated**: March 10, 2026

---

## 📋 PRE-DEPLOYMENT CHECKLIST

- [ ] Changes tested locally
- [ ] Server backup created (if major changes)
- [ ] Version number updated in code
- [ ] Documentation updated
- [ ] Database migration prepared (if needed)

---

## 🔑 SERVER ACCESS

### SSH Connection
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236
```

### Server Details
```
IP: 3.111.168.236
User: ubuntu
SSH Key: ~/stage-music-key.pem
Working Dir: /var/www/stage-music-app/
```

---

## 📦 DEPLOYMENT PROCEDURES

### 1. FRONTEND DEPLOYMENT (Mobile/Desktop)

#### A. Upload Files
```bash
# Mobile App
scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/public/mobile/mobile.js \
    ubuntu@3.111.168.236:/var/www/stage-music-app/public/mobile/

scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/public/mobile/mobile.css \
    ubuntu@3.111.168.236:/var/www/stage-music-app/public/mobile/

scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/public/mobile/index.html \
    ubuntu@3.111.168.236:/var/www/stage-music-app/public/mobile/

# Desktop App
scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/public/app.js \
    ubuntu@3.111.168.236:/var/www/stage-music-app/public/

scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/public/index.html \
    ubuntu@3.111.168.236:/var/www/stage-music-app/public/
```

#### B. Verify Deployment
```bash
# Check file was uploaded
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "ls -lh /var/www/stage-music-app/public/mobile/mobile.js"

# Check file contents (first few lines)
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "head -20 /var/www/stage-music-app/public/mobile/mobile.js"
```

#### C. Clear Browser Cache
**IMPORTANT**: Users need to hard refresh to see changes!
```
Desktop: Ctrl + Shift + R (Windows/Linux) or Cmd + Shift + R (Mac)
Mobile: Settings → Clear Cache → Reload
```

**Better Approach**: Use cache busting
```html
<!-- In index.html -->
<script src="mobile.js?v=1.6"></script>
<link rel="stylesheet" href="mobile.css?v=1.6">
```

---

### 2. BACKEND DEPLOYMENT (Server Code)

#### A. Upload Server Files
```bash
# Main server
scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/server.js \
    ubuntu@3.111.168.236:/var/www/stage-music-app/

# Auto HLS converter
scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/auto-hls-converter.js \
    ubuntu@3.111.168.236:/var/www/stage-music-app/

# PM2 config
scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/ecosystem.config.js \
    ubuntu@3.111.168.236:/var/www/stage-music-app/
```

#### B. Restart Services
```bash
# Restart all PM2 services
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 restart all"

# OR restart individually
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 restart stage-music-server"
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 restart auto-hls-converter"
```

#### C. Verify Services
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 status"
```

**Expected Output:**
```
┌────┬─────────────────────┬──────┬──────┬───────────┬──────────┐
│ id │ name                │ mode │ ↺    │ status    │ memory   │
├────┼─────────────────────┼──────┼──────┼───────────┼──────────┤
│ 0  │ stage-music-server  │ fork │ 0    │ online ✅ │ 80mb     │
│ 1  │ auto-hls-converter  │ fork │ 0    │ online ✅ │ 66mb     │
└────┴─────────────────────┴──────┴──────┴───────────┴──────────┘
```

**Important:** Check `↺` column - should be 0 or low (restart count)

#### D. Check Logs
```bash
# View last 50 lines
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "pm2 logs stage-music-server --lines 50 --nostream"

# Live logs (Ctrl+C to exit)
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "pm2 logs stage-music-server"
```

---

### 3. DATABASE DEPLOYMENT (Migrations)

#### A. Create Migration Script
```javascript
// migrations/your-migration.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./stage_music.db');

db.serialize(() => {
    console.log('Running migration...');

    db.run(`ALTER TABLE songs ADD COLUMN new_field TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error:', err);
        } else {
            console.log('✅ Migration complete');
        }
        db.close();
    });
});
```

#### B. Upload Migration
```bash
scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/migrations/your-migration.js \
    ubuntu@3.111.168.236:/var/www/stage-music-app/migrations/
```

#### C. Run Migration
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "cd /var/www/stage-music-app && node migrations/your-migration.js"
```

#### D. Verify Migration
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "cd /var/www/stage-music-app && sqlite3 stage_music.db '.schema songs'"
```

---

### 4. DEPENDENCY UPDATES

#### A. Update package.json
```bash
scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/package.json \
    ubuntu@3.111.168.236:/var/www/stage-music-app/
```

#### B. Install Dependencies
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "cd /var/www/stage-music-app && npm install"
```

#### C. Restart Services
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 restart all"
```

---

## 🔄 COMPLETE DEPLOYMENT WORKFLOW

### Standard Deployment (Frontend + Backend)

```bash
#!/bin/bash
# deploy.sh - Complete deployment script

# 1. Upload frontend
echo "📤 Uploading frontend files..."
scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/public/mobile/mobile.js \
    /Users/manpreetsingh/Thinking/stage-music-app/public/mobile/mobile.css \
    /Users/manpreetsingh/Thinking/stage-music-app/public/mobile/index.html \
    ubuntu@3.111.168.236:/var/www/stage-music-app/public/mobile/

# 2. Upload backend
echo "📤 Uploading backend files..."
scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/server.js \
    ubuntu@3.111.168.236:/var/www/stage-music-app/

# 3. Restart services
echo "🔄 Restarting services..."
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 restart all"

# 4. Check status
echo "✅ Checking status..."
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 status"

echo "🎉 Deployment complete!"
```

### Quick Frontend-Only Deployment

```bash
#!/bin/bash
# deploy-frontend.sh

echo "📤 Uploading mobile.js..."
scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/public/mobile/mobile.js \
    ubuntu@3.111.168.236:/var/www/stage-music-app/public/mobile/

echo "✅ Done! Clear browser cache to see changes."
```

---

## 🆘 ROLLBACK PROCEDURES

### 1. Rollback Frontend
```bash
# Server has backups with timestamps
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236

# List backups
ls -lh /var/www/stage-music-app/public/mobile/*.backup-*

# Restore from backup
cd /var/www/stage-music-app/public/mobile
cp mobile.js.backup-20260310-113100 mobile.js
```

### 2. Rollback Backend
```bash
# PM2 can restart from previous version
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 restart stage-music-server"

# Or restore from backup
cd /var/www/stage-music-app
cp server.js.backup-20260310-113100 server.js
pm2 restart all
```

### 3. Rollback Database
```bash
# Database backups should be in /var/www/stage-music-app/backups/
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236

cd /var/www/stage-music-app
# Stop services first
pm2 stop all

# Restore database
cp backups/stage_music.db.backup-20260310 stage_music.db

# Restart services
pm2 restart all
```

---

## 🧪 POST-DEPLOYMENT TESTING

### 1. Smoke Tests

```bash
# Test API endpoint
curl -s http://3.111.168.236:3000/api/songs | head -100

# Test frontend
curl -s https://3-111-168-236.nip.io/mobile/ | grep "Stage Music"

# Test HLS endpoint
curl -I https://stage-music-files.s3.ap-south-1.amazonaws.com/hls/113/master.m3u8
```

### 2. Manual Tests (Browser)

**Mobile App:**
1. Open: https://3-111-168-236.nip.io/mobile/
2. Hard refresh (Ctrl+Shift+R)
3. Play a song → Should stream smoothly
4. Check console → No errors
5. Click category → Should load songs
6. Search → Should return results

**Desktop App:**
1. Open: https://3-111-168-236.nip.io/
2. Same tests as mobile

### 3. Server Health Check

```bash
# Check PM2 status
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 status"

# Check server resources
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "free -h && df -h"

# Check for errors in logs
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "pm2 logs --err --lines 20"
```

---

## 📝 DEPLOYMENT CHECKLIST TEMPLATE

```markdown
## Deployment - [Date] - v[Version]

### Pre-Deployment
- [ ] Code reviewed
- [ ] Local testing passed
- [ ] Version number updated
- [ ] Cache busting version updated
- [ ] Backup created

### Deployment Steps
- [ ] Frontend uploaded
- [ ] Backend uploaded (if applicable)
- [ ] Services restarted
- [ ] PM2 status verified
- [ ] Logs checked

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Manual testing completed
- [ ] No errors in logs
- [ ] Performance acceptable
- [ ] User feedback collected

### Issues Found
- None / [List any issues]

### Rollback Plan
- [If needed, describe rollback steps]
```

---

## 🔒 IMPORTANT NOTES

### DO's
✅ Always backup before major changes
✅ Test locally first
✅ Use cache busting for frontend changes
✅ Check PM2 status after restart
✅ Monitor logs for first few minutes
✅ Update version numbers

### DON'Ts
❌ Don't deploy to production without testing
❌ Don't skip backup steps
❌ Don't force restart if services are online
❌ Don't modify database directly without migration
❌ Don't commit .env or SSH keys to git
❌ Don't use `rm -rf` without double-checking path

---

## 📞 DEPLOYMENT SUPPORT

### If Deployment Fails:

1. **Check PM2 logs:**
   ```bash
   pm2 logs --lines 100
   ```

2. **Check file permissions:**
   ```bash
   ls -la /var/www/stage-music-app/
   ```

3. **Restart services:**
   ```bash
   pm2 restart all
   ```

4. **Last resort - Rollback:**
   ```bash
   # Restore from backup
   cp file.backup file
   pm2 restart all
   ```

### Common Issues:

| Issue | Cause | Fix |
|-------|-------|-----|
| Service won't start | Port in use | `pm2 delete all && pm2 start ecosystem.config.js` |
| 404 on files | Wrong path | Check file path on server |
| Old code showing | Cache | Hard refresh browser |
| Database locked | Concurrent access | Kill blocking process |
| Out of memory | Memory leak | Restart server: `pm2 restart all` |

---

**For server management, see: `SERVER-SETUP.md`**
**For PM2 details, see: `PM2-MANAGEMENT.md`**
**For troubleshooting, see: `../troubleshooting/COMMON-ISSUES.md`**
