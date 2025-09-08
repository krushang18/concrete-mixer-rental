#!/bin/bash

# Concrete Mixer Rental - Deployment Script
# Usage: ./deploy.sh [branch] [environment]

set -e  # Exit on any error

# Configuration
REPO_URL="https://github.com/krushang18/concrete-mixer-rental.git"
DEPLOY_PATH="/var/www/concrete-mixer-rental"
BRANCH=${1:-main}
ENV=${2:-production}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Start deployment
log "🚀 Starting deployment for Concrete Mixer Rental"
log "Repository: $REPO_URL"
log "Branch: $BRANCH | Environment: $ENV"

# Backup current version
if [ -d "$DEPLOY_PATH" ]; then
    log "📦 Creating backup of current version..."
    sudo cp -r $DEPLOY_PATH /var/backups/concrete-mixer-$(date +%Y%m%d-%H%M%S)
fi

# Create deploy directory if it doesn't exist
if [ ! -d "$DEPLOY_PATH" ]; then
    log "📁 Creating deployment directory..."
    sudo mkdir -p $DEPLOY_PATH
    sudo chown deploy:deploy $DEPLOY_PATH
fi

# Pull latest code
log "📥 Pulling latest code from repository..."
cd $DEPLOY_PATH || { error "Deploy path not found"; exit 1; }

# Check if git repository exists
if [ ! -d ".git" ]; then
    log "🔧 Initializing git repository..."
    sudo -u deploy git clone $REPO_URL .
else
    log "🔄 Updating existing repository..."
    sudo -u deploy git fetch origin
fi

# Git operations
sudo -u deploy git checkout $BRANCH
sudo -u deploy git pull origin $BRANCH

# Install/update backend dependencies
log "📦 Installing backend dependencies..."
cd $DEPLOY_PATH/backend
sudo -u deploy npm ci --production

# Check if .env exists
if [ ! -f "$DEPLOY_PATH/backend/.env" ]; then
    warning "⚠️  .env file not found. Creating from example..."
    sudo -u deploy cp .env.example .env
    warning "⚠️  Please edit .env file with production values before continuing!"
    info "Edit command: sudo nano $DEPLOY_PATH/backend/.env"
    read -p "Press Enter after editing .env file..."
fi

# Test configuration
log "🧪 Testing application configuration..."
cd $DEPLOY_PATH/backend

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    log "📦 Installing PM2 process manager..."
    sudo npm install -g pm2
fi

# Stop existing processes
log "🛑 Stopping existing PM2 processes..."
pm2 stop concrete-mixer-api 2>/dev/null || true

# Start/Reload PM2 processes
log "🚀 Starting PM2 processes..."
pm2 start ecosystem.config.js --env $ENV
pm2 save

# Wait for application to start
log "⏳ Waiting for application to start..."
sleep 10

# Health check
log "🏥 Performing health check..."
for i in {1..5}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log "✅ Health check passed!"
        break
    else
        if [ $i -eq 5 ]; then
            error "❌ Health check failed after 5 attempts"
            pm2 logs concrete-mixer-api --lines 20
            exit 1
        fi
        warning "⚠️  Health check attempt $i failed, retrying..."
        sleep 5
    fi
done

# Copy customer site to Nginx directory
log "📂 Updating customer website files..."
sudo cp -r $DEPLOY_PATH/customer-site/* /var/www/html/ 2>/dev/null || true

# Update Nginx configuration if needed
if [ -f "$DEPLOY_PATH/deployment/nginx/production.conf" ]; then
    log "🔧 Updating Nginx configuration..."
    sudo cp $DEPLOY_PATH/deployment/nginx/production.conf /etc/nginx/sites-available/concrete-mixer-rental
    
    # Enable site if not already enabled
    if [ ! -L "/etc/nginx/sites-enabled/concrete-mixer-rental" ]; then
        sudo ln -s /etc/nginx/sites-available/concrete-mixer-rental /etc/nginx/sites-enabled/
    fi
    
    # Test and reload Nginx
    if sudo nginx -t; then
        sudo systemctl reload nginx
        log "✅ Nginx configuration updated and reloaded"
    else
        error "❌ Nginx configuration test failed"
        exit 1
    fi
fi

# Create logs directory if it doesn't exist
sudo mkdir -p /var/log/concrete-mixer-rental
sudo chown deploy:deploy /var/log/concrete-mixer-rental

# Final verification
log "🔍 Performing final verification..."

# Check if application is responding
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    log "✅ Application health check passed"
else
    error "❌ Application health check failed"
    exit 1
fi

# Check if Nginx is serving the site
if command -v nginx &> /dev/null && systemctl is-active --quiet nginx; then
    log "✅ Nginx is running"
else
    warning "⚠️  Nginx is not running or not installed"
fi

# Display application status
log "📊 Application Status:"
pm2 list | grep concrete-mixer-api || true

log "🎉 Deployment completed successfully!"
log "🌐 Application is now live!"
log "📝 Check logs with: pm2 logs concrete-mixer-api"
log "🔄 Restart with: pm2 restart concrete-mixer-api"

# Optional: Send deployment notification
# Uncomment and configure if you want Slack/email notifications
# curl -X POST -H 'Content-type: application/json' \
#   --data '{"text":"🚀 Concrete Mixer Rental deployed successfully to '$ENV'!"}' \
#   YOUR_SLACK_WEBHOOK_URL