# ===============================
# Stage 1: Builder
# ===============================
FROM node:18-alpine3.19 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npx prisma generate
RUN npm run build
RUN chmod +x ./scripts/*.sh 2>/dev/null || true


# ===============================
# Stage 2: Production
# ===============================
FROM node:18-alpine3.19
WORKDIR /app

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Set ownership of /app before npm install to avoid chown issues
RUN chown -R nestjs:nodejs /app

COPY --chown=nestjs:nodejs package*.json ./

# Install all dependencies as nestjs user to avoid permission issues
USER nestjs
RUN npm install --legacy-peer-deps && npm cache clean --force
USER root

# Copy artifacts from builder with correct ownership
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.seed.json ./tsconfig.seed.json
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.json ./tsconfig.json

COPY --from=builder --chown=nestjs:nodejs /app/scripts ./scripts
RUN chmod +x ./scripts/*.sh 2>/dev/null || true

RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30m --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["npm", "run", "start:prod"]
