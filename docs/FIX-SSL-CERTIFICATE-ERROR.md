# 🔐 Fix SSL Certificate Error (ERR_CERT_AUTHORITY_INVALID)

## 🔴 Problem

You're seeing this error in your browser:
```
Attackers might be trying to steal your information from manehaghighi.com
net::ERR_CERT_AUTHORITY_INVALID
```

This means the SSL certificate is either:
- ❌ Missing
- ❌ Self-signed (not trusted by browsers)
- ❌ Expired
- ❌ Incomplete certificate chain
- ❌ Mismatch between Cloudflare SSL and server SSL

---

## ✅ Solution Options

### Option 1: Use Cloudflare SSL (Recommended - Easiest)

If you're using Cloudflare, you should use **Cloudflare's SSL** instead of Let's Encrypt on the server.

#### Steps:

1. **Configure Cloudflare SSL Mode:**
   - Go to Cloudflare Dashboard → SSL/TLS
   - Set SSL/TLS encryption mode to: **Full (strict)**
   - This allows Cloudflare to handle SSL termination

2. **Update Nginx to Accept HTTP from Cloudflare:**
   
   The nginx configs should listen on port 80 (HTTP) only, and Cloudflare will handle HTTPS.

   **On your server, run:**
   ```bash
   # SSH to server
   ssh root@185.231.112.84
   
   # Edit nginx configs to remove SSL (since Cloudflare handles it)
   # Or keep SSL but make sure Cloudflare mode is "Full (strict)"
   ```

3. **Verify Cloudflare SSL:**
   - In Cloudflare Dashboard → SSL/TLS → Overview
   - Check that certificates are active
   - Mode should be "Full" or "Full (strict)"

---

### Option 2: Install Let's Encrypt Certificates (Direct SSL)

If you want SSL directly on the server (not through Cloudflare):

#### Prerequisites:
- ✅ DNS records point to your server IP (185.231.112.84)
- ✅ Ports 80 and 443 are open
- ✅ Nginx is installed and running
- ✅ Domains are accessible via HTTP

#### Steps:

1. **SSH to your server:**
   ```bash
   ssh root@185.231.112.84
   ```

2. **Install Certbot:**
   ```bash
   cd /root/new-haghighi/server-config/ssl
   sudo bash install-certbot.sh
   ```
   
   Or manually:
   ```bash
   sudo apt update
   sudo apt install -y certbot python3-certbot-nginx
   ```

3. **Create SSL configuration files:**
   ```bash
   cd /root/new-haghighi/server-config/nginx
   sudo bash fix-ssl-config.sh
   ```
   
   This creates placeholder certificates so nginx can start.

4. **Obtain real Let's Encrypt certificates:**
   ```bash
   # Replace YOUR_EMAIL with your actual email
   EMAIL="your-email@example.com"
   
   # Frontend (main domain + www)
   sudo certbot --nginx -d manehaghighi.com -d www.manehaghighi.com \
     --non-interactive --agree-tos --email "$EMAIL" --redirect
   
   # Admin panel
   sudo certbot --nginx -d admin.manehaghighi.com \
     --non-interactive --agree-tos --email "$EMAIL" --redirect
   
   # API
   sudo certbot --nginx -d api.manehaghighi.com \
     --non-interactive --agree-tos --email "$EMAIL" --redirect
   ```

5. **Test nginx configuration:**
   ```bash
   sudo nginx -t
   ```

6. **Reload nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

7. **Verify certificates:**
   ```bash
   # Check certificate expiration
   sudo certbot certificates
   
   # Test renewal
   sudo certbot renew --dry-run
   ```

---

### Option 3: Fix Existing Certificates

If certificates exist but are invalid:

1. **Check certificate status:**
   ```bash
   sudo certbot certificates
   ```

2. **Renew expired certificates:**
   ```bash
   sudo certbot renew
   sudo systemctl reload nginx
   ```

3. **If renewal fails, delete and re-obtain:**
   ```bash
   # Delete certificate
   sudo certbot delete --cert-name manehaghighi.com
   
   # Re-obtain
   sudo certbot --nginx -d manehaghighi.com -d www.manehaghighi.com \
     --non-interactive --agree-tos --email "your-email@example.com"
   ```

---

## 🔍 Troubleshooting

### Check if certificates exist:
```bash
ls -la /etc/letsencrypt/live/manehaghighi.com/
ls -la /etc/letsencrypt/live/api.manehaghighi.com/
ls -la /etc/letsencrypt/live/admin.manehaghighi.com/
```

### Check nginx error logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

### Test SSL certificate:
```bash
# Test from command line
openssl s_client -connect manehaghighi.com:443 -servername manehaghighi.com

# Or use online tools:
# https://www.ssllabs.com/ssltest/
# https://www.sslshopper.com/ssl-checker.html
```

### Verify DNS is correct:
```bash
# Check DNS records
dig manehaghighi.com
dig api.manehaghighi.com
dig admin.manehaghighi.com

# Should point to 185.231.112.84
```

---

## 🌐 Cloudflare vs Let's Encrypt

### Using Cloudflare SSL:
- ✅ **Easier** - No server-side certificate management
- ✅ **Free** - Cloudflare provides SSL
- ✅ **CDN** - Faster loading
- ⚠️ **Requires** Cloudflare proxy to be ON (orange cloud)
- ⚠️ **Mode must be** "Full" or "Full (strict)"

### Using Let's Encrypt (Direct):
- ✅ **Direct SSL** - No proxy needed
- ✅ **Free** - Let's Encrypt is free
- ⚠️ **Requires** DNS to point directly to server
- ⚠️ **Requires** ports 80/443 open
- ⚠️ **Requires** renewal every 90 days (auto-renewal available)

---

## 📋 Quick Fix Checklist

- [ ] Check Cloudflare SSL mode (if using Cloudflare)
- [ ] Verify DNS records point to correct IP
- [ ] Check if certificates exist on server
- [ ] Verify nginx is running
- [ ] Check nginx configuration syntax
- [ ] Test certificate validity
- [ ] Clear browser cache and try again

---

## 🚀 Recommended Setup

**For production with Cloudflare:**
1. Use Cloudflare SSL mode: **Full (strict)**
2. Keep nginx configs with SSL (Cloudflare will validate)
3. Ensure Cloudflare proxy is ON (🟠 orange cloud)

**For production without Cloudflare:**
1. Install Let's Encrypt certificates
2. Setup auto-renewal cron job
3. Monitor certificate expiration

---

## 📞 Still Having Issues?

1. **Check nginx status:**
   ```bash
   sudo systemctl status nginx
   ```

2. **Check certificate details:**
   ```bash
   sudo certbot certificates
   ```

3. **View nginx config:**
   ```bash
   sudo nginx -T | grep -A 20 "server_name manehaghighi.com"
   ```

4. **Test from server:**
   ```bash
   curl -I https://manehaghighi.com
   curl -I https://api.manehaghighi.com
   ```

---

## ✅ After Fixing

Once SSL is working:
- ✅ Test in browser: `https://manehaghighi.com`
- ✅ Check SSL grade: https://www.ssllabs.com/ssltest/
- ✅ Verify all subdomains work
- ✅ Setup certificate auto-renewal (if using Let's Encrypt)

