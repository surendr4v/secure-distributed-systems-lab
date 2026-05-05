import { Module } from '@nestjs/common';
import { SharedConfigModule, DatabaseModule, SecurityModule } from '@shared/index';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRepository } from './user.repository';
import { SystemController } from './system.controller';

@Module({
  imports: [
    SharedConfigModule.forService({ serviceName: 'auth-service', port: 3001 }),
    DatabaseModule,
    SecurityModule,
  ],
  controllers: [AuthController, SystemController],
  providers: [AuthService, UserRepository],
})
export class AppModule {}
