export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'disabled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  /** UTC unix timestamp (seconds) */
  created_at: number;
  /** UTC unix timestamp (seconds) */
  updated_at: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path?: string;
  timestamp?: string;
}
