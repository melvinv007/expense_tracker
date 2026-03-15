'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase }  from '@/lib/supabase';
import { CATEGORIES, type Expense, type ExpenseInput, type Budget, type ViewType } from '@/lib/types';
import AddExpenseModal from '@/components/AddExpenseModal';
import DayView        from '@/components/DayView';
import WeekView       from '@/components/WeekView';
import MonthView      from '@/components/MonthView';
import TrendChart     from '@/components/TrendChart';
import {
  format,
  startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths,
} from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Search, Download, X, Wallet, Mail } from 'lucide-react';
import Link from 'next/link';

// ─── Budget bar ───────────────────────────────────────────────────────────────
function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const pct  = Math.min((spent / budget) * 100, 100);
  const over = spent > budget;
  return (
    <div className="mt-3">
      <div className="h-2 bg-[#1e1e35] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: over ? '#ef4444' : pct > 75 ? '#f97316' : '#3894b5' }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className={`text-xs ${over ? 'text-red-400' : 'text-gray-500'}`}>
          {over
            ? `Over by ₹${(spent - budget).toLocaleString('en-IN')}`
            : `${(100 - pct).toFixed(0)}% remaining`}
        </span>
        <span className="text-xs text-gray-500">Budget ₹{budget.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}

// ─── Budget editor ────────────────────────────────────────────────────────────
function BudgetEditor({ budget, onSave, month }: { budget: Budget | null; onSave: (amt: number) => void; month: string }) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState('');

  const submit = () => {
    const n = parseFloat(val);
    if (n > 0) { onSave(n); setEditing(false); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">₹</span>
        <input
          type="number" value={val} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          autoFocus placeholder="Budget"
          className="w-28 bg-[#0a0a0f] border border-[#3894b5] rounded-lg px-2 py-1 text-sm text-white outline-none"
        />
        <button onClick={submit}                  className="text-xs text-[#3894b5] hover:text-[#93c5d6]">Save</button>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-600 hover:text-gray-400">✕</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setVal(budget?.amount.toString() ?? ''); setEditing(true); }}
      className="text-xs text-gray-500 hover:text-[#3894b5] transition-colors flex items-center gap-1"
    >
      <Wallet size={12} />
      {budget ? 'Budget set' : `Set ${month} budget`}
    </button>
  );
}

// ─── Category breakdown ───────────────────────────────────────────────────────
function CategoryBreakdown({ expenses, total }: { expenses: Expense[]; total: number }) {
  const groups: Record<string, number> = {};
  for (const e of expenses) groups[e.category] = (groups[e.category] ?? 0) + e.amount;
  const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="bg-[#111118] border border-[#1e1e35] rounded-2xl p-4">
      <p className="text-xs uppercase tracking-widest text-gray-600 mb-3">Breakdown</p>
      <div className="space-y-2.5">
        {sorted.map(([cat, amt]) => {
          const meta = CATEGORIES.find((c) => c.name === cat);
          const pct  = (amt / total) * 100;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300 flex items-center gap-1.5">
                  <span>{meta?.emoji}</span>{cat}
                </span>
                <span className="text-sm font-medium text-gray-200">₹{amt.toLocaleString('en-IN')}</span>
              </div>
              <div className="h-1.5 bg-[#1e1e35] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta?.color ?? '#3894b5' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [view,           setView]           = useState<ViewType>('week');
  const [currentDate,    setCurrentDate]    = useState(new Date());
  const [expenses,       setExpenses]       = useState<Expense[]>([]);
  const [budget,         setBudget]         = useState<Budget | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showSearch,     setShowSearch]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // ── Date range ──────────────────────────────────────────────────────────────
  const dateRange = useMemo(() => {
    switch (view) {
      case 'day':   return { start: currentDate,             end: currentDate };
      case 'week':  return { start: addDays(currentDate, -3), end: addDays(currentDate, 3) };
      case 'month': return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  }, [view, currentDate]);

  // ── Fetch expenses ──────────────────────────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', format(dateRange.start, 'yyyy-MM-dd'))
      .lte('date', format(dateRange.end,   'yyyy-MM-dd'))
      .order('date',       { ascending: false })
      .order('created_at', { ascending: false });
    setExpenses(data ?? []);
    setLoading(false);
  }, [dateRange]);

  // ── Fetch budget ────────────────────────────────────────────────────────────
  const fetchBudget = useCallback(async () => {
    const { data } = await supabase
      .from('budgets').select('*')
      .eq('month', format(currentDate, 'yyyy-MM'))
      .maybeSingle();
    setBudget(data ?? null);
  }, [currentDate]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => { fetchBudget();   }, [fetchBudget]);

  // ── Filtered ────────────────────────────────────────────────────────────────
  const filteredExpenses = useMemo(() =>
    expenses.filter((e) => {
      const q             = searchQuery.toLowerCase();
      const matchSearch   = !q || e.note?.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
      const matchCategory = filterCategory === 'All' || e.category === filterCategory;
      return matchSearch && matchCategory;
    }),
    [expenses, searchQuery, filterCategory]
  );

  const periodTotal = useMemo(
    () => filteredExpenses.reduce((s, e) => s + e.amount, 0),
    [filteredExpenses]
  );

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigate = (dir: 1 | -1) => {
    switch (view) {
      case 'day':   setCurrentDate((d) => addDays(d,   dir)); break;
      case 'week':  setCurrentDate((d) => addDays(d,   dir * 7)); break;
      case 'month': setCurrentDate((d) => addMonths(d, dir)); break;
    }
  };

  const periodLabel = useMemo(() => {
    switch (view) {
      case 'day':   return format(currentDate, 'EEEE, d MMM yyyy');
      case 'week':  return `${format(dateRange.start, 'd MMM')} – ${format(dateRange.end, 'd MMM yyyy')}`;
      case 'month': return format(currentDate, 'MMMM yyyy');
    }
  }, [view, currentDate, dateRange]);

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['Date', 'Time', 'Category', 'Amount (INR)', 'Note'],
      ...filteredExpenses.map((e) => [e.date, e.time ?? '', e.category, e.amount.toString(), e.note ?? '']),
    ];
    const csv  = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `expenses-${format(currentDate, 'yyyy-MM')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const deleteExpense = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSave = async (input: ExpenseInput) => {
    if (editingExpense) {
      const { data } = await supabase
        .from('expenses').update(input).eq('id', editingExpense.id).select().single();
      if (data) setExpenses((prev) => prev.map((e) => (e.id === editingExpense.id ? data : e)));
    } else {
      await supabase.from('expenses').insert(input);
      await fetchExpenses();
    }
    setShowAddModal(false);
    setEditingExpense(null);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowAddModal(true);
  };

  const saveBudget = async (amount: number) => {
    const month = format(currentDate, 'yyyy-MM');
    if (budget) {
      const { data } = await supabase.from('budgets').update({ amount }).eq('id', budget.id).select().single();
      if (data) setBudget(data);
    } else {
      const { data } = await supabase.from('budgets').insert({ month, amount }).select().single();
      if (data) setBudget(data);
    }
  };

  const viewProps = { expenses: filteredExpenses, currentDate, onDelete: deleteExpense, onEdit: openEdit };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-[#1e1e35]">
        <div className="max-w-lg mx-auto px-4 py-3 space-y-3">

          {/* Row 1: logo + actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#3894b5] rounded-xl flex items-center justify-center text-base">💸</div>
              <span className="font-bold text-lg tracking-tight">Expenses</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setShowSearch((s) => !s)}
                className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-[#3894b5] text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <Search size={17} />
              </button>
              <button
                onClick={exportCSV}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Export CSV"
              >
                <Download size={17} />
              </button>
              <Link
                href="/gmail"
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Gmail Auto-Import"
              >
                <Mail size={17} />
              </Link>
            </div>
          </div>

          {/* Row 2: view tabs */}
          <div className="flex bg-[#111118] border border-[#1e1e35] rounded-xl p-1">
            {(['day', 'week', 'month'] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-lg capitalize transition-colors ${
                  view === v ? 'bg-[#3894b5] text-white shadow' : 'text-gray-500 hover:text-gray-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Row 3: date nav */}
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="p-1 text-gray-500 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              {periodLabel}
            </button>
            <button onClick={() => navigate(1)} className="p-1 text-gray-500 hover:text-white transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Row 4: search & filter (collapsible) */}
          {showSearch && (
            <div className="space-y-2 pb-1">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by note or category…"
                  className="w-full bg-[#0a0a0f] border border-[#1e1e35] focus:border-[#3894b5] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-700 outline-none transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                {['All', ...CATEGORIES.map((c) => c.name)].map((cat) => {
                  const meta = CATEGORIES.find((c) => c.name === cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all"
                      style={{
                        borderColor: filterCategory === cat ? (meta?.color ?? '#3894b5') : '#1e1e35',
                        background:  filterCategory === cat ? (meta?.bg   ?? 'rgba(56,148,181,0.15)') : 'transparent',
                        color:       filterCategory === cat ? (meta?.color ?? '#93c5d6') : '#6b7280',
                      }}
                    >
                      {cat === 'All' ? '🗂 All' : `${meta?.emoji} ${cat}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* Stats card */}
        <div className="bg-[#111118] border border-[#1e1e35] rounded-2xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-600 mb-1">
                {view === 'day' ? 'Today' : view === 'week' ? 'This week' : 'This month'}
              </p>
              <p className="text-3xl font-bold tracking-tight">
                ₹{periodTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''}
              </p>
            </div>
            {view === 'month' && (
              <BudgetEditor budget={budget} onSave={saveBudget} month={format(currentDate, 'MMMM')} />
            )}
          </div>
          {view === 'month' && budget && <BudgetBar spent={periodTotal} budget={budget.amount} />}
        </div>

        {/* Trend chart — hidden in day view */}
        {view !== 'day' && (
          <TrendChart
            expenses={filteredExpenses}
            startDate={dateRange.start}
            endDate={dateRange.end}
            label={view === 'week' ? 'This week · daily' : 'This month · daily'}
            height={140}
          />
        )}

        {/* Category breakdown (month only) */}
        {view === 'month' && filteredExpenses.length > 0 && (
          <CategoryBreakdown expenses={filteredExpenses} total={periodTotal} />
        )}

        {/* Main view */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#3894b5] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === 'day' ? (
          <DayView   {...viewProps} />
        ) : view === 'week' ? (
          <WeekView  {...viewProps} weekStart={dateRange.start} />
        ) : (
          <MonthView {...viewProps} />
        )}
      </main>

      {/* ── FAB ── */}
      <button
        onClick={() => { setEditingExpense(null); setShowAddModal(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#3894b5] hover:bg-[#4aa6c7] active:scale-95 rounded-full flex items-center justify-center shadow-xl shadow-[#0f3040]/50 transition-all z-30"
        aria-label="Add expense"
      >
        <Plus size={26} />
      </button>

      {/* ── Modal ── */}
      {showAddModal && (
        <AddExpenseModal
          expense={editingExpense}
          onClose={() => { setShowAddModal(false); setEditingExpense(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
