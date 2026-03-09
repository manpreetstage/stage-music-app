# Stage Music - RudderStack Integration Guide

## 📋 Overview

Stage Music uses **RudderStack** as the primary Customer Data Platform (CDP) for event tracking and analytics. Events are sent to RudderStack, which then routes them to your configured destinations (Google Analytics, Mixpanel, Amplitude, Data Warehouse, etc.).

**Architecture:**
```
Mobile/Desktop App → RudderStack SDK → RudderStack Cloud → Destinations
                            ↓
                    Backup Database (SQLite)
```

---

## 🚀 Setup

### Step 1: Get RudderStack Credentials

1. Sign up at [https://app.rudderstack.com/](https://app.rudderstack.com/)
2. Create a new **JavaScript source**
3. Copy your **Write Key** and **Data Plane URL**

Example:
```
Write Key: 2Xxxxxxxxxxxxxxxxxxxxxxxxxxx
Data Plane URL: https://yourname.dataplane.rudderstack.com
```

### Step 2: Add RudderStack SDK to HTML

Add this snippet to the `<head>` section of all HTML files:

**Mobile App** (`/public/mobile/index.html`):
```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stage Music</title>

    <!-- RudderStack SDK -->
    <script>
    rudderanalytics=window.rudderanalytics=[];for(var methods=["load","page","track","identify","alias","group","ready","reset","getAnonymousId","setAnonymousId"],i=0;i<methods.length;i++){var method=methods[i];rudderanalytics[method]=function(a){return function(){rudderanalytics.push([a].concat(Array.prototype.slice.call(arguments)))}}(method)}rudderanalytics.load("YOUR_WRITE_KEY","YOUR_DATA_PLANE_URL"),rudderanalytics.page();
    </script>
    <script src="https://cdn.rudderlabs.com/v1.1/rudder-analytics.min.js"></script>

    <!-- Stage Music Event Tracker -->
    <script src="/js/tracker.js"></script>

    <!-- Rest of your head content -->
</head>
```

**Desktop App** (`/public/index.html`):
```html
<head>
    <!-- Same RudderStack snippet as above -->
    <script>
    rudderanalytics=window.rudderanalytics=[];for(var methods=["load","page","track","identify","alias","group","ready","reset","getAnonymousId","setAnonymousId"],i=0;i<methods.length;i++){var method=methods[i];rudderanalytics[method]=function(a){return function(){rudderanalytics.push([a].concat(Array.prototype.slice.call(arguments)))}}(method)}rudderanalytics.load("YOUR_WRITE_KEY","YOUR_DATA_PLANE_URL"),rudderanalytics.page();
    </script>
    <script src="https://cdn.rudderlabs.com/v1.1/rudder-analytics.min.js"></script>
    <script src="/js/tracker.js"></script>
</head>
```

**Admin Panel** (`/public/admin/sections.html`):
```html
<head>
    <!-- Same RudderStack snippet -->
</head>
```

**⚠️ IMPORTANT:** Replace `YOUR_WRITE_KEY` and `YOUR_DATA_PLANE_URL` with your actual credentials!

### Step 3: Verify Integration

1. Open your app in browser
2. Open DevTools Console
3. You should see:
```
✅ RudderStack initialized
📊 Event: Session Started {...}
📄 Page: Mobile Stage Music
```

4. Check RudderStack Dashboard → Live Events to see incoming events

---

## 📊 Event Naming Convention

Following **RudderStack's best practices**, we use:
- **Title Case** for event names (e.g., "Song Played" not "song_play")
- **snake_case** for property names (e.g., "song_id" not "songId")
- **Standard E-commerce Events** where applicable

### All Events List

#### 1. Authentication & User Events

| Event Name | RudderStack Method | Properties |
|------------|-------------------|------------|
| `Signed Up` | `track()` + `identify()` | `method`, `user_id` |
| `Logged In` | `track()` | `method` |
| `Logged Out` | `track()` + `reset()` | `session_duration` |
| `Session Started` | `track()` | `is_returning_user`, `device_id`, `session_id` |
| `Session Ended` | `track()` | `duration`, `events_count` |

#### 2. Playback Events

| Event Name | Properties |
|------------|------------|
| `Song Played` | `song_id`, `song_title`, `artist`, `language`, `source`, `position`, `duration`, `cover_image` |
| `Song Paused` | `song_id`, `song_title`, `artist`, `played_duration`, `total_duration`, `completion_percentage` |
| `Song Completed` | `song_id`, `song_title`, `artist`, `completion_rate` |
| `Song Skipped` | `song_id`, `song_title`, `skip_position`, `skip_reason` |
| `Song Seeked` | `song_id`, `from_position`, `to_position` |
| `Volume Changed` | `old_volume`, `new_volume` |
| `Playback Speed Changed` | `old_speed`, `new_speed` |
| `Queue Updated` | `action` (add/remove/clear), `song_id`, `position`, `songs_count` |
| `Shuffle Toggled` | `enabled` |
| `Repeat Toggled` | `mode` (off/one/all) |

#### 3. Discovery & Search Events

| Event Name | Properties |
|------------|------------|
| `Search Query` | `query`, `results_count` |
| `Search Result Clicked` | `query`, `song_id`, `position`, `result_type` |
| `Section Viewed` | `section_id`, `section_name`, `language`, `songs_count` |
| `Album Viewed` | `album_id`, `album_name`, `song_count` |
| `Category Viewed` | `category_id`, `category_name` |
| `Song Clicked` | `song_id`, `source`, `position` |
| `Featured Section Viewed` | `featured_count` |
| `Trending Section Viewed` | `trending_count` |
| `Quick Picks Viewed` | `picks_count` |

#### 4. Playlist Events (E-commerce Spec)

| Event Name | RudderStack Mapping | Properties |
|------------|---------------------|------------|
| `Playlist Created` | Similar to "Cart Created" | `playlist_id`, `playlist_name`, `is_public` |
| `Playlist Updated` | - | `playlist_id`, `fields_changed` |
| `Playlist Deleted` | Similar to "Cart Cleared" | `playlist_id`, `songs_count` |
| `Playlist Viewed` | Similar to "Cart Viewed" | `playlist_id`, `songs_count`, `is_own` |
| `Playlist Played` | - | `playlist_id`, `songs_count` |
| `Song Added to Playlist` | Similar to "Product Added" | `song_id`, `song_title`, `playlist_id` |
| `Song Removed from Playlist` | Similar to "Product Removed" | `song_id`, `song_title`, `playlist_id` |
| `Song Favorited` | Similar to "Product Added to Wishlist" | `song_id`, `song_title` |
| `Song Unfavorited` | Similar to "Product Removed from Wishlist" | `song_id` |
| `Library Viewed` | - | `playlists_count`, `favorites_count` |

#### 5. Profile Events

| Event Name | Properties |
|------------|------------|
| `Profile Viewed` | `is_own` |
| `Profile Updated` | `fields_changed` |
| `Avatar Changed` | `method` |
| `Password Changed` | `method` |
| `Email Verified` | `verification_method` |
| `Recently Played Viewed` | `songs_count` |

#### 6. UI/UX Events

| Event Name | RudderStack Method | Properties |
|------------|-------------------|------------|
| `Screen Viewed` | `page()` | `screen_name`, `load_time`, `previous_screen` |
| `Button Clicked` | `track()` | `button_name`, `location` |
| `Modal Opened` | `track()` | `modal_name` |
| `Modal Closed` | `track()` | `modal_name`, `duration` |
| `Tab Switched` | `track()` | `from_tab`, `to_tab` |
| `Theme Toggled` | `track()` | `theme` |
| `Language Changed` | `track()` | `from_lang`, `to_lang` |

#### 7. Admin Events

| Event Name | Properties |
|------------|------------|
| `Admin Logged In` | `username` |
| `Song Uploaded` | `song_id`, `method`, `language` |
| `Song Updated` | `song_id`, `fields_changed` |
| `Song Deleted` | `song_id`, `language` |
| `Album Updated` | `album_id`, `changes` |
| `Section Created` | `section_id`, `section_type` |
| `Featured Songs Updated` | `songs_count` |

#### 8. Performance & Error Events

| Event Name | Properties |
|------------|------------|
| `App Loaded` | `load_time`, `cache_hit` |
| `Error Occurred` | `error_type`, `error_message`, context |
| `API Error` | `endpoint`, `status`, `error_message` |
| `Playback Error` | `song_id`, `error_type` |
| `Network Error` | `endpoint`, `status`, `retry_count` |
| `Buffering Started` | `song_id`, `position` |
| `Buffering Ended` | `song_id`, `buffer_duration` |

#### 9. Business Events

| Event Name | Properties |
|------------|------------|
| `Song Shared` | `song_id`, `method` |
| `Playlist Shared` | `playlist_id`, `method` |
| `Download Requested` | `song_id`, `format` |

---

## 💻 Usage Examples

### 1. Track Song Play

```javascript
// Using convenience method (recommended)
window.tracker.trackSongPlay(song, 'trending_section', 3);

// Manual tracking
window.tracker.track('Song Played', {
    song_id: song.id,
    song_title: song.title,
    artist: song.singer,
    language: song.language,
    source: 'trending_section',
    position: 3
});
```

### 2. Track User Signup

```javascript
// This will both identify the user and track the signup event
window.tracker.trackSignup(userId, 'email', {
    name: 'John Doe',
    email: 'john@example.com',
    plan: 'free'
});
```

### 3. Track User Login

```javascript
// First identify the user
window.tracker.identifyUser(userId, {
    name: userData.name,
    email: userData.email,
    last_login: new Date().toISOString()
});

// Then track login event
window.tracker.trackLogin('email');
```

### 4. Track Search

```javascript
window.tracker.trackSearch('arijit singh', 24);
```

### 5. Track Playlist Creation

```javascript
window.tracker.trackPlaylistCreate(playlistId, 'My Favorites', true);
```

### 6. Track Add to Playlist

```javascript
window.tracker.trackSongAddedToPlaylist(songId, playlistId, songTitle);
```

### 7. Track Page Navigation

```javascript
// Automatic page tracking (already called in tracker.init())
window.tracker.trackPageView();

// Custom page tracking
window.tracker.trackPageView('Home Screen', {
    section: 'trending',
    language_filter: 'hindi'
});
```

### 8. Track Screen Navigation (Mobile)

```javascript
// In switchPage() function
window.tracker.track('Screen Viewed', {
    screen_name: page,
    previous_screen: currentPage
});
```

### 9. Track Error

```javascript
window.tracker.trackError('network_error', 'Failed to load songs', {
    endpoint: '/api/songs',
    status: 500
});
```

### 10. Track User Logout

```javascript
const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000);
window.tracker.trackLogout(sessionDuration);

// Reset tracker (clears user identity)
window.tracker.reset();
```

---

## 🔧 Integration Points

### Mobile App (`/public/mobile/mobile.js`)

#### Initialize User on Load
```javascript
// When app loads, if user is logged in
if (currentUserId) {
    window.tracker.identifyUser(currentUserId, {
        name: currentUserName,
        email: currentUserEmail
    });
}
```

#### Track Song Playback
```javascript
// In playSong() function
function playSong(songId) {
    const song = allSongs.find(s => s.id === songId);
    if (!song) return;

    currentSong = song;
    audioPlayer.src = song.audio_file;
    audioPlayer.play();
    isPlaying = true;

    // Track play
    if (window.tracker) {
        window.tracker.trackSongPlay(song, currentPlaySource || 'unknown', currentPlayPosition || 0);
    }

    updateNowPlaying();
    updatePlayButton();
}

// Add audio event listeners
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

#### Track Search
```javascript
async function performSearch(query) {
    if (!query || query.length < 2) return;

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        // Track search
        if (window.tracker) {
            window.tracker.trackSearch(query, data.results?.length || 0);
        }

        showSearchResults(data.results);
    } catch (error) {
        console.error('Search error:', error);
    }
}
```

#### Track Authentication
```javascript
// Login
async function handleMobileLogin(e) {
    e.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Identify user
            if (window.tracker) {
                window.tracker.identifyUser(data.user.id, {
                    name: data.user.name,
                    email: data.user.email
                });
                window.tracker.trackLogin('email');
            }

            closeMobileLogin();
            loadUserProfile();
        }
    } catch (error) {
        console.error('Login error:', error);
    }
}

