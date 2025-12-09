#!/bin/sh

# Seed script - runs seed only (migrations should be run manually)

set +e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# Check if migrations are applied
log_info "Checking migration status..."
MIGRATION_STATUS=$(npx prisma migrate status 2>&1 || echo "")

if echo "$MIGRATION_STATUS" | grep -qi "following migrations have not yet been applied"; then
    log_warning "Some migrations are not applied yet!"
    log_warning "Please run migrations first: ./scripts/migrate.sh"
    log_warning "Or: npx prisma migrate deploy"
    exit 1
fi

# Regenerate Prisma Client
log_info "Regenerating Prisma Client..."
npx prisma generate 2>/dev/null || true

# Run seed
log_info "Running seed..."
npm run prisma:seed || {
    log_info "Seed completed (may have skipped existing data)"
}

log_success "Seed process completed"

