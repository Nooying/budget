import { useState, useEffect } from 'react';
import api from '../api';

const ROLES = { admin: 'Admin', finance_manager: 'Finance Manager', dept_manager: 'Dept. Manager', executive: 'Executive' };
const ROLE_BADGE = { admin: 'badge-danger', finance_manager: 'badge-info', dept_manager: 'badge-warning', executive: 'badge-success' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', role: 'dept_manager', department_id: '' });
  const [msg, setMsg] = useState('');

  // Since we don't have a full user CRUD API, show mock management UI
  useEffect(() => {
    Promise.all([api.get('/budget/departments')]).then(([d]) => {
      setDepts(d.data);
      // Mock users display from auth/me context
      setUsers([
        { id:1, username:'admin', full_name:'System Admin', email:'admin@company.com', role:'admin', dept_name:'Executive', is_active:1 },
        { id:2, username:'finance', full_name:'Finance Manager', email:'finance@company.com', role:'finance_manager', dept_name:'Finance', is_active:1 },
        { id:3, username:'sales_mgr', full_name:'Sales Manager', email:'sales@company.com', role:'dept_manager', dept_name:'Sales', is_active:1 },
        { id:4, username:'executive', full_name:'Chief Executive Officer', email:'ceo@company.com', role:'executive', dept_name:'Executive', is_active:1 },
      ]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">👥 ผู้ใช้งานระบบ</h1>
        <p className="text-gray-500 text-sm">User Management</p>
      </div>

      {/* Add User Form */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">เพิ่มผู้ใช้งาน</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <div><label className="label">ชื่อ-นามสกุล</label><input className="input" placeholder="Full name" value={form.full_name} onChange={e => setForm(f=>({...f,full_name:e.target.value}))}/></div>
          <div><label className="label">Username</label><input className="input" placeholder="username" value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value}))}/></div>
          <div><label className="label">Email</label><input className="input" type="email" placeholder="email@company.com" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))}/></div>
          <div><label className="label">Password</label><input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))}/></div>
          <div>
            <label className="label">สิทธิ์</label>
            <select className="input" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
              {Object.entries(ROLES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">แผนก</label>
            <select className="input" value={form.department_id} onChange={e => setForm(f=>({...f,department_id:e.target.value}))}>
              <option value="">เลือกแผนก</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button className="btn-primary" onClick={() => setMsg('✅ บันทึกผู้ใช้งานสำเร็จ (Demo mode)')}>บันทึก</button>
          {msg && <span className="text-sm self-center">{msg}</span>}
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">รายการผู้ใช้งาน</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold">ชื่อ</th>
              <th className="text-left py-3 px-4 font-semibold">Username</th>
              <th className="text-left py-3 px-4 font-semibold">Email</th>
              <th className="text-left py-3 px-4 font-semibold">สิทธิ์</th>
              <th className="text-left py-3 px-4 font-semibold">แผนก</th>
              <th className="text-left py-3 px-4 font-semibold">สถานะ</th>
              <th className="text-left py-3 px-4 font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{u.full_name}</td>
                <td className="py-3 px-4 text-gray-600">@{u.username}</td>
                <td className="py-3 px-4 text-gray-600">{u.email}</td>
                <td className="py-3 px-4"><span className={ROLE_BADGE[u.role]}>{ROLES[u.role]}</span></td>
                <td className="py-3 px-4">{u.dept_name}</td>
                <td className="py-3 px-4"><span className={u.is_active ? 'badge-success' : 'badge-danger'}>{u.is_active ? 'ใช้งาน' : 'ปิดใช้'}</span></td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">แก้ไข</button>
                    <button className="text-red-500 hover:text-red-700 text-xs font-medium">ปิดใช้</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Permissions */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">สิทธิ์การเข้าถึง</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-4">ฟังก์ชัน</th>
                {Object.values(ROLES).map(r => <th key={r} className="py-2 px-4 text-center">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Dashboard', true, true, true, true],
                ['งบรายรับ (ดู)', true, true, false, true],
                ['งบรายรับ (แก้ไข)', true, true, false, false],
                ['งบรายจ่าย (ดู)', true, true, true, true],
                ['งบรายจ่าย (แก้ไข)', true, true, true, false],
                ['บันทึกผลจริง', true, true, true, false],
                ['Budget vs Actual', true, true, true, true],
                ['รายงาน', true, true, false, true],
                ['อนุมัติงบประมาณ', true, true, false, false],
                ['จัดการผู้ใช้', true, false, false, false],
              ].map(([feature, ...perms]) => (
                <tr key={feature} className="border-t border-gray-100">
                  <td className="py-2 px-4 font-medium">{feature}</td>
                  {perms.map((p, i) => (
                    <td key={i} className="py-2 px-4 text-center">{p ? '✅' : '❌'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
