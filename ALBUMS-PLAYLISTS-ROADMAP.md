# 🎵 Stage Music - Albums & Playlists Roadmap

## ✅ What's Done:

### **1. Database Structure** ✅
- ✅ `albums` table created
- ✅ `playlists` table created
- ✅ `playlist_songs` junction table created
- ✅ `album_id` column added to songs table

### **2. Current Working Features** ✅
- ✅ Single song upload with cover
- ✅ Creator profile shows all songs
- ✅ Edit own songs
- ✅ Delete own songs
- ✅ Admin full control

---

## 🚧 What Needs Implementation:

### **Feature 1: Album Upload** 🎸

#### **Concept:**
- Upload multiple songs (up to 50) as one album
- Shared cover image for all songs
- Individual details for each song (title, artist, etc.)

#### **Required Changes:**

**1. Upload Page (`/admin/index.html`):**
```
Add Upload Type Selector:
┌────────────────────────────┐
│ Upload Type:               │
│ ○ Single Song             │
│ ○ Album (Multiple Songs)  │
└────────────────────────────┘

If Album Selected:
┌────────────────────────────┐
│ Album Title: [________]   │
│ Album Artist: [________]  │
│ Cover: [Upload Once]      │
│ Language: [Dropdown]      │
│                            │
│ Songs in Album:           │
│ ┌──────────────────────┐ │
│ │ Song 1:              │ │
│ │ Title: [________]    │ │
│ │ Audio: [Upload]      │ │
│ │ Singer: [________]   │ │
│ │ Composer: [________] │ │
│ └──────────────────────┘ │
│ [+ Add Song] (up to 50)  │
│                            │
│ [Upload Album]            │
└────────────────────────────┘
```

**2. Backend (`server.js`):**
- New endpoint: `POST /api/albums`
- Create album record
- Upload shared cover
- Upload multiple audio files
- Link songs to album

**3. Display:**
- Show albums in grid
- Click album → See all songs
- Play album (all songs in sequence)

---

### **Feature 2: User Playlists** 📚

#### **Concept:**
- Any user can create playlists
- Add songs to playlists
- Personal collection
- Public/Private option

#### **Required Changes:**

**1. Main Page - Sidebar:**
```
Add Playlists Section:
┌─────────────────────┐
│ My Playlists        │
│ ┌─────────────────┐│
│ │ ➕ New Playlist ││
│ ├─────────────────┤│
│ │ 🎵 Favorites    ││
│ │ 🎧 Workout      ││
│ │ 💖 Love Songs   ││
│ └─────────────────┘│
└─────────────────────┘
```

**2. Create Playlist Modal:**
```
┌──────────────────────────┐
│ Create New Playlist   ✕ │
├──────────────────────────┤
│ Name: [________]        │
│ Description: [________] │
│ ○ Private ○ Public     │
│                          │
│ [    Create    ]        │
└──────────────────────────┘
```

**3. Add to Playlist:**
```
On Each Song Card:
┌────────────────┐
│ [Song Cover]   │
│ Title          │
│ Artist         │
│ [▶️ Play]      │
│ [➕ Add to...] │ ← New button
└────────────────┘

Click "Add to..." →
┌──────────────────┐
│ Add to Playlist: │
│ ✓ Favorites     │
│ ☐ Workout       │
│ ☐ Love Songs    │
│ ──────────────  │
│ + New Playlist  │
└──────────────────┘
```

**4. Backend APIs Needed:**
```javascript
// Playlist management
POST   /api/playlists          - Create playlist
GET    /api/playlists          - Get user's playlists
GET    /api/playlists/:id      - Get playlist details
PUT    /api/playlists/:id      - Update playlist
DELETE /api/playlists/:id      - Delete playlist

// Playlist songs
POST   /api/playlists/:id/songs/:songId  - Add song
DELETE /api/playlists/:id/songs/:songId  - Remove song
GET    /api/playlists/:id/songs          - Get playlist songs
```

**5. Playlist Page:**
```
/playlist/:id

┌─────────────────────────────┐
│ 🎵 Playlist Name            │
│ Description here            │
│ ────────────────────────    │
│ Songs: 15 • Duration: 1h    │
│                             │
│ [▶️ Play All]  [Edit]  [⋯] │
│                             │
│ ┌─────────────────────────┐│
│ │ 1. Song Title           ││
│ │    Artist • 3:45        ││
│ │    [▶️] [✕]            ││
│ ├─────────────────────────┤│
│ │ 2. Song Title           ││
│ │    Artist • 4:12        ││
│ │    [▶️] [✕]            ││
│ └─────────────────────────┘│
└─────────────────────────────┘
```

---

## 📋 Implementation Priority:

### **Phase 1: Basic Playlist System** (Recommended First)
Easier to implement, more commonly used feature.

**Steps:**
1. Create playlist UI in sidebar
2. Add "Create Playlist" modal
3. Add playlist management APIs
4. Add "Add to Playlist" button on songs
5. Create playlist view page

**Estimated Time:** 4-6 hours

---

### **Phase 2: Album Upload** (More Complex)
Requires significant changes to upload flow.

**Steps:**
1. Add upload type selector
2. Create album upload UI
3. Handle multiple file uploads
4. Create album creation API
5. Display albums in grid
6. Album detail page

**Estimated Time:** 6-8 hours

---

## 🎯 Current Status:

### **Working Now:**
- ✅ YouTube Music-style player
- ✅ Creator system
- ✅ Single song upload
- ✅ Edit/Delete own songs
- ✅ Admin full control
- ✅ Database ready for albums & playlists

### **Next Steps:**
Choose one to implement first:
1. **Playlists** (User-friendly, easier)
2. **Albums** (Content-focused, complex)

---

## 💡 Recommendation:

**Start with Playlists:**
- More valuable for users
- Simpler to implement
- Doesn't require changing upload flow
- Can be added without breaking existing features

**Albums Later:**
- Requires major upload page redesign
- More complex file handling
- Better to implement after playlists working

---

## 📞 Ready to Implement?

**Option 1: Implement Playlists Now**
- I can start building playlist system
- Will take 4-6 hours of development
- Won't affect existing features

**Option 2: Implement Albums Now**
- More complex, takes 6-8 hours
- Requires upload page redesign
- Bigger change to system

**Option 3: Keep Current System**
- Everything working perfectly now
- Can add features later when needed

---

**Current System is Production-Ready!**
- All basic features working ✅
- Can demo to investors ✅
- Can add albums/playlists later ✅

Choose what you want! 🎵
