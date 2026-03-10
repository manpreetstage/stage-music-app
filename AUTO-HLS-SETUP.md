# 🚀 AUTOMATIC HLS CONVERSION - SETUP GUIDE

**Purpose**: Automatically convert new songs to HLS format when uploaded

**Status**: Ready to deploy

---

## 📦 What's Included

### 1. **auto-hls-converter.js** (NEW)
Background service that:
- ✅ Checks database every 60 seconds
- ✅ Finds songs with `has_hls = 0`
- ✅ Automatically converts them to HLS
- ✅ Updates database when done
- ✅ Runs continuously in background

### 2. **ecosystem.config.js** (NEW)
PM2 configuration for:
- ✅ Main server (`server.js`)
- ✅ Auto HLS converter
- ✅ Auto-restart on crash
- ✅ Log management

---

## 🔧 SETUP (One-Time)

### Step 1: Upload Files to Server

```bash
# From local machine
scp -i ~/stage-music-key.pem auto-hls-converter.js ubuntu@3.111.168.236:/var/www/stage-music-app/
scp -i ~/stage-music-key.pem ecosystem.config.js ubuntu@3.111.168.236:/var/www/stage-music-app/
```

### Step 2: Install PM2 (If not installed)

```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236

# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### Step 3: Create Logs Directory

```bash
cd /var/www/stage-music-app
mkdir -p logs
```

### Step 4: Start Services with PM2

```bash
cd /var/www/stage-music-app

# Stop any existing node processes
sudo pkill node

# Start both services (server + auto-converter)
pm2 start ecosystem.config.js

# Check status
pm2 status
```

Expected output:
```
┌─────┬─────────────────────┬─────────┬─────┬────────┬──────┐
│ id  │ name                │ status  │ cpu │ memory │ logs │
├─────┼─────────────────────┼─────────┼─────┼────────┼──────┤
│ 0   │ stage-music-server  │ online  │ 0%  │ 50 MB  │      │
│ 1   │ auto-hls-converter  │ online  │ 0%  │ 40 MB  │      │
└─────┴─────────────────────┴─────────┴─────┴────────┴──────┘
```

### Step 5: Setup Auto-Start on Server Reboot

```bash
# Save PM2 process list
pm2 save

# Generate startup script
pm2 startup

# Copy the command it shows and run it (will be like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Verify auto-start is enabled
pm2 list
```

---

## 📱 HOW IT WORKS

### Flow Diagram:

```
New Song Uploaded
↓
Add to Database (has_hls = 0)
↓
[60 seconds later]
↓
Auto-Converter Checks Database
↓
Found new song!
↓
Download from S3
↓
FFmpeg Conversion (64k + 128k)
↓
Upload HLS files to S3
↓
Update Database (has_hls = 1)
↓
✅ Done! Song now has HLS
```

### Timeline Example:

```
12:00:00 - Song uploaded to S3
12:00:05 - Song added to database (has_hls = 0)
12:01:00 - Auto-converter checks (finds new song)
12:01:05 - Download starts
12:01:15 - FFmpeg conversion starts
12:03:30 - Upload to S3 starts
12:04:00 - Database updated (has_hls = 1)
12:04:05 - Conversion complete!

Total Time: ~4 minutes per song
```

---

## 🎛️ MANAGEMENT COMMANDS

### View Status
```bash
pm2 status
```

### View Logs (Real-time)
```bash
# All logs
pm2 logs

# Only converter logs
pm2 logs auto-hls-converter

# Only server logs
pm2 logs stage-music-server
```

### View Saved Logs
```bash
# Converter logs
tail -f /var/www/stage-music-app/logs/hls-converter-out.log

# Error logs
tail -f /var/www/stage-music-app/logs/hls-converter-error.log
```

### Restart Service
```bash
# Restart converter only
pm2 restart auto-hls-converter

# Restart all
pm2 restart all
```

### Stop Service
```bash
# Stop converter only
pm2 stop auto-hls-converter

# Stop all
pm2 stop all
```

### Remove Service
```bash
pm2 delete auto-hls-converter
```

---

## 📊 MONITORING

### Check Converter Activity

```bash
# View live logs
pm2 logs auto-hls-converter --lines 50

# Search for specific song
pm2 logs auto-hls-converter | grep "Song Name"
```

### Expected Log Output:

```
[15:30:00] Checking for new songs...
[15:30:01] Found new song: Bhole Baba by Rajesh Singhpuria
[15:30:01] Starting conversion: Bhole Baba (ID: 450)
[15:30:02] Downloading: https://stage-music-files.s3...
[15:30:10] Converting to HLS (64kbps)...
[15:31:20] Converting to HLS (128kbps)...
[15:32:30] Creating master playlist...
[15:32:31] Uploading to S3...
[15:33:45] Updating database...
[15:33:46] ✅ Success: Bhole Baba
[15:33:51] Checking for new songs...
```

### Monitor Stats

Every 10 minutes, you'll see:
```
📊 STATS:
   Runtime: 120 minutes
   ✅ Converted: 15
   ❌ Failed: 0
