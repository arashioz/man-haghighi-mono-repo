#!/bin/bash

# Script to remove all sales teams from all users
# This script deactivates all sales team memberships

set -e

echo "🧹 Remove All Sales Teams"
echo "========================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔄 Running remove-all-sales-teams.ts..."
echo ""

# Run the TypeScript script
npx ts-node scripts/remove-all-sales-teams.ts

echo ""
echo "✅ Script completed successfully!"