// Signup
async function handleMobileRegister(e) {
    e.preventDefault();

    const userData = {
        username: document.getElementById('register-username').value,
        email: document.getElementById('register-email').value,
        fullname: document.getElementById('register-fullname').value,
        password: document.getElementById('register-password').value
    };

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            // Track signup
            if (window.tracker) {
                window.tracker.trackSignup(data.user.id, 'email', {
                    name: userData.fullname,
                    email: userData.email
                });
            }

            closeMobileRegister();
            showMobileLogin();
        }
    } catch (error) {
        console.error('Register error:', error);
    }
}

// Logout
async function handleMobileLogout() {
    if (!confirm('Logout?')) return;

    try {
        const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000);

        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        if (response.ok) {
            // Track logout
            if (window.tracker) {
                window.tracker.trackLogout(sessionDuration);
                window.tracker.reset();
            }

            currentUser = null;
            showProfileGuest();
            switchPage('home');
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}
```

#### Track Playlist Operations
```javascript
// Create playlist
async function createPlaylist(name, description, isPublic) {
    try {
        const response = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, is_public: isPublic })
        });

        const data = await response.json();

        if (response.ok) {
            if (window.tracker) {
                window.tracker.trackPlaylistCreate(data.playlist.id, name, isPublic);
            }

            alert('✅ Playlist created!');
            return data;
        }
    } catch (error) {
        console.error('Playlist error:', error);
    }
}

