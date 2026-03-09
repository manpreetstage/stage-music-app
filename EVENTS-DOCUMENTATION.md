# 📊 Stage Music - Complete Events Documentation

**Project:** Stage Music Mobile App
**Total Events:** 45 (41 Active ✅ + 4 Planned ⏳)
**Last Updated:** March 3, 2024
**Version:** 1.2.0

---

## Table of Contents

1. [Music Player Events](#-music-player-events-8-events)
2. [Search Events](#-search-events-4-events)
3. [Authentication Events](#-authentication-events-6-events)
4. [Playlist Events](#-playlist-events-7-events)
5. [Navigation & App Events](#-navigation--app-events-7-events)
6. [Music Collection & Section Events](#-music-collection--section-events-5-events)
7. [Album-Specific Events](#-album-specific-events-2-events)
8. [Session Tracking Events](#-session-tracking-events-3-events)
9. [Traffic Source Events](#-traffic-source-events-1-event)
10. [Error Events](#-error-events-2-events)

---

## 🎵 Music Player Events (8 Events)

### 1. **song_played_web** ✅

**Kya Hai:**
Jab koi user song play karta hai tab yeh event fire hota hai.

**Kab Fire Hota Hai:**
- User kisi song pe click kare
- Play button press kare
- Next/Previous song automatically shuru ho

**Kya Track Hota Hai:**
- Song ID aur title
- Artist/Singer ka naam
- Song ki language (Haryanvi/Rajasthani/Bhojpuri)
- Source: Kahan se play kiya (Trending/Quick Picks/Album/Search)
- Position: List mein kaunsi position pe tha song

**Kyun Zaroori Hai:**
- Sabse popular songs pata chalte hain
- Kis source se zyada songs play hote hain
- User preferences samajh mein aati hain

**Example:**
```javascript
{
  song_id: 123,
  song_title: "Haryanvi Dhamaka",
  artist: "Sapna Choudhary",
  language: "Haryanvi",
  source: "Trending",
  position: 2
}
```

---

### 2. **song_paused_web** ✅

**Kya Hai:**
Jab user song pause karta hai.

**Kab Fire Hota Hai:**
- Pause button press kare
- Mini player ya full player se pause kare

**Kya Track Hota Hai:**
- Kitna time song chala (seconds mein)
- Total duration kitna tha
- Completion percentage (kitna % sun liya)

**Kyun Zaroori Hai:**
- Pata chalta hai songs kitne engaging hain
- Agar users jaldi pause kar rahe to song quality issue ho sakta hai
- Average listening time pata chalta hai

**Example:**
```javascript
{
  song_id: 123,
  song_title: "Haryanvi Dhamaka",
  played_duration: 45,        // 45 seconds suna
  total_duration: 180,        // Total 3 minutes
  completion_percentage: 25   // 25% complete
}
```

---

### 3. **song_completed_web** ✅

**Kya Hai:**
Jab user pura song sun leta hai.

**Kab Fire Hota Hai:**
- Song end tak chale aur khatam ho jaaye
- User ne skip nahi kiya

**Kya Track Hota Hai:**
- Song ID aur title
- Timestamp

**Kyun Zaroori Hai:**
- Sabse engaging songs pata chalte hain
- Completion rate dekh sakte hain
- Quality songs identify kar sakte hain

**Example:**
```javascript
{
  song_id: 123,
  song_title: "Haryanvi Dhamaka"
}
```

---

### 4. **song_skipped_web** ✅

**Kya Hai:**
Jab user next ya previous button press karta hai.

**Kab Fire Hota Hai:**
- Next button click
- Previous button click
- Swipe gesture se skip

**Kya Track Hota Hai:**
- Current song details
- Direction: "next" ya "previous"

**Kyun Zaroori Hai:**
- Pata chalta hai kon se songs skip ho rahe hain
- User behavior patterns samajh mein aate hain
- Next vs Previous usage dekh sakte hain

**Example:**
```javascript
{
  song_id: 123,
  song_title: "Haryanvi Dhamaka",
  direction: "next"  // ya "previous"
}
```

---

### 5. **song_seeked_web** ✅

**Kya Hai:**
Jab user progress bar drag karke song ke specific part pe jaata hai.

**Kab Fire Hota Hai:**
- Progress bar pe click ya drag
- Touch aur swipe karke seek

**Kya Track Hota Hai:**
- Kahan se seeked (from_time)
- Kahan tak seeked (to_time)

**Kyun Zaroori Hai:**
- Users kis part ko repeat kar rahe hain
- Boring parts skip ho rahe hain ya nahi
- Engagement patterns dekh sakte hain

**Example:**
```javascript
{
  song_id: 123,
  from_time: 30,   // 30 seconds se
  to_time: 60      // 60 seconds pe jump kiya
}
```

---

### 6. **repeat_toggled_web** ✅

**Kya Hai:**
Jab user repeat mode change karta hai.

**Kab Fire Hota Hai:**
- Repeat button click kare
- Mode cycle ho: off → all → one → off

**Kya Track Hota Hai:**
- Current mode: "off", "all", ya "one"

**Kyun Zaroori Hai:**
- Feature usage pata chalta hai
- Repeat one: kon se songs zyada repeat hote hain
- User preferences samajh mein aati hain

**Example:**
```javascript
{
  mode: "one"  // "off", "all", "one"
}
```

---

### 7. **mini_player_expanded_web** ✅

**Kya Hai:**
Jab user mini player (bottom bar) ko click karke full player kholta hai.

**Kab Fire Hota Hai:**
- Mini player pe tap/click
- Swipe up gesture

**Kya Track Hota Hai:**
- Koi specific properties nahi, sirf event fire

**Kyun Zaroori Hai:**
- Feature usage pata chalta hai
- UI/UX improvements ke liye data
- User engagement level dekh sakte hain

---

### 8. **full_player_minimized_web** ✅

**Kya Hai:**
Jab user full player ko close karke mini player pe waapas aata hai.

**Kab Fire Hota Hai:**
- Minimize/back button click
- Swipe down gesture

**Kya Track Hota Hai:**
- Koi specific properties nahi

**Kyun Zaroori Hai:**
- Player usage patterns
- Session flow samajhne ke liye

---

## 🔍 Search Events (4 Events)

### 9. **search_query_web** ✅

**Kya Hai:**
Jab user kuch search karta hai.

**Kab Fire Hota Hai:**
- Search box mein type kare
- 300ms debounce ke baad fire hota hai

**Kya Track Hota Hai:**
- Search query (kya type kiya)
- Kitne results mile

**Kyun Zaroori Hai:**
- Popular searches pata chalte hain
- Missing songs identify kar sakte hain
- Content strategy improve kar sakte hain

**Example:**
```javascript
{
  query: "sapna choudhary",
  results_count: 15
}
```

---

### 10. **search_result_clicked_web** ✅

**Kya Hai:**
Jab user search results mein se kisi song pe click karta hai.

**Kab Fire Hota Hai:**
- Search result pe tap/click

**Kya Track Hota Hai:**
- Original query kya tha
- Konsa song select kiya
- Results mein kaunsi position pe tha (0-based)

**Kyun Zaroori Hai:**
- Search relevance check kar sakte hain
- Click-through rate (CTR) dekh sakte hain
- Search algorithm improve kar sakte hain

**Example:**
```javascript
{
  query: "sapna choudhary",
  song_id: 123,
  position: 2  // 3rd result pe click kiya
}
```

---

### 11. **search_no_results_web** ✅

**Kya Hai:**
Jab search karne pe koi result nahi milta.

**Kab Fire Hota Hai:**
- Query dala aur 0 results aaye

**Kya Track Hota Hai:**
- Wo query jo fail hui

**Kyun Zaroori Hai:**
- Missing content identify kar sakte hain
- Spelling mistakes ya variants dekh sakte hain
- Content gaps fill kar sakte hain

**Example:**
```javascript
{
  query: "sapna chudhary"  // typo example
}
```

---

### 12. **search_cleared_web** ⏳ (Planned)

**Kya Hai:**
Jab user search box clear karta hai.

**Kab Fire Hoga:**
- Clear/X button press

**Kyun Zaroori Hai:**
- Search flow completion tracking
- User behavior patterns

---

## 🔐 Authentication Events (6 Events)

### 13. **logged_in_web** ✅

**Kya Hai:**
Jab user successfully login karta hai.

**Kab Fire Hota Hai:**
- Login form submit
- Credentials verify ho jaaye

**Kya Track Hota Hai:**
- Login method: "email" (abhi sirf email available hai)

**Kyun Zaroori Hai:**
- Daily active users count
- Login success rate
- User retention tracking

**Example:**
```javascript
{
  method: "email"
}
```

---

### 14. **signed_up_web** ✅

**Kya Hai:**
Jab naya user account banata hai.

**Kab Fire Hota Hai:**
- Registration form submit
- Account successfully create ho

**Kya Track Hota Hai:**
- User ID (unique identifier)
- Registration method

**Kyun Zaroori Hai:**
- New user acquisition tracking
- Growth metrics
- Conversion funnel analysis

**Example:**
```javascript
{
  method: "email",
  user_id: 456
}
```

---

### 15. **logged_out_web** ✅

**Kya Hai:**
Jab user logout karta hai.

**Kab Fire Hota Hai:**
- Logout button click

**Kya Track Hota Hai:**
- Sirf event fire, no specific properties

**Kyun Zaroori Hai:**
- Session end tracking
- User behavior patterns
- Average session length before logout

---

### 16. **login_failed_web** ✅

**Kya Hai:**
Jab login attempt fail ho jaata hai.

**Kab Fire Hota Hai:**
- Wrong credentials enter kiye
- API error aaye

**Kya Track Hota Hai:**
- Error message (without sensitive data)

**Kyun Zaroori Hai:**
- Login issues identify kar sakte hain
- User experience improvements
- Security monitoring

**Example:**
```javascript
{
  error: "Invalid credentials"
}
```

---

### 17. **signup_failed_web** ✅

**Kya Hai:**
Jab registration fail ho jaaye.

**Kab Fire Hota Hai:**
- Duplicate email/username
- Validation errors
- Server errors

**Kya Track Hota Hai:**
- Error message

**Kyun Zaroori Hai:**
- Registration funnel optimization
- Common errors identify kar sakte hain
- UX improvements

**Example:**
```javascript
{
  error: "Email already exists"
}
```

---

### 18. **profile_viewed_web** ✅

**Kya Hai:**
Jab user profile tab kholta hai.

**Kab Fire Hota Hai:**
- Profile tab click/tap

**Kya Track Hota Hai:**
- Sirf event fire

**Kyun Zaroori Hai:**
- Feature usage tracking
- User engagement with profile section

---

## 📝 Playlist Events (7 Events)

### 19. **playlist_created_web** ✅

**Kya Hai:**
Jab user naya playlist banata hai.

**Kab Fire Hota Hai:**
- Create playlist form submit
- Playlist successfully create ho

**Kya Track Hota Hai:**
- Playlist ID aur naam
- Public hai ya private

**Kyun Zaroori Hai:**
- Feature adoption tracking
- User engagement metrics
- Content organization patterns

**Example:**
```javascript
{
  playlist_id: 789,
  playlist_name: "My Haryanvi Hits",
  is_public: false
}
```

---

### 20. **song_added_to_playlist_web** ✅

**Kya Hai:**
Jab user kisi playlist mein song add karta hai.

**Kab Fire Hota Hai:**
- "Add to playlist" option select
- Song successfully add ho

**Kya Track Hota Hai:**
- Song ID aur title
- Playlist ID

**Kyun Zaroori Hai:**
- Popular songs identify kar sakte hain
- Playlist curation patterns
- Feature usage

**Example:**
```javascript
{
  song_id: 123,
  song_title: "Haryanvi Dhamaka",
  playlist_id: 789
}
```

---

### 21. **song_removed_from_playlist_web** ✅

**Kya Hai:**
Jab user playlist se song remove karta hai.

**Kab Fire Hota Hai:**
- Remove/delete option select

**Kya Track Hota Hai:**
- Song ID aur title
- Playlist ID

**Kyun Zaroori Hai:**
- User curation behavior
- Song quality issues identify kar sakte hain

**Example:**
```javascript
{
  song_id: 123,
  song_title: "Haryanvi Dhamaka",
  playlist_id: 789
}
```

---

### 22. **playlist_viewed_web** ✅

**Kya Hai:**
Jab user kisi playlist ko detail mein dekhta hai.

**Kab Fire Hota Hai:**
- Playlist card pe click
- Playlist detail screen khule

**Kya Track Hota Hai:**
- Playlist ID aur naam

**Kyun Zaroori Hai:**
- Popular playlists tracking
- User engagement

**Example:**
```javascript
{
  playlist_id: 789,
  playlist_name: "My Haryanvi Hits"
}
```

---

### 23. **playlist_played_web** ✅

**Kya Hai:**
Jab user "Play All" karke pura playlist bajata hai.

**Kab Fire Hota Hai:**
- Play all button click
- Playlist ke first song se playback shuru ho

**Kya Track Hota Hai:**
- Playlist ID aur naam

**Kyun Zaroori Hai:**
- Feature usage
- Popular playlists identify kar sakte hain
- Engagement metrics

**Example:**
```javascript
{
  playlist_id: 789,
  playlist_name: "My Haryanvi Hits"
}
```

---

### 24. **playlist_deleted_web** ⏳ (Planned)

**Kya Hai:**
Jab user playlist delete karta hai.

**Kab Fire Hoga:**
- Delete confirmation ke baad

**Kyun Zaroori Hai:**
- User retention analysis
- Playlist quality insights

---

### 25. **playlist_edited_web** ⏳ (Planned)

**Kya Hai:**
Jab user playlist ka naam ya description change karta hai.

**Kab Fire Hoga:**
- Edit form submit

**Kyun Zaroori Hai:**
- Playlist management tracking
- Feature usage

---

## 📱 Navigation & App Events (7 Events)

### 26. **app_open_web** ⚡ ✅ (Auto-fires)

**Kya Hai:**
Jab koi user site/app kholta hai.

**Kab Fire Hota Hai:**
- Page load hote hi automatically
- Refresh pe bhi fire hota hai

**Kya Track Hota Hai:**
- App language setting

**Kyun Zaroori Hai:**
- Daily/Monthly active users (DAU/MAU)
- App opens per user
- Growth tracking

**Example:**
```javascript
{
  app_display_language: "en"
}
```

---

### 27. **mobile_app_opened_web** ⚡ ✅ (Auto-fires)

**Kya Hai:**
Additional event for mobile app opens (app_open ke saath).

**Kab Fire Hota Hai:**
- Page load pe automatically
- app_open ke saath hi fire hota hai

**Kya Track Hota Hai:**
- App language

**Kyun Zaroori Hai:**
- Separate mobile tracking
- Different analytics requirements

---

### 28. **screen_viewed_web** ✅

**Kya Hai:**
Jab user bottom navigation se tab switch karta hai.

**Kab Fire Hota Hai:**
- Home/Search/Library/Profile tab pe click

**Kya Track Hota Hai:**
- Screen name: "home", "search", "library", "profile"

**Kyun Zaroori Hai:**
- Feature usage tracking
- Navigation patterns
- Popular sections identify kar sakte hain

**Example:**
```javascript
{
  screen_name: "search"
}
```

---

### 29. **category_clicked_web** ✅

**Kya Hai:**
Jab user koi category kholta hai (jaise "Haryanvi Songs").

**Kab Fire Hota Hai:**
- Category card pe click
- Category detail screen khule

**Kya Track Hota Hai:**
- Category ID aur naam

**Kyun Zaroori Hai:**
- Popular categories tracking
- Content preferences
- Genre analysis

**Example:**
```javascript
{
  category_id: 7,
  category_name: "Haryanvi Songs"
}
```

---

### 30. **album_clicked_web** ✨ ✅ (Enhanced)

**Kya Hai:**
Jab user koi album kholta hai.

**Kab Fire Hota Hai:**
- Album card pe click

**Kya Track Hota Hai:**
- Album ID aur naam
- **Language** (Haryanvi/Rajasthani/Bhojpuri) 🆕 Enhanced

**Kyun Zaroori Hai:**
- Popular albums tracking
- Language-wise preferences
- Content strategy

**Example:**
```javascript
{
  album_id: 456,
  album_name: "Haryanvi Top 20",
  language: "Haryanvi"  // 🆕 NEW
}
```

---

### 31. **custom_section_clicked_web** ✅

**Kya Hai:**
Jab user Music Collection mein se koi section kholta hai.

**Kab Fire Hota Hai:**
- Haryanvi Tadka/Haryanvi Love etc. pe click

**Kya Track Hota Hai:**
- Section ID aur naam

**Kyun Zaroori Hai:**
- Curated content performance
- Popular sections identify kar sakte hain

**Example:**
```javascript
{
  section_id: 1,
  section_name: "Haryanvi Tadka"
}
```

---

### 32. **back_button_pressed_web** ✅

**Kya Hai:**
Jab user back button press karta hai.

**Kab Fire Hota Hai:**
- Category/Album/Search se wapas aaye
- Back navigation

**Kya Track Hota Hai:**
- Kahan se back aaya (from screen)

**Kyun Zaroori Hai:**
- Navigation flow analysis
- User journey tracking

**Example:**
```javascript
{
  from: "category"  // "album", "search", etc.
}
```

---

## 🎼 Music Collection & Section Events (5 Events)

### 33. **music_collection_viewed_web** ⚡ ✅ (Auto-fires)

**Kya Hai:**
Jab Music Collection section page pe load hota hai.

**Kab Fire Hota Hai:**
- Section render hote hi automatically
- Page load/refresh pe

**Kya Track Hota Hai:**
- Koi specific properties nahi

**Kyun Zaroori Hai:**
- Section visibility tracking
- Homepage engagement

---

### 34. **regional_hits_viewed_web** ⚡ ✅ (Auto-fires)

**Kya Hai:**
Jab Regional Hits section load hota hai.

**Kab Fire Hota Hai:**
- Section render hote hi automatically

**Kya Track Hota Hai:**
- Koi specific properties nahi

**Kyun Zaroori Hai:**
- Regional content visibility
- Section engagement

---

### 35. **regional_hits_category_clicked_web** ✅

**Kya Hai:**
Jab user Regional Hits mein se Haryanvi/Rajasthani/Bhojpuri pe click karta hai.

**Kab Fire Hota Hai:**
- Regional category card pe click

**Kya Track Hota Hai:**
- Language: "Haryanvi", "Rajasthani", "Bhojpuri"
- Category ID: 7, 10, 8

**Kyun Zaroori Hai:**
- Language-wise user preferences
- Regional content popularity
- Content planning

**Example:**
```javascript
{
  language: "Haryanvi",
  category_id: 7
}
```

---

### 36. **trending_section_viewed_web** ⚡ ✅ (Auto-fires)

**Kya Hai:**
Jab Trending section load hota hai.

**Kab Fire Hota Hai:**
- Section render hote hi automatically

**Kya Track Hota Hai:**
- Koi specific properties nahi

**Kyun Zaroori Hai:**
- Trending section visibility
- Homepage engagement

---

### 37. **trending_song_clicked_web** ✅

**Kya Hai:**
Jab user Trending section mein se kisi song pe click karta hai.

**Kab Fire Hota Hai:**
- Trending list ke song pe tap/click

**Kya Track Hota Hai:**
- Song ID aur title
- Position (trending list mein kaunsi rank pe tha)

**Kyun Zaroori Hai:**
- Trending algorithm effectiveness
- Click-through rate
- Position-wise engagement

**Example:**
```javascript
{
  song_id: 123,
  song_title: "Haryanvi Dhamaka",
  position: 2  // 3rd trending song
}
```

---

## 💿 Album-Specific Events (2 Events)

### 38. **album_clicked_web** ✨ ✅ (Same as #30)

Already covered above in Navigation Events.

---

### 39. **album_song_played_web** ✅

**Kya Hai:**
Jab user kisi album se song play karta hai (album context mein).

**Kab Fire Hota Hai:**
- Album detail screen se song play ho
- Album queue active ho

**Kya Track Hota Hai:**
- Song ID aur title
- Album ID aur naam
- Language

**Kyun Zaroori Hai:**
- Album engagement tracking
- Successful albums identify kar sakte hain
- Language-wise album performance

**Example:**
```javascript
{
  song_id: 123,
  song_title: "Haryanvi Dhamaka",
  album_id: 456,
  album_name: "Haryanvi Top 20",
  language: "Haryanvi"
}
```

**Note:** Yeh event SIRF album se play karne pe fire hota hai. Agar same song search/category se play ho to nahi fire hoga.

---

## 🕐 Session Tracking Events (3 Events)

### 40. **session_started_web** ⚡ ✅ (Auto-fires)

**Kya Hai:**
Jab user session shuru hota hai (site/app open karta hai).

**Kab Fire Hota Hai:**
- Page load hote hi automatically

**Kya Track Hota Hai:**
- Session start time (ISO timestamp)

**Kyun Zaroori Hai:**
- Session tracking ke liye base event
- User journey start point
- Session analytics foundation

**Example:**
```javascript
{
  session_start_time: "2024-03-03T08:30:00.000Z"
}
```

---

### 41. **session_ended_web** ⚡ ✅ (Auto-fires)

**Kya Hai:**
Jab user session end hota hai (tab close/switch/navigate away).

**Kab Fire Hota Hai:**
- Tab/window close kare
- Dusri tab pe switch kare
- Site se bahar jaaye

**Kya Track Hota Hai:**
- Session duration (seconds aur minutes mein)
- Kitne songs bajaye
- Kitne pages dekhe
- Session start aur end time

**Kyun Zaroori Hai:**
- **Average session duration** - Users kitna time ruk rahe hain
- **Engagement metrics** - Songs per session, pages per session
- **Retention analysis** - Short vs long sessions
- **User behavior** - Complete session journey

**Example:**
```javascript
{
  session_duration_seconds: 1845,    // 30 min 45 sec
  session_duration_minutes: 31,
  songs_played_count: 12,            // Session mein 12 songs bajaye
  pages_viewed_count: 5,             // 5 pages dekhe (tabs)
  session_start_time: "2024-03-03T08:30:00.000Z",
  session_end_time: "2024-03-03T09:00:45.000Z"
}
```

---

### 42. **session_heartbeat_web** ⚡ ✅ (Auto-fires every 30s)

**Kya Hai:**
Real-time session progress tracking - har 30 seconds pe fire hota hai.

**Kab Fire Hota Hai:**
- Automatically har 30 seconds pe
- Background mein chalta rehta hai

**Kya Track Hota Hai:**
- Current session duration
- User active hai ya idle
- Ab tak kitne songs bajaye
- Ab tak kitne pages dekhe
- Last activity kab hui

**Kyun Zaroori Hai:**
- **Real-time monitoring** - Kitne users abhi online hain
- **Active vs Idle** - Users engaged hain ya nahi
- **Live engagement** - Current activity level
- **Session quality** - Continuous interaction tracking

**Idle Detection:**
- User 2 minutes se koi activity nahi kare = idle
- Activity: mouse move, click, scroll, touch, keyboard

**Example:**
```javascript
{
  session_duration_seconds: 450,         // 7.5 minutes session
  is_user_active: true,                  // Abhi active hai
  songs_played_count: 3,                 // 3 songs bajaye
  pages_viewed_count: 2,                 // 2 pages dekhe
  last_activity_seconds_ago: 15          // 15 sec pehle activity hui
}
```

---

## 🎯 Traffic Source Events (1 Event)

### 43. **traffic_source_web** ⚡ ✅ (Auto-fires)

**Kya Hai:**
Track karta hai user kahan se site pe aaya - ad, social media, search, direct typing etc.

**Kab Fire Hota Hai:**
- Page load hote hi automatically
- Ek hi baar per session

**Kya Track Hota Hai:**

1. **Referrer Information:**
   - Referrer URL (konsi site se aaya)
   - Referrer domain (domain name)

2. **UTM Parameters** (Campaign Tracking):
   - utm_source: Facebook, Google, Instagram etc.
   - utm_medium: cpc, banner, email, story
   - utm_campaign: Campaign name
   - utm_content: Ad variant/content
   - utm_term: Search keywords

3. **Traffic Type** (Auto-detected):
   - "social": Facebook, Instagram, WhatsApp, Twitter, LinkedIn, YouTube
   - "search": Google, Bing, Yahoo, DuckDuckGo
   - "direct": Seedha URL type karke
   - "referral": Kisi aur website se
   - "internal": Same site ke dusre page se

4. **Landing Information:**
   - Landing page path
   - Complete landing URL

**Kyun Zaroori Hai:**
- **Campaign ROI** - Kaunsa ad campaign best perform kar raha hai
- **Channel effectiveness** - Facebook vs Instagram vs Google
- **Attribution** - User conversion kahan se ho raha hai
- **Content planning** - Kis source se quality traffic aa raha hai
- **Budget optimization** - Kahan invest karna chahiye

**Example 1: Facebook Ad Se Aaya**
```javascript
{
  referrer: "https://facebook.com",
  referrer_domain: "facebook.com",
  utm_source: "facebook",
  utm_medium: "cpc",
  utm_campaign: "haryanvi_launch",
  utm_content: "video_ad",
  utm_term: null,
  traffic_type: "social",
  landing_page: "/mobile/",
  landing_url: "https://3-111-168-236.nip.io/mobile/?utm_source=facebook&utm_medium=cpc&utm_campaign=haryanvi_launch",
  has_utm_params: true
}
```

**Example 2: Google Search Se Aaya**
```javascript
{
  referrer: "https://www.google.com/search?q=haryanvi+songs",
  referrer_domain: "www.google.com",
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  traffic_type: "search",
  landing_page: "/mobile/",
  landing_url: "https://3-111-168-236.nip.io/mobile/",
  has_utm_params: false
}
```

**Example 3: WhatsApp Link Se Aaya**
```javascript
{
  referrer: "https://web.whatsapp.com",
  referrer_domain: "web.whatsapp.com",
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  traffic_type: "social",
  landing_page: "/mobile/",
  landing_url: "https://3-111-168-236.nip.io/mobile/",
  has_utm_params: false
}
```

**Example 4: Direct Type Karke Aaya**
```javascript
{
  referrer: "direct",
  referrer_domain: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  traffic_type: "direct",
  landing_page: "/mobile/",
  landing_url: "https://3-111-168-236.nip.io/mobile/",
  has_utm_params: false
}
```

**UTM Link Building Example:**
```
Base URL: https://3-111-168-236.nip.io/mobile/

Facebook Ad:
https://3-111-168-236.nip.io/mobile/?utm_source=facebook&utm_medium=cpc&utm_campaign=haryanvi_launch&utm_content=video_ad

Instagram Story:
https://3-111-168-236.nip.io/mobile/?utm_source=instagram&utm_medium=story&utm_campaign=rajasthani_promo

WhatsApp Group:
https://3-111-168-236.nip.io/mobile/?utm_source=whatsapp&utm_medium=group_share&utm_campaign=viral_songs
```

---

## ❌ Error Events (2 Events - Planned)

### 44. **song_load_failed_web** ⏳ (Planned)

**Kya Hai:**
Jab song ki audio file load nahi hoti.

**Kab Fire Hoga:**
- Network error
- File not found
- Format not supported

**Kya Track Hoga:**
- Song ID
- Error message

**Kyun Zaroori Hai:**
- Technical issues identify kar sakte hain
- Broken links fix kar sakte hain
- User experience improve kar sakte hain

---

### 45. **error_occurred_web** ⏳ (Planned)

**Kya Hai:**
Generic error tracking for any app errors.

**Kab Fire Hoga:**
- API errors
- JavaScript errors
- Network failures

**Kya Track Hoga:**
- Error type
- Error message
- Context information

**Kyun Zaroori Hai:**
- App stability monitoring
- Bug fixing priority
- User experience improvements

---

## 📊 Events Summary

### Total: 45 Events
- ✅ **Active:** 41 events (LIVE and working)
- ⏳ **Planned:** 4 events (Future implementation)

### By Category:
| Category | Active | Planned | Total |
|----------|--------|---------|-------|
| 🎵 Music Player | 8 | 0 | 8 |
| 🔍 Search | 3 | 1 | 4 |
| 🔐 Authentication | 6 | 0 | 6 |
| 📝 Playlists | 5 | 2 | 7 |
| 📱 Navigation | 7 | 0 | 7 |
| 🎼 Sections | 5 | 0 | 5 |
| 💿 Albums | 2 | 0 | 2 |
| 🕐 Session | 3 | 0 | 3 |
| 🎯 Traffic Source | 1 | 0 | 1 |
| ❌ Errors | 0 | 2 | 2 |

### Auto-Fire Events (9):
1. app_open_web
2. mobile_app_opened_web
3. session_started_web
4. session_heartbeat_web (every 30s)
5. session_ended_web
6. traffic_source_web
7. music_collection_viewed_web
8. regional_hits_viewed_web
9. trending_section_viewed_web

---

## 🎯 Use Cases

### 1. Content Strategy
- Popular songs/albums tracking (song_played, album_clicked)
- Missing content identification (search_no_results)
- Language preferences (regional_hits_category_clicked, album language)
- Genre popularity (category_clicked)

### 2. User Engagement
- Session duration analysis (session_ended)
- Active vs idle users (session_heartbeat)
- Feature usage (playlist_created, search_query)
- Listening patterns (song_completed, song_skipped)

### 3. Marketing & Growth
- Campaign ROI (traffic_source with UTM)
- Channel effectiveness (traffic_type)
- User acquisition (signed_up, traffic_source)
- Viral growth (social traffic tracking)

### 4. Product Optimization
- Navigation patterns (screen_viewed, back_button_pressed)
- Feature adoption (playlist features, repeat_toggled)
- UI/UX improvements (mini_player_expanded, song_seeked)
- Error tracking (login_failed, search_no_results)

### 5. Retention & Monetization
- User retention (session metrics, returning users)
- Engagement quality (songs per session, completion rate)
- Premium feature usage (playlist management)
- High-value user identification (long sessions, high engagement)

---

## 🔧 Technical Information

**Implementation Files:**
- `simple-tracker.js` - 16KB (all tracking methods)
- `mobile.js` - 85KB (integration points)

**Endpoint:**
```
https://rudder-event-prod.stage.in/v1/track
```

**Write Key:**
```
36QF0PqNsJf4zj6W9LbkkXiUEM7
```

**Common Properties (All Events):**
```javascript
{
  session_id: "session_...",
  device_id: "device_...",
  platform: "web",
  timestamp: "2024-03-03T...",
  page_url: "https://...",
  anonymousId: "device_..."
}
```

**Event Naming Convention:**
- Base name: `event_name`
- Sent as: `event_name_web`
- All lowercase with underscores

---

## ✅ Status

**Deployment:** ✅ LIVE on production
**Last Updated:** March 3, 2024, 08:23 UTC
**Version:** 1.2.0
**Server:** 3.111.168.236
**Status:** All 41 active events working perfectly!

---

**Document End**
