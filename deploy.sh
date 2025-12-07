#!/bin/bash

# Deployment Script for Haghighi Platform
# This script:
# 1. Takes a backup of the database
# 2. Backs up uploaded files
# 3. Cleans the project
# 4. Clones from Git
# 5. Restores uploaded files
# 6. Starts the application with docker-compose-alt-ports.yml

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/arashioz/man-haghighi-mono-repo.git"
CURRENT_DIR=$(pwd)
PROJECT_NAME=$(basename "$CURRENT_DIR")
PARENT_DIR=$(dirname "$CURRENT_DIR")
BACKUP_DIR="$CURRENT_DIR/backup_$(date +%Y%m%d_%H%M%S)"
NEW_PROJECT_DIR="$PARENT_DIR/${PROJECT_NAME}_new"

# Functions
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

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_warning "Running as root. This is not recommended."
fi

# Check prerequisites
print_step "Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running. Please start Docker first."
    exit 1
fi

print_success "All prerequisites are met"

print_step "Starting deployment process..."

# Step 1: Create backup directory
print_step "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
print_success "Backup directory created"

# Step 2: Backup database
print_step "Backing up database..."
if docker ps | grep -q haghighi_postgres; then
    # Get database credentials from .env if exists
    if [ -f .env ]; then
        source .env
        DB_NAME="${POSTGRES_DB:-haghighi_db}"
        DB_USER="${POSTGRES_USER:-haghighi_user}"
    else
        DB_NAME="haghighi_db"
        DB_USER="haghighi_user"
        print_warning ".env file not found, using default database credentials"
    fi
    
    BACKUP_FILE="$BACKUP_DIR/database_backup_$(date +%Y%m%d_%H%M%S).sql"
    docker exec haghighi_postgres pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null || {
        print_error "Failed to backup database. Container might not be running."
        print_warning "Continuing without database backup..."
    }
    
    if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        print_success "Database backed up to: $BACKUP_FILE"
    else
        print_warning "Database backup file is empty or missing"
    fi
else
    print_warning "PostgreSQL container is not running. Skipping database backup."
fi

# Step 3: Backup uploaded files
print_step "Backing up uploaded files..."
if [ -d "uploads" ] && [ "$(ls -A uploads 2>/dev/null)" ]; then
    cp -r uploads "$BACKUP_DIR/uploads_backup"
    print_success "Uploaded files backed up to: $BACKUP_DIR/uploads_backup"
else
    print_warning "No uploads directory found or it's empty"
fi

# Step 4: Backup .env file if exists
if [ -f .env ]; then
    cp .env "$BACKUP_DIR/.env.backup"
    print_success ".env file backed up"
fi

# Step 5: Stop and remove containers
print_step "Stopping Docker containers..."
if [ -f docker-compose.yml ]; then
    docker-compose -f docker-compose.yml down 2>/dev/null || true
fi
if [ -f docker-compose-alt-ports.yml ]; then
    docker-compose -f docker-compose-alt-ports.yml down 2>/dev/null || true
fi
if [ -f docker-compose.yml ] || [ -f docker-compose-alt-ports.yml ]; then
    print_success "Docker containers stopped"
else
    print_warning "docker-compose.yml not found, skipping container stop"
fi

# Step 6: Clone repository to temporary directory
print_step "Cloning repository..."
cd "$PARENT_DIR"
if [ -d "$NEW_PROJECT_DIR" ]; then
    print_warning "Temporary directory exists, removing it..."
    rm -rf "$NEW_PROJECT_DIR"
fi

git clone "$REPO_URL" "$NEW_PROJECT_DIR" || {
    print_error "Failed to clone repository"
    exit 1
}
print_success "Repository cloned to: $NEW_PROJECT_DIR"

