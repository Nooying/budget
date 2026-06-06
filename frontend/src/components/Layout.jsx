import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['admin','finance_manager','dept_manager','executive'] },
  { to: '/revenue-budget', label: 'งบรายรับ', icon: '💰', roles: ['admin','finance_manager'] },
  { to: '/expense-budget', label: 'งบรายจ่าย', icon: '📋', roles: ['admin','finance_manager','dept_manager'] },
  { to: '/actual', label: 'บันทึกผลจริง', icon: '✏️', roles: ['admin','finance_manager','dept_manager'] },
  { to: '/comparison', label: 'Budget vs Actual', icon: '⚖️', roles: ['admin','finance_manager','dept_manager','executive'] },
  { to: '/reports', label: 'รายงาน', icon: '📄', roles: ['admin','finance_manager','executive'] },
  { to: '/users', label: 'ผู้ใช้งาน', icon: '👥', roles: ['admin'] },
];

const roleLabel = { admin: 'Admin', finance_manager: 'Finance Manager', dept_manager: 'Dept. Manager', executive: 'Executive' };
const roleBadge = { admin: 'badge-danger', finance_manager: 'badge-info', dept_manager: 'badge-warning', executive: 'badge-success' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const allowed = nav.filter(n => n.roles.includes(user?.role));

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col transition-all duration-300 shrink-0`}>
        <div className="p-4 flex items-center gap-3 border-b border-blue-700">
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm leading-tight">Budget Planning</div>
              <div className="text-blue-300 text-xs">& Actual Tracking</div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)} className="text-blue-300 hover:text-white p-1 rounded">
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
          {allowed.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isActive ? 'bg-blue-700 text-white font-medium' : 'text-blue-200 hover:bg-blue-700/50 hover:text-white'}`
              }>
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-700">
          {!collapsed && (
            <div className="mb-3">
              <div className="font-medium text-sm truncate">{user?.full_name}</div>
              <span className={`${roleBadge[user?.role]} text-xs mt-1`}>{roleLabel[user?.role]}</span>
            </div>
          )}
          <button onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-2 text-blue-300 hover:text-white text-sm w-full">
            <span>🚪</span>{!collapsed && 'ออกจากระบบ'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
