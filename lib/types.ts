export type ViewType = 'day' | 'week' | 'month';

export type Category = {
  name:  string;
  color: string;
  bg:    string;
  emoji: string;
};

export const CATEGORIES: Category[] = [
  { name: 'Food',          color: '#f97316', bg: 'rgba(249,115,22,0.12)',  emoji: '🍔' },
  { name: 'Transport',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  emoji: '🚗' },
  { name: 'Shopping',      color: '#a855f7', bg: 'rgba(168,85,247,0.12)',  emoji: '🛍️' },
  { name: 'Entertainment', color: '#ec4899', bg: 'rgba(236,72,153,0.12)',  emoji: '🎬' },
  { name: 'Health',        color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   emoji: '💊' },
  { name: 'Bills',         color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   emoji: '📄' },
  { name: 'Travel',        color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   emoji: '✈️' },
  { name: 'Other',         color: '#6b7280', bg: 'rgba(107,114,128,0.12)', emoji: '📦' },
];

export const getCategoryMeta = (name: string): Category =>
  CATEGORIES.find((c) => c.name === name) ?? CATEGORIES[CATEGORIES.length - 1];

export type Expense = {
  id:         string;
  amount:     number;
  date:       string;
  time?:      string | null;
  note:       string | null;
  category:   string;
  created_at: string;
};

export type ExpenseInput = Omit<Expense, 'id' | 'created_at'>;

export type Budget = {
  id:     string;
  month:  string;
  amount: number;
};
