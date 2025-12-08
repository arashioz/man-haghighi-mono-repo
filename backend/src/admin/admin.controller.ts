import { Controller, Get, UseGuards, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

const execAsync = promisify(exec);

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  @Get('backup')
  @ApiOperation({ summary: 'Create database backup (Admin only)' })
  @ApiResponse({ status: 200, description: 'Database backup created successfully' })
  @ApiResponse({ status: 500, description: 'Failed to create backup' })
  async createBackup(@Res() res: Response) {
    try {
      const backupPath = await this.adminService.createDatabaseBackup();
      
      // Set headers for file download
      const fileName = path.basename(backupPath);
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fs.statSync(backupPath).size);

      // Stream the file
      const fileStream = fs.createReadStream(backupPath);
      fileStream.pipe(res);

      // Clean up the file after streaming
      fileStream.on('end', () => {
        // Delete the backup file after sending
        setTimeout(() => {
          try {
            fs.unlinkSync(backupPath);
          } catch (err) {
            console.error('Failed to delete backup file:', err);
          }
        }, 1000);
      });
    } catch (error) {
      console.error('Backup error:', error);
      throw new HttpException(
        `Failed to create backup: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

