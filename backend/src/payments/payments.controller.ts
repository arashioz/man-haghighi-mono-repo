import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { WalletService } from './wallet.service';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { Response } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private walletService: WalletService,
    private invoiceService: InvoiceService,
    private prisma: PrismaService,
  ) {}

  @Post('course/:courseId/initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'شروع پرداخت دوره' })
  @ApiResponse({ status: 200, description: 'درخواست پرداخت ایجاد شد' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'courseId', description: 'شناسه دوره' })
  async initiateCoursePayment(@Param('courseId') courseId: string, @Req() req) {
    return this.paymentsService.initiateCoursePayment(req.user.id, courseId);
  }

  // Legacy/compat path kept for current clients sending POST /payments/course/:courseId
  @Post('course/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'شروع پرداخت دوره (مسیر قدیمی بدون /initiate)' })
  @ApiParam({ name: 'courseId', description: 'شناسه دوره' })
  async initiateCoursePaymentLegacy(@Param('courseId') courseId: string, @Req() req) {
    return this.paymentsService.initiateCoursePayment(req.user.id, courseId);
  }

  @Post('wallet/charge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'شارژ کیف پول' })
  @ApiResponse({ status: 200, description: 'درخواست شارژ ایجاد شد' })
  async chargeWallet(@Body() dto: InitiatePaymentDto, @Req() req) {
    return this.paymentsService.chargeWallet(
      req.user.id,
      dto.amount,
      dto.description,
    );
  }

  @Get('callback')
  @ApiOperation({ summary: 'Callback درگاه پرداخت (GET)' })
  @ApiQuery({ name: 'ResCode', required: false })
  @ApiQuery({ name: 'SaleOrderId', required: false })
  @ApiQuery({ name: 'SaleReferenceId', required: false })
  @ApiQuery({ name: 'RefId', required: false })
  @ApiQuery({ name: 'CardHolderPan', required: false })
  async paymentCallbackGet(@Query() query: any, @Res() res: Response) {
    return this.handlePaymentCallback(query, res);
  }

  @Post('callback')
  @ApiOperation({ summary: 'Callback درگاه پرداخت (POST)' })
  async paymentCallbackPost(@Body() body: any, @Res() res: Response) {
    return this.handlePaymentCallback(body, res);
  }

  @Get('transactions/:transactionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جزئیات تراکنش کاربر (برای نمایش پس از پرداخت)' })
  @ApiParam({ name: 'transactionId', description: 'شناسه تراکنش' })
  async getTransaction(
    @Param('transactionId') transactionId: string,
    @Req() req,
  ) {
    return this.paymentsService.getTransactionForUser(req.user, transactionId);
  }

  private async handlePaymentCallback(callbackData: any, res: Response) {
    try {
      const result = await this.paymentsService.processPaymentCallback(callbackData);

      if (result.success) {
        const redirectUrl = `https://manehaghighi.com/payment/success?transactionId=${result.transaction.id}`;
        return res.redirect(redirectUrl);
      }

      const redirectUrl = `https://manehaghighi.com/payment/error?error=${encodeURIComponent(result.error)}`;
      return res.redirect(redirectUrl);
    } catch (error: any) {
      const redirectUrl = `https://manehaghighi.com/payment/error?error=${encodeURIComponent(error.message)}`;
      return res.redirect(redirectUrl);
    }
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست فاکتورهای کاربر' })
  @ApiResponse({ status: 200, description: 'لیست فاکتورها' })
  async getUserInvoices(@Req() req, @Query('limit') limit?: string, @Query('userId') userId?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    // اگر userId در query باشد و کاربر ادمین یا مدیر فروش باشد، از آن استفاده کن
    const targetUserId = (userId && (req.user.role === 'ADMIN' || req.user.role === 'SALES_MANAGER')) ? userId : req.user.id;
    return this.invoiceService.getUserInvoices(targetUserId, limitNum);
  }

  @Get('invoices/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست تمام فاکتورها (فقط ادمین)' })
  @ApiResponse({ status: 200, description: 'لیست تمام فاکتورها' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'] })
  @ApiQuery({ name: 'type', required: false, enum: ['COURSE_PURCHASE', 'WALLET_CHARGE', 'PAYMENT_LINK'] })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async getAllInvoices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED',
    @Query('type') type?: 'COURSE_PURCHASE' | 'WALLET_CHARGE' | 'PAYMENT_LINK',
    @Query('userId') userId?: string,
  ) {
    const params: any = {};
    if (page) params.page = parseInt(page, 10);
    if (limit) params.limit = parseInt(limit, 10);
    if (status) params.status = status;
    if (type) params.type = type;
    if (userId) params.userId = userId;
    
    return this.invoiceService.getAllInvoices(params);
  }

  @Get('invoices/:invoiceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جزئیات فاکتور' })
  @ApiParam({ name: 'invoiceId', description: 'شناسه فاکتور' })
  async getInvoice(@Param('invoiceId') invoiceId: string, @Req() req) {
    const invoice = await this.invoiceService.getInvoiceById(invoiceId);
    
    // Check if invoice belongs to user or user is admin
    if (invoice.userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new Error('دسترسی غیرمجاز');
    }

    return invoice;
  }

  @Get('wallet/balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'موجودی کیف پول' })
  @ApiResponse({ status: 200, description: 'موجودی کیف پول' })
  async getWalletBalance(@Req() req) {
    const balance = await this.walletService.getWalletBalance(req.user.id);
    return { balance };
  }

  @Get('wallet/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تاریخچه تراکنش‌های کیف پول' })
  @ApiResponse({ status: 200, description: 'تاریخچه تراکنش‌ها' })
  async getWalletTransactions(@Req() req, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.walletService.getWalletTransactions(req.user.id, limitNum);
  }

  @Post('links')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_PERSON', 'SALES_MANAGER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ایجاد لینک پرداخت (فقط برای کارشناسان فروش)' })
  @ApiResponse({ status: 201, description: 'لینک پرداخت ایجاد شد' })
  async createPaymentLink(@Body() dto: CreatePaymentLinkDto, @Req() req) {
    return this.paymentsService.createPaymentLink(req.user.id, dto);
  }

  @Get('links')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_PERSON', 'SALES_MANAGER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست لینک‌های پرداخت' })
  async getPaymentLinks(@Req() req) {
    const links = await this.prisma.paymentLink.findMany({
      where: {
        createdById: req.user.id,
      },
      include: {
        invoices: {
          include: {
            transactions: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return links;
  }

  @Get('links/customer/:phone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_PERSON', 'SALES_MANAGER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست لینک‌های پرداخت یک مشتری' })
  @ApiParam({ name: 'phone', description: 'شماره موبایل مشتری' })
  async getCustomerPaymentLinks(@Param('phone') phone: string, @Req() req) {
    const links = await this.prisma.paymentLink.findMany({
      where: {
        customerPhone: phone,
        createdById: req.user.id,
      },
      include: {
        invoices: {
          include: {
            transactions: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return links;
  }

  @Patch('links/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_PERSON', 'SALES_MANAGER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'فعال/غیرفعال کردن لینک پرداخت' })
  @ApiParam({ name: 'id', description: 'شناسه لینک پرداخت' })
  async togglePaymentLink(@Param('id') id: string, @Req() req) {
    const link = await this.prisma.paymentLink.findUnique({
      where: { id },
    });

    if (!link) {
      throw new Error('لینک پرداخت یافت نشد');
    }

    if (link.createdById !== req.user.id && req.user.role !== 'ADMIN') {
      throw new Error('دسترسی غیرمجاز');
    }

    const updated = await this.prisma.paymentLink.update({
      where: { id },
      data: {
        isActive: !link.isActive,
      },
    });

    return updated;
  }

  @Get('pay/:linkCode')
  @ApiOperation({ summary: 'نمایش صفحه فاکتور پرداخت' })
  @ApiParam({ name: 'linkCode', description: 'کد لینک پرداخت' })
  async showPaymentInvoice(
    @Param('linkCode') linkCode: string,
    @Query('userId') userId: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const invoiceData = await this.paymentsService.getPaymentLinkInvoice(linkCode, userId);

      // Return HTML invoice page
      const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="fa">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>فاکتور پرداخت - ${invoiceData.invoiceNumber}</title>
          <meta name="description" content="فاکتور پرداخت ${invoiceData.description || 'لینک پرداخت'}">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              min-height: 100vh;
              padding: 20px;
              direction: rtl;
            }

            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              overflow: hidden;
            }

            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }

            .logo {
              font-size: 2rem;
              font-weight: bold;
              margin-bottom: 10px;
            }

            .title {
              font-size: 1.5rem;
              opacity: 0.9;
            }

            .invoice-content {
              padding: 30px 20px;
            }

            .invoice-details {
              margin-bottom: 30px;
            }

            .detail-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 0;
              border-bottom: 1px solid #eee;
            }

            .detail-row:last-child {
              border-bottom: none;
            }

            .detail-label {
              font-weight: 500;
              color: #666;
            }

            .detail-value {
              font-weight: 600;
              color: #333;
            }

            .amount-highlight {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: center;
              border: 2px solid #667eea;
            }

            .amount-label {
              font-size: 0.9rem;
              color: #666;
              margin-bottom: 5px;
            }

            .amount-value {
              font-size: 2rem;
              font-weight: bold;
              color: #667eea;
            }

            .workshop-info {
              background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: center;
              border: 2px solid #2196f3;
            }

            .workshop-title {
              font-size: 1.4rem;
              font-weight: bold;
              color: #1976d2;
              margin-bottom: 5px;
            }

            .description {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              border-right: 4px solid #667eea;
            }

            .description-label {
              font-weight: 600;
              color: #333;
              margin-bottom: 8px;
            }

            .description-text {
              color: #666;
              line-height: 1.6;
            }

            .pay-button {
              display: block;
              width: 100%;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 18px;
              font-size: 1.2rem;
              font-weight: bold;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.3s ease;
              text-decoration: none;
              text-align: center;
              margin-top: 30px;
            }

            .pay-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }

            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              border-top: 1px solid #eee;
            }

            .security-badges {
              display: flex;
              justify-content: center;
              gap: 15px;
              margin-bottom: 15px;
            }

            .badge {
              background: white;
              padding: 8px 12px;
              border-radius: 6px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              font-size: 0.8rem;
              color: #666;
            }

            .contact-info {
              font-size: 0.9rem;
              color: #666;
            }

            .error-container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
              margin: 0 auto;
            }

            .error-icon {
              font-size: 3rem;
              color: #e74c3c;
              margin-bottom: 20px;
            }

            .error-title {
              color: #e74c3c;
              font-size: 1.5rem;
              margin-bottom: 10px;
            }

            .error-message {
              color: #666;
              line-height: 1.6;
            }

            @media (max-width: 768px) {
              .container {
                margin: 10px;
              }

              .header {
                padding: 20px;
              }

              .invoice-content {
                padding: 20px;
              }

              .security-badges {
                flex-direction: column;
                gap: 8px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">مانه‌حقوقی</div>
              <div class="title">فاکتور پرداخت</div>
            </div>

            <div class="invoice-content">
              <div class="invoice-details">
                <div class="detail-row">
                  <span class="detail-label">شماره فاکتور:</span>
                  <span class="detail-value">${invoiceData.invoiceNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">تاریخ صدور:</span>
                  <span class="detail-value">${new Date(invoiceData.createdAt).toLocaleDateString('fa-IR')}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">مشتری:</span>
                  <span class="detail-value">${invoiceData.customerName || 'مشتری'}</span>
                </div>
              </div>

              ${invoiceData.workshopTitle ? `
              <div class="workshop-info">
                <div class="workshop-title">🏢 ${invoiceData.workshopTitle}</div>
              </div>
              ` : ''}

              <div class="amount-highlight">
                <div class="amount-label">مبلغ قابل پرداخت</div>
                <div class="amount-value">${Number(invoiceData.amount).toLocaleString('fa-IR')} تومان</div>
              </div>

              ${invoiceData.description ? `
              <div class="description">
                <div class="description-label">توضیحات:</div>
                <div class="description-text">${invoiceData.description}</div>
              </div>
              ` : ''}

              <button class="pay-button" onclick="initiatePayment()">
                پرداخت آنلاین
              </button>
            </div>

            <div class="footer">
              <div class="security-badges">
                <div class="badge">🔒 پرداخت امن</div>
                <div class="badge">✅ پشتیبانی 24 ساعته</div>
                <div class="badge">💳 تمامی کارت‌ها</div>
              </div>
              <div class="contact-info">
                برای پشتیبانی با ما تماس بگیرید: ۰۲۱-۱۲۳۴۵۶۷۸
              </div>
            </div>
          </div>

          <form id="paymentForm" method="post" action="${invoiceData.paymentUrl}" style="display: none;">
            <input type="hidden" name="RefId" value="${invoiceData.refId}" />
          </form>

          <script>
            function initiatePayment() {
              // Show loading state
              const button = document.querySelector('.pay-button');
              button.innerHTML = 'در حال انتقال به درگاه...';
              button.disabled = true;

              // Submit the form after a brief delay
              setTimeout(() => {
                document.getElementById('paymentForm').submit();
              }, 500);
            }
          </script>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error: any) {
      const errorHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="fa">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>خطا - لینک پرداخت نامعتبر</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              direction: rtl;
            }

            .error-container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
              width: 100%;
            }

            .error-icon {
              font-size: 4rem;
              color: #e74c3c;
              margin-bottom: 20px;
            }

            .error-title {
              color: #e74c3c;
              font-size: 1.8rem;
              margin-bottom: 15px;
              font-weight: bold;
            }

            .error-message {
              color: #666;
              line-height: 1.6;
              margin-bottom: 25px;
            }

            .back-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 12px 30px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 500;
              transition: all 0.3s ease;
            }

            .back-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <div class="error-icon">❌</div>
            <h1 class="error-title">لینک پرداخت نامعتبر</h1>
            <p class="error-message">${error.message || 'این لینک پرداخت وجود ندارد یا منقضی شده است.'}</p>
            <a href="https://manehaghighi.com" class="back-button">بازگشت به سایت</a>
          </div>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(400).send(errorHtml);
    }
  }

  @Get('course/:courseId/invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست فاکتورهای یک دوره (فقط ادمین)' })
  @ApiParam({ name: 'courseId', description: 'شناسه دوره' })
  async getCourseInvoices(@Param('courseId') courseId: string) {
    return this.invoiceService.getCourseInvoices(courseId);
  }
}

