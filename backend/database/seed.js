const { getDb } = require('./db');
const bcrypt = require('bcryptjs');

const db = getDb();

function seed() {
  console.log('Seeding database...');

  // Departments
  const depts = [
    { code: 'EXEC', name: 'Executive', parent_id: null },
    { code: 'FIN', name: 'Finance', parent_id: null },
    { code: 'SALES', name: 'Sales', parent_id: null },
    { code: 'MKT', name: 'Marketing', parent_id: null },
    { code: 'OPS', name: 'Operations', parent_id: null },
    { code: 'HR', name: 'Human Resources', parent_id: null },
    { code: 'IT', name: 'Information Technology', parent_id: null },
  ];
  const insertDept = db.prepare(`INSERT OR IGNORE INTO departments(code,name,parent_id) VALUES(?,?,?)`);
  depts.forEach(d => insertDept.run(d.code, d.name, d.parent_id));

  // Budget Categories
  const cats = [
    // Revenue
    { code: 'REV-PROD', name: 'Product Sales', type: 'revenue', parent_id: null },
    { code: 'REV-SVC', name: 'Service Revenue', type: 'revenue', parent_id: null },
    { code: 'REV-OTHER', name: 'Other Income', type: 'revenue', parent_id: null },
    // Expense
    { code: 'EXP-SAL', name: 'Salaries & Benefits', type: 'expense', parent_id: null },
    { code: 'EXP-RENT', name: 'Rent & Facilities', type: 'expense', parent_id: null },
    { code: 'EXP-UTIL', name: 'Utilities', type: 'expense', parent_id: null },
    { code: 'EXP-MKT', name: 'Marketing & Advertising', type: 'expense', parent_id: null },
    { code: 'EXP-TRAVEL', name: 'Travel & Entertainment', type: 'expense', parent_id: null },
    { code: 'EXP-IT', name: 'IT & Technology', type: 'expense', parent_id: null },
    { code: 'EXP-OTHER', name: 'Other Expenses', type: 'expense', parent_id: null },
  ];
  const insertCat = db.prepare(`INSERT OR IGNORE INTO budget_categories(code,name,type,parent_id) VALUES(?,?,?,?)`);
  cats.forEach(c => insertCat.run(c.code, c.name, c.type, c.parent_id));

  // Fiscal Year
  db.prepare(`INSERT OR IGNORE INTO fiscal_years(year,start_date,end_date,status) VALUES(?,?,?,?)`).run(2025,'2025-01-01','2025-12-31','active');
  db.prepare(`INSERT OR IGNORE INTO fiscal_years(year,start_date,end_date,status) VALUES(?,?,?,?)`).run(2026,'2026-01-01','2026-12-31','active');

  // Users
  const hash = bcrypt.hashSync('password123', 10);
  const insertUser = db.prepare(`INSERT OR IGNORE INTO users(username,email,password_hash,full_name,role,department_id) VALUES(?,?,?,?,?,?)`);
  insertUser.run('admin','admin@company.com',hash,'System Admin','admin',1);
  insertUser.run('finance','finance@company.com',hash,'Finance Manager','finance_manager',2);
  insertUser.run('sales_mgr','sales@company.com',hash,'Sales Manager','dept_manager',3);
  insertUser.run('executive','ceo@company.com',hash,'Chief Executive Officer','executive',1);

  // ---- Sample Budget & Actual Data (2025) ----
  const fyId = db.prepare(`SELECT id FROM fiscal_years WHERE year=2025`).get().id;

  // Revenue budget: SALES dept, months 1-12
  const salesDeptId = db.prepare(`SELECT id FROM departments WHERE code='SALES'`).get().id;
  const mktDeptId = db.prepare(`SELECT id FROM departments WHERE code='MKT'`).get().id;
  const opsDeptId = db.prepare(`SELECT id FROM departments WHERE code='OPS'`).get().id;
  const revProdCat = db.prepare(`SELECT id FROM budget_categories WHERE code='REV-PROD'`).get().id;
  const revSvcCat = db.prepare(`SELECT id FROM budget_categories WHERE code='REV-SVC'`).get().id;

  const expSalCat = db.prepare(`SELECT id FROM budget_categories WHERE code='EXP-SAL'`).get().id;
  const expRentCat = db.prepare(`SELECT id FROM budget_categories WHERE code='EXP-RENT'`).get().id;
  const expUtilCat = db.prepare(`SELECT id FROM budget_categories WHERE code='EXP-UTIL'`).get().id;
  const expMktCat = db.prepare(`SELECT id FROM budget_categories WHERE code='EXP-MKT'`).get().id;
  const expItCat = db.prepare(`SELECT id FROM budget_categories WHERE code='EXP-IT'`).get().id;
  const expOtherCat = db.prepare(`SELECT id FROM budget_categories WHERE code='EXP-OTHER'`).get().id;

  const upsertRevBudget = db.prepare(`INSERT OR REPLACE INTO revenue_budgets(fiscal_year_id,department_id,category_id,month,amount,status) VALUES(?,?,?,?,?,'approved')`);
  const upsertExpBudget = db.prepare(`INSERT OR REPLACE INTO expense_budgets(fiscal_year_id,department_id,category_id,month,amount,status) VALUES(?,?,?,?,?,'approved')`);
  const insertActualRev = db.prepare(`INSERT OR IGNORE INTO actual_revenues(fiscal_year_id,department_id,category_id,transaction_date,month,week,amount,description,source) VALUES(?,?,?,?,?,?,?,?,'manual')`);
  const insertActualExp = db.prepare(`INSERT OR IGNORE INTO actual_expenses(fiscal_year_id,department_id,category_id,transaction_date,month,week,amount,description,source) VALUES(?,?,?,?,?,?,?,?,'manual')`);

  const revBudgets = [4200000,4500000,4800000,5000000,5200000,5500000,5800000,6000000,5700000,5500000,5800000,7000000];
  const svcBudgets = [800000,850000,900000,950000,1000000,1050000,1100000,1150000,1000000,950000,1050000,1200000];
  // Actuals slightly varied
  const revActuals = [4050000,4620000,4750000,5100000,5350000,5480000,5900000,6100000,5650000,5600000,5750000,7200000];
  const svcActuals = [780000,870000,920000,930000,1020000,1040000,1080000,1170000,990000,960000,1080000,1250000];

  const salBudgets = [1500000,1500000,1500000,1500000,1500000,1500000,1550000,1550000,1550000,1550000,1600000,1800000];
  const rentBudgets = [300000,300000,300000,300000,300000,300000,300000,300000,300000,300000,300000,300000];
  const utilBudgets = [80000,80000,80000,80000,85000,85000,90000,90000,85000,80000,80000,85000];
  const mktBudgets = [250000,250000,300000,300000,350000,350000,400000,400000,350000,300000,350000,500000];
  const itBudgets = [120000,120000,120000,120000,120000,150000,150000,150000,120000,120000,120000,150000];
  const otherBudgets = [100000,100000,100000,120000,120000,120000,130000,130000,120000,120000,130000,200000];

  const salActuals = [1480000,1510000,1490000,1520000,1530000,1505000,1560000,1575000,1540000,1555000,1620000,1850000];
  const rentActuals = [300000,300000,300000,300000,300000,300000,300000,300000,300000,300000,300000,300000];
  const utilActuals = [75000,82000,77000,83000,88000,91000,95000,93000,82000,78000,81000,88000];
  const mktActuals = [240000,265000,310000,295000,360000,345000,415000,420000,360000,305000,370000,520000];
  const itActuals = [118000,122000,115000,125000,118000,155000,148000,152000,118000,122000,118000,155000];
  const otherActuals = [95000,105000,98000,125000,115000,122000,135000,128000,118000,125000,132000,210000];

  for (let m = 1; m <= 12; m++) {
    // Revenue budgets
    upsertRevBudget.run(fyId, salesDeptId, revProdCat, m, revBudgets[m-1]);
    upsertRevBudget.run(fyId, salesDeptId, revSvcCat, m, svcBudgets[m-1]);
    // Expense budgets
    upsertExpBudget.run(fyId, opsDeptId, expSalCat, m, salBudgets[m-1]);
    upsertExpBudget.run(fyId, opsDeptId, expRentCat, m, rentBudgets[m-1]);
    upsertExpBudget.run(fyId, opsDeptId, expUtilCat, m, utilBudgets[m-1]);
    upsertExpBudget.run(fyId, mktDeptId, expMktCat, m, mktBudgets[m-1]);
    upsertExpBudget.run(fyId, opsDeptId, expItCat, m, itBudgets[m-1]);
    upsertExpBudget.run(fyId, opsDeptId, expOtherCat, m, otherBudgets[m-1]);

    // Actual revenues (first week of each month as sample)
    const mStr = String(m).padStart(2,'0');
    insertActualRev.run(fyId, salesDeptId, revProdCat, `2025-${mStr}-15`, m, Math.ceil(m*4.3/4), revActuals[m-1], 'Product sales');
    insertActualRev.run(fyId, salesDeptId, revSvcCat, `2025-${mStr}-15`, m, Math.ceil(m*4.3/4), svcActuals[m-1], 'Service revenue');

    // Actual expenses
    insertActualExp.run(fyId, opsDeptId, expSalCat, `2025-${mStr}-25`, m, Math.ceil(m*4.3/4), salActuals[m-1], 'Monthly payroll');
    insertActualExp.run(fyId, opsDeptId, expRentCat, `2025-${mStr}-01`, m, Math.ceil((m-1)*4.3/4)+1, rentActuals[m-1], 'Office rent');
    insertActualExp.run(fyId, opsDeptId, expUtilCat, `2025-${mStr}-20`, m, Math.ceil(m*4.3/4), utilActuals[m-1], 'Utilities');
    insertActualExp.run(fyId, mktDeptId, expMktCat, `2025-${mStr}-10`, m, Math.ceil(m*4.3/4), mktActuals[m-1], 'Marketing campaigns');
    insertActualExp.run(fyId, opsDeptId, expItCat, `2025-${mStr}-05`, m, Math.ceil((m-1)*4.3/4)+1, itActuals[m-1], 'IT infrastructure');
    insertActualExp.run(fyId, opsDeptId, expOtherCat, `2025-${mStr}-20`, m, Math.ceil(m*4.3/4), otherActuals[m-1], 'Miscellaneous');
  }

  console.log('✅ Database seeded successfully!');
  console.log('   Users: admin/password123, finance/password123, sales_mgr/password123, executive/password123');
}

seed();
