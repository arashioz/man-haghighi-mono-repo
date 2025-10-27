#!/bin/bash

# Haghighi Platform Production Deployment Script
echo "🚀 Starting Haghighi Platform Production Deployment..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    print_status "Copying production.env to .env..."
    cp production.env .env
    print_warning "Please edit .env file with your production values before continuing!"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

print_status "Environment variables loaded"

# Stop any running containers
print_status "Stopping any running containers..."
docker-compose down

# Remove old images to save space
print_status "Cleaning up old Docker images..."
docker image prune -f

# Build and start services
print_status "Building and starting production services..."
docker-compose up --build -d

# Wait for services to start
print_status "Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    print_status "✅ All services are running successfully!"

    echo ""
    echo "🌐 Service URLs:"
    echo "   - Main Website: http://localhost"
    echo "   - Admin Panel: http://localhost/admin"
    echo "   - API Documentation: http://localhost/api/docs"
    echo "   - Direct API: http://localhost/api"
    echo ""

    print_status "Container Status:"
    docker-compose ps

    echo ""
    print_status "To view logs: docker-compose logs -f"
    print_status "To stop services: docker-compose down"
    print_status "To restart services: docker-compose restart"

else
    print_error "❌ Some services failed to start!"
    echo ""
    print_status "Checking logs..."
    docker-compose logs

    echo ""
    print_warning "Troubleshooting tips:"
    echo "1. Check if ports 80, 3000, 3001, 3002, 5432 are available"
    echo "2. Check firewall settings"
    echo "3. Verify .env file has correct database credentials"
    echo "4. Check Docker daemon is running"

fi
