# 🔧 TROUBLESHOOTING GUIDE - COMMON ISSUES

**Last Updated**: March 10, 2026

---

## 🚨 CRITICAL ISSUES (Fix Immediately)

### 1. Server Keeps Crashing (EADDRINUSE)

**Symptoms:**
- PM2 shows high restart count (↺ 275+)
- Server restarts every few seconds
- Error: `EADDRINUSE: address already in use 0.0.0.0:3000`

**Cause:**
- Multiple node processes trying to use port 3000
- PM2 trying to restart while old process still running

**Fix:**
```bash
# Step 1: Stop all PM2 processes
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236
pm2 stop all
pm2 delete all

# Step 2: Kill all node processes
sudo pkill -9 node

# Step 3: Verify port is free
sudo lsof -i :3000
# Should return nothing

# Step 4: Clean restart
cd /var/www/stage-music-app
pm2 start ecosystem.config.js

# Step 5: Save PM2 state
pm2 save

# Step 6: Verify
pm2 status
# ↺ should be 0
```

---

### 2. Page Hangs / Can't Scroll After Playing Song

**Symptoms:**
- After playing 1 song, page freezes
- Can't scroll
- UI unresponsive
- Body stuck with `overflow: hidden`

**Cause:**
- Multiple views setting `overflow: hidden` on body
- Not properly restoring overflow when views close

**Fix Applied (v1.5):**
- Centralized overflow management
- Auto-fix every 2 seconds
- Proper cleanup on view transitions

**If Still Happening:**
```javascript
// Emergency fix - run in browser console
document.body.style.overflow = '';
setInterval(() => {
    if (!document.querySelector('.active')) {
        document.body.style.overflow = '';
    }
}, 1000);
```

**Permanent Fix:**
- Clear cache and reload: Ctrl+Shift+R
- Ensure you're on v1.5 or higher

---

### 3. Memory Leak / Browser Slow After Playing Multiple Songs

**Symptoms:**
- Browser becomes slow after 5-10 songs
- Memory usage keeps growing
- Eventually crashes

**Cause:**
- HLS instances not properly destroyed
- Event listeners not cleaned up
- Large buffer size (90 seconds)

**Fix Applied (v1.4):**
```javascript
// Old Code (BAD):
window.hlsInstance.destroy();

// New Code (GOOD):
if (window.hlsInstance) {
    window.hlsInstance.removeAllListeners();
    window.hlsInstance.detachMedia();
    window.hlsInstance.destroy();
    window.hlsInstance = null;
}
```

**Buffer Optimized:**
```javascript
// Old: 90 seconds buffer = 50-70MB memory
backBufferLength: 90

// New: 30 seconds buffer = 15-25MB memory
backBufferLength: 30
```

**If Still Slow:**
```javascript
// Emergency cleanup - run in console
if (window.hlsInstance) {
    window.hlsInstance.destroy();
    window.hlsInstance = null;
}
location.reload();
```

---

## ⚠️ HIGH PRIORITY ISSUES

### 4. Songs Not Loading in Categories

**Symptoms:**
- Click category → "Error loading songs" OR empty screen
- Regional categories not showing songs
- Music Collection sections not loading

**Debug Steps:**

**Step 1: Check Console**
```javascript
// Open browser console (F12)
// Look for errors:
- "❌ Error loading section songs"
- "❌ Error loading category songs"
- "Failed to fetch"
```

**Step 2: Check Network Tab**
```
F12 → Network tab → Click category
Look for failed requests:
- /api/categories/7/songs
- /api/custom-sections/1/songs
```

**Step 3: Test API Directly**
```bash
# Test from server
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236

# Test Haryanvi category
curl http://localhost:3000/api/categories/7/songs | head -200

# Test custom section
curl http://localhost:3000/api/custom-sections/1/songs | head -200
```

**Common Causes & Fixes:**

| Cause | Symptoms | Fix |
|-------|----------|-----|
| API endpoint down | Network error 500 | Restart server: `pm2 restart all` |
| Database locked | Timeout error | Kill blocking process |
| Empty category | 0 songs returned | Check `category_songs` table |
| CORS issue | Blocked by CORS | Check server CORS config |
| Cache issue | Old data | Hard refresh: Ctrl+Shift+R |

