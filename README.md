# 🎵 Stage Music Platform

Professional Music Streaming Platform with Upload Functionality

## ✨ Features

### 🎧 Music Player
- ✅ Professional audio player with full controls
- ✅ Play, pause, next, previous
- ✅ Shuffle and repeat modes
- ✅ Volume control
- ✅ Progress bar with seek functionality
- ✅ Keyboard shortcuts
- ✅ Now Playing display with lyrics
- ✅ Real-time play count tracking

### 📤 Admin Panel
- ✅ Upload songs with metadata
- ✅ Support for all audio formats (MP3, WAV, M4A, AAC, FLAC, OGG, WMA)
- ✅ Drag & drop file upload
- ✅ Upload progress tracking
- ✅ Form fields:
  - Song Title *
  - Singer/Artist *
  - Music Director
  - Composer
  - Record Label/Company
  - Lyrics
  - Cover Image (Album Art)
  - Audio File *

### 🔍 Search & Discovery
- ✅ Search by song title, artist, composer
- ✅ Real-time search results
- ✅ Song library with grid view
- ✅ Statistics dashboard

## 🚀 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. **Install Dependencies**
   ```bash
   cd stage-music-app
   npm install
   ```

2. **Start Server**
   ```bash
   npm start
   ```

3. **Access Application**
   - **Music Player:** http://localhost:3000
   - **Admin Panel:** http://localhost:3000/admin

## 📖 Usage

### Uploading Songs

1. Go to Admin Panel: http://localhost:3000/admin
2. Fill in the song details:
   - Enter song title (required)
   - Enter singer/artist name (required)
   - Optionally add music director, composer, company
   - Add lyrics (highly recommended)
   - Select audio file (required)
3. Click "Upload & Release Song"
4. Song will be live immediately!

### Playing Music

1. Go to Music Player: http://localhost:3000
2. Browse the song library
3. Click on any song to play
4. Use player controls at the bottom
5. View lyrics and song details in the "Now Playing" section

### Keyboard Shortcuts

- **Space:** Play/Pause
- **→:** Next song
- **←:** Previous song
- **↑:** Volume up
- **↓:** Volume down
- **M:** Mute/Unmute
- **S:** Toggle shuffle
- **R:** Toggle repeat

## 📁 Project Structure

```
stage-music-app/
├── public/
│   ├── admin/
│   │   ├── index.html       # Admin upload page
│   │   ├── admin.css        # Admin styles
│   │   └── admin.js         # Admin functionality
│   ├── index.html           # Main music player
│   ├── styles.css           # Player styles
│   └── app.js               # Player functionality
├── uploads/
│   └── songs/               # Uploaded audio files
├── server.js                # Express backend server
├── package.json             # Dependencies
└── stage_music.db           # SQLite database

```

## 🛠️ API Endpoints

- `GET /api/songs` - Get all songs
- `GET /api/songs/:id` - Get single song
- `POST /api/upload` - Upload new song
- `POST /api/songs/:id/play` - Increment play count
- `GET /api/search?q=query` - Search songs
- `DELETE /api/songs/:id` - Delete song
- `GET /api/stats` - Get platform statistics

## 🎨 Tech Stack

### Frontend
- HTML5
- CSS3 (Custom styling with gradients & animations)
- JavaScript (Vanilla JS)
- HTML5 Audio API

### Backend
- Node.js
- Express.js
- Multer (File uploads)
- SQLite3 (Database)
- CORS

## 🌟 Key Features Explained

### Professional UI
- Modern gradient design
- Smooth animations
- Responsive layout
- Dark theme optimized for music listening

### Smart Playback
- Automatic next song
- Shuffle mode
- Repeat mode
- Persistent volume settings

### Upload System
- Multi-format support
- Real-time upload progress
- Drag & drop interface
- Automatic metadata extraction

### Analytics
- Play count tracking
- Total songs counter
- Total plays counter
- Real-time statistics

## 🔒 Security Features

- File type validation
- Server-side validation
- Secure file storage
- CORS enabled

## 📊 Database Schema

```sql
songs (
  id              INTEGER PRIMARY KEY,
  title           TEXT NOT NULL,
  singer          TEXT NOT NULL,
  music_director  TEXT,
  composer        TEXT,
  company         TEXT,
  lyrics          TEXT,
  audio_file      TEXT NOT NULL,
  duration        TEXT,
  plays           INTEGER DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## 🎯 Future Enhancements

- [ ] User authentication & playlists
- [ ] Like/favorite songs
- [ ] Social sharing
- [ ] Audio visualization
- [ ] Mobile app
- [ ] Cloud storage integration
- [ ] Batch upload
- [ ] Audio waveform display

## 💡 Tips

1. **Best Audio Quality:** Upload 320kbps MP3 files for best quality
2. **Add Lyrics:** Songs with lyrics get more engagement
3. **Metadata Matters:** Fill all fields for better discovery
4. **File Naming:** Use descriptive file names for easier management

## 🐛 Troubleshooting

**Songs not playing?**
- Check if audio file path is correct
- Verify file format is supported
- Check browser console for errors

**Upload failing?**
- Ensure file is valid audio format
- Check file size (recommended < 20MB)
- Verify all required fields are filled

**Database errors?**
- Delete `stage_music.db` and restart server
- Database will be recreated automatically

## 📞 Support

For issues or questions, check the server logs in the terminal.

## 📄 License

MIT License - Feel free to use for personal or commercial projects!

---

**Built with 💜 for Stage OTT**

🎵 Making music accessible, one upload at a time!
