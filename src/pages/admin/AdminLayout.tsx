import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Users, FileBarChart, ArrowLeft } from 'lucide-react';
import './AdminLayout.css';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    { to: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
    { to: '/admin/productos', icon: <Package size={18} />, label: 'Productos' },
    { to: '/admin/usuarios', icon: <Users size={18} />, label: 'Usuarios & Roles' },
    { to: '/admin/reportes', icon: <FileBarChart size={18} />, label: 'Reportes & Auditoría' },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-badge">🛡️ ADMIN</span>
          <h3 className="font-display">LEO-CONNECT</h3>
          <p>Panel de Administración</p>
        </div>

        <nav className="admin-sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? 'active' : ''}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-back-btn"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={16} />
            <span>Volver a la Tienda</span>
          </button>
        </div>
      </aside>

      <main className="admin-main-content">
        <Outlet />
      </main>
    </div>
  );
};
