'use client';

import { type Expense } from '@/lib/types';
import ExpenseItem from './ExpenseItem';
import { format, addDays, isToday } from 'date-fns';

interface Props {
  expenses:    Expense[];
  weekStart:   Date;
  currentDate: Date;
  onDelete:    (id: string) => void;
  onEdit:      (expense: Expense) => void;
}

export default function WeekView({ expenses, weekStart, onDelete, onEdit }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-3">🗓️</div>
        <p className="text-gray-500 text-sm">No expenses this week.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayExpenses = expenses.filter((e) => e.date === dayStr);
        if (dayExpenses.length === 0) return null;

        const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);

        return (
          <div key={dayStr}>
            {/* Day header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold ${
                    isToday(day) ? 'text-[#3894b5]' : 'text-gray-300'
                  }`}
                >
                  {format(day, 'EEE')}
                </span>
                <span className="text-xs text-gray-600">{format(day, 'd MMM')}</span>
                {isToday(day) && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#4aa6c7]/20 text-[#3894b5] rounded-full">
                    Today
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-400">
                ₹{dayTotal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="space-y-2">
              {dayExpenses.map((e) => (
                <ExpenseItem key={e.id} expense={e} onDelete={onDelete} onEdit={onEdit} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
