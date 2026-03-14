'use client';

import { useState, useEffect } from 'react';
import { CATEGORIES, type Expense, type ExpenseInput } from '@/lib/types';
import { format } from 'date-fns';
import { X } from 'lucide-react';

interface Props {
  expense: Expense | null;
  onClose: () => void;
  onSave:  (data: ExpenseInput) => Promise<void>;
}

export default function AddExpenseModal({ expense, onClose, onSave }: Props) {
  const [amount,   setAmount]   = useState('');
  const [date,     setDate]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time,     setTime]     = useState('');
  const [category, setCategory] = useState('Food');
  const [note,     setNote]     = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setDate(expense.date);
      setTime(expense.time ?? '');
      setCategory(expense.category);
      setNote(expense.note ?? '');
    }
  }, [expense]);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) return;
    setSaving(true);
    await onSave({
      amount: amt,
      date,
      time: time || null,
      category,
      note: note.trim() || null,
    });
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-[#111118] border border-[#1e1e35] rounded-t-2xl sm:rounded-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
              className="w-full bg-[#0a0a0f] border border-[#1e1e35] focus:border-[#3894b5] rounded-xl pl-8 pr-4 py-3 text-xl font-semibold text-white placeholder-gray-700 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Date + Time row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-[#1e1e35] focus:border-[#3894b5] rounded-xl px-3 py-2.5 text-white outline-none transition-colors text-sm"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">
              Time <span className="text-gray-700 normal-case">(optional)</span>
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-[#1e1e35] focus:border-[#3894b5] rounded-xl px-3 py-2.5 text-white outline-none transition-colors text-sm"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Category grid */}
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setCategory(cat.name)}
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all text-center"
                style={{
                  borderColor: category === cat.name ? cat.color : '#1e1e35',
                  background:  category === cat.name ? cat.bg    : 'transparent',
                }}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{ color: category === cat.name ? cat.color : '#6b7280' }}
                >
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was this for?"
            rows={2}
            className="w-full bg-[#0a0a0f] border border-[#1e1e35] focus:border-[#3894b5] rounded-xl px-4 py-2.5 text-white placeholder-gray-700 outline-none transition-colors resize-none text-sm"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !amount}
          className="w-full py-3 bg-[#3894b5] hover:bg-[#4aa6c7] disabled:opacity-40 rounded-xl font-semibold text-white transition-colors"
        >
          {saving ? 'Saving…' : expense ? 'Update Expense' : 'Add Expense'}
        </button>
      </div>
    </div>
  );
}
