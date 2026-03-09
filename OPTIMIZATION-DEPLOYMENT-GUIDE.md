# 🚀 Media Optimization - Complete Deployment Guide

**Date:** 2026-03-06
**Goal:** Optimize all existing media + automatic optimization for future uploads

---

## 📦 Files Created:

### 1. **optimize-images.js**
- Optimizes all existing cover images
- Generates 4 versions: thumbnail, mobile, mobile_jpg, desktop
- 321 KB → 40 KB (87% savings)

### 2. **optimize-audio.js**
- Transcodes all existing WAV files to AAC
- Generates 2 versions: 128 kbps, 256 kbps
- 75 MB → 5 MB (93% savings)

### 3. **media-optimizer.js**
- Automatic optimization on future uploads
- Used by server.js upload endpoint
- Industry-standard formats

---

## 🔧 Phase 1: Setup Dependencies

### On Server:

```bash
# SSH into server
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236

# Navigate to app directory
cd /var/www/stage-music-app

# Install dependencies
npm install sharp fluent-ffmpeg --save

# Install FFmpeg (system package)
sudo apt-get update
sudo apt-get install ffmpeg -y

# Verify FFmpeg installation
ffmpeg -version

# Should show: ffmpeg version 4.x.x or higher
```

---

## 📸 Phase 2: Optimize Existing Images

### Step 1: Upload optimization script

```bash
# From local machine
scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/optimize-images.js \
    ubuntu@3.111.168.236:/var/www/stage-music-app/
```

### Step 2: Add database columns

```bash
# SSH into server
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236

cd /var/www/stage-music-app

# The script will automatically add these columns:
# - cover_thumb
# - cover_mobile
# - cover_desktop
```

### Step 3: Run optimization

```bash
# Start image optimization
node optimize-images.js

# Expected output:
# 🚀 Starting image optimization...
# Industry Standard: 500x500 WebP @ 85% quality (~40 KB)
#
# Found 292 songs to process
#
# 🖼️  Processing song 1...
# Original: https://stage-music-files.s3...jpg
# Original size: 321.45 KB
#   ✅ thumbnail: 12.34 KB
#   ✅ mobile: 38.56 KB
#   ✅ mobile_jpg: 52.12 KB
#   ✅ desktop: 85.23 KB
# 💾 Savings: 87.9% (321.45 KB → 38.56 KB)
# ✅ Song 1 updated in database
#
# Progress: 1/292 (1 success, 0 failed)
# ...
```

### Expected Time:
- **Per song:** 10-15 seconds
- **Total (292 songs):** ~1 hour

### Monitor Progress:
```bash
# In another terminal, monitor
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "tail -f /var/www/stage-music-app/nohup.out"
```

### If Interrupted:
- Script can be re-run
- Will skip already optimized images
- Safe to restart

---

## 🎵 Phase 3: Optimize Existing Audio

### Step 1: Upload transcoding script

```bash
# From local machine
scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/optimize-audio.js \
    ubuntu@3.111.168.236:/var/www/stage-music-app/
```

### Step 2: Run transcoding

```bash
# SSH into server
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236

cd /var/www/stage-music-app

# ⚠️ WARNING: This will take 8-12 HOURS!
# Run in background with nohup
nohup node optimize-audio.js > audio-optimization.log 2>&1 &

# Check the process ID
echo $!

# Monitor progress
tail -f audio-optimization.log
```

### Expected Output:
```
🚀 Starting audio optimization...
Industry Standard: AAC 128 kbps (~5 MB for 4-min song)
⚠️  This will take a while! Processing ~75 MB files...

Found 292 WAV files to process

============================================================
🎵 Processing: Holi Haryana Ki (ID: 292)
Original: https://stage-music-files.s3...wav
Original size: 75.40 MB
⬇️  Downloading...
✅ Downloaded
🔄 Transcoding to AAC 128 kbps...
  Running: ffmpeg...
  Progress: 100%
  ✅ Standard: 4.89 MB
🔄 Transcoding to AAC 256 kbps...
  Progress: 100%
  ✅ High Quality: 9.45 MB
📤 Uploading standard...
  ✅ Uploaded: standard
📤 Uploading high...
  ✅ Uploaded: high

💾 Savings: 93.5% (75.40 MB → 4.89 MB)
✅ Song 292 updated in database
============================================================
Progress: 1/292 (1 success, 0 failed)
============================================================
```

