# Stage Music - RudderStack Events Specification

## 📊 Complete Event List (82 Events)

All events follow RudderStack best practices:
- **Title Case** for event names (e.g., "Song Played")
- **snake_case** for property keys (e.g., "song_id")
- Standard e-commerce event mapping where applicable

---

## Category 1: Authentication & User Events (5 events)

### 1. `Signed Up`
**Description:** User creates a new account
**RudderStack Method:** `track()` + `identify()`
**Properties:**
```javascript
{
    method: string,              // 'email' or 'social'
    user_id: number,             // New user ID
    referral_source: string      // 'direct', 'ad', 'social'
}
```

### 2. `Logged In`
**Description:** User logs into their account
**RudderStack Method:** `track()`
**Properties:**
```javascript
{
    method: string,              // 'email' or 'social'
    is_remember_me: boolean      // Remember me checkbox
}
```

### 3. `Logged Out`
**Description:** User logs out
**RudderStack Method:** `track()` + `reset()`
**Properties:**
```javascript
{
    session_duration: number     // Total session time in seconds
}
```

### 4. `Session Started`
**Description:** User starts a new session
**RudderStack Method:** `track()`
**Properties:**
```javascript
{
    is_returning_user: boolean,  // Has visited before
    device_id: string,           // Persistent device ID
    session_id: string           // Current session ID
}
```

### 5. `Session Ended`
**Description:** Session ends (timeout or logout)
**RudderStack Method:** `track()`
**Properties:**
```javascript
{
    duration: number,            // Session duration in seconds
    events_count: number         // Total events in session
}
```

---

## Category 2: Playback Events (12 events)

### 6. `Song Played`
**Description:** User plays a song
**RudderStack Mapping:** Similar to "Product Clicked"
**Properties:**
```javascript
{
    song_id: number,             // Unique song ID
    song_title: string,          // Song name
    artist: string,              // Singer/Artist name
    language: string,            // Hindi/Punjabi/English
    source: string,              // Where played from (trending/album/search)
    position: number,            // Position in list (0-based)
    duration: number,            // Song duration in seconds
    cover_image: string          // Cover image URL
}
```

### 7. `Song Paused`
**Description:** User pauses a playing song
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    song_title: string,          // Song name
    artist: string,              // Artist name
    played_duration: number,     // Seconds played before pause
    total_duration: number,      // Total song duration
    completion_percentage: number // 0-100
}
```

### 8. `Song Completed`
**Description:** Song finished playing (100% completion)
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    song_title: string,          // Song name
    artist: string,              // Artist name
    completion_rate: number      // Always 100
}
```

### 9. `Song Skipped`
**Description:** User skips to next/previous song
**Properties:**
```javascript
{
    song_id: number,             // Song ID that was skipped
    song_title: string,          // Song name
    skip_position: number,       // Position in seconds where skipped
    skip_reason: string          // 'next', 'prev', 'select'
}
```

### 10. `Song Seeked`
**Description:** User scrubs/seeks within a song
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    from_position: number,       // Starting position in seconds
    to_position: number          // Ending position in seconds
}
```

### 11. `Volume Changed`
**Description:** User adjusts volume
**Properties:**
```javascript
{
    old_volume: number,          // Previous volume (0-100)
    new_volume: number           // New volume (0-100)
}
```

### 12. `Playback Speed Changed`
**Description:** User changes playback speed
**Properties:**
```javascript
{
    old_speed: number,           // Previous speed (0.5, 1.0, 1.5, 2.0)
    new_speed: number            // New speed
}
```

### 13. `Queue Updated`
**Description:** User modifies play queue
**Properties:**
```javascript
{
    action: string,              // 'add', 'remove', 'clear'
    song_id: number,             // Song ID (if add/remove)
    position: number,            // Queue position
    songs_count: number          // Total songs in queue
}
```

### 14. `Shuffle Toggled`
**Description:** User toggles shuffle mode
**Properties:**
```javascript
{
    enabled: boolean             // Shuffle on or off
}
```

### 15. `Repeat Toggled`
**Description:** User changes repeat mode
**Properties:**
```javascript
{
    mode: string                 // 'off', 'one', 'all'
}
```

### 16. `Buffering Started`
**Description:** Audio starts buffering
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    position: number             // Position in seconds where buffering started
}
```

