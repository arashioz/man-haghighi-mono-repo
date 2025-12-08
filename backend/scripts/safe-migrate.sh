#!/bin/sh

# Safe migration script that skips failed migrations and continues
# This script applies migrations one by one and marks failed ones as rolled-back

set +e  # Don't exit on error - we want to continue even if a migration fails

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

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
    print_step "Running migrations on container: $CONTAINER_NAME"
fi

# Function to get list of pending migrations
get_pending_migrations() {
    if [ "$CONTAINER_NAME" = "current" ]; then
        npx prisma migrate status --schema=./prisma/schema.prisma 2>&1 | grep -E "^\s+[0-9]{14}_" | awk '{print $1}' || echo ""
    else
        docker exec $CONTAINER_NAME npx prisma migrate status 2>&1 | grep -E "^\s+[0-9]{14}_" | awk '{print $1}' || echo ""
    fi
}

# Function to apply a single migration
apply_single_migration() {
    local migration_name=$1
    
    print_step "Attempting to apply migration: $migration_name"
    
    if [ "$CONTAINER_NAME" = "current" ]; then
        OUTPUT=$(npx prisma migrate deploy --create-only --name temp_migration 2>&1)
        # Actually, we need a different approach - Prisma doesn't support applying single migrations directly
        # So we'll use migrate resolve to mark failed ones and let deploy continue
        return 1
    else
        OUTPUT=$(docker exec $CONTAINER_NAME npx prisma migrate deploy 2>&1)
        return $?
    fi
}

# Function to resolve a failed migration
resolve_failed_migration() {
    local migration_name=$1
    
    print_warning "Resolving failed migration: $migration_name"
    
    if [ "$CONTAINER_NAME" = "current" ]; then
        # Try to mark as rolled-back
        npx prisma migrate resolve --rolled-back "$migration_name" 2>/dev/null && {
            print_success "Marked $migration_name as rolled-back"
            return 0
        } || {
            print_warning "Could not resolve $migration_name via Prisma"
            # Try direct database cleanup
            print_info "Attempting direct database cleanup..."
            return 1
        }
    else
        docker exec $CONTAINER_NAME npx prisma migrate resolve --rolled-back "$migration_name" 2>/dev/null && {
            print_success "Marked $migration_name as rolled-back"
            return 0
        } || {
            print_warning "Could not resolve $migration_name via Prisma"
            return 1
        }
    fi
}

# Main migration function with error handling
run_safe_migrations() {
    print_step "Starting safe migration process..."
    print_info "Failed migrations will be marked as rolled-back and skipped"
    echo ""
    
    SUCCESS_COUNT=0
    FAILED_COUNT=0
    SKIPPED_COUNT=0
    FAILED_MIGRATIONS=""
    
    # First, try normal migrate deploy
    print_step "Attempting standard migration deployment..."
    
    if [ "$CONTAINER_NAME" = "current" ]; then
        MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
        MIGRATE_EXIT=$?
    else
        MIGRATE_OUTPUT=$(docker exec $CONTAINER_NAME npx prisma migrate deploy 2>&1)
        MIGRATE_EXIT=$?
    fi
    
    if [ $MIGRATE_EXIT -eq 0 ]; then
        print_success "All migrations applied successfully!"
        return 0
    fi
    
    # Check if we have a P3018 error (migration failed to apply)
    if echo "$MIGRATE_OUTPUT" | grep -q "P3018"; then
        print_warning "Migration failed detected (P3018)"
        
        # Extract failed migration name
        FAILED_MIGRATION=$(echo "$MIGRATE_OUTPUT" | grep -oP "Migration name: \K[^\s]+" || echo "")
        
        if [ -n "$FAILED_MIGRATION" ]; then
            print_error "Failed migration: $FAILED_MIGRATION"
            FAILED_MIGRATIONS="$FAILED_MIGRATIONS $FAILED_MIGRATION"
            
            # Try to resolve it
            if resolve_failed_migration "$FAILED_MIGRATION"; then
                SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
                print_warning "Skipping failed migration: $FAILED_MIGRATION"
                
                # Retry migration deployment
                print_step "Retrying migration deployment after resolving failed migration..."
                if [ "$CONTAINER_NAME" = "current" ]; then
                    RETRY_OUTPUT=$(npx prisma migrate deploy 2>&1)
                    RETRY_EXIT=$?
                else
                    RETRY_OUTPUT=$(docker exec $CONTAINER_NAME npx prisma migrate deploy 2>&1)
                    RETRY_EXIT=$?
                fi
                
                if [ $RETRY_EXIT -eq 0 ]; then
                    print_success "Remaining migrations applied successfully after skipping failed one"
                    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
                else
                    # Recursive call to handle multiple failures
                    print_warning "Another migration failed, attempting to resolve..."
                    run_safe_migrations
                    return $?
                fi
            else
                print_error "Could not resolve failed migration: $FAILED_MIGRATION"
                FAILED_COUNT=$((FAILED_COUNT + 1))
            fi
        fi
    else
        # Other error types
        print_error "Migration error (not P3018):"
        echo "$MIGRATE_OUTPUT" | head -20
        return 1
    fi
    
    # Summary
    echo ""
    print_step "Migration Summary:"
    if [ $SUCCESS_COUNT -gt 0 ]; then
        print_success "Successful: $SUCCESS_COUNT"
    fi
    if [ $SKIPPED_COUNT -gt 0 ]; then
        print_warning "Skipped (rolled-back): $SKIPPED_COUNT"
        echo "  Failed migrations: $FAILED_MIGRATIONS"
    fi
    if [ $FAILED_COUNT -gt 0 ]; then
        print_error "Failed (could not resolve): $FAILED_COUNT"
    fi
    
    return 0
}

# Check for existing failed migrations and resolve them first
print_step "Checking for existing failed migrations..."
if [ "$CONTAINER_NAME" = "current" ]; then
    STATUS_OUTPUT=$(npx prisma migrate status 2>&1)
else
    STATUS_OUTPUT=$(docker exec $CONTAINER_NAME npx prisma migrate status 2>&1)
fi

if echo "$STATUS_OUTPUT" | grep -qi "failed"; then
    print_warning "Found existing failed migrations. Resolving them first..."
    
    # Extract failed migration names
    FAILED_LIST=$(echo "$STATUS_OUTPUT" | grep -iE "failed|20250101000000|20251014000000" | grep -oE "[0-9]{14}_[a-z_]+" | sort -u || echo "")
    
    for migration in $FAILED_LIST; do
        print_info "Resolving: $migration"
        resolve_failed_migration "$migration" || true
    done
fi

# Run safe migrations
run_safe_migrations

# Final status check
echo ""
print_step "Final migration status:"
if [ "$CONTAINER_NAME" = "current" ]; then
    npx prisma migrate status 2>&1 | head -30
else
    docker exec $CONTAINER_NAME npx prisma migrate status 2>&1 | head -30
fi

print_success "Safe migration process completed!"

