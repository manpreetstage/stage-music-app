#!/bin/bash

# Prepare Stage Music App for EC2 Deployment
# Run this on your LOCAL machine before deploying

echo "📦 Preparing Stage Music App for deployment..."
echo ""

# Create deployment package
echo "Creating deployment package..."

# Exclude unnecessary files
tar -czf stage-music-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='Haryanvi1' \
  --exclude='RJ1' \
  --exclude='HR2' \
  --exclude='Assets' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  --exclude='*.tar.gz' \
  --exclude='.env' \
  server.js \
  package.json \
  package-lock.json \
  public/ \
  stage_music.db

echo "✅ Created stage-music-deploy.tar.gz"
echo ""

# Show package size
FILESIZE=$(ls -lh stage-music-deploy.tar.gz | awk '{print $5}')
echo "📊 Package size: $FILESIZE"
echo ""

echo "✅ Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Launch EC2 instance on AWS"
echo "2. Upload this package: scp -i your-key.pem stage-music-deploy.tar.gz ubuntu@ec2-ip:~/"
echo "3. SSH into EC2: ssh -i your-key.pem ubuntu@ec2-ip"
echo "4. Follow DEPLOYMENT_GUIDE.md"
echo ""
