# Admin Panel Dockerfile - Multi-stage build with security headers
FROM docker.arvancloud.ir/node:20-alpine as Builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean npm cache and install dependencies with legacy peer deps to handle React 19 compatibility
RUN  npm install --legacy-peer-deps --force

# Copy source code
COPY . .

# Build argument for API URL
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Ensure local node_modules binaries are on PATH and build the app
ENV PATH=/app/node_modules/.bin:$PATH
RUN npm run build

# Production stage with nginx
FROM docker.arvancloud.ir/nginx:alpine

# Copy built files with correct ownership
COPY --from=builder --chown=nginx:nginx /app/build /usr/share/nginx/html

# Ensure proper permissions for nginx directories
RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Fix permissions for assets
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} \; && \
    find /usr/share/nginx/html -type f -exec chmod 644 {} \;

# Create nginx config with security headers
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Security Headers \
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-Frame-Options "DENY" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    add_header Referrer-Policy "strict-origin-when-cross-origin" always; \
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always; \
    \
    # Content Security Policy - temporarily disabled \
    # add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\'' '\''unsafe-eval'\''; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data: https: http:; font-src '\''self'\'' data:; connect-src '\''self'\'' https: http: ws: wss:; frame-ancestors '\''none'\'';" always; \
    \
    # Hide nginx version \
    server_tokens off; \
    \
    # SPA routing \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Cache static assets \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

# Run as nginx user
USER nginx

CMD ["nginx", "-g", "daemon off;"]
