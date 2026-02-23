# AWS S3 Integration - Testing Checklist

## ✅ Pre-Test Verification

- ✅ AWS SDK installed
- ✅ Multer-S3 installed
- ✅ S3 bucket created: `stage-music-files`
- ✅ Bucket policy configured (public read)
- ✅ CORS configured
- ✅ 19 songs migrated to S3
- ✅ Database updated with S3 URLs
- ✅ Server configuration valid

---

## 🧪 Testing Steps

### 1. Start the Server
```bash
cd /Users/manpreetsingh/Thinking/stage-music-app
npm start
```

**Expected output**:
```
╔═══════════════════════════════════════════════╗
║                                               ║
║       🎵  STAGE MUSIC PLATFORM  🎵           ║
║                                               ║
║   Server running on: http://localhost:3000   ║
║                                               ║
║   Music Player: http://localhost:3000/          ║
║   Admin Panel:  http://localhost:3000/admin     ║
║                                               ║
╚═══════════════════════════════════════════════╝
```

---

### 2. Test Existing Songs (Migrated from Local to S3)

**Steps**:
1. Open http://localhost:3000
2. You should see 19 songs in the library
3. Click on any song to play it
4. Verify:
   - [ ] Song plays without errors
   - [ ] Cover image displays correctly
   - [ ] Audio loads from S3 (check Network tab in browser DevTools)
   - [ ] Seeking works (click to different parts of the song)
   - [ ] Volume control works

**What to check in browser DevTools (F12)**:
- Network tab should show requests to: `stage-music-files.s3.ap-south-1.amazonaws.com`
- Status: 200 OK
- Content-Type: audio/mpeg or audio/wav

---

### 3. Test New Song Upload

**Steps**:
1. Go to http://localhost:3000/admin
2. Fill in song details:
   - Title: "Test S3 Upload"
   - Singer: "Test Artist"
   - Language: Hindi
3. Upload audio file (any MP3/WAV)
4. Upload cover image (any JPG/PNG)
5. Click "Upload Song"

**Verify**:
- [ ] Upload succeeds
- [ ] Song appears in the library
- [ ] Song plays correctly
- [ ] Cover image displays

**Check S3**:
```bash
node -e "
require('dotenv').config();
const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const s3 = new AWS.S3();
s3.listObjectsV2({
    Bucket: process.env.AWS_S3_BUCKET,
    Prefix: 'songs/',
    MaxKeys: 5
}, (err, data) => {
    if (err) console.error(err);
    else {
        console.log('Recent files in S3:');
        data.Contents.sort((a,b) => b.LastModified - a.LastModified).forEach(obj => {
            console.log('  -', obj.Key, '(' + (obj.Size/1024/1024).toFixed(2) + ' MB)',
                        obj.LastModified.toISOString());
        });
    }
});
"
```

**Verify local directory is NOT used**:
```bash
ls -la ./uploads/songs/ | tail -5
```
Should NOT show the newly uploaded file (only old migrated files).

---

### 4. Test Album Upload

**Steps**:
1. Go to http://localhost:3000/admin
2. Click "Upload Album" (if available)
3. Fill in album details:
   - Album Title: "Test S3 Album"
   - Artist: "Test Artist"
   - Language: Hindi
4. Add 2-3 songs with the same cover image
5. Click "Upload Album"

**Verify**:
- [ ] All songs upload successfully
- [ ] All songs appear in library
- [ ] All songs use the same cover image
- [ ] All songs play correctly
- [ ] Files are in S3, not local

---

### 5. Test YouTube Import (if applicable)

**Steps**:
1. Find a short YouTube video URL (music video)
2. Use the import feature (if available in your app)
3. Submit the YouTube URL

**Verify**:
- [ ] Audio downloads from YouTube
- [ ] File uploads to S3
- [ ] Local temp file is deleted
- [ ] Song appears in library
- [ ] Song plays correctly

---

### 6. Test Song Update (Cover Image)

**Steps**:
1. Go to http://localhost:3000/admin
2. Find the test song you uploaded
3. Click "Edit"
4. Upload a new cover image
5. Save changes

**Verify**:
- [ ] New cover image uploads to S3
- [ ] Old cover image is deleted from S3
- [ ] New cover displays in the library

---

### 7. Test Song Deletion

**Steps**:
1. Go to http://localhost:3000/admin
2. Find the test song you uploaded
3. Click "Delete"
4. Confirm deletion

**Verify**:
- [ ] Song disappears from library
- [ ] Song removed from database
- [ ] Audio file deleted from S3
- [ ] Cover image deleted from S3 (if not used by other songs)

**Check S3 to confirm deletion**:
```bash
# Count total files in S3
node -e "
require('dotenv').config();
const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const s3 = new AWS.S3();
s3.listObjectsV2({ Bucket: process.env.AWS_S3_BUCKET }, (err, data) => {
    if (err) console.error(err);
    else console.log('Total files in S3:', data.Contents.length);
});
"
```

