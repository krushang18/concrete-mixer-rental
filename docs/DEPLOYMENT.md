# Production Deployment Guide

Complete step-by-step guide for deploying to Hostinger VPS.

## Prerequisites

- Domain name purchased
- Hostinger KVM 1 VPS (₹359/month)
- SSL certificate (Let's Encrypt - Free)

## Quick Deployment Commands

```bash
# 1. Clone repository on server
git clone https://github.com/yourusername/concrete-mixer-rental.git
cd concrete-mixer-rental

# 2. Setup backend
cd backend
npm install --production
cp .env.example .env
# Edit .env with production values

# 3. Database setup
mysql -u root -p < ../database/schema.sql

# 4. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 5. Configure Nginx
sudo cp ../deployment/nginx/production.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/production.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```