**Fallback Mode (v1.6):**
- App now uses local songs if API fails
- Check console for: "📴 Using offline mode"

---

### 5. Images/Covers Not Loading

**Symptoms:**
- Song covers show placeholder or broken image
- Slow image loading
- Some images load, others don't

**Causes & Fixes:**

**A. Empty String in Database**
```sql
-- Problem: cover_thumb/cover_mobile = "" (empty string, not NULL)
-- Fix: Use getCoverImage() helper (added in v1.6)

-- Check database:
SELECT id, title,
       CASE
           WHEN cover_thumb = '' THEN 'EMPTY'
           WHEN cover_thumb IS NULL THEN 'NULL'
           ELSE 'OK'
       END as thumb_status
FROM songs LIMIT 10;
```

**B. S3 CORS Not Configured**
```bash
# Test S3 URL directly
curl -I https://stage-music-files.s3.ap-south-1.amazonaws.com/covers/image.webp

# Should return 200 OK
# If 403 Forbidden → CORS issue

# Fix CORS:
node fix-s3-cors.js
```

**C. Lazy Loading Too Aggressive**
```javascript
// Current: First 10 eager, rest lazy
loading="${index < 10 ? 'eager' : 'lazy'}"

// If images not loading:
// Change to eager for more images
loading="${index < 30 ? 'eager' : 'lazy'}"
```

**D. Network Throttling**
- Check browser DevTools → Network → Disable Cache
- Disable any ad blockers
- Check internet connection

---

### 6. HLS Streaming Not Working

**Symptoms:**
- Song plays but uses regular audio, not HLS
- Console shows: "🔄 HLS error, fallback"
- No adaptive streaming

**Debug:**

**Step 1: Check Song Has HLS**
```sql
sqlite3 stage_music.db
SELECT id, title, has_hls, hls_master_url
FROM songs
WHERE id = 113;

-- Should show:
-- has_hls = 1
-- hls_master_url = https://...
```

**Step 2: Test HLS URL**
```bash
# Test master playlist
curl https://stage-music-files.s3.ap-south-1.amazonaws.com/hls/113/master.m3u8

# Should return:
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=64000,CODECS="mp4a.40.2"
quality_64k.m3u8
...
```

**Step 3: Check Browser Support**
```javascript
// In console:
console.log('HLS.js supported:', Hls.isSupported());
console.log('Native HLS:', document.createElement('audio').canPlayType('application/vnd.apple.mpegurl'));
```

**Common Fixes:**

| Issue | Fix |
|-------|-----|
| HLS.js not loaded | Check `<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>` |
| S3 files not found | Run: `node batch-convert-all-songs.js` |
| CORS blocking HLS | Fix S3 CORS policy |
| Browser too old | Update browser |

---

## 🔄 MEDIUM PRIORITY ISSUES

### 7. Database Locked Error

**Symptoms:**
```
Error: SQLITE_BUSY: database is locked
```

**Cause:**
- Another process has exclusive lock
- Long-running query
- Backup in progress

**Fix:**
```bash
# Find process using database
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236
sudo lsof /var/www/stage-music-app/stage_music.db

# Kill blocking process
kill -9 <PID>

# Restart services
pm2 restart all
```

**Prevention:**
```javascript
// In server.js - add timeout
const db = new sqlite3.Database('./stage_music.db', {
    timeout: 10000  // 10 second timeout
});
```

---

### 8. PM2 Won't Start Services

**Symptoms:**
```
pm2 start ecosystem.config.js
Error: Process already exists
```

**Fix:**
```bash
# Option 1: Delete and restart
pm2 delete all
pm2 start ecosystem.config.js

# Option 2: Use ecosystem config
pm2 reload ecosystem.config.js

# Option 3: Force restart
pm2 restart all --force
```

---

### 9. Out of Disk Space

**Symptoms:**
```
ENOSPC: no space left on device
```

**Check Space:**
```bash
df -h

# Check /var/www directory
du -sh /var/www/stage-music-app/*
```

