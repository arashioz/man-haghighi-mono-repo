import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private prisma: PrismaService) {}

  private generateInvoiceNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `INV-${timestamp}-${random}`;
  }

  async createInvoice(data: {
    userId: string;
    type: 'COURSE_PURCHASE' | 'WALLET_CHARGE' | 'PAYMENT_LINK';
    amount: number;
    courseId?: string;
    paymentLinkId?: string;
    customerName?: string;
    customerPhone?: string;
    description?: string;
    walletId?: string;
  }) {
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber: this.generateInvoiceNumber(),
        userId: data.userId,
        walletId: data.walletId,
        type: data.type,
        amount: new Decimal(data.amount),
        status: 'PENDING',
        courseId: data.courseId,
        paymentLinkId: data.paymentLinkId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        description: data.description,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            price: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        paymentLink: {
          select: {
            id: true,
            linkCode: true,
            amount: true,
          },
        },
      },
    });

    this.logger.log(`Invoice created: ${invoice.invoiceNumber} for user ${data.userId}`);
    return invoice;
  }

  async updateInvoiceStatus(
    invoiceId: string,
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED',
    transactionId?: string,
    gatewayResponse?: any,
  ) {
    const updateData: any = {
      status,
    };

    if (status === 'PAID') {
      updateData.paidAt = new Date();
    }

    if (transactionId) {
      updateData.transactionId = transactionId;
    }

    if (gatewayResponse) {
      updateData.gatewayResponse = gatewayResponse;
    }

    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return invoice;
  }

  async getUserInvoices(userId: string, limit = 50) {
    const invoices = await this.prisma.invoice.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
          },
        },
        paymentLink: {
          select: {
            id: true,
            linkCode: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return invoices;
  }

  async getCourseInvoices(courseId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        courseId,
        status: 'PAID',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
    });

    return invoices;
  }

  async getInvoiceById(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        course: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            username: true,
          },
        },
        paymentLink: true,
        transactions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('فاکتور یافت نشد');
    }

    return invoice;
  }

  async getInvoiceByInvoiceNumber(invoiceNumber: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        course: true,
        user: true,
        paymentLink: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('فاکتور یافت نشد');
    }

    return invoice;
  }

  async getAllInvoices(params?: {
    page?: number;
    limit?: number;
    status?: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    type?: 'COURSE_PURCHASE' | 'WALLET_CHARGE' | 'PAYMENT_LINK';
    userId?: string;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.type) {
      where.type = params.type;
    }

    if (params?.userId) {
      where.userId = params.userId;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              username: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          paymentLink: {
            select: {
              id: true,
              linkCode: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

