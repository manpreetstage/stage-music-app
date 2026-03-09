# Event Tracking - Deployment Checklist

## ✅ Completed (Local Development)

1. **Database Schema** - Events table created in server.js
   - ✅ Events table with all fields
   - ✅ Indexes for performance (event_name, user_id, session_id)

2. **Server Endpoints** - Added to server.js
   - ✅ `POST /api/events` - Receives and stores event batches
   - ✅ `GET /api/analytics/overview` - Admin analytics dashboard

3. **Client Tracker** - tracker.js created
   - ✅ EventTracker class with queuing
   - ✅ Batch sending (5s interval or 20 events)
   - ✅ Device fingerprinting
   - ✅ Convenience methods (trackSongPlay, trackSearch, etc.)

4. **Documentation** - EVENT_TRACKING.md created
   - ✅ Complete architecture overview
   - ✅ 80+ event definitions across 11 categories
   - ✅ Integration code examples
   - ✅ Testing and troubleshooting guides

---

## 🚀 Deployment Steps (To Do)

### Step 1: Deploy Server Changes

```bash
cd /Users/manpreetsingh/Thinking/stage-music-app

# Deploy updated server.js
scp server.js root@69.49.243.142:/root/stage-music-app/

# SSH into server
ssh root@69.49.243.142

# Restart server to create events table
cd /root/stage-music-app
pm2 restart stage-music

# Verify events table was created
sqlite3 database.db "SELECT name FROM sqlite_master WHERE type='table' AND name='events';"

# Should output: events

# Exit SSH
exit
```

### Step 2: Deploy Tracker Script

```bash
# Deploy tracker.js
scp public/js/tracker.js root@69.49.243.142:/root/stage-music-app/public/js/

# Verify file exists
ssh root@69.49.243.142 "ls -lh /root/stage-music-app/public/js/tracker.js"
```

### Step 3: Update HTML Files

Add tracker script to **3 HTML files**:

#### 3.1 Mobile App (`public/mobile/index.html`)

Add before closing `</head>` tag (around line 28):

```html
    <!-- Event Tracking -->
    <script src="/js/tracker.js"></script>
</head>
```

#### 3.2 Desktop App (`public/index.html`)

Add before closing `</head>` tag:

```html
    <!-- Event Tracking -->
    <script src="/js/tracker.js"></script>
</head>
```

#### 3.3 Admin Panel (`public/admin/sections.html`)

Add before closing `</head>` tag:

```html
    <!-- Event Tracking -->
    <script src="/js/tracker.js"></script>
</head>
```

Then deploy:

```bash
scp public/mobile/index.html root@69.49.243.142:/root/stage-music-app/public/mobile/
scp public/index.html root@69.49.243.142:/root/stage-music-app/public/
scp public/admin/sections.html root@69.49.243.142:/root/stage-music-app/public/admin/
```

### Step 4: Test Basic Tracking

1. Open browser to: https://stage.nip.io/mobile
2. Open DevTools Console
3. Type: `console.log(window.tracker)`
4. Should see: `EventTracker { sessionId: "...", deviceId: "...", ... }`
5. Test manual event: `window.tracker.track('test_event', { test: true })`
6. Check Network tab for POST to `/api/events` after 5 seconds
7. Verify in database:

```bash
ssh root@69.49.243.142
sqlite3 /root/stage-music-app/database.db "SELECT event_name, timestamp, properties FROM events ORDER BY created_at DESC LIMIT 5;"
```

---

## 🎯 Integration Tasks (Phase 2)

After deployment and basic testing, integrate tracking calls:

### Mobile App Integration

**File**: `public/mobile/mobile.js`

1. **Song Playback** - Add to `playSong()` function:
```javascript
if (window.tracker) {
    window.tracker.trackSongPlay(song, currentPlaySource, currentPlayPosition);
}
```

2. **Song Pause/Complete** - Add event listeners:
```javascript
audioPlayer.addEventListener('pause', () => {
    if (currentSong && window.tracker) {
        window.tracker.trackSongPause(currentSong, audioPlayer.currentTime, audioPlayer.duration);
    }
});

audioPlayer.addEventListener('ended', () => {
    if (currentSong && window.tracker) {
        window.tracker.trackSongComplete(currentSong);
    }
});
```

3. **Search** - Add to `performSearch()`:
```javascript
if (window.tracker) {
    window.tracker.trackSearch(query, results.length);
}
```

