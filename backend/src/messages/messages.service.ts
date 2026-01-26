import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageStatus, UserRole } from '@prisma/client';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  async broadcast(dto: CreateMessageDto, adminId: string) {
    const sendInApp = dto.sendInApp !== false;
    const sendSms = !!dto.sendSms;

    if (!sendInApp && !sendSms) {
      throw new BadRequestException('حداقل یکی از گزینه‌های ارسال درون پنلی یا پیامک باید فعال باشد.');
    }

    const recipients = await this.prisma.user.findMany({
      where: {
        isActive: true,
        isBlocked: false,
        role: {
          in: [UserRole.USER, UserRole.SALES_MANAGER, UserRole.SALES_PERSON],
        },
      },
      select: {
        id: true,
        phone: true,
      },
    });

    if (!recipients.length) {
      throw new BadRequestException('هیچ کاربر فعالی برای ارسال پیام پیدا نشد.');
    }

    const message = await this.prisma.message.create({
      data: {
        title: dto.title.trim(),
        body: dto.body.trim(),
        sendSms,
        sendInApp,
        status: MessageStatus.PENDING,
        totalRecipients: recipients.length,
        sentById: adminId,
      },
    });

    await this.prisma.userMessage.createMany({
      data: recipients.map((user) => ({
        userId: user.id,
        messageId: message.id,
        deliveredAt: sendInApp ? new Date() : null,
        smsStatus: sendSms ? 'PENDING' : null,
      })),
    });

    let smsSentCount = 0;
    let smsFailedCount = 0;

    if (sendSms) {
      for (const user of recipients) {
        if (!user.phone) {
          smsFailedCount++;
          await this.prisma.userMessage.updateMany({
            where: { userId: user.id, messageId: message.id },
            data: { smsStatus: 'NO_PHONE' },
          });
          continue;
        }

        try {
          await this.smsService.sendTextMessage(user.phone, dto.body);
          smsSentCount++;
          await this.prisma.userMessage.updateMany({
            where: { userId: user.id, messageId: message.id },
            data: { smsStatus: 'SENT' },
          });
        } catch (error) {
          smsFailedCount++;
          this.logger.error(`خطا در ارسال پیامک به ${user.phone}`, error?.message || error);
          await this.prisma.userMessage.updateMany({
            where: { userId: user.id, messageId: message.id },
            data: {
              smsStatus: 'FAILED',
              smsError: error?.message?.slice?.(0, 500) || 'SMS send failed',
            },
          });
        }
      }
    }

    const status =
      smsFailedCount > 0 && smsFailedCount === recipients.length
        ? MessageStatus.FAILED
        : MessageStatus.SENT;

    const updatedMessage = await this.prisma.message.update({
      where: { id: message.id },
      data: {
        status,
        smsSentCount,
        smsFailedCount,
        inAppSentCount: sendInApp ? recipients.length : 0,
      } as any,
    });

    return {
      message: 'پیام با موفقیت ثبت شد',
      data: {
        message: updatedMessage,
        totals: {
          recipients: recipients.length,
          smsSent: smsSentCount,
          smsFailed: smsFailedCount,
          inAppDelivered: sendInApp ? recipients.length : 0,
        },
      },
    };
  }

  async getAdminMessages(limit = 50) {
    return this.prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { userMessages: true },
        },
      },
    });
  }

  async getUserMessages(userId: string) {
    return this.prisma.userMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        message: true,
      },
    });
  }

  async markAsRead(userId: string, userMessageId: string) {
    const userMessage = await this.prisma.userMessage.findUnique({
      where: { id: userMessageId },
      include: { message: true },
    });

    if (!userMessage) {
      throw new NotFoundException('پیام پیدا نشد');
    }

    if (userMessage.userId !== userId) {
      throw new ForbiddenException('دسترسی به این پیام ندارید');
    }

    if (userMessage.isRead) {
      return userMessage;
    }

    return this.prisma.userMessage.update({
      where: { id: userMessageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        message: true,
      },
    });
  }

  async sendPersonalMessage(userId: string, title: string, body: string, sendSms: boolean = false) {
    // Create message
    const message = await this.prisma.message.create({
      data: {
        title,
        body,
        sendSms,
        sendInApp: true,
        status: MessageStatus.PENDING,
        sentById: null, // System message
        totalRecipients: 1,
      },
    });

    // Create user message
    await this.prisma.userMessage.create({
      data: {
        userId,
        messageId: message.id,
      },
    });

    // Update message status
    await this.prisma.message.update({
      where: { id: message.id },
      data: {
        status: MessageStatus.SENT,
        inAppSentCount: 1,
      },
    });

    this.logger.log(`Personal message sent to user ${userId}: ${title}`);

    return message;
  }
}

