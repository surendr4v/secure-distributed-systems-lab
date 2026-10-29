import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public, metricsRegistry } from '@shared/index';
import { Response } from 'express';

@Controller()
export class SystemController {
  constructor(private readonly config: ConfigService) {}

  @Public()
  @Get('health')
  health(): {
    service: string;
    status: string;
    timestamp: string;
    environment: string;
  } {
    return {
      service: this.config.get<string>('SERVICE_NAME', 'auth-service'),
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Public()
  @Get('metrics')
  async metrics(@Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  }
}
