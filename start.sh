#!/bin/bash

echo "🚀 Starting Haghighi Platform..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from local.env (development)..."
    cp local.env .env
    echo "✅ .env created (development mode)"
    echo ""
    echo "💡 To switch to production: ./switch-env.sh prod"
    echo "💡 To check current env: ./check-env.sh"
    echo ""
fi

# Create uploads directory
if [ ! -d uploads ]; then
    echo "📁 Creating uploads directory..."
    mkdir -p uploads
    chmod 777 uploads
    echo "✅ uploads directory created"
    echo ""
fi

# Start docker compose
echo "🐳 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

echo ""
echo "📊 Container status:"
docker-compose ps

echo ""
echo "✅ Done!"
echo ""
echo "🌐 Access your services:"
echo "   Frontend:    http://localhost:3002"
echo "   Admin Panel: http://localhost:3001"
echo "   Backend API: http://localhost:3000/api"
echo "   API Docs:    http://localhost:3000/api/docs"
echo ""
echo "📝 View logs:"
echo "   docker-compose logs -f"
echo ""

