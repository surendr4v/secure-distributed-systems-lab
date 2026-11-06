import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { INTERNAL_ONLY_KEY } from './internal-only.decorator';

@Injectable()
export class InternalOnlyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<
        Request & { servicePrincipal?: { service?: string }; user?: unknown }
      >();
    const isInternalOnly = this.reflector.getAllAndOverride<boolean>(
      INTERNAL_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isInternalOnly) {
      return true;
    }

    if (request.servicePrincipal?.service) {
      return true;
    }

    throw new ForbiddenException('Internal service access required');
  }
}
