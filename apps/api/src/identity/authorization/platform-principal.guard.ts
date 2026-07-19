import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { IdentityRequest } from './request-context';
import { IdentityRepository } from '../repositories/identity.repository';

@Injectable()
export class PlatformPrincipalGuard implements CanActivate {
  constructor(private readonly repository: IdentityRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IdentityRequest>();
    const userId = request.identity?.sub;
    if (!userId) throw new UnauthorizedException('Access token is required');
    if (!(await this.repository.findActivePlatformPrincipal(userId))) {
      throw new ForbiddenException('Platform super administrator access is required');
    }
    return true;
  }
}
