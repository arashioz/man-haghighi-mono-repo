#!/bin/bash

# Production deployment script for Haghighi Platform
# Usage: ./deploy-prod.sh [SERVER_IP]

set -e

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

# Check if SERVER_IP is provided
if [ -z "$1" ]; then
    print_error "Please provide your server IP address"
    echo "Usage: ./deploy-prod.sh YOUR_SERVER_IP"
    exit 1
fi

SERVER_IP=$1

print_status "Starting production deployment for server IP: $SERVER_IP"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Update production.env with server IP
print_status "Updating environment variables with server IP..."
sed -i.bak "s/YOUR_SERVER_IP/$SERVER_IP/g" production.env

# Stop any existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start services
print_status "Building and starting production services..."
docker-compose -f docker-compose.prod.yml --env-file production.env up -d --build

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check backend health
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    print_status "Backend is healthy"
else
    print_warning "Backend health check failed"
fi

# Check frontend
if curl -f http://localhost:3002/health > /dev/null 2>&1; then
    print_status "Frontend is healthy"
else
    print_warning "Frontend health check failed"
fi

# Check admin panel
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    print_status "Admin panel is healthy"
else
    print_warning "Admin panel health check failed"
fi

print_status "Deployment completed!"
echo ""
echo "Services are running on:"
echo "  Backend API: http://$SERVER_IP:3000"
echo "  Admin Panel: http://$SERVER_IP:3001"
echo "  Frontend: http://$SERVER_IP:3002"
echo ""
print_warning "Don't forget to:"
echo "  1. Update your firewall to allow ports 3000, 3001, 3002"
echo "  2. Change default passwords in production.env"
echo "  3. Set up SSL certificates for HTTPS"
echo "  4. Configure proper backup for PostgreSQL database"
