# 🎵 STAGE MUSIC APP - START HERE

**Version**: 1.6
**Last Updated**: March 10, 2026
**Status**: ✅ Production Ready

---

## 🚀 QUICK START (New Session)

### 1. READ FIRST (In Order):
```
1. This file (README-START-HERE.md) ← You are here
2. docs/SESSION-SUMMARY-MAR-10-2026.md ← What happened in last session
3. docs/architecture/SYSTEM-OVERVIEW.md ← How everything works
4. docs/deployment/DEPLOYMENT-GUIDE.md ← How to deploy changes
5. docs/troubleshooting/COMMON-ISSUES.md ← How to fix issues
```

### 2. CHECK SERVER STATUS:
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236
pm2 status

# Expected:
# ✅ stage-music-server: online (↺ 0)
# ✅ auto-hls-converter: online (↺ 0)
```

### 3. TEST APP:
```
Open: https://3-111-168-236.nip.io/mobile/
- Should load in 1-2 seconds
- Play a song - should stream with HLS
- Scroll - should work smoothly
- Categories - should load songs
```

---

## 📚 COMPLETE DOCUMENTATION

### Architecture & Design
- **System Overview**: `docs/architecture/SYSTEM-OVERVIEW.md`
  - High-level architecture diagram
  - Component descriptions
  - Data flow examples
  - Technology stack

### Deployment
- **Deployment Guide**: `docs/deployment/DEPLOYMENT-GUIDE.md`
  - Step-by-step deployment procedures
  - Frontend deployment
  - Backend deployment
  - Database migrations
  - Rollback procedures

### Troubleshooting
- **Common Issues**: `docs/troubleshooting/COMMON-ISSUES.md`
  - Server crashes (EADDRINUSE)
  - Page hangs / scroll freeze
  - Memory leaks
  - Songs not loading
  - Images not loading
  - HLS streaming issues
  - Database locked
  - PM2 issues
  - Out of disk space

### Session History
- **Latest Session**: `docs/SESSION-SUMMARY-MAR-10-2026.md`
  - Complete summary of work done
  - 8 major fixes applied
  - Version history (1.0 → 1.6)
  - Before/After metrics
  - Technical details
  - Future improvements

---

## 🎯 CRITICAL INFORMATION

### Server Access
```bash
IP: 3.111.168.236
User: ubuntu
SSH Key: ~/stage-music-key.pem
SSH Command: ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236
Working Dir: /var/www/stage-music-app/
```

### URLs
```
Mobile App: https://3-111-168-236.nip.io/mobile/
Desktop App: https://3-111-168-236.nip.io/
API: http://3.111.168.236:3000/api/
```

### PM2 Services
```bash
pm2 status
# 0 | stage-music-server    (Main API)
# 1 | auto-hls-converter    (Background HLS conversion)
```

### GitHub Repository
```
Repo: manpreetstage/stage-music-app
Branch: main
Latest Commit: bdc0053
Files: 24 critical files verified ✅
```

---

## 🔧 COMMON OPERATIONS

### Deploy Changes
```bash
# Frontend only
scp -i ~/stage-music-key.pem \
    public/mobile/mobile.js \
    ubuntu@3.111.168.236:/var/www/stage-music-app/public/mobile/

# Backend (requires restart)
scp -i ~/stage-music-key.pem server.js ubuntu@3.111.168.236:/var/www/stage-music-app/
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 restart all"
```

### Check Server Status
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 status"
```

### View Logs
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236 "pm2 logs --lines 50"
```

### Emergency Restart
```bash
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236
pm2 stop all
pm2 delete all
pm2 start ecosystem.config.js
```

---

## 📊 CURRENT STATUS

### ✅ What's Working
- [x] Song playback with HLS adaptive streaming
- [x] Category navigation (Haryanvi, Rajasthani, Bhojpuri)
- [x] Music Collection sections
- [x] Search functionality
- [x] Analytics (49 tracked events → Amplitude)
- [x] Auto HLS converter (background service)
- [x] WebView back navigation
- [x] Server stability (0 crashes)
- [x] Memory optimization (60% reduction)
- [x] Scroll functionality (never freezes)
- [x] Error handling with logging
- [x] Cover images loading correctly

### ⚠️ Known Issues (Low Priority)
- [ ] Session MemoryStore (should use Redis)
- [ ] AWS SDK v2 (should upgrade to v3)
- [ ] Event listeners cleanup audit needed

### 🔮 Future Improvements
- [ ] Image lazy loading (Intersection Observer)
- [ ] API response caching
- [ ] Code minification
- [ ] Service Worker enhancement
- [ ] Automated tests
- [ ] CI/CD pipeline
- [ ] Monitoring dashboard

---

## 🆘 EMERGENCY PROCEDURES

### If Server is Down:
```bash
# 1. Check PM2
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236
pm2 status

# 2. Check logs
pm2 logs --lines 100

# 3. Restart
pm2 restart all

# 4. Nuclear option
sudo reboot
```

### If Something Broke:
```bash
# 1. Check what changed
git log --oneline -5

