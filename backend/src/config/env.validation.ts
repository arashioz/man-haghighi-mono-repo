import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, MinLength, validateSync } from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  // Node Environment
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV?: NodeEnv = NodeEnv.Development;

  // Server Configuration
  @IsNumber()
  @IsOptional()
  PORT?: number = 3000;

  @IsString()
  @IsOptional()
  SERVER_IP?: string;

  @IsString()
  @IsOptional()
  EXTERNAL_PORT?: string;

  // Database
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  POSTGRES_USER?: string;

  @IsString()
  @IsOptional()
  POSTGRES_PASSWORD?: string;

  @IsString()
  @IsOptional()
  POSTGRES_DB?: string;

  // JWT
  @IsString()
  @IsNotEmpty()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters long' })
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION?: string = '24h';

  // CORS
  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string; // Comma-separated list of allowed origins (required in production)

  // Uploads
  @IsString()
  @IsOptional()
  UPLOAD_PATH?: string;

  // API Base URL
  @IsString()
  @IsOptional()
  API_BASE_URL?: string;

  // Prisma Accelerate (optional)
  @IsString()
  @IsOptional()
  PRISMA_ACCELERATE_URL?: string;

  // Rate Limiting
  @IsNumber()
  @IsOptional()
  RATE_LIMIT_TTL?: number = 60000; // 1 minute

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_MAX?: number = 100; // requests per TTL

  // Request Timeout
  @IsNumber()
  @IsOptional()
  REQUEST_TIMEOUT?: number = 30000; // 30 seconds
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  // Additional validation: CORS_ORIGINS required in production
  const nodeEnv = (validatedConfig.NODE_ENV || 'development').toLowerCase();
  const isProduction = nodeEnv === 'production';
  
  if (isProduction && (!validatedConfig.CORS_ORIGINS || validatedConfig.CORS_ORIGINS.trim() === '')) {
    errors.push({
      property: 'CORS_ORIGINS',
      constraints: {
        isNotEmpty: 'CORS_ORIGINS is required in production environment',
      },
      value: validatedConfig.CORS_ORIGINS,
    } as any);
  }

  // Validate CORS_ORIGINS doesn't contain wildcards if set
  if (validatedConfig.CORS_ORIGINS && validatedConfig.CORS_ORIGINS.includes('*')) {
    errors.push({
      property: 'CORS_ORIGINS',
      constraints: {
        noWildcard: 'CORS_ORIGINS cannot contain wildcards. Use specific origins only.',
      },
      value: validatedConfig.CORS_ORIGINS,
    } as any);
  }

  if (errors.length > 0) {
    const errorMessages = errors.map((error) => {
      const constraints = Object.values(error.constraints || {}).join(', ');
      return `${error.property}: ${constraints}`;
    });
    throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
  }

  return validatedConfig;
}

