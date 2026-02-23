# 🚀 Bulk Upload Guide - 200-250 Songs Ek Saath Upload Karo!

## Overview

Is script se aap 200-250 songs ko **ek hi baar mein** upload kar sakte ho. Manual ek-ek karke upload karne ki zarurat nahi!

---

## 📋 Step-by-Step Process

### Step 1: Folders Banao

```bash
cd /Users/manpreetsingh/Thinking/stage-music-app

# Audio files ke liye folder
mkdir bulk-songs

# Cover images ke liye folder (optional)
mkdir bulk-covers
```

---

### Step 2: Files Copy Karo

**Audio Files:**
```bash
# Apne saare songs bulk-songs/ folder mein copy karo
cp /path/to/your/songs/*.mp3 ./bulk-songs/
cp /path/to/your/songs/*.wav ./bulk-songs/
```

**Cover Images (Optional):**
```bash
# Cover images bulk-covers/ folder mein copy karo
cp /path/to/your/covers/*.jpg ./bulk-covers/
cp /path/to/your/covers/*.png ./bulk-covers/
```

**Example:**
```
bulk-songs/
├── nidiya.mp3
├── tumhiho.mp3
├── kesariya.mp3
├── apnabhanale.mp3
└── raataanlambiyan.mp3

bulk-covers/
├── nidiya.jpg
├── aashiqui2.jpg
├── brahmastra.jpg
├── bhediya.jpg
└── shershaah.jpg
```

---

### Step 3: CSV File Banao

Ek CSV file banao jismein saare songs ki details ho.

**Format:**
```csv
title,singer,audio_file,cover_file,music_director,composer,company,lyrics,language
Song Name,Artist Name,audio.mp3,cover.jpg,Music Director,Composer,Company,Lyrics,Hindi
```

**Example - `my-songs.csv`:**
```csv
title,singer,audio_file,cover_file,music_director,composer,company,lyrics,language
Nidiya,Vishal Mishra,nidiya.mp3,nidiya.jpg,Pritam,Pritam,Sony Music,,Hindi
Tum Hi Ho,Arijit Singh,tumhiho.mp3,aashiqui2.jpg,Mithoon,Mithoon,T-Series,,Hindi
Kesariya,Arijit Singh,kesariya.mp3,brahmastra.jpg,Pritam,Amitabh Bhattacharya,Sony Music,,Hindi
Apna Bana Le,Arijit Singh,apnabhanale.mp3,bhediya.jpg,Sachin-Jigar,Amitabh Bhattacharya,T-Series,,Hindi
Raataan Lambiyan,Jubin Nautiyal,raataanlambiyan.mp3,shershaah.jpg,Tanishk Bagchi,Tanishk Bagchi,Sony Music,,Hindi
```

**CSV Fields:**
- `title` - Song ka naam (Required)
- `singer` - Singer ka naam (Required)
- `audio_file` - Audio file ka naam (Required) - bulk-songs/ folder mein honi chahiye
- `cover_file` - Cover image ka naam (Optional) - bulk-covers/ folder mein honi chahiye
- `music_director` - Music director (Optional)
- `composer` - Composer (Optional)
- `company` - Company/Label (Optional)
- `lyrics` - Lyrics (Optional - blank rakh sakte ho)
- `language` - Language (Optional - default: Hindi)

**Tips:**
- Excel/Google Sheets mein bana sakte ho, phir "Save As CSV" karo
- Agar koi field empty hai, blank chod do ya comma lagao
- Cover file optional hai, agar nahi hai to blank chod do

---

### Step 4: Upload Karo!

```bash
node bulk-upload.js my-songs.csv
```

**Script kya karega:**
1. ✅ CSV file read karega
2. ✅ Har audio file ko S3 pe upload karega
3. ✅ Cover images ko S3 pe upload karega
4. ✅ Database mein entry dalega
5. ✅ Progress dikhayega
6. ✅ 5-5 songs ek saath upload karega (fast!)

**Output Example:**
```
═══════════════════════════════════════════════════════════════════
   🎵 Stage Music - Bulk Upload Script 🎵
═══════════════════════════════════════════════════════════════════

🔍 Verifying S3 connection...
✅ S3 bucket accessible: stage-music-files

📄 Reading CSV file: my-songs.csv
✅ Found 250 songs to upload

⚠️  Ready to upload 250 songs to S3 and database
   Press Ctrl+C to cancel, or wait 5 seconds to continue...

🚀 Starting bulk upload...

[1/250] Processing: Nidiya - Vishal Mishra
   📤 Uploading audio: nidiya.mp3
   ✅ Audio uploaded: https://stage-music-files.s3.ap-south-1.amazonaws.com/songs/...
   📤 Uploading cover: nidiya.jpg
   ✅ Cover uploaded: https://stage-music-files.s3.ap-south-1.amazonaws.com/covers/...
   💾 Database updated (ID: 22)

[2/250] Processing: Tum Hi Ho - Arijit Singh
   📤 Uploading audio: tumhiho.mp3
   ✅ Audio uploaded: https://stage-music-files.s3.ap-south-1.amazonaws.com/songs/...
   ...

📊 Progress: 5/250 (2.0%)
📊 Progress: 10/250 (4.0%)
...
📊 Progress: 250/250 (100.0%)

═══════════════════════════════════════════════════════════════════
📊 Upload Summary:
═══════════════════════════════════════════════════════════════════
✅ Success: 248 songs
❌ Failed: 2 songs
⏭️  Skipped: 0 songs
⏱️  Time taken: 320.5s
═══════════════════════════════════════════════════════════════════

✅ Bulk upload complete!
```

