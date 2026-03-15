'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Mail, CheckCircle, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import Link from 'next/link';

export default function GmailPage() {
  const [connected,    setConnected]    = useState<boolean | null>(null);
  const [lastUpdated,  setLastUpdated]  = useState<string | null>(null);
  const [importCount,  setImportCount]  = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.from('gmail_tokens').select('updated_at').maybeSingle();
      setConnected(!!data);
      setLastUpdated(data?.updated_at ?? null);

      const { count } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'gmail');
      setImportCount(count ?? 0);
      setLoading(false);
    };
    check();
  }, []);

  const disconnect = async () => {
    await supabase.from('gmail_tokens').delete().not('id', 'is', null);
    setConnected(false);
  };

  const success = searchParams?.get('success');
  const error   = searchParams?.get('error');

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-[#1e1e35]">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-bold text-lg">Gmail Auto-Import</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* Status banner */}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300">Gmail connected! Transactions will now auto-import.</p>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">Connection failed. Please try again.</p>
          </div>
        )}

        {/* Connection card */}
        <div className="bg-[#111118] border border-[#1e1e35] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3894b5]/15 rounded-xl flex items-center justify-center">
              <Mail size={20} className="text-[#3894b5]" />
            </div>
            <div>
              <p className="font-semibold text-white">HDFC Bank Emails</p>
              <p className="text-xs text-gray-500">alerts@hdfcbank.bank.in</p>
            </div>
            {!loading && (
              <div className={`ml-auto flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                connected
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-gray-500/10 text-gray-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`} />
                {connected ? 'Connected' : 'Not connected'}
              </div>
            )}
          </div>

          {connected && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0a0a0f] rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{importCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Auto-imported</p>
              </div>
              <div className="bg-[#0a0a0f] rounded-xl p-3 text-center">
                <p className="text-xs font-medium text-gray-300 mt-1">
                  {lastUpdated
                    ? new Date(lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Last synced</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-[#3894b5] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : connected ? (
            <button
              onClick={disconnect}
              className="w-full py-2.5 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-colors"
            >
              Disconnect Gmail
            </button>
          ) : (
            <a
              href="/api/gmail-auth"
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#3894b5] hover:bg-[#4aa6c7] rounded-xl font-semibold text-white transition-colors"
            >
              <Mail size={16} /> Connect Gmail
            </a>
          )}
        </div>

        {/* How it works */}
        <div className="bg-[#111118] border border-[#1e1e35] rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-gray-600 mb-4">How it works</p>
          <div className="space-y-3">
            {[
              { icon: <Mail size={15} />,       text: 'HDFC sends a debit alert to your Gmail' },
              { icon: <Zap size={15} />,         text: 'Gmail notifies this app instantly via Google Pub/Sub' },
              { icon: <RefreshCw size={15} />,   text: 'Amount, merchant & date are parsed automatically' },
              { icon: <CheckCircle size={15} />, text: 'Expense appears in your tracker within seconds' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#3894b5]/10 text-[#3894b5] flex items-center justify-center flex-shrink-0">
                  {step.icon}
                </div>
                <p className="text-sm text-gray-400">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy note */}
        <div className="bg-[#111118] border border-[#1e1e35] rounded-2xl p-4">
          <p className="text-xs uppercase tracking-widest text-gray-600 mb-2">Privacy</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            This app requests <span className="text-gray-300">read-only</span> Gmail access scoped to your inbox.
            It only processes emails from HDFC Bank. No email content is stored — only the parsed amount, date and merchant name.
          </p>
        </div>

      </main>
    </div>
  );
}
