# Stage Music - Events & Properties Quick Reference

Complete list of all 82 events with their exact properties for RudderStack.

---

## 📊 All Events with Properties

### 1. Authentication & User Events

```javascript
// 1. Signed Up
{
    method: 'email',              // 'email' or 'social'
    user_id: 123,                 // User ID
    referral_source: 'direct'     // 'direct', 'ad', 'social'
}

// 2. Logged In
{
    method: 'email',              // 'email' or 'social'
    is_remember_me: false         // Remember me checkbox
}

// 3. Logged Out
{
    session_duration: 3600        // Seconds
}

// 4. Session Started
{
    is_returning_user: true,      // Has visited before
    device_id: 'device_123',      // Device ID
    session_id: 'session_456'     // Session ID
}

// 5. Session Ended
{
    duration: 3600,               // Session duration (seconds)
    events_count: 25              // Events in session
}
```

---

### 2. Playback Events

```javascript
// 6. Song Played
{
    song_id: 123,
    song_title: 'Tum Hi Ho',
    artist: 'Arijit Singh',
    language: 'Hindi',
    source: 'trending_section',   // Where played from
    position: 3,                  // Position in list
    duration: 240,                // Song duration (seconds)
    cover_image: 'https://...'
}

// 7. Song Paused
{
    song_id: 123,
    song_title: 'Tum Hi Ho',
    artist: 'Arijit Singh',
    played_duration: 120,         // Seconds played
    total_duration: 240,          // Total duration
    completion_percentage: 50     // 0-100
}

// 8. Song Completed
{
    song_id: 123,
    song_title: 'Tum Hi Ho',
    artist: 'Arijit Singh',
    completion_rate: 100
}

// 9. Song Skipped
{
    song_id: 123,
    song_title: 'Tum Hi Ho',
    skip_position: 45,            // Position where skipped (seconds)
    skip_reason: 'next'           // 'next', 'prev', 'select'
}

// 10. Song Seeked
{
    song_id: 123,
    from_position: 30,            // Seconds
    to_position: 120              // Seconds
}

// 11. Volume Changed
{
    old_volume: 50,               // 0-100
    new_volume: 75                // 0-100
}

// 12. Playback Speed Changed
{
    old_speed: 1.0,               // 0.5, 1.0, 1.5, 2.0
    new_speed: 1.5
}

// 13. Queue Updated
{
    action: 'add',                // 'add', 'remove', 'clear'
    song_id: 123,
    position: 5,                  // Queue position
    songs_count: 10               // Total in queue
}

// 14. Shuffle Toggled
{
    enabled: true                 // true/false
}

// 15. Repeat Toggled
{
    mode: 'all'                   // 'off', 'one', 'all'
}

// 16. Buffering Started
{
    song_id: 123,
    position: 45                  // Position in seconds
}

// 17. Buffering Ended
{
    song_id: 123,
    buffer_duration: 2000         // Milliseconds
}
```

---

### 3. Discovery & Search Events

```javascript
// 18. Search Query
{
    query: 'arijit singh',
    results_count: 24
}

// 19. Search Result Clicked
{
    query: 'arijit singh',
    song_id: 123,
    position: 3,                  // Position in results
    result_type: 'song'           // 'song', 'album', 'artist'
}

// 20. Section Viewed
{
    section_id: 5,
    section_name: 'Top Punjabi Songs',
    language: 'Punjabi',
    songs_count: 20
}

// 21. Album Viewed
{
    album_id: 10,
    album_name: 'Kabir Singh',
    song_count: 12
}

// 22. Category Viewed
{
    category_id: 3,
    category_name: 'Romantic'
}

// 23. Song Clicked
{
    song_id: 123,
    source: 'section',            // 'section', 'album', 'search', 'playlist'
    position: 5
}

// 24. Featured Section Viewed
{
    featured_count: 8
}

// 25. Trending Section Viewed
{
    trending_count: 10
}

// 26. Quick Picks Viewed
{
    picks_count: 15
}
```

---

### 4. Playlist Events

