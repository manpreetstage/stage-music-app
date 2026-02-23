# 🎵 Mixed Upload Guide - Single Songs + Albums

## Problem Solved! ✅

Aapke paas:
- ❓ Kuch single songs hain (akele release karne hain)
- ❓ Kuch albums hain jisme 2-10 songs hain (grouped chahiye)

**Solution:** Enhanced bulk upload script jo dono handle karta hai!

---

## 📋 CSV Format (Updated)

### New Column Added: `album_name`

```csv
title,singer,audio_file,cover_file,album_name,music_director,composer,company,language
```

**Rule:**
- ✅ `album_name` **blank** = Single song release
- ✅ `album_name` **filled** = Album mein group hoga

---

## 📝 Example CSV

```csv
title,singer,audio_file,cover_file,album_name,music_director,composer,company,language
Nidiya,Vishal Mishra,nidiya.mp3,nidiya.jpg,,Pritam,Pritam,Sony Music,Hindi
Kesariya,Arijit Singh,kesariya.mp3,kesariya.jpg,,Pritam,Amitabh,Sony Music,Hindi
Tum Hi Ho,Arijit Singh,tumhiho.mp3,aashiqui2.jpg,Aashiqui 2,Mithoon,Mithoon,T-Series,Hindi
Sunn Raha Hai,Ankit Tiwari,sunnraha.mp3,aashiqui2.jpg,Aashiqui 2,Ankit Tiwari,Ankit Tiwari,T-Series,Hindi
Bhula Dena,Arijit Singh,bhuladena.mp3,aashiqui2.jpg,Aashiqui 2,Mithoon,Mithoon,T-Series,Hindi
Apna Bana Le,Arijit Singh,apnabhanale.mp3,bhediya.jpg,,Sachin-Jigar,Amitabh,T-Series,Hindi
```

**Result:**
- 🎵 Nidiya → Single song
- 🎵 Kesariya → Single song
- 📀 Aashiqui 2 → Album with 3 songs (Tum Hi Ho, Sunn Raha Hai, Bhula Dena)
- 🎵 Apna Bana Le → Single song

---

## 🚀 How to Use

### Step 1: Folders (Same as before)
```bash
mkdir bulk-songs bulk-covers
cp /path/to/songs/*.mp3 bulk-songs/
cp /path/to/covers/*.jpg bulk-covers/
```

### Step 2: Create CSV

Excel/Google Sheets mein banao:

| title | singer | audio_file | cover_file | album_name | language |
|-------|--------|------------|------------|------------|----------|
| Song1 | Artist1 | song1.mp3 | cover1.jpg | **(blank)** | Hindi |
| Song2 | Artist2 | song2.mp3 | cover2.jpg | **(blank)** | Hindi |
| Song3 | Artist3 | song3.mp3 | album1.jpg | **Album Name** | Hindi |
| Song4 | Artist3 | song4.mp3 | album1.jpg | **Album Name** | Hindi |
| Song5 | Artist4 | song5.mp3 | cover5.jpg | **(blank)** | Hindi |

**Important:**
- Same `album_name` = Grouped together as album
- Blank `album_name` = Single song
- Album ke saare songs ka **same cover** use karo

### Step 3: Upload!
```bash
node bulk-upload-v2.js my-songs.csv
```

---

## 📊 Script Output

```
═══════════════════════════════════════════════════════════════════
   🎵 Stage Music - Enhanced Bulk Upload v2 🎵
   Supports: Single Songs + Albums
═══════════════════════════════════════════════════════════════════

🔍 Verifying S3 connection...
✅ S3 bucket accessible

📄 Reading CSV file...
✅ Found 250 songs

📊 Upload Summary:
   🎵 Single Songs: 200
   📀 Albums: 5 (50 songs)

⚠️  Ready to upload. Press Ctrl+C to cancel, or wait 5 seconds...

🚀 Starting upload...

═══════════════════════════════════════════════════════════════════

📍 UPLOADING SINGLE SONGS

[1] 🎵 Single Song: Nidiya - Vishal Mishra
   📤 Uploading audio...
   ✅ Audio uploaded
   📤 Uploading cover...
   ✅ Cover uploaded
   💾 Database updated (Song ID: 22)

[2] 🎵 Single Song: Kesariya - Arijit Singh
   📤 Uploading audio...
   ✅ Audio uploaded
   💾 Database updated (Song ID: 23)

...


📍 UPLOADING ALBUMS

📀 Album: Aashiqui 2 (3 songs)
   Artist: Arijit Singh
   📤 Uploading album cover...
   ✅ Album cover uploaded
   📝 Creating album...
   ✅ Album created (ID: 5)

   [1/3] Tum Hi Ho
      📤 Uploading...
      ✅ Uploaded
      💾 Song saved (ID: 223)

   [2/3] Sunn Raha Hai
      📤 Uploading...
      ✅ Uploaded
      💾 Song saved (ID: 224)

   [3/3] Bhula Dena
      📤 Uploading...
      ✅ Uploaded
      💾 Song saved (ID: 225)

   ✅ Album "Aashiqui 2" complete!

...

═══════════════════════════════════════════════════════════════════
📊 Final Summary:
═══════════════════════════════════════════════════════════════════
✅ Total Success: 250 songs
   🎵 Single Songs: 200
   📀 Album Songs: 50 (5 albums)
❌ Failed: 0 songs
⏱️  Time taken: 12.5 minutes
═══════════════════════════════════════════════════════════════════

✅ Bulk upload complete!
```

---

## 💡 Pro Tips

### Tip 1: Album Cover
Album ke saare songs ka **same cover image** use karo:

