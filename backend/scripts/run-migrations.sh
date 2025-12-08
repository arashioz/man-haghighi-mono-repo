#!/bin/bash

# Script to run all Prisma migrations on server
# This script applies all pending migrations in order

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if running inside Docker container
if [ -f /.dockerenv ]; then
    CONTAINER_NAME="current"
    print_step "Running inside Docker container"
else
    # Check if backend container is running
    if ! docker ps | grep -q haghighi_backend; then
        print_error "Backend container (haghighi_backend) is not running"
        print_error "Please start the containers first: docker-compose up -d"
        exit 1
    fi
    CONTAINER_NAME="haghighi_backend"
    print_step "Running migrations on container: $CONTAINER_NAME"
fi

# Generate Prisma Client first
print_step "Generating Prisma Client..."
if [ "$CONTAINER_NAME" = "current" ]; then
    npx prisma generate || {
        print_error "Failed to generate Prisma Client"
        exit 1
    }
else
    docker exec "$CONTAINER_NAME" npx prisma generate || {
        print_error "Failed to generate Prisma Client"
        exit 1
    }
fi
print_success "Prisma Client generated"

# Run migrations
print_step "Applying database migrations..."
print_warning "This will apply all pending migrations in order"
print_warning "Make sure you have a database backup before proceeding"

if [ "$CONTAINER_NAME" = "current" ]; then
    npx prisma migrate deploy || {
        print_error "Migration failed"
        print_error "Please check the error messages above"
        exit 1
    }
else
    docker exec "$CONTAINER_NAME" npx prisma migrate deploy || {
        print_error "Migration failed"
        print_error "Please check the error messages above"
        exit 1
    }
fi

print_success "All migrations applied successfully!"
print_step "Database schema is now up to date"