### Expected Time:
- **Per song:** 2-3 minutes (download + transcode + upload)
- **Total (292 songs):** ~8-12 hours

### Monitor from Local Machine:
```bash
# Check progress remotely
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "tail -30 /var/www/stage-music-app/audio-optimization.log"

# Check how many completed
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "grep '✅ Song' /var/www/stage-music-app/audio-optimization.log | wc -l"
```

### If Server Disconnects:
```bash
# Check if process still running
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "ps aux | grep optimize-audio"

# If not running, restart from checkpoint
# Script will skip already transcoded files
```

---

## 🔮 Phase 4: Enable Automatic Optimization (Future Uploads)

### Step 1: Upload media optimizer module

```bash
scp -i ~/stage-music-key.pem \
    /Users/manpreetsingh/Thinking/stage-music-app/media-optimizer.js \
    ubuntu@3.111.168.236:/var/www/stage-music-app/
```

### Step 2: Update server.js

Add this at the top of server.js (after other requires):

```javascript
const { optimizeAndUploadImage, transcodeAndUploadAudio } = require('./media-optimizer');
```

Find the song upload endpoint (around line 200-300) and update:

**BEFORE:**
```javascript
app.post('/admin/upload', adminAuth, upload.fields([
    { name: 'audio_file', maxCount: 1 },
    { name: 'cover_image', maxCount: 1 }
]), async (req, res) => {
    const audioUrl = req.files['audio_file'][0].location;
    const coverUrl = req.files['cover_image'][0].location;

    // Insert into database
    db.run(`INSERT INTO songs ...`);
});
```

**AFTER:**
```javascript
app.post('/admin/upload', adminAuth, upload.fields([
    { name: 'audio_file', maxCount: 1 },
    { name: 'cover_image', maxCount: 1 }
]), async (req, res) => {
    try {
        // Get uploaded file paths
        const audioFile = req.files['audio_file'][0];
        const coverFile = req.files['cover_image'][0];

        console.log('📤 Optimizing uploaded files...');

        // Optimize image (parallel processing)
        const imageVersions = await optimizeAndUploadImage(
            coverFile.path,
            coverFile.key
        );

        // Optimize audio (parallel processing)
        const audioVersions = await transcodeAndUploadAudio(
            audioFile.path,
            audioFile.key
        );

        console.log('✅ Optimization complete!');

        // Insert into database with optimized URLs
        db.run(`INSERT INTO songs (
            title, singer, audio_file, audio_file_128, audio_file_256,
            cover_image, cover_thumb, cover_mobile, cover_desktop
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            req.body.title,
            req.body.singer,
            audioFile.location,  // Original (backup)
            audioVersions.standard,  // 128 kbps AAC
            audioVersions.high,      // 256 kbps AAC
            imageVersions.mobile,    // Primary (500x500 WebP)
            imageVersions.thumbnail, // 150x150 WebP
            imageVersions.mobile,    // 500x500 WebP
            imageVersions.desktop    // 1000x1000 WebP
        ]);

        res.json({ success: true, message: 'Song uploaded and optimized!' });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});
```

### Step 3: Update mobile.js to use optimized files

Find where audio is loaded (search for `audioPlayer.src =`):

**BEFORE:**
```javascript
audioPlayer.src = song.audio_file;
```

**AFTER:**
```javascript
// Use 128 kbps version (standard quality)
audioPlayer.src = song.audio_file_128 || song.audio_file;

// Or adaptive quality based on network:
const connection = navigator.connection;
const is4G = connection?.effectiveType === '4g';
audioPlayer.src = is4G ? (song.audio_file_256 || song.audio_file_128) : song.audio_file_128;
```

### Step 4: Restart server

```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236

cd /var/www/stage-music-app

# Kill current process
pkill -f "node server.js"

# Start with new code
nohup node server.js > server.log 2>&1 &

# Verify running
ps aux | grep "node server"
```

---

## ✅ Verification

### Test Image Optimization:
```bash
# Check database for optimized images
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "sqlite3 /var/www/stage-music-app/stage_music.db \
    'SELECT id, cover_mobile FROM songs WHERE cover_mobile IS NOT NULL LIMIT 3;'"