```javascript
// 27. Playlist Created
{
    playlist_id: 42,
    playlist_name: 'My Favorites',
    is_public: false
}

// 28. Playlist Updated
{
    playlist_id: 42,
    fields_changed: ['name', 'description']
}

// 29. Playlist Deleted
{
    playlist_id: 42,
    songs_count: 25               // Songs that were in it
}

// 30. Playlist Viewed
{
    playlist_id: 42,
    songs_count: 25,
    is_own: true                  // User's own or someone else's
}

// 31. Playlist Played
{
    playlist_id: 42,
    songs_count: 25
}

// 32. Song Added to Playlist
{
    song_id: 123,
    song_title: 'Tum Hi Ho',
    playlist_id: 42
}

// 33. Song Removed from Playlist
{
    song_id: 123,
    song_title: 'Tum Hi Ho',
    playlist_id: 42
}

// 34. Song Favorited
{
    song_id: 123,
    song_title: 'Tum Hi Ho'
}

// 35. Song Unfavorited
{
    song_id: 123
}

// 36. Library Viewed
{
    playlists_count: 5,
    favorites_count: 50
}
```

---

### 5. Profile Events

```javascript
// 37. Profile Viewed
{
    is_own: true                  // Viewing own or someone else's
}

// 38. Profile Updated
{
    fields_changed: ['name', 'email', 'bio']
}

// 39. Avatar Changed
{
    method: 'upload'              // 'upload' or 'default'
}

// 40. Password Changed
{
    method: 'form'                // 'form' or 'reset'
}

// 41. Email Verified
{
    verification_method: 'link'   // 'link' or 'code'
}

// 42. Recently Played Viewed
{
    songs_count: 20
}
```

---

### 6. UI/UX Events

```javascript
// 43. Screen Viewed
{
    screen_name: 'home',
    load_time: 850,               // Milliseconds
    previous_screen: 'search'
}

// 44. Button Clicked
{
    button_name: 'play_button',
    location: 'song_card'
}

// 45. Modal Opened
{
    modal_name: 'login_modal'
}

// 46. Modal Closed
{
    modal_name: 'login_modal',
    duration: 45                  // Seconds modal was open
}

// 47. Tab Switched
{
    from_tab: 'home',
    to_tab: 'search'
}

// 48. Theme Toggled
{
    theme: 'dark'                 // 'light' or 'dark'
}

// 49. Language Changed
{
    from_lang: 'English',
    to_lang: 'Hindi'
}

// 50. Menu Opened
{
    menu_type: 'main_menu'
}

// 51. Swipe Gesture
{
    direction: 'left',            // 'left', 'right', 'up', 'down'
    screen: 'home'
}

// 52. Long Press
{
    target: 'song_card',
    action: 'show_menu'
}
```

---

### 7. Admin Events

```javascript
// 53. Admin Logged In
{
    username: 'admin'
}

// 54. Song Uploaded
{
    song_id: 123,
    method: 'manual',             // 'manual' or 'youtube'
    language: 'Hindi'
}

// 55. Song Updated
{
    song_id: 123,
    fields_changed: ['title', 'artist', 'cover']
}

// 56. Song Deleted
{
    song_id: 123,
    language: 'Hindi'
}

// 57. Album Updated
{
    album_id: 10,
    changes: ['name', 'cover']
}

// 58. Section Created
{
    section_id: 15,
    section_type: 'featured'
}

// 59. Section Updated
{
    section_id: 15,
    changes: ['name', 'order', 'songs']
}

// 60. Featured Songs Updated
{
    songs_count: 8
}
```

---

### 8. Performance Events

```javascript
// 61. App Loaded
{
    load_time: 1200,              // Milliseconds
    cache_hit: true
}

// 62. API Error
{
    endpoint: '/api/songs',
    status: 500,
    error_message: 'Internal Server Error'
}

// 63. Playback Error
{
    song_id: 123,
    error_type: 'MEDIA_ERR_NETWORK'
}

// 64. Network Error
{
    endpoint: '/api/playlists',
    status: 0,
    retry_count: 3
}

// 65. Slow Network Detected
{
    connection_type: '3g',
    speed: 'slow'
}

// 66. Error Occurred
{
    error_type: 'validation_error',
    error_message: 'Invalid email format',
    context: {
        form: 'signup',
        field: 'email'
    }
}
```

---

### 9. Business Events

```javascript
// 67. Song Shared
{
    song_id: 123,
    method: 'whatsapp'            // 'link', 'facebook', 'twitter', 'whatsapp'
}

// 68. Playlist Shared
{
    playlist_id: 42,
    method: 'link'
}

// 69. Download Requested
{
    song_id: 123,
    format: 'mp3'                 // 'mp3' or 'flac'
}

// 70. Subscription Viewed
{
    // No specific properties
}

// 71. Subscription Started
{
    plan: 'premium',
    price: 99,
    duration: 'monthly'           // 'monthly' or 'yearly'
}

// 72. Subscription Cancelled
{
    plan: 'premium',
    reason: 'too_expensive'
}
```

