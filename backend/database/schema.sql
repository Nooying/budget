-- =============================================
-- Budget Planning & Actual Tracking System
-- Database Schema
-- =============================================

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','finance_manager','dept_manager','executive')),
  department_id INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Departments / Business Units
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES departments(id),
  manager_id INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Budget Categories (Expense)
CREATE TABLE IF NOT EXISTS budget_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('revenue','expense')),
  parent_id INTEGER REFERENCES budget_categories(id),
  is_active INTEGER DEFAULT 1
);

-- Fiscal Years
CREATE TABLE IF NOT EXISTS fiscal_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER UNIQUE NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('draft','active','closed')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Revenue Budget (Monthly)
CREATE TABLE IF NOT EXISTS revenue_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  category_id INTEGER NOT NULL REFERENCES budget_categories(id),
  month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
  amount REAL NOT NULL DEFAULT 0,
  revised_amount REAL,
  notes TEXT,
  approved_by INTEGER REFERENCES users(id),
  approved_at TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(fiscal_year_id, department_id, category_id, month)
);

-- Expense Budget (Monthly)
CREATE TABLE IF NOT EXISTS expense_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  category_id INTEGER NOT NULL REFERENCES budget_categories(id),
  month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
  amount REAL NOT NULL DEFAULT 0,
  revised_amount REAL,
  notes TEXT,
  approved_by INTEGER REFERENCES users(id),
  approved_at TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(fiscal_year_id, department_id, category_id, month)
);

-- Actual Revenue
CREATE TABLE IF NOT EXISTS actual_revenues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  category_id INTEGER NOT NULL REFERENCES budget_categories(id),
  transaction_date TEXT NOT NULL,
  month INTEGER NOT NULL,
  week INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  reference_no TEXT,
  description TEXT,
  source TEXT DEFAULT 'manual' CHECK(source IN ('manual','import')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Actual Expenses
CREATE TABLE IF NOT EXISTS actual_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  category_id INTEGER NOT NULL REFERENCES budget_categories(id),
  transaction_date TEXT NOT NULL,
  month INTEGER NOT NULL,
  week INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  reference_no TEXT,
  description TEXT,
  vendor TEXT,
  source TEXT DEFAULT 'manual' CHECK(source IN ('manual','import')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Weekly Reports
CREATE TABLE IF NOT EXISTS weekly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  total_revenue_budget REAL DEFAULT 0,
  total_revenue_actual REAL DEFAULT 0,
  total_expense_budget REAL DEFAULT 0,
  total_expense_actual REAL DEFAULT 0,
  net_profit_budget REAL DEFAULT 0,
  net_profit_actual REAL DEFAULT 0,
  report_data TEXT,
  generated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(fiscal_year_id, week_number, year)
);

-- Budget Approval Log
CREATE TABLE IF NOT EXISTS approval_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  comment TEXT,
  actioned_by INTEGER REFERENCES users(id),
  actioned_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rev_budget_year_dept ON revenue_budgets(fiscal_year_id, department_id);
CREATE INDEX IF NOT EXISTS idx_exp_budget_year_dept ON expense_budgets(fiscal_year_id, department_id);
CREATE INDEX IF NOT EXISTS idx_actual_rev_month ON actual_revenues(fiscal_year_id, month);
CREATE INDEX IF NOT EXISTS idx_actual_exp_month ON actual_expenses(fiscal_year_id, month);
