const express = require('express');
const { getDb } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Executive Summary
router.get('/summary', (req, res) => {
  const db = getDb();
  const { year = 2025 } = req.query;
  const fy = db.prepare(`SELECT id FROM fiscal_years WHERE year=?`).get(year);
  if (!fy) return res.status(404).json({ error: 'Fiscal year not found' });

  const revBudget = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM revenue_budgets WHERE fiscal_year_id=?`).get(fy.id);
  const revActual = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM actual_revenues WHERE fiscal_year_id=?`).get(fy.id);
  const expBudget = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expense_budgets WHERE fiscal_year_id=?`).get(fy.id);
  const expActual = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM actual_expenses WHERE fiscal_year_id=?`).get(fy.id);

  const rb = revBudget.total, ra = revActual.total, eb = expBudget.total, ea = expActual.total;
  res.json({
    revenue_budget: rb,
    revenue_actual: ra,
    expense_budget: eb,
    expense_actual: ea,
    profit_budget: rb - eb,
    profit_actual: ra - ea,
    revenue_achievement: rb > 0 ? (ra / rb * 100).toFixed(1) : 0,
    expense_control: eb > 0 ? (ea / eb * 100).toFixed(1) : 0,
    revenue_variance: ra - rb,
    expense_variance: ea - eb,
  });
});

// Monthly trend data
router.get('/monthly-trend', (req, res) => {
  const db = getDb();
  const { year = 2025 } = req.query;
  const fy = db.prepare(`SELECT id FROM fiscal_years WHERE year=?`).get(year);
  if (!fy) return res.status(404).json({ error: 'Fiscal year not found' });

  const months = Array.from({length:12}, (_,i) => i+1);
  const data = months.map(m => {
    const rb = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM revenue_budgets WHERE fiscal_year_id=? AND month=?`).get(fy.id, m).v;
    const ra = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM actual_revenues WHERE fiscal_year_id=? AND month=?`).get(fy.id, m).v;
    const eb = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM expense_budgets WHERE fiscal_year_id=? AND month=?`).get(fy.id, m).v;
    const ea = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM actual_expenses WHERE fiscal_year_id=? AND month=?`).get(fy.id, m).v;
    return { month: m, revenue_budget: rb, revenue_actual: ra, expense_budget: eb, expense_actual: ea, profit_budget: rb-eb, profit_actual: ra-ea };
  });
  res.json(data);
});

// Budget vs Actual by department
router.get('/by-department', (req, res) => {
  const db = getDb();
  const { year = 2025 } = req.query;
  const fy = db.prepare(`SELECT id FROM fiscal_years WHERE year=?`).get(year);
  if (!fy) return res.status(404).json({ error: 'Fiscal year not found' });

  const depts = db.prepare(`SELECT * FROM departments WHERE is_active=1`).all();
  const data = depts.map(d => {
    const rb = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM revenue_budgets WHERE fiscal_year_id=? AND department_id=?`).get(fy.id, d.id).v;
    const ra = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM actual_revenues WHERE fiscal_year_id=? AND department_id=?`).get(fy.id, d.id).v;
    const eb = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM expense_budgets WHERE fiscal_year_id=? AND department_id=?`).get(fy.id, d.id).v;
    const ea = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM actual_expenses WHERE fiscal_year_id=? AND department_id=?`).get(fy.id, d.id).v;
    return { dept: d.name, code: d.code, revenue_budget: rb, revenue_actual: ra, expense_budget: eb, expense_actual: ea, rev_variance: ra-rb, exp_variance: ea-eb };
  });
  res.json(data);
});

