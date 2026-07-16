import type { NextRequest } from 'next/server';
import { handleAuthProxy } from '@/lib/auth-proxy';

type Context = { params: Promise<{ path: string[] }> };

/** Legacy local-development path. Production clients use /auth-api to avoid /api reverse-proxy collisions. */
export function POST(request: NextRequest, context: Context) { return handleAuthProxy(request, context, '/api/auth'); }
export function GET(request: NextRequest, context: Context) { return handleAuthProxy(request, context, '/api/auth'); }
export function DELETE(request: NextRequest, context: Context) { return handleAuthProxy(request, context, '/api/auth'); }
