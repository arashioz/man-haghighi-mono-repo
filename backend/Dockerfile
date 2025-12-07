# Backend Dockerfile - Multi-stage build for security
# Stage 1: Build
FROM node:18-alpine3.19 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies for build)
# Use --legacy-peer-deps to handle peer dependency warnings
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .
# Copy tsconfig.json for seed command
COPY tsconfig.json ./tsconfig.json

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:18-alpine3.19 AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies + dev dependencies needed for seeding
# Use --legacy-peer-deps to handle peer dependency warnings
RUN npm ci --only=production --legacy-peer-deps && \
    npm install --save-dev @types/bcryptjs ts-node typescript tsconfig-paths --legacy-peer-deps && \
    npm cache clean --force

# Copy built application from builder with ownership
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copy migration script with ownership
COPY --chown=nestjs:nodejs scripts/migrate.sh ./scripts/migrate.sh
RUN chmod +x ./scripts/migrate.sh

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && \
    chown nestjs:nodejs /app/uploads

# Create .prisma directory with proper permissions for Prisma Client generation
# This allows the nestjs user to regenerate Prisma Client after migrations
RUN mkdir -p /app/node_modules/.prisma && \
    chown -R nestjs:nodejs /app/node_modules/.prisma

# Ensure prisma package directory is writable for generation
# Prisma needs to write to node_modules/.prisma and node_modules/prisma
RUN mkdir -p /app/node_modules/prisma && \
    chown -R nestjs:nodejs /app/node_modules/prisma 2>/dev/null || true

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the app
CMD ["sh", "-c", "./scripts/migrate.sh && npm run start:prod"]
