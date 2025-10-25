#!/bin/bash

# Production Deployment Script for Haghighi Platform
# Usage: ./deploy-prod.sh [YOUR_SERVER_IP]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if IP is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide your server IP address${NC}"
    echo "Usage: ./deploy-prod.sh YOUR_SERVER_IP"
    exit 1
fi

SERVER_IP=$1

echo -e "${GREEN}🚀 Starting production deployment for IP: $SERVER_IP${NC}"

# Update production.env with server IP
echo -e "${YELLOW}📝 Updating production.env with server IP...${NC}"
sed -i "s/YOUR_SERVER_IP/$SERVER_IP/g" production.env

# Update nginx configuration with server IP (if nginx.conf exists)
if [ -f "nginx.conf" ]; then
    echo -e "${YELLOW}📝 Updating nginx configuration with server IP...${NC}"
    sed -i "s/YOUR_SERVER_IP/$SERVER_IP/g" nginx.conf
    
    # Copy nginx config to system
    echo -e "${YELLOW}📋 Copying nginx configuration...${NC}"
    sudo cp nginx.conf /etc/nginx/nginx.conf
    
    # Test nginx configuration
    echo -e "${YELLOW}🧪 Testing nginx configuration...${NC}"
    if sudo nginx -t; then
        echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
        
        # Restart nginx
        echo -e "${YELLOW}🔄 Restarting nginx...${NC}"
        sudo systemctl restart nginx
        sudo systemctl enable nginx
        
        echo -e "${GREEN}✅ Nginx restarted successfully${NC}"
    else
        echo -e "${RED}❌ Nginx configuration is invalid${NC}"
        exit 1
    fi
fi

# Create SSL directory if it doesn't exist
echo -e "${YELLOW}📁 Creating SSL directory...${NC}"
mkdir -p ssl

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down || true

# Remove old images (optional)
echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
docker system prune -f || true

# Build and start services
echo -e "${YELLOW}🔨 Building and starting services...${NC}"
docker-compose -f docker-compose.prod.yml --env-file production.env up -d --build

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Setup database (migrations and seeding)
echo -e "${YELLOW}🌱 Setting up database...${NC}"
if [ -f "setup-database.sh" ]; then
    chmod +x setup-database.sh
    ./setup-database.sh
else
    echo -e "${YELLOW}⚠️ setup-database.sh not found, running manual database setup...${NC}"
    docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
    docker-compose -f docker-compose.prod.yml exec backend node prisma/seed.js
fi

# Check service health
echo -e "${YELLOW}🔍 Checking service health...${NC}"
docker-compose -f docker-compose.prod.yml ps

# Test API endpoint
echo -e "${YELLOW}🧪 Testing API endpoint...${NC}"
if curl -f http://$SERVER_IP/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is responding correctly${NC}"
else
    echo -e "${RED}❌ API is not responding${NC}"
fi

# Test frontend
echo -e "${YELLOW}🧪 Testing frontend...${NC}"
if curl -f http://$SERVER_IP/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is responding correctly${NC}"
else
    echo -e "${RED}❌ Frontend is not responding${NC}"
fi

# Test admin panel
echo -e "${YELLOW}🧪 Testing admin panel...${NC}"
if curl -f http://$SERVER_IP/admin > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Admin panel is responding correctly${NC}"
else
    echo -e "${RED}❌ Admin panel is not responding${NC}"
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}📱 Frontend: http://$SERVER_IP${NC}"
echo -e "${GREEN}🔧 Admin Panel: http://$SERVER_IP/admin${NC}"
echo -e "${GREEN}📚 API Docs: http://$SERVER_IP/api/docs${NC}"
echo -e "${GREEN}📁 Uploads: http://$SERVER_IP/uploads/${NC}"

echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "${YELLOW}1. Configure SSL certificates in ./ssl/ directory${NC}"
echo -e "${YELLOW}2. Update DNS records to point to your server IP${NC}"
echo -e "${YELLOW}3. Set up firewall rules for ports 80, 443, 3000, 3001, 3002${NC}"
echo -e "${YELLOW}4. Configure backup for PostgreSQL data${NC}"

