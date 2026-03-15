# 💸 Expense Tracker

Personal expense tracker built with **Next.js 14**, **Supabase**, and **Tailwind CSS**. Deploy to Vercel in minutes.

---

## Features

- **Day / Week / Month** views with date navigation
- **Add / Edit / Delete** expenses with category, date, note
- **8 color-coded categories** (Food, Transport, Shopping, etc.)
- **Monthly budget** with progress bar + over-budget alert
- **Category breakdown** bar chart
- **Heat-map calendar** in month view (days with more spending glow brighter)
- **Search & filter** by keyword or category
- **Export to CSV**
- Dark theme, mobile-first responsive

---

## 1. Supabase Setup

Go to your Supabase project → **SQL Editor** and run:

```sql
-- Expenses table
create table expenses (
  id         uuid primary key default gen_random_uuid(),
  amount     decimal(10,2) not null,
  date       date not null,
  note       text,
  category   text not null default 'Other',
  created_at timestamptz default now()
);

-- Budgets table (one row per month)
create table budgets (
  id         uuid primary key default gen_random_uuid(),
  month      text not null unique,   -- format: YYYY-MM
  amount     decimal(10,2) not null,
  created_at timestamptz default now()
);

-- For personal use: disable RLS (no auth needed)
alter table expenses disable row level security;
alter table budgets  disable row level security;
```

> **Note:** Since this is a personal app with no login, keep your Supabase URL and anon key private. Never commit `.env.local`.

---

## 2. Local Setup

```bash
git clone <your-repo>
cd expense-tracker
npm install

# Copy env file and fill in your values
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Run locally:
```bash
npm run dev
```

---

## 3. Deploy to Vercel

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. In Vercel project settings → **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy ✅

---

## Project Structure

```
expense-tracker/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx          ← main app
├── components/
│   ├── AddExpenseModal.tsx
│   ├── ExpenseItem.tsx
│   ├── DayView.tsx
│   ├── WeekView.tsx
│   └── MonthView.tsx
└── lib/
    ├── supabase.ts
    └── types.ts
```
