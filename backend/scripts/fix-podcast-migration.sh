#!/bin/sh

# Script to fix the podcast thumbnail migration issue on server
# This script removes the old failed migration and ensures the new one is in place

set -e

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

print_step "Fixing podcast thumbnail migration issue..."

# Check if running inside Docker container
if [ -f /.dockerenv ]; then
    CONTAINER_NAME="current"
    print_step "Running inside Docker container"
else
    if ! docker ps | grep -q haghighi_backend; then
        print_error "Backend container (haghighi_backend) is not running"
        exit 1
    fi
    CONTAINER_NAME="haghighi_backend"
    print_step "Running fix on container: $CONTAINER_NAME"
fi

# Step 1: Remove old migration folder if it exists
print_step "Step 1: Removing old migration folder (20250101000000_add_podcast_thumbnail)..."
if [ "$CONTAINER_NAME" = "current" ]; then
    if [ -d "prisma/migrations/20250101000000_add_podcast_thumbnail" ]; then
        rm -rf prisma/migrations/20250101000000_add_podcast_thumbnail
        print_success "Removed old migration folder"
    else
        print_step "Old migration folder not found (may already be removed)"
    fi
else
    docker exec $CONTAINER_NAME sh -c 'if [ -d "prisma/migrations/20250101000000_add_podcast_thumbnail" ]; then rm -rf prisma/migrations/20250101000000_add_podcast_thumbnail && echo "Removed"; else echo "Not found"; fi' | while read line; do
        if [ "$line" = "Removed" ]; then
            print_success "Removed old migration folder"
        else
            print_step "Old migration folder not found (may already be removed)"
        fi
    done
fi

# Step 2: Verify new migration exists
print_step "Step 2: Verifying new migration exists (20251014000000_add_podcast_thumbnail)..."
if [ "$CONTAINER_NAME" = "current" ]; then
    if [ -d "prisma/migrations/20251014000000_add_podcast_thumbnail" ]; then
        print_success "New migration folder exists"
    else
        print_error "New migration folder not found! Please ensure it's deployed."
        exit 1
    fi
else
    if docker exec $CONTAINER_NAME test -d prisma/migrations/20251014000000_add_podcast_thumbnail; then
        print_success "New migration folder exists"
    else
        print_error "New migration folder not found! Please ensure it's deployed."
        exit 1
    fi
fi

# Step 3: Remove failed migration record from database
print_step "Step 3: Removing failed migration record from database..."
if [ "$CONTAINER_NAME" = "current" ]; then
    # Try to resolve as rolled-back first
    npx prisma migrate resolve --rolled-back 20250101000000_add_podcast_thumbnail 2>/dev/null && {
        print_success "Marked old migration as rolled-back"
    } || {
        print_step "Could not resolve via Prisma (may not exist in migration table)"
    }
    
    # Also try to delete directly from database if Prisma resolve doesn't work
    print_step "Attempting direct database cleanup..."
    npx prisma db execute --stdin <<EOF 2>/dev/null || true
DELETE FROM "_prisma_migrations" WHERE migration_name = '20250101000000_add_podcast_thumbnail';
EOF
    print_success "Database cleanup attempted"
else
    # Try to resolve as rolled-back first
    docker exec $CONTAINER_NAME npx prisma migrate resolve --rolled-back 20250101000000_add_podcast_thumbnail 2>/dev/null && {
        print_success "Marked old migration as rolled-back"
    } || {
        print_step "Could not resolve via Prisma (may not exist in migration table)"
    }
    
    # Also try to delete directly from database
    print_step "Attempting direct database cleanup..."
    docker exec $CONTAINER_NAME sh -c 'echo "DELETE FROM \"_prisma_migrations\" WHERE migration_name = '\''20250101000000_add_podcast_thumbnail'\'';" | npx prisma db execute --stdin' 2>/dev/null || true
    print_success "Database cleanup attempted"
fi

# Step 4: Verify migration status
print_step "Step 4: Checking migration status..."
if [ "$CONTAINER_NAME" = "current" ]; then
    npx prisma migrate status 2>&1 | head -20
else
    docker exec $CONTAINER_NAME npx prisma migrate status 2>&1 | head -20
fi

print_success "Fix completed! You can now try running migrations again."

