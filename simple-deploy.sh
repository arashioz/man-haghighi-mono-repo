#!/bin/bash

# Simple deployment script without complex error handling

echo "🚀 Starting deployment..."
echo ""

# Clean up old containers
echo "1️⃣ Stopping old containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Remove old containers
echo "2️⃣ Removing old containers..."
docker ps -aq | xargs docker rm -f 2>/dev/null || true

# Prune system
echo "3️⃣ Cleaning Docker system..."
docker system prune -af --volumes 2>/dev/null || true

# Create uploads directory
echo "4️⃣ Creating uploads directory..."
mkdir -p uploads
chmod -R 777 uploads

# Build images
echo "5️⃣ Building Docker images..."
docker-compose -f docker-compose.prod.yml --env-file production.env build --no-cache

# Start services
echo "6️⃣ Starting services..."
docker-compose -f docker-compose.prod.yml --env-file production.env up -d

# Wait for services
echo "7️⃣ Waiting for services to start..."
sleep 15

# Apply database schema
echo "8️⃣ Applying database schema..."
docker exec haghighi_backend_prod npx prisma db push 2>/dev/null || echo "Schema already applied"

# Fix permissions
echo "9️⃣ Fixing permissions..."
chmod -R 777 uploads
docker exec haghighi_backend_prod chmod -R 777 /app/uploads 2>/dev/null || true

# Show status
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your app at:"
echo "   http://185.231.112.84/"
echo "   http://185.231.112.84/admin/"
echo "   http://185.231.112.84/api/"
echo ""
echo "📝 View logs with:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo ""

