import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

/**
 * PrismaService with Accelerate support for query caching
 * 
 * Usage:
 * - Regular queries: this.prisma.user.findMany()
 * - Cached queries: this.prisma.cached.user.findMany({ cacheStrategy: { ttl: 3600, swr: 500 } })
 * 
 * To enable Accelerate:
 * 1. Sign up at https://www.prisma.io/accelerate
 * 2. Get your connection string
 * 3. Set PRISMA_ACCELERATE_URL in your environment
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public readonly cached: any;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'production' 
        ? ['error', 'warn'] 
        : ['query', 'error', 'warn', 'info'],
    });
    // Initialize Accelerate extension for query caching
    // If PRISMA_ACCELERATE_URL is not set, it will fall back to direct connection
    try {
      this.cached = this.$extends(withAccelerate());
    } catch (error) {
      // Fallback if Accelerate extension fails
      this.logger.warn('⚠️  Accelerate extension initialization failed, using direct connection');
      this.cached = this;
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
      
      // Log Accelerate status
      if (process.env.PRISMA_ACCELERATE_URL) {
        this.logger.log('🚀 Prisma Accelerate enabled (query caching active)');
      } else {
        this.logger.warn('⚠️  PRISMA_ACCELERATE_URL not set - using direct connection');
        this.logger.warn('   To enable caching, set PRISMA_ACCELERATE_URL in your environment');
      }
    } catch (error) {
      this.logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('🔌 Database disconnected successfully');
    } catch (error) {
      this.logger.error('❌ Error disconnecting from database:', error);
    }
  }

}
