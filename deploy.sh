#!/bin/bash

# Deployment Script for Haghighi Platform (Server Edition)
# This script:
# 1. Takes a backup of the database
# 2. Backs up uploaded files
# 3. Cleans the project
# 4. Clones from Git
# 5. Restores uploaded files
# 6. Starts the application with docker-compose-alt-ports.yml

# Don't exit on error - we'll handle errors manually
set +e

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
# Backup directory outside project to avoid conflicts
BACKUP_DIR="$PARENT_DIR/backup_${PROJECT_NAME}_$(date +%Y%m%d_%H%M%S)"
NEW_PROJECT_DIR="$PARENT_DIR/${PROJECT_NAME}_new"

# Detect docker-compose command (V1 or V2)
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

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
    $DOCKER_COMPOSE -f docker-compose.yml down 2>/dev/null || true
fi
if [ -f docker-compose-alt-ports.yml ]; then
    $DOCKER_COMPOSE -f docker-compose-alt-ports.yml down 2>/dev/null || true
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
    print_error "Please check your internet connection and Git access"
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

# Step 8: Setup .env file (PRIORITY: server.env for production)
print_step "Setting up .env file..."
cd "$NEW_PROJECT_DIR"
if [ -f server.env ]; then
    cp server.env .env
    print_success ".env file created from server.env (production)"
elif [ -f "$BACKUP_DIR/.env.backup" ]; then
    cp "$BACKUP_DIR/.env.backup" .env
    print_success ".env file restored from backup"
elif [ -f local.env ]; then
    cp local.env .env
    print_warning ".env file created from local.env (NOT RECOMMENDED for production)"
    print_warning "Please update .env with production values, especially:"
    print_warning "  - SERVER_IP, API_BASE_URL, REACT_APP_API_URL"
    print_warning "  - POSTGRES_PASSWORD, JWT_SECRET"
else
    print_error "No environment file found (server.env or local.env)"
    print_error "You need to create .env file manually before continuing"
    exit 1
fi

# Step 9: Replace old project with new one
print_step "Replacing old project with new one..."
cd "$PARENT_DIR"

# Check if old project exists and is different from new one
if [ -d "$PROJECT_NAME" ] && [ "$PROJECT_NAME" != "$(basename "$NEW_PROJECT_DIR")" ]; then
    # Move old project to backup
    OLD_BACKUP="${PROJECT_NAME}_old_$(date +%Y%m%d_%H%M%S)"
    mv "$PROJECT_NAME" "$OLD_BACKUP"
    print_success "Old project moved to backup: $OLD_BACKUP"
fi

# Move new project to main location
mv "$NEW_PROJECT_DIR" "$PROJECT_NAME"
cd "$PROJECT_NAME"
print_success "New project is now in place"

# Step 10: Start Docker containers
print_step "Starting Docker containers with alt-ports configuration..."
$DOCKER_COMPOSE -f docker-compose-alt-ports.yml up -d --build || {
    print_error "Failed to start Docker containers"
    print_error "Please check docker-compose-alt-ports.yml and .env file"
    exit 1
}

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
        
        # Drop existing database and recreate (for clean restore)
        print_step "Preparing database for restore..."
        docker exec haghighi_postgres psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
        docker exec haghighi_postgres psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || true
        sleep 2
        
        # Restore backup
        cat "$BACKUP_FILE" | docker exec -i haghighi_postgres psql -U "$DB_USER" -d "$DB_NAME" 2>&1 | grep -v "ERROR" > /dev/null && {
            print_success "Database restored from backup"
        } || {
            print_warning "Database restore completed with warnings"
            print_warning "Backup file location: $BACKUP_FILE"
            print_warning "Please verify database manually if needed"
        }
    else
        print_warning "No database backup found to restore"
        print_warning "Backup directory: $BACKUP_DIR"
        print_warning "Database will be empty - you may need to run migrations or seed data"
    fi
else
    print_error "Database did not become ready in time"
    print_warning "Continuing without database restore..."
fi

# Step 11: Run Prisma migrations
print_step "Running Prisma migrations..."
sleep 5

# Wait for backend container to be ready
MAX_BACKEND_WAIT=60
BACKEND_WAIT_COUNT=0
while ! docker ps | grep -q haghighi_backend; do
    if [ $BACKEND_WAIT_COUNT -ge $MAX_BACKEND_WAIT ]; then
        print_error "Backend container did not start in time"
        break
    fi
    sleep 2
    BACKEND_WAIT_COUNT=$((BACKEND_WAIT_COUNT + 2))
done

if [ $BACKEND_WAIT_COUNT -lt $MAX_BACKEND_WAIT ]; then
    sleep 10  # Wait for backend to fully initialize
    
    print_step "Generating Prisma Client..."
    docker exec haghighi_backend npx prisma generate 2>/dev/null || {
        print_warning "Prisma generate failed, but continuing..."
    }
    
    print_step "Running Prisma migrations (deploy mode)..."
    print_warning "This will apply all pending migrations in order"
    docker exec haghighi_backend npx prisma migrate deploy 2>&1 | while IFS= read -r line; do
        echo "  $line"
    done
    
    MIGRATE_EXIT_CODE=${PIPESTATUS[0]}
    if [ $MIGRATE_EXIT_CODE -eq 0 ]; then
        print_success "All migrations applied successfully"
    else
        print_error "Migration failed with exit code: $MIGRATE_EXIT_CODE"
        print_warning "You may need to manually fix the database schema"
        print_warning "Try running: docker exec haghighi_backend npx prisma migrate deploy"
    fi
else
    print_warning "Skipping Prisma migrations - backend container not ready"
fi

# Step 12: Show status
print_step "Checking container status..."
$DOCKER_COMPOSE -f docker-compose-alt-ports.yml ps

echo ""
print_success "Deployment completed!"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo "  - Backup directory: $BACKUP_DIR"
echo "  - Project location: $(pwd)"
echo "  - Docker Compose: $DOCKER_COMPOSE"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Check container status: $DOCKER_COMPOSE -f docker-compose-alt-ports.yml ps"
echo "  2. View logs: $DOCKER_COMPOSE -f docker-compose-alt-ports.yml logs -f"
echo "  3. Verify services are running on ports 8080, 8081, 8082"
echo "  4. Check backend health: curl http://localhost:8080/api/health"
echo ""
echo -e "${BLUE}Service URLs (update IP in server.env):${NC}"
if [ -f .env ]; then
    source .env
    SERVER_IP="${SERVER_IP:-localhost}"
    echo "  - Backend API: http://${SERVER_IP}:8080/api"
    echo "  - Frontend: http://${SERVER_IP}:8081"
    echo "  - Admin Panel: http://${SERVER_IP}:8082"
else
    echo "  - Backend API: http://YOUR_SERVER_IP:8080/api"
    echo "  - Frontend: http://YOUR_SERVER_IP:8081"
    echo "  - Admin Panel: http://YOUR_SERVER_IP:8082"
fi
echo ""
echo -e "${YELLOW}Important Notes:${NC}"
echo "  - Old project backup and deployment backup are preserved"
echo "  - Backup location: $BACKUP_DIR"
echo "  - Make sure firewall allows ports 8080, 8081, 8082"
echo "  - Update SERVER_IP in .env if needed"
echo ""

