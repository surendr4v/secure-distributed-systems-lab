import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GatewayService {
  private readonly authUrl: string;
  private readonly txUrl: string;
  private readonly sharedSecret: string;

  constructor(config: ConfigService) {
    this.authUrl = config.get<string>('AUTH_SERVICE_URL', 'http://auth-service:3001');
    this.txUrl = config.get<string>('TRANSACTION_SERVICE_URL', 'http://transaction-service:3002');
    this.sharedSecret = config.getOrThrow<string>('INTERNAL_SHARED_SECRET');
  }

  login(body: unknown): Promise<Response> {
    return fetch(`${this.authUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  forwardToTransactions(path: string, method: string, bearer: string | undefined, body?: unknown, idempotencyKey?: string): Promise<Response> {
    const headers: Record<string, string> = {
      'x-service-name': 'api-gateway',
      'x-service-secret': this.sharedSecret,
    };
    if (bearer) {
      headers.authorization = bearer;
    }
    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }

    return fetch(`${this.txUrl}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
}