### 17. `Buffering Ended`
**Description:** Audio finished buffering
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    buffer_duration: number      // Time spent buffering in milliseconds
}
```

---

## Category 3: Discovery & Search Events (9 events)

### 18. `Search Query`
**Description:** User performs a search
**RudderStack Mapping:** Similar to "Products Searched"
**Properties:**
```javascript
{
    query: string,               // Search query text
    results_count: number        // Number of results returned
}
```

### 19. `Search Result Clicked`
**Description:** User clicks on a search result
**Properties:**
```javascript
{
    query: string,               // Original search query
    song_id: number,             // Song that was clicked
    position: number,            // Position in search results (0-based)
    result_type: string          // 'song', 'album', 'artist'
}
```

### 20. `Section Viewed`
**Description:** User opens a music section
**Properties:**
```javascript
{
    section_id: number,          // Section ID
    section_name: string,        // Section name (e.g., "Top Punjabi Songs")
    language: string,            // Section language
    songs_count: number          // Number of songs in section
}
```

### 21. `Album Viewed`
**Description:** User opens an album
**Properties:**
```javascript
{
    album_id: number,            // Album ID
    album_name: string,          // Album title
    song_count: number           // Songs in album
}
```

### 22. `Category Viewed`
**Description:** User opens a category
**Properties:**
```javascript
{
    category_id: number,         // Category ID
    category_name: string        // Category name
}
```

### 23. `Song Clicked`
**Description:** User clicks on a song anywhere in the app
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    source: string,              // Where clicked ('section', 'album', 'search', 'playlist')
    position: number             // Position in the list
}
```

### 24. `Featured Section Viewed`
**Description:** User views featured songs section
**Properties:**
```javascript
{
    featured_count: number       // Number of featured songs
}
```

### 25. `Trending Section Viewed`
**Description:** User views trending songs
**Properties:**
```javascript
{
    trending_count: number       // Number of trending songs
}
```

### 26. `Quick Picks Viewed`
**Description:** User views quick picks section
**Properties:**
```javascript
{
    picks_count: number          // Number of quick picks
}
```

---

## Category 4: Playlist Events (10 events)

### 27. `Playlist Created`
**Description:** User creates a new playlist
**RudderStack Mapping:** Similar to "Cart Created"
**Properties:**
```javascript
{
    playlist_id: number,         // New playlist ID
    playlist_name: string,       // Playlist name
    is_public: boolean           // Public or private
}
```

### 28. `Playlist Updated`
**Description:** User edits playlist details
**Properties:**
```javascript
{
    playlist_id: number,         // Playlist ID
    fields_changed: array        // ['name', 'description', 'public']
}
```

### 29. `Playlist Deleted`
**Description:** User deletes a playlist
**RudderStack Mapping:** Similar to "Cart Cleared"
**Properties:**
```javascript
{
    playlist_id: number,         // Deleted playlist ID
    songs_count: number          // Number of songs that were in it
}
```

### 30. `Playlist Viewed`
**Description:** User opens a playlist
**RudderStack Mapping:** Similar to "Cart Viewed"
**Properties:**
```javascript
{
    playlist_id: number,         // Playlist ID
    songs_count: number,         // Songs in playlist
    is_own: boolean              // User's own playlist or someone else's
}
```

### 31. `Playlist Played`
**Description:** User plays entire playlist
**Properties:**
```javascript
{
    playlist_id: number,         // Playlist ID
    songs_count: number          // Number of songs
}
```

