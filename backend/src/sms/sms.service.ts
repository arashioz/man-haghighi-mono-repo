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
    // Try to get from environment variables directly first, then fallback to ConfigService
    const rawApiKey = process.env.IRANPAYAMAK_API_KEY || this.configService.get<string>('IRANPAYAMAK_API_KEY', 'KMHJGvYnKw7g1xSyeyV_sR2Ajb901eiDFUN3Y8nKJzM=');
    const rawLineNumber = process.env.IRANPAYAMAK_LINE_NUMBER || this.configService.get<string>('IRANPAYAMAK_LINE_NUMBER', '+9810004150535353');
    const rawPatternCode = process.env.IRANPAYAMAK_PATTERN_CODE || this.configService.get<string>('IRANPAYAMAK_PATTERN_CODE', 'verification-code');
    
    // Trim whitespace from all values
    this.apiKey = rawApiKey?.trim() || '';
    this.lineNumber = rawLineNumber?.trim() || '';
    this.patternCode = rawPatternCode?.trim() || '';
    
    // Log configuration status (without exposing full API key)
    this.logger.log(`SMS Service initialized:`, {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0,
      apiKeyPrefix: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'N/A',
      lineNumber: this.lineNumber,
      patternCode: this.patternCode,
    });
    
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
      
      const requestBody = {
        code: this.patternCode,
        attributes: {
          var1: otpCode,
        },
        recipient: formattedPhone,
        line_number: this.lineNumber,
        number_format: 'english',
      };

      // Log what we're sending (without exposing full API key)
      this.logger.log(`Sending SMS request to IranPayamak API:`, {
        url: `${this.apiUrl}/sms/pattern`,
        recipient: formattedPhone,
        patternCode: this.patternCode,
        lineNumber: this.lineNumber,
        apiKeyLength: this.apiKey?.length || 0,
        apiKeyPrefix: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'N/A',
        requestBody: JSON.stringify(requestBody),
        headers: {
          'Accept': 'application/json',
          'Api-Key': `${this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'N/A'}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Try different header formats if Api-Key doesn't work
      // Some APIs use X-API-Key or Authorization header
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      
      // Try Api-Key first (standard for IranPayamak)
      headers['Api-Key'] = this.apiKey;
      
      const response = await fetch(`${this.apiUrl}/sms/pattern`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      let responseData: any = null;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // Response is not JSON
      }

      if (!response.ok) {
        // For 401 errors, log the full API key for debugging (only in logs, not exposed to user)
        const errorDetails: any = {
          status: response.status,
          statusText: response.statusText,
          responseText: responseText,
          requestBody: JSON.stringify(requestBody),
          recipient: formattedPhone,
          apiKeyLength: this.apiKey?.length || 0,
        };
        
        // Only log full API key for 401 errors to help debug authentication issues
        if (response.status === 401) {
          errorDetails.apiKeyFull = this.apiKey; // Full API key for debugging 401 errors
          errorDetails.apiKeyFromEnv = process.env.IRANPAYAMAK_API_KEY;
          errorDetails.apiKeyFromConfig = this.configService.get<string>('IRANPAYAMAK_API_KEY');
        }
        
        this.logger.error(`Failed to send SMS to IranPayamak API:`, errorDetails);
        
        if (isDevelopment) {
          this.logger.warn(`SMS sending failed, but allowing in development. OTP for ${phoneNumber}: ${otpCode}`);
          return true;
        }
        
        // Throw error with details for better debugging
        const errorMessage = responseData?.message || responseData?.error || responseText || 'Unknown error';
        throw new Error(`SMS API error (${response.status}): ${errorMessage}`);
      }

      this.logger.log(`OTP SMS sent successfully to ${phoneNumber}`, {
        response: responseData,
      });
      return true;
    } catch (error) {
      let formattedPhone = 'N/A';
      try {
        if (phoneNumber) {
          formattedPhone = this.formatPhoneNumber(phoneNumber);
        }
      } catch {
        // Ignore formatting errors in error handler
      }
      
      this.logger.error(`Error sending OTP SMS to ${phoneNumber}:`, {
        error: error.message,
        stack: error.stack,
        phoneNumber: phoneNumber,
        formattedPhone: formattedPhone,
      });
      
      if (isDevelopment) {
        this.logger.warn(`SMS error occurred, but allowing in development. OTP for ${phoneNumber}: ${otpCode}`);
        return true;
      }
      
      // Re-throw the error so auth service can handle it properly
      throw error;
    }
  }

  private formatPhoneNumber(phone: string): string {
    try {
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
    } catch (error) {
      this.logger.error(`Error formatting phone number: ${phone}`, error);
      throw error;
    }
  }
}

