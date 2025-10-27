#!/bin/bash

# Deployment script WITHOUT Nginx

echo "🚀 Starting deployment (No Nginx)..."
echo "====================================="
echo ""

SERVER_IP="185.231.112.84"

# Clean up old containers
echo "1️⃣ Stopping old containers..."
docker-compose -f docker-compose-no-nginx.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Remove old containers
echo "2️⃣ Removing old containers..."
docker ps -aq | xargs docker rm -f 2>/dev/null || true

# Remove PostgreSQL volumes (to fix version conflicts)
echo "3️⃣ Removing PostgreSQL volumes..."
docker volume rm postgres_data_prod 2>/dev/null || true
docker volume rm new-haghighi_postgres_data_prod 2>/dev/null || true

# Prune system
echo "4️⃣ Cleaning Docker system..."
docker system prune -af --volumes 2>/dev/null || true

# Create uploads directory
echo "5️⃣ Creating uploads directory..."
mkdir -p uploads
chmod -R 777 uploads

# Remove homepage from admin-panel package.json (for no-nginx deployment)
echo "6️⃣ Preparing admin-panel for direct access..."
if grep -q '"homepage":' admin-panel/package.json; then
    sed -i.bak '/"homepage":/d' admin-panel/package.json || true
fi

# Build images
echo "7️⃣ Building Docker images..."
docker-compose -f docker-compose-no-nginx.yml --env-file production-no-nginx.env build --no-cache

# Start services
echo "8️⃣ Starting services..."
docker-compose -f docker-compose-no-nginx.yml --env-file production-no-nginx.env up -d

# Restore admin-panel package.json if backup exists
if [ -f admin-panel/package.json.bak ]; then
    mv admin-panel/package.json.bak admin-panel/package.json
fi

# Wait for services
echo "9️⃣ Waiting for services to start..."
sleep 25

# Apply database schema
echo "🔟 Applying database schema..."
sleep 5
docker exec haghighi_backend_prod npx prisma db push 2>/dev/null || echo "Schema already applied"

# Fix permissions
echo "1️⃣1️⃣ Fixing permissions..."
chmod -R 777 uploads
docker exec haghighi_backend_prod chmod -R 777 /app/uploads 2>/dev/null || true

# Show status
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose-no-nginx.yml ps

echo ""
echo "✅ Deployment complete (No Nginx)!"
echo ""
echo "🌐 Access your app at:"
echo "   Frontend:    http://${SERVER_IP}:3002/"
echo "   Admin Panel: http://${SERVER_IP}:3001/"
echo "   Backend API: http://${SERVER_IP}:3000/api/"
echo "   API Docs:    http://${SERVER_IP}:3000/api/docs/"
echo "   Uploads:     http://${SERVER_IP}:3000/uploads/"
echo ""
echo "⚠️  Note: You need to open these ports in firewall:"
echo "   sudo ufw allow 3000/tcp"
echo "   sudo ufw allow 3001/tcp"
echo "   sudo ufw allow 3002/tcp"
echo ""
echo "📝 View logs with:"
echo "   docker-compose -f docker-compose-no-nginx.yml logs -f"
echo ""

