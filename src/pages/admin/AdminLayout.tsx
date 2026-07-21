import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Users, FileBarChart, ArrowLeft, Bell, Clock, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AdminLayout.css';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
          <div className="admin-logo-area">
            <div className="admin-logo-icon">🛡️</div>
            <div>
              <h3 className="font-display">LEO-CONNECT</h3>
              <span className="admin-badge">ADMIN PRO</span>
            </div>
          </div>
        </div>

        <div className="admin-user-profile">
          <div className="admin-avatar">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user?.name} />
            ) : (
              <UserIcon size={20} />
            )}
          </div>
          <div className="admin-user-info">
            <div className="admin-user-name">{user?.name || 'Administrador'}</div>
            <div className="admin-user-role">{user?.email}</div>
          </div>
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
          <div className="admin-clock">
            <Clock size={14} />
            <span>{time.toLocaleTimeString('es-EC')}</span>
          </div>
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
        <header className="admin-top-navbar">
          <div className="admin-top-search">
            {/* Search or breadcrumbs could go here */}
          </div>
          <div className="admin-top-actions">
            <button className="admin-notification-btn">
              <Bell size={20} />
              <span className="notification-dot"></span>
            </button>
          </div>
        </header>
        <div className="admin-content-scroll">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
