import { NextRequest, NextResponse } from 'next/server';
import {
  getValidAccessToken,
  fetchHistory,
  fetchMessage,
  fetchMessageSender,
  parseHDFCEmail,
  isHDFCSender,
} from '@/lib/gmail';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const secret = req.nextUrl.searchParams.get('secret');
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse Pub/Sub message
    const body = await req.json();
    const data = body?.message?.data;
    if (!data) return NextResponse.json({ ok: true }); // ack empty

    const decoded   = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
    const historyId = decoded.historyId?.toString();
    if (!historyId) return NextResponse.json({ ok: true });

    // Get stored tokens + last history ID
    const { data: tokenRow } = await supabase
      .from('gmail_tokens')
      .select('*')
      .single();

    if (!tokenRow) return NextResponse.json({ error: 'Not connected' }, { status: 400 });

    const accessToken = await getValidAccessToken();
    if (!accessToken) return NextResponse.json({ error: 'No token' }, { status: 400 });

    // Fetch new message IDs since stored history ID
    const messageIds = await fetchHistory(accessToken, tokenRow.history_id);

    let imported = 0;

    for (const messageId of messageIds) {
      // Check sender first (cheap metadata call — avoids fetching full email)
      const sender = await fetchMessageSender(accessToken, messageId);
      if (!isHDFCSender(sender)) continue;

      // Fetch full body and parse
      const bodyText = await fetchMessage(accessToken, messageId);
      const parsed   = parseHDFCEmail(bodyText);
      if (!parsed) continue;

      // Skip credits (money received) — only track debits as expenses
      if (parsed.type === 'credit') continue;

      // Duplicate check: same amount + date already auto-imported
      const { data: existing } = await supabase
        .from('expenses')
        .select('id')
        .eq('date',   parsed.date)
        .eq('amount', parsed.amount)
        .eq('source', 'gmail')
        .maybeSingle();

      if (existing) continue;

      // Insert as expense
      await supabase.from('expenses').insert({
        amount:   parsed.amount,
        date:     parsed.date,
        note:     parsed.note,
        category: parsed.category,
        source:   'gmail',
      });

      imported++;
    }

    // Advance stored history ID to latest so next webhook starts from here
    await supabase
      .from('gmail_tokens')
      .update({ history_id: historyId, updated_at: new Date().toISOString() })
      .eq('id', tokenRow.id);

    return NextResponse.json({ ok: true, imported });
  } catch (err) {
    console.error('Webhook error:', err);
    // Always return 200 to Pub/Sub — non-200 causes endless retries
    return NextResponse.json({ ok: true });
  }
}