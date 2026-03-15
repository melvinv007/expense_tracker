'use client';

import { useState } from 'react';
import { type Expense, getCategoryMeta } from '@/lib/types';
import ExpenseItem from './ExpenseItem';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay, parseISO,
} from 'date-fns';

interface Props {
  expenses:    Expense[];
  currentDate: Date;
  onDelete:    (id: string) => void;
  onEdit:      (expense: Expense) => void;
}

export default function MonthView({ expenses, currentDate, onDelete, onEdit }: Props) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Build calendar grid (Mon–Sun)
  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 1 });
  const calDays    = eachDayOfInterval({ start: calStart, end: calEnd });

  // Map date string → daily total
  const dailyTotals: Record<string, number> = {};
  for (const e of expenses) {
    dailyTotals[e.date] = (dailyTotals[e.date] ?? 0) + e.amount;
  }

  // Max daily total for heat-map intensity
  const maxDay = Math.max(...Object.values(dailyTotals), 1);

  // Expenses for selected day or all month
  const displayExpenses = selectedDay
    ? expenses.filter((e) => e.date === format(selectedDay, 'yyyy-MM-dd'))
    : [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="bg-[#111118] border border-[#1e1e35] rounded-xl p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d) => (
            <div key={d} className="text-center text-[11px] text-gray-600 font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {calDays.map((day) => {
            const ds       = format(day, 'yyyy-MM-dd');
            const inMonth  = isSameMonth(day, currentDate);
            const selected = selectedDay && isSameDay(day, selectedDay);
            const today    = isToday(day);
            const total    = dailyTotals[ds] ?? 0;
            const intensity= total > 0 ? Math.max(0.15, total / maxDay) : 0;

            return (
              <button
                key={ds}
                onClick={() => {
                  if (!inMonth) return;
                  setSelectedDay(selected ? null : day);
                }}
                disabled={!inMonth}
                className={`
                  relative flex flex-col items-center justify-center rounded-lg py-1.5 transition-all
                  ${!inMonth ? 'opacity-20 cursor-default' : 'hover:bg-white/5 cursor-pointer'}
                  ${selected ? 'ring-2 ring-[#3894b5]' : ''}
                `}
                style={{
                  background: total > 0 && inMonth
                    ? `rgba(56,148,181,${intensity * 0.4})`
                    : undefined,
                }}
              >
                <span
                  className={`text-xs font-medium leading-none ${
                    today
                      ? 'text-[#3894b5] font-bold'
                      : inMonth ? 'text-gray-200' : 'text-gray-700'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {total > 0 && inMonth && (
                  <span className="text-[9px] text-[#93c5d6] mt-0.5 leading-none">
                    {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <button
            onClick={() => setSelectedDay(null)}
            className="mt-3 w-full text-xs text-gray-500 hover:text-gray-300 transition-colors text-center"
          >
            Show all month ↑
          </button>
        )}
      </div>

      {/* Expense list */}
      {displayExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3">🌙</div>
          <p className="text-gray-500 text-sm">
            {selectedDay ? 'No expenses on this day.' : 'No expenses this month.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Date group label */}
          {selectedDay && (
            <p className="text-xs text-gray-500 px-1 pb-1">
              {format(selectedDay, 'EEEE, d MMMM')}
            </p>
          )}
          {displayExpenses.map((e) => (
            <ExpenseItem key={e.id} expense={e} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
