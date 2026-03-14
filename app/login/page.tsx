'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [pw, setPw]     = useState('');
  const [err, setErr]   = useState(false);
  const router          = useRouter();

  const submit = async () => {
    const res = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) router.push('/');
    else setErr(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#111118] border border-[#1e1e35] rounded-2xl p-8 space-y-5">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#3894b5] rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">💸</div>
          <h1 className="text-xl font-bold text-white">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">Enter password to continue</p>
        </div>
        <input
          type="password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(false); }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Password"
          autoFocus
          className="w-full bg-[#0a0a0f] border border-[#1e1e35] focus:border-[#3894b5] rounded-xl px-4 py-3 text-white placeholder-gray-700 outline-none transition-colors"
        />
        {err && <p className="text-xs text-red-400 text-center">Incorrect password</p>}
        <button
          onClick={submit}
          className="w-full py-3 bg-[#3894b5] hover:bg-[#4aa6c7] rounded-xl font-semibold text-white transition-colors"
        >
          Unlock
        </button>
      </div>
    </div>
  );
}