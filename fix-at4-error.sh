#!/bin/bash

# Fix AT4 Error - Temporary HTTP Configuration
# This script creates a temporary HTTP-only nginx config to bypass SSL issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Fixing AT4 Error - Creating HTTP-only configuration${NC}"

# Backup current nginx config
echo -e "${YELLOW}📁 Backing up current nginx configuration...${NC}"
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Create HTTP-only nginx configuration
echo -e "${YELLOW}📝 Creating HTTP-only nginx configuration...${NC}"
sudo tee /etc/nginx/nginx.conf > /dev/null << 'EOF'
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;
    server_tokens off;

    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=uploads:10m rate=20r/s;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Upstream servers
    upstream backend {
        server 127.0.0.1:3000;
        keepalive 32;
    }

    upstream frontend {
        server 127.0.0.1:3001;
        keepalive 32;
    }

    upstream admin-panel {
        server 127.0.0.1:3002;
        keepalive 32;
    }

    # Main HTTP server block (no SSL)
    server {
        listen 80;
        server_name _;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;

        # Client max body size for file uploads
        client_max_body_size 100M;

        # API Backend
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
            proxy_buffering off;
        }

        # Swagger Documentation
        location /api/docs {
            proxy_pass http://backend/api/docs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Static files (uploads)
        location /uploads/ {
            limit_req zone=uploads burst=50 nodelay;
            alias /var/www/uploads/;
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept";
            
            # Handle CORS preflight requests
            if ($request_method = 'OPTIONS') {
                add_header Access-Control-Allow-Origin "*";
                add_header Access-Control-Allow-Methods "GET, OPTIONS";
                add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept";
                add_header Access-Control-Max-Age 1728000;
                add_header Content-Type "text/plain; charset=utf-8";
                add_header Content-Length 0;
                return 204;
            }
            
            # Security: Deny access to executable files
            location ~* \.(php|jsp|asp|sh|cgi)$ {
                deny all;
                return 403;
            }
        }

        # Admin Panel
        location /admin {
            proxy_pass http://admin-panel/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Frontend (default)
        location / {
            proxy_pass http://frontend/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Security: Block access to hidden files and directories
        location ~ /\. {
            deny all;
            access_log off;
            log_not_found off;
        }

        # Security: Block access to backup files
        location ~ ~$ {
            deny all;
            access_log off;
            log_not_found off;
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

echo -e "${GREEN}✅ AT4 Error fixed! Site is now accessible via HTTP${NC}"
echo -e "${GREEN}🌐 Frontend: http://185.231.112.84${NC}"
echo -e "${GREEN}🔧 Admin Panel: http://185.231.112.84/admin${NC}"
echo -e "${GREEN}📚 API Docs: http://185.231.112.84/api/docs${NC}"
echo -e "${GREEN}📁 Uploads: http://185.231.112.84/uploads/${NC}"

echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "${YELLOW}1. Test the site: http://185.231.112.84${NC}"
echo -e "${YELLOW}2. For HTTPS, configure proper SSL certificates${NC}"
echo -e "${YELLOW}3. Update production.env to use HTTP URLs${NC}"
