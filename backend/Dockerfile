FROM node:18-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Install Sharp with correct platform flags
RUN npm install --os=linux --cpu=arm64 sharp

# Copy source code
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Generate Prisma client
RUN npm run prisma:generate

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chmod 755 uploads

# Expose port
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "npm run prisma:generate && npm run start:dev"]
