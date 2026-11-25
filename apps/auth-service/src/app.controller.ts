import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './access-token.guard.js';
import { AccessTokenGuard } from './access-token.guard.js';
import {
  ActionTokenDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './auth.dto.js';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): { service: string; status: string } {
    return this.appService.getHello();
  }

  @Post('v1/auth/register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() input: RegisterDto) {
    return this.appService.register(input);
  }

  @Post('v1/auth/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() input: LoginDto) {
    return this.appService.login(input.email, input.password);
  }

  @Post('v1/auth/refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() input: RefreshTokenDto) {
    return this.appService.refresh(input.refreshToken);
  }

  @Post('v1/auth/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() input: RefreshTokenDto): Promise<void> {
    await this.appService.logout(input.refreshToken);
  }

  @Get('v1/auth/me')
  @UseGuards(AccessTokenGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.appService.getUser(request.user.sub);
  }

  @Post('v1/auth/email/verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  async verifyEmail(@Body() input: ActionTokenDto): Promise<void> {
    await this.appService.verifyEmail(input.token);
  }

  @Post('v1/auth/password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(@Body() input: ForgotPasswordDto) {
    await this.appService.requestPasswordReset(input.email);
    return {
      message: 'If the account exists, recovery instructions will be sent.',
    };
  }

  @Post('v1/auth/password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() input: ResetPasswordDto): Promise<void> {
    await this.appService.resetPassword(input.token, input.newPassword);
  }
}
