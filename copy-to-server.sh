#!/bin/bash

# Script to copy project files to server
# Usage: ./copy-to-server.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVER_IP="185.231.112.84"
SERVER_USER="root"
SERVER_PATH="/opt/haghighi"

echo -e "${GREEN}🚀 Copying project files to server: $SERVER_IP${NC}"

# Create project directory on server
echo -e "${YELLOW}📁 Creating project directory on server...${NC}"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_PATH"

# Copy project files (excluding node_modules and other unnecessary files)
echo -e "${YELLOW}📦 Copying project files...${NC}"
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'build' \
  --exclude '.env' \
  --exclude 'local.env' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  --exclude 'Thumbs.db' \
  ./ $SERVER_USER@$SERVER_IP:$SERVER_PATH/

# Copy uploads directory if it exists
if [ -d "uploads" ]; then
    echo -e "${YELLOW}📁 Copying uploads directory...${NC}"
    rsync -avz --progress uploads/ $SERVER_USER@$SERVER_IP:$SERVER_PATH/uploads/
fi

# Make deploy script executable
echo -e "${YELLOW}🔧 Making deploy script executable...${NC}"
ssh $SERVER_USER@$SERVER_IP "chmod +x $SERVER_PATH/deploy-prod.sh"

echo -e "${GREEN}✅ Project files copied successfully!${NC}"
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "${YELLOW}1. SSH to server: ssh $SERVER_USER@$SERVER_IP${NC}"
echo -e "${YELLOW}2. Navigate to project: cd $SERVER_PATH${NC}"
echo -e "${YELLOW}3. Run deployment: ./deploy-prod.sh $SERVER_IP${NC}"
