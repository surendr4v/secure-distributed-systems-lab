import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public, metricsRegistry } from '@shared/index';
import { Response } from 'express';

@Controller()
export class SystemController {
  constructor(private readonly config: ConfigService) {}

  @Public()
  @Get('health')
  health(): { service: string; status: string; timestamp: string } {
    return {
      service: this.config.get<string>('SERVICE_NAME', 'audit-service'),
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('metrics')
  async metrics(@Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  }

  @Public()
  @Get('ready')
  async ready(@Res() res: Response): Promise<void> {
  const dbOk = await this.checkDb(); 
  const status = dbOk ? 200 : 503;
  res.status(status).json({
    service: this.config.get<string>('SERVICE_NAME', 'audit-service'),
    status: dbOk ? 'ready' : 'unavailable',
    timestamp: new Date().toISOString(),
  });
  }
  
}
