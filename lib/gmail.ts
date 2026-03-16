import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export type GmailTokens = {
  access_token:  string;
  refresh_token: string;
  expiry_date:   number;
  history_id:    string;
};

export type ParsedTransaction = {
  amount:   number;
  note:     string;
  date:     string;
  category: string;
  type:     'debit' | 'credit';
} | null;

// ─── OAuth URL ────────────────────────────────────────────────────────────────
export function getOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/gmail.readonly',
    access_type:   'offline',
    prompt:        'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// ─── Exchange code for tokens ─────────────────────────────────────────────────
export async function exchangeCode(code: string): Promise<GmailTokens> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
      grant_type:    'authorization_code',
    }),
  });
  const data = await res.json();
  return {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expiry_date:   Date.now() + data.expires_in * 1000,
    history_id:    '',
  };
}

// ─── Refresh access token ─────────────────────────────────────────────────────
export async function refreshAccessToken(refresh_token: string): Promise<{ access_token: string; expiry_date: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type:    'refresh_token',
    }),
  });
  const data = await res.json();
  return {
    access_token: data.access_token,
    expiry_date:  Date.now() + data.expires_in * 1000,
  };
}

// ─── Get valid access token (auto-refresh if expired) ────────────────────────
export async function getValidAccessToken(): Promise<string | null> {
  const { data: row } = await supabase
    .from('gmail_tokens')
    .select('*')
    .single();

  if (!row) return null;

  if (Date.now() < row.expiry_date - 60_000) {
    return row.access_token;
  }

  // Refresh
  const refreshed = await refreshAccessToken(row.refresh_token);
  await supabase.from('gmail_tokens').update({
    access_token: refreshed.access_token,
    expiry_date:  refreshed.expiry_date,
    updated_at:   new Date().toISOString(),
  }).eq('id', row.id);

  return refreshed.access_token;
}

// ─── Set up Gmail watch (Pub/Sub) ─────────────────────────────────────────────
export async function setupGmailWatch(accessToken: string): Promise<string> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topicName: process.env.GOOGLE_PUBSUB_TOPIC!,
      labelIds:  ['INBOX'],
      labelFilterBehavior: 'INCLUDE',
    }),
  });
  const data = await res.json();
  console.log('Gmail watch response:', JSON.stringify(data)); // ← add this
  if (!data.historyId) throw new Error(`Watch failed: ${JSON.stringify(data)}`);
  return data.historyId;
}

// ─── Fetch message by ID ──────────────────────────────────────────────────────
export async function fetchMessage(accessToken: string, messageId: string): Promise<string> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();

  // Extract plain text body
  const parts = data.payload?.parts ?? [data.payload];
  for (const part of parts) {
    if (part?.mimeType === 'text/plain' && part?.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
  }

  // Fallback: try snippet
  return data.snippet ?? '';
}

// ─── Fetch history since lastHistoryId ───────────────────────────────────────
export async function fetchHistory(accessToken: string, startHistoryId: string): Promise<string[]> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded&labelId=INBOX`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();

  if (!data.history) return [];

  const messageIds: string[] = [];
  for (const record of data.history) {
    for (const msg of record.messagesAdded ?? []) {
      messageIds.push(msg.message.id);
    }
  }
  return messageIds;
}

// ─── Fetch sender of a message ────────────────────────────────────────────────
export async function fetchMessageSender(accessToken: string, messageId: string): Promise<string> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=From`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  const fromHeader = data.payload?.headers?.find((h: { name: string }) => h.name === 'From');
  return fromHeader?.value ?? '';
}

// ─── HDFC Bank email parser ───────────────────────────────────────────────────
export function parseHDFCEmail(body: string): ParsedTransaction {
  // Match debit or credit
  const debitMatch  = body.match(/Rs\.([0-9,]+(?:\.\d{1,2})?)\s+has been debited/i);
  const creditMatch = body.match(/Rs\.([0-9,]+(?:\.\d{1,2})?)\s+has been credited/i);

  const match = debitMatch ?? creditMatch;
  if (!match) return null;

  const type   = debitMatch ? 'debit' : 'credit';
  const amount = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  const recipientMatch = body.match(/to\s+(?:VPA\s+\S+\s+)?(.+?)\s+on\s+\d/i);
  const senderMatch    = body.match(/from\s+(?:VPA\s+\S+\s+)?(.+?)\s+on\s+\d/i);
  const note = type === 'debit'
    ? (recipientMatch?.[1]?.trim() ?? 'HDFC Debit')
    : (senderMatch?.[1]?.trim()    ?? 'HDFC Credit');

  const dateMatch = body.match(/on\s+(\d{2})-(\d{2})-(\d{2})/i);
  let date = new Date().toISOString().split('T')[0];
  if (dateMatch) {
    const [, dd, mm, yy] = dateMatch;
    date = `20${yy}-${mm}-${dd}`;
  }

  return { amount, note, date, category: guessCategory(note), type };
}

// ─── Category guesser ─────────────────────────────────────────────────────────
function guessCategory(merchant: string): string {
  const m = merchant.toLowerCase();
  if (/zomato|swiggy|food|restaurant|cafe|pizza|burger|dunzo|blinkit|bigbasket|grocer|kitchen/.test(m))
    return 'Food';
  if (/uber|ola|rapido|auto|rickshaw|metro|irctc|railway|flight|airways|airport|redbus|bus|travel/.test(m))
    return 'Transport';
  if (/amazon|flipkart|myntra|meesho|ajio|nykaa|reliance|dmart|mall|shop|store/.test(m))
    return 'Shopping';
  if (/netflix|spotify|prime|hotstar|youtube|cinema|pvr|inox|movie|game/.test(m))
    return 'Entertainment';
  if (/hospital|clinic|pharmacy|doctor|medical|apollo|health|med/.test(m))
    return 'Health';
  if (/electricity|broadband|jio|airtel|vi |vodafone|gas|water|recharge|bill|payment/.test(m))
    return 'Bills';
  if (/hotel|resort|booking|airbnb|oyo|makemytrip|goibibo/.test(m))
    return 'Travel';
  return 'Other';
}

// ─── Is HDFC bank sender ──────────────────────────────────────────────────────
export function isHDFCSender(from: string): boolean {
  return /hdfc/i.test(from);
}
