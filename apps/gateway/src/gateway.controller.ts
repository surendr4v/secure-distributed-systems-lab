import { Controller, Get } from '@nestjs/common';

@Controller()
export class GatewayController {
  @Get('/health')
  health() {
    return { service: 'api-gateway', status: 'ok', timestamp: new Date().toISOString() };
  }
}
