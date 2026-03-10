#!/bin/bash
# Deploy to live server: 3.111.168.236

SERVER="root@3.111.168.236"
REMOTE_PATH="/root/stage-music-app"

echo "🚀 Deploying to https://3-111-168-236.nip.io/mobile/"
echo ""

echo "📦 Deploying RudderStack files..."
scp public/js/rudderstack-init.js $SERVER:$REMOTE_PATH/public/js/
scp public/js/tracker.js $SERVER:$REMOTE_PATH/public/js/

echo "📱 Deploying Mobile App files..."
scp public/mobile/index.html $SERVER:$REMOTE_PATH/public/mobile/
scp public/mobile/mobile.js $SERVER:$REMOTE_PATH/public/mobile/
scp public/mobile/mobile.css $SERVER:$REMOTE_PATH/public/mobile/

echo ""
echo "✅ Verifying deployment..."
ssh $SERVER "ls -lh $REMOTE_PATH/public/js/rudderstack-*.js $REMOTE_PATH/public/js/tracker.js"
ssh $SERVER "ls -lh $REMOTE_PATH/public/mobile/index.html $REMOTE_PATH/public/mobile/mobile.js $REMOTE_PATH/public/mobile/mobile.css"

echo ""
echo "🎉 Deployment complete!"
echo "🌐 Test at: https://3-111-168-236.nip.io/mobile/"
echo "🔍 Check console for: ✅ RudderStack SDK initialized"
