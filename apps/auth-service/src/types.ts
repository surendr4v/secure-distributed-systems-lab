export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
}
