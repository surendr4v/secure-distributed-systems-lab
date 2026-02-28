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
    const bearerToken = Array.isArray(authHeader)
      ? authHeader[0]
      : authHeader;

    if (bearerToken?.startsWith('Bearer ')) {
      const token = bearerToken.replace('Bearer ', '').trim();
      const principal = this.security.verifyJwt(token);
      (request as any).user = principal;
      return true;
    }

    const serviceToken = request.headers['x-service-token'] as string;
    if (this.security.validateServiceToken(serviceToken)) {
      (request as any).servicePrincipal = {
        service: request.headers['x-service-name'] || 'unknown',
      };
      return true;
    }

    throw new UnauthorizedException(
      'Missing or invalid credentials (Bearer JWT or x-service-token)',
    );
  }
}
