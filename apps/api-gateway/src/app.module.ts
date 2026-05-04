import { Module } from '@nestjs/common';
import { SharedConfigModule, SecurityModule } from '@shared/index';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { SystemController } from './system.controller';

@Module({
  imports: [SharedConfigModule.forService({ serviceName: 'api-gateway', port: 3000 }), SecurityModule],
  controllers: [GatewayController, SystemController],
  providers: [GatewayService],
})
export class AppModule {}