### 32. `Song Added to Playlist`
**Description:** User adds song to playlist
**RudderStack Mapping:** Similar to "Product Added"
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    song_title: string,          // Song name
    playlist_id: number          // Target playlist ID
}
```

### 33. `Song Removed from Playlist`
**Description:** User removes song from playlist
**RudderStack Mapping:** Similar to "Product Removed"
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    song_title: string,          // Song name
    playlist_id: number          // Playlist ID
}
```

### 34. `Song Favorited`
**Description:** User adds song to favorites
**RudderStack Mapping:** Similar to "Product Added to Wishlist"
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    song_title: string           // Song name
}
```

### 35. `Song Unfavorited`
**Description:** User removes song from favorites
**RudderStack Mapping:** Similar to "Product Removed from Wishlist"
**Properties:**
```javascript
{
    song_id: number              // Song ID
}
```

### 36. `Library Viewed`
**Description:** User opens their library
**Properties:**
```javascript
{
    playlists_count: number,     // User's playlists
    favorites_count: number      // User's favorite songs
}
```

---

## Category 5: Profile Events (6 events)

### 37. `Profile Viewed`
**Description:** Profile page opened
**Properties:**
```javascript
{
    is_own: boolean              // Viewing own profile or someone else's
}
```

### 38. `Profile Updated`
**Description:** User updates profile info
**Properties:**
```javascript
{
    fields_changed: array        // ['name', 'email', 'bio', 'avatar']
}
```

### 39. `Avatar Changed`
**Description:** User changes profile picture
**Properties:**
```javascript
{
    method: string               // 'upload' or 'default'
}
```

### 40. `Password Changed`
**Description:** User changes password
**Properties:**
```javascript
{
    method: string               // 'form' or 'reset'
}
```

### 41. `Email Verified`
**Description:** User verifies email address
**Properties:**
```javascript
{
    verification_method: string  // 'link' or 'code'
}
```

### 42. `Recently Played Viewed`
**Description:** User views recently played section
**Properties:**
```javascript
{
    songs_count: number          // Number of recently played songs
}
```

---

## Category 6: UI/UX Events (10 events)

### 43. `Screen Viewed`
**Description:** User navigates to a new screen
**RudderStack Method:** `page()`
**Properties:**
```javascript
{
    screen_name: string,         // Screen name (home/search/library/profile)
    load_time: number,           // Load time in milliseconds
    previous_screen: string      // Previous screen name
}
```

### 44. `Button Clicked`
**Description:** User clicks a button
**Properties:**
```javascript
{
    button_name: string,         // Button identifier
    location: string             // Where on the screen
}
```

### 45. `Modal Opened`
**Description:** Modal/dialog opened
**Properties:**
```javascript
{
    modal_name: string           // Modal identifier
}
```

### 46. `Modal Closed`
**Description:** Modal/dialog closed
**Properties:**
```javascript
{
    modal_name: string,          // Modal identifier
    duration: number             // How long modal was open (seconds)
}
```

### 47. `Tab Switched`
**Description:** User switches tabs
**Properties:**
```javascript
{
    from_tab: string,            // Previous tab
    to_tab: string               // New tab
}
```

### 48. `Theme Toggled`
**Description:** User changes theme
**Properties:**
```javascript
{
    theme: string                // 'light' or 'dark'
}
```

### 49. `Language Changed`
**Description:** User changes app language
**Properties:**
```javascript
{
    from_lang: string,           // Previous language
    to_lang: string              // New language
}
```

### 50. `Menu Opened`
**Description:** User opens menu
**Properties:**
```javascript
{
    menu_type: string            // Menu identifier
}
```

### 51. `Swipe Gesture`
**Description:** User performs swipe gesture
**Properties:**
```javascript
{
    direction: string,           // 'left', 'right', 'up', 'down'
    screen: string               // Screen where swipe occurred
}
```

### 52. `Long Press`
**Description:** User long-presses element
**Properties:**
```javascript
{
    target: string,              // Element identifier
    action: string               // Action taken
}
```

---

## Category 7: Admin Events (8 events)

### 53. `Admin Logged In`
**Description:** Admin user logs in
**Properties:**
```javascript
{
    username: string             // Admin username
}
```

### 54. `Song Uploaded`
**Description:** Admin uploads a new song
**Properties:**
```javascript
{
    song_id: number,             // New song ID
    method: string,              // 'manual' or 'youtube'
    language: string             // Song language
}
```

### 55. `Song Updated`
**Description:** Admin edits song details
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    fields_changed: array        // ['title', 'artist', 'cover']
}
```

