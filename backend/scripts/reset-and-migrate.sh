#!/bin/sh

# Script to reset database and apply all migrations from scratch
# WARNING: This will delete all data in the database!
# Use only for development or when you have a backup

# Note: We don't use 'set -e' here because we want to continue even if some migrations fail
# set -e

# Function to check if initial tables exist
check_initial_tables_exist() {
    # Check if users table exists by trying to query it
    if [ "$CONTAINER_NAME" = "current" ]; then
        # Use a simple query that will fail if table doesn't exist
        npx prisma db execute --stdin <<EOF 2>/dev/null >/dev/null || return 1
SELECT 1 FROM "users" LIMIT 1;
EOF
    else
        # For docker, we need to check via postgres directly or use prisma
        docker exec $CONTAINER_NAME sh -c 'npx prisma db execute --stdin <<EOF 2>/dev/null >/dev/null || exit 1
SELECT 1 FROM "users" LIMIT 1;
EOF' || return 1
    fi
    return 0
}

# Function to ensure initial migration is applied
ensure_initial_migration() {
    print_step "Checking if initial migration is applied..."
    
    if check_initial_tables_exist; then
        print_success "Initial tables exist, skipping initial migration check"
        return 0
    fi
    
    print_warning "Initial tables not found - ensuring initial migration is applied..."
    
    # Check if initial migration exists in migration history
    local initial_migration="20251013230351_initial"
    
    if [ "$CONTAINER_NAME" = "current" ]; then
        # Check migration status
        MIGRATION_STATUS=$(npx prisma migrate status 2>&1 || echo "")
        
        # If initial migration is marked as applied but tables don't exist, mark as rolled-back
        if echo "$MIGRATION_STATUS" | grep -q "$initial_migration"; then
            if echo "$MIGRATION_STATUS" | grep -q "$initial_migration.*applied"; then
                print_warning "Initial migration marked as applied but tables don't exist - resolving..."
                npx prisma migrate resolve --rolled-back "$initial_migration" 2>/dev/null || true
            elif echo "$MIGRATION_STATUS" | grep -q "$initial_migration.*failed"; then
                print_warning "Initial migration failed - resolving..."
                npx prisma migrate resolve --rolled-back "$initial_migration" 2>/dev/null || true
            fi
        fi
        
        # Try to apply initial migration specifically
        print_step "Attempting to apply initial migration..."
        INITIAL_OUTPUT=$(npx prisma migrate deploy 2>&1)
        
        # Check if it succeeded by verifying tables exist
        sleep 1
        if check_initial_tables_exist; then
            print_success "Initial migration applied successfully"
            return 0
        else
            print_warning "Initial migration may still be pending"
        fi
    else
        MIGRATION_STATUS=$(docker exec $CONTAINER_NAME npx prisma migrate status 2>&1 || echo "")
        
        if echo "$MIGRATION_STATUS" | grep -q "$initial_migration"; then
            if echo "$MIGRATION_STATUS" | grep -q "$initial_migration.*applied"; then
                print_warning "Initial migration marked as applied but tables don't exist - resolving..."
                docker exec $CONTAINER_NAME npx prisma migrate resolve --rolled-back "$initial_migration" 2>/dev/null || true
            elif echo "$MIGRATION_STATUS" | grep -q "$initial_migration.*failed"; then
                print_warning "Initial migration failed - resolving..."
                docker exec $CONTAINER_NAME npx prisma migrate resolve --rolled-back "$initial_migration" 2>/dev/null || true
            fi
        fi
        
        print_step "Attempting to apply initial migration..."
        INITIAL_OUTPUT=$(docker exec $CONTAINER_NAME npx prisma migrate deploy 2>&1)
        
        sleep 1
        if check_initial_tables_exist; then
            print_success "Initial migration applied successfully"
            return 0
        else
            print_warning "Initial migration may still be pending"
        fi
    fi
    
    return 0
}

