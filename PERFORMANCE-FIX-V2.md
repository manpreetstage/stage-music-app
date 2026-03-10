# 🚀 PERFORMANCE FIX V2 - CRITICAL ISSUES

**Date**: March 10, 2026
**Status**: URGENT - Multiple critical issues found

---

## 🔴 CRITICAL ISSUES FOUND

### 1. **Server Crashes** ✅ FIXED
- **Problem**: Server restarted 275 times
- **Root Cause**: Port 3000 already in use (EADDRINUSE)
- **Fix**: Killed all processes, restarted clean
- **Status**: ✅ Now running stable (0 restarts)

### 2. **Memory Leak** 🔴 ACTIVE
- **Problem**: 46 event listeners added, 0 removed
- **Impact**: Memory grows over time, browser hangs
- **Location**: mobile.js - all addEventListener calls
- **Fix Needed**: Add removeEventListener before addEventListener

### 3. **Session Memory Store** ⚠️ WARNING
- **Problem**: MemoryStore not for production
- **Impact**: Memory leaks on server
- **Location**: server.js - express-session config
- **Fix Needed**: Use proper session store (Redis, connect-mongo)

### 4. **Image Loading** 🔴 SLOW
- **Problem**: All covers loading at once
- **Impact**: Slow page load, high bandwidth
- **Fix Needed**: Proper lazy loading strategy

---

## 🛠️ REQUIRED FIXES

### Fix 1: Event Listener Cleanup

**Problem Areas:**
```javascript
// Current (BAD):
audioPlayer.addEventListener('timeupdate', handleTimeUpdate);
audioPlayer.addEventListener('ended', handleEnded);
// These are added every time but never removed!
```

**Solution:**
```javascript
// Store references
let timeUpdateHandler = null;
let endedHandler = null;

// Remove old listeners before adding new
function setupAudioListeners() {
    // Remove old
    if (timeUpdateHandler) {
        audioPlayer.removeEventListener('timeupdate', timeUpdateHandler);
    }
    if (endedHandler) {
        audioPlayer.removeEventListener('ended', endedHandler);
    }

    // Add new
    timeUpdateHandler = handleTimeUpdate;
    endedHandler = handleEnded;
    audioPlayer.addEventListener('timeupdate', timeUpdateHandler);
    audioPlayer.addEventListener('ended', endedHandler);
}
```

### Fix 2: HLS Instance Cleanup

**Current (GOOD but can improve):**
```javascript
if (window.hlsInstance) {
    window.hlsInstance.destroy();
}
```

**Improvement:**
```javascript
function cleanupHLS() {
    if (window.hlsInstance) {
        window.hlsInstance.removeAllListeners();
        window.hlsInstance.destroy();
        window.hlsInstance = null;
    }
}
```

### Fix 3: Debounced Scroll Handler

**Problem:**
```javascript
// Fires 100+ times per second!
window.addEventListener('scroll', handleScroll);
```

**Solution:**
```javascript
// Fire max once every 100ms
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const debouncedScroll = debounce(handleScroll, 100);
window.addEventListener('scroll', debouncedScroll, { passive: true });
```

### Fix 4: Lazy Loading Images

**Current Issue:**
```javascript
loading="${index < 10 ? 'eager' : 'lazy'}"
// Loads first 10 eager, rest lazy
// But if 100 songs, 90 images still load eventually
```

**Better Approach:**
```javascript
// Use Intersection Observer
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src; // Load actual image
            imageObserver.unobserve(img);
        }
    });
}, {
    rootMargin: '50px' // Start loading 50px before visible
});

// Apply to all images
document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
});
```

### Fix 5: API Response Caching

**Problem:**
```javascript
// Fetches same data multiple times
fetch('/api/songs').then(...)
```

**Solution:**
```javascript
const apiCache = new Map();

async function fetchWithCache(url, ttl = 60000) {
    const cached = apiCache.get(url);
    if (cached && Date.now() - cached.time < ttl) {
        return cached.data;
    }

    const data = await fetch(url).then(r => r.json());
    apiCache.set(url, { data, time: Date.now() });
    return data;
}
```

