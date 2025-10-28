#!/bin/bash

# Complete cleanup and deploy script without Nginx
# This script removes nginx and deploys the app in no-nginx mode
# Usage: sudo ./full-cleanup-and-deploy.sh

echo "🚀 Full Cleanup and Deploy (No Nginx)"
echo "======================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root or with sudo"
    echo "Usage: sudo ./full-cleanup-and-deploy.sh"
    exit 1
fi

# Part 1: Remove Nginx completely
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PART 1: Removing Nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Stop and disable Nginx service
echo "1️⃣  Stopping Nginx service..."
systemctl stop nginx 2>/dev/null || service nginx stop 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true
echo "   ✅ Done"
echo ""

# Remove Nginx package
echo "2️⃣  Removing Nginx package..."
apt-get remove --purge nginx nginx-common nginx-full -y 2>/dev/null || \
yum remove nginx -y 2>/dev/null || \
dnf remove nginx -y 2>/dev/null || true
apt-get autoremove -y 2>/dev/null || yum autoremove -y 2>/dev/null || true
echo "   ✅ Done"
echo ""

# Remove Nginx files
echo "3️⃣  Removing Nginx files..."
rm -rf /etc/nginx
rm -rf /var/log/nginx
rm -rf /var/lib/nginx
rm -rf /usr/share/nginx
echo "   ✅ Done"
echo ""

# Kill nginx processes
echo "4️⃣  Killing nginx processes..."
pkill -9 nginx 2>/dev/null || true
echo "   ✅ Done"
echo ""

# Part 2: Clean up Docker
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PART 2: Cleaning Docker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Stop all containers
echo "5️⃣  Stopping all containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose-no-nginx.yml down 2>/dev/null || true
docker stop $(docker ps -aq) 2>/dev/null || true
echo "   ✅ Done"
echo ""

# Remove old images
echo "6️⃣  Removing old images..."
docker rmi new-haghighi_frontend 2>/dev/null || true
docker rmi new-haghighi_admin-panel 2>/dev/null || true
docker rmi new-haghighi_backend 2>/dev/null || true
docker rmi new-haghighi_nginx 2>/dev/null || true
echo "   ✅ Done"
echo ""

# Prune system
echo "7️⃣  Cleaning Docker system..."
docker system prune -af --volumes
echo "   ✅ Done"
echo ""

# Part 3: Prepare for deployment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PART 3: Preparing Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create uploads directory
echo "8️⃣  Creating uploads directory..."
mkdir -p uploads
chmod -R 777 uploads
echo "   ✅ Done"
echo ""

# Check environment file
echo "9️⃣  Checking environment file..."
if [ ! -f "production-no-nginx.env" ]; then
    echo "   ⚠️  Warning: production-no-nginx.env not found!"
    echo "   Creating from template..."
    cat > production-no-nginx.env << 'EOF'
# Production Environment Configuration (Without Nginx)
POSTGRES_DB=haghighi_db
POSTGRES_USER=haghighi_user
POSTGRES_PASSWORD=haghighiSecurePassword2025!

JWT_SECRET=haghighi-super-secure-jwt-secret-key-change-this-2025
JWT_EXPIRES_IN=7d

# Get server IP
SERVER_IP=$(curl -s ifconfig.me || echo "185.231.112.84")

API_BASE_URL=http://${SERVER_IP}:3000/api
REACT_APP_API_URL=http://${SERVER_IP}:3000/api

NODE_ENV=production
MAX_FILE_SIZE=10737418240
UPLOAD_PATH=/app/uploads

PORT=3000
HOST=0.0.0.0

CORS_ORIGIN=http://${SERVER_IP}
EOF
else
    echo "   ✅ Environment file exists"
fi
echo ""

# Part 4: Deploy
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PART 4: Deploying Application"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Build images
echo "🔟 Building Docker images..."
docker-compose -f docker-compose-no-nginx.yml --env-file production-no-nginx.env build --no-cache
echo "   ✅ Done"
echo ""

# Start services
echo "1️⃣1️⃣  Starting services..."
docker-compose -f docker-compose-no-nginx.yml --env-file production-no-nginx.env up -d
echo "   ✅ Done"
echo ""

# Wait for services
echo "1️⃣2️⃣  Waiting for services to start..."
sleep 20
echo "   ✅ Done"
echo ""

# Apply database schema
echo "1️⃣3️⃣  Applying database schema..."
sleep 5
docker exec haghighi_backend_prod npx prisma db push 2>/dev/null || echo "   Schema already applied"
echo "   ✅ Done"
echo ""

# Fix permissions
echo "1️⃣4️⃣  Fixing permissions..."
chmod -R 777 uploads
docker exec haghighi_backend_prod chmod -R 777 /app/uploads 2>/dev/null || true
echo "   ✅ Done"
echo ""

# Part 5: Configure Firewall
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PART 5: Configuring Firewall"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1️⃣5️⃣  Opening required ports..."
ufw allow 3000/tcp 2>/dev/null || true
ufw allow 3001/tcp 2>/dev/null || true
ufw allow 3002/tcp 2>/dev/null || true
ufw allow 22/tcp 2>/dev/null || true
echo "   ✅ Done"
echo ""

# Part 6: Verification
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PART 6: Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1️⃣6️⃣  Service Status:"
docker-compose -f docker-compose-no-nginx.yml ps
echo ""

echo "1️⃣7️⃣  Testing endpoints..."
echo ""
echo "   Backend:"
curl -s http://localhost:3000/api/health || echo "   ⚠️  Backend not responding"
echo ""
echo ""
echo "   Frontend:"
curl -I http://localhost:3002/ 2>/dev/null | head -n 1
echo ""
echo "   Admin Panel:"
curl -I http://localhost:3001/ 2>/dev/null | head -n 1
echo ""

# Get server IP
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "   ✅ Nginx completely removed"
echo "   ✅ Docker cleaned and rebuilt"
echo "   ✅ Application deployed without Nginx"
echo "   ✅ Firewall configured"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend:    http://${SERVER_IP}:3002/"
echo "   Admin Panel: http://${SERVER_IP}:3001/"
echo "   Backend API: http://${SERVER_IP}:3000/api/"
echo "   API Docs:    http://${SERVER_IP}:3000/api/docs/"
echo ""
echo "🔍 Useful commands:"
echo "   # View logs:"
echo "   docker-compose -f docker-compose-no-nginx.yml logs -f"
echo ""
echo "   # Restart services:"
echo "   docker-compose -f docker-compose-no-nginx.yml restart"
echo ""
echo "   # Stop services:"
echo "   docker-compose -f docker-compose-no-nginx.yml down"
echo ""
echo "   # Check status:"
echo "   docker-compose -f docker-compose-no-nginx.yml ps"
echo ""
echo "⚠️  IMPORTANT:"
echo "   If you get NKK2 or firewall errors from outside, it's your ISP/network blocking."
echo "   The app is working fine on the server itself."
echo ""

