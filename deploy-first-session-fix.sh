#!/bin/bash
# Deploy first session optimization to live server: 3.111.168.236

SERVER="root@3.111.168.236"
REMOTE_PATH="/root/stage-music-app"

echo "🚀 Deploying first session optimization to live server..."
echo ""

echo "📱 Deploying Mobile App files..."
scp public/mobile/index.html $SERVER:$REMOTE_PATH/public/mobile/
scp public/mobile/mobile.js $SERVER:$REMOTE_PATH/public/mobile/
scp public/mobile/mobile.css $SERVER:$REMOTE_PATH/public/mobile/

echo "💻 Deploying Desktop files..."
scp public/index.html $SERVER:$REMOTE_PATH/public/
scp public/app.js $SERVER:$REMOTE_PATH/public/
scp public/styles.css $SERVER:$REMOTE_PATH/public/

echo ""
echo "✅ Verifying deployment..."
ssh $SERVER "ls -lh $REMOTE_PATH/public/mobile/index.html $REMOTE_PATH/public/mobile/mobile.js $REMOTE_PATH/public/index.html"

echo ""
echo "🎉 Deployment complete!"
echo "🌐 Test at: https://3-111-168-236.nip.io/mobile/"
echo "📊 First session should now load faster with audio preload!"
