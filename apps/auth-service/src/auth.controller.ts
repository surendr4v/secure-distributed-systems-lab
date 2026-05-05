import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { AuthVerifierService, InternalOnly, Public } from '@shared/index';
import { Request } from 'express';
import { LoginDto } from './dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly verifier: AuthVerifierService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<{ accessToken: string; tokenType: 'Bearer'; expiresIn: string }> {
    return this.authService.login(dto.email, dto.password);
  }

  @InternalOnly()
  @Post('validate')
  validate(@Req() req: Request): { valid: true; principal: unknown } {
    const auth = req.headers.authorization;
    if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const principal = this.verifier.verifyUserToken(auth.slice('Bearer '.length));
    return { valid: true, principal };
  }

  @Get('me')
  me(@Req() req: Request): { principal: unknown } {
    return { principal: (req as Request & { user?: unknown }).user };
  }
}
