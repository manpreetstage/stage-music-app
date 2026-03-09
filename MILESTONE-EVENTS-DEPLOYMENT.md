# 🎯 Listening Milestone Events - Deployment Summary

**Date:** 2026-02-23
**Status:** ✅ DEPLOYED & READY FOR TESTING

---

## 📊 What Was Done

### 1. New Event Names (Changed from old pattern)

**Old Events (NOT WORKING):**
- ❌ `song_30s_listened_web`
- ❌ `song_1min_listened_web`
- ❌ `song_2min_listened_web`
- ❌ `song_3min_listened_web`

**New Events (NOW DEPLOYED):**
- ✅ `listening_milestone_30s_web`
- ✅ `listening_milestone_1min_web`
- ✅ `listening_milestone_2min_web`
- ✅ `listening_milestone_3min_web`

### 2. Event Properties

Each event sends these properties:
```javascript
{
  song_id: 123,
  song_title: "Song Name",
  artist: "Artist Name",
  language: "Haryanvi",
  milestone: "30s" | "1min" | "2min" | "3min",  // NEW PROPERTY
  current_time: 30,  // seconds
  total_duration: 180,  // seconds
  completion_percentage: 16,  // %
  session_id: "session_xxx",
  device_id: "device_xxx",
  platform: "web",
  timestamp: "2026-02-23T10:30:00.000Z",
  page_url: "https://..."
}
```

### 3. Files Deployed

1. **`/var/www/stage-music-app/public/js/simple-tracker.js`**
   - Updated with new event names
   - Added `milestone` property
   - Total size: 494 lines

2. **`/var/www/stage-music-app/public/events-test.html`** (NEW)
   - Beautiful automated test page
   - Tests all 4 milestone events
   - Shows real-time results

3. **`/var/www/stage-music-app/public/version.txt`**
   - Updated timestamp for cache busting

---

## 🧪 HOW TO TEST

### Method 1: Automated Test Page (RECOMMENDED)

**URL:** `https://3-111-168-236.nip.io/events-test.html`

1. Open URL in browser
2. Click "Start Verification Test" button
3. Watch real-time results
4. Check summary (should show 4/4 successful)

### Method 2: Manual Browser Console Test

1. Open mobile app: `https://3-111-168-236.nip.io/mobile/`
2. Open DevTools Console (F12)
3. Paste this code:

```javascript
const testSong = {
  id: 999,
  title: 'Test Song',
  singer: 'Test Artist',
  language: 'Haryanvi'
};

// Test all milestones
window.tracker.trackSong30sListened(testSong, 30, 180);
window.tracker.trackSong1minListened(testSong, 60, 180);
window.tracker.trackSong2minListened(testSong, 120, 180);
window.tracker.trackSong3minListened(testSong, 180, 180);
```

4. Check Network tab for POST requests to `rudder-event-prod.stage.in`
5. All should return Status 200 ✅

### Method 3: Real Song Test

1. Play any song on mobile app
2. Let it play for 3+ minutes
3. Events will fire automatically at:
   - 30 seconds
   - 1 minute
   - 2 minutes
   - 3 minutes

---

## 🔍 VERIFY IN AMPLITUDE

### Check 1: Event Ingestion (5-10 minutes delay)

1. Login to Amplitude: `https://analytics.amplitude.com/`
2. Go to: **Data → Events**
3. Search for these events:
   - `listening_milestone_30s_web`
   - `listening_milestone_1min_web`
   - `listening_milestone_2min_web`
   - `listening_milestone_3min_web`

### Check 2: Event Schema Settings

**IF EVENTS ARE NOT SHOWING:**

This is the most common issue. Amplitude blocks new events by default if "Blocking Schema" is enabled.

**Fix Steps:**

1. Go to: **Settings → Projects → [Stage Music Project]**
2. Scroll to: **"Schema & Planning"** section
3. Check: **"Event Schema Enforcement"**

   **If ENABLED (Blocking mode):**
   - Events are automatically blocked
   - You need to manually add them

   **Solution A: Disable Schema Enforcement**
   ```
   Settings → Project Settings → Schema Enforcement → Disable
   ```

   **Solution B: Add Events Manually**
   ```
   Data → Govern → Event Types → Add Event Type
   ```
   Add these 4 events:
   - `listening_milestone_30s_web`
   - `listening_milestone_1min_web`
   - `listening_milestone_2min_web`
   - `listening_milestone_3min_web`

### Check 3: Plan Limits

Free/Growth plans have limits on:
- Number of unique event types
- Monthly event volume

**Check:** Settings → Usage & Billing

If you've hit the limit, you need to:
- Upgrade plan
- OR remove old unused events

---

## 🔧 VERIFY IN RUDDERSTACK

### Check 1: Live Events

1. Login to RudderStack: `https://app.rudderstack.com/`
2. Go to: **Sources → [Your Web Source] → Live Events**
3. Wait 1-2 minutes
4. Fire test events (use test page)
5. Check if events appear in live events feed

### Check 2: Destination Status

1. Go to: **Destinations → Amplitude → Live Events**
2. Check delivery status for your test events:
   - ✅ **Success** = Event delivered to Amplitude
   - ❌ **Failed** = Check error message

