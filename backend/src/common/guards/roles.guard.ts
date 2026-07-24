import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums';

/** ADMIN can use any route that requires SUPER_ADMIN. */
function roleMatches(userRole: UserRole, required: UserRole) {
  if (userRole === required) return true;
  if (required === UserRole.SUPER_ADMIN && userRole === UserRole.ADMIN) {
    return true;
  }
  return false;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    const role = user?.role as UserRole | undefined;
    if (!role) return false;
    return requiredRoles.some((r) => roleMatches(role, r));
  }
}
