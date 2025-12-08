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
    this.apiKey = this.configService.get<string>('IRANPAYAMAK_API_KEY', 'KMHJGvYnKw7g1xSyeyV_sR2Ajb901eiDFUN3Y8nKJzM=');
    this.lineNumber = this.configService.get<string>('IRANPAYAMAK_LINE_NUMBER', '+9810004150535353');
    this.patternCode = this.configService.get<string>('IRANPAYAMAK_PATTERN_CODE', 'verification-code');
    
    if (!this.apiKey || !this.lineNumber || !this.patternCode) {
      this.logger.warn('IranPayamak SMS credentials are not fully configured. SMS functionality may not work.');
    }
  }

  async sendOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (!this.apiKey || !this.lineNumber || !this.patternCode) {
      if (isDevelopment) {
        this.logger.warn(`SMS service not configured. OTP for ${phoneNumber}: ${otpCode} (development mode)`);
        return true;
      }
      this.logger.error('IranPayamak SMS credentials are not configured');
      throw new Error('SMS service is not configured');
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
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
            var1: otpCode,
          },
          recipient: formattedPhone,
          line_number: this.lineNumber,
          number_format: 'english',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Failed to send SMS: ${response.status} - ${errorText}`);
        
        if (isDevelopment) {
          this.logger.warn(`SMS sending failed, but allowing in development. OTP for ${phoneNumber}: ${otpCode}`);
          return true;
        }
        
        return false;
      }

      const result = await response.json();
      this.logger.log(`OTP SMS sent successfully to ${phoneNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending OTP SMS: ${error.message}`, error.stack);
      
      if (isDevelopment) {
        this.logger.warn(`SMS error occurred, but allowing in development. OTP for ${phoneNumber}: ${otpCode}`);
        return true;
      }
      
      return false;
    }
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    if (!cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '0' + cleaned;
    } else if (cleaned.startsWith('98') && cleaned.length === 12) {
      cleaned = '0' + cleaned.slice(2);
    } else if (cleaned.startsWith('+98')) {
      cleaned = '0' + cleaned.slice(3);
    }
    
    if (cleaned.length > 11) {
      cleaned = cleaned.slice(-11);
    }
    
    if (!/^0\d{10}$/.test(cleaned)) {
      throw new Error(`Invalid phone number format: ${phone}`);
    }
    
    return cleaned;
  }
}

