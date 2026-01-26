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

  @Get('receipts/:transactionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_PERSON', 'SALES_MANAGER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'رسید کامل پرداخت (برای فروشندگان و مدیران)' })
  @ApiParam({ name: 'transactionId', description: 'شناسه تراکنش' })
  async getPaymentReceipt(
    @Param('transactionId') transactionId: string,
    @Req() req,
  ) {
    return this.paymentsService.getPaymentReceipt(transactionId, req.user);
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

  @Get('invoices/course-invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست فاکتورهای دوره‌ها (فقط ادمین)' })
  @ApiResponse({ status: 200, description: 'لیست فاکتورهای دوره‌ها' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'] })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async getAllCourseInvoices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED',
    @Query('userId') userId?: string,
  ) {
    const params: any = { type: 'COURSE_PURCHASE' };
    if (page) params.page = parseInt(page, 10);
    if (limit) params.limit = parseInt(limit, 10);
    if (status) params.status = status;
    if (userId) params.userId = userId;

    return this.invoiceService.getAllInvoices(params);
  }

  @Get('invoices/payment-links')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست فاکتورهای لینک‌های پرداخت (فقط ادمین)' })
  @ApiResponse({ status: 200, description: 'لیست فاکتورهای لینک‌های پرداخت' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'] })
  @ApiQuery({ name: 'salesPersonId', required: false, type: String })
  async getPaymentLinkInvoices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED',
    @Query('salesPersonId') salesPersonId?: string,
  ) {
    const params: any = { type: 'PAYMENT_LINK' };
    if (page) params.page = parseInt(page, 10);
    if (limit) params.limit = parseInt(limit, 10);
    if (status) params.status = status;
    if (salesPersonId) params.salesPersonId = salesPersonId;

    return this.invoiceService.getPaymentLinkInvoices(params);
  }

  @Get('customer-history/:phone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_PERSON', 'SALES_MANAGER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'سابقه پرداخت و کارگاه‌های مشتری' })
  @ApiResponse({ status: 200, description: 'سابقه مشتری' })
  @ApiParam({ name: 'phone', description: 'شماره موبایل مشتری' })
  async getCustomerPaymentHistory(@Param('phone') phone: string) {
    return this.paymentsService.getCustomerPaymentHistory(phone);
  }

  @Get('salespersons/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'آمار فروشندگان و لینک‌های پرداخت آنها (فقط ادمین)' })
  @ApiResponse({ status: 200, description: 'آمار فروشندگان' })
  async getSalesPersonsPaymentStats() {
    // Get all active sales persons
    const salesPersons = await this.prisma.user.findMany({
      where: {
        role: 'SALES_PERSON',
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });

    // Get statistics for each sales person
    const salesPersonsWithStats = await Promise.all(
      salesPersons.map(async (salesPerson) => {
        // Count total payment links created by this sales person
        const totalLinks = await this.prisma.paymentLink.count({
          where: { createdById: salesPerson.id },
        });

        // Count paid payment links
        const paidLinks = await this.prisma.paymentLink.count({
          where: {
            createdById: salesPerson.id,
            status: 'PAID',
          },
        });

        // Calculate total revenue from paid links
        const revenueResult = await this.prisma.paymentLink.aggregate({
          where: {
            createdById: salesPerson.id,
            status: 'PAID',
          },
          _sum: {
            amount: true,
          },
        });

        // Get recent activity (last link created)
        const lastLink = await this.prisma.paymentLink.findFirst({
          where: { createdById: salesPerson.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        // Get today's links
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayLinks = await this.prisma.paymentLink.count({
          where: {
            createdById: salesPerson.id,
            createdAt: { gte: today },
          },
        });

        return {
          salesPerson: {
            ...salesPerson,
            fullName: `${salesPerson.firstName || ''} ${salesPerson.lastName || ''}`.trim() || salesPerson.username,
          },
          statistics: {
            totalLinks,
            paidLinks,
            unpaidLinks: totalLinks - paidLinks,
            totalRevenue: revenueResult._sum.amount || 0, // This is in rial, will convert to toman in frontend
            conversionRate: totalLinks > 0 ? Math.round((paidLinks / totalLinks) * 100) : 0,
            todayLinks,
            lastActivity: lastLink?.createdAt?.toISOString() || null,
          },
        };
      })
    );

    // Sort by total revenue descending
    salesPersonsWithStats.sort((a, b) => Number(b.statistics.totalRevenue) - Number(a.statistics.totalRevenue));

    return {
      salesPersons: salesPersonsWithStats,
      summary: {
        totalSalesPersons: salesPersonsWithStats.length,
        totalLinks: salesPersonsWithStats.reduce((sum, sp) => sum + sp.statistics.totalLinks, 0),
        totalPaidLinks: salesPersonsWithStats.reduce((sum, sp) => sum + sp.statistics.paidLinks, 0),
        totalRevenue: salesPersonsWithStats.reduce((sum, sp) => sum + Number(sp.statistics.totalRevenue), 0),
        averageConversionRate: salesPersonsWithStats.length > 0
          ? Math.round(salesPersonsWithStats.reduce((sum, sp) => sum + sp.statistics.conversionRate, 0) / salesPersonsWithStats.length)
          : 0,
      },
    };
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
    if (req.user.role === 'SALES_MANAGER' || req.user.role === 'ADMIN') {
      return this.getAllSalesPersonsPaymentLinks(req);
    }

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

    return links.map(link => ({
      ...link,
      amount: Math.round(Number(link.amount) / 10),
    }));
  }

  private async getAllSalesPersonsPaymentLinks(req) {
    const salesPersons = await this.prisma.user.findMany({
      where: {
        role: 'SALES_PERSON',
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        isActive: true,
      },
    });

    // برای هر فروشنده، لینک‌های پرداخت و آمار را می‌گیریم
    const salesPersonsWithLinks = await Promise.all(
      salesPersons.map(async (salesPerson) => {
        // لینک‌های پرداخت فروشنده
        const links = await this.prisma.paymentLink.findMany({
          where: {
            createdById: salesPerson.id,
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

        const totalLinks = links?.length || 0;
        const paidLinks = links?.filter(link => link?.status === 'PAID')?.length || 0;
        const unpaidLinks = totalLinks - paidLinks;
        const totalAmount = links?.reduce((sum, link) => sum + Number(link?.amount || 0), 0) || 0;
        const paidAmount = links
          ?.filter(link => link?.status === 'PAID')
          ?.reduce((sum, link) => sum + Number(link?.amount || 0), 0) || 0;

        return {
          salesPerson: {
            ...salesPerson,
            fullName: `${salesPerson.firstName || ''} ${salesPerson.lastName || ''}`.trim() || salesPerson.username,
          },
          statistics: {
            totalLinks,
            paidLinks,
            unpaidLinks,
            totalAmount: Math.round(totalAmount / 10), // Convert to toman
            paidAmount: Math.round(paidAmount / 10), // Convert to toman
          },
          links: links.map(link => ({
            ...link,
            amount: Math.round(Number(link.amount) / 10), // Convert to toman
          })),
        };
      })
    );

    return {
      type: 'sales_manager_view',
      salesPersons: salesPersonsWithLinks || [],
      summary: {
        totalSalesPersons: salesPersonsWithLinks?.length || 0,
        totalLinks: salesPersonsWithLinks?.reduce((sum, sp) => sum + (sp?.statistics?.totalLinks || 0), 0) || 0,
        totalPaidLinks: salesPersonsWithLinks?.reduce((sum, sp) => sum + (sp?.statistics?.paidLinks || 0), 0) || 0,
        totalUnpaidLinks: salesPersonsWithLinks?.reduce((sum, sp) => sum + (sp?.statistics?.unpaidLinks || 0), 0) || 0,
        totalAmount: salesPersonsWithLinks?.reduce((sum, sp) => sum + (sp?.statistics?.totalAmount || 0), 0) || 0,
        totalPaidAmount: salesPersonsWithLinks?.reduce((sum, sp) => sum + (sp?.statistics?.paidAmount || 0), 0) || 0,
      },
    };
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

    // Convert rial amounts back to toman for frontend display
    return links.map(link => ({
      ...link,
      amount: Math.round(Number(link.amount) / 10),
    }));
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

      // Check if link is inactive
      if (invoiceData.isInactive) {
        const settings = await this.prisma.settings.findUnique({
          where: { id: 'settings' },
        });
        const supportPhone = settings?.sitePhone || '021-12345678';

        const disabledLinkHtml = `
          <!DOCTYPE html>
          <html dir="rtl" lang="fa">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>لینک غیرفعال - من حقیقی</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap');

              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }

              body {
                font-family: 'Vazirmatn', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background:
                  radial-gradient(circle at 20% 50%, rgba(244, 67, 54, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(255, 87, 34, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 40% 80%, rgba(255, 152, 0, 0.1) 0%, transparent 50%),
                  linear-gradient(135deg, #ffebee 0%, #fce4ec 100%);
                background-attachment: fixed;
                min-height: 100vh;
                padding: 20px;
                direction: rtl;
                position: relative;
              }

              body::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(244,67,54,0.03)"/><circle cx="75" cy="75" r="1" fill="rgba(244,67,54,0.03)"/><circle cx="50" cy="10" r="0.5" fill="rgba(244,67,54,0.02)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                pointer-events: none;
                z-index: -1;
              }

              .container {
                max-width: 500px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 24px;
                box-shadow:
                  0 25px 50px rgba(244, 67, 54, 0.15),
                  0 0 0 1px rgba(255,255,255,0.2),
                  inset 0 1px 0 rgba(255,255,255,0.3);
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.2);
                position: relative;
              }

              .container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #f44336, #ff5722, #ff9800, #e91e63);
                background-size: 300% 100%;
                animation: gradientShift 4s ease infinite;
              }

              @keyframes gradientShift {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
              }

              .header {
                background: linear-gradient(135deg, rgba(244, 67, 54, 0.9) 0%, rgba(255, 87, 34, 0.9) 100%);
                backdrop-filter: blur(10px);
                color: white;
                padding: 40px 30px;
                text-align: center;
                position: relative;
                overflow: hidden;
              }

              .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: shine 6s ease-in-out infinite;
              }

              @keyframes shine {
                0%, 100% { transform: rotate(0deg) translate(-50%, -50%); }
                50% { transform: rotate(180deg) translate(-50%, -50%); }
              }

              .logo {
                font-size: 2.8rem;
                font-weight: 800;
                margin-bottom: 15px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                background: linear-gradient(45deg, #ffffff, #ffebee, #ffffff);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                letter-spacing: 1px;
                position: relative;
              }

              .logo::after {
                content: '';
                position: absolute;
                bottom: -5px;
                left: 50%;
                transform: translateX(-50%);
                width: 60px;
                height: 3px;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
                border-radius: 2px;
              }

              .title {
                font-size: 1.3rem;
                opacity: 0.95;
                font-weight: 500;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2);
              }

              .content {
                padding: 40px 30px;
                text-align: center;
              }

              .warning-icon {
                font-size: 4rem;
                color: #f44336;
                margin-bottom: 20px;
                animation: shake 2s ease-in-out infinite;
              }

              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
              }

              .message {
                font-size: 1.2rem;
                color: #424242;
                margin-bottom: 30px;
                line-height: 1.6;
                font-weight: 500;
              }

              .support-section {
                background: rgba(244, 67, 54, 0.05);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                padding: 25px 20px;
                border-radius: 16px;
                margin: 25px 0;
                text-align: center;
                border: 1px solid rgba(244, 67, 54, 0.3);
                box-shadow:
                  0 8px 25px rgba(244, 67, 54, 0.1),
                  inset 0 1px 0 rgba(255,255,255,0.6);
                position: relative;
                overflow: hidden;
              }

              .support-section::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(244, 67, 54, 0.1), transparent);
                animation: shimmer 3s ease-in-out infinite;
              }

              @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
              }

              .support-title {
                font-size: 1.4rem;
                font-weight: 700;
                color: #d32f2f;
                margin-bottom: 15px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                position: relative;
                z-index: 1;
              }

              .support-text {
                font-size: 1rem;
                color: #666;
                margin-bottom: 15px;
                position: relative;
                z-index: 1;
              }

              .support-phone {
                font-size: 1.3rem;
                font-weight: 800;
                background: linear-gradient(135deg, #f44336 0%, #ff5722 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                text-shadow: 0 2px 4px rgba(244, 67, 54, 0.3);
                position: relative;
                z-index: 1;
                direction: ltr;
                display: inline-block;
              }

              .back-button {
                display: inline-block;
                background: linear-gradient(135deg, #f44336 0%, #ff5722 100%);
                background-size: 200% 200%;
                animation: gradientMove 3s ease infinite;
                color: white;
                border: none;
                padding: 15px 30px;
                font-size: 1rem;
                font-weight: 600;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                text-decoration: none;
                text-align: center;
                margin-top: 20px;
                box-shadow:
                  0 8px 25px rgba(244, 67, 54, 0.3),
                  0 0 0 1px rgba(255,255,255,0.2),
                  inset 0 1px 0 rgba(255,255,255,0.3);
                position: relative;
                overflow: hidden;
                letter-spacing: 1px;
              }

              .back-button::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                transition: left 0.5s;
              }

              .back-button:hover::before {
                left: 100%;
              }

              .back-button:hover {
                transform: translateY(-3px) scale(1.02);
                box-shadow:
                  0 15px 40px rgba(244, 67, 54, 0.4),
                  0 0 0 1px rgba(255,255,255,0.3),
                  inset 0 1px 0 rgba(255,255,255,0.4);
                animation-duration: 1.5s;
              }

              .back-button:active {
                transform: translateY(-1px) scale(1.01);
              }

              @keyframes gradientMove {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
              }

              .footer {
                background: rgba(248, 249, 250, 0.8);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                padding: 20px;
                text-align: center;
                border-top: 1px solid rgba(244, 67, 54, 0.2);
                position: relative;
                overflow: hidden;
              }

              .footer::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(244, 67, 54, 0.5), transparent);
              }

              @media (max-width: 768px) {
                body {
                  padding: 10px;
                }

                .container {
                  margin: 5px;
                  border-radius: 20px;
                }

                .header {
                  padding: 30px 20px;
                }

                .logo {
                  font-size: 2.2rem;
                }

                .title {
                  font-size: 1.1rem;
                }

                .content {
                  padding: 30px 20px;
                }

                .warning-icon {
                  font-size: 3rem;
                }

                .message {
                  font-size: 1.1rem;
                }

                .support-title {
                  font-size: 1.2rem;
                }

                .support-phone {
                  font-size: 1.2rem;
                }

                .back-button {
                  padding: 12px 25px;
                  font-size: 0.9rem;
                  margin-top: 15px;
                }
              }

              @media (max-width: 480px) {
                .logo {
                  font-size: 2rem;
                }

                .warning-icon {
                  font-size: 2.5rem;
                }

                .support-phone {
                  font-size: 1.1rem;
                }

                .back-button {
                  padding: 10px 20px;
                  font-size: 0.85rem;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">من حقیقی</div>
                <div class="title">لینک پرداخت</div>
              </div>

              <div class="content">
                <div class="warning-icon">⚠️</div>
                <div class="message">این لینک پرداخت غیرفعال شده است</div>

                <div class="support-section">
                  <div class="support-title">نیاز به کمک دارید؟</div>
                  <div class="support-text">برای دریافت پشتیبانی با شماره زیر تماس بگیرید:</div>
                  <div class="support-phone">${supportPhone}</div>
                </div>

                <a href="https://manehaghighi.com" class="back-button">بازگشت به سایت</a>
              </div>

              <div class="footer">
                <div>© ۲۰۲۴ من حقیقی - تمامی حقوق محفوظ است</div>
              </div>
            </div>
          </body>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(disabledLinkHtml);
      }

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
            @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap');

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Vazirmatn', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background:
                radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(120, 219, 226, 0.3) 0%, transparent 50%),
                linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              background-attachment: fixed;
              min-height: 100vh;
              padding: 20px;
              direction: rtl;
              position: relative;
            }

            body::before {
              content: '';
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.03)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.03)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.02)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
              pointer-events: none;
              z-index: -1;
            }

            .container {
              max-width: 650px;
              margin: 0 auto;
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border-radius: 24px;
              box-shadow:
                0 25px 50px rgba(0,0,0,0.15),
                0 0 0 1px rgba(255,255,255,0.2),
                inset 0 1px 0 rgba(255,255,255,0.3);
              overflow: hidden;
              border: 1px solid rgba(255,255,255,0.2);
              position: relative;
            }

            .container::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(90deg, #667eea, #764ba2, #f093fb, #f5576c);
              background-size: 300% 100%;
              animation: gradientShift 4s ease infinite;
            }

            @keyframes gradientShift {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }

            .header {
              background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
              backdrop-filter: blur(10px);
              color: white;
              padding: 40px 30px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }

            .header::before {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              animation: shine 6s ease-in-out infinite;
            }

            @keyframes shine {
              0%, 100% { transform: rotate(0deg) translate(-50%, -50%); }
              50% { transform: rotate(180deg) translate(-50%, -50%); }
            }

            .logo {
              font-size: 2.8rem;
              font-weight: 800;
              margin-bottom: 15px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.3);
              background: linear-gradient(45deg, #ffffff, #e8f4fd, #ffffff);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              letter-spacing: 1px;
              position: relative;
            }

            .logo::after {
              content: '';
              position: absolute;
              bottom: -5px;
              left: 50%;
              transform: translateX(-50%);
              width: 60px;
              height: 3px;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
              border-radius: 2px;
            }

            .title {
              font-size: 1.3rem;
              opacity: 0.95;
              font-weight: 500;
              text-shadow: 0 1px 2px rgba(0,0,0,0.2);
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
              background: rgba(248, 249, 250, 0.9);
              backdrop-filter: blur(15px);
              -webkit-backdrop-filter: blur(15px);
              padding: 30px 25px;
              border-radius: 20px;
              margin: 25px 0;
              text-align: center;
              border: 2px solid rgba(102, 126, 234, 0.4);
              box-shadow:
                0 12px 35px rgba(102, 126, 234, 0.15),
                inset 0 1px 0 rgba(255,255,255,0.8),
                0 0 0 1px rgba(102, 126, 234, 0.1);
              position: relative;
              overflow: hidden;
            }

            .amount-highlight::before {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: conic-gradient(from 0deg, transparent, rgba(102, 126, 234, 0.1), transparent);
              animation: rotate 8s linear infinite;
              z-index: 0;
            }

            @keyframes rotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            .amount-label {
              font-size: 1rem;
              color: #5c6bc0;
              margin-bottom: 10px;
              font-weight: 500;
              position: relative;
              z-index: 1;
            }

            .amount-value {
              font-size: 2.5rem;
              font-weight: 800;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              text-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
              position: relative;
              z-index: 1;
            }

            .workshop-info {
              background: rgba(227, 242, 253, 0.8);
              backdrop-filter: blur(15px);
              -webkit-backdrop-filter: blur(15px);
              padding: 25px 20px;
              border-radius: 16px;
              margin: 25px 0;
              text-align: center;
              border: 1px solid rgba(33, 150, 243, 0.3);
              box-shadow:
                0 8px 25px rgba(33, 150, 243, 0.1),
                inset 0 1px 0 rgba(255,255,255,0.6);
              position: relative;
              overflow: hidden;
            }

            .workshop-info::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(33, 150, 243, 0.1), transparent);
              animation: shimmer 3s ease-in-out infinite;
            }

            @keyframes shimmer {
              0% { left: -100%; }
              100% { left: 100%; }
            }

            .workshop-title {
              font-size: 1.6rem;
              font-weight: 700;
              color: #1565c0;
              margin-bottom: 8px;
              text-shadow: 0 1px 2px rgba(0,0,0,0.1);
              position: relative;
              z-index: 1;
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
              background-size: 200% 200%;
              animation: gradientMove 3s ease infinite;
              color: white;
              border: none;
              padding: 20px 25px;
              font-size: 1.3rem;
              font-weight: 700;
              border-radius: 16px;
              cursor: pointer;
              transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
              text-decoration: none;
              text-align: center;
              margin-top: 35px;
              box-shadow:
                0 8px 25px rgba(102, 126, 234, 0.3),
                0 0 0 1px rgba(255,255,255,0.2),
                inset 0 1px 0 rgba(255,255,255,0.3);
              position: relative;
              overflow: hidden;
              letter-spacing: 1px;
            }

            .pay-button::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
              transition: left 0.5s;
            }

            .pay-button:hover::before {
              left: 100%;
            }

            .pay-button:hover {
              transform: translateY(-3px) scale(1.02);
              box-shadow:
                0 15px 40px rgba(102, 126, 234, 0.4),
                0 0 0 1px rgba(255,255,255,0.3),
                inset 0 1px 0 rgba(255,255,255,0.4);
              animation-duration: 1.5s;
            }

            .pay-button:active {
              transform: translateY(-1px) scale(1.01);
            }

            @keyframes gradientMove {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }

            .footer {
              background: rgba(248, 249, 250, 0.8);
              backdrop-filter: blur(15px);
              -webkit-backdrop-filter: blur(15px);
              padding: 30px 25px;
              text-align: center;
              border-top: 1px solid rgba(102, 126, 234, 0.2);
              position: relative;
              overflow: hidden;
            }

            .footer::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 1px;
              background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.5), transparent);
            }

            .security-badges {
              display: flex;
              justify-content: center;
              gap: 20px;
              margin-bottom: 20px;
              flex-wrap: wrap;
            }

            .badge {
              background: rgba(255, 255, 255, 0.9);
              backdrop-filter: blur(10px);
              padding: 12px 18px;
              border-radius: 12px;
              box-shadow:
                0 4px 15px rgba(0,0,0,0.1),
                0 0 0 1px rgba(102, 126, 234, 0.1),
                inset 0 1px 0 rgba(255,255,255,0.8);
              font-size: 0.85rem;
              color: #424242;
              font-weight: 500;
              transition: all 0.3s ease;
              border: 1px solid rgba(102, 126, 234, 0.2);
            }

            .badge:hover {
              transform: translateY(-2px);
              box-shadow:
                0 8px 25px rgba(102, 126, 234, 0.2),
                0 0 0 1px rgba(102, 126, 234, 0.2),
                inset 0 1px 0 rgba(255,255,255,0.9);
            }

            .contact-info {
              font-size: 1rem;
              color: #616161;
              font-weight: 500;
              margin-top: 15px;
              padding: 15px 20px;
              background: rgba(102, 126, 234, 0.05);
              border-radius: 12px;
              border: 1px solid rgba(102, 126, 234, 0.1);
              display: inline-block;
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
              body {
                padding: 10px;
              }

              .container {
                margin: 5px;
                border-radius: 20px;
              }

              .header {
                padding: 30px 20px;
              }

              .logo {
                font-size: 2.2rem;
              }

              .title {
                font-size: 1.1rem;
              }

              .invoice-content {
                padding: 25px 15px;
              }

              .workshop-title {
                font-size: 1.4rem;
              }

              .amount-value {
                font-size: 2.2rem;
              }

              .pay-button {
                padding: 18px 20px;
                font-size: 1.1rem;
                margin-top: 25px;
              }

              .security-badges {
                gap: 10px;
              }

              .badge {
                padding: 10px 15px;
                font-size: 0.8rem;
              }

              .contact-info {
                font-size: 0.9rem;
                padding: 12px 18px;
              }
            }

            @media (max-width: 480px) {
              .logo {
                font-size: 2rem;
              }

              .amount-value {
                font-size: 2rem;
              }

              .workshop-title {
                font-size: 1.3rem;
              }

              .badge {
                padding: 8px 12px;
                font-size: 0.75rem;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">من حقیقی</div>
              <div class="title">پیش فاکتور پرداخت</div>
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

  @Get('reports/payment-links')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_MANAGER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'گزارش واریزی‌های لینک‌های پرداخت' })
  @ApiQuery({ name: 'startDate', required: false, description: 'تاریخ شروع (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'تاریخ پایان (ISO string)' })
  @ApiQuery({ name: 'salesPersonId', required: false, description: 'شناسه کارشناس فروش' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'], description: 'وضعیت پرداخت' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'excel'], description: 'فرمت خروجی' })
  async getPaymentLinksReport(
    @Req() req,
    @Res() res,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('salesPersonId') salesPersonId?: string,
    @Query('status') status?: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED',
    @Query('format') format?: 'json' | 'excel'
  ) {
    const reportData = await this.paymentsService.getPaymentLinksReport({
      startDate,
      endDate,
      salesPersonId,
      status,
      userId: req.user.role === 'SALES_MANAGER' ? req.user.id : undefined,
      userRole: req.user.role
    });

    if (format === 'excel') {
      const excelBuffer = await this.paymentsService.generatePaymentLinksExcelReport(reportData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=payment-links-report.xlsx');
      return res.send(excelBuffer);
    }

    return res.json(reportData);
  }

  @Get('team/links')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment links created by team members (for sales managers)' })
  @ApiResponse({ status: 200, description: 'Team payment links retrieved successfully' })
  async getTeamPaymentLinks(@Req() req) {
    // Get all sellers under this manager
    const sellers = await this.prisma.user.findMany({
      where: {
        role: 'SALES_PERSON',
        parentId: req.user.id,
      },
      select: { id: true, firstName: true, lastName: true },
    });

    const sellerIds = sellers.map(s => s.id);

    if (sellerIds.length === 0) {
      return [];
    }

    const links = await this.prisma.paymentLink.findMany({
      where: {
        createdById: { in: sellerIds },
      },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
          },
        },
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
      take: 50, // Limit for mobile performance
    });

    return links.map(link => ({
      ...link,
      sellerName: `${link.creator.firstName || ''} ${link.creator.lastName || ''}`.trim() || link.creator.username,
      amount: Math.round(Number(link.amount) / 10), // Convert to toman
    }));
  }
}

