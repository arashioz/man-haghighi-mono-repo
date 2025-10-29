# Admin Panel Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps to handle React 19 compatibility
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build argument for API URL
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Build the app
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Fix permissions for assets so nginx can serve them
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} \; && \
    find /usr/share/nginx/html -type f -exec chmod 644 {} \;

# Simple nginx config for SPA
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