4. **Screen Navigation** - Add to `switchPage()`:
```javascript
if (window.tracker) {
    window.tracker.track('screen_view', {
        screen_name: page,
        previous_screen: currentPage
    });
}
```

5. **Section Views** - Add to `viewCategory()`:
```javascript
if (window.tracker) {
    window.tracker.track('section_view', {
        section_id: sectionId,
        section_name: section.name,
        language: section.language
    });
}
```

6. **Authentication** - Add to login/signup/logout functions

7. **Playlist Operations** - Add to create/edit/delete/add/remove functions

### Desktop App Integration

**File**: `public/script.js`

Similar integration as mobile:
- Track song plays, pauses, completions
- Track search queries
- Track playlist operations
- Track authentication events

### Admin Panel Integration

**File**: `public/admin/sections.js`

Track admin actions:
- Song uploads
- Album edits
- Section management
- Featured song updates

**See EVENT_TRACKING.md for complete code examples**

---

## 📊 Analytics Dashboard (Phase 3)

Create admin analytics page at `/admin/analytics.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Analytics Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <h1>📊 Analytics Dashboard</h1>

    <div class="stats-grid">
        <div class="stat-card">
            <h3>Total Events</h3>
            <div id="total-events">Loading...</div>
        </div>
        <div class="stat-card">
            <h3>Unique Users</h3>
            <div id="unique-users">Loading...</div>
        </div>
        <div class="stat-card">
            <h3>Sessions</h3>
            <div id="unique-sessions">Loading...</div>
        </div>
    </div>

    <canvas id="top-events-chart"></canvas>

    <script>
        async function loadAnalytics() {
            const res = await fetch('/api/analytics/overview?limit=100');
            const data = await res.json();

            document.getElementById('total-events').textContent = data.totalEvents;
            document.getElementById('unique-users').textContent = data.uniqueUsers;
            document.getElementById('unique-sessions').textContent = data.uniqueSessions;

            // Render chart
            new Chart(document.getElementById('top-events-chart'), {
                type: 'bar',
                data: {
                    labels: data.topEvents.map(e => e.event_name),
                    datasets: [{
                        label: 'Event Count',
                        data: data.topEvents.map(e => e.count)
                    }]
                }
            });
        }

        loadAnalytics();
    </script>
</body>
</html>
```

---

## ✅ Testing Checklist

- [ ] Events table created in production database
- [ ] tracker.js loads on all pages (mobile/desktop/admin)
- [ ] `window.tracker` is available in console
- [ ] Manual test event appears in database
- [ ] Automatic session_start event fires on page load
- [ ] Song play events tracked correctly
- [ ] Search events tracked correctly
- [ ] Screen view events tracked correctly
- [ ] Events flush every 5 seconds
- [ ] Events flush on page unload
- [ ] Admin analytics endpoint works
- [ ] No console errors

---

## 🔍 Monitoring Commands

### Check recent events
```bash
ssh root@69.49.243.142
cd /root/stage-music-app
sqlite3 database.db "SELECT event_name, COUNT(*) FROM events GROUP BY event_name ORDER BY COUNT(*) DESC;"
```

### Check events by user
```bash
sqlite3 database.db "SELECT user_id, COUNT(*) as event_count FROM events WHERE user_id IS NOT NULL GROUP BY user_id ORDER BY event_count DESC LIMIT 10;"
```

### Check today's events
```bash
sqlite3 database.db "SELECT COUNT(*) FROM events WHERE DATE(timestamp) = DATE('now');"
```

### Most played songs
```bash
sqlite3 database.db "SELECT properties->>'$.song_title' as title, COUNT(*) as plays FROM events WHERE event_name = 'song_play' GROUP BY title ORDER BY plays DESC LIMIT 10;"
```

---

## 🎯 Current Status

**✅ Ready to Deploy**

All code is written and tested locally. Just needs:
1. Server deployment (server.js)
2. Tracker deployment (tracker.js)
3. HTML updates (add script tag)
4. Integration code (add tracking calls to JS files)

Once deployed, basic tracking will work automatically:
- Session tracking
- Screen views
- Device fingerprinting

Then add specific event tracking calls for:
- Song plays
- Search
- Playlists
- Authentication
- Admin actions

---

**Total Implementation Time**: 2-3 hours for full integration