# Function to safely apply migrations with error recovery
safe_migrate_deploy() {
    local max_retries=3
    local retry_count=0
    
    # First, ensure initial migration is applied
    ensure_initial_migration
    
    while [ $retry_count -lt $max_retries ]; do
        if [ "$CONTAINER_NAME" = "current" ]; then
            MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
            MIGRATE_EXIT=$?
        else
            MIGRATE_OUTPUT=$(docker exec $CONTAINER_NAME npx prisma migrate deploy 2>&1)
            MIGRATE_EXIT=$?
        fi
        
        if [ $MIGRATE_EXIT -eq 0 ]; then
            return 0
        fi
        
        # Check for P3018 error (migration failed to apply)
        if echo "$MIGRATE_OUTPUT" | grep -q "P3018"; then
            FAILED_MIGRATION=$(echo "$MIGRATE_OUTPUT" | grep -oP "Migration name: \K[^\s]+" || echo "")
            if [ -n "$FAILED_MIGRATION" ]; then
                print_warning "Migration failed: $FAILED_MIGRATION"
                
                # Special handling for migrations that depend on initial tables
                if ! check_initial_tables_exist; then
                    print_error "Initial tables don't exist - this migration depends on them"
                    print_step "Ensuring initial migration is applied first..."
                    ensure_initial_migration
                    # Retry immediately without marking as rolled-back
                    retry_count=$((retry_count + 1))
                    if [ $retry_count -lt $max_retries ]; then
                        print_step "Retry $retry_count/$max_retries (after ensuring initial migration)..."
                        sleep 2
                        continue
                    fi
                fi
                
                print_step "Marking as rolled-back and retrying..."
                
                if [ "$CONTAINER_NAME" = "current" ]; then
                    npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" 2>/dev/null || true
                else
                    docker exec $CONTAINER_NAME npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" 2>/dev/null || true
                fi
                
                retry_count=$((retry_count + 1))
                if [ $retry_count -lt $max_retries ]; then
                    print_step "Retry $retry_count/$max_retries..."
                    sleep 1
                    continue
                fi
            fi
        fi
        
        # Other errors or max retries reached
        print_warning "Migration deployment had issues, but continuing..."
        echo "$MIGRATE_OUTPUT" | head -10
        return 1
    done
    
    return 1
}

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

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
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
        print_step "Running safe migrations (failed migrations will be skipped)..."
        # Use safe migration script that continues even if some migrations fail
        # Note: Prisma Client is already generated during Docker build, so we skip generation
        
        # First, try to resolve any known failed migrations (in case of previous failures)
        print_step "Checking for existing failed migrations..."
        if [ "$CONTAINER_NAME" = "current" ]; then
            # Try to resolve known problematic migrations
            npx prisma migrate resolve --rolled-back 20250101000000_add_podcast_thumbnail 2>/dev/null || true
            npx prisma migrate resolve --rolled-back 20251014000000_add_podcast_thumbnail 2>/dev/null || true
            
            # Run safe migration process
            print_step "Applying migrations with error recovery..."
            safe_migrate_deploy || {
                print_warning "Some migrations may have failed, but continuing startup..."
                print_info "Check migration status later with: npx prisma migrate status"
            }
            
            # Final check: verify initial tables exist
            if ! check_initial_tables_exist; then
                print_error "CRITICAL: Initial tables still don't exist after migration attempts!"
                print_warning "The application may not work correctly. Please check migration status manually."
            fi
        else
            # Try to resolve known problematic migrations
            docker exec $CONTAINER_NAME npx prisma migrate resolve --rolled-back 20250101000000_add_podcast_thumbnail 2>/dev/null || true
            docker exec $CONTAINER_NAME npx prisma migrate resolve --rolled-back 20251014000000_add_podcast_thumbnail 2>/dev/null || true
            
            # Run safe migration process
            print_step "Applying migrations with error recovery..."
            safe_migrate_deploy || {
                print_warning "Some migrations may have failed, but continuing startup..."
                print_info "Check migration status later with: docker exec $CONTAINER_NAME npx prisma migrate status"
            }
            
            # Final check: verify initial tables exist
            if ! check_initial_tables_exist; then
                print_error "CRITICAL: Initial tables still don't exist after migration attempts!"
                print_warning "The application may not work correctly. Please check migration status manually."
            fi
        fi
        print_success "Migration process completed (some migrations may have been skipped)"
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
