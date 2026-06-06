const express = require('express');
const { getDb } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Get all revenue budgets
router.get('/revenue', (req, res) => {
  const db = getDb();
  const { year = 2025, dept_id, month } = req.query;
  const fy = db.prepare(`SELECT id FROM fiscal_years WHERE year=?`).get(year);
  if (!fy) return res.status(404).json({ error: 'Fiscal year not found' });

  let q = `SELECT rb.*, d.name as dept_name, bc.name as cat_name, u.full_name as approved_by_name
           FROM revenue_budgets rb
           JOIN departments d ON rb.department_id=d.id
           JOIN budget_categories bc ON rb.category_id=bc.id
           LEFT JOIN users u ON rb.approved_by=u.id
           WHERE rb.fiscal_year_id=?`;
  const params = [fy.id];
  if (dept_id) { q += ' AND rb.department_id=?'; params.push(dept_id); }
  if (month) { q += ' AND rb.month=?'; params.push(month); }
  q += ' ORDER BY rb.month, d.name';
  res.json(db.prepare(q).all(...params));
});

// Create/update revenue budget
router.post('/revenue', authorize('admin','finance_manager'), (req, res) => {
  const db = getDb();
  const { fiscal_year_id, department_id, category_id, month, amount, notes } = req.body;
  const result = db.prepare(`INSERT INTO revenue_budgets(fiscal_year_id,department_id,category_id,month,amount,notes,created_by) VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(fiscal_year_id,department_id,category_id,month) DO UPDATE SET amount=excluded.amount, notes=excluded.notes, updated_at=datetime('now')`
  ).run(fiscal_year_id, department_id, category_id, month, amount, notes, req.user.id);
  res.json({ success: true, id: result.lastInsertRowid });
});

// Approve revenue budget
router.patch('/revenue/:id/approve', authorize('admin','finance_manager'), (req, res) => {
  const db = getDb();
  const { status, comment } = req.body;
  db.prepare(`UPDATE revenue_budgets SET status=?, approved_by=?, approved_at=datetime('now'), updated_at=datetime('now') WHERE id=?`)
    .run(status, req.user.id, req.params.id);
  db.prepare(`INSERT INTO approval_logs(table_name,record_id,action,to_status,comment,actioned_by) VALUES('revenue_budgets',?,?,?,?,?)`)
    .run(req.params.id, 'approve', status, comment, req.user.id);
  res.json({ success: true });
});

// Get expense budgets
router.get('/expense', (req, res) => {
  const db = getDb();
  const { year = 2025, dept_id, month, category_id } = req.query;
  const fy = db.prepare(`SELECT id FROM fiscal_years WHERE year=?`).get(year);
  if (!fy) return res.status(404).json({ error: 'Fiscal year not found' });

  let q = `SELECT eb.*, d.name as dept_name, bc.name as cat_name, u.full_name as approved_by_name
           FROM expense_budgets eb
           JOIN departments d ON eb.department_id=d.id
           JOIN budget_categories bc ON eb.category_id=bc.id
           LEFT JOIN users u ON eb.approved_by=u.id
           WHERE eb.fiscal_year_id=?`;
  const params = [fy.id];
  if (dept_id) { q += ' AND eb.department_id=?'; params.push(dept_id); }
  if (month) { q += ' AND eb.month=?'; params.push(month); }
  if (category_id) { q += ' AND eb.category_id=?'; params.push(category_id); }
  q += ' ORDER BY eb.month, d.name, bc.name';
  res.json(db.prepare(q).all(...params));
});

// Create/update expense budget
router.post('/expense', authorize('admin','finance_manager','dept_manager'), (req, res) => {
  const db = getDb();
  const { fiscal_year_id, department_id, category_id, month, amount, notes } = req.body;
  const result = db.prepare(`INSERT INTO expense_budgets(fiscal_year_id,department_id,category_id,month,amount,notes,created_by) VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(fiscal_year_id,department_id,category_id,month) DO UPDATE SET amount=excluded.amount, notes=excluded.notes, updated_at=datetime('now')`
  ).run(fiscal_year_id, department_id, category_id, month, amount, notes, req.user.id);
  res.json({ success: true, id: result.lastInsertRowid });
});

// Approve expense budget
router.patch('/expense/:id/approve', authorize('admin','finance_manager'), (req, res) => {
  const db = getDb();
  const { status, comment } = req.body;
  db.prepare(`UPDATE expense_budgets SET status=?, approved_by=?, approved_at=datetime('now'), updated_at=datetime('now') WHERE id=?`)
    .run(status, req.user.id, req.params.id);
  res.json({ success: true });
});

// Departments list
router.get('/departments', (req, res) => {
  res.json(getDb().prepare(`SELECT * FROM departments WHERE is_active=1 ORDER BY name`).all());
});

// Categories list
router.get('/categories', (req, res) => {
  const { type } = req.query;
  let q = `SELECT * FROM budget_categories WHERE is_active=1`;
  const params = [];
  if (type) { q += ' AND type=?'; params.push(type); }
  res.json(getDb().prepare(q).all(...params));
});

// Fiscal years
router.get('/fiscal-years', (req, res) => {
  res.json(getDb().prepare(`SELECT * FROM fiscal_years ORDER BY year DESC`).all());
});

module.exports = router;
