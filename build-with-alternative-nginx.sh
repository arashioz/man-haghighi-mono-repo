#!/bin/bash

# Script to build with alternative nginx tags if main tag fails

echo "🔍 Trying to pull nginx images with different tags..."

# Try different nginx tags
TAGS=("stable-alpine" "1.27-alpine" "alpine3.19" "latest")

for tag in "${TAGS[@]}"; do
    echo ""
    echo "🔄 Trying nginx:${tag}..."
    if docker pull "nginx:${tag}" 2>/dev/null; then
        echo "✅ Successfully pulled nginx:${tag}"
        
        # Update Dockerfiles
        echo ""
        echo "📝 Updating Dockerfiles to use nginx:${tag}..."
        sed -i.bak "s|FROM nginx:.*|FROM nginx:${tag}|g" frontend/Dockerfile
        sed -i.bak "s|FROM nginx:.*|FROM nginx:${tag}|g" admin-panel/Dockerfile
        
        echo "✅ Updated Dockerfiles"
        echo ""
        echo "🚀 Now you can build with:"
        echo "   docker-compose build --no-cache frontend admin"
        exit 0
    else
        echo "❌ Failed to pull nginx:${tag}"
    fi
done

echo ""
echo "❌ Could not pull any nginx image. Possible solutions:"
echo ""
echo "1. Check your internet connection"
echo "2. Try using a VPN if you're in a restricted region"
echo "3. Configure Docker registry mirror (see below)"
echo ""
echo "To configure registry mirror, create/edit /etc/docker/daemon.json:"
echo '{'
echo '  "registry-mirrors": ['
echo '    "https://docker.mirrors.sjtug.sjtu.edu.cn",'
echo '    "https://registry.docker-cn.com"'
echo '  ]'
echo '}'
echo ""
echo "Then restart Docker: sudo systemctl restart docker"

