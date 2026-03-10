# 📚 STAGE MUSIC APP - COMPLETE DOCUMENTATION

**Last Updated**: March 10, 2026
**Current Version**: 1.6
**Status**: Production Ready ✅

---

## 📁 DOCUMENTATION STRUCTURE

```
docs/
├── README.md (this file)               # Main documentation index
├── architecture/
│   ├── SYSTEM-OVERVIEW.md             # Complete system architecture
│   ├── FRONTEND-STRUCTURE.md          # Mobile app structure
│   └── BACKEND-STRUCTURE.md           # Server structure
├── deployment/
│   ├── DEPLOYMENT-GUIDE.md            # How to deploy changes
│   ├── SERVER-SETUP.md                # Server configuration
│   └── PM2-MANAGEMENT.md              # PM2 process management
├── api/
│   ├── API-ENDPOINTS.md               # All API routes
│   └── API-EXAMPLES.md                # API usage examples
├── database/
│   ├── SCHEMA.md                      # Database schema
│   └── QUERIES.md                     # Common queries
└── troubleshooting/
    ├── COMMON-ISSUES.md               # Common problems & fixes
    ├── PERFORMANCE-FIXES.md           # Performance optimization history
    └── ERROR-CODES.md                 # Error messages reference
```

---

## 🚀 QUICK START

### For New Developer:
1. Read: `deployment/SERVER-SETUP.md`
2. Read: `architecture/SYSTEM-OVERVIEW.md`
3. Read: `deployment/DEPLOYMENT-GUIDE.md`

### For Debugging:
1. Check: `troubleshooting/COMMON-ISSUES.md`
2. Check: `troubleshooting/PERFORMANCE-FIXES.md`
3. Check: Server logs: `ssh ubuntu@3.111.168.236` → `pm2 logs`

### For API Work:
1. Read: `api/API-ENDPOINTS.md`
2. Read: `database/SCHEMA.md`

---

## 📞 KEY INFORMATION

### Production Server
```bash
IP: 3.111.168.236
User: ubuntu
SSH Key: ~/stage-music-key.pem
SSH Command: ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236
```

### URLs
```
Web App: https://3-111-168-236.nip.io/
Mobile: https://3-111-168-236.nip.io/mobile/
API: http://3.111.168.236:3000/api/
```

### GitHub Repositories
```
Backend: manpreetstage/stage-music-backend
Frontend: manpreetstage/stage-music-frontend
Combined: manpreetstage/stage-music-app
```

### Services (PM2)
```bash
pm2 status
# 0 | stage-music-server    (Main API server)
# 1 | auto-hls-converter    (Background HLS converter)
```

---

## 🔧 COMMON COMMANDS

### Deploy Changes
```bash
# 1. Upload file
scp -i ~/stage-music-key.pem file.js ubuntu@3.111.168.236:/var/www/stage-music-app/

# 2. Restart if needed
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 restart all"
```

### Check Server Status
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 status"
```

### View Logs
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 logs stage-music-server --lines 50"
```

### Database Query
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236
cd /var/www/stage-music-app
sqlite3 stage_music.db "SELECT COUNT(*) FROM songs;"
```

---

## 📋 RECENT CHANGES (March 10, 2026)

### v1.6 - Error Handling Improvements
- ✅ Better error messages for Music Collection
- ✅ Offline mode fallback for Regional Categories
- ✅ Console logging for debugging

### v1.5 - Scroll Freeze Fix
- ✅ Centralized overflow management
- ✅ Auto-fix every 2 seconds
- ✅ Fixed body scroll freeze issue

### v1.4 - Performance Optimization
- ✅ HLS buffer reduced (90s → 30s)
- ✅ Proper HLS cleanup (removeAllListeners)
- ✅ Memory leak prevention

### v1.3 - Server Stability
- ✅ Fixed 275 server crashes
- ✅ Port conflict resolution
- ✅ Clean PM2 restart

---

## 🎯 KEY FEATURES

### 1. HLS Adaptive Streaming
- **Status**: Active
- **Files**: `server.js`, `mobile.js`, HLS conversion scripts
- **Docs**: `HLS-DEPLOYMENT-SUCCESS.md`

### 2. Auto HLS Converter
- **Status**: Running (PID varies)
- **Files**: `auto-hls-converter.js`, `ecosystem.config.js`
- **Docs**: `AUTO-HLS-FINAL-STATUS.md`

### 3. RudderStack Analytics
- **Status**: Active
- **Files**: `public/js/simple-tracker.js`
- **Events**: 49 tracked events
- **Destination**: Amplitude

### 4. WebView Back Navigation
- **Status**: Active
- **Files**: `public/mobile/back-navigation.js`
- **Docs**: `BACK-NAVIGATION-FINAL.md`

---

## 📦 TECHNOLOGY STACK

### Backend
- Node.js + Express
- SQLite (stage_music.db)
- AWS S3 (file storage)
- PM2 (process manager)
- FFmpeg (HLS conversion)

### Frontend
- Vanilla JavaScript
- HTML5 + CSS3
- HLS.js (adaptive streaming)
- Service Worker (offline support)
- RudderStack (analytics)

### Deployment
- Ubuntu Server (AWS EC2)
- PM2 for process management
- GitHub for version control
- nip.io for SSL-free HTTPS

---

## 🆘 EMERGENCY CONTACTS

### If Server is Down:
1. Check PM2: `pm2 status`
2. Restart: `pm2 restart all`
3. Check logs: `pm2 logs --lines 100`
4. Last resort: `sudo reboot`

### If Database is Locked:
```bash
# Find and kill blocking process
sudo lsof /var/www/stage-music-app/stage_music.db
kill -9 <PID>
```

### If Out of Disk Space:
```bash
# Check space
df -h

# Clean temp files
cd /var/www/stage-music-app
rm -rf temp_hls_*

# Clean PM2 logs
pm2 flush
```

---

## 📖 MUST-READ DOCUMENTS

1. **System Overview**: `architecture/SYSTEM-OVERVIEW.md`
2. **Deployment Guide**: `deployment/DEPLOYMENT-GUIDE.md`
3. **API Reference**: `api/API-ENDPOINTS.md`
4. **Troubleshooting**: `troubleshooting/COMMON-ISSUES.md`

---

## 🔄 VERSION HISTORY

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.6 | 2026-03-10 | Error handling improvements | ✅ Current |
| 1.5 | 2026-03-10 | Scroll freeze fix | ✅ Stable |
| 1.4 | 2026-03-10 | Performance optimization | ✅ Stable |
| 1.3 | 2026-03-06 | Navigation fixes | ✅ Stable |
| 1.2 | 2026-02-26 | HLS implementation | ✅ Stable |
| 1.1 | 2026-02-13 | Initial analytics | ✅ Stable |
| 1.0 | 2026-02-01 | Initial release | ✅ Stable |

---

**For detailed information, navigate to specific documentation files in the respective folders.**
