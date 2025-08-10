#!/bin/bash

# Nginx Setup Script for AI Chance Maker API
set -e

APP_NAME="ai-chance-maker-api"
DOMAIN="api.ambitful.ai"

echo "🌐 Setting up Nginx for $APP_NAME"

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# Create Nginx configuration
echo "📝 Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # API proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
EOF

# Enable the site
echo "✅ Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "🔧 Testing Nginx configuration..."
sudo nginx -t

# Restart Nginx
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "✅ Nginx setup completed!"
echo ""
echo "🔧 Next steps:"
echo "1. Update DOMAIN variable in this script with your actual domain"
echo "2. Point your domain DNS to this server's IP address"
echo "3. Install SSL certificate with: sudo certbot --nginx -d api.ambitful.ai"
echo ""
echo "📝 Useful commands:"
echo "  sudo nginx -t           # Test configuration"
echo "  sudo systemctl reload nginx  # Reload configuration"
echo "  sudo tail -f /var/log/nginx/error.log  # View error logs"