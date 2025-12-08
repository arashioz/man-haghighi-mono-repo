#!/bin/sh

# Simple and robust migration script for Docker
# Handles database connection, failed migrations, and continues execution

set +e  # Don't exit on error - we want to continue even if migrations fail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Wait for database to be ready
wait_for_database() {
    log_info "Waiting for database to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if npx prisma db execute --stdin <<EOF 2>/dev/null >/dev/null; then
SELECT 1;
EOF
            log_success "Database is ready"
            return 0
        fi
        
        attempt=$((attempt + 1))
        if [ $((attempt % 5)) -eq 0 ]; then
            log_info "Still waiting... (attempt $attempt/$max_attempts)"
        fi
        sleep 1
    done
    
    log_error "Database not ready after $max_attempts attempts"
    return 1
}

# Check if a table exists
table_exists() {
    local table=$1
    npx prisma db execute --stdin <<EOF 2>/dev/null >/dev/null || return 1
SELECT 1 FROM "$table" LIMIT 1;
EOF
}

# Resolve a failed migration
resolve_failed_migration() {
    local migration=$1
    log_warning "Resolving failed migration: $migration"
    npx prisma migrate resolve --rolled-back "$migration" 2>/dev/null || true
}

# Apply migrations with error recovery
apply_migrations() {
    log_info "Applying database migrations..."
    
    local max_retries=3
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        OUTPUT=$(npx prisma migrate deploy 2>&1)
        EXIT_CODE=$?
        
        if [ $EXIT_CODE -eq 0 ]; then
            log_success "All migrations applied successfully"
            return 0
        fi
        
        # Check for P3018 error (migration failed)
        if echo "$OUTPUT" | grep -q "P3018"; then
            FAILED_MIGRATION=$(echo "$OUTPUT" | grep -oP "Migration name: \K[^\s]+" || echo "")
            
            if [ -n "$FAILED_MIGRATION" ]; then
                log_warning "Migration failed: $FAILED_MIGRATION"
                
                # Special handling for initial migration
                if [ "$FAILED_MIGRATION" = "20251013230351_initial" ]; then
                    log_warning "Initial migration failed - this is critical"
                    # Try to resolve and retry
                    resolve_failed_migration "$FAILED_MIGRATION"
                    retry=$((retry + 1))
                    if [ $retry -lt $max_retries ]; then
                        log_info "Retrying... ($retry/$max_retries)"
                        sleep 2
                        continue
                    fi
                else
                    # For other migrations, mark as rolled-back and continue
                    log_warning "Skipping failed migration: $FAILED_MIGRATION"
                    resolve_failed_migration "$FAILED_MIGRATION"
                    retry=$((retry + 1))
                    if [ $retry -lt $max_retries ]; then
                        log_info "Retrying... ($retry/$max_retries)"
                        sleep 1
                        continue
                    fi
                fi
            fi
        fi
        
        # Other errors
        log_warning "Migration error (not P3018):"
        echo "$OUTPUT" | head -5
        retry=$((retry + 1))
        if [ $retry -lt $max_retries ]; then
            log_info "Retrying... ($retry/$max_retries)"
            sleep 1
        fi
    done
    
    log_warning "Some migrations may have failed, but continuing..."
    return 1
}

# Verify essential tables exist
verify_tables() {
    log_info "Verifying essential tables..."
    
    local missing=""
    
    if ! table_exists "users"; then
        missing="$missing users"
    fi
    
    if ! table_exists "logs"; then
        missing="$missing logs"
    fi
    
    if [ -n "$missing" ]; then
        log_warning "Missing tables:$missing"
        log_info "These tables will be created when their migrations are applied"
        return 1
    fi
    
    log_success "Essential tables exist"
    return 0
}

# Main execution
main() {
    log_info "Starting migration process..."
    
    # Wait for database
    if ! wait_for_database; then
        log_error "Cannot connect to database. Exiting..."
        exit 1
    fi
    
    # Check for existing failed migrations and resolve them
    log_info "Checking for existing failed migrations..."
    STATUS=$(npx prisma migrate status 2>&1 || echo "")
    
    if echo "$STATUS" | grep -qi "failed"; then
        log_warning "Found failed migrations, resolving them..."
        FAILED_LIST=$(echo "$STATUS" | grep -iE "failed" | grep -oE "[0-9]{14}_[a-z_]+" | sort -u || echo "")
        
        for migration in $FAILED_LIST; do
            if [ -n "$migration" ]; then
                resolve_failed_migration "$migration"
            fi
        done
    fi
    
    # Apply migrations
    apply_migrations
    
    # Verify tables
    verify_tables || true
    
    log_success "Migration process completed"
}

# Run main function
main

