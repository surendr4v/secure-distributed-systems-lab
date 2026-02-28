import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'Secure Financial Transaction Microservice Framework',
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