```

---

## 🐛 TROUBLESHOOTING

### Problem: Converter Not Running

**Check:**
```bash
pm2 status
```

**Fix:**
```bash
pm2 restart auto-hls-converter
```

### Problem: Converter Crashes

**Check logs:**
```bash
pm2 logs auto-hls-converter --err --lines 50
```

**Common causes:**
- FFmpeg not installed
- AWS credentials missing
- Database locked
- Disk space full

### Problem: Songs Not Converting

**Check database:**
```bash
sqlite3 /var/www/stage-music-app/stage_music.db

SELECT id, title, has_hls, audio_file FROM songs WHERE has_hls = 0 LIMIT 5;
```

**Manual trigger:**
```bash
# SSH into server
cd /var/www/stage-music-app

# Run converter manually (for testing)
node auto-hls-converter.js
```

### Problem: Out of Disk Space

**Check disk:**
```bash
df -h
```

**Clean temp files:**
```bash
cd /var/www/stage-music-app
rm -rf temp_hls_*
```

---

## ⚙️ CONFIGURATION

### Change Check Interval

Edit `auto-hls-converter.js`:
```javascript
const CHECK_INTERVAL = 60000; // 60 seconds (default)

// Change to:
const CHECK_INTERVAL = 30000; // 30 seconds (faster)
// or
const CHECK_INTERVAL = 300000; // 5 minutes (slower)
```

Then restart:
```bash
pm2 restart auto-hls-converter
```

### Change Conversion Delay

Edit `auto-hls-converter.js`:
```javascript
const CONVERSION_DELAY = 5000; // 5 seconds between songs

// Change to:
const CONVERSION_DELAY = 10000; // 10 seconds
```

---

## 🔒 SECURITY

### Best Practices:

1. **Run as non-root user**
   - ✅ Already using `ubuntu` user

2. **Protect AWS credentials**
   - ✅ Stored in `.env` file
   - ✅ Not in git repository

3. **Monitor logs**
   - Check for unusual activity
   - Watch for failed conversions

4. **Limit S3 permissions**
   - Only allow upload to `hls/` folder
   - Read access to existing audio files

---

## 📈 PERFORMANCE

### Resource Usage (Per Song):

- **CPU**: 50-80% during conversion (~2 minutes)
- **Memory**: ~100 MB
- **Disk**: ~50 MB temp files (auto-deleted)
- **Network**: Upload ~5 MB to S3

### Estimated Throughput:

- **Per Hour**: ~15 songs (4 min each)
- **Per Day**: ~360 songs
- **Per Week**: ~2,500 songs

### Optimization:

To convert faster, you can:
1. Run multiple instances (edit ecosystem.config.js → instances: 2)
2. Use faster server (more CPU)
3. Reduce check interval (30 seconds instead of 60)

---

## 🎯 TESTING

### Test the Auto-Converter:

1. **Add a test song without HLS:**
```sql
-- Connect to database
sqlite3 /var/www/stage-music-app/stage_music.db

-- Set a song to need conversion
UPDATE songs SET has_hls = 0, hls_master_url = NULL WHERE id = 113;

-- Check it
SELECT id, title, has_hls FROM songs WHERE id = 113;
```

2. **Watch the logs:**
```bash
pm2 logs auto-hls-converter
```

3. **Within 60 seconds**, you should see:
```
[TIME] Found new song: Do Lugai by Rajesh Singhpuria
[TIME] Starting conversion...
[TIME] ✅ Success: Do Lugai
```

4. **Verify in database:**
```sql
SELECT id, title, has_hls, hls_master_url FROM songs WHERE id = 113;
-- Should show has_hls = 1
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Upload `auto-hls-converter.js` to server
- [ ] Upload `ecosystem.config.js` to server
- [ ] Install PM2 globally (`npm install -g pm2`)
- [ ] Create logs directory (`mkdir logs`)
- [ ] Start services (`pm2 start ecosystem.config.js`)
- [ ] Verify both services running (`pm2 status`)
- [ ] Setup auto-start (`pm2 startup` + `pm2 save`)
- [ ] Test with one song
- [ ] Monitor logs for 1 hour
- [ ] Check stats output

---

## 🎉 SUCCESS CRITERIA

✅ **PM2 shows both services as "online"**
✅ **Logs show "Checking for new songs..." every 60 seconds**
✅ **New songs get converted automatically within 5 minutes**
✅ **Database updates with HLS URLs**
✅ **Services restart automatically after server reboot**

---

## 📞 SUPPORT

**If issues occur:**

1. Check PM2 status: `pm2 status`
2. Check logs: `pm2 logs auto-hls-converter --lines 100`
3. Check database: `SELECT * FROM songs WHERE has_hls = 0 LIMIT 5;`
4. Manual test: `node auto-hls-converter.js`

**Quick Fix:**
```bash
pm2 restart all
pm2 logs
```

---

**Ready to Deploy!** 🚀

Follow the setup steps above to enable automatic HLS conversion for all future uploads.
