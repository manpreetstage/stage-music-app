# Stage Music - Event Tracking System

## 📋 Overview

Complete event tracking architecture for analytics, user behavior analysis, and business intelligence.

**Status**: ✅ Ready to integrate

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │ (Browser/Mobile)
│   App       │
└──────┬──────┘
       │ Event occurs
       ▼
┌─────────────────┐
│  EventTracker   │ (tracker.js)
│  - Queue events │
│  - Batch send   │
│  - Device info  │
└──────┬──────────┘
       │ POST /api/events
       ▼
┌─────────────────┐
│  Server API     │ (server.js)
│  - Validate     │
│  - Store events │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  SQLite DB      │
│  events table   │
└─────────────────┘
```

---

## 📊 Event Categories (80+ Events)

### 1. **Authentication Events**
| Event | Description | Properties |
|-------|-------------|------------|
| `user_signup` | New user registration | `method` (email/social), `referral_source` |
| `user_login` | User login | `method`, `is_remember_me` |
| `user_logout` | User logout | `session_duration` |
| `session_start` | Session started | `is_returning_user` |
| `session_end` | Session ended | `duration`, `events_count` |

### 2. **Playback Events**
| Event | Description | Properties |
|-------|-------------|------------|
| `song_play` | Song played | `song_id`, `song_title`, `artist`, `language`, `source`, `position` |
| `song_pause` | Song paused | `song_id`, `played_duration`, `total_duration`, `completion_percentage` |
| `song_complete` | Song completed | `song_id`, `completion_rate` |
| `song_skip` | Song skipped | `song_id`, `skip_position`, `skip_reason` |
| `song_seek` | User seeked | `song_id`, `from_position`, `to_position` |
| `volume_change` | Volume adjusted | `old_volume`, `new_volume` |
| `playback_speed_change` | Speed changed | `old_speed`, `new_speed` |
| `queue_add` | Song added to queue | `song_id`, `position` |
| `queue_remove` | Song removed from queue | `song_id` |
| `queue_clear` | Queue cleared | `songs_count` |
| `shuffle_toggle` | Shuffle on/off | `enabled` |
| `repeat_toggle` | Repeat mode changed | `mode` (off/one/all) |

### 3. **Discovery Events**
| Event | Description | Properties |
|-------|-------------|------------|
| `search_query` | Search performed | `query`, `results_count` |
| `search_result_click` | Search result clicked | `query`, `song_id`, `position`, `result_type` |
| `section_view` | Section viewed | `section_id`, `section_name`, `language` |
| `album_view` | Album opened | `album_id`, `album_name`, `song_count` |
| `category_view` | Category opened | `category_id`, `category_name` |
| `song_click` | Song clicked | `song_id`, `source`, `position` |
| `featured_view` | Featured section viewed | `featured_count` |
| `trending_view` | Trending section viewed | `trending_count` |
| `quick_picks_view` | Quick Picks viewed | `picks_count` |

### 4. **Library & Playlist Events**
| Event | Description | Properties |
|-------|-------------|------------|
| `playlist_create` | Playlist created | `playlist_id`, `playlist_name`, `is_public` |
| `playlist_edit` | Playlist updated | `playlist_id`, `fields_changed` |
| `playlist_delete` | Playlist deleted | `playlist_id`, `songs_count` |
| `playlist_view` | Playlist opened | `playlist_id`, `songs_count`, `is_own` |
| `playlist_play` | Playlist played | `playlist_id`, `songs_count` |
| `song_add_to_playlist` | Song added to playlist | `song_id`, `playlist_id` |
| `song_remove_from_playlist` | Song removed from playlist | `song_id`, `playlist_id` |
| `favorite_add` | Song favorited | `song_id` |
| `favorite_remove` | Song unfavorited | `song_id` |
| `library_view` | Library opened | `playlists_count`, `favorites_count` |

### 5. **Profile Events**
| Event | Description | Properties |
|-------|-------------|------------|
| `profile_view` | Profile opened | `is_own` |
| `profile_edit` | Profile updated | `fields_changed` |
| `avatar_change` | Avatar updated | `method` (upload/default) |
| `password_change` | Password changed | `method` (form/reset) |
| `email_verify` | Email verified | `verification_method` |
| `recently_played_view` | Recently played viewed | `songs_count` |

### 6. **UI/UX Events**
| Event | Description | Properties |
|-------|-------------|------------|
| `screen_view` | Screen viewed | `screen_name`, `load_time` |
| `button_click` | Button clicked | `button_name`, `location` |
| `modal_open` | Modal opened | `modal_name` |
| `modal_close` | Modal closed | `modal_name`, `duration` |
| `tab_switch` | Tab switched | `from_tab`, `to_tab` |
| `theme_toggle` | Theme changed | `theme` (light/dark) |
| `language_change` | Language changed | `from_lang`, `to_lang` |
| `menu_open` | Menu opened | `menu_type` |
| `swipe` | Swipe gesture | `direction`, `screen` |
| `long_press` | Long press | `target`, `action` |

### 7. **Admin Events**
| Event | Description | Properties |
|-------|-------------|------------|
| `admin_login` | Admin logged in | `username` |
| `admin_song_upload` | Song uploaded | `song_id`, `method` (manual/youtube) |
| `admin_song_edit` | Song edited | `song_id`, `fields_changed` |
| `admin_song_delete` | Song deleted | `song_id`, `language` |
| `admin_section_create` | Section created | `section_id`, `section_type` |
| `admin_section_edit` | Section edited | `section_id`, `changes` |
| `admin_album_edit` | Album edited | `album_id`, `changes` |
| `admin_featured_update` | Featured songs updated | `songs_count` |

### 8. **Performance Events**
| Event | Description | Properties |
|-------|-------------|------------|
| `app_load` | App loaded | `load_time`, `cache_hit` |
| `api_error` | API call failed | `endpoint`, `status`, `error_message` |
| `audio_error` | Audio playback error | `song_id`, `error_type` |
| `slow_network` | Slow connection detected | `connection_type`, `speed` |
| `buffer_start` | Audio buffering started | `song_id`, `position` |
| `buffer_end` | Audio buffering ended | `song_id`, `buffer_duration` |

### 9. **Business Events**
| Event | Description | Properties |
|-------|-------------|------------|
| `share_song` | Song shared | `song_id`, `method` (link/social) |
| `share_playlist` | Playlist shared | `playlist_id`, `method` |
| `download_request` | Download requested | `song_id`, `format` |
| `subscription_view` | Pricing page viewed | - |
| `subscription_start` | Subscription started | `plan`, `price`, `duration` |
| `subscription_cancel` | Subscription cancelled | `plan`, `reason` |

### 10. **Engagement Events**
| Event | Description | Properties |
|-------|-------------|------------|
| `listening_milestone` | Milestone reached | `type` (10/50/100 songs), `count` |
| `daily_streak` | Daily streak | `streak_count` |
| `achievement_unlock` | Achievement unlocked | `achievement_id`, `achievement_name` |
| `notification_click` | Notification clicked | `notification_id`, `type` |
| `push_permission_grant` | Push notifications enabled | - |
| `push_permission_deny` | Push notifications denied | - |

### 11. **Error Events**
| Event | Description | Properties |
|-------|-------------|------------|
| `error` | Generic error | `error_type`, `error_message`, context |
| `network_error` | Network failure | `endpoint`, `status`, `retry_count` |
| `auth_error` | Authentication error | `error_type`, `attempted_action` |
| `playback_error` | Playback failure | `song_id`, `error_code` |

---

## 🔧 Implementation

### 1. **Include Tracker Script**

Add to HTML `<head>` section:

```html
<!-- Mobile App: /public/mobile/index.html -->
<script src="/js/tracker.js"></script>

