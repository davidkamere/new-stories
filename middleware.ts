// Auth disabled: all routes are public.
import { NextResponse } from 'next/server';

export function middleware() {
  return NextResponse.next();
}