**Clean Up:**
```bash
cd /var/www/stage-music-app

# 1. Clean temp HLS files
rm -rf temp_hls_*

# 2. Clean PM2 logs
pm2 flush

# 3. Clean old backups (keep last 5)
cd backups
ls -t | tail -n +6 | xargs rm -f

# 4. Check again
df -h
```

---

### 10. Auto HLS Converter Not Running

**Symptoms:**
- New songs not getting HLS
- `has_hls` stays at 0
- No conversion logs

**Debug:**
```bash
# Check if running
pm2 status | grep auto-hls

# Check logs
pm2 logs auto-hls-converter --lines 50

# Should see:
# "Checking for new songs..."
# "Found new song: ..."
```

**Fix:**
```bash
# Restart converter
pm2 restart auto-hls-converter

# If still not working, check for errors:
pm2 logs auto-hls-converter --err --lines 50

# Common issues:
# - FFmpeg not installed: sudo apt install ffmpeg
# - AWS credentials missing: check .env file
# - Database locked: restart all services
```

---

## 📝 DEBUGGING WORKFLOW

### General Debug Process:

```
1. IDENTIFY
   - What's the error message?
   - When does it happen?
   - Can you reproduce it?

2. CHECK LOGS
   - Browser console (F12)
   - PM2 logs: pm2 logs
   - Server logs: tail -f /var/www/stage-music-app/logs/*.log

3. TEST COMPONENTS
   - Frontend: Browser console + Network tab
   - Backend: curl API endpoints
   - Database: sqlite3 queries
   - S3: curl S3 URLs

4. ISOLATE
   - Does it happen on all devices?
   - Does it happen for all songs?
   - Does it happen for all users?

5. FIX
   - Apply targeted fix
   - Test fix
   - Deploy
   - Monitor

6. DOCUMENT
   - Update this file
   - Add to knowledge base
   - Prevent future occurrence
```

---

## 🆘 EMERGENCY PROCEDURES

### Complete System Restart

```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236

# 1. Stop all services
pm2 stop all

# 2. Kill all node processes
sudo pkill -9 node

# 3. Clean restart
cd /var/www/stage-music-app
pm2 start ecosystem.config.js

# 4. Verify
pm2 status
pm2 logs
```

### Nuclear Option - Server Reboot

```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236
sudo reboot

# Wait 2 minutes, then reconnect
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236

# Services should auto-start
pm2 status
```

---

## 📊 HEALTH CHECK COMMAND

```bash
#!/bin/bash
# health-check.sh - Quick system health check

echo "🔍 SYSTEM HEALTH CHECK"
echo "====================="

# PM2 Status
echo "1. PM2 Status:"
pm2 status

# Disk Space
echo -e "\n2. Disk Space:"
df -h | grep -E 'Filesystem|/dev/root'

# Memory
echo -e "\n3. Memory:"
free -h

# Recent Errors
echo -e "\n4. Recent Errors:"
pm2 logs --err --lines 5 --nostream

# API Test
echo -e "\n5. API Test:"
curl -s http://localhost:3000/api/songs?limit=1 | head -50

echo -e "\n✅ Health check complete!"
```

---

## 📞 QUICK REFERENCE

### Key Commands
```bash
# SSH
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236

# PM2
pm2 status                    # Check services
pm2 logs                      # View logs
pm2 restart all               # Restart all
pm2 stop all                  # Stop all
pm2 delete all                # Delete all

# Database
cd /var/www/stage-music-app
sqlite3 stage_music.db

# Disk
df -h                         # Check space
du -sh *                      # Folder sizes

# Processes
sudo lsof -i :3000           # What's on port 3000
ps aux | grep node           # Node processes
```

### Log Locations
```
PM2 Logs: /home/ubuntu/.pm2/logs/
App Logs: /var/www/stage-music-app/logs/
System: /var/log/
```

---

**For performance issues, see: `PERFORMANCE-FIXES.md`**
**For deployment issues, see: `../deployment/DEPLOYMENT-GUIDE.md`**
**For server setup, see: `../deployment/SERVER-SETUP.md`**
