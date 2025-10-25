#!/bin/bash

# Fix Nginx Configuration Script
# This script fixes the Nginx configuration to properly route requests

echo "🔧 Fixing Nginx Configuration..."

# Stop Nginx
echo "⏹️ Stopping Nginx..."
sudo systemctl stop nginx

# Backup current config
echo "💾 Backing up current config..."
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Create new config
echo "📝 Creating new config..."
sudo tee /etc/nginx/nginx.conf > /dev/null << 'EOF'
events {
    worker_connections 1024;
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
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Upstream servers
    upstream backend {
        server 127.0.0.1:3000;
        keepalive 32;
    }

    upstream frontend {
        server 127.0.0.1:3002;
        keepalive 32;
    }

    upstream admin-panel {
        server 127.0.0.1:3001;
        keepalive 32;
    }

    # Main server block
    server {
        listen 80;
        server_name _;

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

        # Frontend (default) - این باید آخرین location باشد
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

# Test configuration
echo "🧪 Testing configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuration is valid"
    
    # Start Nginx
    echo "🚀 Starting Nginx..."
    sudo systemctl start nginx
    
    # Enable Nginx
    echo "🔧 Enabling Nginx..."
    sudo systemctl enable nginx
    
    # Check status
    echo "📊 Checking Nginx status..."
    sudo systemctl status nginx --no-pager
    
    echo "🎉 Nginx configuration fixed successfully!"
    echo "🌐 Frontend: http://185.231.112.84/"
    echo "🔧 Admin Panel: http://185.231.112.84/admin"
    echo "📚 API: http://185.231.112.84/api/"
    
else
    echo "❌ Configuration is invalid"
    echo "🔄 Restoring backup..."
    sudo cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf
    sudo systemctl start nginx
    exit 1
fi