# 2. Rollback files
cd /var/www/stage-music-app/public/mobile
ls *.backup-*
cp mobile.js.backup-TIMESTAMP mobile.js

# 3. Restart
pm2 restart all
```

---

## 📝 VERSION HISTORY

| Version | Date | Key Changes | Status |
|---------|------|-------------|--------|
| 1.6 | 2026-03-10 | Error handling + logging | ✅ Current |
| 1.5 | 2026-03-10 | Scroll freeze fix | ✅ Stable |
| 1.4 | 2026-03-10 | Performance optimization | ✅ Stable |
| 1.3 | 2026-03-10 | Server stability | ✅ Stable |
| 1.2 | 2026-02-26 | HLS implementation | ✅ Stable |
| 1.1 | 2026-02-13 | Initial analytics | ✅ Stable |
| 1.0 | 2026-02-01 | Initial release | ✅ Stable |

---

## 🎓 TECHNICAL STACK

### Frontend
- Vanilla JavaScript (no framework)
- HTML5 + CSS3
- HLS.js (adaptive streaming)
- Service Worker (offline support)
- RudderStack (analytics)

### Backend
- Node.js + Express
- SQLite (stage_music.db)
- AWS S3 (file storage)
- PM2 (process manager)
- FFmpeg (HLS conversion)

### Infrastructure
- AWS EC2 (Ubuntu 20.04)
- nip.io (wildcard SSL)
- GitHub (version control)

---

## 📖 FILE STRUCTURE

```
stage-music-app/
├── README-START-HERE.md         ← You are here
├── docs/                        ← Complete documentation
│   ├── README.md
│   ├── SESSION-SUMMARY-MAR-10-2026.md
│   ├── architecture/
│   ├── deployment/
│   ├── api/
│   ├── database/
│   └── troubleshooting/
├── public/
│   ├── mobile/                  ← Mobile app
│   │   ├── index.html
│   │   ├── mobile.js (v1.6)
│   │   ├── mobile.css (v1.4)
│   │   └── back-navigation.js
│   ├── index.html               ← Desktop app
│   ├── app.js
│   └── js/                      ← Analytics
├── server.js                    ← Main API server
├── auto-hls-converter.js        ← Background HLS service
├── ecosystem.config.js          ← PM2 configuration
├── stage_music.db               ← SQLite database
├── package.json
└── migrations/                  ← Database migrations
```

---

## ⚡ QUICK COMMANDS REFERENCE

```bash
# SSH to server
ssh -i ~/stage-music-key.pem ubuntu@3.111.168.236

# PM2 commands
pm2 status                       # Check services
pm2 logs                         # View logs
pm2 restart all                  # Restart all services
pm2 stop all                     # Stop all
pm2 delete all                   # Delete all

# Database
cd /var/www/stage-music-app
sqlite3 stage_music.db
.tables                          # List tables
SELECT COUNT(*) FROM songs;      # Count songs

# System
df -h                            # Disk space
free -h                          # Memory
ps aux | grep node               # Node processes
sudo lsof -i :3000              # What's on port 3000
```

---

## 🎯 NEXT SESSION TODO

1. **Read Documentation** - Start with docs/SESSION-SUMMARY
2. **Check Server** - Verify PM2 status
3. **Test App** - Make sure everything still works
4. **Continue Work** - Use deployment guide for changes
5. **Document** - Update docs with new changes

---

## 💡 TIPS FOR SUCCESS

### DO's ✅
- Always read latest session summary first
- Test changes locally before deploying
- Use cache busting for frontend changes (v=1.X)
- Check PM2 logs after deployment
- Create backups before major changes
- Document all significant changes

### DON'Ts ❌
- Don't deploy without testing
- Don't skip documentation updates
- Don't modify production DB directly
- Don't commit secrets (.env, SSH keys)
- Don't use `rm -rf` without verification
- Don't ignore PM2 restart counts

---

## 📞 SUPPORT

### Documentation
- Main Docs: `docs/README.md`
- Session Summary: `docs/SESSION-SUMMARY-MAR-10-2026.md`
- Architecture: `docs/architecture/SYSTEM-OVERVIEW.md`
- Deployment: `docs/deployment/DEPLOYMENT-GUIDE.md`
- Troubleshooting: `docs/troubleshooting/COMMON-ISSUES.md`

### GitHub
- Repository: https://github.com/manpreetstage/stage-music-app
- Issues: Report via GitHub Issues
- Commits: Check history for changes

---

## 🎉 CONCLUSION

**This project is fully documented and ready for:**
- Long-term maintenance
- Feature additions
- Bug fixes
- Handoff to other developers
- Continuity across sessions

**All work from March 10, 2026 session is documented in:**
`docs/SESSION-SUMMARY-MAR-10-2026.md`

**Session can be safely closed - all knowledge preserved!**

---

**Last Updated**: March 10, 2026 1:45 PM
**Next Session**: Ready to continue from v1.6 baseline
**Status**: 🟢 Production Ready
