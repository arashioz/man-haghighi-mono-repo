#!/bin/bash

# Script to check current environment configuration

echo "🔍 Checking current environment configuration..."
echo ""

if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "💡 Run: ./switch-env.sh dev   (for development)"
    echo "   Or:  ./switch-env.sh prod  (for production)"
    exit 1
fi

echo "📄 Current .env file source:"
if diff -q .env local.env > /dev/null 2>&1; then
    echo "   ✅ Development (local.env)"
    ENV_TYPE="development"
elif diff -q .env server.env > /dev/null 2>&1; then
    echo "   ✅ Production (server.env)"
    ENV_TYPE="production"
else
    echo "   ⚠️  Custom/Modified .env (not matching local.env or server.env)"
    ENV_TYPE="custom"
fi

echo ""
echo "📋 Key Environment Variables:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

NODE_ENV=$(grep "^NODE_ENV=" .env | cut -d '=' -f2 || echo "not set")
echo "   NODE_ENV:        $NODE_ENV"

SERVER_IP=$(grep "^SERVER_IP=" .env | cut -d '=' -f2 || echo "not set")
echo "   SERVER_IP:       $SERVER_IP"

EXTERNAL_PORT=$(grep "^EXTERNAL_PORT=" .env | cut -d '=' -f2 || echo "not set")
echo "   EXTERNAL_PORT:   $EXTERNAL_PORT"

API_BASE_URL=$(grep "^API_BASE_URL=" .env | cut -d '=' -f2 || echo "not set")
echo "   API_BASE_URL:    $API_BASE_URL"

REACT_APP_API_URL=$(grep "^REACT_APP_API_URL=" .env | cut -d '=' -f2 || echo "not set")
echo "   REACT_APP_API_URL: $REACT_APP_API_URL"

POSTGRES_USER=$(grep "^POSTGRES_USER=" .env | cut -d '=' -f2 || echo "not set")
echo "   POSTGRES_USER:   $POSTGRES_USER"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$NODE_ENV" == "production" ]; then
    echo "🔒 Production Mode Detected"
    echo "   ⚠️  Make sure CORS_ORIGINS is set correctly"
    CORS_ORIGINS=$(grep "^CORS_ORIGINS=" .env | cut -d '=' -f2 || echo "not set")
    if [ "$CORS_ORIGINS" == "not set" ] || [ -z "$CORS_ORIGINS" ]; then
        echo "   ❌ CORS_ORIGINS is required in production!"
    else
        echo "   ✅ CORS_ORIGINS: $CORS_ORIGINS"
    fi
else
    echo "🛠️  Development Mode"
fi

echo ""
echo "🐳 Docker Containers Status:"
docker-compose ps 2>/dev/null || echo "   Containers not running"

