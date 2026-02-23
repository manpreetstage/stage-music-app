# 🚀 Stage Music - Quick Reference

## 📊 Current Status
- ✅ Haryanvi: 94 songs
- ✅ Rajasthani: 27 songs  
- ✅ Total: 121 songs | 37 albums

## 🎯 Quick Commands

### Start Server:
```bash
npm start
# Opens at http://localhost:3000
```

### Upload New Songs:
```bash
node bulk-upload-v3.js <folder>/songs.csv <folder>

# Example:
node bulk-upload-v3.js Bhojpuri1/songs.csv Bhojpuri1
```

### Update Song Details:
```bash
node bulk-update-songs.js updated-songs.csv
```

### Update Covers Only:
```bash
node update-covers-only.js songs.csv <folder>

# Example:
node update-covers-only.js RJ1/songs.csv RJ1
```

### Backup Database:
```bash
cp stage_music.db backup_$(date +%Y%m%d).db
```

## 📁 Folder Structure Expected

```
YourFolder/
├── Audio_File/
│   ├── song1.mp3
│   ├── song2.wav
│   └── ...
├── Cover_File/
│   ├── cover01.jpg
│   ├── cover02.jpg
│   └── ...
└── songs.csv
```

## 📋 CSV Format

```csv
Sr No.,Song_Name,Album_Name,Audio_Files,Cover_File,Singer,Lyricist,Music_Director,Composer,Record_Label/Company,Langauage
1,Song Title,,song1.mp3,cover1.jpg,Artist,Lyricist,Director,Composer,Label,Language
2,Album Song,Album Name,song2.mp3,cover2.jpg,Artist,,,,,Language
```

**Notes:**
- Album_Name empty = Single song
- Album_Name filled = Part of album
- Same Album_Name = Grouped together
- Same Cover_File = Shared cover

## 🎵 Next Folders to Upload

- [ ] Bhojpuri1/
- [ ] Gujarati1/
- [ ] Hindi1/
- [ ] Punjabi1/

## ⚠️ Important

- Always backup database before bulk operations
- Test with 2-3 songs first
- Check CSV format is correct
- Ensure audio files exist in Audio_File folder
- Ensure covers exist in Cover_File folder

## 🔧 Troubleshooting

**Upload fails?**
- Check CSV format
- Check file paths
- Check files exist

**Wrong covers?**
- Use: `node update-covers-only.js`

**Need to update details?**
- Use: `node bulk-update-songs.js`

## 📞 Support

Check PROJECT-STATUS.md for detailed documentation.
