import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import { RegisterDto, LoginDto, UpdateProfileDto, SendOtpDto, VerifyOtpDto, ChangePasswordDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { normalizePhone } from '../common/utils/phone.utils';
import { SmsService } from '../sms/sms.service';

const authUserPublicSelect = {
  id: true,
  email: true,
  phone: true,
  username: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  isOld: true,
  mustChangePassword: true,
  education: true,
  university: true,
  job: true,
  state: true,
  gender: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private smsService: SmsService,
  ) {}

  async register(registerDto: RegisterDto) {
    const {
      email,
      phone,
      password,
      confirmPassword,
      firstName,
      lastName,
      role,
      education,
      university,
      job,
      state,
      gender,
    } = registerDto;

    const normalizedEmail = email ? email.trim().toLowerCase() : null;
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    if (phone && !normalizedPhone) {
      throw new UnauthorizedException('Invalid phone number format');
    }

    if (role === 'ADMIN' && !normalizedEmail) {
      throw new UnauthorizedException('Admin users must have an email');
    }
    if (role !== 'ADMIN' && !normalizedPhone) {
      throw new UnauthorizedException('Non-admin users must have a phone number');
    }

    if (role === 'USER') {
      if (!password) {
        throw new UnauthorizedException('Password is required for regular users');
      }
      if (!confirmPassword) {
        throw new UnauthorizedException('Confirm password is required');
      }
      if (password !== confirmPassword) {
        throw new UnauthorizedException('Password and confirm password do not match');
      }
    }

    const username = `${firstName.trim()} ${lastName.trim()}`.trim();
    
    let finalUsername = username;
    let usernameCounter = 1;
    while (true) {
      const existingUsername = await this.prisma.user.findFirst({
        where: {
          username: {
            equals: finalUsername,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      });
      
      if (!existingUsername) {
        break;
      }
      
      finalUsername = `${username} ${usernameCounter}`;
      usernameCounter++;
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(normalizedEmail ? [
            {
              email: {
                equals: normalizedEmail,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const userData: Prisma.UserCreateInput = {
      email: normalizedEmail,
      phone: normalizedPhone,
      username: finalUsername,
      firstName,
      lastName,
      role: role as UserRole,
      education: education ?? null,
      university: university ?? null,
      job: job ?? null,
      state: state ?? null,
      gender: gender ?? null,
    } as any;

    if (password) {
      const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      userData.password = hashedPassword;
    }

    const user = await this.prisma.user.create({
      data: userData,
      select: authUserPublicSelect as any,
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    return {
      user,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const { login, password } = loginDto;

    const loginInput = login.trim();
    const normalizedEmail = loginInput.includes('@') ? loginInput.toLowerCase() : null;
    const normalizedPhone = normalizePhone(loginInput);

    const orConditions: Prisma.UserWhereInput[] = [
      {
        username: {
          equals: loginInput,
          mode: Prisma.QueryMode.insensitive,
        },
      },
    ];

    if (normalizedEmail) {
      orConditions.push({
        email: {
          equals: normalizedEmail,
          mode: Prisma.QueryMode.insensitive,
        },
      });
    }

    if (normalizedPhone) {
      orConditions.push({
        phone: normalizedPhone,
      });
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    if (password) {
      const isOldUserWithPhone = (user as any).isOld && normalizedPhone && user.phone === normalizedPhone;
      const isUserRole = user.role === 'USER';
      
      if (!user.password) {
        if (isUserRole) {
        } else {
          throw new UnauthorizedException('Password not set for this user. Please use OTP authentication.');
        }
      } else {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          if (isUserRole && normalizedPhone && user.phone === normalizedPhone) {
          } else {
            throw new UnauthorizedException('Invalid credentials');
          }
        } else {
          const token = this.jwtService.sign({
            sub: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role,
          });

          const legacyUser = user as any;

          // Check if user must change password
          const mustChangePassword = (legacyUser.mustChangePassword === true);

          return {
            user: {
              id: legacyUser.id,
              email: legacyUser.email,
              phone: legacyUser.phone,
              username: legacyUser.username,
              firstName: legacyUser.firstName,
              lastName: legacyUser.lastName,
              role: legacyUser.role,
              isActive: legacyUser.isActive,
              isOld: legacyUser.isOld,
              mustChangePassword: mustChangePassword,
              education: legacyUser.education,
              university: legacyUser.university,
              job: legacyUser.job,
              state: legacyUser.state,
              gender: legacyUser.gender,
              createdAt: legacyUser.createdAt,
              updatedAt: legacyUser.updatedAt,
            },
            token,
            mustChangePassword: mustChangePassword,
          };
        }
      }
    }

    if (user.role !== 'USER') {
      throw new UnauthorizedException('OTP authentication is only available for regular users. Please use password authentication.');
    }

    if (!normalizedPhone) {
      throw new UnauthorizedException('Phone number required for OTP authentication. Please provide a phone number or use password authentication.');
    }

    if (user.phone !== normalizedPhone) {
      throw new UnauthorizedException('Phone number does not match user account');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp: otpCode,
        otpExpiresAt,
      } as any,
    });

    try {
      const smsSent = await this.smsService.sendOtp(normalizedPhone, otpCode);
      
      if (!smsSent) {
        if (process.env.NODE_ENV !== 'production') {
          this.logger.warn(`SMS sending failed, but allowing in development. OTP: ${otpCode} for phone: ${normalizedPhone}`);
        } else {
          this.logger.error(`SMS sending returned false for phone: ${normalizedPhone}`);
          throw new UnauthorizedException('Failed to send OTP. Please try again later.');
        }
      }
    } catch (error) {
      if (error.message === 'SMS service is not configured') {
        this.logger.warn(`SMS service not configured. OTP generated: ${otpCode} for phone: ${normalizedPhone} (for testing only)`);
        if (process.env.NODE_ENV === 'production') {
          throw new UnauthorizedException('SMS service is not configured. Please contact administrator.');
        }
      } else if (error instanceof UnauthorizedException) {
        throw error;
      } else {
        // Log the full error details for debugging
        this.logger.error(`SMS error in login:`, {
          message: error.message,
          stack: error.stack,
          phone: normalizedPhone,
        });
        
        if (process.env.NODE_ENV !== 'production') {
          this.logger.warn(`SMS error occurred, but allowing in development. OTP: ${otpCode} for phone: ${normalizedPhone}`);
        } else {
          // Include more details in production error message if available
          const errorDetails = error.message || 'Unknown error';
          throw new UnauthorizedException(`Failed to send OTP. ${errorDetails}`);
        }
      }
    }

    return { 
      message: 'OTP sent successfully. Please verify OTP to complete login.',
      requiresOtpVerification: true 
    };
  }

  async validateUser(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: authUserPublicSelect as any,
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  async sendOtp(sendOtpDto: SendOtpDto) {
    const { phone } = sendOtpDto;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      throw new UnauthorizedException('Invalid phone number format');
    }

    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      return { message: 'If the phone number is registered, an OTP will be sent.' };
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    if (user.role !== 'USER') {
      throw new UnauthorizedException('OTP authentication is only available for regular users');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp: otpCode,
        otpExpiresAt,
      } as any,
    });

    try {
      const smsSent = await this.smsService.sendOtp(normalizedPhone, otpCode);
      
      if (!smsSent) {
        if (process.env.NODE_ENV !== 'production') {
          this.logger.warn(`SMS sending failed, but allowing in development. OTP: ${otpCode} for phone: ${normalizedPhone}`);
        } else {
          this.logger.error(`SMS sending returned false for phone: ${normalizedPhone}`);
          throw new UnauthorizedException('Failed to send OTP. Please try again later.');
        }
      }
    } catch (error) {
      if (error.message === 'SMS service is not configured') {
        this.logger.warn(`SMS service not configured. OTP generated: ${otpCode} for phone: ${normalizedPhone} (for testing only)`);
        if (process.env.NODE_ENV === 'production') {
          throw new UnauthorizedException('SMS service is not configured. Please contact administrator.');
        }
      } else if (error instanceof UnauthorizedException) {
        throw error;
      } else {
        // Log the full error details for debugging
        this.logger.error(`SMS error in sendOtp:`, {
          message: error.message,
          stack: error.stack,
          phone: normalizedPhone,
        });
        
        if (process.env.NODE_ENV !== 'production') {
          this.logger.warn(`SMS error occurred, but allowing in development. OTP: ${otpCode} for phone: ${normalizedPhone}`);
        } else {
          // Include more details in production error message if available
          const errorDetails = error.message || 'Unknown error';
          throw new UnauthorizedException(`Failed to send OTP. ${errorDetails}`);
        }
      }
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { phone, otp } = verifyOtpDto;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      throw new UnauthorizedException('Invalid phone number format');
    }

    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
      select: {
        ...authUserPublicSelect,
        otp: true,
        otpExpiresAt: true,
      } as any,
    }) as any;

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    if (user.role !== 'USER') {
      throw new UnauthorizedException('OTP authentication is only available for regular users');
    }

    if (!user.otp || !user.otpExpiresAt) {
      throw new UnauthorizedException('No OTP found. Please request a new OTP.');
    }

    if (new Date() > user.otpExpiresAt) {
      throw new UnauthorizedException('OTP has expired. Please request a new OTP.');
    }

    if (user.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp: null,
        otpExpiresAt: null,
      } as any,
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    const mustChangePassword = (user as any).mustChangePassword === true;

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        isOld: user.isOld,
        mustChangePassword: mustChangePassword,
        education: user.education,
        university: user.university,
        job: user.job,
        state: user.state,
        gender: user.gender,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
      mustChangePassword: mustChangePassword,
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const emailInput = updateProfileDto.email;
    let normalizedEmail: string | null | undefined;
    if (emailInput === undefined) {
      normalizedEmail = undefined;
    } else if (emailInput === null || emailInput.trim() === '') {
      normalizedEmail = null;
    } else {
      normalizedEmail = emailInput.trim().toLowerCase();
    }

    const phoneInput = updateProfileDto.phone;
    let normalizedPhone: string | null | undefined;
    if (phoneInput === undefined) {
      normalizedPhone = undefined;
    } else if (phoneInput === null || phoneInput.trim() === '') {
      normalizedPhone = null;
    } else {
      normalizedPhone = normalizePhone(phoneInput);
      if (!normalizedPhone) {
        throw new UnauthorizedException('Invalid phone number format');
      }
    }

    if (normalizedEmail) {
      const emailConflict = await this.prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: { id: userId },
        },
      });

      if (emailConflict) {
        throw new UnauthorizedException('Email is already in use');
      }
    }

    if (normalizedPhone) {
      const phoneConflict = await this.prisma.user.findFirst({
        where: {
          phone: normalizedPhone,
          NOT: { id: userId },
        },
      });

      if (phoneConflict) {
        throw new UnauthorizedException('Phone number is already in use');
      }
    }

    const coerce = (value?: string | null) => {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    };

    const updateData: any = {
      ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
      ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
    };

    const firstName = coerce(updateProfileDto.firstName ?? undefined);
    if (firstName !== undefined) {
      updateData.firstName = firstName;
    }

    const lastName = coerce(updateProfileDto.lastName ?? undefined);
    if (lastName !== undefined) {
      updateData.lastName = lastName;
    }

    const education = coerce(updateProfileDto.education ?? undefined);
    if (education !== undefined) {
      updateData.education = education;
    }

    const university = coerce(updateProfileDto.university ?? undefined);
    if (university !== undefined) {
      updateData.university = university;
    }

    const job = coerce(updateProfileDto.job ?? undefined);
    if (job !== undefined) {
      updateData.job = job;
    }

    const state = coerce(updateProfileDto.state ?? undefined);
    if (state !== undefined) {
      updateData.state = state;
    }

    const gender = coerce(updateProfileDto.gender ?? undefined);
    if (gender !== undefined) {
      updateData.gender = gender;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: authUserPublicSelect as any,
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    return {
      user,
      token,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        role: true,
        mustChangePassword: true,
      } as any,
    }) as any;

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.role !== 'USER') {
      throw new UnauthorizedException('Password change is only available for regular users');
    }

    // If user must change password, skip current password validation
    const mustChangePassword = (user as any).mustChangePassword === true;

    if (!mustChangePassword && user.password) {
      if (!currentPassword) {
        throw new UnauthorizedException('Current password is required');
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        this.logger.warn(`Failed password change attempt for user ${userId}`);
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Check if new password is different from current password
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new UnauthorizedException('New password must be different from current password');
      }
    }

    const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false, // Reset the flag after password change
      } as any,
    });

    this.logger.log(`Password changed successfully for user ${userId}${mustChangePassword ? ' (forced password change)' : ''}`);

    return { message: 'Password changed successfully' };
  }
}
