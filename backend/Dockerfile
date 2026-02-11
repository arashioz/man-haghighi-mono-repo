# ===============================
# Stage 1: builder
# ===============================
FROM docker.arvancloud.ir/node:18-alpine as builder
WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://mirror-npm.runflare.com
RUN npm ci --legacy-peer-deps

COPY . .
RUN npx prisma generate
RUN npm run build
RUN chmod +x ./scripts/*.sh 2>/dev/null || true


# ===============================
# Stage 2: Production
# ===============================
FROM docker.arvancloud.ir/node:18-alpine
RUN npm config set registry https://mirror-npm.runflare.com
WORKDIR /app

# اضافه کردن گروه و کاربر
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# مطمئن شدن مالکیت /app برای root
RUN chown -R nestjs:nodejs /app

# کپی package و نصب deps
COPY --chown=nestjs:nodejs package*.json ./

# نصب deps به عنوان nestjs
USER nestjs
RUN npm install --legacy-peer-deps 

# بازگشت به root برای ساخت پوشه‌ها
USER root

# ساخت مسیرهای مورد نیاز و مالکیت مناسب
RUN mkdir -p /app/moc-old-data /app/uploads
RUN chown -R nestjs:nodejs /app/moc-old-data /app/uploads

# کپی build از stage اول با مالکیت درست
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.seed.json ./tsconfig.seed.json
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nestjs:nodejs /app/scripts ./scripts

# دادن دسترسی اجرایی به اسکریپت‌ها
RUN chmod +x ./scripts/*.sh 2>/dev/null || true

# اجرای برنامه با کاربر nestjs
USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30m --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["npm", "run", "start:prod"]
