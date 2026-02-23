# 📤 GitHub Manual Upload Guide

## Required Files to Upload

Upload these files/folders to your GitHub repo:

### Essential Files (MUST UPLOAD):
```
✅ package.json
✅ package-lock.json
✅ server.js
✅ vercel.json
✅ railway.json
✅ Procfile
✅ .gitignore
✅ stage_music.db
```

### Essential Folders (MUST UPLOAD):
```
✅ public/ (complete folder with all files)
   - index.html
   - styles.css
   - app.js
   - admin/ (subfolder)
   - assets/ (subfolder)
   etc.
```

### Optional (can skip for now):
```
⚠️ node_modules/ - DON'T UPLOAD (too large, auto-generated)
⚠️ uploads/ - DON'T UPLOAD (files already on S3)
⚠️ bulk-songs/ - DON'T UPLOAD (local backup only)
⚠️ bulk-covers/ - DON'T UPLOAD (local backup only)
⚠️ Haryanvi1/ - DON'T UPLOAD (local backup only)
⚠️ RJ1/ - DON'T UPLOAD (local backup only)
```

## How to Upload

### Method 1: GitHub Web Interface

1. Go to your repo: `https://github.com/YOUR_USERNAME/stage-music-app`
2. Click **"Add file"** → **"Upload files"**
3. Drag and drop files from Finder:
   - Open Finder → Go to `/Users/manpreetsingh/Thinking/stage-music-app`
   - Select essential files (listed above)
   - Drag to GitHub upload page
4. Click **"Commit changes"**

⚠️ **Problem**: GitHub web upload has file size limits and can't handle too many files at once.

### Method 2: Git Push (BEST)

Much faster and handles all files properly:

```bash
cd /Users/manpreetsingh/Thinking/stage-music-app
git remote add origin https://github.com/YOUR_USERNAME/stage-music-app.git
git push -u origin main
```

## Minimum Files Needed for Vercel

If you want to upload minimum files just to get started:

1. **package.json**
2. **server.js**
3. **vercel.json**
4. **public/** folder (complete)
5. **stage_music.db**

These 5 items will make your app work on Vercel (with S3 for songs).
