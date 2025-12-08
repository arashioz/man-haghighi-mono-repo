import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class AdminService {
  constructor(private readonly configService: ConfigService) {}

  async createDatabaseBackup(): Promise<string> {
    try {
      // Get database connection details from environment
      const databaseUrl = this.configService.get<string>('DATABASE_URL');
      
      if (!databaseUrl) {
        throw new Error('DATABASE_URL is not configured');
      }

      // Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
      const urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      if (!urlMatch) {
        throw new Error('Invalid DATABASE_URL format');
      }

      const [, user, password, host, port, database] = urlMatch;

      // Create backup directory if it doesn't exist
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                       new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const backupFileName = `haghighi_backup_${timestamp}.sql`;
      const backupPath = path.join(backupDir, backupFileName);

      // Set PGPASSWORD environment variable for pg_dump
      const env = {
        ...process.env,
        PGPASSWORD: password,
      };

      // Create pg_dump command (plain SQL format for easier download and restore)
      const pgDumpCommand = `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p --no-owner --no-acl -f "${backupPath}"`;
      
      // Execute pg_dump
      await execAsync(pgDumpCommand, { env, maxBuffer: 1024 * 1024 * 100 }); // 100MB buffer

      // Check if backup file was created
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file was not created');
      }

      // Return the path to the backup file
      return backupPath;
    } catch (error) {
      console.error('Database backup error:', error);
      throw new HttpException(
        `Failed to create database backup: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

