import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, MONTHS_EN } from '../utils/format';

export default function ActualEntry() {
  const [tab, setTab] = useState('revenue');
  const [year, setYear] = useState(2025);
  const [depts, setDepts] = useState([]);
  const [cats, setCats] = useState([]);
  const [records, setRecords] = useState([]);
  const [fyId, setFyId] = useState(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [form, setForm] = useState({ fiscal_year_id: '', department_id: '', category_id: '', transaction_date: '', amount: '', reference_no: '', description: '', vendor: '' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/budget/departments'), api.get('/budget/fiscal-years')]).then(([d, fy]) => {
      setDepts(d.data);
      const fyYear = fy.data.find(f => f.year === year);
      if (fyYear) { setFyId(fyYear.id); setForm(f => ({ ...f, fiscal_year_id: fyYear.id })); }
    });
  }, [year]);

  useEffect(() => {
    api.get(`/budget/categories?type=${tab}`).then(r => setCats(r.data));
  }, [tab]);

  useEffect(() => {
    if (!fyId) return;
    const url = `/actual/${tab}?year=${year}${filterMonth ? `&month=${filterMonth}` : ''}`;
    api.get(url).then(r => setRecords(r.data));
  }, [fyId, year, tab, filterMonth]);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setMsg('');
    try {
      await api.post(`/actual/${tab}`, form);
      setMsg('✅ บันทึกสำเร็จ');
      const url = `/actual/${tab}?year=${year}${filterMonth ? `&month=${filterMonth}` : ''}`;
      api.get(url).then(r => setRecords(r.data));
      setForm(f => ({ ...f, amount: '', reference_no: '', description: '', vendor: '' }));
    } catch { setMsg('❌ เกิดข้อผิดพลาด'); }
    finally { setLoading(false); }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file || !fyId) return;
    setImporting(true); setImportResult(null);
    const fd = new FormData();
    fd.append('file', file); fd.append('type', tab); fd.append('fiscal_year_id', fyId);
    try {
      const r = await api.post('/actual/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(r.data);
      api.get(`/actual/${tab}?year=${year}`).then(r => setRecords(r.data));
    } catch (err) { setImportResult({ error: err.response?.data?.error || 'Import failed' }); }
    finally { setImporting(false); e.target.value = ''; }
  }

  const total = records.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">✏️ บันทึกผลจริง</h1>
          <p className="text-gray-500 text-sm">Actual Revenue & Expense Entry</p>
        </div>
        <div className="flex gap-3">
          <select className="input w-28" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <option value="">ทุกเดือน</option>
            {MONTHS_EN.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select className="input w-32" value={year} onChange={e => setYear(+e.target.value)}>
            <option value={2025}>2025</option><option value={2026}>2026</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {['revenue','expense'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}>
            {t === 'revenue' ? '💰 รายรับ' : '💸 รายจ่าย'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="card border-l-4 border-blue-500">
        <div className="flex items-center gap-6">
          <div><div className="text-xs text-gray-500">รายการทั้งหมด</div><div className="text-xl font-bold">{records.length}</div></div>
          <div><div className="text-xs text-gray-500">ยอดรวม</div><div className={`text-xl font-bold ${tab === 'revenue' ? 'text-green-700' : 'text-red-600'}`}>฿{fmt(total)}</div></div>
        </div>
      </div>

      {/* Import CSV */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">นำเข้าข้อมูล CSV/Excel</h2>
          <label className={`btn-secondary cursor-pointer flex items-center gap-2 ${importing ? 'opacity-50' : ''}`}>
            📥 {importing ? 'กำลังนำเข้า...' : 'นำเข้าไฟล์'}
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </div>
        <p className="text-xs text-gray-500">รูปแบบ CSV: date, department, category, amount, reference_no, description{tab === 'expense' ? ', vendor' : ''}</p>
        {importResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${importResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {importResult.error ? `❌ ${importResult.error}` : `✅ นำเข้าสำเร็จ ${importResult.imported}/${importResult.total} รายการ`}
            {importResult.errors?.length > 0 && <div className="mt-1 text-xs">{importResult.errors.join(', ')}</div>}
          </div>
        )}
      </div>

      {/* Manual Entry Form */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">บันทึกรายการ</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="label">วันที่</label>
            <input className="input" type="date" value={form.transaction_date}
              onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} required />
          </div>
          <div>
            <label className="label">แผนก</label>
            <select className="input" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} required>
              <option value="">เลือกแผนก</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">หมวด</label>
            <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
              <option value="">เลือกหมวด</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">จำนวนเงิน</label>
            <input className="input" type="number" placeholder="0" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          </div>
          <div>
            <label className="label">เลขที่อ้างอิง</label>
            <input className="input" placeholder="REF-001" value={form.reference_no}
              onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))} />
          </div>
          {tab === 'expense' && (
            <div>
              <label className="label">ผู้ขาย/Vendor</label>
              <input className="input" placeholder="Vendor name" value={form.vendor}
                onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
            </div>
          )}
          <div className={tab === 'expense' ? 'col-span-2 md:col-span-3 xl:col-span-5' : 'xl:col-span-1'}>
            <label className="label">รายละเอียด</label>
            <input className="input" placeholder="รายละเอียด" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'บันทึก...' : 'บันทึก'}</button>
          </div>
        </form>
        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </div>

      {/* Records Table */}
      <div className="card overflow-x-auto">
        <h2 className="font-semibold text-gray-800 mb-4">รายการ{tab === 'revenue' ? 'รายรับ' : 'รายจ่าย'}จริง</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left py-2 px-3">วันที่</th>
              <th className="text-left py-2 px-3">แผนก</th>
              <th className="text-left py-2 px-3">หมวด</th>
              {tab === 'expense' && <th className="text-left py-2 px-3">Vendor</th>}
              <th className="text-left py-2 px-3">รายละเอียด</th>
              <th className="text-left py-2 px-3">เลขที่อ้างอิง</th>
              <th className="text-right py-2 px-3">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">ยังไม่มีข้อมูล</td></tr>
            ) : records.map(r => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3">{r.transaction_date}</td>
                <td className="py-2 px-3">{r.dept_name}</td>
                <td className="py-2 px-3">{r.cat_name}</td>
                {tab === 'expense' && <td className="py-2 px-3">{r.vendor || '-'}</td>}
                <td className="py-2 px-3 max-w-xs truncate">{r.description || '-'}</td>
                <td className="py-2 px-3">{r.reference_no || '-'}</td>
                <td className={`py-2 px-3 text-right font-medium ${tab === 'revenue' ? 'text-green-700' : 'text-red-600'}`}>
                  {fmt(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
              <td colSpan={tab === 'expense' ? 6 : 5} className="py-2 px-3 text-right text-sm">รวมทั้งหมด</td>
              <td className={`py-2 px-3 text-right text-sm ${tab === 'revenue' ? 'text-green-700' : 'text-red-600'}`}>
                ฿{fmt(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