---

### 10. Engagement Events

```javascript
// 73. Listening Milestone
{
    type: '100_songs',            // '10_songs', '50_songs', '100_songs'
    count: 100
}

// 74. Daily Streak
{
    streak_count: 7               // Days in a row
}

// 75. Achievement Unlocked
{
    achievement_id: 'first_playlist',
    achievement_name: 'Playlist Master'
}

// 76. Notification Clicked
{
    notification_id: 'notif_123',
    type: 'new_song'
}

// 77. Push Permission Granted
{
    // No specific properties
}

// 78. Push Permission Denied
{
    // No specific properties
}
```

---

### 11. Error Events

```javascript
// 79. Authentication Error
{
    error_type: 'invalid_credentials',
    attempted_action: 'login'
}

// 80. Payment Error
{
    error_type: 'card_declined',
    error_message: 'Insufficient funds',
    plan: 'premium',
    amount: 99
}

// 81. Media Loading Error
{
    song_id: 123,
    error_code: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
    error_message: 'Format not supported'
}

// 82. Validation Error
{
    form_name: 'signup',
    field: 'email',
    error_message: 'Invalid email format'
}
```

---

## 🎯 Auto-Added Context (Every Event)

These properties are automatically added to EVERY event:

```javascript
{
    // User Context
    user_id: 123,                 // null for guests
    session_id: 'session_abc',
    device_id: 'device_xyz',
    anonymous_id: 'anon_123',     // RudderStack anonymous ID

    // Device Info
    platform: 'mobile',           // 'mobile' or 'desktop'
    os: 'iOS',
    browser: 'Chrome',
    screen_width: 1920,
    screen_height: 1080,
    viewport_width: 375,
    viewport_height: 667,
    network: '4g',
    user_agent: 'Mozilla/5.0...',

    // App Context
    app_version: '1.0.0',
    page_url: '/mobile',
    page_title: 'Stage Music',
    timestamp: '2024-01-20T10:30:45.123Z'
}
```

---

## 💡 Usage Examples

### Example 1: Track Song Play
```javascript
window.tracker.trackSongPlay(
    song,                         // Song object with id, title, singer, etc.
    'trending_section',           // Source
    3                             // Position
);
```

### Example 2: Track Search
```javascript
window.tracker.trackSearch(
    'arijit singh',               // Query
    24                            // Results count
);
```

### Example 3: Track Playlist Create
```javascript
window.tracker.trackPlaylistCreate(
    42,                           // Playlist ID
    'My Favorites',               // Playlist name
    false                         // Is public
);
```

### Example 4: Track Add to Playlist
```javascript
window.tracker.trackSongAddedToPlaylist(
    123,                          // Song ID
    42,                           // Playlist ID
    'Tum Hi Ho'                   // Song title (optional)
);
```

### Example 5: Track User Login
```javascript
// First identify
window.tracker.identifyUser(123, {
    name: 'John Doe',
    email: 'john@example.com'
});

// Then track login
window.tracker.trackLogin('email');
```

### Example 6: Track Custom Event
```javascript
window.tracker.track('Screen Viewed', {
    screen_name: 'home',
    previous_screen: 'search'
});
```

### Example 7: Track Error
```javascript
window.tracker.trackError(
    'network_error',              // Error type
    'Failed to load songs',       // Error message
    {
        endpoint: '/api/songs',   // Context
        status: 500
    }
);
```

---

## 🔑 Key Points

1. **Event names** in Title Case: "Song Played" not "song_play"
2. **Property names** in snake_case: "song_id" not "songId"
3. Always check if tracker exists: `if (window.tracker)`
4. Use convenience methods when available
5. Context properties are auto-added
6. Events are automatically batched and sent

---

## 📚 Complete Documentation

- **RUDDERSTACK_SETUP.md** - Quick start guide
- **RUDDERSTACK_INTEGRATION.md** - Full integration guide
- **RUDDERSTACK_EVENTS_LIST.md** - Detailed event specifications
- **TRACKING_SUMMARY.md** - Implementation summary

---

**Total Events**: 82
**Total Properties**: 200+
**Auto-added Context**: 15+ properties per event

Ye reference guide hai jisme saare events aur unke properties list hai. Copy-paste ready format mein hai, easily use kar sakte ho! 🎯
