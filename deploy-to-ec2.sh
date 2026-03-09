#!/bin/bash

# Stage Music App - EC2 Deployment Script
# Run this on EC2 instance after SSH

set -e

echo "🚀 Starting Stage Music App Deployment..."
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx

# Install SQLite (if not already installed)
echo "📦 Installing SQLite..."
sudo apt-get install -y sqlite3

# Create app directory
echo "📁 Creating app directory..."
sudo mkdir -p /var/www/stage-music-app
sudo chown -R ubuntu:ubuntu /var/www/stage-music-app

echo ""
echo "✅ EC2 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Upload your app code to /var/www/stage-music-app"
echo "2. Create .env file with your AWS credentials"
echo "3. Run: cd /var/www/stage-music-app && npm install"
echo "4. Run: pm2 start server.js --name stage-music"
echo ""
