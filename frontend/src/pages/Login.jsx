import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demo = [
    { username: 'admin', password: 'password123', role: 'Admin', color: 'bg-red-50 border-red-200 text-red-700' },
    { username: 'finance', password: 'password123', role: 'Finance Manager', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { username: 'sales_mgr', password: 'password123', role: 'Dept. Manager', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    { username: 'executive', password: 'password123', role: 'Executive', color: 'bg-green-50 border-green-200 text-green-700' },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/dashboard');
    } catch {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📊</div>
          <h1 className="text-2xl font-bold text-white">Budget Planning System</h1>
          <p className="text-blue-200 mt-1">ระบบบริหารงบประมาณบริษัท</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">ชื่อผู้ใช้</label>
              <input className="input" placeholder="username" value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div>
              <label className="label">รหัสผ่าน</label>
              <input className="input" type="password" placeholder="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
            <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="mt-6">
            <p className="text-xs text-gray-500 text-center mb-3">Demo accounts (คลิกเพื่อเข้าสู่ระบบ)</p>
            <div className="grid grid-cols-2 gap-2">
              {demo.map(d => (
                <button key={d.username} onClick={() => { setForm({ username: d.username, password: d.password }); }}
                  className={`border rounded-lg p-2 text-left text-xs transition hover:opacity-80 ${d.color}`}>
                  <div className="font-semibold">{d.username}</div>
                  <div className="opacity-70">{d.role}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