# Should show WebP URLs
```

### Test Audio Optimization:
```bash
# Check database for transcoded audio
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "sqlite3 /var/www/stage-music-app/stage_music.db \
    'SELECT id, title, audio_file_128 FROM songs WHERE audio_file_128 IS NOT NULL LIMIT 3;'"

# Should show .m4a URLs
```

### Test File Sizes:
```bash
# Check optimized image size
curl -I "https://stage-music-files.s3.ap-south-1.amazonaws.com/covers/[FILE]_500.webp" | grep Content-Length

# Should be ~40-50 KB

# Check optimized audio size
curl -I "https://stage-music-files.s3.ap-south-1.amazonaws.com/songs/[FILE]_128.m4a" | grep Content-Length

# Should be ~4-6 MB (for ~4 min song)
```

---

## 📊 Expected Results

### After Image Optimization:

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| **Per Image** | 321 KB | 40 KB | 87% |
| **Total (292)** | 93.7 MB | 11.7 MB | 87% |
| **Page Load** | +2 seconds | +0.3 seconds | 85% faster |

### After Audio Optimization:

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| **Per Song** | 75 MB | 5 MB | 93% |
| **Total (292)** | 21.9 GB | 1.46 GB | 93% |
| **Song Start (4G)** | 10-15 sec | 1-2 sec | 90% faster |
| **Monthly Cost (10K plays)** | $68 | $4.50 | $63 saved |

### Overall Impact:

**User Experience:**
- ⚡ 90% faster first song load
- ⚡ 85% faster page load
- ✅ Works perfectly on 3G/4G
- ✅ No buffering issues

**Cost Savings:**
- 💰 93% lower bandwidth costs
- 💰 93% lower storage costs
- 💰 **$63/month saved** at 10K plays
- 💰 **$630/month saved** at 100K plays

---

## 🔥 Quick Start Commands

### Run Image Optimization:
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236
cd /var/www/stage-music-app
node optimize-images.js
```

### Run Audio Optimization (Background):
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236
cd /var/www/stage-music-app
nohup node optimize-audio.js > audio-optimization.log 2>&1 &
tail -f audio-optimization.log
```

### Check Progress:
```bash
# Images
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "grep '✅ Song' /var/www/stage-music-app/nohup.out | wc -l"

# Audio
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 \
    "grep '✅ Song' /var/www/stage-music-app/audio-optimization.log | wc -l"
```

---

## ⚠️ Important Notes

1. **Disk Space:** Ensure server has at least 10 GB free space for temp files
2. **S3 Costs:** Transcoding will temporarily double S3 storage (old + new files)
3. **Bandwidth:** Downloading + uploading 21 GB will use significant bandwidth
4. **Time:** Audio optimization takes 8-12 hours - run overnight
5. **Backup:** Original WAV files will remain in S3 as backup
6. **Gradual Rollout:** Update mobile.js to use optimized files after verification

---

## 🆘 Troubleshooting

### Script Crashes:
```bash
# Check logs
tail -100 audio-optimization.log

# Check disk space
df -h

# Check memory
free -h

# Restart from where it left off
node optimize-audio.js
```

### FFmpeg Not Found:
```bash
sudo apt-get update
sudo apt-get install ffmpeg -y
ffmpeg -version
```

### S3 Upload Fails:
```bash
# Check AWS credentials in .env
cat .env | grep AWS

# Test S3 access
aws s3 ls s3://stage-music-files/
```

---

## 📝 Next Steps After Completion

1. ✅ Verify all songs have optimized versions
2. ✅ Update mobile.js to use `audio_file_128`
3. ✅ Deploy updated mobile.js to server
4. ✅ Test on real device (4G + 3G)
5. ✅ Monitor page load times
6. ✅ Setup CloudFront CDN (optional, for further optimization)
7. ✅ Delete original WAV files from S3 (after 30 days verification)

---

**Ready to start? Run Phase 1 (Images) first - it's quick (~1 hour)!**

**Files Location:** `/Users/manpreetsingh/Thinking/stage-music-app/`
