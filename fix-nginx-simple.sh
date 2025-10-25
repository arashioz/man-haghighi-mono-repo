#!/bin/bash

# Simple nginx configuration for debugging
# This script creates a minimal nginx config to test frontend access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Creating simple nginx configuration for debugging${NC}"

# Backup current nginx config
echo -e "${YELLOW}📁 Backing up current nginx configuration...${NC}"
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S)

# Create simple nginx configuration
echo -e "${YELLOW}📝 Creating simple nginx configuration...${NC}"
sudo tee /etc/nginx/nginx.conf > /dev/null << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    # Basic settings
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 100M;
    
    # Frontend server
    server {
        listen 80;
        server_name _;
        
        # Frontend (main site)
        location / {
            proxy_pass http://127.0.0.1:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
        
        # Admin panel
        location /admin {
            proxy_pass http://127.0.0.1:3002/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
        
        # API
        location /api/ {
            proxy_pass http://127.0.0.1:3000/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
        
        # Uploads
        location /uploads/ {
            alias /var/www/uploads/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Health check
        location /health {
            return 200 "nginx is working\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Test nginx configuration
echo -e "${YELLOW}🧪 Testing nginx configuration...${NC}"
sudo nginx -t

# Restart nginx
echo -e "${YELLOW}🔄 Restarting nginx...${NC}"
sudo systemctl restart nginx

# Check nginx status
echo -e "${YELLOW}🔍 Checking nginx status...${NC}"
sudo systemctl status nginx

echo -e "${GREEN}✅ Simple nginx configuration applied!${NC}"
echo -e "${GREEN}🌐 Test the site: http://185.231.112.84${NC}"
echo -e "${GREEN}🔧 Admin Panel: http://185.231.112.84/admin${NC}"
echo -e "${GREEN}📚 API: http://185.231.112.84/api/health${NC}"

echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "${YELLOW}1. Test: curl http://185.231.112.84${NC}"
echo -e "${YELLOW}2. Check logs: sudo tail -f /var/log/nginx/error.log${NC}"
echo -e "${YELLOW}3. Check containers: docker-compose ps${NC}"
