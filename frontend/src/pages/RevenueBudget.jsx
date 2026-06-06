import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, MONTHS_EN } from '../utils/format';

export default function RevenueBudget() {
  const [year, setYear] = useState(2025);
  const [depts, setDepts] = useState([]);
  const [cats, setCats] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [form, setForm] = useState({ fiscal_year_id: '', department_id: '', category_id: '', month: 1, amount: '', notes: '' });
  const [fyId, setFyId] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/budget/departments'),
      api.get('/budget/categories?type=revenue'),
      api.get('/budget/fiscal-years'),
    ]).then(([d, c, fy]) => {
      setDepts(d.data); setCats(c.data);
      const fyYear = fy.data.find(f => f.year === year);
      if (fyYear) { setFyId(fyYear.id); setForm(f => ({ ...f, fiscal_year_id: fyYear.id })); }
    });
  }, [year]);

  useEffect(() => {
    if (!fyId) return;
    api.get(`/budget/revenue?year=${year}`).then(r => setBudgets(r.data));
  }, [fyId, year]);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setMsg('');
    try {
      await api.post('/budget/revenue', form);
      setMsg('✅ บันทึกสำเร็จ');
      api.get(`/budget/revenue?year=${year}`).then(r => setBudgets(r.data));
    } catch { setMsg('❌ เกิดข้อผิดพลาด'); }
    finally { setLoading(false); }
  }

  // Build matrix: dept x month
  const matrix = {};
  budgets.forEach(b => {
    const key = `${b.department_id}-${b.category_id}`;
    if (!matrix[key]) matrix[key] = { dept: b.dept_name, cat: b.cat_name, months: {} };
    matrix[key].months[b.month] = b.amount;
  });

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 งบประมาณรายรับ</h1>
          <p className="text-gray-500 text-sm">Revenue Budget Planning</p>
        </div>
        <select className="input w-32" value={year} onChange={e => setYear(+e.target.value)}>
          <option value={2025}>2025</option><option value={2026}>2026</option>
        </select>
      </div>

      {/* Form */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">บันทึกงบประมาณรายรับ</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="label">แผนก</label>
            <select className="input" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} required>
              <option value="">เลือกแผนก</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">หมวดรายรับ</label>
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

      {/* Matrix Table */}
      <div className="card overflow-x-auto">
        <h2 className="font-semibold text-gray-800 mb-4">ตารางงบประมาณรายรับ ปี {year}</h2>
        {Object.keys(matrix).length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">ยังไม่มีข้อมูล</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-50">
                <th className="text-left py-2 px-3 font-semibold">แผนก / หมวด</th>
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
                    {Array.from({length:12},(_,i)=>i+1).map(m => (
                      <td key={m} className="py-2 px-2 text-right">{row.months[m] ? fmt(row.months[m]) : '-'}</td>
                    ))}
                    <td className="py-2 px-3 text-right font-bold text-blue-700">{fmt(total)}</td>
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
