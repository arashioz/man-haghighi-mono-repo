import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.iranpayamak.com/ws/v1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('FARAZSMS_API_KEY', '');
    if (!this.apiKey) {
      this.logger.warn('⚠️  FARAZSMS_API_KEY is not set. SMS functionality will not work.');
    }
  }

  /**
   * Send OTP SMS using FarazSMS API
   * @param phoneNumber Phone number in format 09123456789
   * @param otpCode 6-digit OTP code
   * @returns Promise<boolean> true if sent successfully
   */
  async sendOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.error('FARAZSMS_API_KEY is not configured');
      throw new Error('SMS service is not configured');
    }

    try {
      // Format phone number (remove leading 0 if exists, add 98 prefix)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Create OTP message
      const message = `کد تایید شما: ${otpCode}\n\nاین کد تا 5 دقیقه معتبر است.`;

      // Send SMS using FarazSMS Simple SMS API
      const response = await fetch(`${this.apiUrl}/send/simple`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedPhone,
          message: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Failed to send SMS: ${response.status} - ${errorText}`);
        return false;
      }

      const result = await response.json();
      this.logger.log(`OTP SMS sent successfully to ${phoneNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending OTP SMS: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Format phone number for FarazSMS API
   * Expected format: 989123456789 (without leading 0)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove leading 0 if exists
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Add 98 prefix if not already present
    if (!cleaned.startsWith('98')) {
      cleaned = '98' + cleaned;
    }
    
    return cleaned;
  }
}

