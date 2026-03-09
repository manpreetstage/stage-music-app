# RudderStack Setup - stage-webapp Pattern

## ✅ Implementation Complete

Maine stage-webapp ke exact pattern ko follow karke RudderStack implement kiya hai.

---

## 🎯 Key Differences from Previous Implementation

### stage-webapp Pattern:
1. ✅ **RudderStack buffer script** - Events queue before SDK loads
2. ✅ **Dynamic SDK loading** - CDN se load hota hai
3. ✅ **deviceId as anonymousId** - Consistent user tracking
4. ✅ **Platform suffix in event names** - `event_name_web` format
5. ✅ **Comprehensive properties** - All events mein auto-add
6. ✅ **Cookie-based deviceId** - 365 days persistence

### Previous Implementation:
- ❌ Simple initialization
- ❌ No buffer script
- ❌ Manual SDK snippet

---

## 📁 Files Created

### 1. `/public/js/rudderstack-init.js`
**Purpose**: RudderStack buffer initialization
**Loads**: BEFORE SDK loads
**Features**:
- Creates event queue
- Generates deviceId cookie
- Saves initial landing URL
- Creates stub methods

### 2. `/public/js/tracker.js`
**Purpose**: Main tracker with SDK loading
**Loads**: AFTER buffer init
**Features**:
- Loads RudderStack SDK from CDN
- Implements all tracking methods
- Auto-appends platform to event names
- Comprehensive property collection

### 3. `/public/mobile/index.html`
**Updated**: Script loading order
```html
<script src="/js/rudderstack-init.js"></script>
<script src="/js/tracker.js"></script>
<script src="mobile.js"></script>
```

---

## 🚀 Setup Instructions

### Step 1: Get RudderStack Credentials