---

## ⚡ Speed

**Estimated Time:**
- 1 song (5 MB) = ~2-3 seconds
- 5 songs parallel = ~10-15 seconds
- 250 songs = ~8-10 minutes

**Ek-ek karke:**
- 250 songs × 30 seconds = **125 minutes (2+ hours)**

**Bulk upload:**
- 250 songs ÷ 5 (parallel) × 3 seconds = **~10 minutes**

**Result: 12x faster! 🚀**

---

## 🎯 Advanced Options

### Option 1: Agar Sab Songs Ek Hi Album/Artist Ke Hain

Agar sabhi songs ek hi artist ke hain (jaise Arijit Singh), to CSV mein singer field same rakhna:

```csv
title,singer,audio_file,cover_file,music_director,composer,company,lyrics,language
Song 1,Arijit Singh,song1.mp3,cover.jpg,Pritam,Pritam,T-Series,,Hindi
Song 2,Arijit Singh,song2.mp3,cover.jpg,Pritam,Pritam,T-Series,,Hindi
Song 3,Arijit Singh,song3.mp3,cover.jpg,Pritam,Pritam,T-Series,,Hindi
```

### Option 2: Agar Cover Images Nahi Hain

Cover images optional hain. Agar nahi hain to blank chod do:

```csv
title,singer,audio_file,cover_file,music_director,composer,company,lyrics,language
Song 1,Artist 1,song1.mp3,,Composer 1,Composer 1,T-Series,,Hindi
Song 2,Artist 2,song2.mp3,,Composer 2,Composer 2,Sony Music,,Hindi
```

### Option 3: Ek Hi Cover Image Sabke Liye

Agar sabhi songs ka same cover hai:

```csv
title,singer,audio_file,cover_file,music_director,composer,company,lyrics,language
Song 1,Artist,song1.mp3,album-cover.jpg,Composer,Composer,T-Series,,Hindi
Song 2,Artist,song2.mp3,album-cover.jpg,Composer,Composer,T-Series,,Hindi
Song 3,Artist,song3.mp3,album-cover.jpg,Composer,Composer,T-Series,,Hindi
```

---

## 🛠️ CSV File Kaise Banaye?

### Method 1: Excel/Google Sheets

1. Excel/Google Sheets open karo
2. First row mein headers likho:
   ```
   title | singer | audio_file | cover_file | music_director | composer | company | lyrics | language
   ```
3. Baaki rows mein data bharo
4. **File → Save As → CSV** select karo
5. Save karo

### Method 2: Text Editor

Koi bhi text editor (Notepad, VS Code, etc.) use karke:

```csv
title,singer,audio_file,cover_file,music_director,composer,company,lyrics,language
Nidiya,Vishal Mishra,nidiya.mp3,nidiya.jpg,Pritam,Pritam,Sony Music,,Hindi
Tum Hi Ho,Arijit Singh,tumhiho.mp3,aashiqui2.jpg,Mithoon,Mithoon,T-Series,,Hindi
```

Save as `my-songs.csv`

### Method 3: Auto-Generate (Filename se)

Agar sirf filename se CSV banana hai (title = filename):

```bash
node -e "
const fs = require('fs');
const files = fs.readdirSync('./bulk-songs/');
const csv = ['title,singer,audio_file,cover_file,music_director,composer,company,lyrics,language'];
files.forEach(f => {
  if (f.endsWith('.mp3') || f.endsWith('.wav')) {
    const title = f.replace(/\.(mp3|wav)$/, '');
    csv.push(\`\${title},Unknown Artist,\${f},,,,,,Hindi\`);
  }
});
fs.writeFileSync('auto-generated.csv', csv.join('\\n'));
console.log('✅ CSV generated: auto-generated.csv');
"
```

Phir manually edit karke singer names update karo.

---

## 🔍 Troubleshooting

### Error: "Audio file not found"

**Problem:** Audio file bulk-songs/ folder mein nahi hai

**Solution:**
```bash
# Check karo file exist karti hai ya nahi
ls -la bulk-songs/nidiya.mp3

# Agar nahi hai, to copy karo
cp /path/to/nidiya.mp3 bulk-songs/
```

### Error: "CSV file not found"

**Problem:** CSV file path galat hai

**Solution:**
```bash
# CSV file current directory mein honi chahiye
ls -la my-songs.csv

# Ya full path do
node bulk-upload.js /Users/manpreetsingh/Desktop/my-songs.csv
```

### Error: "S3 bucket not accessible"

**Problem:** AWS credentials galat hain