```csv
Song1,Artist,song1.mp3,album-cover.jpg,Album Name,,,Label,Hindi
Song2,Artist,song2.mp3,album-cover.jpg,Album Name,,,Label,Hindi
Song3,Artist,song3.mp3,album-cover.jpg,Album Name,,,Label,Hindi
```

Script automatically pehli song ka cover use karega as album cover.

### Tip 2: Album Name Same Hona Chahiye
Group karne ke liye **exact same album_name** chahiye:

✅ **Correct:**
```csv
Song1,Artist,song1.mp3,cover.jpg,Aashiqui 2,,,Label,Hindi
Song2,Artist,song2.mp3,cover.jpg,Aashiqui 2,,,Label,Hindi
```

❌ **Wrong:**
```csv
Song1,Artist,song1.mp3,cover.jpg,Aashiqui 2,,,Label,Hindi
Song2,Artist,song2.mp3,cover.jpg,aashiqui 2,,,Label,Hindi  ← Different case!
```

### Tip 3: Mix Everything
Ek CSV mein sab daal sakte ho:

```csv
Single Song 1,,,,,,,          ← Single
Single Song 2,,,,,,,          ← Single
Album 1 Song 1,,,,,Album 1,,  ← Album
Album 1 Song 2,,,,,Album 1,,  ← Album (same album)
Single Song 3,,,,,,,          ← Single
Album 2 Song 1,,,,,Album 2,,  ← Different Album
Album 2 Song 2,,,,,Album 2,,  ← Album (same album)
```

---

## 🎯 Real Example

### Your Actual Case:

**Single Songs (150):**
- Nidiya
- Kesariya
- Apna Bana Le
- ... (147 more)

**Album 1: Aashiqui 2 (3 songs)**
- Tum Hi Ho
- Sunn Raha Hai
- Bhula Dena

**Album 2: Shershaah (4 songs)**
- Raataan Lambiyan
- Ranjha
- Mann Bharrya
- Kabhi Tumhe

**Album 3: KGF Chapter 2 (5 songs)**
- ... songs

**Total:** 150 singles + 12 album songs = 162 songs

### CSV File:

```csv
title,singer,audio_file,cover_file,album_name,music_director,composer,company,language
Nidiya,Vishal Mishra,nidiya.mp3,nidiya.jpg,,Pritam,Pritam,Sony,Hindi
Kesariya,Arijit Singh,kesariya.mp3,kesariya.jpg,,Pritam,Amitabh,Sony,Hindi
Tum Hi Ho,Arijit Singh,tumhiho.mp3,aashiqui2.jpg,Aashiqui 2,Mithoon,Mithoon,T-Series,Hindi
Sunn Raha Hai,Ankit Tiwari,sunnraha.mp3,aashiqui2.jpg,Aashiqui 2,Ankit Tiwari,Ankit Tiwari,T-Series,Hindi
Bhula Dena,Arijit Singh,bhuladena.mp3,aashiqui2.jpg,Aashiqui 2,Mithoon,Mithoon,T-Series,Hindi
Apna Bana Le,Arijit Singh,apnabhanale.mp3,bhediya.jpg,,Sachin-Jigar,Amitabh,T-Series,Hindi
Raataan Lambiyan,Jubin Nautiyal,raataanlambiyan.mp3,shershaah.jpg,Shershaah,Tanishk,Tanishk,Sony,Hindi
Ranjha,Jasleen Royal,ranjha.mp3,shershaah.jpg,Shershaah,Jasleen,Jasleen,Sony,Hindi
Mann Bharrya,B Praak,mannbharrya.mp3,shershaah.jpg,Shershaah,Tanishk,B Praak,Sony,Hindi
Kabhi Tumhe,Darshan Raval,kabhitumhe.mp3,shershaah.jpg,Shershaah,Javed-Mohsin,Javed-Mohsin,Sony,Hindi
...
```

---

## 📂 Folder Structure

```
bulk-songs/
├── nidiya.mp3              ← Single
├── kesariya.mp3            ← Single
├── tumhiho.mp3             ← Album song
├── sunnraha.mp3            ← Album song
├── bhuladena.mp3           ← Album song
├── apnabhanale.mp3         ← Single
└── ...

bulk-covers/
├── nidiya.jpg              ← Single song cover
├── kesariya.jpg            ← Single song cover
├── aashiqui2.jpg           ← Album cover (used by all 3 songs)
├── bhediya.jpg             ← Single song cover
├── shershaah.jpg           ← Album cover (used by all 4 songs)
└── ...
```

---

## ✅ Comparison

### Old Script (`bulk-upload.js`):
- ✅ Single songs only
- ❌ No album support

### New Script (`bulk-upload-v2.js`):
- ✅ Single songs
- ✅ Albums (grouped)
- ✅ Mixed (both in same CSV)
- ✅ Album cover shared
- ✅ Proper album database entries

---

## 🚀 Quick Start

```bash
# 1. Setup
mkdir bulk-songs bulk-covers

# 2. Copy files
cp /path/to/songs/*.mp3 bulk-songs/
cp /path/to/covers/*.jpg bulk-covers/

# 3. Create CSV (see example above)
# Open Excel/Google Sheets
# Add album_name column
# Fill album names where needed
# Save as CSV

# 4. Upload!
node bulk-upload-v2.js my-songs.csv

# Done! ✅
```

---

## 🎊 Summary

✅ **Single songs** → `album_name` blank chodo
✅ **Album songs** → Same `album_name` do
✅ **Mixed** → Dono ek saath kar sakte ho
✅ **Same cover** → Album ke songs ka same cover use karo

**Ab aap single + album dono handle kar sakte ho!** 🎉

---

Sample file dekho: **`songs-mixed-sample.csv`**

Koi doubt? Batao! 😊
