#!/bin/bash

# Don't exit on error immediately
set +e

echo "🚀 Haghighi Platform - Complete Deployment Script"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="185.231.112.84"
PROJECT_DIR="/root/new-haghighi"

# Function to print colored messages
print_message() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Check prerequisites
print_message "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed!"
    exit 1
fi

print_success "Prerequisites check passed"
echo ""

# Step 2: Clean up old Docker resources
print_message "Cleaning up old Docker resources..."
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm -f $(docker ps -aq) 2>/dev/null || true
docker volume rm $(docker volume ls -q) 2>/dev/null || true
docker network rm $(docker network ls | grep haghighi | awk '{print $1}') 2>/dev/null || true
docker system prune -af --volumes || true
print_success "Docker cleanup completed"
echo ""

# Step 3: Create necessary directories
print_message "Creating necessary directories..."
mkdir -p uploads
chmod -R 777 uploads
print_success "Directories created"
echo ""

# Step 4: Check environment file
print_message "Checking environment configuration..."
if [ ! -f "production.env" ]; then
    print_error "production.env file not found!"
    exit 1
fi

# Update IP in environment file (portable for both Linux and macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|API_BASE_URL=.*|API_BASE_URL=http://${SERVER_IP}/api|g" production.env
    sed -i '' "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=http://${SERVER_IP}/api|g" production.env
    sed -i '' "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://${SERVER_IP}|g" production.env
    sed -i '' "s|STATIC_FILES_URL=.*|STATIC_FILES_URL=http://${SERVER_IP}/uploads|g" production.env
else
    # Linux
    sed -i "s|API_BASE_URL=.*|API_BASE_URL=http://${SERVER_IP}/api|g" production.env
    sed -i "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=http://${SERVER_IP}/api|g" production.env
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://${SERVER_IP}|g" production.env
    sed -i "s|STATIC_FILES_URL=.*|STATIC_FILES_URL=http://${SERVER_IP}/uploads|g" production.env
fi

print_success "Environment file configured"
echo ""

# Step 5: Build Docker images
print_message "Building Docker images (this may take several minutes)..."
if ! docker-compose -f docker-compose.prod.yml --env-file production.env build --no-cache; then
    print_error "Failed to build Docker images"
    exit 1
fi
print_success "Docker images built successfully"
echo ""

# Step 6: Start services
print_message "Starting services..."
if ! docker-compose -f docker-compose.prod.yml --env-file production.env up -d; then
    print_error "Failed to start services"
    exit 1
fi
print_success "Services started"
echo ""

# Step 7: Wait for database to be ready
print_message "Waiting for database to be ready..."
sleep 10

# Check if database is accessible
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec haghighi_backend_prod npx prisma db push 2>/dev/null; then
        print_success "Database schema applied"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        print_error "Database connection failed after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "Retrying... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done
echo ""

# Step 8: Setup Nginx
print_message "Setting up Nginx..."

# Check if nginx.conf exists
if [ ! -f "nginx.conf" ]; then
    print_error "nginx.conf file not found!"
    exit 1
fi

# Start nginx container
docker-compose -f docker-compose.prod.yml --env-file production.env up -d
print_success "Nginx configured"
echo ""

# Step 9: Fix uploads permissions
print_message "Setting up uploads directory permissions..."
chmod -R 777 uploads
docker exec haghighi_backend_prod chmod -R 777 /app/uploads 2>/dev/null || true
print_success "Uploads permissions set"
echo ""

# Step 10: Verify services
print_message "Verifying services..."
echo ""

echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""

echo "🔍 Container Logs (last 5 lines each):"
echo ""
echo "Backend:"
docker logs haghighi_backend_prod --tail 5
echo ""
echo "Frontend:"
docker logs haghighi_frontend_prod --tail 5
echo ""
echo "Admin Panel:"
docker logs haghighi_admin_prod --tail 5
echo ""

# Step 11: Health checks
print_message "Running health checks..."
sleep 5

# Check backend health
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    print_success "Backend is healthy"
else
    print_warning "Backend health check failed (may need more time)"
fi

# Check frontend
if curl -f http://localhost:3002/ > /dev/null 2>&1; then
    print_success "Frontend is accessible"
else
    print_warning "Frontend check failed (may need more time)"
fi

# Check admin panel
if curl -f http://localhost:3001/ > /dev/null 2>&1; then
    print_success "Admin panel is accessible"
else
    print_warning "Admin panel check failed (may need more time)"
fi

echo ""
echo "=================================================="
echo "🎉 Deployment Complete!"
echo "=================================================="
echo ""
echo "📍 Your application is now available at:"
echo "   🌐 Main Site:    http://${SERVER_IP}/"
echo "   👨‍💼 Admin Panel:  http://${SERVER_IP}/admin/"
echo "   🔌 API:          http://${SERVER_IP}/api/"
echo "   📚 API Docs:     http://${SERVER_IP}/api/docs/"
echo "   📁 Uploads:      http://${SERVER_IP}/uploads/"
echo ""
echo "📊 Useful Commands:"
echo "   View logs:       docker-compose -f docker-compose.prod.yml logs -f"
echo "   Restart:         docker-compose -f docker-compose.prod.yml restart"
echo "   Stop:            docker-compose -f docker-compose.prod.yml down"
echo "   Status:          docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "=================================================="

