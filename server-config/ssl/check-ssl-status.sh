#!/bin/bash

# SSL Certificate Diagnostic Script
# Run this on your server to diagnose SSL certificate issues

set -e

echo "🔍 SSL Certificate Diagnostic Tool"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Domains to check
DOMAINS=("manehaghighi.com" "www.manehaghighi.com" "api.manehaghighi.com" "admin.manehaghighi.com")

echo "📋 Checking SSL certificates for domains..."
echo ""

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}❌ Nginx is not installed${NC}"
    exit 1
fi

# Check if nginx is running
if ! systemctl is-active --quiet nginx; then
    echo -e "${YELLOW}⚠️  Nginx is not running${NC}"
    echo "   Start it with: sudo systemctl start nginx"
    echo ""
else
    echo -e "${GREEN}✅ Nginx is running${NC}"
    echo ""
fi

# Check nginx configuration
echo "🔧 Testing Nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    echo "   Run: sudo nginx -t"
    echo ""
fi
echo ""

# Check Let's Encrypt certificates
echo "📜 Checking Let's Encrypt certificates..."
echo ""

if command -v certbot &> /dev/null; then
    CERTBOT_CERTS=$(sudo certbot certificates 2>/dev/null || echo "")
    
    if [ -z "$CERTBOT_CERTS" ] || echo "$CERTBOT_CERTS" | grep -q "No certificates found"; then
        echo -e "${YELLOW}⚠️  No Let's Encrypt certificates found${NC}"
        echo "   You may need to install certificates with:"
        echo "   sudo certbot --nginx -d manehaghighi.com -d www.manehaghighi.com"
    else
        echo -e "${GREEN}✅ Let's Encrypt certificates found:${NC}"
        echo "$CERTBOT_CERTS" | grep -E "Certificate Name|Domains|Expiry Date" || true
    fi
else
    echo -e "${YELLOW}⚠️  Certbot is not installed${NC}"
    echo "   Install with: sudo apt install certbot python3-certbot-nginx"
fi
echo ""

# Check certificate files
echo "📁 Checking certificate files on disk..."
echo ""

for domain in "${DOMAINS[@]}"; do
    # Extract base domain (remove www.)
    base_domain=$(echo "$domain" | sed 's/^www\.//')
    
    CERT_DIR="/etc/letsencrypt/live/$base_domain"
    FULLCHAIN="$CERT_DIR/fullchain.pem"
    PRIVKEY="$CERT_DIR/privkey.pem"
    
    if [ -f "$FULLCHAIN" ] && [ -f "$PRIVKEY" ]; then
        # Check if certificate is valid (not expired)
        EXPIRY=$(sudo openssl x509 -enddate -noout -in "$FULLCHAIN" 2>/dev/null | cut -d= -f2)
        EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY" +%s 2>/dev/null || echo "0")
        NOW_EPOCH=$(date +%s)
        
        if [ "$EXPIRY_EPOCH" -gt "$NOW_EPOCH" ]; then
            DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
            echo -e "${GREEN}✅ $domain: Certificate exists and is valid (expires in $DAYS_LEFT days)${NC}"
        else
            echo -e "${RED}❌ $domain: Certificate is EXPIRED${NC}"
            echo "   Expired on: $EXPIRY"
            echo "   Renew with: sudo certbot renew"
        fi
        
        # Check if it's a self-signed certificate
        ISSUER=$(sudo openssl x509 -issuer -noout -in "$FULLCHAIN" 2>/dev/null | grep -o "CN=[^,]*" | cut -d= -f2)
        if echo "$ISSUER" | grep -qi "self\|localhost\|test"; then
            echo -e "${YELLOW}   ⚠️  Warning: This appears to be a self-signed certificate${NC}"
            echo "   You need to obtain a real certificate from Let's Encrypt"
        fi
    else
        echo -e "${RED}❌ $domain: Certificate files not found${NC}"
        echo "   Expected: $FULLCHAIN"
        echo "   Expected: $PRIVKEY"
    fi
done
echo ""

# Check DNS
echo "🌐 Checking DNS records..."
echo ""

for domain in "${DOMAINS[@]}"; do
    base_domain=$(echo "$domain" | sed 's/^www\.//')
    DNS_IP=$(dig +short "$domain" | tail -n1)
    
    if [ -n "$DNS_IP" ]; then
        echo "   $domain → $DNS_IP"
        if [ "$DNS_IP" = "185.231.112.84" ]; then
            echo -e "   ${GREEN}✅ Points to correct server IP${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Points to different IP (expected: 185.231.112.84)${NC}"
        fi
    else
        echo -e "   ${RED}❌ $domain: No DNS record found${NC}"
    fi
done
echo ""

# Check if Cloudflare is being used
echo "☁️  Checking for Cloudflare..."
echo ""

for domain in "manehaghighi.com" "api.manehaghighi.com"; do
    CLOUDFLARE_CHECK=$(dig "$domain" | grep -i "cloudflare" || echo "")
    if [ -n "$CLOUDFLARE_CHECK" ]; then
        echo -e "${GREEN}✅ $domain appears to use Cloudflare${NC}"
        echo "   Make sure Cloudflare SSL mode is set to 'Full' or 'Full (strict)'"
    else
        echo "   $domain: Not using Cloudflare (or DNS not configured)"
    fi
done
echo ""

# Test HTTPS connectivity
echo "🔌 Testing HTTPS connectivity..."
echo ""

for domain in "manehaghighi.com" "api.manehaghighi.com" "admin.manehaghighi.com"; do
    echo "Testing $domain..."
    
    # Try to connect via HTTPS
    if timeout 5 openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        echo -e "   ${GREEN}✅ HTTPS connection successful${NC}"
    elif timeout 5 curl -I "https://$domain" 2>/dev/null | grep -q "HTTP"; then
        HTTP_CODE=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "https://$domain" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" != "000" ]; then
            echo -e "   ${GREEN}✅ HTTPS accessible (HTTP $HTTP_CODE)${NC}"
        else
            echo -e "   ${RED}❌ HTTPS connection failed${NC}"
        fi
    else
        echo -e "   ${RED}❌ HTTPS connection failed${NC}"
    fi
done
echo ""

# Summary and recommendations
echo "=================================="
echo "📊 Summary and Recommendations"
echo "=================================="
echo ""

# Check what needs to be done
NEEDS_CERT=false
NEEDS_RENEW=false
USING_CLOUDFLARE=false

if dig manehaghighi.com | grep -qi "cloudflare"; then
    USING_CLOUDFLARE=true
    echo -e "${YELLOW}💡 You appear to be using Cloudflare${NC}"
    echo "   → Check Cloudflare Dashboard → SSL/TLS → Mode should be 'Full' or 'Full (strict)'"
    echo "   → Make sure proxy is ON (🟠 orange cloud) for all DNS records"
    echo ""
fi

if ! command -v certbot &> /dev/null || [ -z "$(sudo certbot certificates 2>/dev/null)" ]; then
    NEEDS_CERT=true
    echo -e "${YELLOW}💡 You need to install SSL certificates${NC}"
    if [ "$USING_CLOUDFLARE" = true ]; then
        echo "   → Option 1: Use Cloudflare SSL (recommended)"
        echo "      Set Cloudflare SSL mode to 'Full (strict)'"
    else
        echo "   → Option 2: Install Let's Encrypt certificates"
        echo "      Run: sudo certbot --nginx -d manehaghighi.com -d www.manehaghighi.com"
    fi
    echo ""
fi

echo "📚 For detailed instructions, see:"
echo "   docs/FIX-SSL-CERTIFICATE-ERROR.md"
echo ""

