#!/bin/bash

# Script to start the application using docker-compose-alt-ports.yml

set -e

echo "🚀 Starting application with alternate ports configuration..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "💡 Please create a .env file or run: ./switch-env.sh dev"
    exit 1
fi

# Check if docker-compose-alt-ports.yml exists
if [ ! -f docker-compose-alt-ports.yml ]; then
    echo "❌ docker-compose-alt-ports.yml file not found!"
    exit 1
fi

echo "📋 Using docker-compose-alt-ports.yml"
echo ""

# Start services in detached mode
echo "🐳 Starting Docker containers..."
docker-compose -f docker-compose-alt-ports.yml up -d

echo ""
echo "✅ Application started successfully!"
echo ""
echo "📊 Container status:"
docker-compose -f docker-compose-alt-ports.yml ps

echo ""
echo "🌐 Services available at:"
echo "   Backend:  http://localhost:8080"
echo "   Frontend: http://localhost:8081"
echo "   Admin:    http://localhost:8082"
echo "   Prisma Studio: http://localhost:5555"
echo ""
echo "💡 To view logs: docker-compose -f docker-compose-alt-ports.yml logs -f"
echo "💡 To stop:      docker-compose -f docker-compose-alt-ports.yml down"

