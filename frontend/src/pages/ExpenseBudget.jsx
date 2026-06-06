import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, MONTHS_EN } from '../utils/format';

const STATUS_BADGE = { draft: 'badge-info', pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };
const STATUS_TH = { draft: 'ร่าง', pending: 'รอพิจารณา', approved: 'อนุมัติ', rejected: 'ปฏิเสธ' };

export default function ExpenseBudget() {
  const [year, setYear] = useState(2025);
  const [depts, setDepts] = useState([]);
  const [cats, setCats] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [form, setForm] = useState({ fiscal_year_id: '', department_id: '', category_id: '', month: 1, amount: '', notes: '' });
  const [fyId, setFyId] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterDept, setFilterDept] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/budget/departments'),
      api.get('/budget/categories?type=expense'),
      api.get('/budget/fiscal-years'),
    ]).then(([d, c, fy]) => {
      setDepts(d.data); setCats(c.data);
      const fyYear = fy.data.find(f => f.year === year);
      if (fyYear) { setFyId(fyYear.id); setForm(f => ({ ...f, fiscal_year_id: fyYear.id })); }
    });
  }, [year]);

  useEffect(() => {
    if (!fyId) return;
    api.get(`/budget/expense?year=${year}${filterDept ? `&dept_id=${filterDept}` : ''}`).then(r => setBudgets(r.data));
  }, [fyId, year, filterDept]);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setMsg('');
    try {
      await api.post('/budget/expense', form);
      setMsg('✅ บันทึกสำเร็จ');
      api.get(`/budget/expense?year=${year}`).then(r => setBudgets(r.data));
    } catch { setMsg('❌ เกิดข้อผิดพลาด'); }
    finally { setLoading(false); }
  }

  // Group by dept+cat
  const matrix = {};
  budgets.forEach(b => {
    const key = `${b.department_id}-${b.category_id}`;
    if (!matrix[key]) matrix[key] = { dept: b.dept_name, cat: b.cat_name, status: b.status, months: {} };
    matrix[key].months[b.month] = b.amount;
  });

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const catTotals = {};
  cats.forEach(c => {
    catTotals[c.name] = budgets.filter(b => b.cat_name === c.name).reduce((s, b) => s + b.amount, 0);
  });

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 งบประมาณรายจ่าย</h1>
          <p className="text-gray-500 text-sm">Expense Budget Planning</p>
        </div>
        <div className="flex gap-3">
          <select className="input w-40" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">ทุกแผนก</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="input w-32" value={year} onChange={e => setYear(+e.target.value)}>
            <option value={2025}>2025</option><option value={2026}>2026</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card border-l-4 border-orange-400">
          <div className="text-xs text-gray-500">งบประมาณทั้งหมด</div>
          <div className="text-xl font-bold mt-1">฿{fmt(totalBudget)}</div>
        </div>
        {Object.entries(catTotals).filter(([,v]) => v > 0).slice(0,3).map(([k, v]) => (
          <div key={k} className="card border-l-4 border-gray-300">
            <div className="text-xs text-gray-500 truncate">{k}</div>
            <div className="text-xl font-bold mt-1">฿{fmt(v)}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">บันทึกงบประมาณรายจ่าย</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="label">แผนก</label>
            <select className="input" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} required>
              <option value="">เลือกแผนก</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">หมวดค่าใช้จ่าย</label>
            <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
              <option value="">เลือกหมวด</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">เดือน</label>
            <select className="input" value={form.month} onChange={e => setForm(f => ({ ...f, month: +e.target.value }))}>
              {MONTHS_EN.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">จำนวนเงิน (บาท)</label>
            <input className="input" type="number" placeholder="0" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          </div>
          <div>
            <label className="label">หมายเหตุ</label>
            <input className="input" placeholder="หมายเหตุ" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'บันทึก...' : 'บันทึก'}</button>
          </div>
        </form>
        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <h2 className="font-semibold text-gray-800 mb-4">ตารางงบประมาณรายจ่าย ปี {year}</h2>
        {Object.keys(matrix).length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">ยังไม่มีข้อมูล</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-orange-50">
                <th className="text-left py-2 px-3 font-semibold">แผนก / หมวด</th>
                <th className="text-left py-2 px-3 font-semibold">สถานะ</th>
                {MONTHS_EN.map(m => <th key={m} className="py-2 px-2 text-right font-semibold">{m}</th>)}
                <th className="py-2 px-3 text-right font-semibold">รวม</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(matrix).map(([key, row]) => {
                const total = Object.values(row.months).reduce((s, v) => s + (v || 0), 0);
                return (
                  <tr key={key} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="font-medium">{row.dept}</div>
                      <div className="text-gray-500">{row.cat}</div>
                    </td>
                    <td className="py-2 px-3"><span className={STATUS_BADGE[row.status]}>{STATUS_TH[row.status]}</span></td>
                    {Array.from({length:12},(_,i)=>i+1).map(m => (
                      <td key={m} className="py-2 px-2 text-right">{row.months[m] ? fmt(row.months[m]) : '-'}</td>
                    ))}
                    <td className="py-2 px-3 text-right font-bold text-orange-600">{fmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
