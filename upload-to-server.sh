#!/bin/bash

# Script to upload project to server

SERVER_IP="185.231.112.84"
SERVER_USER="root"
SERVER_PATH="/root/new-haghighi"
LOCAL_PATH="/Users/arash/Desktop/new-haghighi"

echo "📤 Uploading project to server..."
echo "=================================="
echo "Server: ${SERVER_USER}@${SERVER_IP}"
echo "Path: ${SERVER_PATH}"
echo ""

# Upload files
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'backend/dist' \
  --exclude 'backend/node_modules' \
  --exclude 'frontend/node_modules' \
  --exclude 'admin-panel/node_modules' \
  --exclude 'frontend/build' \
  --exclude 'admin-panel/build' \
  --exclude '.env' \
  --exclude 'local.env' \
  "${LOCAL_PATH}/" "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/"

echo ""
echo "✅ Upload completed!"
echo ""
echo "Next steps:"
echo "1. ssh ${SERVER_USER}@${SERVER_IP}"
echo "2. cd ${SERVER_PATH}"
echo "3. ./cleanup-docker.sh"
echo "4. ./deploy-from-scratch.sh"