# Step 7: Restore uploaded files
print_step "Restoring uploaded files..."
if [ -d "$BACKUP_DIR/uploads_backup" ]; then
    mkdir -p "$NEW_PROJECT_DIR/uploads"
    cp -r "$BACKUP_DIR/uploads_backup"/* "$NEW_PROJECT_DIR/uploads/" 2>/dev/null || true
    chmod -R 777 "$NEW_PROJECT_DIR/uploads" 2>/dev/null || true
    print_success "Uploaded files restored"
else
    print_warning "No uploads backup found, creating empty uploads directory"
    mkdir -p "$NEW_PROJECT_DIR/uploads"
    chmod 777 "$NEW_PROJECT_DIR/uploads"
fi

# Step 8: Setup .env file
print_step "Setting up .env file..."
cd "$NEW_PROJECT_DIR"
if [ -f server.env ]; then
    cp server.env .env
    print_success ".env file created from server.env"
elif [ -f local.env ]; then
    cp local.env .env
    print_warning ".env file created from local.env (consider using server.env for production)"
else
    print_error "No environment file found (server.env or local.env)"
    print_warning "You need to create .env file manually"
fi

# Step 9: Replace old project with new one
print_step "Replacing old project with new one..."
cd "$PARENT_DIR"
if [ -d "$PROJECT_NAME" ]; then
    # Move old project to backup
    mv "$PROJECT_NAME" "${PROJECT_NAME}_old_$(date +%Y%m%d_%H%M%S)"
    print_success "Old project moved to backup"
fi

# Move new project to main location
mv "$NEW_PROJECT_DIR" "$PROJECT_NAME"
cd "$PROJECT_NAME"
print_success "New project is now in place"

# Step 10: Restore database backup
print_step "Starting Docker containers with alt-ports configuration..."
docker-compose -f docker-compose-alt-ports.yml up -d --build

# Wait for database to be ready
print_step "Waiting for database to be ready..."
sleep 10

# Load environment variables for database credentials
if [ -f .env ]; then
    source .env
fi
DB_NAME="${POSTGRES_DB:-haghighi_db}"
DB_USER="${POSTGRES_USER:-haghighi_user}"

MAX_WAIT=60
WAIT_COUNT=0
while ! docker exec haghighi_postgres pg_isready -U "$DB_USER" > /dev/null 2>&1; do
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        print_error "Database did not become ready in time"
        break
    fi
    sleep 2
    WAIT_COUNT=$((WAIT_COUNT + 2))
done

if [ $WAIT_COUNT -lt $MAX_WAIT ]; then
    print_success "Database is ready"
    
    # Restore database backup
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.sql 2>/dev/null | head -1)
    if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
        print_step "Restoring database from backup..."
        
        # Wait a bit more for database to be fully ready
        sleep 5
        
        cat "$BACKUP_FILE" | docker exec -i haghighi_postgres psql -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1 && {
            print_success "Database restored from backup"
        } || {
            print_warning "Failed to restore database. You may need to restore manually."
            print_warning "Backup file location: $BACKUP_FILE"
        }
    else
        print_warning "No database backup found to restore"
        print_warning "Backup directory: $BACKUP_DIR"
    fi
fi

# Step 11: Run Prisma migrations
print_step "Running Prisma migrations..."
sleep 5
docker exec haghighi_backend npx prisma db push 2>/dev/null || {
    print_warning "Prisma db push failed, trying generate..."
    docker exec haghighi_backend npx prisma generate 2>/dev/null || true
}

# Step 12: Show status
print_step "Checking container status..."
docker-compose -f docker-compose-alt-ports.yml ps

echo ""
print_success "Deployment completed!"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo "  - Backup directory: $BACKUP_DIR"
echo "  - Project location: $(pwd)"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Check container status: docker-compose -f docker-compose-alt-ports.yml ps"
echo "  2. View logs: docker-compose -f docker-compose-alt-ports.yml logs -f"
echo "  3. Verify services are running on ports 8080, 8081, 8082"
echo ""
echo -e "${YELLOW}Note:${NC} Old project backup and deployment backup are preserved"
echo ""

