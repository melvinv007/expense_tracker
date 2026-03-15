import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, setupGmailWatch } from '@/lib/gmail';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/gmail?error=no_code', req.url));
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCode(code);

    // Set up Gmail push watch
    const historyId = await setupGmailWatch(tokens.access_token);
    tokens.history_id = historyId;

    // Store tokens (upsert — only one row ever)
    const { error } = await supabase.from('gmail_tokens').upsert({
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date:   tokens.expiry_date,
      history_id:    historyId,
      updated_at:    new Date().toISOString(),
    });

    if (error) throw error;

    return NextResponse.redirect(new URL('/gmail?success=true', req.url));
  } catch (err) {
    console.error('Gmail callback error:', err);
    return NextResponse.redirect(new URL('/gmail?error=auth_failed', req.url));
  }
}
