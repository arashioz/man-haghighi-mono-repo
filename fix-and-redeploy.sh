#!/bin/bash

# Quick fix and redeploy script
echo "🔧 Applying fixes and redeploying..."
echo "===================================="
echo ""

# Stop existing containers
echo "1️⃣ Stopping existing containers..."
docker-compose -f docker-compose-no-nginx.yml down

# Remove old images to force rebuild
echo "2️⃣ Removing old images..."
docker rmi new-haghighi-frontend:latest 2>/dev/null || true
docker rmi new-haghighi-admin-panel:latest 2>/dev/null || true
docker rmi new-haghighi_frontend 2>/dev/null || true
docker rmi new-haghighi_admin-panel 2>/dev/null || true

# Rebuild with no cache to ensure changes are applied
echo "3️⃣ Rebuilding images with fixes..."
docker-compose -f docker-compose-no-nginx.yml --env-file production-no-nginx.env build --no-cache frontend admin-panel

# Start services
echo "4️⃣ Starting services..."
docker-compose -f docker-compose-no-nginx.yml --env-file production-no-nginx.env up -d

# Wait for services to be ready
echo "5️⃣ Waiting for services to start..."
sleep 15

# Show status
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose-no-nginx.yml ps

echo ""
echo "✅ Redeployment complete!"
echo ""
echo "🌐 Access your app at:"
echo "   Frontend:    http://185.231.112.84:3002/"
echo "   Admin Panel: http://185.231.112.84:3001/"
echo "   Backend API: http://185.231.112.84:3000/api/"
echo ""
echo "📝 View logs with:"
echo "   docker-compose -f docker-compose-no-nginx.yml logs -f [frontend|admin-panel]"
echo ""

# Test API endpoints
echo "🧪 Testing endpoints..."
echo ""
echo "Backend health:"
curl -s http://localhost:3000/api/health || echo "Backend not responding"
echo ""
echo ""
echo "Frontend assets:"
curl -I http://localhost:3002/ 2>/dev/null | head -n 1
echo ""
echo "Admin panel assets:"
curl -I http://localhost:3001/ 2>/dev/null | head -n 1
echo ""