### 56. `Song Deleted`
**Description:** Admin deletes a song
**Properties:**
```javascript
{
    song_id: number,             // Deleted song ID
    language: string             // Song language
}
```

### 57. `Album Updated`
**Description:** Admin edits album
**Properties:**
```javascript
{
    album_id: number,            // Album ID
    changes: array               // ['name', 'cover', 'songs']
}
```

### 58. `Section Created`
**Description:** Admin creates new section
**Properties:**
```javascript
{
    section_id: number,          // New section ID
    section_type: string         // Section type
}
```

### 59. `Section Updated`
**Description:** Admin edits section
**Properties:**
```javascript
{
    section_id: number,          // Section ID
    changes: array               // ['name', 'order', 'songs']
}
```

### 60. `Featured Songs Updated`
**Description:** Admin updates featured songs
**Properties:**
```javascript
{
    songs_count: number          // Number of featured songs
}
```

---

## Category 8: Performance Events (6 events)

### 61. `App Loaded`
**Description:** App finished loading
**Properties:**
```javascript
{
    load_time: number,           // Load time in milliseconds
    cache_hit: boolean           // Loaded from cache
}
```

### 62. `API Error`
**Description:** API call failed
**Properties:**
```javascript
{
    endpoint: string,            // API endpoint
    status: number,              // HTTP status code
    error_message: string        // Error description
}
```

### 63. `Playback Error`
**Description:** Audio playback error
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    error_type: string           // Error type/code
}
```

### 64. `Network Error`
**Description:** Network request failed
**Properties:**
```javascript
{
    endpoint: string,            // Failed endpoint
    status: number,              // Status code
    retry_count: number          // Number of retries attempted
}
```

### 65. `Slow Network Detected`
**Description:** Slow connection detected
**Properties:**
```javascript
{
    connection_type: string,     // '3g', '4g', 'wifi'
    speed: string                // Connection speed
}
```

### 66. `Error Occurred`
**Description:** Generic error
**Properties:**
```javascript
{
    error_type: string,          // Error category
    error_message: string,       // Error description
    context: object              // Additional context
}
```

---

## Category 9: Business Events (6 events)

### 67. `Song Shared`
**Description:** User shares a song
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    method: string               // 'link', 'facebook', 'twitter', 'whatsapp'
}
```

### 68. `Playlist Shared`
**Description:** User shares a playlist
**Properties:**
```javascript
{
    playlist_id: number,         // Playlist ID
    method: string               // Share method
}
```

