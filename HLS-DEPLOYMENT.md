# HLS Adaptive Streaming - Deployment Guide

## ✅ Implementation Complete

All phases of HLS adaptive streaming have been implemented and are ready for deployment.

---

## 📋 What Was Implemented

### Phase 1: Database Migration ✅
- Added `hls_master_url` (TEXT) column to songs table
- Added `has_hls` (INTEGER) flag column to songs table
- Migration script: `migrations/add-hls-columns.js`

### Phase 2: HLS Conversion Script ✅
- Created `convert-to-hls.js` for converting songs to HLS format
- Converts to 2 quality levels: 64kbps and 128kbps AAC
- Segment duration: 4 seconds
- Uploads to S3: `s3://stage-music-files/hls/{song_id}/`
- Test song converted: **Song ID 113 - "Do Lugai"**

### Phase 3: Client-Side Player Integration ✅
- Added HLS.js library to both mobile and desktop HTML
- Created `loadAudioSource()` function for HLS-aware playback
- Automatic fallback to standard audio if HLS fails
- Quality level switching logs for debugging
- Cleanup handlers for HLS instances

**Files Modified:**
- `public/mobile/index.html` - Added HLS.js CDN
- `public/index.html` - Added HLS.js CDN
- `public/mobile/mobile.js` - HLS player logic (lines 786-849)
- `public/app.js` - HLS player logic (lines 825-889)

### Phase 4: Server API Updates ✅
- Updated `/api/songs` endpoint to include HLS columns
- Updated `/api/quick-picks` endpoint to include HLS columns
- All other endpoints using `SELECT *` automatically include HLS columns

**Files Modified:**
- `server.js` - Lines 431-436, 599-611

---

## 🗂️ S3 Structure

```
s3://stage-music-files/hls/113/
  ├── master.m3u8              # Master playlist (entry point)
  ├── quality_64k.m3u8         # 64kbps variant playlist
  ├── quality_128k.m3u8        # 128kbps variant playlist
  ├── segments_64k/            # 64kbps segments (65 files)
  │   ├── segment_000.ts
  │   ├── segment_001.ts
  │   └── ...
  └── segments_128k/           # 128kbps segments (65 files)
      ├── segment_000.ts
      ├── segment_001.ts
      └── ...
```

**Master Playlist URL:**
```
https://stage-music-files.s3.ap-south-1.amazonaws.com/hls/113/master.m3u8
```

---

## 🚀 Deployment Steps

### Step 1: Upload Files to Server

```bash
# From local machine
scp -i ~/stage-music-key.pem -r \
  migrations/ \
  convert-to-hls.js \
  server.js \
  public/mobile/index.html \
  public/mobile/mobile.js \
  public/index.html \
  public/app.js \
  ubuntu@3.111.168.236:/var/www/stage-music-app/
```

### Step 2: Run Migration on Server

```bash
# SSH to server
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236

# Navigate to app directory
cd /var/www/stage-music-app

# Run migration
node migrations/add-hls-columns.js
```

**Expected Output:**
```
🚀 Starting HLS columns migration...
📁 Database: /var/www/stage-music-app/stage_music.db
📊 Adding HLS columns to songs table...
  ✅ Added hls_master_url column
  ✅ Added has_hls column

🎉 Migration completed successfully!
```

### Step 3: Restart Server

```bash
# Kill existing node process
sudo pkill node

# Start server in background
nohup node server.js &

# Verify server is running
ps aux | grep node
```

### Step 4: Verify Database

```bash
sqlite3 stage_music.db "SELECT id, title, has_hls FROM songs WHERE id = 113"
```

**Expected Output:**
```
113|Do Lugai|1
```

---

## 🧪 Testing Plan

### Test 1: Verify HLS Playlist Accessibility

```bash
curl https://stage-music-files.s3.ap-south-1.amazonaws.com/hls/113/master.m3u8
```

**Expected Output:**
```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=64000,CODECS="mp4a.40.2"
quality_64k.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=128000,CODECS="mp4a.40.2"
quality_128k.m3u8
```

### Test 2: Check API Response

```bash
curl https://3-111-168-236.nip.io/api/songs/113
```

**Expected:** Response should include:
```json
{
  "song": {
    "id": 113,
    "title": "Do Lugai",
    "hls_master_url": "https://stage-music-files.s3.ap-south-1.amazonaws.com/hls/113/master.m3u8",
    "has_hls": 1,
    ...
  }
}
```

### Test 3: Mobile Player Test

1. Open: `https://3-111-168-236.nip.io/mobile/`
2. Search for "Do Lugai"
3. Play the song
4. Open Chrome DevTools → Console
5. Look for: `🎵 Loading HLS stream: ...`
6. Check Network tab for `.ts` segment downloads

