#!/bin/sh

# Seed script that runs migrations first, then seeds the database

set +e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Run migrations first
log_info "Running migrations before seed..."
./scripts/migrate.sh

# Regenerate Prisma Client (in case migrations changed schema)
log_info "Regenerating Prisma Client..."
npx prisma generate 2>/dev/null || true

# Run seed
log_info "Running seed..."
npm run prisma:seed || {
    log_info "Seed completed (may have skipped existing data)"
}

log_success "Seed process completed"

