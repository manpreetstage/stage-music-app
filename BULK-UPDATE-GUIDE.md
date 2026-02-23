# 🔄 Bulk Update Songs Guide

Agar aapne pehle songs upload kar diye hain aur ab unki details change karni hain (name, singer, composer, etc.), to yeh script automatically sab update kar dega!

## ✨ Features

- ✅ **Automatic Song Matching** - Title ya audio file name se automatically song dhundh leta hai
- ✅ **Bulk Updates** - Ek saath 100s songs update kar sakte ho
- ✅ **Smart Updates** - Sirf wo fields update karta hai jo change hui hain
- ✅ **Album Support** - Album naam dene se automatically album link ho jata hai
- ✅ **Cover Update** - Nayi cover image bhi update kar sakta hai
- ✅ **Detailed Logs** - Har update ka detail dikhaata hai

## 📋 CSV Format

CSV file mein yeh columns ho sakte hain (koi bhi naam use kar sakte ho):

### Required:
- **Song_Name** / Title - Song ka naam (yeh zaroori hai matching ke liye)

### Optional (jo update karna ho):
- **Singer** / Artist - Gaane wala ka naam
- **Music_Director** - Music director
- **Composer** - Composer
- **Lyricist** / Lyrics - Lyricist ka naam
- **Language** / Langauage - Language (Haryanvi, Hindi, etc.)
- **Company** / Record_Label/Company - Company naam
- **Album_Name** / Album - Album naam
- **Cover_File** - Nayi cover image (agar update karni ho)

## 🚀 Usage

### Method 1: Sirf Details Update (No Files)

Agar sirf song ki information update karni hai (cover nahi):

```bash
node bulk-update-songs.js songs-update.csv
```

### Method 2: Details + Cover Update

Agar cover images bhi update karni hain:

```bash
node bulk-update-songs.js ./Haryanvi1/updated-songs.csv ./Haryanvi1
```

## 📝 Example CSV Files

### Example 1: Basic Details Update

```csv
Song_Name,Singer,Music_Director,Composer,Lyricist,Language
Desi Desi Na Bolya Kar,Raju Punjabi,VR Bros,Vicky Kajla,Mukesh Jaji,Haryanvi
Solid Body,Pardeep Boora,VR Bros,Vicky Kajla,Mukesh Jaji,Haryanvi
Yaariyan,Raju Punjabi,VR Bros,Vicky Kajla,Mukesh Jaji,Haryanvi
```

### Example 2: With Album

```csv
Song_Name,Singer,Album_Name,Language,Company
Desi Desi Na Bolya Kar,Raju Punjabi,Haryanvi Hits Vol 1,Haryanvi,Sonotek
Solid Body,Pardeep Boora,Haryanvi Hits Vol 1,Haryanvi,Sonotek
```

### Example 3: Cover Update

```csv
Song_Name,Singer,Cover_File
Desi Desi Na Bolya Kar,Raju Punjabi,new-cover1.jpg
Solid Body,Pardeep Boora,new-cover2.jpg
```

## 🎯 How It Works

1. **Song Matching:**
   - Pehle exact song name se match karta hai
   - Agar nahi mila, to audio file name se match karta hai
   - Case-insensitive matching (DESI = desi = Desi)

2. **Smart Updates:**
   - Sirf wo fields update karta hai jo CSV mein hain
   - Jo fields empty hain, wo update nahi hote
   - Pehle check karta hai ki value change hui hai ya nahi

3. **Album Handling:**
   - Agar Album_Name diya hai:
     - Pehle dekha jayega album exist karta hai ya nahi
     - Agar nahi hai to naya album bana dega
     - Song ko automatically album se link kar dega

4. **Cover Update:**
   - Agar Cover_File diya hai aur file exist karti hai:
     - S3 pe upload kar dega
     - Database mein URL update kar dega

## 📊 Output Example

```
🔄 BULK UPDATE SONGS FROM CSV
============================================================
📄 CSV File: ./songs-update.csv
📁 Base Folder: .
============================================================

📋 Found 3 rows in CSV

[1/3] Processing: Desi Desi Na Bolya Kar
   ✓ Found song (ID: 45)
   🎤 Artist: "Raj Mawar" → "Raju Punjabi"
   🎼 Music Director: "" → "VR Bros"
   🎹 Composer: "" → "Vicky Kajla"
   ✅ Updated successfully

[2/3] Processing: Solid Body
   ✓ Found song (ID: 46)
   ℹ️  No changes needed

[3/3] Processing: Yaariyan
   ❌ Song not found in database

============================================================
📊 UPDATE SUMMARY
============================================================
✅ Updated: 1
❌ Not Found: 1
⚠️  Errors: 0
📝 Total Processed: 3
============================================================
```

## ⚠️ Important Notes

1. **Backup First:**
   - Update karne se pehle database ka backup le lo
   - Original files delete mat karna

2. **Song Names:**
   - Exact naam likhna zaroori nahi hai
   - Case matter nahi karta (DESI = desi)
   - But spelling same honi chahiye

3. **Not Found Songs:**
   - Jo songs nahi mile, unko manually check karo
   - Spelling mistake ho sakta hai

4. **Test First:**
   - Pehle 2-3 songs ke saath test kar lo
   - Sab theek hai to baaki songs update karo

## 🔍 Troubleshooting

### Song Not Found?
- Spelling check karo
- Database mein exact kya naam hai wo dekho
- Audio file ka naam CSV mein try karo

### No Changes?
- CSV mein jo value hai wo already database mein same hai
- Koi new information nahi hai update karne ke liye

### Error During Update?
- File permissions check karo
- Database locked to nahi hai
- CSV format correct hai ya nahi

## 💡 Tips

1. **Partial Updates:**
   - Sirf wo columns rakho jo update karne hain
   - Baaki columns CSV se hata sakte ho

2. **Multiple Updates:**
   - Same CSV multiple times run kar sakte ho
   - Duplicate updates nahi honge

3. **Gradual Updates:**
   - Sabhi songs ek saath update karna zaroori nahi
   - Thode thode kar sakte ho

## 🎉 Example Workflow

```bash
# Step 1: Pehle upload kiya
node bulk-upload-v3.js Haryanvi1/songs.csv Haryanvi1

# Step 2: Baad mein details galat lag rahi thi
# Nayi CSV banayi updated details ke saath
node bulk-update-songs.js updated-songs.csv

# Done! Songs update ho gayi 🎵
```

## 📞 Support

Agar koi problem hai to:
1. Error message dekho
2. CSV format check karo
3. Database mein song exist karta hai ya nahi check karo
