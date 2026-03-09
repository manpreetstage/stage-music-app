# RudderStack Setup - Quick Start Guide

## ✅ Step-by-Step Setup

### Step 1: Get RudderStack Account (5 mins)

1. Go to [https://app.rudderstack.com/signup](https://app.rudderstack.com/signup)
2. Sign up (free tier available)
3. Create a new **JavaScript source**:
   - Click "Sources" → "Add Source"
   - Select "JavaScript" / "Web"
   - Give it a name: "Stage Music Web"
4. Copy your credentials:
   - **Write Key**: `2Xxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Data Plane URL**: `https://yourname.dataplane.rudderstack.com`

---

### Step 2: Update HTML Files (10 mins)

Add RudderStack SDK to **3 HTML files**. Insert this snippet in the `<head>` section **BEFORE** the tracker.js script:

#### File 1: `/public/mobile/index.html`

Find the `<head>` section and add:

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stage Music</title>
    <link rel="stylesheet" href="mobile.css">

    <!-- RudderStack SDK - ADD THIS -->
    <script>
    rudderanalytics=window.rudderanalytics=[];for(var methods=["load","page","track","identify","alias","group","ready","reset","getAnonymousId","setAnonymousId"],i=0;i<methods.length;i++){var method=methods[i];rudderanalytics[method]=function(a){return function(){rudderanalytics.push([a].concat(Array.prototype.slice.call(arguments)))}}(method)}rudderanalytics.load("YOUR_WRITE_KEY","YOUR_DATA_PLANE_URL"),rudderanalytics.page();
    </script>
    <script src="https://cdn.rudderlabs.com/v1.1/rudder-analytics.min.js"></script>

    <!-- Stage Music Tracker -->
    <script src="/js/tracker.js"></script>

    <!-- Rest of head... -->
</head>
```

#### File 2: `/public/index.html`

Same snippet in `<head>` section

#### File 3: `/public/admin/sections.html`

Same snippet in `<head>` section

**⚠️ IMPORTANT:** Replace `YOUR_WRITE_KEY` and `YOUR_DATA_PLANE_URL` with your actual credentials from Step 1!

---

### Step 3: Deploy Updated Files (5 mins)

```bash
cd /Users/manpreetsingh/Thinking/stage-music-app

# Deploy updated tracker.js
scp public/js/tracker.js root@69.49.243.142:/root/stage-music-app/public/js/

# Deploy updated HTML files
scp public/mobile/index.html root@69.49.243.142:/root/stage-music-app/public/mobile/
scp public/index.html root@69.49.243.142:/root/stage-music-app/public/
scp public/admin/sections.html root@69.49.243.142:/root/stage-music-app/public/admin/

# Deploy updated server.js (for backup endpoint)
scp server.js root@69.49.243.142:/root/stage-music-app/

# Restart server
ssh root@69.49.243.142 "cd /root/stage-music-app && pm2 restart stage-music"
```

---

### Step 4: Test Basic Tracking (5 mins)

1. Open your app: `https://stage.nip.io/mobile` (or your domain)
2. Open DevTools Console (F12)
3. You should see:
```
✅ RudderStack initialized
📊 Event: Session Started {is_returning_user: false, ...}
📄 Page: Mobile Stage Music
```

4. Test manual event:
```javascript
window.tracker.track('Test Event', { test: true });
```

5. Check RudderStack Dashboard:
   - Go to [https://app.rudderstack.com/](https://app.rudderstack.com/)
   - Click your source → "Live Events"
   - You should see events appearing in real-time!

---

### Step 5: Add Tracking Calls (30-60 mins)

Follow `RUDDERSTACK_INTEGRATION.md` to add tracking to your JavaScript files:

#### Mobile App (`public/mobile/mobile.js`)

**1. Identify user on login:**
```javascript
// In handleMobileLogin() after successful login
if (window.tracker) {
    window.tracker.identifyUser(data.user.id, {
        name: data.user.name,
        email: data.user.email
    });
    window.tracker.trackLogin('email');
}
```

**2. Track song plays:**
```javascript
// In playSong() function
if (window.tracker) {
    window.tracker.trackSongPlay(song, currentPlaySource || 'unknown', currentPlayPosition || 0);
}
```

**3. Track search:**
```javascript
// In performSearch() function
if (window.tracker) {
    window.tracker.trackSearch(query, data.results?.length || 0);
}
```

**4. Track audio events:**
```javascript
// Add event listeners after audioPlayer initialization
audioPlayer.addEventListener('pause', () => {
    if (currentSong && window.tracker && !audioPlayer.ended) {
        window.tracker.trackSongPause(currentSong, audioPlayer.currentTime, audioPlayer.duration);
    }
});

audioPlayer.addEventListener('ended', () => {
    if (currentSong && window.tracker) {
        window.tracker.trackSongComplete(currentSong);
    }
});
```

See `RUDDERSTACK_INTEGRATION.md` for complete integration examples.

---

### Step 6: Set Up Destinations (10 mins)

In RudderStack Dashboard:

1. Click "Destinations" → "Add Destination"
2. Choose your analytics platform:
   - **Google Analytics 4** (recommended for web analytics)
   - **Mixpanel** (product analytics)
   - **Amplitude** (behavioral analytics)
   - **BigQuery** (data warehouse)
   - **Snowflake** (data warehouse)
   - **PostgreSQL** (self-hosted)

3. Connect to your source
4. Configure destination settings
5. Enable destination

**Events will now automatically flow to your chosen platforms!**

---

## 📊 What Gets Tracked Automatically

Once deployed, these events are automatically tracked:

✅ **Session Started** - When user opens the app
✅ **Screen Viewed** - Page navigation
✅ **User identification** - When logged in

---

## 🎯 Priority Events to Implement

Start with these high-value events:

### Must Have (Do First):
1. ✅ `Song Played` - trackSongPlay()
2. ✅ `Song Paused` - trackSongPause()
3. ✅ `Song Completed` - trackSongComplete()
4. ✅ `Search Query` - trackSearch()
5. ✅ `Signed Up` - trackSignup()
6. ✅ `Logged In` - trackLogin()
7. ✅ `Logged Out` - trackLogout()

### Should Have (Do Next):
8. `Playlist Created` - trackPlaylistCreate()
9. `Song Added to Playlist` - trackSongAddedToPlaylist()
10. `Section Viewed` - track('Section Viewed', {...})
11. `Album Viewed` - track('Album Viewed', {...})

### Nice to Have (Do Later):
12. All other events from `RUDDERSTACK_EVENTS_LIST.md`

---

## 🔍 Debugging

### Check if RudderStack is loaded:
```javascript
console.log(typeof rudderanalytics); // Should output: "object"
```

### Check if tracker is initialized:
```javascript
console.log(window.tracker); // Should show EventTracker instance
```

### Enable debug mode:

Add to RudderStack initialization (in HTML):
```javascript
rudderanalytics.load("YOUR_WRITE_KEY", "YOUR_DATA_PLANE_URL", {
    logLevel: "debug"
});
```

### Check network requests:

Open DevTools → Network → Filter by "rudderstack" → Should see POST requests

---

## 📈 View Your Data

### RudderStack Live Events:
[https://app.rudderstack.com/](https://app.rudderstack.com/) → Sources → Your Source → Live Events

### Event Debugger:
[https://app.rudderstack.com/](https://app.rudderstack.com/) → Sources → Your Source → Event Debugger

---

## 🚨 Common Issues

### Issue 1: "RudderStack not ready"
**Solution:** Make sure RudderStack SDK is loaded BEFORE tracker.js in HTML

### Issue 2: Events not appearing in dashboard
**Solution:**
- Check Write Key and Data Plane URL are correct
- Check browser console for errors
- Verify network requests in DevTools

### Issue 3: User not identified
**Solution:** Make sure to call `identifyUser()` after login:
```javascript
window.tracker.identifyUser(userId, { name: userName, email: userEmail });
```

---

## 📚 Documentation Files

1. **RUDDERSTACK_INTEGRATION.md** - Complete integration guide with code examples
2. **RUDDERSTACK_EVENTS_LIST.md** - All 82 events with properties
3. **RUDDERSTACK_SETUP.md** - This file (quick start)
4. **tracker.js** - Updated tracker with RudderStack support

---

## ✅ Checklist

- [ ] Created RudderStack account
- [ ] Got Write Key and Data Plane URL
- [ ] Added RudderStack SDK to mobile/index.html
- [ ] Added RudderStack SDK to index.html
- [ ] Added RudderStack SDK to admin/sections.html
- [ ] Deployed tracker.js
- [ ] Deployed HTML files
- [ ] Deployed server.js
- [ ] Restarted server
- [ ] Tested in browser console
- [ ] Verified events in RudderStack Live Events
- [ ] Added tracking calls to JavaScript files
- [ ] Set up destinations (Google Analytics, etc.)
- [ ] Verified events flowing to destinations

---

## 🎯 Next Steps

1. Set up Google Analytics 4 as destination
2. Create custom dashboards
3. Set up conversion funnels
4. Configure user segments
5. Set up alerts for important events

---

**Need Help?**
- RudderStack Docs: [https://www.rudderstack.com/docs/](https://www.rudderstack.com/docs/)
- JavaScript SDK: [https://www.rudderstack.com/docs/sources/event-streams/sdks/rudderstack-javascript-sdk/](https://www.rudderstack.com/docs/sources/event-streams/sdks/rudderstack-javascript-sdk/)
- Support: [https://rudderstack.com/join-rudderstack-slack-community](https://rudderstack.com/join-rudderstack-slack-community)

---

**Estimated Total Setup Time:** 30-45 minutes (excluding integration coding)
