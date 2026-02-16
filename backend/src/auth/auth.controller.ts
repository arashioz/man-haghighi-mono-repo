import { Controller, Post, Body, UseGuards, Get, Request, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto, SendOtpDto, VerifyOtpDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, ForceLogoutAllDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // allow more tries per minute
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('login')
  @Public()
  @ApiOperation({ summary: 'Login endpoint info' })
  @ApiResponse({ status: 200, description: 'Login endpoint information' })
  getLoginInfo() {
    return {
      message: 'Please use POST method to login',
      endpoint: '/api/auth/login',
      methods: ['POST'],
    };
  }

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // allow more tries per minute
  @ApiOperation({ 
    summary: 'Login user with dual authentication',
    description: 'Supports two authentication methods: 1) Username/password login (provide password), 2) OTP login (omit password, will send OTP to phone number)'
  })
  @ApiResponse({ status: 200, description: 'User logged in successfully (password) or OTP sent successfully (OTP flow)' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 409, description: 'Already logged in on another device' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('force-logout-all')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Log out from all devices (requires login+password or phone+otp)' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async forceLogoutAll(@Body() dto: ForceLogoutAllDto) {
    return this.authService.forceLogoutAll(dto);
  }

  @Post('send-otp')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // allow more OTP requests per minute (still limited)
  @ApiOperation({ summary: 'Send OTP to phone number (for regular users)' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 401, description: 'Invalid phone number or account not active' })
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto);
  }

  @Post('verify-otp')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // allow more verify attempts per minute
  @ApiOperation({ summary: 'Verify OTP and login (for regular users)' })
  @ApiResponse({ status: 200, description: 'OTP verified and user logged in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid OTP or expired' })
  @ApiResponse({ status: 409, description: 'Already logged in on another device' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@Request() req) {
    return req.user;
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, updateProfileDto);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password (all roles)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid current password or unauthorized' })
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }

  @Post('forgot-password')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // limit password reset attempts per minute
  @ApiOperation({ summary: 'Send OTP for password reset' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully for password reset' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // allow more reset attempts per minute
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 401, description: 'Invalid OTP or expired' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
