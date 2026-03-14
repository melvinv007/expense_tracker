'use client';

import { useMemo } from 'react';
import { type Expense } from '@/lib/types';
import { format, eachDayOfInterval, isToday } from 'date-fns';

interface Props {
  expenses:  Expense[];
  startDate: Date;
  endDate:   Date;
  label?:    string;
  height?:   number;
}

export default function TrendChart({ expenses, startDate, endDate, label, height = 140 }: Props) {
  const data = useMemo(() => {
    const interval = eachDayOfInterval({ start: startDate, end: endDate });
    return interval.map((day) => {
      const ds    = format(day, 'yyyy-MM-dd');
      const total = expenses.filter((e) => e.date === ds).reduce((s, e) => s + e.amount, 0);
      return { ds, day, total, label: format(day, 'd') };
    });
  }, [expenses, startDate, endDate]);

  const max    = Math.max(...data.map((d) => d.total), 1);
  const W      = 600;
  const H      = height;
  const PAD    = 6;
  const colW   = W / data.length;

  const points = data
    .map((d, i) => {
      const x = i * colW + colW / 2;
      const y = PAD + (1 - d.total / max) * (H - PAD * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const daysWithSpend = data.filter((d) => d.total > 0);
  const avg = daysWithSpend.length
    ? Math.round(daysWithSpend.reduce((s, d) => s + d.total, 0) / daysWithSpend.length)
    : 0;
  const peak = Math.max(...data.map((d) => d.total));

  return (
    <div className="bg-[#111118] border border-[#1e1e35] rounded-2xl p-4">
      <p className="text-xs uppercase tracking-widest text-gray-600 mb-3">
        {label ?? `Daily trend · ${data.length} days`}
      </p>

      <div className="relative overflow-hidden" style={{ height: H + 18 }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full"
          style={{ height: H }}
        >
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#3894b5" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3894b5" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {data.length > 1 && (
            <>
              <polyline
                points={`0,${H} ${points} ${W},${H}`}
                fill="url(#trendGrad)"
                stroke="none"
              />
              <polyline
                points={points}
                fill="none"
                stroke="#3894b5"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}

          {data.map((d, i) => {
            if (d.total === 0) return null;
            const x = i * colW + colW / 2;
            const y = PAD + (1 - d.total / max) * (H - PAD * 2);
            return (
              <circle
                key={d.ds}
                cx={x} cy={y}
                r={isToday(d.day) ? 4 : 2.5}
                fill={isToday(d.day) ? '#93c5d6' : '#3894b5'}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {/* All date labels */}
        <div className="absolute bottom-0 left-0 right-0 flex">
          {data.map((d) => (
            <div key={d.ds} className="flex-1 text-center" style={{ fontSize: 10 }}>
              <span className={isToday(d.day) ? 'text-[#3894b5] font-semibold' : 'text-gray-600'}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-2 pt-2 border-t border-[#1e1e35]">
        <span className="text-xs text-gray-600">
          Avg/day: <span className="text-gray-400">₹{avg.toLocaleString('en-IN')}</span>
        </span>
        <span className="text-xs text-gray-600">
          Peak: <span className="text-gray-400">₹{peak.toLocaleString('en-IN')}</span>
        </span>
      </div>
    </div>
  );
}
