import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SecurityService } from './security.service';

@Injectable()
export class ZeroTrustGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly security: SecurityService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const authHeader = request.headers['authorization'];
    if (Array.isArray(authHeader)) {
      throw new UnauthorizedException(
        'Multiple Authorization headers are not allowed',
      );
    }

    const bearerMatch =
      typeof authHeader === 'string'
        ? /^Bearer ([^\s]+)$/i.exec(authHeader.trim())
        : null;

    if (bearerMatch) {
      const principal = this.security.verifyJwt(bearerMatch[1]);
      (request as any).user = principal;
      return true;
    }

    const serviceToken = request.headers['x-service-secret'];
    if (
      typeof serviceToken === 'string' &&
      this.security.validateServiceToken(serviceToken)
    ) {
      const rawServiceName = request.headers['x-service-name'];
      const serviceName =
        typeof rawServiceName === 'string' &&
        /^[A-Za-z0-9._-]{1,128}$/.test(rawServiceName)
          ? rawServiceName
          : 'unknown';
      (request as any).servicePrincipal = { service: serviceName };
      return true;
    }

    throw new UnauthorizedException(
      'Missing or invalid credentials (Bearer JWT or x-service-secret)',
    );
  }
}
