import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateSettingsDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    if (!settings) {
      // Create default settings if they don't exist
      settings = await this.prisma.settings.create({
        data: {
          id: 'settings',
          siteName: 'سایت',
          maintenanceMode: false,
          smsEnabled: false,
          emailEnabled: false,
          backupEnabled: true,
          backupFrequency: 'daily',
          maxUploadSize: 104857600, // 100MB
          allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg'],
        },
      });
    }

    return settings;
  }

  async updateSettings(updateSettingsDto: UpdateSettingsDto) {
    const existingSettings = await this.prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    if (!existingSettings) {
      // Create settings if they don't exist
      return this.prisma.settings.create({
        data: {
          id: 'settings',
          ...updateSettingsDto,
        },
      });
    }

    return this.prisma.settings.update({
      where: { id: 'settings' },
      data: updateSettingsDto,
    });
  }
}





