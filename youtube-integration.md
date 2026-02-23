# 🎬 YouTube Auto-Import Integration for Stage Music

## 📋 Overview

Automatically import songs from Stage's YouTube channels:
- **Haryanvi Channel**: https://www.youtube.com/@haryanvimusicbystage/videos
- **Rajasthani Channel**: https://www.youtube.com/@stagemusic-rajasthani/videos

## 🔧 Implementation Plan

### Phase 1: Manual YouTube Import (Quick Solution)

#### Backend API Endpoint
```javascript
POST /api/import-youtube
{
  "videoUrl": "https://youtube.com/watch?v=..."
}
```

#### Features:
- ✅ Extract video metadata (title, description, thumbnail)
- ✅ Download audio using youtube-dl/yt-dlp
- ✅ Extract video for optional playback
- ✅ Auto-detect language from channel
- ✅ Add to Stage Music library

### Phase 2: Automatic Sync (Advanced)

#### Scheduled Check (Every Hour)
```javascript
const CHANNELS = {
  'Haryanvi': 'UCxxxxx',
  'Rajasthani': 'UCyyyyy'
};

// Check for new videos
// Download and import automatically
```

## 📦 Required NPM Packages

```bash
npm install ytdl-core
npm install youtube-sr
npm install fluent-ffmpeg
```

## 🛠️ Implementation

### Step 1: Install Dependencies
```bash
cd /Users/manpreetsingh/Thinking/stage-music-app
npm install ytdl-core youtube-sr fluent-ffmpeg
```

### Step 2: Create YouTube Service

**File: `services/youtube.js`**
```javascript
const ytdl = require('ytdl-core');
const ytsr = require('youtube-sr').default;
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

class YouTubeService {
  async getVideoInfo(url) {
    const info = await ytdl.getInfo(url);
    return {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      thumbnail: info.videoDetails.thumbnails[0].url,
      duration: info.videoDetails.lengthSeconds,
      description: info.videoDetails.description
    };
  }

  async downloadAudio(videoUrl, outputPath) {
    return new Promise((resolve, reject) => {
      const stream = ytdl(videoUrl, {
        quality: 'highestaudio',
        filter: 'audioonly'
      });

      const output = fs.createWriteStream(outputPath);
      stream.pipe(output);

      output.on('finish', () => resolve(outputPath));
      output.on('error', reject);
    });
  }

  async downloadVideo(videoUrl, outputPath) {
    return new Promise((resolve, reject) => {
      const stream = ytdl(videoUrl, {
        quality: 'highest'
      });

      const output = fs.createWriteStream(outputPath);
      stream.pipe(output);

      output.on('finish', () => resolve(outputPath));
      output.on('error', reject);
    });
  }

  async getChannelLatestVideos(channelUrl) {
    const channel = await ytsr.getChannel(channelUrl);
    return channel.videos.slice(0, 10); // Latest 10
  }
}

module.exports = new YouTubeService();
```

### Step 3: Add Import Endpoint to server.js