<!-- Desktop App: /public/index.html -->
<script src="/js/tracker.js"></script>

<!-- Admin Panel: /public/admin/sections.html -->
<script src="/js/tracker.js"></script>
```

### 2. **Mobile App Integration** (`/public/mobile/mobile.js`)

#### Track Song Playback

```javascript
// In playSong() function (around line 200)
function playSong(songId) {
    const song = allSongs.find(s => s.id === songId);
    if (!song) return;

    currentSong = song;
    audioPlayer.src = song.audio_file;
    audioPlayer.play();
    isPlaying = true;

    // ✅ Track song play event
    if (window.tracker) {
        window.tracker.trackSongPlay(song, currentPlaySource, currentPlayPosition);
    }

    updateNowPlaying();
    updatePlayButton();
}
```

#### Track Song Pause/Complete

```javascript
// Add event listeners after audioPlayer initialization
audioPlayer.addEventListener('pause', () => {
    if (currentSong && window.tracker) {
        const playedDuration = audioPlayer.currentTime;
        const totalDuration = audioPlayer.duration;
        window.tracker.trackSongPause(currentSong, playedDuration, totalDuration);
    }
});

audioPlayer.addEventListener('ended', () => {
    if (currentSong && window.tracker) {
        window.tracker.trackSongComplete(currentSong);
    }
});
```

#### Track Search

```javascript
// In performSearch() function
async function performSearch(query) {
    if (!query || query.length < 2) {
        showSearchEmpty();
        return;
    }

    showSearchLoading();

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        // ✅ Track search event
        if (window.tracker) {
            window.tracker.trackSearch(query, data.results?.length || 0);
        }

        showSearchResults(data.results);
    } catch (error) {
        console.error('Search error:', error);
    }
}
```

#### Track Screen Views

```javascript
// In switchPage() function
function switchPage(page) {
    console.log('Switching to:', page);

    // Hide all views
    hideSearchView();
    hideCategoryView();
    hideLibraryView();
    hideProfileView();

    // ✅ Track screen view
    if (window.tracker) {
        window.tracker.track('screen_view', {
            screen_name: page,
            previous_screen: currentPage
        });
    }

    mainContent.style.display = page === 'home' ? 'block' : 'none';

    switch(page) {
        case 'home':
            break;
        case 'search':
            showSearchView();
            break;
        case 'library':
            showLibraryView();
            break;
        case 'profile':
            showProfileView();
            break;
    }

    currentPage = page;
}
```

#### Track Section Views

```javascript
// In viewCategory() function
function viewCategory(sectionId) {
    const section = allSections.find(s => s.id === sectionId);
    if (!section) return;

    // ✅ Track section view
    if (window.tracker) {
        window.tracker.track('section_view', {
            section_id: section.id,
            section_name: section.name,
            language: section.language,
            songs_count: section.songs?.length || 0
        });
    }

    // ... rest of function
}
```

#### Track Playlist Events

```javascript
// In createPlaylist()
async function createPlaylist(name, description, isPublic) {
    try {
        const response = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, is_public: isPublic })
        });

        const data = await response.json();

        // ✅ Track playlist creation
        if (window.tracker) {
            window.tracker.track('playlist_create', {
                playlist_id: data.playlist.id,
                playlist_name: name,
                is_public: isPublic
            });
        }

        return data;
    } catch (error) {
        console.error('Playlist creation error:', error);
    }
}

