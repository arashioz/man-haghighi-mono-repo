import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import { RegisterDto, LoginDto, UpdateProfileDto, SendOtpDto, VerifyOtpDto } from './dto/auth.dto';
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
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private smsService: SmsService,
  ) {}

  async register(registerDto: RegisterDto) {
    const {
      email,
      phone,
      username,
      password,
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

    // Password is required only for ADMIN users
    if (role === 'ADMIN' && !password) {
      throw new UnauthorizedException('Password is required for ADMIN users');
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
          {
            username: {
              equals: username,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      },
    });

    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const userData: Prisma.UserCreateInput = {
      email: normalizedEmail,
      phone: normalizedPhone,
      username,
      firstName,
      lastName,
      role: role as UserRole,
      education: education ?? null,
      university: university ?? null,
      job: job ?? null,
      state: state ?? null,
      gender: gender ?? null,
    } as any;

    // Hash and set password if provided (for all users, not just ADMIN)
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

    // Try to find user by email OR phone OR username
    const user = await this.prisma.user.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    // If password is provided, authenticate with password
    if (password) {
      if (!user.password) {
        throw new UnauthorizedException('Password not set for this user. Please use OTP authentication.');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const token = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      });

      const legacyUser = user as any;

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
          education: legacyUser.education,
          university: legacyUser.university,
          job: legacyUser.job,
          state: legacyUser.state,
          gender: legacyUser.gender,
          createdAt: legacyUser.createdAt,
          updatedAt: legacyUser.updatedAt,
        },
        token,
      };
    }

    // If password is not provided, initiate OTP flow
    // Only phone numbers can use OTP
    if (!normalizedPhone) {
      throw new UnauthorizedException('Phone number required for OTP authentication. Please provide a phone number or use password authentication.');
    }

    // Verify the login input matches the user's phone
    if (user.phone !== normalizedPhone) {
      throw new UnauthorizedException('Phone number does not match user account');
    }

    // Generate and send OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp: otpCode,
        otpExpiresAt,
      },
    });

    // Send OTP via SMS
    const smsSent = await this.smsService.sendOtp(normalizedPhone, otpCode);
    
    if (!smsSent) {
      throw new UnauthorizedException('Failed to send OTP. Please try again later.');
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

  /**
   * Send OTP to user's phone number
   */
  async sendOtp(sendOtpDto: SendOtpDto) {
    const { phone } = sendOtpDto;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      throw new UnauthorizedException('Invalid phone number format');
    }

    // Find user by phone
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      // Still send success response to prevent phone enumeration
      return { message: 'If the phone number is registered, an OTP will be sent.' };
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp: otpCode,
        otpExpiresAt,
      },
    });

    // Send OTP via SMS
    const smsSent = await this.smsService.sendOtp(normalizedPhone, otpCode);
    
    if (!smsSent) {
      throw new UnauthorizedException('Failed to send OTP. Please try again later.');
    }

    return { message: 'OTP sent successfully' };
  }

  /**
   * Verify OTP and login user
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { phone, otp } = verifyOtpDto;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      throw new UnauthorizedException('Invalid phone number format');
    }

    // Find user by phone
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    // Check if OTP exists and is valid
    if (!user.otp || !user.otpExpiresAt) {
      throw new UnauthorizedException('No OTP found. Please request a new OTP.');
    }

    // Check if OTP is expired
    if (new Date() > user.otpExpiresAt) {
      throw new UnauthorizedException('OTP has expired. Please request a new OTP.');
    }

    // Verify OTP
    if (user.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Clear OTP after successful verification
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp: null,
        otpExpiresAt: null,
      },
    });

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

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
        education: user.education,
        university: user.university,
        job: user.job,
        state: user.state,
        gender: user.gender,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
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
}
