import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './auth.decorator';
import { AuthUser } from './current-user.decorator';
@Injectable() export class RolesGuard implements CanActivate { constructor(private reflector: Reflector) {} canActivate(ctx: ExecutionContext) { const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [ctx.getHandler(),ctx.getClass()]); if (!roles) return true; return roles.includes((ctx.switchToHttp().getRequest().user as AuthUser).role); } }
