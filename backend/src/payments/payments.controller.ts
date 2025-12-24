import {
  Controller,
  Post,
  Get,
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
  async getUserInvoices(@Req() req, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.invoiceService.getUserInvoices(req.user.id, limitNum);
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
          where: {
            status: 'PAID',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return links;
  }

  @Get('pay/:linkCode')
  @ApiOperation({ summary: 'پرداخت از طریق لینک' })
  @ApiParam({ name: 'linkCode', description: 'کد لینک پرداخت' })
  async payWithLink(@Param('linkCode') linkCode: string, @Query('userId') userId?: string) {
    return this.paymentsService.initiatePaymentLinkPayment(linkCode, userId);
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

