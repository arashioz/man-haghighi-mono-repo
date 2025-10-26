#!/bin/bash

# Database Migration and Seeding Script for Haghighi Platform
# Usage: ./setup-database.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🌱 Starting database setup for Haghighi Platform${NC}"

# Check if docker-compose is running
if ! docker-compose ps | grep -q "haghighi_backend_prod"; then
    echo -e "${RED}❌ Backend container is not running. Please start the services first:${NC}"
    echo -e "${YELLOW}   docker-compose -f docker-compose.prod.yml up -d${NC}"
    exit 1
fi

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 10

# Run migrations
echo -e "${YELLOW}🔄 Running database migrations...${NC}"
docker-compose exec backend npx prisma migrate deploy

# Generate Prisma client
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
docker-compose exec backend npx prisma generate

# Run seed (main data)
echo -e "${YELLOW}🌱 Seeding main data (users, courses, sliders)...${NC}"
docker-compose exec backend node prisma/seed.js

# Ask if user wants to seed old data
echo -e "${YELLOW}❓ Do you want to import old data from previous system? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${YELLOW}🌱 Seeding old data...${NC}"
        docker-compose exec backend node prisma/seed-old-data.js
else
    echo -e "${YELLOW}⏭️ Skipping old data import${NC}"
fi

# Show created users
echo -e "${GREEN}✅ Database setup completed!${NC}"
echo -e "${GREEN}📋 Created users:${NC}"
echo -e "${GREEN}   👤 Admin: admin@haghighi.com / admin123${NC}"
echo -e "${GREEN}   👤 Sales Manager: sales_manager@haghighi.com / sales123${NC}"
echo -e "${GREEN}   👤 Sales Person: sales_person@haghighi.com / sales123${NC}"
echo -e "${GREEN}   👤 Regular User: regular_user / user123${NC}"

echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "${YELLOW}1. Test API: curl -k https://185.231.112.84/api/health${NC}"
echo -e "${YELLOW}2. Login to admin panel: https://185.231.112.84/admin${NC}"
echo -e "${YELLOW}3. Check Swagger docs: https://185.231.112.84/api/docs${NC}"
