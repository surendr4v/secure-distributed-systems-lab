import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, user, servicePrincipal, ip } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          this.audit.write({
            action: method,
            resource: originalUrl,
            actor: user?.sub || servicePrincipal?.service || 'unknown',
            subject: req.body?.id || req.params?.id,
            status: 200,
            meta: {
              ip,
              roles: user?.roles,
              traceId: req.headers['x-trace-id'],
            },
          });
        },
        error: (err) => {
          this.audit.write({
            action: method,
            resource: originalUrl,
            actor: user?.sub || servicePrincipal?.service || 'unknown',
            subject: req.body?.id || req.params?.id,
            status: err?.status || 500,
            meta: {
              ip,
              roles: user?.roles,
              traceId: req.headers['x-trace-id'],
              message: err?.message,
            },
          });
        },
      }),
    );
  }
}
