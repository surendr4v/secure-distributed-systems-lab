import { Injectable } from '@nestjs/common';
import { SecurityService } from './security.service';

@Injectable()
export class AuthVerifierService {
  constructor(private readonly security: SecurityService) {}

  verifyUserToken(token: string): unknown {
    return this.security.verifyJwt(token);
  }
}