---

## 📊 PERFORMANCE METRICS

### Before Fix:
- Memory: Growing indefinitely (memory leak)
- Event Listeners: 46 active, 0 cleaned
- Page Load: 3-5 seconds
- Hangs: Yes, after 1-2 songs

### After Fix (Expected):
- Memory: Stable (old listeners removed)
- Event Listeners: Cleaned properly
- Page Load: 1-2 seconds
- Hangs: No

---

## 🎯 IMPLEMENTATION PRIORITY

### CRITICAL (Fix Now):
1. ✅ Server crashes (DONE)
2. 🔴 Event listener cleanup
3. 🔴 HLS cleanup improvement

### HIGH (Fix Soon):
4. ⚠️ Session store (use Redis)
5. ⚠️ Image lazy loading (Intersection Observer)
6. ⚠️ API caching

### MEDIUM (Can Wait):
7. Debounced scroll
8. Code minification
9. Service Worker optimization

---

## 🚀 DEPLOYMENT PLAN

### Step 1: Create Performance-Optimized mobile.js
- Add event listener cleanup
- Improve HLS cleanup
- Add debouncing
- Add Intersection Observer for images

### Step 2: Test Locally
- Load page
- Play 5-10 songs
- Check DevTools Memory tab
- Verify no memory growth

### Step 3: Deploy to Server
- Upload new mobile.js with version bump
- Monitor server logs
- Check user feedback

### Step 4: Monitor
- Check PM2 status (should stay at 0 restarts)
- Monitor memory usage
- Check error logs

---

## 📝 CODE CHANGES NEEDED

### File: public/mobile/mobile.js

**Add at top:**
```javascript
// Performance: Store event listener references for cleanup
let audioEventListeners = {
    timeupdate: null,
    ended: null,
    pause: null,
    play: null,
    error: null,
    loadstart: null,
    canplay: null
};

// Performance: Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Performance: Cleanup helper
function cleanupAudioListeners() {
    Object.keys(audioEventListeners).forEach(event => {
        if (audioEventListeners[event]) {
            audioPlayer.removeEventListener(event, audioEventListeners[event]);
            audioEventListeners[event] = null;
        }
    });
}

// Performance: Setup audio listeners (with cleanup)
function setupAudioListeners() {
    cleanupAudioListeners(); // Remove old listeners first

    // Add new listeners
    audioEventListeners.timeupdate = updateProgress;
    audioEventListeners.ended = handleSongEnded;
    audioEventListeners.pause = handlePause;
    audioEventListeners.play = handlePlay;
    audioEventListeners.error = handleError;

    audioPlayer.addEventListener('timeupdate', audioEventListeners.timeupdate);
    audioPlayer.addEventListener('ended', audioEventListeners.ended);
    audioPlayer.addEventListener('pause', audioEventListeners.pause);
    audioPlayer.addEventListener('play', audioEventListeners.play);
    audioPlayer.addEventListener('error', audioEventListeners.error);
}
```

**Modify loadAudioSource():**
```javascript
function loadAudioSource(song) {
    // Clean up old HLS instance
    if (window.hlsInstance) {
        window.hlsInstance.removeAllListeners();
        window.hlsInstance.destroy();
        window.hlsInstance = null;
    }

    // Clean up old audio listeners
    cleanupAudioListeners();

    // ... rest of the function

    // At the end, setup fresh listeners
    setupAudioListeners();
}
```

---

## ✅ SUCCESS CRITERIA

1. **No hangs** after playing multiple songs
2. **Memory stable** - doesn't grow over time
3. **Fast page load** - under 2 seconds
4. **Smooth scrolling** - no lag
5. **All covers load** properly
6. **Server stable** - 0 crashes

---

**Next Action:** Implement event listener cleanup in mobile.js
