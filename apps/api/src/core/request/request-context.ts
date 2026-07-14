import type { Request } from 'express';

export type RequestContext = Request & {
  correlationId?: string;
  requestId?: string;
};
