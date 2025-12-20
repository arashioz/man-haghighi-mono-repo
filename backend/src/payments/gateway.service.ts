import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as soap from 'soap';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);
  private readonly wsdlUrl = 'https://bpm.shaparak.ir/pgwchannel/services/pgw?wsdl';
  private readonly startPayUrl = 'https://bpm.shaparak.ir/pgwchannel/startpay.mellat';
  private readonly siteUrl = 'https://manehaghighi.com';

  constructor(
    private configService: ConfigService,
  ) {}

  private getGatewaySettings() {
    const terminalId = this.configService.get<string>('GATEWAY_TERMINAL_ID');
    const userName = this.configService.get<string>('GATEWAY_USERNAME');
    const userPassword = this.configService.get<string>('GATEWAY_PASSWORD');
    const mode = this.configService.get<string>('GATEWAY_MODE', 'test');
    const callbackUrl = this.configService.get<string>('GATEWAY_CALLBACK_URL') || `${this.siteUrl}/api/payments/callback`;
    const autoVerify = this.configService.get<string>('GATEWAY_AUTO_VERIFY', 'true') === 'true';
    const autoSettle = this.configService.get<string>('GATEWAY_AUTO_SETTLE', 'true') === 'true';

    if (!terminalId || !userName || !userPassword) {
      throw new BadRequestException('تنظیمات درگاه ناقص است. لطفاً GATEWAY_TERMINAL_ID، GATEWAY_USERNAME و GATEWAY_PASSWORD را در فایل .env تنظیم کنید.');
    }

    return {
      terminalId: parseInt(terminalId, 10),
      userName,
      userPassword,
      mode,
      callbackUrl,
      autoVerify,
      autoSettle,
    };
  }

  async createPaymentRequest(orderId: string, amount: number, description?: string) {
    try {
      const gatewaySettings = this.getGatewaySettings();
      
      const localDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const localTime = new Date().toTimeString().slice(0, 8).replace(/:/g, '');

      const params = {
        terminalId: gatewaySettings.terminalId,
        userName: gatewaySettings.userName,
        userPassword: gatewaySettings.userPassword,
        orderId: parseInt(orderId, 10),
        amount: amount,
        localDate: localDate,
        localTime: localTime,
        additionalData: description || '',
        callBackUrl: gatewaySettings.callbackUrl,
        payerId: 0,
      };

      this.logger.log(`Creating payment request for order ${orderId}, amount: ${amount}`);

      const client = await soap.createClientAsync(this.wsdlUrl, {
        disableCache: true,
        timeout: 30000,
      } as any);

      const result: any = await client.bpPayRequestAsync(params);
      const responseStr = result?.[0]?.return || result?.return || '';
      
      this.logger.log(`Payment request response: ${responseStr}`);

      const parts = responseStr.split(',');
      const resCode = parts[0]?.trim() || '';
      const refId = parts[1]?.trim() || '';

      if (resCode === '0' && refId) {
        return {
          success: true,
          refId,
          paymentUrl: this.startPayUrl,
          response: responseStr,
        };
      } else {
        throw new BadRequestException(`خطا در درخواست پرداخت. کد: ${resCode}`);
      }
    } catch (error) {
      this.logger.error(`Error creating payment request: ${error.message}`, error.stack);
      throw new BadRequestException(`خطا در تماس با درگاه: ${error.message}`);
    }
  }

  async verifyPayment(orderId: string, saleOrderId: string, saleReferenceId: string) {
    try {
      const gatewaySettings = this.getGatewaySettings();

      const params = {
        terminalId: gatewaySettings.terminalId,
        userName: gatewaySettings.userName,
        userPassword: gatewaySettings.userPassword,
        orderId: parseInt(orderId, 10),
        saleOrderId: parseInt(saleOrderId, 10),
        saleReferenceId: parseInt(saleReferenceId, 10),
      };

      this.logger.log(`Verifying payment for order ${orderId}`);

      const client = await soap.createClientAsync(this.wsdlUrl, {
        disableCache: true,
        timeout: 30000,
      } as any);

      const result: any = await client.bpVerifyRequestAsync(params);
      const responseStr = result?.[0]?.return || result?.return || '';
      const verifyCode = (responseStr || '').toString().trim();

      this.logger.log(`Verify response: ${verifyCode}`);

      if (verifyCode === '0') {
        return {
          success: true,
          response: verifyCode,
        };
      } else {
        // If verification fails, try reversal
        await this.reversePayment(orderId, saleOrderId, saleReferenceId);
        throw new BadRequestException(`خطا در تایید پرداخت. کد: ${verifyCode}`);
      }
    } catch (error) {
      this.logger.error(`Error verifying payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async settlePayment(orderId: string, saleOrderId: string, saleReferenceId: string) {
    try {
      const gatewaySettings = this.getGatewaySettings();

      // For settle, orderId should be saleOrderId + '1'
      const settleOrderId = parseInt(saleOrderId + '1', 10);

      const params = {
        terminalId: gatewaySettings.terminalId,
        userName: gatewaySettings.userName,
        userPassword: gatewaySettings.userPassword,
        orderId: settleOrderId,
        saleOrderId: parseInt(saleOrderId, 10),
        saleReferenceId: parseInt(saleReferenceId, 10),
      };

      this.logger.log(`Settling payment for order ${orderId}`);

      const client = await soap.createClientAsync(this.wsdlUrl, {
        disableCache: true,
        timeout: 30000,
      } as any);

      const result: any = await client.bpSettleRequestAsync(params);
      const responseStr = result?.[0]?.return || result?.return || '';
      const settleCode = (responseStr || '').toString().trim();

      this.logger.log(`Settle response: ${settleCode}`);

      if (settleCode === '0') {
        return {
          success: true,
          response: settleCode,
        };
      } else {
        throw new BadRequestException(`خطا در تسویه پرداخت. کد: ${settleCode}`);
      }
    } catch (error) {
      this.logger.error(`Error settling payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async reversePayment(orderId: string, saleOrderId: string, saleReferenceId: string) {
    try {
      const gatewaySettings = this.getGatewaySettings();

      // For reversal, orderId should be saleOrderId + '2'
      const reversalOrderId = parseInt(saleOrderId + '2', 10);

      const params = {
        terminalId: gatewaySettings.terminalId,
        userName: gatewaySettings.userName,
        userPassword: gatewaySettings.userPassword,
        orderId: reversalOrderId,
        saleOrderId: parseInt(saleOrderId, 10),
        saleReferenceId: parseInt(saleReferenceId, 10),
      };

      this.logger.log(`Reversing payment for order ${orderId}`);

      const client = await soap.createClientAsync(this.wsdlUrl, {
        disableCache: true,
        timeout: 30000,
      } as any);

      const result: any = await client.bpReversalRequestAsync(params);
      const responseStr = result?.[0]?.return || result?.return || '';
      
      this.logger.log(`Reversal response: ${responseStr}`);

      return {
        success: true,
        response: responseStr,
      };
    } catch (error) {
      this.logger.error(`Error reversing payment: ${error.message}`, error.stack);
      // Don't throw error for reversal, just log it
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

