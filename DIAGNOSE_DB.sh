#!/bin/bash

# Script to diagnose database connection issues

echo "🔍 Diagnosing database connection issues..."
echo ""

# Check containers
echo "=== 1. Container Status ==="
docker ps -a | grep -E "haghighi|CONTAINER" || echo "No haghighi containers found"
echo ""

# Check postgres
echo "=== 2. Postgres Container ==="
if docker ps | grep -q haghighi_postgres; then
    echo "✅ Postgres container is running"
    echo ""
    echo "Postgres logs (last 10 lines):"
    docker logs haghighi_postgres --tail 10
    echo ""
    echo "Testing postgres readiness:"
    docker exec haghighi_postgres pg_isready -U haghighi_user -d haghighi_db 2>&1 || echo "❌ Postgres not ready"
else
    echo "❌ Postgres container is NOT running"
    echo "   Start it with: docker-compose -f docker-compose-alt-ports.yml up -d postgres"
fi
echo ""

# Check backend
echo "=== 3. Backend Container ==="
if docker ps | grep -q haghighi_backend; then
    echo "✅ Backend container is running"
else
    echo "❌ Backend container is NOT running"
fi
echo ""

# Check network
echo "=== 4. Network Connectivity ==="
if docker ps | grep -q haghighi_backend; then
    echo "Testing ping from backend to postgres:"
    docker exec haghighi_backend ping -c 2 postgres 2>&1 | head -5 || echo "❌ Cannot ping postgres"
    echo ""
    echo "Testing DNS resolution:"
    docker exec haghighi_backend nslookup postgres 2>&1 | head -5 || echo "❌ DNS resolution failed"
else
    echo "⚠️  Backend not running, skipping network tests"
fi
echo ""

# Check DATABASE_URL
echo "=== 5. DATABASE_URL Configuration ==="
if docker ps | grep -q haghighi_backend; then
    DB_URL=$(docker exec haghighi_backend env | grep DATABASE_URL || echo "NOT SET")
    if [ "$DB_URL" != "NOT SET" ]; then
        echo "✅ DATABASE_URL is set"
        # Show first 60 chars only (hide password)
        echo "$DB_URL" | sed 's/:[^@]*@/:****@/'
    else
        echo "❌ DATABASE_URL is NOT set in backend container"
    fi
else
    echo "⚠️  Backend not running, checking .env file:"
    if [ -f .env ]; then
        grep DATABASE_URL .env | sed 's/:[^@]*@/:****@/' || echo "❌ DATABASE_URL not found in .env"
    else
        echo "❌ .env file not found"
    fi
fi
echo ""

# Check postgres env vars
echo "=== 6. Postgres Environment Variables ==="
if docker ps | grep -q haghighi_postgres; then
    docker exec haghighi_postgres env | grep POSTGRES | sed 's/=.*/=****/'
else
    echo "⚠️  Postgres not running"
fi
echo ""

# Test connection
echo "=== 7. Connection Test ==="
if docker ps | grep -q haghighi_backend && docker ps | grep -q haghighi_postgres; then
    echo "Testing database connection..."
    docker exec haghighi_backend ./scripts/check-db.sh 2>&1 || echo "❌ Connection test failed"
else
    echo "⚠️  Cannot test - containers not running"
fi
echo ""

echo "=== Diagnosis Complete ==="
echo ""
echo "💡 Next steps:"
echo "   1. If postgres is not running: docker-compose -f docker-compose-alt-ports.yml up -d postgres"
echo "   2. Wait 10-15 seconds for postgres to be ready"
echo "   3. Check logs: docker logs haghighi_postgres"
echo "   4. Test connection: docker exec haghighi_backend ./scripts/check-db.sh"

