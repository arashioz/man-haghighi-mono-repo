# ===============================
# Stage 1: Builder
# ===============================
FROM node:18-alpine3.19 AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS
RUN npm run build

# Make scripts executable
RUN chmod +x ./scripts/*.sh 2>/dev/null || true



# ===============================
# Stage 2: Production
# ===============================
FROM node:18-alpine3.19
WORKDIR /app

# Create non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Copy only package files
COPY package*.json ./

# Install only production deps
RUN npm ci --only=production --legacy-peer-deps

# Copy artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy scripts
COPY --from=builder --chown=nestjs:nodejs /app/scripts ./scripts
RUN chmod +x ./scripts/*.sh 2>/dev/null || true

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads

# Fix permissions
RUN chown -R nestjs:nodejs /app/dist /app/prisma /app/node_modules

# Switch to non-root
USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30m --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start app
CMD ["npm", "run", "start:prod"]
