#!/bin/sh

# Create uploads directory if it doesn't exist
echo "Creating uploads directory..."
mkdir -p uploads
chmod 755 uploads

# Generate Prisma client
echo "Generating Prisma client..."
npm run prisma:generate

# Start the application
echo "Starting NestJS application..."
npm run start:dev