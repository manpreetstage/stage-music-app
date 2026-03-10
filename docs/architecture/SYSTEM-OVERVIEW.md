# 🏗️ STAGE MUSIC - SYSTEM ARCHITECTURE

**Last Updated**: March 10, 2026

---

## 📊 HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                        USERS                                 │
│                  (Mobile + Desktop Web)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                            │
│  ┌─────────────────┐         ┌──────────────────┐          │
│  │  Mobile App     │         │  Desktop App     │          │
│  │  (mobile.js)    │         │  (app.js)        │          │
│  │  - HLS Player   │         │  - HLS Player    │          │
│  │  - Categories   │         │  - Full Library  │          │
│  │  - Analytics    │         │  - Admin Panel   │          │
│  └─────────────────┘         └──────────────────┘          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS.JS SERVER                          │
│                   (Port 3000)                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes                                          │  │
│  │  - /api/songs                                        │  │
│  │  - /api/categories/:id/songs                        │  │
│  │  - /api/custom-sections/:id/songs                   │  │
│  │  - /api/albums                                       │  │
│  │  - /api/trending                                     │  │
│  │  - /api/search                                       │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE LAYER                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SQLite (stage_music.db)                            │   │
│  │  - songs (500+ records)                             │   │
│  │  - albums                                            │   │
│  │  - categories                                        │   │
│  │  - custom_sections                                   │   │
│  │  - users                                             │   │
│  │  - playlists                                         │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 STORAGE LAYER (AWS S3)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  S3 Bucket: stage-music-files                       │   │
│  │  - /songs/*.m4a (optimized audio)                   │   │
│  │  - /covers/*.webp (images)                          │   │
│  │  - /hls/{song_id}/*.m3u8, *.ts (HLS streams)       │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            BACKGROUND SERVICES (PM2)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  auto-hls-converter.js                              │   │
│  │  - Monitors: songs WHERE has_hls = 0               │   │
│  │  - Converts: FFmpeg → HLS (64k + 128k)            │   │
│  │  - Uploads: S3 /hls/{song_id}/                     │   │
│  │  - Updates: has_hls = 1, hls_master_url            │   │
│  │  - Interval: 60 seconds                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              ANALYTICS (RudderStack → Amplitude)             │
│  - 49 tracked events                                         │
│  - User behavior tracking                                    │
│  - Listening milestones                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 CORE COMPONENTS

### 1. Frontend Apps

#### Mobile App (`/public/mobile/`)
```
mobile/
├── index.html          # Main HTML
├── mobile.js           # Main JavaScript (2800+ lines)
├── mobile.css          # Styles (2400+ lines)
├── back-navigation.js  # WebView back button handler
└── sw.js               # Service Worker (offline support)
```

**Key Features:**
- HLS.js adaptive streaming
- Category navigation
- Search functionality
- Playlist management
- RudderStack analytics
- WebView optimized

#### Desktop App (`/public/`)
```
public/
├── index.html          # Main HTML
├── app.js              # Main JavaScript
├── styles.css          # Styles
└── js/
    ├── tracker.js      # Analytics tracker
    ├── simple-tracker.js  # RudderStack integration
    └── rudderstack-init.js  # RS configuration
```

---

### 2. Backend Server (`server.js`)

**Tech Stack:**
- Express.js
- SQLite3
- AWS SDK
- Session management
- CORS enabled

**Key Routes:**

```javascript
// Songs
GET  /api/songs?limit=30&offset=0    // Paginated songs
GET  /api/songs/:id                  // Single song
POST /api/songs/:id/play             // Track play

// Categories
GET  /api/categories                 // All categories
GET  /api/categories/:id/songs       // Songs by category

// Custom Sections
GET  /api/custom-sections            // All sections
GET  /api/custom-sections/:id/songs  // Songs by section

// Albums
GET  /api/albums                     // All albums
GET  /api/albums/:id                 // Album details

// Search & Trending
GET  /api/search?q=query             // Search songs
GET  /api/trending                   // Trending songs
GET  /api/quick-picks                // Quick picks (top 9)

// User Features
POST /api/playlists                  // Create playlist
GET  /api/playlists                  // User playlists
POST /api/playlists/:id/songs        // Add song to playlist
```

---

### 3. Database Schema (`stage_music.db`)

**Main Tables:**

```sql
-- Songs table (500+ records)
CREATE TABLE songs (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    singer TEXT,
    audio_file TEXT,
    cover_image TEXT,
    cover_thumb TEXT,           -- 150x150
    cover_mobile TEXT,          -- 500x500
    cover_desktop TEXT,         -- 1000x1000
    audio_file_128 TEXT,        -- 128kbps optimized
    audio_file_256 TEXT,        -- 256kbps optimized
    hls_master_url TEXT,        -- HLS master playlist
    has_hls INTEGER DEFAULT 0,  -- HLS available flag
    language TEXT,              -- Haryanvi, Rajasthani, Bhojpuri
    album_id INTEGER,
    plays INTEGER DEFAULT 0,
    created_at DATETIME,
    FOREIGN KEY (album_id) REFERENCES albums(id)
);

-- Albums
CREATE TABLE albums (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    cover_image TEXT,
    artist TEXT,
    created_at DATETIME
);

-- Categories
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    display_order INTEGER
);

-- Custom Sections (Music Collection)
CREATE TABLE custom_sections (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    cover_image TEXT,
    display_order INTEGER
);

-- Category Songs (many-to-many)
CREATE TABLE category_songs (
    id INTEGER PRIMARY KEY,
    category_id INTEGER,
    song_id INTEGER,
    position INTEGER,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (song_id) REFERENCES songs(id)
);

-- Section Songs (many-to-many)
CREATE TABLE section_songs (
    id INTEGER PRIMARY KEY,
    section_id INTEGER,
    song_id INTEGER,
    position INTEGER,
    FOREIGN KEY (section_id) REFERENCES custom_sections(id),
    FOREIGN KEY (song_id) REFERENCES songs(id)
);
```

---

### 4. HLS Streaming System

**Workflow:**

```
1. Song Upload → S3 (/songs/original.wav)
2. Database Insert → has_hls = 0
3. Auto-Converter Detects (every 60s)
4. FFmpeg Conversion:
   ├── 64kbps variant  (segments_64k/*.ts)
   ├── 128kbps variant (segments_128k/*.ts)
   └── Master playlist (master.m3u8)
5. Upload to S3 → /hls/{song_id}/
6. Database Update → has_hls = 1, hls_master_url = URL
7. Frontend Detection → HLS.js player or fallback
```

**HLS Structure on S3:**
```
s3://stage-music-files/hls/{song_id}/
├── master.m3u8              # Master playlist
├── quality_64k.m3u8         # 64kbps variant playlist
├── quality_128k.m3u8        # 128kbps variant playlist
├── segments_64k/
│   ├── segment_000.ts
│   ├── segment_001.ts
│   └── ...
└── segments_128k/
    ├── segment_000.ts
    ├── segment_001.ts
    └── ...
```

**HLS.js Configuration:**
```javascript
const hls = new Hls({
    debug: false,
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 30,      // 30 seconds buffer
    maxBufferLength: 30,
    maxMaxBufferLength: 60,
    maxBufferSize: 60 * 1000 * 1000  // 60MB max
});
```

---

### 5. Auto HLS Converter

**File:** `auto-hls-converter.js`
**Process:** Background service (PM2 managed)
**Interval:** 60 seconds

**Logic:**
```javascript
setInterval(async () => {
    // 1. Find songs needing HLS
    const songs = db.all('SELECT * FROM songs WHERE has_hls = 0 LIMIT 1');

    // 2. For each song:
    for (const song of songs) {
        // Download from S3
        const audioFile = await downloadFromS3(song.audio_file);

        // Convert with FFmpeg
        await convertToHLS(audioFile, song.id);

        // Upload to S3
        await uploadToS3(`hls/${song.id}`, files);

        // Update database
        db.run('UPDATE songs SET has_hls = 1, hls_master_url = ? WHERE id = ?',
               [masterUrl, song.id]);
    }
}, 60000);
```

**PM2 Configuration:**
```javascript
// ecosystem.config.js
{
    name: 'auto-hls-converter',
    script: './auto-hls-converter.js',
    instances: 1,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '30s'
}
```

---

### 6. Analytics System

**RudderStack → Amplitude**

**Tracked Events (49 total):**
```javascript
// Page Views
- Home Page Viewed
- Mobile App Opened

// Music Collection
- Music Collection Section Viewed
- Custom Section Clicked

// Regional Hits
- Regional Hits Section Viewed
- Regional Hits Category Clicked (Haryanvi/Rajasthani/Bhojpuri)

// Playback
- Song Played
- Song Paused
- Song Ended
- Next Song
- Previous Song

// Listening Milestones
- Song Listened 30 Seconds
- Song Listened 1 Minute
- Song Listened 2 Minutes
- Song Listened 3 Minutes

// Trending
- Trending Section Viewed
- Trending Song Clicked

// Search
- Search Performed
- Search Result Clicked

// User Actions
- Playlist Created
- Song Added to Playlist
```

**Implementation:**
```javascript
// public/js/simple-tracker.js
window.tracker = {
    trackEvent(eventName, properties) {
        if (window.rudderanalytics) {
            rudderanalytics.track(eventName, properties);
        }
    }
};

// Usage
window.tracker.trackEvent('Song Played', {
    song_id: 123,
    song_title: 'Do Lugai',
    artist: 'Rajesh Singhpuria'
});
```

---

## 🔒 SECURITY

### 1. Environment Variables (`.env`)
```bash
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
S3_BUCKET=stage-music-files
SESSION_SECRET=...
PORT=3000
```

### 2. Ignored Files (`.gitignore`)
```
.env
stage_music.db
stage-music-key.pem
node_modules/
temp_hls_*/
*.log
```

### 3. S3 CORS Configuration
```json
{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
}
```

---

## 📈 PERFORMANCE OPTIMIZATIONS

### 1. Frontend
- Lazy loading images (Intersection Observer ready)
- Smart initial load (30 songs first)
- API pagination support
- Loading screens
- HLS adaptive streaming
- Service Worker caching

### 2. Backend
- Database connection pooling
- S3 CDN delivery
- Optimized queries with indexes
- Response compression

### 3. HLS Streaming
- 4-second segments (fast startup)
- 2 quality levels (adaptive)
- Pre-transcoded (no on-demand conversion)
- CDN-friendly (long cache times)

---

## 🔄 DATA FLOW EXAMPLES

### Example 1: Playing a Song
```
1. User clicks song
2. Frontend: playSong(songId)
3. Check: song.has_hls?
   YES → Load HLS.js player → stream from S3/hls/
   NO  → Load HTML5 audio → stream from S3/songs/
