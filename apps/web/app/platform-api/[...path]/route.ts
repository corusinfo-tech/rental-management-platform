import { NextRequest, NextResponse } from 'next/server';
import { apiInternalUrl } from '@/lib/runtime-config';

type Context = { params: Promise<{ path: string[] }> };
const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

async function proxy(request: NextRequest, context: Context): Promise<NextResponse> {
  const { path: parts } = await context.params;
  const path = parts.join('/');
  if (!/^v1\/[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(path) || path.includes('..')) {
    return NextResponse.json({ success: false, error: { message: 'Not found' } }, { status: 404 });
  }
  if (MUTATING_METHODS.has(request.method) && !sameOrigin(request)) {
    return NextResponse.json({ success: false, error: { message: 'Cross-site request rejected' } }, { status: 403 });
  }

  const headers = new Headers({ accept: 'application/json' });
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('authorization', authorization);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();

  try {
    const upstream = await fetch(`${apiInternalUrl()}/api/${path}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });
    const responseHeaders = new Headers({ 'cache-control': 'no-store' });
    responseHeaders.set('content-type', upstream.headers.get('content-type') ?? 'application/json; charset=utf-8');
    return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ success: false, error: { message: 'Platform API is unavailable. Please try again.' } }, { status: 503 });
  }
}

export function GET(request: NextRequest, context: Context) { return proxy(request, context); }
export function POST(request: NextRequest, context: Context) { return proxy(request, context); }
export function PATCH(request: NextRequest, context: Context) { return proxy(request, context); }
export function PUT(request: NextRequest, context: Context) { return proxy(request, context); }
export function DELETE(request: NextRequest, context: Context) { return proxy(request, context); }
