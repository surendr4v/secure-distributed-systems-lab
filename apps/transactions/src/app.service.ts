import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getHealth() {
    return {
      service: 'Secure Financial Transaction Microservice Framework',
      serviceId: this.config.get<string>('SERVICE_ID'),
      environment: this.config.get<string>('NODE_ENV'),
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  getTestMessage() {
    return {
      message: 'Test endpoint reachable',
      service: 'Secure Financial Transaction Microservice Framework',
      timestamp: new Date().toISOString(),
    };
  }
}
