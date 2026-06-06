const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { getDb } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Get actual revenues
router.get('/revenue', (req, res) => {
  const db = getDb();
  const { year = 2025, month, dept_id } = req.query;
  const fy = db.prepare(`SELECT id FROM fiscal_years WHERE year=?`).get(year);
  if (!fy) return res.status(404).json({ error: 'Fiscal year not found' });

  let q = `SELECT ar.*, d.name as dept_name, bc.name as cat_name
           FROM actual_revenues ar
           JOIN departments d ON ar.department_id=d.id
           JOIN budget_categories bc ON ar.category_id=bc.id
           WHERE ar.fiscal_year_id=?`;
  const params = [fy.id];
  if (month) { q += ' AND ar.month=?'; params.push(month); }
  if (dept_id) { q += ' AND ar.department_id=?'; params.push(dept_id); }
  q += ' ORDER BY ar.transaction_date DESC';
  res.json(db.prepare(q).all(...params));
});

// Add actual revenue
router.post('/revenue', authorize('admin','finance_manager'), (req, res) => {
  const db = getDb();
  const { fiscal_year_id, department_id, category_id, transaction_date, amount, reference_no, description } = req.body;
  const d = new Date(transaction_date);
  const month = d.getMonth() + 1;
  const week = Math.ceil((d.getDate()) / 7);
  db.prepare(`INSERT INTO actual_revenues(fiscal_year_id,department_id,category_id,transaction_date,month,week,amount,reference_no,description,created_by)
    VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .run(fiscal_year_id, department_id, category_id, transaction_date, month, week, amount, reference_no, description, req.user.id);
  res.json({ success: true });
});

// Get actual expenses
router.get('/expense', (req, res) => {
  const db = getDb();
  const { year = 2025, month, dept_id, category_id } = req.query;
  const fy = db.prepare(`SELECT id FROM fiscal_years WHERE year=?`).get(year);
  if (!fy) return res.status(404).json({ error: 'Fiscal year not found' });

  let q = `SELECT ae.*, d.name as dept_name, bc.name as cat_name
           FROM actual_expenses ae
           JOIN departments d ON ae.department_id=d.id
           JOIN budget_categories bc ON ae.category_id=bc.id
           WHERE ae.fiscal_year_id=?`;
  const params = [fy.id];
  if (month) { q += ' AND ae.month=?'; params.push(month); }
  if (dept_id) { q += ' AND ae.department_id=?'; params.push(dept_id); }
  if (category_id) { q += ' AND ae.category_id=?'; params.push(category_id); }
  q += ' ORDER BY ae.transaction_date DESC';
  res.json(db.prepare(q).all(...params));
});

// Add actual expense
router.post('/expense', authorize('admin','finance_manager','dept_manager'), (req, res) => {
  const db = getDb();
  const { fiscal_year_id, department_id, category_id, transaction_date, amount, reference_no, description, vendor } = req.body;
  const d = new Date(transaction_date);
  const month = d.getMonth() + 1;
  const week = Math.ceil(d.getDate() / 7);
  db.prepare(`INSERT INTO actual_expenses(fiscal_year_id,department_id,category_id,transaction_date,month,week,amount,reference_no,description,vendor,created_by)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
    .run(fiscal_year_id, department_id, category_id, transaction_date, month, week, amount, reference_no, description, vendor, req.user.id);
  res.json({ success: true });
});

// CSV Import
router.post('/import', authorize('admin','finance_manager'), upload.single('file'), (req, res) => {
  try {
    const db = getDb();
    const { type = 'expense', fiscal_year_id } = req.body;
    const content = req.file.buffer.toString('utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

    let imported = 0, errors = [];
    records.forEach((row, idx) => {
      try {
        const dept = db.prepare(`SELECT id FROM departments WHERE code=? OR name=?`).get(row.department, row.department);
        const cat = db.prepare(`SELECT id FROM budget_categories WHERE code=? OR name=?`).get(row.category, row.category);
        if (!dept || !cat) { errors.push(`Row ${idx+2}: dept/category not found`); return; }
        const d = new Date(row.date);
        const month = d.getMonth()+1, week = Math.ceil(d.getDate()/7);
        if (type === 'revenue') {
          db.prepare(`INSERT INTO actual_revenues(fiscal_year_id,department_id,category_id,transaction_date,month,week,amount,reference_no,description,source,created_by) VALUES(?,?,?,?,?,?,?,?,?,'import',?)`)
            .run(fiscal_year_id, dept.id, cat.id, row.date, month, week, parseFloat(row.amount), row.reference_no||'', row.description||'', req.user.id);
        } else {
          db.prepare(`INSERT INTO actual_expenses(fiscal_year_id,department_id,category_id,transaction_date,month,week,amount,reference_no,description,vendor,source,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,'import',?)`)
            .run(fiscal_year_id, dept.id, cat.id, row.date, month, week, parseFloat(row.amount), row.reference_no||'', row.description||'', row.vendor||'', req.user.id);
        }
        imported++;
      } catch(e) { errors.push(`Row ${idx+2}: ${e.message}`); }
    });

    res.json({ imported, errors, total: records.length });
  } catch(e) {
    res.status(400).json({ error: e.message });
  }
});

// Budget vs Actual comparison
router.get('/comparison', (req, res) => {
  const db = getDb();
  const { year = 2025, month } = req.query;
  const fy = db.prepare(`SELECT id FROM fiscal_years WHERE year=?`).get(year);
  if (!fy) return res.status(404).json({ error: 'Fiscal year not found' });

  const months = month ? [parseInt(month)] : Array.from({length:12},(_,i)=>i+1);
  const result = [];
  months.forEach(m => {
    const cats = db.prepare(`SELECT * FROM budget_categories WHERE is_active=1`).all();
    cats.forEach(cat => {
      const depts = db.prepare(`SELECT * FROM departments WHERE is_active=1`).all();
      depts.forEach(dept => {
        let budget = 0, actual = 0;
        if (cat.type === 'revenue') {
          budget = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM revenue_budgets WHERE fiscal_year_id=? AND month=? AND department_id=? AND category_id=?`).get(fy.id, m, dept.id, cat.id).v;
          actual = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM actual_revenues WHERE fiscal_year_id=? AND month=? AND department_id=? AND category_id=?`).get(fy.id, m, dept.id, cat.id).v;
        } else {
          budget = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM expense_budgets WHERE fiscal_year_id=? AND month=? AND department_id=? AND category_id=?`).get(fy.id, m, dept.id, cat.id).v;
          actual = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM actual_expenses WHERE fiscal_year_id=? AND month=? AND department_id=? AND category_id=?`).get(fy.id, m, dept.id, cat.id).v;
        }
        if (budget > 0 || actual > 0) {
          const variance = actual - budget;
          const pct = budget > 0 ? (variance / budget * 100).toFixed(1) : 0;
          let status = 'on-track';
          if (cat.type === 'revenue') status = actual >= budget ? 'above' : Math.abs(variance/budget) < 0.05 ? 'on-track' : 'below';
          else status = actual <= budget ? 'above' : Math.abs(variance/budget) < 0.05 ? 'on-track' : 'below';
          result.push({ month: m, dept: dept.name, category: cat.name, type: cat.type, budget, actual, variance, variance_pct: pct, status });
        }
      });
    });
  });
  res.json(result);
});

module.exports = router;
