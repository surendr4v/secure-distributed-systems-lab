import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedPrincipal {
  sub: string;
  roles: string[];
  scopes: string[];
  iss: string;
  aud: string | string[];
  iat?: number;
  exp?: number;
  [key: string]: any;
}

@Injectable()
export class SecurityService {
  private readonly publicKey: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly meshSecret: string;

  constructor(private readonly config: ConfigService) {
    this.publicKey = this.config.getOrThrow<string>('JWT_PUBLIC_KEY');
    this.issuer = this.config.getOrThrow<string>('JWT_ISSUER');
    this.audience = this.config.getOrThrow<string>('JWT_AUDIENCE');
    this.meshSecret = this.config.getOrThrow<string>('SERVICE_MESH_SHARED_SECRET');
  }

  verifyJwt(token: string): AuthenticatedPrincipal {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256', 'ES256', 'PS256'],
        issuer: this.issuer,
        audience: this.audience,
      }) as AuthenticatedPrincipal;
      decoded.roles = (decoded.roles as string[]) || [];
      decoded.scopes = (decoded.scope as string)
        ? (decoded.scope as string).split(' ')
        : decoded.scopes || [];
      return decoded;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  validateServiceToken(token?: string): boolean {
    if (!token) return false;
    return token === this.meshSecret;
  }
}
