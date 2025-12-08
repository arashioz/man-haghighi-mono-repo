# --- Stage 1: Build ---
    FROM node:18-alpine AS builder

    WORKDIR /app
    
    COPY package*.json ./
    COPY prisma ./prisma/
    
    # Install all deps (including dev)
    RUN npm ci
    
    COPY . .
    
    # Build NestJS
    RUN npm run build
    RUN npx prisma generate
    
    
    # --- Stage 2: Production ---
    FROM node:18-alpine AS production
    
    WORKDIR /app
    
    # Create non-root user
    RUN addgroup -S appgroup && adduser -S appuser -G appgroup
    
    COPY package*.json ./
    
    # Install production dependencies
    RUN npm ci --only=production
    
    # Install ONLY what seed needs
    RUN npm install ts-node typescript @types/node --save-dev
    
    # Copy build output
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/prisma ./prisma
    COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
    
    USER appuser
    
    EXPOSE 3000
    
    # Run migrations → run seed.ts → start app
    CMD sh -c "\
      npx prisma migrate deploy && \
      npx ts-node --project tsconfig.seed.json prisma/seed.ts && \
      npm run start:prod \
    "
    