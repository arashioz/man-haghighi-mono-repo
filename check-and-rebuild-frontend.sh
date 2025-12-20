#!/bin/bash

# Script to check and rebuild frontend to fix HTTPS API URL issue

echo "🔍 Checking frontend configuration..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "💡 Copying server.env to .env..."
    cp server.env .env
fi

# Check REACT_APP_API_URL in .env
REACT_APP_API_URL=$(grep "^REACT_APP_API_URL=" .env | cut -d '=' -f2)
echo "📋 Current REACT_APP_API_URL in .env: $REACT_APP_API_URL"

if [[ -z "$REACT_APP_API_URL" ]]; then
    echo "❌ REACT_APP_API_URL is not set in .env!"
    echo "💡 Adding REACT_APP_API_URL=https://api.manehaghighi.com/api to .env"
    echo "REACT_APP_API_URL=https://api.manehaghighi.com/api" >> .env
elif [[ ! "$REACT_APP_API_URL" == *"https://"* ]]; then
    echo "⚠️  REACT_APP_API_URL does not use HTTPS!"
    echo "💡 Updating to HTTPS..."
    sed -i.bak "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=https://api.manehaghighi.com/api|" .env
    echo "✅ Updated REACT_APP_API_URL to: https://api.manehaghighi.com/api"
else
    echo "✅ REACT_APP_API_URL is correctly set to HTTPS"
fi

# Check if frontend container is running
if docker ps | grep -q haghighi_frontend; then
    echo ""
    echo "🛑 Stopping frontend container..."
    docker-compose stop frontend
fi

# Rebuild frontend container
echo ""
echo "🔨 Rebuilding frontend container (this may take a few minutes)..."
docker-compose build --no-cache frontend

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Frontend rebuild complete!"
    echo "🚀 Starting frontend container..."
    docker-compose up -d frontend
    
    echo ""
    echo "⏳ Waiting for frontend to start..."
    sleep 5
    
    echo ""
    echo "✅ Done! Frontend container is running."
    echo ""
    echo "📝 Next steps:"
    echo "   1. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
    echo "   2. Or open in incognito/private mode"
    echo "   3. Check Network tab - requests should go to:"
    echo "      https://api.manehaghighi.com/api/..."
    echo ""
    echo "📋 Check logs with:"
    echo "   docker-compose logs -f frontend"
else
    echo ""
    echo "❌ Build failed! Check the errors above."
    exit 1
fi

