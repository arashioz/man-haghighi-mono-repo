import {
  Controller,
  Get,
  Query,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LogsService } from './logs.service';
import { GetLogsDto } from './dto/log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Logs')
@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get logs with filters (Admin only)' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  @ApiQuery({ name: 'level', required: false, enum: ['LOG', 'ERROR', 'WARN', 'DEBUG', 'VERBOSE'] })
  @ApiQuery({ name: 'context', required: false })
  @ApiQuery({ name: 'url', required: false })
  @ApiQuery({ name: 'statusCode', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getLogs(@Query() dto: GetLogsDto) {
    return this.logsService.getLogs(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get log statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getLogStats() {
    return this.logsService.getLogStats();
  }

  @Delete('old/:days')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete logs older than specified days (Admin only)' })
  @ApiResponse({ status: 200, description: 'Old logs deleted successfully' })
  async deleteOldLogs(@Param('days') days: string) {
    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum < 1) {
      throw new Error('Days must be a positive number');
    }
    return this.logsService.deleteOldLogs(daysNum);
  }

  @Delete('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all logs (Admin only)' })
  @ApiResponse({ status: 200, description: 'All logs deleted successfully' })
  async deleteAllLogs() {
    return this.logsService.deleteAllLogs();
  }
}