---

### 8. Test Browser Compatibility

Test on multiple browsers:
- [ ] Chrome (Desktop)
- [ ] Safari (Desktop/iOS)
- [ ] Firefox (Desktop)
- [ ] Edge (Desktop)
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

**Verify for each**:
- Songs load and play
- Cover images display
- Seeking works
- No CORS errors

---

### 9. Performance Testing

**Test network speed**:
1. Open browser DevTools → Network tab
2. Play a song
3. Check "Time" column for audio file load

**Expected**:
- First byte: < 500ms
- Full load: Depends on file size and internet speed
- Should be faster than local server if using CloudFront

**Check file sizes in S3**:
```bash
node -e "
require('dotenv').config();
const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const s3 = new AWS.S3();
s3.listObjectsV2({ Bucket: process.env.AWS_S3_BUCKET }, (err, data) => {
    if (err) console.error(err);
    else {
        let totalSize = 0;
        let audioSize = 0;
        let coverSize = 0;
        data.Contents.forEach(obj => {
            totalSize += obj.Size;
            if (obj.Key.startsWith('songs/')) audioSize += obj.Size;
            if (obj.Key.startsWith('covers/')) coverSize += obj.Size;
        });
        console.log('Storage usage:');
        console.log('  Audio files:', (audioSize/1024/1024).toFixed(2), 'MB');
        console.log('  Cover images:', (coverSize/1024/1024).toFixed(2), 'MB');
        console.log('  Total:', (totalSize/1024/1024).toFixed(2), 'MB');
    }
});
"
```

---

### 10. Error Handling Tests

**Test invalid file uploads**:
1. Try uploading a text file as audio → Should reject
2. Try uploading without title → Should reject
3. Try uploading without audio file → Should reject

**Test missing permissions**:
1. Temporarily remove AWS credentials from `.env`
2. Try uploading → Should show error
3. Restore credentials

**Test network failures**:
1. Disconnect internet
2. Try playing a song → Should show loading/error
3. Reconnect → Should resume

---

## ✅ Success Criteria

All tests pass if:

- ✅ Existing songs play from S3
- ✅ New uploads go to S3 (not local)
- ✅ Cover images load from S3
- ✅ Song updates work (cover change)
- ✅ Song deletions remove from S3
- ✅ Album uploads work
- ✅ No local files created (except temp)
- ✅ No CORS errors in browser
- ✅ All browsers work
- ✅ Database has S3 URLs

---

## 🐛 Common Issues & Solutions

### Issue: CORS Error
**Solution**: Check S3 bucket CORS configuration
```bash
node -e "
require('dotenv').config();
const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const s3 = new AWS.S3();
s3.getBucketCors({ Bucket: process.env.AWS_S3_BUCKET }, (err, data) => {
    if (err) console.error('No CORS configured');
    else console.log('CORS rules:', JSON.stringify(data, null, 2));
});
"
```

### Issue: 403 Forbidden
**Solution**: Check bucket policy allows public read
```bash
node -e "
require('dotenv').config();
const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const s3 = new AWS.S3();
s3.getBucketPolicy({ Bucket: process.env.AWS_S3_BUCKET }, (err, data) => {
    if (err) console.error('No bucket policy');
    else console.log('Bucket policy:', JSON.parse(data.Policy));
});
"
```

### Issue: Upload Fails
**Check AWS credentials**:
```bash
node -e "
require('dotenv').config();
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) + '...');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);
"
```

### Issue: Files Not Deleting
**Check S3 object exists**:
```bash
node -e "
require('dotenv').config();
const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const s3 = new AWS.S3();
const key = 'songs/YOUR_FILE_NAME.mp3'; // Replace with actual file
s3.headObject({ Bucket: process.env.AWS_S3_BUCKET, Key: key }, (err, data) => {
    if (err) console.error('File not found:', err.message);
    else console.log('File exists:', data);
});
"
```

---

## 📊 Monitoring Dashboard

After testing, check:

### AWS S3 Console
1. Go to https://s3.console.aws.amazon.com/s3/buckets/stage-music-files
2. Verify files are uploaded
3. Check total storage size

### AWS CloudWatch (Optional)
1. Go to https://console.aws.amazon.com/cloudwatch/
2. Check S3 metrics:
   - NumberOfObjects
   - BucketSizeBytes
   - AllRequests

### Cost Explorer (After 24 hours)
1. Go to https://console.aws.amazon.com/cost-management/
2. Check S3 costs
3. Set up billing alerts if needed

---

## 🎉 Testing Complete!

Once all tests pass, your S3 integration is complete and ready for production!

**Next steps**:
1. ✅ Monitor AWS costs
2. ✅ Set up CloudFront CDN (optional)
3. ✅ Enable S3 versioning for backups
4. ✅ Rotate AWS credentials for security
5. ✅ Deploy to production

---

**Testing Date**: _____________
**Tested By**: _____________
**Status**: [ ] Pass [ ] Fail
**Notes**: _____________
