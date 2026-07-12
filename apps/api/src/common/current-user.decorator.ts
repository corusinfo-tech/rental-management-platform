import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export type AuthUser = { sub: string; tenantId: string; role: string; email: string };
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user as AuthUser);
