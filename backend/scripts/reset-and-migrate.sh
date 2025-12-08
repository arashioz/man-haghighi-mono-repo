#!/bin/sh

# Script to reset database and apply all migrations from scratch
# WARNING: This will delete all data in the database!
# Use only for development or when you have a backup

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

# Check if running in non-interactive mode (Docker)
if [ -f /.dockerenv ] || [ -n "$RESET_DB" ]; then
    # Running in Docker or RESET_DB is set
    if [ "$RESET_DB" = "true" ]; then
        print_warning "RESET_DB is set to 'true' - proceeding with database reset"
        print_error "WARNING: This will DELETE ALL DATA in the database!"
    else
        print_step "RESET_DB is not set to 'true' - skipping database reset"
        print_step "Running migrations only..."
        # Just run migrations without reset
        # Note: Prisma Client is already generated during Docker build, so we skip generation
        if [ "$CONTAINER_NAME" = "current" ]; then
            print_step "Applying migrations..."
            npx prisma migrate deploy || {
                print_error "Failed to apply migrations"
                exit 1
            }
        else
            print_step "Applying migrations..."
            npx prisma migrate deploy || {
                print_error "Failed to apply migrations"
                exit 1
            }
        fi
        print_success "Migrations applied successfully!"
        exit 0
    fi
else
    # Interactive mode (local development)
    print_error "WARNING: This script will DELETE ALL DATA in the database!"
    print_error "Make sure you have a backup before proceeding!"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        print_warning "Operation cancelled"
        exit 0
    fi
fi

# Reset database and apply all migrations
print_step "Resetting database and applying all migrations..."

# Note: Prisma Client is already generated during Docker build, so we skip generation
if [ "$CONTAINER_NAME" = "current" ]; then
    # Reset database (drops all tables and applies migrations)
    print_step "Resetting database..."
    npx prisma migrate reset --force || {
        print_error "Failed to reset database"
        exit 1
    }
else
    # Reset database (drops all tables and applies migrations)
    print_step "Resetting database..."
    npx prisma migrate reset --force || {
        print_error "Failed to reset database"
        exit 1
    }
fi

print_success "Database reset and all migrations applied successfully!"
