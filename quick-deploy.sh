#!/bin/bash

# Quick deployment of updated files to live server
# Usage: ./quick-deploy.sh

SERVER="ubuntu@3.111.168.236"
APP_DIR="/var/www/stage-music-app"

echo "🚀 Deploying updated files to live server..."
echo ""

# Copy updated files
echo "📤 Copying server.js..."
scp server.js $SERVER:$APP_DIR/

echo "📤 Copying admin sections files..."
scp public/admin/sections.html $SERVER:$APP_DIR/public/admin/
scp public/admin/sections.js $SERVER:$APP_DIR/public/admin/

echo ""
echo "🔄 Restarting server on EC2..."
ssh $SERVER << 'EOF'
cd /var/www/stage-music-app
pm2 restart stage-music
pm2 logs stage-music --lines 20
EOF

echo ""
echo "✅ Deployment complete!"
echo "🌐 Check: https://3-111-168-236.nip.io/admin/sections.html"