4. Track: POST /api/songs/:id/play
5. Analytics: trackEvent('Song Played')
6. Update: UI (mini player, full player)
```

### Example 2: Viewing Regional Category
```
1. User clicks "Haryanvi"
2. Frontend: viewLanguageCategory('Haryanvi')
3. API Call: GET /api/categories/7/songs
4. Server: Query category_songs JOIN songs
5. Response: [{song1}, {song2}, ...]
6. Frontend: showCategoryView(songs)
7. Analytics: trackEvent('Regional Hits Category Clicked')
```

### Example 3: Auto HLS Conversion
```
1. New song uploaded to S3
2. Admin adds to database (has_hls = 0)
3. Auto-converter detects (next 60s check)
4. Download → Convert → Upload → Update DB
5. Song now has HLS (has_hls = 1)
6. Frontend automatically uses HLS next play
```

---

## 🌐 DEPLOYMENT INFRASTRUCTURE

### Server Details
```
Provider: AWS EC2
Instance: t2.micro (1 vCPU, 1GB RAM)
OS: Ubuntu 20.04 LTS
Region: ap-south-1 (Mumbai)
Public IP: 3.111.168.236
Domain: 3-111-168-236.nip.io (wildcard SSL)
```

### File Structure on Server
```
/var/www/stage-music-app/
├── server.js
├── auto-hls-converter.js
├── ecosystem.config.js
├── stage_music.db
├── .env
├── package.json
├── node_modules/
├── public/
│   ├── index.html
│   ├── app.js
│   ├── mobile/
│   │   ├── index.html
│   │   ├── mobile.js
│   │   └── mobile.css
│   └── js/
│       └── tracker files
├── logs/
│   ├── server-out.log
│   ├── server-error.log
│   ├── hls-converter-out.log
│   └── hls-converter-error.log
└── migrations/
    └── add-hls-columns.js
```

---

**For deployment procedures, see: `../deployment/DEPLOYMENT-GUIDE.md`**
**For API details, see: `../api/API-ENDPOINTS.md`**
**For troubleshooting, see: `../troubleshooting/COMMON-ISSUES.md`**