**Solution:**
```bash
# Check .env file
cat .env | grep AWS

# Test S3 connection
node -e "require('dotenv').config();const AWS=require('aws-sdk');AWS.config.update({accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY,region:process.env.AWS_REGION});const s3=new AWS.S3();s3.headBucket({Bucket:process.env.AWS_S3_BUCKET},(e)=>console.log(e?'❌ Failed':'✅ OK'));"
```

### Kuch Songs Failed Ho Gaye

**Problem:** 2-3 songs upload nahi hue

**Solution:**
Script automatically failed songs ko `failed-songs.json` mein save karega:

```bash
# Failed songs dekho
cat failed-songs.json

# Failed songs ko fix karke phir se upload karo
# (Manual admin panel se ya CSV bana ke phir se run karo)
```

---

## 📊 Progress Tracking

Script automatically progress dikhayega:

```
📊 Progress: 50/250 (20.0%)
📊 Progress: 100/250 (40.0%)
📊 Progress: 150/250 (60.0%)
📊 Progress: 200/250 (80.0%)
📊 Progress: 250/250 (100.0%)
```

---

## 💡 Pro Tips

### 1. Test First
Pehle 5-10 songs se test karo:
```bash
# Create test CSV with 5 songs
head -6 my-songs.csv > test.csv

# Run test
node bulk-upload.js test.csv

# Agar sab theek hai, to full file run karo
node bulk-upload.js my-songs.csv
```

### 2. Backup Database
Upload se pehle database backup lo:
```bash
cp stage_music.db stage_music.db.backup-$(date +%Y%m%d)
```

### 3. Organize Files
Pehle se files organize karo:
```
bulk-songs/
├── hindi/
│   ├── song1.mp3
│   └── song2.mp3
├── punjabi/
│   ├── song3.mp3
│   └── song4.mp3
└── haryanvi/
    ├── song5.mp3
    └── song6.mp3
```

Phir CSV mein language field change karo.

### 4. Batch Upload
Agar bahut zyada songs hain (500+), to batches mein karo:
```bash
# First 250
node bulk-upload.js songs-part1.csv

# Next 250
node bulk-upload.js songs-part2.csv
```

---

## 🎉 Example Workflow

**Complete example with 200 songs:**

```bash
# Step 1: Folders setup
mkdir bulk-songs bulk-covers

# Step 2: Copy files
cp ~/Downloads/hindi-songs/*.mp3 bulk-songs/
cp ~/Downloads/covers/*.jpg bulk-covers/

# Step 3: Count files
ls bulk-songs/ | wc -l
# Output: 200

# Step 4: Generate CSV template
node -e "const fs=require('fs');const files=fs.readdirSync('./bulk-songs/');const csv=['title,singer,audio_file,cover_file,music_director,composer,company,lyrics,language'];files.forEach(f=>{if(f.endsWith('.mp3')){const title=f.replace('.mp3','');csv.push(\`\${title},Unknown,\${f},,,,,,Hindi\`)}});fs.writeFileSync('template.csv',csv.join('\\n'));console.log('✅ Template ready')"

# Step 5: Edit CSV (open in Excel, update singers)
open template.csv
# Edit and save as my-songs.csv

# Step 6: Test with 5 songs
head -6 my-songs.csv > test.csv
node bulk-upload.js test.csv

# Step 7: Verify in browser
npm start
# Open http://localhost:3000 and check if 5 songs appear

# Step 8: Upload all
node bulk-upload.js my-songs.csv

# Step 9: Celebrate! 🎉
echo "✅ All 200 songs uploaded!"
```

---

## 🚨 Important Notes

1. **Internet Connection:** Stable internet zaruri hai
2. **Time:** ~10-15 minutes lagenge 250 songs ke liye
3. **Storage:** AWS S3 mein space unlimited hai, tension free!
4. **Cost:** 250 songs (~1.5 GB) = ~$0.03/month
5. **Don't Close:** Script complete hone tak terminal band mat karo

---

## ✅ After Upload

Upload complete hone ke baad:

```bash
# 1. Server start karo
npm start

# 2. Browser mein check karo
open http://localhost:3000

# 3. Songs play karke verify karo
# 4. Database count check karo
sqlite3 stage_music.db "SELECT COUNT(*) FROM songs;"

# 5. S3 mein files check karo
node -e "require('dotenv').config();const AWS=require('aws-sdk');AWS.config.update({accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY,region:process.env.AWS_REGION});const s3=new AWS.S3();s3.listObjectsV2({Bucket:process.env.AWS_S3_BUCKET},(e,d)=>console.log('Total files:',d.Contents.length));"
```

---

## 📞 Need Help?

**Common issues:**
- CSV format galat hai → Sample file dekho: `songs-sample.csv`
- Files missing hain → Check `bulk-songs/` folder
- S3 error → Check `.env` file credentials
- Database error → Check if `stage_music.db` exists

---

## 🎊 Summary

**Before:** 250 songs × 30 sec = 125 minutes (2+ hours) ⏰

**After:** 250 songs ÷ 5 parallel = ~10 minutes ⚡

**Result: 12x faster! Save 2 hours! 🎉**

---

**Happy Bulk Uploading! 🚀**
