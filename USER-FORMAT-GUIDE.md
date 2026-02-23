# 🎯 Aapke CSV Format Ka Guide

## ✅ Aapka CSV Format Support Ho Gaya!

Script ab aapke column names ko automatically samajh legi:

```csv
Sr No.,Song_Name,Album_Name,Wave Audio,Audio_File,Cover_File,Singer,Lyrics,Music_Director,Composer,Record_Label/Company
```

---

## 📋 Column Mapping

Script automatically convert karega:

| Aapka Column | Script Samajhega |
|--------------|------------------|
| `Sr No.` | Serial number (ignored) |
| `Song_Name` | Song title |
| `Album_Name` | Album (blank = single) |
| `Wave Audio` | Ignored (use Audio_File) |
| `Audio_File` | MP3/WAV filename |
| `Cover_File` | JPG/PNG filename |
| `Singer` | Singer name |
| `Lyrics` | **Lyricist name** |
| `Music_Director` | Music director |
| `Composer` | Composer |
| `Record_Label/Company` | Company |

---

## 📝 Example CSV

```csv
Sr No.,Song_Name,Album_Name,Wave Audio,Audio_File,Cover_File,Singer,Lyrics,Music_Director,Composer,Record_Label/Company
1,Nidiya,,,nidiya.mp3,nidiya.jpg,Vishal Mishra,Irshad Kamil,Pritam,Pritam,Sony Music
2,Kesariya,,,kesariya.mp3,kesariya.jpg,Arijit Singh,Amitabh Bhattacharya,Pritam,Pritam,Sony Music
3,Tum Hi Ho,Aashiqui 2,,tumhiho.mp3,aashiqui2.jpg,Arijit Singh,Mithoon,Mithoon,Mithoon,T-Series
4,Sunn Raha Hai,Aashiqui 2,,sunnraha.mp3,aashiqui2.jpg,Ankit Tiwari,Sandeep Nath,Ankit Tiwari,Ankit Tiwari,T-Series
```

**Result:**
- Row 1-2: Single songs
- Row 3-4: "Aashiqui 2" album with 2 songs

---

## 🚀 Usage

### Step 1: Folders Setup
```bash
mkdir bulk-songs bulk-covers
```

### Step 2: Files Copy
```bash
# Audio files
cp /path/to/songs/*.mp3 bulk-songs/
cp /path/to/songs/*.wav bulk-songs/

# Cover images
cp /path/to/covers/*.jpg bulk-covers/
```

### Step 3: Upload
```bash
node bulk-upload-v3.js your-songs.csv
```

---

## 💡 Important Notes

### 1. Album_Name Column
- **Blank** = Single song upload
- **Filled** = Album mein group hoga

```csv
Sr No.,Song_Name,Album_Name,Audio_File,Cover_File,Singer,Lyrics,Music_Director,Composer,Record_Label/Company
1,Song1,,song1.mp3,cover1.jpg,Artist,Lyricist,Director,Composer,Label   ← Single
2,Song2,Album Name,song2.mp3,album.jpg,Artist,Lyricist,Director,Composer,Label   ← Album
3,Song3,Album Name,song3.mp3,album.jpg,Artist,Lyricist,Director,Composer,Label   ← Album (same)
```

### 2. Wave Audio Column
`Wave Audio` column ko **ignore** karega. Script sirf `Audio_File` column use karega.

```csv
Wave Audio,Audio_File
nidiya.wav,nidiya.mp3   ← Script "nidiya.mp3" use karega
```

### 3. Lyrics = Lyricist
`Lyrics` column mein **lyricist ka naam** daalo (actual lyrics nahi):

```csv
Lyrics
Amitabh Bhattacharya   ← ✅ Correct
Irshad Kamil           ← ✅ Correct
"Tere bin nahi..."     ← ❌ Wrong (ye actual lyrics hai)
```