**Expected Logs:**
```
🎵 Loading HLS stream: https://stage-music-files.s3...
✅ HLS manifest parsed, quality levels: 2
📊 Switched to quality: 64kbps
```

### Test 4: Adaptive Quality Switching

1. Play "Do Lugai"
2. Chrome DevTools → Network → Throttling → Slow 3G
3. Wait 5 seconds
4. Switch to Fast 4G
5. Check console for quality switch logs

**Expected:**
- Should start with 64kbps on Slow 3G
- Should switch to 128kbps on Fast 4G

### Test 5: Fallback Test (Non-HLS Songs)

1. Play any other song (not Song ID 113)
2. Check console logs
3. Should use standard audio without HLS

---

## 📊 Browser Compatibility

| Browser | HLS Support | Method |
|---------|-------------|--------|
| Chrome/Edge | ✅ | HLS.js library |
| Firefox | ✅ | HLS.js library |
| Safari (iOS) | ✅ | Native HLS support |
| Safari (macOS) | ✅ | Native HLS support |
| Android Chrome | ✅ | HLS.js library |

---

## 🔍 Debugging

### Console Logs to Check

**Successful HLS Load:**
```
🎵 Loading HLS stream: https://...
✅ HLS manifest parsed, quality levels: 2
📊 Switched to quality: 64kbps
```

**Fallback to Standard Audio:**
```
🔄 HLS error, falling back to standard audio: networkError
```

**Non-HLS Song:**
```
(No HLS logs - standard audio loaded)
```

### Network Tab Inspection

- Should see multiple `.ts` segment files downloading
- Each segment is ~30-40KB for 64kbps
- Each segment is ~60-80KB for 128kbps
- Master playlist (`.m3u8`) should load first

### Common Issues

**Issue 1: HLS.js not found**
- Check: `<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>` is in HTML
- Solution: Clear browser cache and reload

**Issue 2: CORS error on segments**
- Check S3 bucket CORS configuration
- Segments should have `Cache-Control: public, max-age=31536000`

**Issue 3: Quality not switching**
- Network conditions may not trigger switch
- Check HLS.js config: `backBufferLength` set to 90

---

## 📈 Next Steps (Future)

### 1. Convert More Songs
- Run `convert-to-hls.js` for other popular songs
- Prioritize top 50 most played songs

### 2. Batch Conversion Script
- Create `batch-convert-hls.js` to process multiple songs
- Process in batches of 5 at a time
- Monitor conversion success rate

### 3. Add More Quality Levels
- Consider adding 256kbps for premium users
- Consider adding 32kbps for extreme low bandwidth

### 4. Analytics
- Track HLS playback adoption via RudderStack
- Monitor quality level switches
- Track fallback rate

### 5. CDN Integration
- Set up CloudFront distribution
- Cache segments at edge locations
- Reduce latency and bandwidth costs

---

## 💰 Cost Impact

**Storage:**
- ~5MB per song for HLS segments (both qualities)
- Song ID 113: ~2.5MB
- 500 songs × 5MB = ~2.5GB total
- S3 cost: ~$0.06/month

**Bandwidth:**
- Reduced bandwidth due to adaptive streaming
- Users on slow connections use 64kbps instead of 128kbps
- Net savings expected

---

## 🔄 Rollback Plan

If issues occur:

1. **Client-Side Rollback:**
   - Comment out `loadAudioSource()` calls
   - Revert to `audioPlayer.src = song.audio_file_128 || song.audio_file`

2. **Database Rollback:**
   ```sql
   UPDATE songs SET has_hls = 0 WHERE id = 113;
   ```

3. **S3 Cleanup (optional):**
   - HLS files can remain on S3
   - No impact if `has_hls = 0` in database

---

## ✅ Implementation Checklist

- [x] Database migration script created
- [x] Database columns added
- [x] HLS conversion script created
- [x] Test song converted (ID 113)
- [x] HLS.js library added to mobile HTML
- [x] HLS.js library added to desktop HTML
- [x] Mobile player updated with HLS logic
- [x] Desktop player updated with HLS logic
- [x] Server API endpoints updated
- [x] HLS files uploaded to S3
- [x] Master playlist accessible
- [x] Segment files accessible
- [ ] Files deployed to production server
- [ ] Migration run on production database
- [ ] Server restarted
- [ ] Browser testing completed
- [ ] Mobile testing completed
- [ ] Quality switching verified

---

## 📞 Support

For issues or questions:
- Check deployment logs: `tail -f nohup.out`
- Check Node.js logs: `journalctl -u node`
- Review this document for troubleshooting steps

---

**Document Version:** 1.0
**Last Updated:** 2026-03-10
**Implementation Status:** ✅ Complete - Ready for Deployment
