# Stage 1: Build
FROM node:18-alpine3.19 AS builder
WORKDIR /app

# Copy package files + prisma
COPY package*.json ./
COPY prisma ./prisma/

# Install all deps for build
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Copy tsconfig files
COPY tsconfig.json ./tsconfig.json
COPY tsconfig.seed.json ./tsconfig.seed.json

# Generate Prisma Client
RUN npx prisma generate

# Build app
RUN npm run build

# Stage 2: Production
FROM node:18-alpine3.19 AS production
WORKDIR /app

# Create non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Copy package.json
COPY package*.json ./

# Install production deps + ts-node for seeding
RUN npm ci --only=production --legacy-peer-deps && \
    npm install --save-dev ts-node typescript tsconfig-paths --legacy-peer-deps

# Copy built app + prisma + tsconfig
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/tsconfig.seed.json ./tsconfig.seed.json

# Copy migration scripts from builder
COPY --from=builder --chown=nestjs:nodejs /app/scripts/ ./scripts/
RUN chmod +x ./scripts/*.sh

# Uploads directory
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads

# Switch to non-root
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30m --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start command
CMD ["sh", "-c", " ./scripts/seed-with-migration.sh  && npm run start"]
