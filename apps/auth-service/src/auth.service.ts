import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import { UserRepository } from './user.repository';

@Injectable()
export class AuthService {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly privateKey: string;
  private readonly expiresIn: string;

  constructor(private readonly users: UserRepository, config: ConfigService) {
    this.issuer = config.getOrThrow<string>('JWT_ISSUER');
    this.audience = config.getOrThrow<string>('JWT_AUDIENCE');
    this.privateKey = config.getOrThrow<string>('JWT_PRIVATE_KEY').replace(/\\n/g, '\n');
    this.expiresIn = config.get<string>('JWT_EXPIRES_IN', '15m');
  }

  async login(email: string, password: string): Promise<{ accessToken: string; tokenType: 'Bearer'; expiresIn: string }> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const signOptions: SignOptions = {
      algorithm: 'RS256',
      issuer: this.issuer,
      audience: this.audience,
      expiresIn: this.expiresIn as SignOptions['expiresIn'],
    };

    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      this.privateKey,
      signOptions,
    );

    return { accessToken, tokenType: 'Bearer', expiresIn: this.expiresIn };
  }
}
