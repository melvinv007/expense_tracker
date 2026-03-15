'use client';

import { getCategoryMeta, type Expense } from '@/lib/types';
import { Trash2, Pencil } from 'lucide-react';

interface Props {
  expense: Expense;
  onDelete: (id: string) => void;
  onEdit:   (expense: Expense) => void;
}

export default function ExpenseItem({ expense, onDelete, onEdit }: Props) {
  const cat = getCategoryMeta(expense.category);

  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-[#111118] border border-[#1e1e35] hover:border-[#2d2d4a] transition-colors">
      {/* Category badge */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
        style={{ background: cat.bg }}
      >
        {cat.emoji}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium" style={{ color: cat.color }}>
            {expense.category}
          </p>
          {(expense as any).source === 'gmail' && (
            <span className="text-[9px] px-1.5 py-0.5 bg-[#3894b5]/15 text-[#3894b5] rounded-full font-medium leading-none">
              auto
            </span>
          )}
        </div>
        {expense.note && (
          <p className="text-sm text-gray-300 truncate">{expense.note}</p>
        )}
      </div>

      {/* Amount + time */}
      <div className="flex flex-col items-end flex-shrink-0">
        <span className="font-semibold text-white text-sm">
          ₹{expense.amount.toLocaleString('en-IN')}
        </span>
        {expense.time && (
          <span className="text-[10px] text-gray-600 mt-0.5">{expense.time}</span>
        )}
      </div>

      {/* Actions — always visible */}
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(expense)}
          className="p-1.5 rounded-lg text-gray-600 hover:text-[#3894b5] hover:bg-[#3894b5]/10 transition-colors"
          aria-label="Edit"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(expense.id)}
          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          aria-label="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
