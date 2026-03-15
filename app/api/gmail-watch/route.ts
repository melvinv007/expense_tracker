import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken, setupGmailWatch } from '@/lib/gmail';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  // Protect with webhook secret
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Not connected' }, { status: 400 });
  }

  const historyId = await setupGmailWatch(accessToken);

  await supabase
    .from('gmail_tokens')
    .update({ updated_at: new Date().toISOString() })
    .not('id', 'is', null);

  return NextResponse.json({ ok: true, historyId });
}
