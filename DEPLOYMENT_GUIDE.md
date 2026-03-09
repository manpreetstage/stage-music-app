# 🚀 Stage Music App - EC2 Deployment Guide

## Prerequisites
- ✅ EC2 instance running (Ubuntu 22.04)
- ✅ EC2 key pair (.pem file)
- ✅ Security groups configured (ports 22, 80, 443, 3000)
- ✅ AWS credentials (NEW ones, not the exposed ones!)

---

## Step 1: Connect to EC2

```bash
# Make key file secure
chmod 400 your-key.pem

# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

---

## Step 2: Run Setup Script on EC2

```bash
# Download and run the setup script
curl -o setup.sh https://raw.githubusercontent.com/your-repo/deploy-to-ec2.sh
chmod +x setup.sh
sudo ./setup.sh
```

**OR manually run:**

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx

# Install SQLite
sudo apt-get install -y sqlite3

# Create app directory
sudo mkdir -p /var/www/stage-music-app
sudo chown -R ubuntu:ubuntu /var/www/stage-music-app
```

---

## Step 3: Upload App Code to EC2

### Option A: Using SCP (from your local machine)

```bash
# From your local machine (NOT from EC2)
cd /Users/manpreetsingh/Thinking/stage-music-app

# Upload entire app
scp -i your-key.pem -r . ubuntu@your-ec2-ip:/var/www/stage-music-app/

# OR create a zip first
tar -czf stage-music-app.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='Haryanvi1' \
  --exclude='RJ1' \
  --exclude='HR2' \
  --exclude='*.log' \
  .

scp -i your-key.pem stage-music-app.tar.gz ubuntu@your-ec2-ip:~/

# Then on EC2:
ssh -i your-key.pem ubuntu@your-ec2-ip
cd /var/www/stage-music-app
tar -xzf ~/stage-music-app.tar.gz
```

### Option B: Using Git (recommended)

```bash
# On EC2
cd /var/www/stage-music-app
git clone https://github.com/your-username/stage-music-app.git .

# OR if already cloned
git pull origin main
```

---

## Step 4: Setup Environment Variables on EC2

```bash
# On EC2
cd /var/www/stage-music-app

# Create .env file
nano .env
```

**Add these variables:**

```env
# AWS S3 Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=YOUR_NEW_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_NEW_SECRET_KEY
AWS_BUCKET_NAME=stage-music-files

# Database (SQLite)
DB_PATH=./stage_music.db

# Server
PORT=3000
NODE_ENV=production

# Session Secret (generate a random string)
SESSION_SECRET=your-super-secret-random-string-here
```

**Save and exit:** `Ctrl+X`, `Y`, `Enter`

---

## Step 5: Install Dependencies & Setup Database

```bash
cd /var/www/stage-music-app

# Install npm packages
npm install --production

# Copy database from local (if needed)
# From local machine:
scp -i your-key.pem stage_music.db ubuntu@your-ec2-ip:/var/www/stage-music-app/

# OR start fresh and re-import songs
# (database will be created automatically when server starts)
```

---

## Step 6: Start App with PM2

```bash
cd /var/www/stage-music-app

# Start the app
pm2 start server.js --name stage-music

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Copy and run the command PM2 outputs

# Check status
pm2 status

# View logs
pm2 logs stage-music

# Restart app
pm2 restart stage-music

# Stop app
pm2 stop stage-music
```

---

## Step 7: Configure Nginx as Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/stage-music
```

**Paste this config:**

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for audio streaming
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    client_max_body_size 100M;
}
```

**Enable the site:**

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/stage-music /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

---

## Step 8: Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is setup automatically
# Test renewal
sudo certbot renew --dry-run
```

---

## Step 9: Configure Firewall (Optional but Recommended)

```bash
# Enable UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 10: Verify Deployment

```bash
# Check if app is running
pm2 status

# Check logs
pm2 logs stage-music --lines 50

# Test locally on EC2
curl http://localhost:3000

# Test from browser
# http://your-ec2-public-ip
# http://your-domain.com
```

---

## 🔧 Maintenance Commands

### Update App Code

```bash
cd /var/www/stage-music-app

# Pull latest code
git pull origin main

# Install new dependencies
npm install --production

# Restart app
pm2 restart stage-music
```

### View Logs

```bash
# PM2 logs
pm2 logs stage-music

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Database Backup

```bash
# Backup database
cd /var/www/stage-music-app
cp stage_music.db stage_music_backup_$(date +%Y%m%d).db

# Download to local
# From local machine:
scp -i your-key.pem ubuntu@your-ec2-ip:/var/www/stage-music-app/stage_music.db ./backup/
```

### Restart Services

```bash
# Restart app
pm2 restart stage-music

# Restart Nginx
sudo systemctl restart nginx

# Restart entire EC2 (if needed)
sudo reboot
```

---

## 📊 Monitoring

```bash
# CPU/Memory usage
htop

# Disk usage
df -h

# App performance
pm2 monit

# Check active connections
sudo netstat -tulpn | grep :3000
```

---

## 🐛 Troubleshooting

### App not starting?

```bash
# Check PM2 logs
pm2 logs stage-music --err

# Check if port 3000 is in use
sudo lsof -i :3000

# Kill process on port 3000
sudo kill -9 $(sudo lsof -t -i:3000)

# Restart app
pm2 restart stage-music
```

### Nginx not working?

```bash
# Check Nginx config
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Database issues?

```bash
# Check database file
ls -lh stage_music.db

# Check database integrity
sqlite3 stage_music.db "PRAGMA integrity_check;"

# View tables
sqlite3 stage_music.db ".tables"
```

---

## ✅ Deployment Checklist

- [ ] EC2 instance launched with Ubuntu 22.04
- [ ] Security groups configured (22, 80, 443)
- [ ] SSH key downloaded and secured (chmod 400)
- [ ] Node.js, PM2, Nginx installed on EC2
- [ ] App code uploaded to `/var/www/stage-music-app`
- [ ] `.env` file created with NEW AWS credentials
- [ ] Database uploaded or migrated
- [ ] Dependencies installed (`npm install`)
- [ ] App started with PM2 (`pm2 start server.js`)
- [ ] PM2 configured to start on boot (`pm2 startup`)
- [ ] Nginx configured as reverse proxy
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Domain DNS pointed to EC2 IP
- [ ] Firewall configured (UFW)
- [ ] App tested and working
- [ ] Backup strategy in place

---

## 🎯 Production Recommendations

1. **Use RDS instead of SQLite** for better performance and backups
2. **Setup CloudWatch** for monitoring and alerts
3. **Use Auto Scaling Group** for high availability
4. **Setup Load Balancer** for multiple EC2 instances
5. **Enable CloudFront CDN** for faster S3 file delivery
6. **Setup automated backups** for database
7. **Use Secret Manager** for sensitive credentials
8. **Setup CI/CD pipeline** with GitHub Actions

---

## 📞 Support

If deployment fails, check:
1. PM2 logs: `pm2 logs stage-music`
2. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. App logs: Check console output
4. Security groups: Ensure ports are open
5. .env file: Verify all variables are set correctly

Good luck! 🚀
