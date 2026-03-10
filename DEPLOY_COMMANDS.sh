#!/bin/bash
# Stage Music App - Deployment Commands
# Run these when SSH connection to server is restored

cd /Users/manpreetsingh/Thinking/stage-music-app

echo "🚀 Deploying RudderStack files..."
scp public/js/rudderstack-init.js root@69.49.243.142:/root/stage-music-app/public/js/
scp public/js/tracker.js root@69.49.243.142:/root/stage-music-app/public/js/

echo "🎵 Deploying Mobile App files..."
scp public/mobile/index.html root@69.49.243.142:/root/stage-music-app/public/mobile/
scp public/mobile/mobile.js root@69.49.243.142:/root/stage-music-app/public/mobile/
scp public/mobile/mobile.css root@69.49.243.142:/root/stage-music-app/public/mobile/

echo "✅ Verifying deployment..."
ssh root@69.49.243.142 "ls -lh /root/stage-music-app/public/js/rudderstack-*.js /root/stage-music-app/public/js/tracker.js /root/stage-music-app/public/mobile/"

echo "🎉 Deployment complete!"
echo ""
echo "📱 Test mobile app at: https://stage.nip.io/mobile"
echo "🔍 Check browser console for: ✅ RudderStack SDK initialized"
echo "📊 Events will be sent to: https://rudder-event-prod.stage.in"