// In addToPlaylist()
async function addToPlaylist(playlistId, songId) {
    try {
        const response = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
            method: 'POST'
        });

        if (response.ok) {
            // ✅ Track song added to playlist
            if (window.tracker) {
                window.tracker.track('song_add_to_playlist', {
                    song_id: songId,
                    playlist_id: playlistId
                });
            }

            alert('✅ Added to playlist!');
        }
    } catch (error) {
        console.error('Add to playlist error:', error);
    }
}
```

#### Track Authentication

```javascript
// In handleMobileLogin()
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
            // ✅ Track login
            if (window.tracker) {
                window.tracker.track('user_login', {
                    method: 'email',
                    is_remember_me: false
                });
            }

            closeMobileLogin();
            loadUserProfile();
        }
    } catch (error) {
        console.error('Login error:', error);
    }
}
```

### 3. **Desktop App Integration** (`/public/script.js`)

Similar integration as mobile, track:
- Song plays in `playSong()`
- Search in search functionality
- Playlist operations
- Authentication events

### 4. **Admin Panel Integration** (`/public/admin/sections.js`)

```javascript
// Track admin song upload
async function uploadSong(formData) {
    try {
        const response = await fetch('/api/admin/songs', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            // ✅ Track admin upload
            if (window.tracker) {
                window.tracker.track('admin_song_upload', {
                    song_id: data.songId,
                    method: 'manual',
                    language: formData.get('language')
                });
            }
        }
    } catch (error) {
        console.error('Upload error:', error);
    }
}
```

---

## 📈 Analytics Dashboard

### View Analytics (Admin Only)

```javascript
// Fetch analytics overview
async function loadAnalytics() {
    try {
        const response = await fetch('/api/analytics/overview?limit=100');
        const data = await response.json();

        console.log('Total Events:', data.totalEvents);
        console.log('Unique Users:', data.uniqueUsers);
        console.log('Unique Sessions:', data.uniqueSessions);
        console.log('Top Events:', data.topEvents);
        console.log('Recent Events:', data.recentEvents);
    } catch (error) {
        console.error('Analytics error:', error);
    }
}
```

### Sample Query Results

```javascript
{
    "totalEvents": 45632,
    "uniqueUsers": 342,
    "uniqueSessions": 1205,
    "topEvents": [
        { "event_name": "song_play", "count": 12450 },
        { "event_name": "screen_view", "count": 8934 },
        { "event_name": "search_query", "count": 2341 },
        { "event_name": "song_pause", "count": 1876 },
        { "event_name": "playlist_create", "count": 456 }
    ],
    "recentEvents": [...]
}
```

---

## 🔍 Querying Events

### Find most played songs

```sql
SELECT
    properties->>'$.song_id' as song_id,
    properties->>'$.song_title' as title,
    COUNT(*) as play_count
