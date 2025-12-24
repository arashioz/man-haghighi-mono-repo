import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { GatewayService } from './gateway.service';
import { WalletService } from './wallet.service';
import { InvoiceService } from './invoice.service';
import { CoursesService } from '../courses/courses.service';
import { Decimal } from '@prisma/client/runtime/library';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private gatewayService: GatewayService,
    private walletService: WalletService,
    private invoiceService: InvoiceService,
    private coursesService: CoursesService,
    private configService: ConfigService,
  ) {}

  private generateOrderId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${timestamp}${random}`;
  }

  /**
   * Convert Toman to Rial for payment gateway
   * Payment gateways in Iran expect amounts in Rial
   * 1 Toman = 10 Rial
   */
  private tomanToRial(tomanAmount: number): number {
    return Math.round(tomanAmount * 10);
  }

  async initiateCoursePayment(userId: string, courseId: string) {
    // Check if user is already enrolled
    const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException('شما قبلاً در این دوره ثبت‌نام کرده‌اید');
    }

    // Get course details
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('دوره یافت نشد');
    }

    if (!course.published) {
      throw new BadRequestException('این دوره منتشر نشده است');
    }

    const coursePrice = Number(course.price);

    // If course is free, enroll directly
    if (coursePrice === 0) {
      return this.coursesService.enrollUser({ userId, courseId });
    }

    // Check wallet balance
    const walletBalance = await this.walletService.getWalletBalance(userId);

    // If user has enough balance, deduct and enroll
    if (walletBalance >= coursePrice) {
      const wallet = await this.walletService.getOrCreateWallet(userId);
      const invoice = await this.invoiceService.createInvoice({
        userId,
        type: 'COURSE_PURCHASE',
        amount: coursePrice,
        courseId,
        walletId: wallet.id,
        description: `خرید دوره: ${course.title}`,
      });

      // Deduct from wallet
      await this.walletService.deductFromWallet(
        userId,
        coursePrice,
        invoice.id,
        `خرید دوره: ${course.title}`,
      );

      // Update invoice status
      await this.invoiceService.updateInvoiceStatus(invoice.id, 'PAID');

      // Enroll user
      await this.coursesService.enrollUser({ userId, courseId });

      // Create transaction record
      await this.prisma.transaction.updateMany({
        where: {
          invoiceId: invoice.id,
        },
        data: {
          coursePurchased: true,
          coursePurchaseDate: new Date(),
        },
      });

      return {
        success: true,
        message: 'دوره با موفقیت خریداری شد',
        invoice,
        enrolled: true,
      };
    }

    // If not enough balance, create invoice and payment request
    const wallet = await this.walletService.getOrCreateWallet(userId);
    const invoice = await this.invoiceService.createInvoice({
      userId,
      type: 'COURSE_PURCHASE',
      amount: coursePrice,
      courseId,
      walletId: wallet.id,
      description: `خرید دوره: ${course.title}`,
    });

    const orderId = this.generateOrderId();

    // Create transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        walletId: wallet.id,
        invoiceId: invoice.id,
        type: 'PAYMENT',
        amount: new Decimal(coursePrice),
        orderId,
        status: 'PENDING',
        description: `خرید دوره: ${course.title}`,
        metadata: {
          courseId: courseId,
        } as any,
      },
    });

    // Create payment request
    // Convert Toman to Rial for payment gateway (gateways expect Rial)
    const coursePriceInRial = this.tomanToRial(coursePrice);
    const paymentRequest = await this.gatewayService.createPaymentRequest(
      orderId,
      coursePriceInRial,
      `خرید دوره: ${course.title}`,
    );

    // Update transaction with refId
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        refId: paymentRequest.refId,
        bpPayRequestRaw: paymentRequest.response,
        bpPayRequestDate: new Date(),
        status: 'PENDING',
      },
    });

    return {
      success: true,
      paymentUrl: paymentRequest.paymentUrl,
      refId: paymentRequest.refId,
      invoice,
      transaction,
      formData: {
        RefId: paymentRequest.refId,
      },
    };
  }

  async chargeWallet(userId: string, amount: number, description?: string) {
    if (amount < 1000) {
      throw new BadRequestException('حداقل مبلغ شارژ 1000 ریال است');
    }

    const wallet = await this.walletService.getOrCreateWallet(userId);
    const invoice = await this.invoiceService.createInvoice({
      userId,
      type: 'WALLET_CHARGE',
      amount,
      walletId: wallet.id,
      description: description || 'شارژ کیف پول',
    });

    const orderId = this.generateOrderId();

    // Create transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        walletId: wallet.id,
        invoiceId: invoice.id,
        type: 'WALLET_CHARGE',
        amount: new Decimal(amount),
        orderId,
        status: 'PENDING',
        description: description || 'شارژ کیف پول',
      },
    });

    // Create payment request
    const paymentRequest = await this.gatewayService.createPaymentRequest(
      orderId,
      amount,
      description || 'شارژ کیف پول',
    );

    // Update transaction with refId
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        refId: paymentRequest.refId,
        bpPayRequestRaw: paymentRequest.response,
        bpPayRequestDate: new Date(),
        status: 'PENDING',
      },
    });

    return {
      success: true,
      paymentUrl: paymentRequest.paymentUrl,
      refId: paymentRequest.refId,
      invoice,
      transaction,
      formData: {
        RefId: paymentRequest.refId,
      },
    };
  }

  async processPaymentCallback(callbackData: {
    ResCode?: string;
    SaleOrderId?: string;
    SaleReferenceId?: string;
    RefId?: string;
    CardHolderPan?: string;
  }) {
    const { ResCode, SaleOrderId, SaleReferenceId, RefId, CardHolderPan } = callbackData;

    this.logger.log(`Payment callback received: ${JSON.stringify(callbackData)}`);

    // Find transaction by orderId or refId
    let transaction = null;

    if (SaleOrderId) {
      transaction = await this.prisma.transaction.findUnique({
        where: { orderId: SaleOrderId },
        include: {
          invoice: {
            include: {
              course: true,
            },
          },
          user: true,
        },
      });
    }

    if (!transaction && RefId) {
      transaction = await this.prisma.transaction.findFirst({
        where: { refId: RefId },
        include: {
          invoice: {
            include: {
              course: true,
            },
          },
          user: true,
        },
      });
    }

    if (!transaction) {
      this.logger.error(`Transaction not found for callback: ${JSON.stringify(callbackData)}`);
      throw new NotFoundException('تراکنش یافت نشد');
    }

    // Update transaction with callback data
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        saleOrderId: SaleOrderId,
        saleReferenceId: SaleReferenceId,
        cardHolderPan: CardHolderPan,
        callbackRaw: callbackData as any,
        callbackDate: new Date(),
        status: 'PENDING',
      },
    });

    // Check if payment failed
    if (ResCode !== '0') {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          errorMessage: `خطای درگاه: ${ResCode}`,
        },
      });

      if (transaction.invoice) {
        await this.invoiceService.updateInvoiceStatus(
          transaction.invoice.id,
          'FAILED',
          transaction.id,
          callbackData,
        );
      }

      return {
        success: false,
        error: `خطای پرداخت: ${ResCode}`,
        transaction,
      };
    }

    // Verify payment
    try {
      const verifyResult = await this.gatewayService.verifyPayment(
        transaction.orderId!,
        SaleOrderId!,
        SaleReferenceId!,
      );

      if (!verifyResult.success) {
        throw new BadRequestException('تایید پرداخت ناموفق بود');
      }

      // Update transaction
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'PAID', // Payment is verified, so it's PAID
          verifyRaw: verifyResult.response,
          verifyDate: new Date(),
        },
      });

      // Settle payment
      try {
        const settleResult = await this.gatewayService.settlePayment(
          transaction.orderId!,
          SaleOrderId!,
          SaleReferenceId!,
        );

        if (settleResult.success) {
          await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'PAID', // Payment is settled, so it's PAID
              settleRaw: settleResult.response,
              settleDate: new Date(),
            },
          });
        }
      } catch (settleError) {
        this.logger.error(`Settle error: ${settleError.message}`);
        // Continue even if settle fails
      }

      // Process payment based on type
      if (transaction.type === 'WALLET_CHARGE') {
        // Charge wallet
        await this.walletService.chargeWallet(
          transaction.userId,
          Number(transaction.amount),
          transaction.invoiceId || undefined,
          transaction.description || undefined,
        );

        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            walletCredited: true,
            walletCreditDate: new Date(),
          },
        });
      } else if (transaction.type === 'PAYMENT' && transaction.invoice?.courseId) {
        // Charge wallet first
        await this.walletService.chargeWallet(
          transaction.userId,
          Number(transaction.amount),
          transaction.invoiceId || undefined,
          transaction.description || undefined,
        );

        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            walletCredited: true,
            walletCreditDate: new Date(),
          },
        });

        // Deduct from wallet
        await this.walletService.deductFromWallet(
          transaction.userId,
          Number(transaction.amount),
          transaction.invoiceId || undefined,
          transaction.description || undefined,
        );

        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            walletDeducted: true,
            walletDeductDate: new Date(),
          },
        });

        // Update invoice status to PAID BEFORE enrolling user
        // This is important because enrollUser checks for PAID invoice
        if (transaction.invoice) {
          await this.invoiceService.updateInvoiceStatus(
            transaction.invoice.id,
            'PAID',
            transaction.id,
            callbackData,
          );
        }

        // Enroll in course
        try {
          await this.coursesService.enrollUser({
            userId: transaction.userId,
            courseId: transaction.invoice.courseId,
          });

          await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              coursePurchased: true,
              coursePurchaseDate: new Date(),
            },
          });
        } catch (enrollError) {
          this.logger.error(`Enrollment error: ${enrollError.message}`);
          // Continue even if enrollment fails (user might already be enrolled)
        }
      }

      // Update invoice status for WALLET_CHARGE and PAYMENT transactions without courseId
      if (transaction.invoice) {
        if (transaction.type === 'WALLET_CHARGE') {
          await this.invoiceService.updateInvoiceStatus(
            transaction.invoice.id,
            'PAID',
            transaction.id,
            callbackData,
          );
        } else if (transaction.type === 'PAYMENT' && !transaction.invoice?.courseId) {
          // PAYMENT transactions without courseId (e.g., payment links)
          await this.invoiceService.updateInvoiceStatus(
            transaction.invoice.id,
            'PAID',
            transaction.id,
            callbackData,
          );
        }
        // Note: PAYMENT transactions with courseId are already handled above
      }

      return {
        success: true,
        message: 'پرداخت با موفقیت انجام شد',
        transaction,
      };
    } catch (verifyError) {
      this.logger.error(`Verify error: ${verifyError.message}`);
      
      // Try reversal
      try {
        await this.gatewayService.reversePayment(
          transaction.orderId!,
          SaleOrderId!,
          SaleReferenceId!,
        );
      } catch (reversalError) {
        this.logger.error(`Reversal error: ${reversalError.message}`);
      }

      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          errorMessage: verifyError.message,
        },
      });

      if (transaction.invoice) {
        await this.invoiceService.updateInvoiceStatus(
          transaction.invoice.id,
          'FAILED',
          transaction.id,
          callbackData,
        );
      }

      throw verifyError;
    }
  }

  async createPaymentLink(userId: string, dto: CreatePaymentLinkDto) {
    // Check if user is sales person or sales manager
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== 'SALES_PERSON' && user.role !== 'SALES_MANAGER' && user.role !== 'ADMIN')) {
      throw new UnauthorizedException('فقط کارشناسان فروش می‌توانند لینک پرداخت ایجاد کنند');
    }

    // Validate mobile number
    const mobileRegex = /^09[0-9]{9}$/;
    if (!mobileRegex.test(dto.customerMobile)) {
      throw new BadRequestException('شماره موبایل نامعتبر است');
    }

    // Generate unique link code
    const linkCode = `PL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create payment link
    const paymentLink = await this.prisma.paymentLink.create({
      data: {
        linkCode,
        createdById: userId,
        amount: new Decimal(dto.amount),
        customerName: dto.customerName,
        customerPhone: dto.customerMobile,
        description: dto.description,
        isActive: true,
      },
    });

    // Find or create user by phone
    let customerUser = await this.prisma.user.findUnique({
      where: { phone: dto.customerMobile },
    });

    if (!customerUser) {
      // Create a basic user account for the customer
      customerUser = await this.prisma.user.create({
        data: {
          username: `user_${dto.customerMobile}`,
          phone: dto.customerMobile,
          firstName: dto.customerName.split(' ')[0] || dto.customerName,
          lastName: dto.customerName.split(' ').slice(1).join(' ') || null,
          role: 'USER',
        },
      });
    }

    // Create invoice for payment link
    const wallet = await this.walletService.getOrCreateWallet(customerUser.id);
    const invoice = await this.invoiceService.createInvoice({
      userId: customerUser.id,
      type: 'PAYMENT_LINK',
      amount: dto.amount,
      paymentLinkId: paymentLink.id,
      customerName: dto.customerName,
      customerPhone: dto.customerMobile,
      description: dto.description,
      walletId: wallet.id,
    });

    // Generate payment URL
    const siteUrl = this.configService.get<string>('SITE_URL', 'https://manehaghighi.com');
    const paymentUrl = `${siteUrl}/api/payments/pay/${linkCode}`;

    return {
      success: true,
      paymentLink: {
        ...paymentLink,
        paymentUrl,
      },
      invoice,
    };
  }

  async getPaymentLinkByCode(linkCode: string) {
    const paymentLink = await this.prisma.paymentLink.findUnique({
      where: { linkCode },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        invoices: {
          where: {
            status: 'PAID',
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!paymentLink) {
      throw new NotFoundException('لینک پرداخت یافت نشد');
    }

    if (!paymentLink.isActive) {
      throw new BadRequestException('این لینک پرداخت غیرفعال است');
    }

    if (paymentLink.expiresAt && paymentLink.expiresAt < new Date()) {
      throw new BadRequestException('این لینک پرداخت منقضی شده است');
    }

    return paymentLink;
  }

  async initiatePaymentLinkPayment(linkCode: string, userId?: string) {
    const paymentLink = await this.getPaymentLinkByCode(linkCode);

    // If user is provided, use it; otherwise find by phone
    let customerUser = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : await this.prisma.user.findUnique({ where: { phone: paymentLink.customerPhone } });

    if (!customerUser) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    const amount = Number(paymentLink.amount);

    // Find or create invoice
    let invoice = await this.prisma.invoice.findFirst({
      where: {
        paymentLinkId: paymentLink.id,
        userId: customerUser.id,
        status: 'PENDING',
      },
    });

    if (!invoice) {
      const wallet = await this.walletService.getOrCreateWallet(customerUser.id);
      invoice = await this.invoiceService.createInvoice({
        userId: customerUser.id,
        type: 'PAYMENT_LINK',
        amount,
        paymentLinkId: paymentLink.id,
        customerName: paymentLink.customerName,
        customerPhone: paymentLink.customerPhone,
        description: paymentLink.description,
        walletId: wallet.id,
      });
    }

    const orderId = this.generateOrderId();

    // Create transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        userId: customerUser.id,
        invoiceId: invoice.id,
        paymentLinkId: paymentLink.id,
        type: 'PAYMENT',
        amount: new Decimal(amount),
        orderId,
        status: 'PENDING',
        description: paymentLink.description || 'پرداخت لینک',
        createdBySalesPersonId: paymentLink.createdById,
      },
    });

    // Create payment request
    const paymentRequest = await this.gatewayService.createPaymentRequest(
      orderId,
      amount,
      paymentLink.description || 'پرداخت لینک',
    );

    // Update transaction
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        refId: paymentRequest.refId,
        bpPayRequestRaw: paymentRequest.response,
        bpPayRequestDate: new Date(),
        status: 'PENDING',
      },
    });

    return {
      success: true,
      paymentUrl: paymentRequest.paymentUrl,
      refId: paymentRequest.refId,
      invoice,
      transaction,
      formData: {
        RefId: paymentRequest.refId,
      },
    };
  }

  async getTransactionForUser(
    user: { id: string; role: string },
    transactionId: string,
  ) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        invoice: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('تراکنش یافت نشد');
    }

    if (transaction.userId !== user.id && user.role !== 'ADMIN') {
      throw new UnauthorizedException('دسترسی غیرمجاز به تراکنش');
    }

    return transaction;
  }
}

