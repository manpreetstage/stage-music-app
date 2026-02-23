# 🎯 Simple Guide - Single Songs + Albums

## 1 Simple Rule! 🎯

### CSV mein ek naya column: `album_name`

```
album_name BLANK = Single Song 🎵
album_name FILLED = Album mein jayega 📀
```

---

## 📝 CSV Format

```csv
title,singer,audio_file,cover_file,album_name,music_director,composer,lyricist,company,language
```

**Fields:**
- `title` - Song ka naam
- `singer` - Singer ka naam
- `audio_file` - Audio file (bulk-songs/ folder mein)
- `cover_file` - Cover image (bulk-covers/ folder mein)
- `album_name` - Album ka naam (blank = single song)
- `music_director` - Music director ka naam
- `composer` - Composer ka naam
- `lyricist` - **Lyricist ka naam** (lyrics likha kisne)
- `company` - Company/Label
- `language` - Language (Hindi, Punjabi, etc.)

---

## 🎵 Example 1: Single Songs

```csv
title,singer,audio_file,cover_file,album_name,music_director,composer,lyricist,company,language
Nidiya,Vishal Mishra,nidiya.mp3,nidiya.jpg,,Pritam,Pritam,Irshad Kamil,Sony Music,Hindi
Kesariya,Arijit Singh,kesariya.mp3,kesariya.jpg,,Pritam,Pritam,Amitabh Bhattacharya,Sony Music,Hindi
Apna Bana Le,Arijit Singh,apnabhanale.mp3,bhediya.jpg,,Sachin-Jigar,Sachin-Jigar,Amitabh Bhattacharya,T-Series,Hindi
```

**Result:** 3 single songs ✅

---

## 📀 Example 2: Album

```csv
title,singer,audio_file,cover_file,album_name,music_director,composer,lyricist,company,language
Tum Hi Ho,Arijit Singh,tumhiho.mp3,aashiqui2.jpg,Aashiqui 2,Mithoon,Mithoon,Mithoon,T-Series,Hindi
Sunn Raha Hai,Ankit Tiwari,sunnraha.mp3,aashiqui2.jpg,Aashiqui 2,Ankit Tiwari,Ankit Tiwari,Sandeep Nath,T-Series,Hindi
Bhula Dena,Arijit Singh,bhuladena.mp3,aashiqui2.jpg,Aashiqui 2,Mithoon,Mithoon,Mithoon,T-Series,Hindi
```

**Result:** 1 album "Aashiqui 2" with 3 songs ✅

---

## 🎵📀 Example 3: Mixed (Single + Album)

```csv
title,singer,audio_file,cover_file,album_name,music_director,composer,lyricist,company,language
Nidiya,Vishal Mishra,nidiya.mp3,nidiya.jpg,,Pritam,Pritam,Irshad Kamil,Sony Music,Hindi
Kesariya,Arijit Singh,kesariya.mp3,kesariya.jpg,,Pritam,Pritam,Amitabh Bhattacharya,Sony Music,Hindi
Tum Hi Ho,Arijit Singh,tumhiho.mp3,aashiqui2.jpg,Aashiqui 2,Mithoon,Mithoon,Mithoon,T-Series,Hindi
Sunn Raha Hai,Ankit Tiwari,sunnraha.mp3,aashiqui2.jpg,Aashiqui 2,Ankit Tiwari,Ankit Tiwari,Sandeep Nath,T-Series,Hindi
Bhula Dena,Arijit Singh,bhuladena.mp3,aashiqui2.jpg,Aashiqui 2,Mithoon,Mithoon,Mithoon,T-Series,Hindi
Apna Bana Le,Arijit Singh,apnabhanale.mp3,bhediya.jpg,,Sachin-Jigar,Sachin-Jigar,Amitabh Bhattacharya,T-Series,Hindi
Raataan Lambiyan,Jubin Nautiyal,raataanlambiyan.mp3,shershaah.jpg,Shershaah,Tanishk Bagchi,Tanishk Bagchi,Tanishk Bagchi,Sony Music,Hindi
Ranjha,Jasleen Royal,ranjha.mp3,shershaah.jpg,Shershaah,Jasleen Royal,Jasleen Royal,Anvita Dutt,Sony Music,Hindi
```

**Result:**
- 3 single songs: Nidiya, Kesariya, Apna Bana Le
- Album 1: Aashiqui 2 (3 songs)
- Album 2: Shershaah (2 songs)

**Perfect! ✅**

---

## 🚀 Usage

```bash
# Same steps, just new script name!
node bulk-upload-v2.js my-songs.csv
```

---

## 💡 Quick Tips

### ✅ Album Tip:
Same album name → Grouped together
```csv
Song1,Artist,song1.mp3,cover.jpg,Aashiqui 2,Director,Composer,Lyricist,Label,Hindi
Song2,Artist,song2.mp3,cover.jpg,Aashiqui 2,Director,Composer,Lyricist,Label,Hindi  ← Same name!
```

### ✅ Cover Tip:
Album ke saare songs ka same cover
```csv
Song1,Artist,song1.mp3,album-cover.jpg,Album Name,,,,,Hindi
Song2,Artist,song2.mp3,album-cover.jpg,Album Name,,,,,Hindi  ← Same cover!
```

### ✅ Single Song Tip:
Album name blank chodo
```csv
Song1,Artist,song1.mp3,cover.jpg,,,,,Label,Hindi  ← Blank album_name
```

### ✅ Lyricist Tip:
**Lyricist = Lyrics likha kisne**
```csv
Kesariya,Arijit Singh,kesariya.mp3,cover.jpg,,Pritam,Pritam,Amitabh Bhattacharya,Sony,Hindi
                                                                    ↑
                                                            Lyricist ka naam
```

---

## 📊 Visual Example

```
CSV File:
┌──────────────────────────────────────────────────────────────────┐
│ title    │ singer  │ audio     │ album_name │ lyricist          │
├──────────────────────────────────────────────────────────────────┤
│ Nidiya   │ Vishal  │ song1.mp3 │ (blank)    │ Irshad Kamil      │ → 🎵 Single
│ Kesariya │ Arijit  │ song2.mp3 │ (blank)    │ Amitabh Bhatt...  │ → 🎵 Single
│ Tum Hi Ho│ Arijit  │ song3.mp3 │ Aashiqui 2 │ Mithoon           │ → 📀 Album
│ Sunn Raha│ Ankit   │ song4.mp3 │ Aashiqui 2 │ Sandeep Nath      │ → 📀 Album
│ Bhula De │ Arijit  │ song5.mp3 │ Aashiqui 2 │ Mithoon           │ → 📀 Album
└──────────────────────────────────────────────────────────────────┘

Result:
🎵 Nidiya (Single) - Lyrics by: Irshad Kamil
🎵 Kesariya (Single) - Lyrics by: Amitabh Bhattacharya
📀 Aashiqui 2
   ├── Tum Hi Ho - Lyrics by: Mithoon
   ├── Sunn Raha Hai - Lyrics by: Sandeep Nath
   └── Bhula Dena - Lyrics by: Mithoon
```

---

## ✅ Bas Itna Hi!

**1 Rule:**
- Blank album_name = Single 🎵
- Filled album_name = Album 📀

**Important:**
- `lyricist` = Lyrics writer ka naam (Amitabh Bhattacharya, Irshad Kamil, etc.)

**Done!** 🎉

---

Full guide: **`MIXED-UPLOAD-GUIDE.md`**
Sample: **`songs-mixed-sample.csv`**
