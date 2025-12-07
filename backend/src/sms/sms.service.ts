import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly lineNumber: string;
  private readonly patternCode: string;
  private readonly apiUrl = 'https://api.iranpayamak.com/ws/v1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('IRANPAYAMAK_API_KEY', '');
    this.lineNumber = this.configService.get<string>('IRANPAYAMAK_LINE_NUMBER', '');
    this.patternCode = this.configService.get<string>('IRANPAYAMAK_PATTERN_CODE', '');
    
    if (!this.apiKey || !this.lineNumber || !this.patternCode) {
      this.logger.warn('⚠️  IranPayamak SMS credentials are not fully configured. SMS functionality may not work.');
    }
  }

  /**
   * Send OTP SMS using IranPayamak Pattern SMS API
   * @param phoneNumber Phone number in format 09123456789
   * @param otpCode 6-digit OTP code
   * @returns Promise<boolean> true if sent successfully
   */
  async sendOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    if (!this.apiKey || !this.lineNumber || !this.patternCode) {
      this.logger.error('IranPayamak SMS credentials are not configured');
      throw new Error('SMS service is not configured');
    }

    try {
      // Format phone number for IranPayamak API (09120000000 format)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Send SMS using IranPayamak Pattern SMS API
      // Using var1 for OTP code (you can adjust based on your pattern variables)
      const response = await fetch(`${this.apiUrl}/sms/pattern`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: this.patternCode,
          attributes: {
            var1: otpCode, // OTP code - adjust var name based on your pattern
          },
          recipient: formattedPhone,
          line_number: this.lineNumber,
          number_format: 'english',
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
   * Format phone number for IranPayamak API
   * Expected format: 09120000000 (with leading 0)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Ensure it starts with 0 and has 11 digits
    if (!cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '0' + cleaned;
    } else if (cleaned.startsWith('98') && cleaned.length === 12) {
      cleaned = '0' + cleaned.slice(2);
    } else if (cleaned.startsWith('+98')) {
      cleaned = '0' + cleaned.slice(3);
    }
    
    // Ensure 11 digits total
    if (cleaned.length > 11) {
      cleaned = cleaned.slice(-11);
    }
    
    if (!/^0\d{10}$/.test(cleaned)) {
      throw new Error(`Invalid phone number format: ${phone}`);
    }
    
    return cleaned;
  }
}

