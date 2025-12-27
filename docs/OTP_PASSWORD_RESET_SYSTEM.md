# OTP and Password Reset System

This document describes the complete OTP (One-Time Password) and password reset system implementation using IranPayamak SMS API.

## Overview

The system provides secure authentication with OTP verification for both login and password reset flows. It uses IranPayamak SMS service to send OTP codes to users' phones.

## Features

- **Dual Authentication**: Username/password or OTP-based login
- **Password Reset**: Secure password reset via SMS OTP
- **Rate Limiting**: Built-in throttling to prevent abuse
- **Separate OTP Types**: Different OTP codes for login vs password reset
- **IranPayamak Integration**: Uses pattern-based SMS sending

## API Endpoints

### Authentication Endpoints

#### 1. Send OTP for Login
```
POST /api/auth/send-otp
Content-Type: application/json

{
  "phone": "09123456789"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully"
}
```

#### 2. Verify OTP for Login
```
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "09123456789",
  "otp": "123456"
}
```

**Response:**
```json
{
  "user": { ... },
  "token": "jwt_token_here",
  "mustChangePassword": false
}
```

#### 3. Forgot Password (Send Reset OTP)
```
POST /api/auth/forgot-password
Content-Type: application/json

{
  "phone": "09123456789"
}
```

**Response:**
```json
{
  "message": "Password reset OTP sent successfully"
}
```

#### 4. Reset Password
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "phone": "09123456789",
  "otp": "123456",
  "newPassword": "newSecurePassword123",
  "confirmPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

## Database Schema Changes

The following fields were added to the `User` model:

```prisma
resetOtp               String?   // OTP code for password reset
resetOtpExpiresAt      DateTime? // Password reset OTP expiration time
```

## SMS Configuration

### Environment Variables

Add these environment variables to your `.env` file:

```env
# IranPayamak Configuration
IRANPAYAMAK_API_KEY=your_api_key_here
IRANPAYAMAK_LINE_NUMBER=+9810004150535353
IRANPAYAMAK_PATTERN_CODE=yrw36my3bqoha54  # For login OTP
IRANPAYAMAK_PASSWORD_RESET_PATTERN_CODE=SJ3FgPrE0C  # For password reset OTP
```

### SMS Patterns

The system uses two different SMS patterns:

1. **Login OTP**: Uses `IRANPAYAMAK_PATTERN_CODE` (default: `yrw36my3bqoha54`)
2. **Password Reset OTP**: Uses `IRANPAYAMAK_PASSWORD_RESET_PATTERN_CODE` (default: `SJ3FgPrE0C`)

Both patterns expect the OTP code in the `var1` attribute.

## Security Features

### Rate Limiting
- **Send OTP**: 10 requests per minute
- **Forgot Password**: 5 requests per minute
- **Reset Password**: 10 attempts per minute
- **Login**: 10 attempts per minute

### OTP Expiration
- **Login OTP**: 5 minutes
- **Password Reset OTP**: 10 minutes

### Validation
- Phone numbers must match format: `09xxxxxxxxx`
- OTP codes are 5-6 digits
- Passwords must be at least 6 characters
- Password reset requires matching confirmation

## Error Handling

### Common Error Responses

#### Invalid Phone Number
```json
{
  "statusCode": 401,
  "message": "Invalid phone number format",
  "error": "Unauthorized"
}
```

#### Invalid OTP
```json
{
  "statusCode": 401,
  "message": "Invalid password reset OTP",
  "error": "Unauthorized"
}
```

#### OTP Expired
```json
{
  "statusCode": 401,
  "message": "Password reset OTP has expired. Please request a new one.",
  "error": "Unauthorized"
}
```

#### SMS Service Error
```json
{
  "statusCode": 401,
  "message": "Failed to send password reset OTP. API error details",
  "error": "Unauthorized"
}
```

## Migration Steps

### 1. Database Migration
Run the Prisma migration to add the new fields:

```bash
cd backend
npx prisma migrate dev --name add_password_reset_otp_fields
```

### 2. Environment Variables
Add the required environment variables to your `.env` file.

### 3. IranPayamak Setup
1. Ensure your IranPayamak account is active
2. Verify the pattern codes are correctly configured
3. Test SMS sending in development mode

## Usage Flow

### Password Reset Flow

1. **User requests password reset:**
   ```javascript
   POST /api/auth/forgot-password
   { "phone": "09123456789" }
   ```

2. **System sends SMS with OTP** to the user's phone using IranPayamak pattern `SJ3FgPrE0C`

3. **User enters OTP and new password:**
   ```javascript
   POST /api/auth/reset-password
   {
     "phone": "09123456789",
     "otp": "123456",
     "newPassword": "newSecurePassword123",
     "confirmPassword": "newSecurePassword123"
   }
   ```

4. **Password is reset** and user can login with new credentials

### SMS Configuration

The system uses two different SMS patterns:

1. **Login OTP**: Uses `IRANPAYAMAK_PATTERN_CODE` (default: `yrw36my3bqoha54`)
2. **Password Reset OTP**: Uses `IRANPAYAMAK_PASSWORD_RESET_PATTERN_CODE` (default: `SJ3FgPrE0C`)

Both patterns expect the OTP code in the `var1` attribute and use the same API endpoint format as specified in your original requirements.

### Development Mode

In development (`NODE_ENV !== 'production'`), SMS sending failures are logged but don't prevent the flow from continuing. This allows testing without actual SMS costs.

## Testing

### Manual Testing Commands

```bash
# Test forgot password
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'

# Test reset password
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "09123456789",
    "otp": "123456",
    "newPassword": "newPass123",
    "confirmPassword": "newPass123"
  }'
```

## Troubleshooting

### Common Issues

1. **SMS not sending**: Check IranPayamak API key and pattern codes
2. **OTP expiration**: Password reset OTPs expire in 10 minutes
3. **Invalid phone format**: Must be exactly 11 digits starting with 09
4. **Rate limiting**: Wait before retrying after hitting limits

### Logs

Check application logs for detailed SMS API interactions:
- SMS request/response details
- OTP generation and validation
- Error details with full API responses

## Security Considerations

- OTP codes are stored hashed in database (when applicable)
- Separate OTP types prevent confusion between login and reset
- Rate limiting prevents brute force attacks
- Phone number validation prevents invalid requests
- Password requirements ensure strong passwords
