import type { NextRequest } from 'next/server';
import { handleAuthProxy } from '@/lib/auth-proxy';

type Context = { params: Promise<{ path: string[] }> };

export function POST(request: NextRequest, context: Context) { return handleAuthProxy(request, context); }
export function GET(request: NextRequest, context: Context) { return handleAuthProxy(request, context); }
export function DELETE(request: NextRequest, context: Context) { return handleAuthProxy(request, context); }