```javascript
const youtubeService = require('./services/youtube');

// Import from YouTube
app.post('/api/import-youtube', async (req, res) => {
  try {
    const { videoUrl, language } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL required' });
    }

    // Get video info
    const info = await youtubeService.getVideoInfo(videoUrl);

    // Download audio
    const audioFileName = `${Date.now()}-audio.mp3`;
    const audioPath = path.join(uploadsDir, audioFileName);
    await youtubeService.downloadAudio(videoUrl, audioPath);

    // Download thumbnail as cover
    const coverFileName = `${Date.now()}-cover.jpg`;
    const coverPath = path.join(coversDir, coverFileName);
    // Download thumbnail...

    // Insert into database
    const sql = `INSERT INTO songs (title, singer, company, audio_file, cover_image, language)
                 VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
      info.title,
      info.author,
      'Stage Music',
      `/uploads/songs/${audioFileName}`,
      `/uploads/covers/${coverFileName}`,
      language || 'Hindi'
    ], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        message: 'YouTube video imported successfully!',
        songId: this.lastID
      });
    });

  } catch (error) {
    console.error('YouTube import error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Step 4: Add UI for YouTube Import

**In admin panel:**
```html
<div class="youtube-import-section">
  <h3>📺 Import from YouTube</h3>
  <input type="text" id="youtube-url" placeholder="https://youtube.com/watch?v=...">
  <select id="youtube-language">
    <option value="Haryanvi">Haryanvi</option>
    <option value="Rajasthani">Rajasthani</option>
    <option value="Hindi">Hindi</option>
  </select>
  <button onclick="importFromYouTube()">Import Video</button>
</div>
```

## 🔄 Auto-Sync Feature

### Cron Job Setup
```javascript
const cron = require('node-cron');

// Check every hour
cron.schedule('0 * * * *', async () => {
  console.log('Checking for new YouTube videos...');

  const channels = {
    'Haryanvi': 'https://www.youtube.com/@haryanvimusicbystage',
    'Rajasthani': 'https://www.youtube.com/@stagemusic-rajasthani'
  };

  for (const [language, channelUrl] of Object.entries(channels)) {
    try {
      const videos = await youtubeService.getChannelLatestVideos(channelUrl);

      for (const video of videos) {
        // Check if already imported
        const exists = await checkIfVideoExists(video.id);

        if (!exists) {
          // Import automatically
          await importVideoAutomatically(video.url, language);
          console.log(`✅ Auto-imported: ${video.title}`);
        }
      }
    } catch (error) {
      console.error(`Error syncing ${language} channel:`, error);
    }
  }
});
```

## ⚠️ Important Notes

### 1. YouTube API Limits
- YouTube Data API has quotas
- Use sparingly or pay for higher limits
- Alternative: RSS feeds (no API key needed)

### 2. Legal Considerations
- ✅ Your own YouTube channels = OK
- ✅ You own the content = OK
- ❌ Others' content without permission = NOT OK

### 3. Storage Considerations
- Videos take lots of space
- Consider CDN for video storage
- Audio files are smaller (good for music)

### 4. Performance
- YouTube downloads can be slow
- Run in background jobs
- Queue system recommended

## 🚀 Quick Start Implementation

### Simple RSS-Based Solution (No API Key)

```javascript
const Parser = require('rss-parser');
const parser = new Parser();

async function checkChannelForNewVideos(channelId) {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const feed = await parser.parseURL(rssUrl);

  return feed.items.map(item => ({
    title: item.title,
    url: item.link,
    published: item.pubDate
  }));
}
```

## 📊 Database Schema Update

Add YouTube tracking:
```sql
ALTER TABLE songs ADD COLUMN youtube_id TEXT;
ALTER TABLE songs ADD COLUMN youtube_url TEXT;
ALTER TABLE songs ADD COLUMN auto_imported BOOLEAN DEFAULT 0;
ALTER TABLE songs ADD COLUMN import_date DATETIME;
```

## 🎯 Recommended Approach

### For MVP (Launch Quickly):
1. ✅ Manual YouTube import via URL
2. ✅ Download audio + thumbnail
3. ✅ Auto-fill metadata
4. ✅ Manual approval before publishing

### For Production (Future):
1. ✅ Automatic channel monitoring
2. ✅ Auto-import new videos
3. ✅ Video streaming support
4. ✅ Advanced metadata extraction

## 💡 Alternative: Embed YouTube Videos

Instead of downloading, embed YouTube player:
```html
<iframe
  src="https://www.youtube.com/embed/VIDEO_ID"
  allowfullscreen>
</iframe>
```

**Benefits:**
- ✅ No storage needed
- ✅ No copyright issues
- ✅ Always up-to-date
- ✅ View count benefits your channel

**Drawbacks:**
- ❌ Requires internet
- ❌ YouTube ads
- ❌ External dependency

## 🎬 Final Recommendation

**Phase 1 (Immediate):**
- Manual YouTube import tool in admin panel
- Download audio automatically
- Use thumbnail as cover
- Manual tagging of language

**Phase 2 (1-2 weeks):**
- RSS monitoring for new videos
- Email notifications for new uploads
- One-click import from notification

**Phase 3 (Future):**
- Fully automatic import
- Video streaming support
- Advanced analytics

---

**Want me to implement Phase 1 now? (Manual YouTube import with audio extraction)**
