-- ═══════════════════════════════════════════════
-- Dompet Pintar v3 — Supabase Database Schema
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- 1. Users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('suami', 'istri')),
  created_at timestamptz default now()
);

-- 2. Cycles (siklus gajian)
create table if not exists cycles (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  is_active boolean default false,
  label text not null,
  created_at timestamptz default now()
);

-- 3. Pos (amplop keuangan)
create table if not exists pos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '📦',
  sub text default '',
  monthly_target bigint not null default 0,
  current_balance bigint not null default 0,
  order_index int default 0,
  created_at timestamptz default now()
);

-- 4. Transactions (pengeluaran)
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  amount bigint not null,
  pos_id uuid references pos(id) on delete set null,
  pos_name text not null,
  pos_icon text not null default '📦',
  user_id uuid references users(id) on delete set null,
  user_name text not null,
  user_role text not null check (user_role in ('suami', 'istri')),
  description text default '',
  cycle_id uuid references cycles(id) on delete set null,
  created_at timestamptz default now()
);

-- 5. Children (profil anak)
create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '🧒',
  balance bigint not null default 0,
  created_at timestamptz default now()
);

-- 6. Child Transactions (transaksi saku anak)
create table if not exists child_transactions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  type text not null check (type in ('in', 'out')),
  amount bigint not null,
  description text default '',
  icon text not null default '💰',
  created_at timestamptz default now()
);

-- ═══ SEED DATA ═══

-- Users
insert into users (name, role) values
  ('Suami', 'suami'),
  ('Istri', 'istri');

-- Active cycle
insert into cycles (start_date, end_date, is_active, label) values
  ('2025-03-25', '2025-04-24', true, '25 Mar – 24 Apr 2025'),
  ('2025-02-25', '2025-03-24', false, '25 Feb – 24 Mar 2025'),
  ('2025-01-25', '2025-02-24', false, '25 Jan – 24 Feb 2025'),
  ('2024-12-25', '2025-01-24', false, '25 Des – 24 Jan 2025');

-- Pos keuangan
insert into pos (name, icon, sub, monthly_target, current_balance, order_index) values
  ('Tabungan',      '🏦', 'Akumulasi otomatis', 2000000, 2450000, 0),
  ('Belanja Dapur', '🍚', 'Kebutuhan harian',   1200000,  780000, 1),
  ('Suami',         '👨‍💼', 'Uang saku',         1000000,  600000, 2),
  ('Istri',         '👩', 'Uang saku',           1000000,  150000, 3),
  ('Listrik',       '⚡', 'Token PLN',            500000,  350000, 4),
  ('Online Shop',   '🛒', 'E-commerce',           500000,  -45000, 5),
  ('Sabun',         '🧴', 'Toiletries',            250000,  200000, 6),
  ('Tagihan',       '📱', 'Internet, pulsa',       600000,  120000, 7);

-- Children
insert into children (name, icon, balance) values
  ('Raka', '👦', 185000),
  ('Nisa', '👧', 92000);

-- ═══ ROW LEVEL SECURITY (opsional, enable saat sudah ada auth) ═══
-- alter table users enable row level security;
-- alter table pos enable row level security;
-- alter table transactions enable row level security;
-- alter table cycles enable row level security;
-- alter table children enable row level security;
-- alter table child_transactions enable row level security;
