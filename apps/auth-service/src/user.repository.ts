import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@shared/index';
import { UserRecord } from './types';

@Injectable()
export class UserRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.db.query<UserRecord>(
      'SELECT id, email, password_hash, role, is_active FROM auth_users WHERE email = $1 LIMIT 1',
      [email.toLowerCase()],
    );
    return result.rows[0] ?? null;
  }
}
