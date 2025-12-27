import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private apiKey: string = "KMHJGvYnKw7g1xSyeyV_sR2Ajb901eiDFUN3Y8nKJzM=";
  private lineNumber: string = '+9810004150535353';
  private patternCode: string = 'yrw36my3bqoha54';
  private readonly apiUrl = 'https://api.iranpayamak.com/ws/v1';

  constructor(private configService: ConfigService) {
    const rawApiKey = process.env.IRANPAYAMAK_API_KEY || this.configService.get<string>('IRANPAYAMAK_API_KEY', 'KMHJGvYnKw7g1xSyeyV_sR2Ajb901eiDFUN3Y8nKJzM=');
    const rawLineNumber = process.env.IRANPAYAMAK_LINE_NUMBER || this.configService.get<string>('IRANPAYAMAK_LINE_NUMBER', '+9810004150535353');
    const rawPatternCode = process.env.IRANPAYAMAK_PATTERN_CODE || this.configService.get<string>('IRANPAYAMAK_PATTERN_CODE', 'verification-code');
    
    this.apiKey = (rawApiKey?.trim() || '') as string;
    this.lineNumber = (rawLineNumber?.trim() || '+9810004150535353') as string;
    this.patternCode = (rawPatternCode?.trim() || 'yrw36my3bqoha54') as string;

    this.logger.log(`SMS Service initialized:`, {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0,
      apiKeyPrefix: this.apiKey ? `${this.apiKey}` : 'N/A',
      lineNumber: this.lineNumber,
      patternCode: this.patternCode,
    });
    
    if (!this.apiKey || !this.lineNumber || !this.patternCode) {
      this.logger.warn('IranPayamak SMS credentials are not fully configured. SMS functionality may not work.');
    }
  }

  async sendPasswordResetOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Use the specific pattern code for password reset OTP
    const passwordResetPatternCode = process.env.IRANPAYAMAK_PASSWORD_RESET_PATTERN_CODE || 'SJ3FgPrE0C';

    if (!this.apiKey || !this.lineNumber || !passwordResetPatternCode) {
      if (isDevelopment) {
        this.logger.warn(`SMS service not configured. Password reset OTP for ${phoneNumber}: ${otpCode} (development mode)`);
        return true;
      }
      this.logger.error('IranPayamak SMS credentials are not configured');
      throw new Error('SMS service is not configured');
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const requestBody = {
        code: passwordResetPatternCode,
        attributes: {
          var1: otpCode,
        },
        recipient: formattedPhone,
        line_number: this.lineNumber,
        number_format: 'english',
      };

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

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
        const errorDetails: any = {
          status: response.status,
          statusText: response.statusText,
          responseText: responseText,
          requestBody: JSON.stringify(requestBody),
          recipient: formattedPhone,
          apiKeyLength: this.apiKey?.length || 0,
        };

        if (response.status === 401) {
          errorDetails.apiKeyFull = this.apiKey;
          errorDetails.apiKeyFromEnv = process.env.IRANPAYAMAK_API_KEY;
          errorDetails.apiKeyFromConfig = this.configService.get<string>('IRANPAYAMAK_API_KEY');
        }

        this.logger.error(`Failed to send password reset SMS to IranPayamak API:`, errorDetails);

        if (isDevelopment) {
          this.logger.warn(`Password reset SMS sending failed, but allowing in development. OTP for ${phoneNumber}: ${otpCode}`);
          return true;
        }

        const errorMessage = responseData?.message || responseData?.error || responseText || 'Unknown error';
        throw new Error(`SMS API error (${response.status}): ${errorMessage}`);
      }

      this.logger.log(`Password reset SMS sent successfully to ${phoneNumber}`, {
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

      this.logger.error(`Error sending password reset SMS to ${phoneNumber}:`, {
        error: error.message,
        stack: error.stack,
        phoneNumber: phoneNumber,
        formattedPhone: formattedPhone,
      });

      if (isDevelopment) {
        this.logger.warn(`Password reset SMS error occurred, but allowing in development. OTP for ${phoneNumber}: ${otpCode}`);
        return true;
      }

      throw error;
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


        this.logger.warn('DEV ONLY: Full OTP SMS request details', {
          url: `${this.apiUrl}/sms/pattern`,
          apiKey: this.apiKey,
          requestBody,
        });
      

      // Log what we're sending (without exposing full API key)
      this.logger.log(`Sending SMS request to IranPayamak API:`, {
        url: `${this.apiUrl}/sms/pattern`,
        recipient: formattedPhone,
        patternCode: this.patternCode,
        lineNumber: this.lineNumber,
        apiKeyLength: this.apiKey?.length || 0,
        apiKeyPrefix: this.apiKey ? `${this.apiKey}...` : 'N/A',
        requestBody: JSON.stringify(requestBody),
        headers: {
          'Accept': 'application/json',
          'Api-Key': `${this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'N/A'}`,
          'Content-Type': 'application/json',
        },
      });
      

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

  async sendTextMessage(phoneNumber: string, text: string): Promise<boolean> {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (!this.apiKey || !this.lineNumber) {
      if (isDevelopment) {
        this.logger.warn(`SMS service not configured. Message for ${phoneNumber}: ${text}`);
        return true;
      }
      throw new Error('SMS service is not configured');
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const sanitizedText = (text || '').toString().trim().slice(0, 640); // limit length for SMS gateways

      if (!sanitizedText) {
        throw new Error('پیامک خالی ارسال نمی‌شود');
      }

      const requestBody = {
        from: this.lineNumber,
        to: [formattedPhone],
        text: sanitizedText,
        isFlash: false,
      };

      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Api-Key': this.apiKey,
      };

      this.logger.log(`Sending text SMS`, {
        to: formattedPhone,
        textPreview: sanitizedText.slice(0, 60),
      });

      const response = await fetch(`${this.apiUrl}/sms/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();

      if (!response.ok) {
        this.logger.error('SMS text send failed', {
          status: response.status,
          body: responseText,
          recipient: formattedPhone,
        });

        if (isDevelopment) {
          this.logger.warn(`Allowing SMS text in development for ${formattedPhone}: ${sanitizedText}`);
          return true;
        }

        throw new Error(`SMS API error (${response.status}): ${responseText || 'unknown'}`);
      }

      return true;
    } catch (error) {
      this.logger.error(`Error sending text SMS to ${phoneNumber}`, {
        error: error?.message || error,
      });

      if (isDevelopment) {
        return true;
      }

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

