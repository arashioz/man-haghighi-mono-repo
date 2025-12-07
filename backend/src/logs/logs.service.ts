import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GetLogsDto, LogLevel } from './dto/log.dto';

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(private prisma: PrismaService) {}

  async createLog(data: {
    level: LogLevel | string;
    message: string;
    context?: string;
    method?: string;
    url?: string;
    statusCode?: number;
    duration?: number;
    userId?: string;
    ip?: string;
    userAgent?: string;
    errorStack?: string;
    requestBody?: any;
    response?: any;
  }) {
    try {
      await this.prisma.log.create({
        data: {
          level: data.level,
          message: data.message,
          context: data.context,
          method: data.method,
          url: data.url,
          statusCode: data.statusCode,
          duration: data.duration,
          userId: data.userId,
          ip: data.ip,
          userAgent: data.userAgent,
          errorStack: data.errorStack,
          requestBody: data.requestBody ? JSON.parse(JSON.stringify(data.requestBody)) : null,
          response: data.response ? JSON.parse(JSON.stringify(data.response)) : null,
        },
      });
    } catch (error: any) {
      // Don't fail the request if logging fails
      this.logger.error(`Failed to save log to database: ${error.message}`);
    }
  }

  async getLogs(dto: GetLogsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (dto.level) {
      where.level = dto.level;
    }

    if (dto.context) {
      where.context = { contains: dto.context, mode: 'insensitive' };
    }

    if (dto.url) {
      where.url = { contains: dto.url, mode: 'insensitive' };
    }

    if (dto.statusCode) {
      where.statusCode = dto.statusCode;
    }

    if (dto.search) {
      where.message = { contains: dto.search, mode: 'insensitive' };
    }

    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) {
        where.createdAt.gte = new Date(dto.startDate);
      }
      if (dto.endDate) {
        where.createdAt.lte = new Date(dto.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.log.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.log.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLogStats() {
    const [total, byLevel, byContext, recentErrors] = await Promise.all([
      this.prisma.log.count(),
      this.prisma.log.groupBy({
        by: ['level'],
        _count: {
          level: true,
        },
      }),
      this.prisma.log.groupBy({
        by: ['context'],
        _count: {
          context: true,
        },
        orderBy: {
          _count: {
            context: 'desc',
          },
        },
        take: 10,
      }),
      this.prisma.log.findMany({
        where: {
          level: LogLevel.ERROR,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
    ]);

    return {
      total,
      byLevel: byLevel.reduce((acc, item) => {
        acc[item.level] = item._count.level;
        return acc;
      }, {} as Record<string, number>),
      byContext: byContext.map(item => ({
        context: item.context,
        count: item._count.context,
      })),
      recentErrors,
    };
  }

  async deleteOldLogs(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.prisma.log.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return {
      deleted: result.count,
      message: `Deleted ${result.count} logs older than ${days} days`,
    };
  }

  async deleteAllLogs() {
    const result = await this.prisma.log.deleteMany({});
    return {
      deleted: result.count,
      message: `Deleted ${result.count} logs`,
    };
  }
}

