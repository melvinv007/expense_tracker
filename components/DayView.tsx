'use client';

import { type Expense } from '@/lib/types';
import ExpenseItem from './ExpenseItem';
import { format, parseISO } from 'date-fns';

interface Props {
  expenses:    Expense[];
  currentDate: Date;
  onDelete:    (id: string) => void;
  onEdit:      (expense: Expense) => void;
}

export default function DayView({ expenses, currentDate, onDelete, onEdit }: Props) {
  // Filter for the exact day
  const dayStr = format(currentDate, 'yyyy-MM-dd');
  const dayExpenses = expenses.filter((e) => e.date === dayStr);

  if (dayExpenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-3">🌙</div>
        <p className="text-gray-500 text-sm">No expenses for this day.</p>
        <p className="text-gray-600 text-xs mt-1">Tap + to add one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {dayExpenses.map((e) => (
        <ExpenseItem key={e.id} expense={e} onDelete={onDelete} onEdit={onEdit} />
      ))}
    </div>
  );
}
