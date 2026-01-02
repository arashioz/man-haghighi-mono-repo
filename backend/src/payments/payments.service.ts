import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  UnauthorizedException,
  ForbiddenException,
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

  private getBankNameFromCardNumber(cardNumber?: string): string {
    if (!cardNumber || cardNumber.length < 6) {
      return 'بانک پارسیان'; // Default gateway
    }

    const bin = cardNumber.substring(0, 6);

    // Iranian bank BIN codes
    const bankBins: { [key: string]: string } = {
      '603799': 'بانک ملی ایران',
      '589210': 'بانک سپه',
      '627648': 'بانک توسعه صادرات',
      '627961': 'بانک صنعت و معدن',
      '603770': 'بانک کشاورزی',
      '628023': 'بانک مسکن',
      '627760': 'پست بانک ایران',
      '502908': 'بانک توسعه تعاون',
      '627412': 'بانک اقتصاد نوین',
      '622106': 'بانک پارسیان',
      '502229': 'بانک پاسارگاد',
      '627488': 'بانک کارآفرین',
      '621986': 'بانک سامان',
      '639346': 'بانک سینا',
      '639607': 'بانک سرمایه',
      '502806': 'بانک شهر',
      '502938': 'بانک دی',
      '603769': 'بانک صادرات ایران',
      '610433': 'بانک ملت',
      '627353': 'بانک تجارت',
      '585983': 'بانک رفاه کارگران',
      '627381': 'بانک انصار',
      '505785': 'بانک ایران زمین',
      '636214': 'بانک آینده',
      '636949': 'بانک حکمت ایرانیان',
      '585947': 'بانک خاورمیانه',
      '505416': 'بانک گردشگری',
      '636795': 'بانک مرکزی جمهوری اسلامی ایران',
      '504172': 'بانک رسالت',
      '639370': 'بانک مهر اقتصاد',
      '639599': 'بانک قوامین',
      '504706': 'بانک ایران ونزوئلا',
      '502910': 'بانک ایران ونزوئلا',
      '505801': 'موسسه اعتباری کوثر',
      '606256': 'موسسه اعتباری ملل',
      '606373': 'بانک قرض‌الحسنه مهر ایران',
      '639217': 'بانک کشاورزی',
      '505809': 'بانک توسعه تعاون',
      '606374': 'بانک قرض‌الحسنه مهر ایران',
    };

    return bankBins[bin] || 'بانک پارسیان'; // Default to بانک پارسیان if not found
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

          // Update payment link with payment details for reporting
          if (transaction.paymentLinkId) {
            await this.prisma.paymentLink.update({
              where: { id: transaction.paymentLinkId },
              data: {
                status: 'PAID',
                paidAt: new Date(),
                cardNumber: transaction.cardHolderPan,
                trackingNumber: transaction.saleReferenceId,
                gatewayName: this.getBankNameFromCardNumber(transaction.cardHolderPan),
              },
            });

            // Send success message to user
            try {
              const paymentLink = await this.prisma.paymentLink.findUnique({
                where: { id: transaction.paymentLinkId },
                include: { creator: true },
              });

              if (paymentLink) {
                const messageTitle = 'پرداخت موفق';
                const messageBody = `پرداخت شما با موفقیت انجام شد.

اطلاعات پرداخت:
- مبلغ: ${Math.round(Number(transaction.amount) / 10).toLocaleString('fa-IR')} تومان
- شماره تراکنش: ${transaction.orderId || 'N/A'}
- شماره پیگیری: ${transaction.saleReferenceId || 'N/A'}
- شماره کارت: ${transaction.cardHolderPan ? transaction.cardHolderPan.replace(/\d(?=\d{4})/g, '*') : 'N/A'}

لینک پرداخت: ${paymentLink.linkCode}
برای مشاهده جزئیات بیشتر به پنل کاربری خود مراجعه کنید.`;

                // Create in-app message
                await this.prisma.userMessage.create({
                  data: {
                    userId: transaction.userId,
                    messageId: await this.createPaymentSuccessMessage(messageTitle, messageBody, transaction.userId),
                  },
                });
              }
            } catch (messageError) {
              this.logger.error(`Failed to send success message: ${messageError.message}`);
              // Don't fail the payment because of message error
            }
          }
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
          // Enroll the user (skip invoice check since we just updated the invoice status)
          await this.coursesService.enrollUser({
            userId: transaction.userId,
            courseId: transaction.invoice.courseId,
          }, true); // Skip invoice check since we just updated it

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

    // Validate customer name (no numbers allowed - including Persian numerals)
    const noNumbersRegex = /^[^0-9\u0660-\u0669\u06F0-\u06F9]+$/;
    if (!noNumbersRegex.test(dto.customerName)) {
      throw new BadRequestException('نام و نام خانوادگی نمی‌تواند شامل عدد باشد');
    }

    const mobileRegex = /^09[0-9]{9}$/;
    if (!mobileRegex.test(dto.customerMobile)) {
      throw new BadRequestException('شماره موبایل باید با ۰۹ شروع شود و فقط شامل اعداد باشد (۱۱ رقم)');
    }

    const linkCode = `PL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const amountInRial = this.tomanToRial(dto.amount);

    const paymentLink = await this.prisma.paymentLink.create({
      data: {
        linkCode,
        createdById: userId,
        amount: new Decimal(amountInRial),
        customerName: dto.customerName,
        customerPhone: dto.customerMobile,
        description: dto.description,
        workshopTitle: dto.workshopTitle,
        isActive: true,
        status: 'PENDING',
        gatewayName: 'بانک پارسیان', // Default gateway
        requestTime: new Date(), // Time when link is created
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

    // Create invoice for payment link (amount in toman)
    const wallet = await this.walletService.getOrCreateWallet(customerUser.id);
    const invoice = await this.invoiceService.createInvoice({
      userId: customerUser.id,
      type: 'PAYMENT_LINK',
      amount: dto.amount, // Keep in toman for invoice
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
        // Convert rial back to toman for frontend display
        amount: new Decimal(Math.round(Number(paymentLink.amount) / 10)),
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

    if (paymentLink.expiresAt && paymentLink.expiresAt < new Date()) {
      throw new BadRequestException('این لینک پرداخت منقضی شده است');
    }

    return paymentLink;
  }

  async getPaymentLinkInvoice(linkCode: string, userId?: string) {
    const paymentLink = await this.getPaymentLinkByCode(linkCode);

    // Check if link is inactive
    if (!paymentLink.isActive) {
      return {
        isInactive: true,
        linkCode: paymentLink.linkCode,
        customerName: paymentLink.customerName,
      };
    }

    // If user is provided, use it; otherwise find by phone
    let customerUser = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : await this.prisma.user.findUnique({ where: { phone: paymentLink.customerPhone } });

    if (!customerUser) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    const amountInToman = Math.round(Number(paymentLink.amount) / 10); // Convert rial to toman

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
        amount: amountInToman, // Use toman amount for invoice
        paymentLinkId: paymentLink.id,
        customerName: paymentLink.customerName,
        customerPhone: paymentLink.customerPhone,
        description: paymentLink.description,
        walletId: wallet.id,
      });
    }

    // Check if payment is already initiated for this invoice
    let transaction = await this.prisma.transaction.findFirst({
      where: {
        invoiceId: invoice.id,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!transaction) {
      // Create new transaction and payment request
      const orderId = this.generateOrderId();

      transaction = await this.prisma.transaction.create({
        data: {
          userId: customerUser.id,
          invoiceId: invoice.id,
          paymentLinkId: paymentLink.id,
          type: 'PAYMENT',
          amount: new Decimal(amountInToman), // Use toman amount for transaction
          orderId,
          status: 'PENDING',
          description: paymentLink.description || 'پرداخت لینک',
          createdBySalesPersonId: paymentLink.createdById,
        },
      });

      // Create payment request - gateway expects rial amount
      const amountInRial = this.tomanToRial(amountInToman);
      const paymentRequest = await this.gatewayService.createPaymentRequest(
        orderId,
        amountInRial,
        paymentLink.description || 'پرداخت لینک',
      );

      // Update transaction with payment gateway details
      transaction = await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          refId: paymentRequest.refId,
          bpPayRequestRaw: paymentRequest.response,
          bpPayRequestDate: new Date(),
          status: 'PENDING',
        },
      });

      return {
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount), // Amount is already in toman
        description: invoice.description,
        customerName: invoice.customerName,
        workshopTitle: paymentLink.workshopTitle,
        createdAt: invoice.createdAt,
        paymentUrl: paymentRequest.paymentUrl,
        refId: paymentRequest.refId,
      };
    } else {
      // Use existing transaction details
      if (!transaction.refId) {
        throw new BadRequestException('تراکنش پرداخت کامل نیست');
      }

      // Get payment URL again (it should be stored or regenerated)
      const amountInRial = this.tomanToRial(amountInToman);
      const paymentRequest = await this.gatewayService.createPaymentRequest(
        transaction.orderId!,
        amountInRial,
        paymentLink.description || 'پرداخت لینک',
      );

      return {
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount), // Amount is already in toman
        description: invoice.description,
        customerName: invoice.customerName,
        createdAt: invoice.createdAt,
        paymentUrl: paymentRequest.paymentUrl,
        refId: transaction.refId,
      };
    }
  }

  async initiatePaymentLinkPayment(linkCode: string, userId?: string) {
    const paymentLink = await this.getPaymentLinkByCode(linkCode);

    // Check if link is inactive
    if (!paymentLink.isActive) {
      throw new BadRequestException('این لینک پرداخت غیرفعال است');
    }

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

  async getPaymentLinksReport(filters: {
    startDate?: string;
    endDate?: string;
    salesPersonId?: string;
    status?: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    userId?: string; // For sales manager filtering
    userRole?: string;
  }) {
    const where: any = {
      // Only payment link transactions
      paymentLinkId: { not: null },
    };

    // Date filtering
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    // Status filtering
    if (filters.status) {
      where.status = filters.status;
    }

    // Sales person filtering
    if (filters.userRole === 'SALES_MANAGER' && filters.userId) {
      where.createdBySalesPersonId = filters.userId;
    } else if (filters.salesPersonId) {
      where.createdBySalesPersonId = filters.salesPersonId;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        paymentLink: {
          include: {
            creator: {
              select: {
                firstName: true,
                lastName: true,
                username: true,
              }
            }
          }
        },
        invoice: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Convert to report format
    return transactions.map(transaction => ({
      gatewayName: transaction.paymentLink?.gatewayName || 'بانک پارسیان',
      customerPhone: transaction.paymentLink?.customerPhone || '',
      orderId: transaction.orderId || '',
      transactionDate: transaction.createdAt,
      requestTime: transaction.bpPayRequestDate || transaction.createdAt,
      amount: Math.round(Number(transaction.amount) / 10), // Convert rial to toman
      cardNumber: transaction.cardHolderPan || '',
      trackingNumber: transaction.saleReferenceId || '',
      status: transaction.status,
      description: transaction.description || '',
      salesPerson: transaction.paymentLink?.creator ?
        `${transaction.paymentLink.creator.firstName || ''} ${transaction.paymentLink.creator.lastName || ''}`.trim() ||
        transaction.paymentLink.creator.username : '',
    }));
  }

  private async createPaymentSuccessMessage(title: string, body: string, sentById: string): Promise<string> {
    const message = await this.prisma.message.create({
      data: {
        title,
        body,
        sendInApp: true,
        sendSms: false,
        status: 'SENT',
        totalRecipients: 1,
        sentById,
        createdAt: new Date(),
      },
    });
    return message.id;
  }

  async getPaymentReceipt(transactionId: string, user: any) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        paymentLink: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
              },
            },
            invoices: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('تراکنش یافت نشد');
    }

    // Get payment link separately
    const paymentLink = transaction.paymentLink;
    if (!paymentLink) {
      throw new NotFoundException('لینک پرداخت یافت نشد');
    }

    // Check if user has access to this receipt
    if (user.role !== 'ADMIN') {
      if (user.role === 'SALES_MANAGER') {
        // Check if the sales person who created the link is under this manager
        const salesPerson = await this.prisma.user.findUnique({
          where: { id: paymentLink.createdById },
          select: { parentId: true },
        });
        if (!salesPerson || salesPerson.parentId !== user.id) {
          throw new ForbiddenException('شما دسترسی به این رسید ندارید');
        }
      } else if (user.role === 'SALES_PERSON' && paymentLink.createdById !== user.id) {
        throw new ForbiddenException('شما دسترسی به این رسید ندارید');
      }
    }

    return {
      transaction: {
        id: transaction.id,
        orderId: transaction.orderId,
        status: transaction.status,
        cardNumber: transaction.cardHolderPan,
        trackingNumber: transaction.saleReferenceId,
        refId: transaction.refId,
        amount: Math.round(Number(transaction.amount) / 10), // toman
        amountRial: Number(transaction.amount), // rial
        transactionDate: transaction.createdAt,
        paidAt: transaction.verifyDate || transaction.createdAt,
        description: transaction.description,
      },
      paymentLink: {
        id: paymentLink.id,
        linkCode: paymentLink.linkCode,
        amount: Math.round(Number(paymentLink.amount) / 10), // toman
        amountRial: Number(paymentLink.amount), // rial
        customerName: paymentLink.customerName,
        customerPhone: paymentLink.customerPhone,
        description: paymentLink.description,
        workshopTitle: paymentLink.workshopTitle,
      },
      invoice: paymentLink.invoices && paymentLink.invoices.length > 0 ? {
        invoiceNumber: paymentLink.invoices[0].invoiceNumber,
        status: paymentLink.invoices[0].status,
        createdAt: paymentLink.invoices[0].createdAt,
      } : null,
      salesPerson: paymentLink.creator ? {
        id: paymentLink.creator.id,
        name: `${paymentLink.creator.firstName || ''} ${paymentLink.creator.lastName || ''}`.trim() || paymentLink.creator.username,
      } : null,
    };
  }

  async generatePaymentLinksExcelReport(reportData: any[]) {
    const ExcelJS = require('exceljs');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('گزارش واریزی‌ها');

    // Set RTL direction
    worksheet.views = [{ rightToLeft: true }];

    // Define columns
    worksheet.columns = [
      { header: 'بابت (نام درگاه)', key: 'gatewayName', width: 15 },
      { header: 'شماره همراه', key: 'customerPhone', width: 15 },
      { header: 'شماره درخواست', key: 'orderId', width: 20 },
      { header: 'تاریخ تراکنش', key: 'transactionDate', width: 20 },
      { header: 'زمان درخواست', key: 'requestTime', width: 20 },
      { header: 'مبلغ (تومان)', key: 'amount', width: 15 },
      { header: 'شماره کارت', key: 'cardNumber', width: 20 },
      { header: 'شماره پیگیری', key: 'trackingNumber', width: 20 },
      { header: 'وضعیت', key: 'status', width: 15 },
      { header: 'توضیحات', key: 'description', width: 30 },
      { header: 'کارشناس فروش', key: 'salesPerson', width: 20 },
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // Add data
    reportData.forEach(item => {
      worksheet.addRow({
        gatewayName: item.gatewayName,
        customerPhone: item.customerPhone,
        orderId: item.orderId,
        transactionDate: this.formatPersianDateTime(item.transactionDate),
        requestTime: this.formatPersianDateTime(item.requestTime),
        amount: item.amount.toLocaleString('fa-IR'),
        cardNumber: item.cardNumber,
        trackingNumber: item.trackingNumber,
        status: this.getStatusText(item.status),
        description: item.description,
        salesPerson: item.salesPerson,
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.width) {
        column.width = Math.max(column.width, 15);
      }
    });

    return await workbook.xlsx.writeBuffer();
  }

  private formatPersianDateTime(date: Date): string {
    // Simple Persian date formatting (you might want to use a proper Persian date library)
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Tehran'
    };

    return new Intl.DateTimeFormat('fa-IR', options).format(date);
  }

  private getStatusText(status: string): string {
    const statusMap = {
      'PENDING': 'در انتظار',
      'PAID': 'پرداخت شده',
      'FAILED': 'ناموفق',
      'CANCELLED': 'لغو شده'
    };
    return statusMap[status] || status;
  }
}

