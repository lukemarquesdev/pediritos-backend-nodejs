import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

export class LoginDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  refreshToken!: string;
}

export class ActionTokenDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

export class ResetPasswordDto extends ActionTokenDto {
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;
}