### 69. `Download Requested`
**Description:** User requests song download
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    format: string               // 'mp3', 'flac'
}
```

### 70. `Subscription Viewed`
**Description:** User views pricing page
**Properties:**
```javascript
{
    // No specific properties
}
```

### 71. `Subscription Started`
**Description:** User subscribes to premium
**Properties:**
```javascript
{
    plan: string,                // Plan name
    price: number,               // Price paid
    duration: string             // 'monthly' or 'yearly'
}
```

### 72. `Subscription Cancelled`
**Description:** User cancels subscription
**Properties:**
```javascript
{
    plan: string,                // Plan name
    reason: string               // Cancellation reason
}
```

---

## Category 10: Engagement Events (6 events)

### 73. `Listening Milestone`
**Description:** User reaches listening milestone
**Properties:**
```javascript
{
    type: string,                // '10_songs', '50_songs', '100_songs'
    count: number                // Exact count
}
```

### 74. `Daily Streak`
**Description:** User maintains daily streak
**Properties:**
```javascript
{
    streak_count: number         // Days in a row
}
```

### 75. `Achievement Unlocked`
**Description:** User unlocks an achievement
**Properties:**
```javascript
{
    achievement_id: string,      // Achievement ID
    achievement_name: string     // Achievement name
}
```

### 76. `Notification Clicked`
**Description:** User clicks notification
**Properties:**
```javascript
{
    notification_id: string,     // Notification ID
    type: string                 // Notification type
}
```

### 77. `Push Permission Granted`
**Description:** User enables push notifications
**Properties:**
```javascript
{
    // No specific properties
}
```

### 78. `Push Permission Denied`
**Description:** User denies push notifications
**Properties:**
```javascript
{
    // No specific properties
}
```

---

## Category 11: Error Events (4 events)

### 79. `Authentication Error`
**Description:** Authentication failed
**Properties:**
```javascript
{
    error_type: string,          // Error type
    attempted_action: string     // What user tried to do
}
```

### 80. `Payment Error`
**Description:** Payment failed
**Properties:**
```javascript
{
    error_type: string,          // Error type
    error_message: string,       // Error description
    plan: string,                // Plan attempted
    amount: number               // Amount
}
```

### 81. `Media Loading Error`
**Description:** Failed to load media
**Properties:**
```javascript
{
    song_id: number,             // Song ID
    error_code: string,          // Error code
    error_message: string        // Error description
}
```

### 82. `Validation Error`
**Description:** Form validation error
**Properties:**
```javascript
{
    form_name: string,           // Form identifier
    field: string,               // Field that failed
    error_message: string        // Validation error
}
```

---

## 📊 Summary

**Total Events**: 82 events

**By Category:**
- Authentication & User: 5 events
- Playback: 12 events
- Discovery & Search: 9 events
- Playlists: 10 events
- Profile: 6 events
- UI/UX: 10 events
- Admin: 8 events
- Performance: 6 events
- Business: 6 events
- Engagement: 6 events
- Errors: 4 events

---

## 🎯 Standard Context (Auto-Added to All Events)

These properties are automatically added by the tracker:

```javascript
{
    // User Context
    user_id: number,             // Logged in user ID (null for guests)
    session_id: string,          // Current session ID
    device_id: string,           // Persistent device ID
    anonymous_id: string,        // RudderStack anonymous ID

    // Device Info
    platform: string,            // 'mobile' or 'desktop'
    os: string,                  // 'iOS', 'Android', 'Windows', 'macOS', 'Linux'
    browser: string,             // 'Chrome', 'Safari', 'Firefox', 'Edge'
    screen_width: number,        // Screen width in pixels
    screen_height: number,       // Screen height in pixels
    viewport_width: number,      // Viewport width
    viewport_height: number,     // Viewport height
    network: string,             // '4g', '3g', 'wifi', etc.
    user_agent: string,          // Full user agent string

    // App Context
    app_version: string,         // App version (e.g., '1.0.0')
    page_url: string,            // Current page path
    page_title: string,          // Page title
    timestamp: string            // ISO 8601 timestamp
}
```

---

## 💡 Usage

```javascript
// Track with convenience method
window.tracker.trackSongPlay(song, 'trending', 3);

// Track manually
window.tracker.track('Song Played', {
    song_id: song.id,
    song_title: song.title,
    artist: song.singer,
    language: song.language,
    source: 'trending',
    position: 3
});

// Identify user
window.tracker.identifyUser(userId, {
    name: 'John Doe',
    email: 'john@example.com'
});

// Track page view
window.tracker.trackPageView('Home', {
    section: 'trending'
});
```

---

**Last Updated:** 2024-01-20
**Version:** 2.0.0 - RudderStack Integration