// Add to playlist
async function addToPlaylist(playlistId, songId) {
    try {
        const response = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
            method: 'POST'
        });

        if (response.ok) {
            const song = allSongs.find(s => s.id === songId);

            if (window.tracker) {
                window.tracker.trackSongAddedToPlaylist(songId, playlistId, song?.title);
            }

            alert('✅ Added to playlist!');
        }
    } catch (error) {
        console.error('Add error:', error);
    }
}
```

---

## 🎯 RudderStack Destinations

Once events are in RudderStack, you can route them to:

### Analytics Platforms
- **Google Analytics 4** - Web analytics
- **Mixpanel** - Product analytics
- **Amplitude** - Behavioral analytics
- **Heap** - Auto-capture analytics

### Data Warehouses
- **BigQuery** - Google Cloud data warehouse
- **Snowflake** - Cloud data warehouse
- **Redshift** - AWS data warehouse
- **PostgreSQL** - Self-hosted database

### Marketing Tools
- **Facebook Pixel** - Facebook ads optimization
- **Google Ads** - Google ads conversion tracking
- **Mailchimp** - Email marketing segmentation
- **Customer.io** - Lifecycle messaging

### Customer Success
- **Intercom** - Customer messaging
- **Zendesk** - Support tickets
- **Salesforce** - CRM integration

---

## 📊 User Traits

When identifying users, include these traits:

```javascript
window.tracker.identifyUser(userId, {
    // Basic Info
    name: 'John Doe',
    email: 'john@example.com',
    username: 'johndoe',

    // Account Info
    signup_date: '2024-01-20T10:30:00Z',
    signup_method: 'email',
    plan: 'free', // or 'premium'

    // Preferences
    favorite_language: 'hindi',
    preferred_genres: ['bollywood', 'romantic'],

    // Engagement
    total_songs_played: 150,
    playlists_created: 5,
    favorite_songs_count: 23,

    // Device
    device_id: 'device_123',
    platform: 'mobile',
    os: 'iOS',
    app_version: '1.0.0'
});
```

---

## ✅ Testing

### 1. Check SDK Loading
```javascript
// Open browser console
console.log(typeof rudderanalytics); // Should output: "object"
console.log(window.tracker); // Should show EventTracker instance
```

### 2. Test Manual Event
```javascript
window.tracker.track('Test Event', { test_prop: 'test_value' });
```

### 3. Check RudderStack Dashboard
1. Go to [https://app.rudderstack.com/](https://app.rudderstack.com/)
2. Navigate to: Sources → Your Source → Live Events
3. You should see events appearing in real-time

### 4. Verify User Identification
```javascript
window.tracker.identifyUser('user_123', { name: 'Test User' });
// Check Live Events - should show Identify call
```

### 5. Test Page Tracking
```javascript
window.tracker.trackPageView('Test Page', { section: 'testing' });
// Check Live Events - should show Page call
```

---

## 🔍 Debugging

### Enable Debug Mode

Add to RudderStack initialization:
```javascript
rudderanalytics.load("YOUR_WRITE_KEY", "YOUR_DATA_PLANE_URL", {
    logLevel: "debug"
});
```

### Check Network Requests

Open DevTools → Network tab → Filter by "rudderstack" → You should see POST requests to your data plane URL

### Console Logging

Our tracker logs events in development:
```
✅ RudderStack initialized
📊 Event: Song Played {song_id: 123, ...}
👤 Identified User: 42 {name: "John", ...}
📄 Page: Mobile Stage Music
```

---

## 📱 Mobile vs Desktop Tracking

Both mobile and desktop apps use the same tracker, but you can differentiate in RudderStack using:

```javascript
// Automatically included in all events
{
    platform: "mobile", // or "desktop"
    page_url: "/mobile" // or "/"
}
```

This allows you to:
- Create separate funnels for mobile vs desktop
- Compare engagement metrics
- Optimize each platform separately

---

## 🚨 Error Handling

The tracker handles errors gracefully:

1. **RudderStack not loaded**: Events are queued and sent to backup database
2. **Network errors**: Events are retried automatically
3. **Invalid data**: Errors are logged to console

### Backup Database

All events are also sent to `/api/events/backup` endpoint for redundancy:
- Stored in local SQLite database
- Can be queried for debugging
- Can be bulk-imported to RudderStack if needed

---

## 🔒 Privacy & GDPR

### User Consent

Before tracking, check user consent:

```javascript
// Check consent
if (userHasConsentedToTracking()) {
    window.tracker.identifyUser(userId, traits);
    window.tracker.track('Event Name', properties);
} else {
    // Don't track or use anonymous tracking
}
```

### Anonymous Tracking

For users without consent:
```javascript
// Don't identify user
// Track only necessary events
window.tracker.track('Session Started', {
    is_anonymous: true
});
```

### Data Deletion

To delete user data:
```javascript
// Reset tracker (clears client-side data)
window.tracker.reset();

