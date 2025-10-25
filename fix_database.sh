#!/bin/bash

# Complete Database Schema Fix Script
# This script ensures ALL required tables exist in the database

echo "🔧 Starting complete database schema fix..."

# Copy the SQL fix file to the container and execute it
docker cp /Users/arash/Desktop/new-haghighi/backend/fix_tables.sql haghighi_backend_prod:/tmp/fix_tables.sql

# Execute the SQL fix
docker exec haghighi_backend_prod bash -c "
echo '📋 Applying complete database schema fix...'
psql \$DATABASE_URL -f /tmp/fix_tables.sql
echo '✅ Complete database schema fix applied successfully!'
"

echo "🎉 Complete database fix completed!"
