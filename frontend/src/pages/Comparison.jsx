import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import api from '../api';
import { fmt, fmtPct, MONTHS_EN, varianceBg } from '../utils/format';

const STATUS_CONFIG = {
  above: { label: 'ดีกว่าเป้า', badge: 'badge-success', icon: '✅' },
  'on-track': { label: 'ใกล้เคียงเป้า', badge: 'badge-warning', icon: '⚠️' },
  below: { label: 'ต่ำกว่าเป้า', badge: 'badge-danger', icon: '❌' },
};

export default function Comparison() {
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState('');
  const [type, setType] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/actual/comparison?year=${year}${month ? `&month=${month}` : ''}`)
      .then(r => setData(r.data)).finally(() => setLoading(false));
  }, [year, month]);

  const filtered = type ? data.filter(d => d.type === type) : data;

  // Aggregate by month for chart
  const monthlyAgg = {};
  data.forEach(d => {
    if (!monthlyAgg[d.month]) monthlyAgg[d.month] = { month: d.month, rev_budget: 0, rev_actual: 0, exp_budget: 0, exp_actual: 0 };
    if (d.type === 'revenue') { monthlyAgg[d.month].rev_budget += d.budget; monthlyAgg[d.month].rev_actual += d.actual; }
    else { monthlyAgg[d.month].exp_budget += d.budget; monthlyAgg[d.month].exp_actual += d.actual; }
  });
  const chartData = Object.values(monthlyAgg).sort((a, b) => a.month - b.month);

  const totals = filtered.reduce((acc, d) => {
    acc.budget += d.budget; acc.actual += d.actual; acc.variance += d.variance;
    return acc;
  }, { budget: 0, actual: 0, variance: 0 });

  const statusCounts = filtered.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {});

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⚖️ Budget vs Actual</h1>
          <p className="text-gray-500 text-sm">เปรียบเทียบงบประมาณกับผลดำเนินงานจริง</p>
        </div>
        <div className="flex gap-3">
          <select className="input w-36" value={type} onChange={e => setType(e.target.value)}>
            <option value="">ทุกประเภท</option>
            <option value="revenue">รายรับ</option>
            <option value="expense">รายจ่าย</option>
          </select>
          <select className="input w-28" value={month} onChange={e => setMonth(e.target.value)}>
            <option value="">ทุกเดือน</option>
            {MONTHS_EN.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select className="input w-32" value={year} onChange={e => setYear(+e.target.value)}>
            <option value={2025}>2025</option><option value={2026}>2026</option>
          </select>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="card text-center">
            <div className="text-2xl mb-1">{cfg.icon}</div>
            <div className="text-2xl font-bold">{statusCounts[key] || 0}</div>
            <div className="text-sm text-gray-500">{cfg.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Budget vs Actual by Month</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="month" tickFormatter={m => MONTHS_EN[m-1]} tick={{ fontSize: 11 }}/>
              <YAxis tickFormatter={v => v >= 1e6 ? (v/1e6).toFixed(0)+'M' : (v/1e3).toFixed(0)+'K'} tick={{ fontSize: 11 }}/>
              <Tooltip formatter={v => `฿${fmt(v)}`}/>
              <Legend wrapperStyle={{ fontSize: 12 }}/>
              <Bar dataKey="rev_budget" name="Rev Budget" fill="#93c5fd" radius={[2,2,0,0]}/>
              <Bar dataKey="rev_actual" name="Rev Actual" fill="#1e40af" radius={[2,2,0,0]}/>
              <Bar dataKey="exp_budget" name="Exp Budget" fill="#fca5a5" radius={[2,2,0,0]}/>
              <Bar dataKey="exp_actual" name="Exp Actual" fill="#dc2626" radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">รายละเอียดเปรียบเทียบ</h2>
          <div className="text-xs text-gray-500">{filtered.length} รายการ</div>
        </div>
        {loading ? (
          <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"/></div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-3 font-semibold">เดือน</th>
                <th className="text-left py-2 px-3 font-semibold">แผนก</th>
                <th className="text-left py-2 px-3 font-semibold">หมวด</th>
                <th className="text-left py-2 px-3 font-semibold">ประเภท</th>
                <th className="text-right py-2 px-3 font-semibold">Budget</th>
                <th className="text-right py-2 px-3 font-semibold">Actual</th>
                <th className="text-right py-2 px-3 font-semibold">Variance</th>
                <th className="text-right py-2 px-3 font-semibold">%</th>
                <th className="text-center py-2 px-3 font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-gray-400">ไม่มีข้อมูล</td></tr>
              ) : filtered.map((row, i) => {
                const cfg = STATUS_CONFIG[row.status];
                return (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">{MONTHS_EN[row.month-1]}</td>
                    <td className="py-2 px-3">{row.dept}</td>
                    <td className="py-2 px-3">{row.category}</td>
                    <td className="py-2 px-3"><span className={row.type === 'revenue' ? 'badge-info' : 'badge-warning'}>{row.type === 'revenue' ? 'รายรับ' : 'รายจ่าย'}</span></td>
                    <td className="py-2 px-3 text-right">{fmt(row.budget)}</td>
                    <td className="py-2 px-3 text-right font-medium">{fmt(row.actual)}</td>
                    <td className={`py-2 px-3 text-right font-medium ${row.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {row.variance >= 0 ? '+' : ''}{fmt(row.variance)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs ${varianceBg(row.variance, row.type)}`}>
                        {row.variance >= 0 ? '+' : ''}{fmtPct(row.variance_pct)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center"><span className={cfg.badge}>{cfg.icon} {cfg.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold text-sm">
                <td colSpan={4} className="py-2 px-3">รวม</td>
                <td className="py-2 px-3 text-right">{fmt(totals.budget)}</td>
                <td className="py-2 px-3 text-right">{fmt(totals.actual)}</td>
                <td className={`py-2 px-3 text-right ${totals.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totals.variance >= 0 ? '+' : ''}{fmt(totals.variance)}
                </td>
                <td colSpan={2}/>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
