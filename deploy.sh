#!/bin/bash

# AI Chance Maker API - Digital Ocean Deployment Script
set -e

# Configuration
APP_NAME="ai-chance-maker-api"
APP_DIR="/var/www/$APP_NAME"
REPO_URL="https://github.com/your-username/ai-chance-maker-api.git"  # Update this
BRANCH="master"
NODE_VERSION="18"

echo "🚀 Starting deployment for $APP_NAME"

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Create app directory if it doesn't exist
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Clone or update repository
if [ -d "$APP_DIR/.git" ]; then
    echo "🔄 Updating existing repository..."
    cd $APP_DIR
    git fetch origin
    git reset --hard origin/$BRANCH
else
    echo "📥 Cloning repository..."
    git clone -b $BRANCH $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run prisma:generate

# Run database migrations
echo "🗄️ Running database migrations..."
npm run prisma:migrate

# Build the application
echo "🔨 Building application..."
npm run build

# Stop existing PM2 process if running
echo "⏹️ Stopping existing process..."
pm2 stop $APP_NAME 2>/dev/null || true

# Start application with PM2
echo "▶️ Starting application..."
pm2 start dist/index.js --name $APP_NAME --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

echo "✅ Deployment completed successfully!"
echo "📊 Application status:"
pm2 status

echo ""
echo "🔧 Next steps:"
echo "1. Configure your .env file with production variables"
echo "2. Setup Nginx reverse proxy"
echo "3. Configure SSL with Certbot"
echo ""
echo "📝 Useful commands:"
echo "  pm2 logs $APP_NAME    # View logs"
echo "  pm2 restart $APP_NAME # Restart app"
echo "  pm2 stop $APP_NAME    # Stop app"