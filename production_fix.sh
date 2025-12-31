#!/bin/bash

echo "🔧 Production Fix Script - Payment Links & CORS Issues"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're on the server
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Are you in the correct directory?"
    exit 1
fi

print_status "Starting production fix process..."

# Step 1: Stop all containers
print_status "Stopping all containers..."
docker-compose down

# Step 2: Pull latest changes (if using git)
if [ -d ".git" ]; then
    print_status "Pulling latest changes..."
    git pull origin main 2>/dev/null || print_warning "Could not pull from git. Make sure files are up to date."
fi

# Step 3: Rebuild backend with latest schema
print_status "Rebuilding backend with latest schema..."
docker-compose build backend

# Step 4: Start only database first
print_status "Starting database..."
docker-compose up -d postgres

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Check if database is ready
if ! docker-compose exec -T postgres pg_isready -U haghighi_user -d haghighi_db 2>/dev/null; then
    print_error "Database is not ready. Waiting longer..."
    sleep 20
fi

# Step 5: Run database migration
print_status "Running database migration to update PaymentStatus enum..."
docker-compose run --rm backend npx prisma db push

# Step 6: Generate Prisma client
print_status "Generating Prisma client..."
docker-compose run --rm backend npx prisma generate

# Step 7: Start all services
print_status "Starting all services..."
docker-compose up -d

# Step 8: Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 15

# Step 9: Test health check
print_status "Testing backend health..."
if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
    print_status "✅ Backend is healthy!"
else
    print_error "❌ Backend health check failed!"
fi

# Step 10: Test CORS (optional)
print_status "Testing CORS configuration..."
CORS_TEST=$(curl -s -I -H "Origin: https://admin.manehaghighi.com" http://localhost:3000/api/health | grep -i "access-control-allow-origin" || echo "No CORS header found")

if echo "$CORS_TEST" | grep -q "admin.manehaghighi.com"; then
    print_status "✅ CORS is properly configured!"
else
    print_warning "⚠️  CORS configuration might need checking on production server."
    print_warning "Make sure the server.env file has correct CORS_ORIGINS."
fi

print_status ""
print_status "🎉 Production fix completed!"
print_status ""
print_status "Next steps for production deployment:"
print_status "1. Copy this script to your server: scp production_fix.sh user@server:/path/to/project/"
print_status "2. Make it executable: chmod +x production_fix.sh"
print_status "3. Run it: ./production_fix.sh"
print_status ""
print_status "If you still have CORS issues:"
print_status "- Check that server.env has: CORS_ORIGINS=https://manehaghighi.com,https://www.manehaghighi.com,https://admin.manehaghighi.com,https://api.manehaghighi.com"
print_status "- Restart nginx: sudo systemctl reload nginx"
print_status "- Check nginx config at /etc/nginx/sites-available/api.manehaghighi.com"