FROM events
WHERE event_name = 'song_play'
GROUP BY song_id
ORDER BY play_count DESC
LIMIT 10;
```

### User engagement metrics

```sql
SELECT
    user_id,
    COUNT(DISTINCT session_id) as sessions,
    COUNT(*) as total_events,
    COUNT(CASE WHEN event_name = 'song_play' THEN 1 END) as songs_played
FROM events
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY total_events DESC;
```

### Search analytics

```sql
SELECT
    properties->>'$.query' as search_query,
    COUNT(*) as search_count,
    AVG(CAST(properties->>'$.results_count' AS INTEGER)) as avg_results
FROM events
WHERE event_name = 'search_query'
GROUP BY search_query
ORDER BY search_count DESC
LIMIT 20;
```

---

## 🚀 Deployment

1. **Update server code** - Already done ✅
   - Events table created
   - `/api/events` endpoint added
   - `/api/analytics/overview` endpoint added

2. **Add tracker script to HTML files**
   ```bash
   # Already created at /public/js/tracker.js ✅
   ```

3. **Deploy to production**
   ```bash
   cd /Users/manpreetsingh/Thinking/stage-music-app

   # Deploy updated server.js
   scp server.js root@69.49.243.142:/root/stage-music-app/

   # Deploy tracker.js
   scp public/js/tracker.js root@69.49.243.142:/root/stage-music-app/public/js/

   # Restart server
   ssh root@69.49.243.142 "cd /root/stage-music-app && pm2 restart stage-music"
   ```

4. **Add tracker script tags to HTML**
   - Mobile: `/public/mobile/index.html`
   - Desktop: `/public/index.html`
   - Admin: `/public/admin/sections.html`

5. **Integrate tracking calls** - Follow code examples above

---

## ✅ Testing

### 1. Verify tracker loads

```javascript
// Open browser console on any page
console.log(window.tracker);
// Should output: EventTracker { sessionId: "...", deviceId: "...", ... }
```

### 2. Test manual event

```javascript
// In browser console
window.tracker.track('test_event', { foo: 'bar' });
// Check console for: 📊 Event: test_event {foo: "bar"}
```

### 3. Check events in database

```bash
ssh root@69.49.243.142
cd /root/stage-music-app
sqlite3 database.db "SELECT * FROM events ORDER BY created_at DESC LIMIT 5;"
```

### 4. Verify batch sending

```javascript
// Events should flush every 5 seconds or when queue reaches 20 events
// Check Network tab in DevTools for POST /api/events requests
```

---

## 📊 Event Schema Reference

```javascript
{
    event_id: "evt_1234567890_abc123",           // Unique event ID
    event_name: "song_play",                     // Event name
    timestamp: "2024-01-20T10:30:45.123Z",      // ISO 8601 timestamp

    // User Context
    user_id: 42,                                 // Logged in user ID (null for guests)
    session_id: "session_1234567890_xyz789",    // Session ID
    device_id: "device_1234567890_def456",      // Persistent device ID

    // Device Info
    platform: "mobile",                          // mobile/desktop
    os: "iOS",                                   // iOS/Android/macOS/Windows/Linux
    browser: "Chrome",                           // Chrome/Safari/Firefox/Edge
    screen_size: "1920x1080",                   // Screen resolution
    viewport_size: "375x667",                   // Viewport size
    network: "4g",                              // Network type

    // Event Properties (varies by event type)
    properties: {
        song_id: 123,
        song_title: "Song Name",
        artist: "Artist Name",
        language: "Hindi",
        source: "trending_section",
        position: 3
    },

    // App Context
    app_version: "1.0.0",                       // App version
    page_url: "/mobile"                         // Current page path
}
```

---

## 🎯 Best Practices

1. **Always check if tracker exists**
   ```javascript
   if (window.tracker) {
       window.tracker.track('event_name', properties);
   }
   ```

2. **Use immediate flag for critical events**
   ```javascript
   window.tracker.track('error', { error_message: 'Critical error' }, true);
   ```

3. **Keep property objects clean**
   ```javascript
   // Good
   { song_id: 123, source: 'trending' }

   // Bad - don't send entire objects
   { song: entireSongObject }
   ```

4. **Use convenience methods when available**
   ```javascript
   // Preferred
   tracker.trackSongPlay(song, source, position);

   // Instead of
   tracker.track('song_play', { song_id: song.id, ... });
   ```

---

## 🔒 Privacy & GDPR

- Device IDs are generated client-side and stored in localStorage
- User IDs are only tracked for logged-in users
- No PII (Personally Identifiable Information) is tracked by default
- Events are stored securely in SQLite database
- Implement data retention policy (e.g., delete events older than 90 days)

---

## 📝 Future Enhancements

1. **Real-time Analytics Dashboard**
   - Live event stream
   - Real-time metrics
   - User journey visualization

2. **Funnel Analysis**
   - Signup funnel
   - Playlist creation funnel
   - Song discovery funnel

3. **Cohort Analysis**
   - User retention by signup date
   - Feature adoption by cohort

4. **A/B Testing Framework**
   - Track experiment variants
   - Measure conversion rates

5. **Export to Analytics Platforms**
   - Google Analytics integration
   - Mixpanel export
   - Amplitude integration

---

## 🆘 Troubleshooting

### Events not being sent

1. Check tracker is initialized:
   ```javascript
   console.log(window.tracker);
   ```

2. Check Network tab for POST /api/events requests

3. Check server logs:
   ```bash
   ssh root@69.49.243.142 "pm2 logs stage-music"
   ```

### Database errors

1. Verify events table exists:
   ```bash
   sqlite3 database.db "SELECT name FROM sqlite_master WHERE type='table' AND name='events';"
   ```

2. Check table schema:
   ```bash
   sqlite3 database.db ".schema events"
   ```

---

## 📞 Support

For issues or questions:
1. Check server logs: `pm2 logs stage-music`
2. Check browser console for errors
3. Verify tracker.js is loaded: `console.log(window.tracker)`

---

**Status**: ✅ Implementation Complete
**Last Updated**: 2024-01-20
