import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import api from '../api';
import { fmt, fmtM, fmtPct, MONTHS_EN } from '../utils/format';

const COLORS = ['#1e40af','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2'];

function KpiCard({ label, value, sub, icon, color, trend }) {
  return (
    <div className={`card border-l-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      {trend !== undefined && (
        <div className={`mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs เป้าหมาย
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-lg font-bold text-gray-800 mb-4">{children}</h2>;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold mb-2">{MONTHS_EN[label-1] || label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {fmtM(p.value)}</p>)}
    </div>
  );
};

export default function Dashboard() {
  const [year, setYear] = useState(2025);
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [deptData, setDeptData] = useState([]);
  const [topCats, setTopCats] = useState({ top_revenue: [], top_expense: [] });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/dashboard/summary?year=${year}`),
      api.get(`/dashboard/monthly-trend?year=${year}`),
      api.get(`/dashboard/kpi?year=${year}`),
      api.get(`/dashboard/by-department?year=${year}`),
      api.get(`/dashboard/top-categories?year=${year}`),
      api.get(`/dashboard/budget-alerts?year=${year}`),
    ]).then(([s, m, k, d, t, a]) => {
      setSummary(s.data); setMonthly(m.data); setKpi(k.data);
      setDeptData(d.data.filter(x => x.revenue_budget > 0 || x.expense_budget > 0 || x.revenue_actual > 0 || x.expense_actual > 0));
      setTopCats(t.data); setAlerts(a.data.filter(x => x.budget > 0));
    }).finally(() => setLoading(false));
  }, [year]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"/>
        <p className="mt-4 text-gray-500">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );

  const profitTrend = monthly.map(m => ({ ...m, profit_budget: m.revenue_budget - m.expense_budget, profit_actual: m.revenue_actual - m.expense_actual }));

  return (
    <div className="p-6 space-y-8 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">ภาพรวมงบประมาณและผลการดำเนินงาน</p>
        </div>
        <select className="input w-32" value={year} onChange={e => setYear(+e.target.value)}>
          <option value={2025}>2025</option>
          <option value={2026}>2026</option>
        </select>
      </div>

      {/* Section 1: Executive Summary */}
      {summary && (
        <section>
          <SectionTitle>📌 Executive Summary</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard label="รายรับประมาณการ" value={fmtM(summary.revenue_budget)} icon="🎯" color="border-blue-500" />
            <KpiCard label="รายรับจริง" value={fmtM(summary.revenue_actual)} icon="💰" color="border-green-500"
              trend={parseFloat(summary.revenue_achievement) - 100} />
            <KpiCard label="รายจ่ายประมาณการ" value={fmtM(summary.expense_budget)} icon="📋" color="border-orange-400" />
            <KpiCard label="รายจ่ายจริง" value={fmtM(summary.expense_actual)} icon="💸" color="border-red-400"
              trend={parseFloat(summary.expense_control) - 100} />
            <KpiCard label="กำไรสุทธิ (Actual)" value={fmtM(summary.profit_actual)} icon="📈" color="border-purple-500" />
            <KpiCard label="% บรรลุเป้าหมาย" value={fmtPct(summary.revenue_achievement)} icon="🏆" color="border-yellow-400" />
          </div>
        </section>
      )}

      {/* Section 2: Charts */}
      <section>
        <SectionTitle>📊 แนวโน้มรายรับ-รายจ่าย</SectionTitle>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm">Revenue Trend (Budget vs Actual)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="revBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#93c5fd" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="revActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tickFormatter={m => MONTHS_EN[m-1]} tick={{ fontSize: 11 }}/>
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }}/>
                <Tooltip content={<CustomTooltip />}/>
                <Legend wrapperStyle={{ fontSize: 12 }}/>
                <Area type="monotone" dataKey="revenue_budget" name="Budget" stroke="#3b82f6" fill="url(#revBudget)" strokeDasharray="5 5"/>
                <Area type="monotone" dataKey="revenue_actual" name="Actual" stroke="#16a34a" fill="url(#revActual)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Expense Trend */}
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm">Expense Trend (Budget vs Actual)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="expBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/><stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/><stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tickFormatter={m => MONTHS_EN[m-1]} tick={{ fontSize: 11 }}/>
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }}/>
                <Tooltip content={<CustomTooltip />}/>
                <Legend wrapperStyle={{ fontSize: 12 }}/>
                <Area type="monotone" dataKey="expense_budget" name="Budget" stroke="#f59e0b" fill="url(#expBudget)" strokeDasharray="5 5"/>
                <Area type="monotone" dataKey="expense_actual" name="Actual" stroke="#dc2626" fill="url(#expActual)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Profit Trend */}
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm">Profit Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={profitTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tickFormatter={m => MONTHS_EN[m-1]} tick={{ fontSize: 11 }}/>
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }}/>
                <Tooltip content={<CustomTooltip />}/>
                <Legend wrapperStyle={{ fontSize: 12 }}/>
                <Line type="monotone" dataKey="profit_budget" name="Budget" stroke="#7c3aed" strokeDasharray="5 5" dot={false}/>
                <Line type="monotone" dataKey="profit_actual" name="Actual" stroke="#0891b2" dot={{ r: 3 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Budget vs Actual Bar */}
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm">Monthly Budget vs Actual (Revenue)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tickFormatter={m => MONTHS_EN[m-1]} tick={{ fontSize: 11 }}/>
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }}/>
                <Tooltip content={<CustomTooltip />}/>
                <Legend wrapperStyle={{ fontSize: 12 }}/>
                <Bar dataKey="revenue_budget" name="Budget" fill="#93c5fd" radius={[2,2,0,0]}/>
                <Bar dataKey="revenue_actual" name="Actual" fill="#1e40af" radius={[2,2,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Section 3: KPIs */}
      {kpi && (
        <section>
          <SectionTitle>🎯 KPI Indicators</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {[
              { label: 'Gross Profit Margin', value: fmtPct(kpi.gross_profit_margin), icon: '📈', good: parseFloat(kpi.gross_profit_margin) > 20 },
              { label: 'Expense Ratio', value: fmtPct(kpi.expense_ratio), icon: '💸', good: parseFloat(kpi.expense_ratio) < 80 },
              { label: 'Revenue Growth', value: fmtPct(kpi.revenue_growth), icon: '📊', good: parseFloat(kpi.revenue_growth) > 0 },
              { label: 'Budget Accuracy (Rev)', value: fmtPct(kpi.budget_accuracy_rev), icon: '🎯', good: parseFloat(kpi.budget_accuracy_rev) > 90 },
              { label: 'Budget Accuracy (Exp)', value: fmtPct(kpi.budget_accuracy_exp), icon: '📋', good: parseFloat(kpi.budget_accuracy_exp) > 90 },
            ].map(k => (
              <div key={k.label} className={`card border-t-4 ${k.good ? 'border-green-500' : 'border-orange-400'}`}>
                <div className="text-2xl mb-2">{k.icon}</div>
                <div className={`text-2xl font-bold ${k.good ? 'text-green-700' : 'text-orange-600'}`}>{k.value}</div>
                <div className="text-xs text-gray-500 mt-1">{k.label}</div>
                <div className={`text-xs mt-2 font-medium ${k.good ? 'text-green-600' : 'text-orange-600'}`}>
                  {k.good ? '✓ ดีกว่าเกณฑ์' : '⚠ ควรปรับปรุง'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 4: Weekly Performance & Alerts */}
      <section>
        <SectionTitle>🏢 Department Performance</SectionTitle>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Dept Chart */}
          <div className="card xl:col-span-2">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm">รายได้จริงตามแผนก</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis type="number" tickFormatter={fmtM} tick={{ fontSize: 11 }}/>
                <YAxis type="category" dataKey="dept" tick={{ fontSize: 11 }} width={80}/>
                <Tooltip formatter={v => fmt(v)}/>
                <Legend wrapperStyle={{ fontSize: 12 }}/>
                <Bar dataKey="revenue_budget" name="Budget" fill="#93c5fd" radius={[0,2,2,0]}/>
                <Bar dataKey="revenue_actual" name="Actual" fill="#1e40af" radius={[0,2,2,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Budget alerts */}
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm">⚠️ Budget Utilization</h3>
            <div className="space-y-3">
              {alerts.map((a, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-gray-700">{a.dept}</span>
                    <span className={a.over_budget ? 'text-red-600 font-bold' : 'text-gray-600'}>{a.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${parseFloat(a.pct) > 100 ? 'bg-red-500' : parseFloat(a.pct) > 80 ? 'bg-yellow-400' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(parseFloat(a.pct), 100)}%` }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Top categories */}
      <section>
        <SectionTitle>🔝 Top Categories</SectionTitle>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm">💰 Top 5 รายรับสูงสุด</h3>
            <div className="space-y-3">
              {topCats.top_revenue.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-blue-700 w-6">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.dept}</div>
                  </div>
                  <span className="text-sm font-bold text-green-700">฿{fmtM(t.total)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm">💸 Top 5 ค่าใช้จ่ายสูงสุด</h3>
            <div className="space-y-3">
              {topCats.top_expense.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-red-600 w-6">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.dept}</div>
                  </div>
                  <span className="text-sm font-bold text-red-600">฿{fmtM(t.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
