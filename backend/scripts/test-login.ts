import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { LoginDto } from '../src/auth/dto/auth.dto';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  const loginDto: LoginDto = {
    login: '09126451710',
    password: 'user123'
  };

  console.log('Attempting login with:', loginDto);

  try {
    const result = await authService.login(loginDto);
    console.log('Login successful!');
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.log('Login failed!');
    console.log('Status:', error.status);
    console.log('Message:', error.message);
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response, null, 2));
    }
  }

  await app.close();
}

main().catch(console.error);


