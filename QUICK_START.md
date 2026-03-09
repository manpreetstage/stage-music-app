# RudderStack Quick Start - stage-webapp Pattern

## ⚡ 5-Minute Setup

### Step 1: Configuration (2 mins)

Open `/public/js/tracker.js` and update:

```javascript
const RUDDERSTACK_WRITE_KEY = 'YOUR_WRITE_KEY_HERE';
const RUDDERSTACK_ENDPOINT = 'YOUR_DATA_PLANE_URL_HERE';
```

### Step 2: Deploy (3 mins)

```bash
cd /Users/manpreetsingh/Thinking/stage-music-app

scp public/js/rudderstack-init.js root@69.49.243.142:/root/stage-music-app/public/js/
scp public/js/tracker.js root@69.49.243.142:/root/stage-music-app/public/js/
scp public/mobile/index.html root@69.49.243.142:/root/stage-music-app/public/mobile/
```

### Step 3: Test

Open: `https://stage.nip.io/mobile`

Console should show:
```
✅ RudderStack buffer initialized
✅ RudderStack SDK initialized
📊 Event: app_open_web {...}
```

---

## 📁 Files Created

- ✅ `/public/js/rudderstack-init.js` - Buffer initialization
- ✅ `/public/js/tracker.js` - Main tracker
- ✅ `/public/mobile/index.html` - Updated with scripts

---

## 💡 Usage

```javascript
// Song play
window.tracker.trackSongPlay(song, 'trending', 3);

// Search
window.tracker.trackSearch('query', 24);

// Login
window.tracker.identify(userId, { name, email });
window.tracker.trackLogin('email');

// Custom event
window.tracker.track('event_name', { prop: 'value' });
```

---

## 🎯 Key Features

✅ Events queue before SDK loads
✅ deviceId cookie (365 days)
✅ Platform suffix on events (`_web`)
✅ 18+ auto-properties
✅ Production-ready patterns

---

## 📚 Full Docs

- **RUDDERSTACK_SETUP_STAGE_WEBAPP_PATTERN.md** - Complete setup guide
- **IMPLEMENTATION_SUMMARY.md** - Implementation details
- **RUDDERSTACK_EVENTS_LIST.md** - All events

---

**Status**: ✅ Ready to Deploy

**Pattern**: stage-webapp (vatsanatech)

**Time to Setup**: ~5 minutes

Bas credentials daal do aur deploy kar do! 🚀
