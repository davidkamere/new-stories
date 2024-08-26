// app/api/auth/signup/route.ts

import { NextResponse } from 'next/server';
import { signUp } from '@/utils/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const { user, error } = await signUp(email, password);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
