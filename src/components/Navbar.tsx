import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';
import { ShoppingCart, User as UserIcon, LogOut, FileText, Sparkles, ShieldCheck, Store } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { MisFacturasModal } from './MisFacturasModal';
import heroLogo from '../assets/hero.png';

export const Navbar: React.FC = () => {
  const [menuActive, setMenuActive] = useState(false);
  const [facturasModalOpen, setFacturasModalOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { items, getCartTotal } = useCart();
  const { user, openAuthModal, logout } = useAuth();
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = getCartTotal();

  return (
    <header className="elranchito-navbar">
      <div className="navbar-inner">
        {/* Brand Logo Left */}
        <div className="navbar-brand">
          <Link to="/">
            <img src={heroLogo} alt="Lácteos Leo Cotopaxi" className="brand-logo-img" />
          </Link>
        </div>

        {/* Desktop Menu Center */}
        <nav className="desktop-menu font-display">
          <Link to="/" className={`menu-link ${isHome ? 'active' : ''}`}>
            INICIO
          </Link>
          <a href={isHome ? '#historia' : '/#historia'} className="menu-link">
            NOSOTROS
          </a>
          <Link to="/productos" className="menu-link">
            CATÁLOGO
          </Link>
          <a href={isHome ? '#contacto' : '/#contacto'} className="menu-link">
            CONTACTO
          </a>
          {/* Admin y Vendedor links se movieron a la derecha para mayor prominencia */}
        </nav>

        {/* Right Action Block */}
        <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {!user ? (
            <div className="auth-nav-buttons">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="font-display"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  padding: '9px 22px',
                  borderRadius: '32px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px',
                  letterSpacing: '0.02em',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(4px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(22, 163, 74, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(22, 163, 74, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
                }}
              >
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px', borderRadius: '50%', display: 'flex' }}>
                  <UserIcon size={15} />
                </div>
                <span>Ingresar / Registrarse</span>
                <Sparkles size={14} style={{ opacity: 0.85 }} />
              </button>
            </div>
          ) : (
            <div className="user-cart-block" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.role === 'administrador' && (
                <Link
                  to="/admin"
                  className="font-display"
                  style={{ 
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)', 
                    color: '#fff', 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '8px 16px', 
                    borderRadius: '24px', 
                    fontSize: '13px', 
                    textDecoration: 'none', 
                    fontWeight: 800, 
                    boxShadow: '0 4px 12px rgba(67, 56, 202, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    letterSpacing: '0.03em'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(67, 56, 202, 0.5)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #312e81 0%, #4f46e5 100%)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(67, 56, 202, 0.3)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)';
                  }}
                  title="Entrar al Panel de Administración y Control"
                >
                  <ShieldCheck size={16} style={{ color: '#818cf8' }} /> ADMIN
                </Link>
              )}
              {user.role === 'vendedor' && (
                <Link
                  to="/vendedor"
                  className="font-display"
                  style={{ 
                    background: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)', 
                    color: '#fff', 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '8px 16px', 
                    borderRadius: '24px', 
                    fontSize: '13px', 
                    textDecoration: 'none', 
                    fontWeight: 800, 
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    letterSpacing: '0.03em'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(217, 119, 6, 0.5)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(217, 119, 6, 0.3)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #78350f 0%, #d97706 100%)';
                  }}
                  title="Entrar al Panel de Vendedor"
                >
                  <Store size={16} style={{ color: '#fcd34d' }} /> VENDEDOR
                </Link>
              )}
              <Link
                to="/mis-facturas"
                className="nav-btn-login font-display"
                style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', textDecoration: 'none' }}
                title="Ver historial de facturas SRI en página dedicada"
              >
                <FileText size={15} /> Mis Facturas
              </Link>
              <div
                className="user-pill font-display"
                onClick={() => openAuthModal('login')}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                title="Ver tu cuenta"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <UserIcon size={16} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                  <span style={{ fontSize: '13px' }}>Hola, {user.name}</span>
                  <span style={{ fontSize: '11px', opacity: 0.85, fontWeight: 'normal', textTransform: 'none' }}>{user.email}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    logout();
                  }}
                  className="user-logout-btn"
                  title="Cerrar sesión"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Cart Button Always Visible, requires Auth to enter */}
          <Link
            to="/checkout"
            className="navbar-cart-btn"
            onClick={(e) => {
              if (!user) {
                e.preventDefault();
                openAuthModal('login');
              }
            }}
          >
            <div className="cart-icon-circle">
              <ShoppingCart size={18} />
              {totalItems > 0 && <span className="cart-badge-num">{totalItems}</span>}
            </div>
            <div className="cart-total-text">
              <span className="cart-label">Tu Pedido</span>
              <span className="cart-money font-display">${totalAmount.toFixed(2)}</span>
            </div>
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className={`hamburger-toggle ${menuActive ? 'open' : ''}`}
          onClick={() => setMenuActive(!menuActive)}
          aria-label="Menú principal"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuActive && (
        <div className="mobile-menu-dropdown">
          {/* Navigation Links */}
          <nav className="mobile-nav-links">
            <Link 
              to="/" 
              className={`mobile-link ${isHome ? 'active font-display' : ''}`}
              onClick={() => setMenuActive(false)}
            >
              INICIO
            </Link>
            <Link 
              to="/catalogo" 
              className={`mobile-link ${location.pathname === '/catalogo' ? 'active font-display' : ''}`}
              onClick={() => setMenuActive(false)}
            >
              CATÁLOGO
            </Link>
          </nav>

          {/* Auth/Cart inside mobile menu */}
          {!user ? (
            <div className="mobile-auth-buttons">
              <button
                type="button"
                onClick={() => {
                  setMenuActive(false);
                  openAuthModal('login');
                }}
                className="font-display"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: 'linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  padding: '12px 20px',
                  borderRadius: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '15.5px',
                  letterSpacing: '0.02em',
                  boxShadow: '0 4px 16px rgba(22, 163, 74, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                }}
              >
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '5px', borderRadius: '50%', display: 'flex' }}>
                  <UserIcon size={17} />
                </div>
                <span>Ingresar / Registrarse</span>
                <Sparkles size={16} style={{ opacity: 0.85 }} />
              </button>
            </div>
          ) : (
            <>
              <div className="mobile-user-greeting" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>👤 Hola, {user.name} ({user.email})</div>
                {user.role === 'administrador' && (
                  <Link
                    to="/admin"
                    onClick={() => setMenuActive(false)}
                    style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', boxShadow: '0 4px 12px rgba(67, 56, 202, 0.3)' }}
                  >
                    <ShieldCheck size={18} style={{ color: '#818cf8' }} /> Entrar al Panel Admin
                  </Link>
                )}
                {user.role === 'vendedor' && (
                  <Link
                    to="/vendedor"
                    onClick={() => setMenuActive(false)}
                    style={{ background: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)' }}
                  >
                    <Store size={18} style={{ color: '#fcd34d' }} /> Entrar al Panel Vendedor
                  </Link>
                )}
                <Link 
                  to="/mis-facturas"
                  onClick={() => setMenuActive(false)}
                  style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '8px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none' }}
                >
                  <FileText size={16} /> Mis Facturas Electrónicas
                </Link>
                <button onClick={logout} className="mobile-logout-link">Cerrar Sesión</button>
              </div>
              <Link to="/checkout" onClick={() => setMenuActive(false)} className="mobile-cart-highlight">
                CARRITO (${totalAmount.toFixed(2)})
              </Link>
            </>
          )}
        </div>
      )}

      <MisFacturasModal isOpen={facturasModalOpen} onClose={() => setFacturasModalOpen(false)} />
    </header>
  );
};
