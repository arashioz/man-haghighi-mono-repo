#!/bin/bash

# Simple deployment script for server
# Usage: ./deploy.sh

echo "🚀 Deploying Haghighi Platform..."
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Creating from server.env..."
    cp server.env .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and set your server IP and passwords!"
    echo "Run: nano .env"
    echo ""
    read -p "Press Enter after editing .env file..."
fi

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p uploads
chmod 777 uploads
echo "✅ Done"
echo ""

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down
echo "✅ Done"
echo ""

# Build images
echo "🔨 Building Docker images..."
docker-compose build --no-cache
echo "✅ Done"
echo ""

# Start containers
echo "▶️  Starting containers..."
docker-compose up -d
echo "✅ Done"
echo ""

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 15
echo "✅ Done"
echo ""

# Show status
echo "📊 Container status:"
docker-compose ps
echo ""

# Get server IP (try multiple methods)
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}')

echo "=================================="
echo "✅ Deployment Complete!"
echo "=================================="
echo ""
echo "🌐 Access your services:"
echo "   Frontend:    http://${SERVER_IP}:3002"
echo "   Admin Panel: http://${SERVER_IP}:3001"
echo "   Backend API: http://${SERVER_IP}:3000/api"
echo "   API Docs:    http://${SERVER_IP}:3000/api/docs"
echo ""
echo "📝 Useful commands:"
echo "   View logs:       docker-compose logs -f"
echo "   Restart:         docker-compose restart"
echo "   Stop:            docker-compose down"
echo "   Rebuild:         docker-compose build --no-cache"
echo ""
echo "🔧 Test locally on server:"
echo "   curl http://localhost:3000/api/health"
echo "   curl http://localhost:3001/"
echo "   curl http://localhost:3002/"
echo ""