### 4. File Names
CSV mein jo filenames hain, wahi `bulk-songs/` aur `bulk-covers/` mein honi chahiye:

```csv
Audio_File,Cover_File
nidiya.mp3,nidiya.jpg
```

**Files:**
```
bulk-songs/nidiya.mp3  ← Must exist
bulk-covers/nidiya.jpg ← Must exist
```

---

## 📊 Script Output

```
═══════════════════════════════════════════════════════════════════
   🎵 Stage Music - Smart Bulk Upload v3 🎵
   Supports: Any CSV Format + Singles + Albums
═══════════════════════════════════════════════════════════════════

🔍 Verifying S3 connection...
✅ S3 bucket accessible

📄 Reading CSV file...
📋 CSV Headers detected:
   Sr No. → sr_no
   Song_Name → title
   Album_Name → album_name
   Wave Audio → wave_audio
   Audio_File → audio_file
   Cover_File → cover_file
   Singer → singer
   Lyrics → lyricist
   Music_Director → music_director
   Composer → composer
   Record_Label/Company → company

✅ Found 250 songs

📊 Upload Summary:
   🎵 Single Songs: 200
   📀 Albums: 5 (50 songs)

🚀 Starting upload...
...
```

---

## ✅ Kya Kya Support Hai

### Format 1: Aapka Format ✅
```csv
Sr No.,Song_Name,Album_Name,Wave Audio,Audio_File,Cover_File,Singer,Lyrics,Music_Director,Composer,Record_Label/Company
```

### Format 2: Purana Format ✅
```csv
title,singer,audio_file,cover_file,album_name,music_director,composer,lyricist,company,language
```

**Dono formats kaam karenge!** Script automatically detect karega!

---

## 🎯 Quick Example

### Your CSV File: `my-songs.csv`
```csv
Sr No.,Song_Name,Album_Name,Wave Audio,Audio_File,Cover_File,Singer,Lyrics,Music_Director,Composer,Record_Label/Company
1,Nidiya,,,nidiya.mp3,nidiya.jpg,Vishal Mishra,Irshad Kamil,Pritam,Pritam,Sony Music
2,Tum Hi Ho,Aashiqui 2,,tumhiho.mp3,aashiqui2.jpg,Arijit Singh,Mithoon,Mithoon,Mithoon,T-Series
3,Sunn Raha Hai,Aashiqui 2,,sunnraha.mp3,aashiqui2.jpg,Ankit Tiwari,Sandeep Nath,Ankit Tiwari,Ankit Tiwari,T-Series
```

### Commands:
```bash
# Setup
mkdir bulk-songs bulk-covers
cp /path/to/songs/*.mp3 bulk-songs/
cp /path/to/covers/*.jpg bulk-covers/

# Upload
node bulk-upload-v3.js my-songs.csv
```

### Result:
- ✅ 1 single song (Nidiya)
- ✅ 1 album "Aashiqui 2" with 2 songs

---

## 🔧 Script Features

1. ✅ **Smart Column Detection** - Aapke column names ko samajhta hai
2. ✅ **Multiple Formats** - Purana aur naya dono format support
3. ✅ **Single + Album** - Dono ek saath upload
4. ✅ **S3 Upload** - Cloud storage
5. ✅ **Progress Tracking** - Real-time progress
6. ✅ **Error Handling** - Failed songs ka report

---

## 🎊 Summary

**New Script:** `bulk-upload-v3.js`

**Supports:**
- ✅ Aapka CSV format (Sr No., Song_Name, Album_Name, etc.)
- ✅ Purana CSV format (title, singer, audio_file, etc.)
- ✅ Single songs
- ✅ Albums
- ✅ Mixed upload

**Command:**
```bash
node bulk-upload-v3.js your-songs.csv
```

**Sample File:** `songs-user-format.csv`

---

**Aapka format fully supported hai! Ready to use!** ✅

Good luck! 😊🎵