1. Sign up at [https://app.rudderstack.com/signup](https://app.rudderstack.com/signup)
2. Create a JavaScript source
3. Copy:
   - **Write Key**: `2Xxxxxxxxxxxxxxxxxxxxxx`
   - **Data Plane URL**: `https://yourname.dataplane.rudderstack.com`

### Step 2: Update Configuration

Open `/public/js/tracker.js` and update these lines:

```javascript
// Line 10-11
const RUDDERSTACK_WRITE_KEY = 'YOUR_WRITE_KEY'; // ← Replace this
const RUDDERSTACK_ENDPOINT = 'https://stage-rudkdepn.dataplane.rudderstack.com'; // ← Replace this
```

**Example**:
```javascript
const RUDDERSTACK_WRITE_KEY = '2XyZ123abc456def789'; // Your actual key
const RUDDERSTACK_ENDPOINT = 'https://manpreet.dataplane.rudderstack.com'; // Your actual URL
```

### Step 3: Update Desktop & Admin HTML

Add same scripts to other HTML files:

#### Desktop (`/public/index.html`)
Add before closing `</body>`:
```html
    <script src="/js/rudderstack-init.js"></script>
    <script src="/js/tracker.js"></script>
    <script src="app.js"></script>
</body>
```

#### Admin (`/public/admin/sections.html`)
Add before closing `</body>`:
```html
    <script src="/js/rudderstack-init.js"></script>
    <script src="/js/tracker.js"></script>
    <script src="sections.js"></script>
</body>
```

### Step 4: Deploy Files

```bash
cd /Users/manpreetsingh/Thinking/stage-music-app

# Deploy new tracker files
scp public/js/rudderstack-init.js root@69.49.243.142:/root/stage-music-app/public/js/
scp public/js/tracker.js root@69.49.243.142:/root/stage-music-app/public/js/

# Deploy updated HTML
scp public/mobile/index.html root@69.49.243.142:/root/stage-music-app/public/mobile/

# No server restart needed (client-side only)
```

### Step 5: Test

1. Open: `https://stage.nip.io/mobile`
2. Open DevTools Console (F12)
3. You should see:
```
✅ RudderStack buffer initialized
✅ RudderStack SDK initialized
📊 Event: app_open_web {...}
```

4. Test manual event:
```javascript
window.tracker.track('test_event', { test: true });
// Check console: 📊 Event: test_event_web {test: true, ...}
```

5. Check RudderStack Dashboard:
   - Go to: https://app.rudderstack.com/
   - Sources → Your Source → Live Events
   - You should see events appearing!

---

## 🎯 How It Works

### Loading Sequence:

```
1. rudderstack-init.js loads
   ↓ Creates buffer array
   ↓ Creates deviceId cookie
   ↓ Creates stub methods

2. tracker.js loads
   ↓ Loads RudderStack SDK from CDN
   ↓ Initializes SDK with write key
   ↓ Sets anonymousId to deviceId
   ↓ Tracks app_open event

3. mobile.js loads
   ↓ Uses window.tracker to track events
```

### Event Name Pattern:

```javascript
// Your code:
window.tracker.track('song_played', { song_id: 123 });

// Sent to RudderStack as:
'song_played_web'

// With properties:
{
  song_id: 123,
  session_id: "...",
  device_id: "...",
  platform: "web",
  version: "1.0.0",
  os_name: "macOS",
  browser_name: "Chrome",
  page_url: "https://...",
  // ... 15+ more auto-added properties
}
```

---

## 💡 Usage Examples

### Track Song Play
```javascript
window.tracker.trackSongPlay(song, 'trending_section', 3);
```

### Track Search
```javascript
window.tracker.trackSearch('arijit singh', 24);
```

### Track User Signup
```javascript
window.tracker.trackSignup(userId, 'email', {
    name: 'John Doe',
    email: 'john@example.com'
});
```

### Track User Login
```javascript
// First identify
window.tracker.identify(userId, {
    name: userData.name,
    email: userData.email
});

// Then track login
window.tracker.trackLogin('email');
```

### Track Custom Event
```javascript
window.tracker.track('button_clicked', {
    button_name: 'play_button',
    location: 'home_screen'
});

// Sends as: button_clicked_web
```

### Track Page View
```javascript
window.tracker.page('Home Screen', {
    section: 'trending'
});
```

### Track Error
```javascript
window.tracker.trackError('api_error', 'Failed to load songs', {
    endpoint: '/api/songs',
    status: 500
});
```

---

## 🔧 Configuration Options

### Change Platform

In `/public/js/tracker.js`:
```javascript
const PLATFORM = 'web'; // Options: 'web', 'mobile_web', 'tv'
```

This changes event names:
- `web` → `song_played_web`
- `mobile_web` → `song_played_mobile_web`
- `tv` → `song_played_tv`

### Disable Console Logging (Production)

Events automatically stop logging when not on localhost/nip.io.

To force disable:
```javascript
// In tracker.js, comment out console.log lines
// console.log('📊 Event:', fullEventName, properties);
```

---

## 📊 What Gets Tracked Automatically

Every event includes these properties:

```javascript
{
  // Device Info
  os_name: "macOS",
  os_version: "",
  browser_name: "Chrome",
  browser_version: "",
  device_type: "desktop",
  device_platform: "web",
  user_agent: "Mozilla/5.0...",

  // Session Info
  session_id: "1234567890",
  device_id: "uuid-device-id",

  // App Info
  version: "1.0.0",
  platform: "web",
  nextJsWebsite: false,
  device_screen_type: "desktop",

  // Page Info
  page_url: "https://stage.nip.io/mobile",
  screen_width: 1920,
  screen_height: 1080,
  viewport_width: 1920,
  viewport_height: 937,

  // User Info (if logged in)
  customer_user_id: 123,
  userId: 123,

  // Timestamp
  timestamp: "2024-01-20T10:30:45.123Z"
}
```

---

## 🆚 Comparison: Old vs New Implementation

### Old Implementation:
```javascript
// Manual RudderStack snippet in HTML
<script>
rudderanalytics=window.rudderanalytics=[];
// ... long snippet ...
</script>
<script src="https://cdn.rudderlabs.com/v1.1/rudder-analytics.min.js"></script>
<script src="/js/tracker.js"></script>
```

**Problems:**
- ❌ Hardcoded in HTML
- ❌ No buffer before SDK loads
- ❌ deviceId not properly managed
- ❌ Event names not standardized

### New Implementation (stage-webapp pattern):
```javascript
// Separate initialization files
<script src="/js/rudderstack-init.js"></script>
<script src="/js/tracker.js"></script>
```

**Benefits:**
- ✅ Modular and maintainable
- ✅ Buffer ensures no events lost
- ✅ deviceId in cookie (365 days)
- ✅ Platform suffix on all events
- ✅ Comprehensive auto-properties
- ✅ Matches production patterns

---

## 🔍 Debugging

### Check if buffer is initialized:
```javascript
console.log(window.isRudderStackBuffered); // true
console.log(window.stageDeviceId); // uuid
```

### Check if SDK is loaded:
```javascript
console.log(window.rudderanalytics); // Object with methods
console.log(window.tracker.isInitialized); // true
```

### Check deviceId cookie:
```javascript
document.cookie.split(';').find(c => c.includes('stage_device_id'));
```

### Watch network requests:
Open DevTools → Network → Filter by "rudderstack" → See POST requests

---

## 🎨 Integration with Mobile App

### In mobile.js

#### Track song playback:
```javascript
// In playSong() function
function playSong(songId) {
    const song = allSongs.find(s => s.id === songId);
    if (!song) return;

    currentSong = song;
    audioPlayer.src = song.audio_file;
    audioPlayer.play();
    isPlaying = true;

    // ✅ Track play
    if (window.tracker) {
        window.tracker.trackSongPlay(song, currentPlaySource || 'unknown', currentPlayPosition || 0);
    }

    updateNowPlaying();
    updatePlayButton();
}
```

#### Track audio events:
```javascript
// Add event listeners
audioPlayer.addEventListener('pause', () => {
    if (currentSong && window.tracker && !audioPlayer.ended) {
        window.tracker.trackSongPause(
            currentSong,
            audioPlayer.currentTime,
            audioPlayer.duration
        );
    }
});

audioPlayer.addEventListener('ended', () => {
    if (currentSong && window.tracker) {
        window.tracker.trackSongComplete(currentSong);
    }
    playNext();
});
```

#### Track search:
```javascript
async function performSearch(query) {
    if (!query || query.length < 2) return;

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        // ✅ Track search
        if (window.tracker) {
            window.tracker.trackSearch(query, data.results?.length || 0);
        }

        showSearchResults(data.results);
    } catch (error) {
        console.error('Search error:', error);
    }
}
```

---

## ✅ Verification Checklist

- [ ] Updated RUDDERSTACK_WRITE_KEY in tracker.js
- [ ] Updated RUDDERSTACK_ENDPOINT in tracker.js
- [ ] Added scripts to mobile/index.html
- [ ] Added scripts to index.html
- [ ] Added scripts to admin/sections.html
- [ ] Deployed rudderstack-init.js
- [ ] Deployed tracker.js
- [ ] Deployed HTML files
- [ ] Tested in browser console
- [ ] Verified events in RudderStack Dashboard
- [ ] Checked deviceId cookie is set
- [ ] Confirmed event names have platform suffix
- [ ] Verified auto-properties are included

---

## 🚨 Common Issues

### Issue: "RudderStack not initialized yet"
**Solution**: SDK is still loading, events are queued in buffer. Wait 2-3 seconds.

### Issue: No events in dashboard
**Solution**:
1. Check Write Key is correct
2. Check Data Plane URL is correct
3. Check network tab for POST requests
4. Check browser console for errors

### Issue: deviceId not set
**Solution**:
1. Check cookies are enabled
2. Check script load order (init before tracker)
3. Clear cookies and reload

### Issue: Events not showing platform suffix
**Solution**: Check tracker.js line 14 `const PLATFORM = 'web';`

---

## 📚 Documentation Files

1. ✅ **rudderstack-init.js** - Buffer initialization
2. ✅ **tracker.js** - Main tracker implementation
3. ✅ **RUDDERSTACK_SETUP_STAGE_WEBAPP_PATTERN.md** - This file
4. ✅ **RUDDERSTACK_EVENTS_LIST.md** - All events list (previous file)
5. ✅ **RUDDERSTACK_INTEGRATION.md** - Detailed guide (previous file)

---

## 🎯 Next Steps

1. ✅ Update configuration (Write Key + Data Plane URL)
2. ✅ Deploy files to server
3. ✅ Test basic tracking
4. ✅ Add tracking calls to mobile.js
5. ✅ Set up destinations in RudderStack Dashboard
6. ✅ Create analytics reports

---

**Implementation Status**: ✅ Complete and Ready to Deploy

**Pattern Source**: stage-webapp (vatsanatech/stage-webapp)

**Key Features**:
- Event buffering before SDK loads
- Cookie-based deviceId (365 days)
- Platform suffix on all events
- Comprehensive auto-properties
- Production-ready patterns

Sab ready hai bhai! Ab sirf configuration update karni hai aur deploy karna hai. Stage-webapp ka exact pattern follow kiya hai! 🚀