### Check 3: Event Filtering

**MOST COMMON ISSUE:**

1. Go to: **Destinations → Amplitude → Settings**
2. Scroll to: **"What events should we send to Amplitude?"**

   **Options:**
   - ✅ **All events** (Recommended - sends everything)
   - ⚠️ **Specific events only** (If this is selected, new events are blocked!)

3. **If filtering is enabled:**
   - Click "Edit"
   - Add the 4 new milestone events to allowlist
   - Save settings

---

## 📱 MOBILE APP INTEGRATION

Events automatically fire when users play songs.

**File:** `/var/www/stage-music-app/public/mobile/mobile.js`

**Code location:** Lines 1062-1082 (updateProgress function)

```javascript
// Track listening milestones - 4 separate events
if (window.tracker && currentSong) {
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration;

    // 30 seconds milestone
    if (!milestonesReached['30s'] && currentTime >= 30) {
        milestonesReached['30s'] = true;
        window.tracker.trackSong30sListened(currentSong, currentTime, duration);
    }

    // 1 minute milestone
    if (!milestonesReached['1min'] && currentTime >= 60) {
        milestonesReached['1min'] = true;
        window.tracker.trackSong1minListened(currentSong, currentTime, duration);
    }

    // ... 2min and 3min similar
}
```

**Milestone Reset:** When new song plays, all flags reset to `false`

---

## ✅ VERIFICATION CHECKLIST

### Immediate (Do Now):

- [ ] Open test page: `https://3-111-168-236.nip.io/events-test.html`
- [ ] Run automated test
- [ ] Verify 4/4 events show "Success ✓"
- [ ] Check Network tab - 4 POST requests with Status 200

### RudderStack (5 minutes):

- [ ] Login to RudderStack dashboard
- [ ] Check Sources → Live Events
- [ ] Verify milestone events are appearing
- [ ] Check Destinations → Amplitude → Settings
- [ ] Ensure event filtering is NOT blocking new events

### Amplitude (10-15 minutes):

- [ ] Login to Amplitude dashboard
- [ ] Go to Data → Events
- [ ] Search for "listening_milestone"
- [ ] Verify all 4 events appear
- [ ] If NOT appearing:
  - [ ] Check Schema Enforcement (disable if needed)
  - [ ] Check RudderStack event filtering
  - [ ] Wait 5-10 more minutes (ingestion delay)

### Production Testing (30 minutes):

- [ ] Play real song on mobile app
- [ ] Let it play for 3+ minutes
- [ ] Check browser console for milestone logs
- [ ] Check Amplitude for real events (not test events)

---

## 🚨 TROUBLESHOOTING

### Issue: Events fire but don't show in Amplitude

**Most Likely Cause:** Amplitude Schema Enforcement blocking new events

**Fix:**
1. Amplitude → Settings → Project Settings
2. Disable "Event Schema Enforcement"
3. OR manually add the 4 events to schema

---

### Issue: No events firing at all

**Check:**
1. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Check console for errors
3. Verify tracker loaded: Type `window.tracker` in console

**Fix:**
- Clear browser cache completely
- Check version.txt was updated (forces cache refresh)

---

### Issue: Some events work, some don't

**Check:**
1. RudderStack event filtering
2. Amplitude event schema (some events might be blocked)

**Fix:**
- Add all 4 events to RudderStack allowlist
- Add all 4 events to Amplitude schema

---

## 📞 SUPPORT

If events still don't appear after 15 minutes:

1. **Check RudderStack Dashboard:**
   - Go to Debugger tab
   - Look for any errors or warnings
   - Check transformation logs

2. **Check Amplitude Dashboard:**
   - Go to Settings → Event Schema
   - Verify events are not in "Blocked Events" list
   - Check project settings for ingestion filters

3. **Contact Support:**
   - RudderStack: support@rudderstack.com
   - Amplitude: support@amplitude.com

---

## 🎉 SUCCESS CRITERIA

**When everything is working, you should see:**

1. ✅ Test page shows 4/4 events successful
2. ✅ Network tab shows 4 POST requests with Status 200
3. ✅ RudderStack Live Events shows all 4 milestone events
4. ✅ Amplitude Events page shows all 4 milestone events
5. ✅ Real songs trigger milestone events at correct times

---

## 📊 ANALYTICS IMPACT

**What you can now track:**

- **User Engagement:** How long users actually listen to songs
- **Drop-off Points:** Where users stop listening
- **Popular Songs:** Which songs get listened to completion
- **Listening Patterns:** 30s preview vs full listen
- **Conversion Metrics:** Preview to full listen ratio

**Example Queries:**

1. **Songs with highest 3min completion rate:**
   ```
   Count of listening_milestone_3min_web
   Group by: song_title
   ```

2. **User retention curve:**
   ```
   - 30s listened: X users
   - 1min listened: Y users
   - 2min listened: Z users
   - 3min listened: W users
   ```

3. **Average listening time per song:**
   ```
   Calculate based on milestone counts
   ```

---

**Deployment Time:** 2026-02-23
**Status:** LIVE ✅
**Next Review:** Check Amplitude in 15 minutes

---

**Questions?**
All deployment files are in: `/Users/manpreetsingh/Thinking/stage-music-app/`
