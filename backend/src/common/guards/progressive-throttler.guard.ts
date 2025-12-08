import { Injectable, ExecutionContext, HttpException, HttpStatus, CanActivate } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

interface RequestTracker {
  count: number;
  firstRequestTime: number;
  violationCount: number;
}

@Injectable()
export class ProgressiveThrottlerGuard implements CanActivate {
  private requestTrackers = new Map<string, RequestTracker>();
  private prisma: PrismaService | null = null;

  constructor(private moduleRef: ModuleRef) {}

  private async getPrismaService(): Promise<PrismaService> {
    if (!this.prisma) {
      try {
        this.prisma = this.moduleRef.get(PrismaService, { strict: false });
      } catch {
        // If PrismaService is not available, return null
        return null as any;
      }
    }
    return this.prisma;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Skip throttling for non-USER roles (ADMIN, SALES_MANAGER, SALES_PERSON)
    if (user && user.role && user.role !== UserRole.USER) {
      return true;
    }

    // For USER role, check blocking status and apply rate limiting
    if (user && user.id) {
      const prisma = await this.getPrismaService();
      if (!prisma) {
        // If PrismaService is not available, allow the request
        return true;
      }

      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            role: true,
            isBlocked: true,
            blockedUntil: true,
            rateLimitViolations: true,
            lastRateLimitViolation: true,
          },
        });

        if (dbUser) {
          // Check if user is currently blocked
          if (dbUser.isBlocked && dbUser.blockedUntil) {
            const now = new Date();
            const blockedUntil = new Date(dbUser.blockedUntil);

            // Auto-unblock if 2 hours have passed
            if (now >= blockedUntil) {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  isBlocked: false,
                  blockedUntil: null,
                  rateLimitViolations: 0,
                },
              });
            } else {
              // User is still blocked
              const remainingMs = blockedUntil.getTime() - now.getTime();
              const remainingMinutes = Math.ceil(remainingMs / 60000);
              throw new HttpException(
                {
                  statusCode: HttpStatus.TOO_MANY_REQUESTS,
                  message: `Too Many Requests. You are blocked for ${remainingMinutes} more minutes.`,
                  error: 'Too Many Requests',
                },
                HttpStatus.TOO_MANY_REQUESTS,
              );
            }
          }

          // Track requests for rate limiting
          const identifier = `user:${user.id}`;
          const now = Date.now();
          const tracker = this.requestTrackers.get(identifier) || {
            count: 0,
            firstRequestTime: now,
            violationCount: dbUser.rateLimitViolations || 0,
          };

          // Determine limits based on violation count
          let limit: number;
          let windowMs: number;

          if (tracker.violationCount === 0) {
            // First time: 3 requests in 5 seconds
            limit = 3;
            windowMs = 5000;
          } else {
            // After first violation: 3 requests in 10 seconds
            limit = 3;
            windowMs = 10000;
          }

          // Reset window if it has expired
          if (now - tracker.firstRequestTime > windowMs) {
            tracker.count = 1;
            tracker.firstRequestTime = now;
          } else {
            tracker.count++;
          }

          // Check if limit exceeded
          if (tracker.count > limit) {
            // Increment violation count
            const newViolationCount = tracker.violationCount + 1;
            
            // Block user for 2 hours
            const blockedUntil = new Date(now + 2 * 60 * 60 * 1000); // 2 hours

            await prisma.user.update({
              where: { id: user.id },
              data: {
                isBlocked: true,
                blockedUntil,
                rateLimitViolations: newViolationCount,
                lastRateLimitViolation: new Date(now),
              },
            });

            // Reset tracker
            this.requestTrackers.delete(identifier);

            throw new HttpException(
              {
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                message: 'Too Many Requests. You have been blocked for 2 hours.',
                error: 'Too Many Requests',
              },
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }

          // Update tracker
          this.requestTrackers.set(identifier, tracker);

          // Clean up old trackers (older than 1 minute)
          this.cleanupTrackers();
        }
      } catch (error) {
        // If it's an HttpException, rethrow it
        if (error instanceof HttpException) {
          throw error;
        }
        // For other errors, log and allow the request
        console.error('Error in ProgressiveThrottlerGuard:', error);
        return true;
      }
    }

    // For unauthenticated requests, allow (they will be handled by default throttler if needed)
    return true;
  }

  private cleanupTrackers() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    for (const [key, tracker] of this.requestTrackers.entries()) {
      if (tracker.firstRequestTime < oneMinuteAgo) {
        this.requestTrackers.delete(key);
      }
    }
  }
}