// Also delete from RudderStack via API
// And from your database
```

---

## 📈 Key Metrics to Track

### Engagement Metrics
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Session duration
- Songs played per session
- Search queries per session

### Retention Metrics
- Day 1, Day 7, Day 30 retention
- Churn rate
- Daily streak count

### Content Metrics
- Most played songs
- Most popular languages
- Most searched artists
- Playlist creation rate

### Conversion Metrics
- Signup conversion rate
- Free to premium conversion
- Feature adoption rate

---

## 🎯 Next Steps

1. ✅ Get RudderStack credentials
2. ✅ Add SDK to HTML files
3. ✅ Deploy tracker.js
4. ✅ Add tracking calls to app
5. ✅ Set up destinations in RudderStack
6. ✅ Create dashboards and reports

---

**RudderStack Resources:**
- Dashboard: [https://app.rudderstack.com/](https://app.rudderstack.com/)
- Docs: [https://www.rudderstack.com/docs/](https://www.rudderstack.com/docs/)
- Event Spec: [https://www.rudderstack.com/docs/event-spec/](https://www.rudderstack.com/docs/event-spec/)
- E-commerce Events: [https://www.rudderstack.com/docs/event-spec/ecommerce-events-spec/](https://www.rudderstack.com/docs/event-spec/ecommerce-events-spec/)
