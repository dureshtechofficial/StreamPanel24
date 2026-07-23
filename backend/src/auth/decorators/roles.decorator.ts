import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/enums/user-role.enum';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given roles. Stack with JwtAccessGuard, which
 * populates request.user first. Add new UserRole values without touching
 * this decorator or RolesGuard.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