// KPIs
router.get('/kpi', (req, res) => {
  const db = getDb();
  const { year = 2025 } = req.query;
  const fy = db.prepare(`SELECT id FROM fiscal_years WHERE year=?`).get(year);
  if (!fy) return res.status(404).json({ error: 'Fiscal year not found' });

  const ra = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM actual_revenues WHERE fiscal_year_id=?`).get(fy.id).v;
  const ea = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM actual_expenses WHERE fiscal_year_id=?`).get(fy.id).v;
  const rb = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM revenue_budgets WHERE fiscal_year_id=?`).get(fy.id).v;
  const eb = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM expense_budgets WHERE fiscal_year_id=?`).get(fy.id).v;

  // Previous year
  const prevFy = db.prepare(`SELECT id FROM fiscal_years WHERE year=?`).get(year-1);
  let prevRa = 0;
  if (prevFy) prevRa = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM actual_revenues WHERE fiscal_year_id=?`).get(prevFy.id).v;

  const grossProfit = ra - ea;
  res.json({
    gross_profit_margin: ra > 0 ? (grossProfit / ra * 100).toFixed(1) : 0,
    net_profit_margin: ra > 0 ? (grossProfit / ra * 100).toFixed(1) : 0,
    expense_ratio: ra > 0 ? (ea / ra * 100).toFixed(1) : 0,
    revenue_growth: prevRa > 0 ? ((ra - prevRa) / prevRa * 100).toFixed(1) : 0,
    budget_accuracy_rev: rb > 0 ? (100 - Math.abs(ra - rb) / rb * 100).toFixed(1) : 0,
    budget_accuracy_exp: eb > 0 ? (100 - Math.abs(ea - eb) / eb * 100).toFixed(1) : 0,
    revenue_actual: ra, expense_actual: ea, profit_actual: grossProfit,
    revenue_budget: rb, expense_budget: eb,
  });
});

// Top 5 revenue & expense categories
router.get('/top-categories', (req, res) => {
  const db = getDb();
  const { year = 2025 } = req.query;
  const fy = db.prepare(`SELECT id FROM fiscal_years WHERE year=?`).get(year);
  if (!fy) return res.status(404).json({ error: 'Fiscal year not found' });

  const topRevenue = db.prepare(`
    SELECT bc.name, d.name as dept, SUM(ar.amount) as total
    FROM actual_revenues ar
    JOIN budget_categories bc ON ar.category_id=bc.id
    JOIN departments d ON ar.department_id=d.id
    WHERE ar.fiscal_year_id=?
    GROUP BY ar.category_id, ar.department_id ORDER BY total DESC LIMIT 5
  `).all(fy.id);

  const topExpense = db.prepare(`
    SELECT bc.name, d.name as dept, SUM(ae.amount) as total
    FROM actual_expenses ae
    JOIN budget_categories bc ON ae.category_id=bc.id
    JOIN departments d ON ae.department_id=d.id
    WHERE ae.fiscal_year_id=?
    GROUP BY ae.category_id, ae.department_id ORDER BY total DESC LIMIT 5
  `).all(fy.id);

  res.json({ top_revenue: topRevenue, top_expense: topExpense });
});

// Departments over budget
router.get('/budget-alerts', (req, res) => {
  const db = getDb();
  const { year = 2025 } = req.query;
  const fy = db.prepare(`SELECT id FROM fiscal_years WHERE year=?`).get(year);
  if (!fy) return res.status(404).json({ error: 'Fiscal year not found' });

  const depts = db.prepare(`SELECT * FROM departments WHERE is_active=1`).all();
  const alerts = [];
  depts.forEach(d => {
    const eb = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM expense_budgets WHERE fiscal_year_id=? AND department_id=?`).get(fy.id, d.id).v;
    const ea = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM actual_expenses WHERE fiscal_year_id=? AND department_id=?`).get(fy.id, d.id).v;
    if (eb > 0) {
      const pct = (ea / eb * 100);
      alerts.push({ dept: d.name, budget: eb, actual: ea, pct: pct.toFixed(1), over_budget: ea > eb });
    }
  });
  alerts.sort((a,b) => b.pct - a.pct);
  res.json(alerts);
});

module.exports = router;
