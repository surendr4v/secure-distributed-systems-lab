import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
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
    this.meshSecret = this.config.getOrThrow<string>('INTERNAL_SHARED_SECRET');
  }

  verifyJwt(token: string): AuthenticatedPrincipal {
    if (!token || token.length > 16384) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256', 'ES256', 'PS256'],
        issuer: this.issuer,
        audience: this.audience,
      }) as AuthenticatedPrincipal;

      if (
        !decoded ||
        typeof decoded !== 'object' ||
        typeof decoded.sub !== 'string' ||
        !decoded.sub.trim()
      ) {
        throw new Error('Missing subject');
      }

      const roles = Array.isArray(decoded.roles)
        ? decoded.roles.filter(
            (role): role is string => typeof role === 'string',
          )
        : typeof decoded.role === 'string'
          ? [decoded.role]
          : [];
      const scopes =
        typeof decoded.scope === 'string'
          ? decoded.scope.split(/\s+/).filter(Boolean)
          : Array.isArray(decoded.scopes)
            ? decoded.scopes.filter(
                (scope): scope is string => typeof scope === 'string',
              )
            : [];

      decoded.sub = decoded.sub.trim();
      decoded.roles = [...new Set(roles)].slice(0, 32);
      decoded.scopes = [...new Set(scopes)].slice(0, 64);
      return decoded;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  validateServiceToken(token?: string): boolean {
    if (!token || token.length > 4096) return false;

    const supplied = Buffer.from(token, 'utf8');
    const expected = Buffer.from(this.meshSecret, 'utf8');
    return (
      supplied.length === expected.length && timingSafeEqual(supplied, expected)
    );
  }
}
