#!/bin/bash

# Test script for video upload functionality
echo "Testing video upload functionality..."

# First, let's get a JWT token by logging in as admin
echo "Getting JWT token..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@haghighi.com", "password": "admin123"}')

echo "Login response: $TOKEN_RESPONSE"

# Extract token from response
TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get JWT token. Please check if admin user exists."
  echo "You can create an admin user by running: npm run seed"
  exit 1
fi

echo "Got token: ${TOKEN:0:20}..."

# Test video upload with a small test file
echo "Testing video upload..."
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3000/uploads/video \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/Users/arash/Desktop/new-haghighi/frontend/public/assets/celebrities-videos/farkhonde-farmanizade.mp4")

echo "Upload response: $UPLOAD_RESPONSE"

# Check if upload was successful
if echo "$UPLOAD_RESPONSE" | grep -q "filename"; then
  echo "✅ Video upload test PASSED!"
else
  echo "❌ Video upload test FAILED!"
  echo "Response: $UPLOAD_RESPONSE"
fi

# Test invalid file type
echo "Testing invalid file type rejection..."
INVALID_RESPONSE=$(curl -s -X POST http://localhost:3000/uploads/video \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/Users/arash/Desktop/new-haghighi/README.md")

echo "Invalid file response: $INVALID_RESPONSE"

if echo "$INVALID_RESPONSE" | grep -q "Only video files are allowed"; then
  echo "✅ File type validation test PASSED!"
else
  echo "❌ File type validation test FAILED!"
fi

echo "Test completed!"
