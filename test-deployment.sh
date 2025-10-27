#!/bin/bash

# Script to test deployment health

SERVER_IP="185.231.112.84"

echo "🧪 Testing Haghighi Platform Deployment"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_passed=0
test_failed=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
    
    if [ "$response" -eq "$expected_code" ]; then
        echo -e "${GREEN}✅ PASSED${NC} (HTTP $response)"
        ((test_passed++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC} (HTTP $response, expected $expected_code)"
        ((test_failed++))
        return 1
    fi
}

# Test Docker containers
echo "📦 Docker Containers Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""

# Test backend health
echo "🔍 Testing Endpoints:"
echo ""

test_endpoint "Backend Health" "http://localhost:3000/api/health" 200
test_endpoint "Backend API Docs" "http://localhost:3000/api/docs" 301
test_endpoint "Frontend" "http://localhost:3002/" 200
test_endpoint "Admin Panel" "http://localhost:3001/" 200

echo ""
test_endpoint "Public Backend Health" "http://${SERVER_IP}/api/health" 200
test_endpoint "Public Frontend" "http://${SERVER_IP}/" 200
test_endpoint "Public Admin Panel" "http://${SERVER_IP}/admin/" 200

# Test database connection
echo ""
echo "💾 Testing Database Connection:"
if docker exec haghighi_backend_prod npx prisma db push 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection working${NC}"
    ((test_passed++))
else
    echo -e "${RED}❌ Database connection failed${NC}"
    ((test_failed++))
fi

# Test uploads directory
echo ""
echo "📁 Testing Uploads Directory:"
if [ -d "uploads" ] && [ -w "uploads" ]; then
    echo -e "${GREEN}✅ Uploads directory exists and is writable${NC}"
    ((test_passed++))
else
    echo -e "${RED}❌ Uploads directory issue${NC}"
    ((test_failed++))
fi

# Test nginx config
echo ""
echo "🌐 Testing Nginx Configuration:"
if docker exec haghighi_nginx_prod nginx -t 2>/dev/null; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    ((test_passed++))
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    ((test_failed++))
fi

# Summary
echo ""
echo "========================================"
echo "📊 Test Summary:"
echo "   Passed: ${GREEN}${test_passed}${NC}"
echo "   Failed: ${RED}${test_failed}${NC}"
echo "========================================"

if [ $test_failed -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Deployment is healthy.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the logs.${NC}"
    exit 1
fi

