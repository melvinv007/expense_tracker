import { NextResponse } from 'next/server';
import { getOAuthUrl } from '@/lib/gmail';

export async function GET() {
  const url = getOAuthUrl();
  return NextResponse.redirect(url);
}
