import { UserRole } from '../../users/enums/user-role.enum';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string;
}
