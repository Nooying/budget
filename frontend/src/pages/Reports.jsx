import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, fmtM, fmtPct, MONTHS_EN } from '../utils/format';

export default function Reports() {
  const [year, setYear] = useState(2025);
  const [reportType, setReportType] = useState('monthly');
  const [month, setMonth] = useState(1);
  const [quarter, setQuarter] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generateReport() {
    setLoading(true);
    try {
      const [summary, monthly, kpi, comparison] = await Promise.all([
        api.get(`/dashboard/summary?year=${year}`),
        api.get(`/dashboard/monthly-trend?year=${year}`),
        api.get(`/dashboard/kpi?year=${year}`),
        api.get(`/actual/comparison?year=${year}`),
      ]);
      setData({ summary: summary.data, monthly: monthly.data, kpi: kpi.data, comparison: comparison.data });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { generateReport(); }, [year]);

  function printReport() { window.print(); }

  function exportCSV() {
    if (!data) return;
    const rows = [['Month','Rev Budget','Rev Actual','Rev Variance','Exp Budget','Exp Actual','Exp Variance','Profit Budget','Profit Actual']];
    data.monthly.forEach(m => {
      const profB = m.revenue_budget - m.expense_budget;
      const profA = m.revenue_actual - m.expense_actual;
      rows.push([MONTHS_EN[m.month-1], m.revenue_budget, m.revenue_actual, m.revenue_actual-m.revenue_budget,
        m.expense_budget, m.expense_actual, m.expense_actual-m.expense_budget, profB, profA]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `budget_report_${year}.csv`; a.click();
  }

  const quarterMonths = { 1:[1,2,3], 2:[4,5,6], 3:[7,8,9], 4:[10,11,12] };

  function getFilteredMonths() {
    if (!data) return [];
    if (reportType === 'monthly') return data.monthly.filter(m => m.month === month);
    if (reportType === 'quarterly') return data.monthly.filter(m => quarterMonths[quarter].includes(m.month));
    return data.monthly;
  }

  const filtered = getFilteredMonths();
  const totals = filtered.reduce((acc, m) => ({
    rev_budget: acc.rev_budget + m.revenue_budget,
    rev_actual: acc.rev_actual + m.revenue_actual,
    exp_budget: acc.exp_budget + m.expense_budget,
    exp_actual: acc.exp_actual + m.expense_actual,
  }), { rev_budget: 0, rev_actual: 0, exp_budget: 0, exp_actual: 0 });

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📄 รายงาน</h1>
          <p className="text-gray-500 text-sm">Budget & Actual Reports</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">📥 Export CSV</button>
          <button onClick={printReport} className="btn-secondary flex items-center gap-2">🖨️ Print</button>
          <select className="input w-32" value={year} onChange={e => setYear(+e.target.value)}>
            <option value={2025}>2025</option><option value={2026}>2026</option>
          </select>
        </div>
      </div>

      {/* Report type selector */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">ประเภทรายงาน</label>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {[['monthly','รายเดือน'],['quarterly','รายไตรมาส'],['annual','รายปี']].map(([val, lbl]) => (
                <button key={val} onClick={() => setReportType(val)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${reportType === val ? 'bg-white shadow text-blue-700' : 'text-gray-600'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {reportType === 'monthly' && (
            <div>
              <label className="label">เดือน</label>
              <select className="input w-32" value={month} onChange={e => setMonth(+e.target.value)}>
                {MONTHS_EN.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
          )}
          {reportType === 'quarterly' && (
            <div>
              <label className="label">ไตรมาส</label>
              <select className="input w-32" value={quarter} onChange={e => setQuarter(+e.target.value)}>
                {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"/></div>
      ) : data && (
        <div id="print-area" className="space-y-6">
          {/* Report Header */}
          <div className="card bg-gradient-to-r from-blue-900 to-blue-700 text-white">
            <div className="text-center">
              <h2 className="text-xl font-bold">รายงาน{reportType === 'monthly' ? `รายเดือน — ${MONTHS_EN[month-1]}` : reportType === 'quarterly' ? ` ไตรมาส Q${quarter}` : 'ประจำปี'} {year}</h2>
              <p className="text-blue-200 text-sm mt-1">Budget Planning & Actual Tracking System</p>
              <p className="text-blue-300 text-xs mt-1">สร้างเมื่อ: {new Date().toLocaleString('th-TH')}</p>
            </div>
          </div>

          {/* Summary Table */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">สรุปผลดำเนินงาน</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'รายรับประมาณการ', value: totals.rev_budget, color: 'text-blue-700' },
                { label: 'รายรับจริง', value: totals.rev_actual, color: 'text-green-700' },
                { label: 'รายจ่ายประมาณการ', value: totals.exp_budget, color: 'text-orange-600' },
                { label: 'รายจ่ายจริง', value: totals.exp_actual, color: 'text-red-600' },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                  <div className={`text-lg font-bold ${item.color}`}>฿{fmtM(item.value)}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">กำไรสุทธิ (Budget)</div>
                <div className="text-lg font-bold text-purple-700">฿{fmtM(totals.rev_budget - totals.exp_budget)}</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">กำไรสุทธิ (Actual)</div>
                <div className={`text-lg font-bold ${totals.rev_actual - totals.exp_actual >= 0 ? 'text-purple-700' : 'text-red-600'}`}>฿{fmtM(totals.rev_actual - totals.exp_actual)}</div>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">% บรรลุเป้าหมาย (Rev)</div>
                <div className="text-lg font-bold text-yellow-700">{totals.rev_budget > 0 ? fmtPct(totals.rev_actual/totals.rev_budget*100) : '0%'}</div>
              </div>
            </div>
          </div>

          {/* Monthly breakdown table */}
          <div className="card overflow-x-auto">
            <h3 className="font-semibold text-gray-800 mb-4">ตารางรายละเอียด</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-50">
                  <th className="text-left py-3 px-4 font-semibold">เดือน</th>
                  <th className="text-right py-3 px-4 font-semibold">Rev Budget</th>
                  <th className="text-right py-3 px-4 font-semibold">Rev Actual</th>
                  <th className="text-right py-3 px-4 font-semibold">Rev Var</th>
                  <th className="text-right py-3 px-4 font-semibold">Exp Budget</th>
                  <th className="text-right py-3 px-4 font-semibold">Exp Actual</th>
                  <th className="text-right py-3 px-4 font-semibold">Exp Var</th>
                  <th className="text-right py-3 px-4 font-semibold">Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const revVar = m.revenue_actual - m.revenue_budget;
                  const expVar = m.expense_actual - m.expense_budget;
                  const profit = m.revenue_actual - m.expense_actual;
                  return (
                    <tr key={m.month} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{MONTHS_EN[m.month-1]}</td>
                      <td className="py-3 px-4 text-right">{fmt(m.revenue_budget)}</td>
                      <td className="py-3 px-4 text-right font-medium">{fmt(m.revenue_actual)}</td>
                      <td className={`py-3 px-4 text-right font-medium ${revVar >= 0 ? 'text-green-600' : 'text-red-600'}`}>{revVar >= 0 ? '+' : ''}{fmt(revVar)}</td>
                      <td className="py-3 px-4 text-right">{fmt(m.expense_budget)}</td>
                      <td className="py-3 px-4 text-right font-medium">{fmt(m.expense_actual)}</td>
                      <td className={`py-3 px-4 text-right font-medium ${expVar <= 0 ? 'text-green-600' : 'text-red-600'}`}>{expVar >= 0 ? '+' : ''}{fmt(expVar)}</td>
                      <td className={`py-3 px-4 text-right font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(profit)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-400 font-bold">
                  <td className="py-3 px-4">รวม</td>
                  <td className="py-3 px-4 text-right">{fmt(totals.rev_budget)}</td>
                  <td className="py-3 px-4 text-right">{fmt(totals.rev_actual)}</td>
                  <td className={`py-3 px-4 text-right ${totals.rev_actual - totals.rev_budget >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totals.rev_actual - totals.rev_budget >= 0 ? '+' : ''}{fmt(totals.rev_actual - totals.rev_budget)}</td>
                  <td className="py-3 px-4 text-right">{fmt(totals.exp_budget)}</td>
                  <td className="py-3 px-4 text-right">{fmt(totals.exp_actual)}</td>
                  <td className={`py-3 px-4 text-right ${totals.exp_actual - totals.exp_budget <= 0 ? 'text-green-600' : 'text-red-600'}`}>{totals.exp_actual - totals.exp_budget >= 0 ? '+' : ''}{fmt(totals.exp_actual - totals.exp_budget)}</td>
                  <td className={`py-3 px-4 text-right ${totals.rev_actual - totals.exp_actual >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(totals.rev_actual - totals.exp_actual)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* KPI Report */}
          {data.kpi && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">KPI Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  ['Gross Profit Margin', fmtPct(data.kpi.gross_profit_margin), data.kpi.gross_profit_margin > 20],
                  ['Net Profit Margin', fmtPct(data.kpi.net_profit_margin), data.kpi.net_profit_margin > 15],
                  ['Expense Ratio', fmtPct(data.kpi.expense_ratio), data.kpi.expense_ratio < 80],
                  ['Revenue Growth', fmtPct(data.kpi.revenue_growth), data.kpi.revenue_growth > 0],
                  ['Budget Accuracy', fmtPct(data.kpi.budget_accuracy_rev), data.kpi.budget_accuracy_rev > 90],
                ].map(([label, value, isGood]) => (
                  <div key={label} className={`rounded-xl p-4 text-center ${isGood ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <div className={`text-xl font-bold ${isGood ? 'text-green-700' : 'text-orange-600'}`}>{value}</div>
                    <div className="text-xs text-gray-500 mt-1">{label}</div>
                    <div className={`text-xs mt-1 ${isGood ? 'text-green-600' : 'text-orange-500'}`}>{isGood ? '✓ ดี' : '⚠ ควรปรับ'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
