# Stage 1: Build
FROM node:18-alpine3.19 AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma Client and build
RUN npx prisma generate && npm run build

# Stage 2: Production
FROM node:18-alpine3.19
WORKDIR /app

# Create non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --legacy-peer-deps

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy scripts (for manual migration execution)
COPY --from=builder --chown=nestjs:nodejs /app/scripts ./scripts
RUN chmod +x ./scripts/*.sh 2>/dev/null || true

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads

# Fix ownership
RUN chown -R nestjs:nodejs /app/node_modules /app/prisma /app/dist

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30m --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application (migrations must be run manually)
CMD ["npm", "run", "start:prod"]
