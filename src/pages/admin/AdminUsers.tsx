import React, { useEffect, useState } from 'react';
import { fetchTodosUsuarios, cambiarRolUsuario } from '../../lib/productosService';
import { Search, Shield, Store, User as UserIcon, AlertTriangle } from 'lucide-react';

interface UsuarioDB {
  id: string;
  nombre: string;
  email: string;
  cedula: string | null;
  telefono: string | null;
  rol_id: number;
  activo: boolean;
  created_at: string;
  roles: { nombre: string; descripcion: string } | null;
}

export const AdminUsers: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioDB | null>(null);
  const [targetRoleId, setTargetRoleId] = useState<number | null>(null);

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      const data = await fetchTodosUsuarios();
      setUsuarios(data as UsuarioDB[]);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const openRoleModal = (user: UsuarioDB, nuevoRolId: number) => {
    if (user.rol_id === nuevoRolId) return; // No change
    setSelectedUser(user);
    setTargetRoleId(nuevoRolId);
    setRoleModalVisible(true);
  };

  const confirmRoleChange = async () => {
    if (!selectedUser || targetRoleId === null) return;
    try {
      await cambiarRolUsuario(selectedUser.id, targetRoleId);
      await loadUsuarios();
      // Optional: show a toast or success alert
    } catch (err: any) {
      alert('Error al cambiar rol: ' + (err.message || 'Intenta de nuevo.'));
    } finally {
      setRoleModalVisible(false);
      setSelectedUser(null);
      setTargetRoleId(null);
    }
  };

  const getRoleClass = (rolNombre: string) => {
    if (rolNombre === 'administrador') return 'admin';
    if (rolNombre === 'vendedor') return 'vendedor';
    return 'cliente';
  };

  const filteredUsers = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.cedula || '').includes(searchQuery)
  );

  const stats = {
    admin: usuarios.filter(u => u.rol_id === 1).length,
    vendedor: usuarios.filter(u => u.rol_id === 2).length,
    cliente: usuarios.filter(u => u.rol_id === 3).length,
    total: usuarios.length
  };

  const getRoleName = (rolId: number) => {
    if (rolId === 1) return 'Administrador';
    if (rolId === 2) return 'Vendedor';
    return 'Cliente';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#475569' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2ece3', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
        <p className="font-display">Cargando usuarios...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="admin-page-header">
        <h1 className="font-display">Gestión de Usuarios y Roles</h1>
        <p>Administra los usuarios registrados y asigna roles diferenciados de manera segura.</p>
      </div>

      {/* Tarjetas de resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="admin-kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, #fff, #f8faf9)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserIcon size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Usuarios</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{stats.total}</div>
          </div>
        </div>

        <div className="admin-kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, #fff, #f8faf9)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Administradores</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{stats.admin}</div>
          </div>
        </div>

        <div className="admin-kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, #fff, #f8faf9)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Vendedores</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{stats.vendedor}</div>
          </div>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <div className="admin-table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8faf9', border: '1.5px solid #d1ddd3', borderRadius: '10px', padding: '0 12px', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ color: '#64748b' }} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o cédula..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', padding: '10px 0', fontSize: '14px', width: '100%', background: 'transparent' }}
            />
          </div>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px' }}>
            {filteredUsers.length} resultados
          </span>
        </div>

        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Contacto</th>
              <th>Cédula / RUC</th>
              <th>Registro</th>
              <th>Rol Actual</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Cambiar Rol</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a, #84cc16)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)' }}>
                    {user.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#1e293b' }}>{user.nombre}</div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column' }}>
                    <span>{user.email}</span>
                    <span style={{ color: '#94a3b8' }}>{user.telefono || 'Sin teléfono'}</span>
                  </div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                  {user.cedula || '—'}
                </td>
                <td style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                  {new Date(user.created_at).toLocaleDateString('es-EC')}
                </td>
                <td>
                  <span className={`role-badge ${getRoleClass(user.roles?.nombre || 'cliente')}`}>
                    {user.roles?.nombre === 'administrador' && <Shield size={12} style={{ marginRight: '4px' }} />}
                    {user.roles?.nombre === 'vendedor' && <Store size={12} style={{ marginRight: '4px' }} />}
                    {user.roles?.nombre || 'cliente'}
                  </span>
                </td>
                <td>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 8px',
                    borderRadius: '20px',
                    background: user.activo ? '#dcfce7' : '#f1f5f9',
                    color: user.activo ? '#166534' : '#64748b'
                  }}>
                    {user.activo ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <select
                    value={user.rol_id}
                    onChange={e => openRoleModal(user, parseInt(e.target.value, 10))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #e2ece3',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: '#f8faf9',
                      color: '#1e293b',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = '#16a34a'}
                    onBlur={e => e.target.style.borderColor = '#e2ece3'}
                  >
                    <option value={1}>🛡️ Admin</option>
                    <option value={2}>🏪 Vendedor</option>
                    <option value={3}>👤 Cliente</option>
                  </select>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  <UserIcon size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                  <p style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>No se encontraron usuarios.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Confirmación de Rol */}
      {roleModalVisible && selectedUser && targetRoleId !== null && (
        <div className="admin-modal-overlay" onClick={() => setRoleModalVisible(false)}>
          <div className="admin-modal-box" onClick={e => e.stopPropagation()} style={{ padding: '32px', textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: '0 0 12px' }}>Cambiar Rol de Usuario</h3>
            <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.5', margin: '0 0 24px' }}>
              ¿Estás seguro de que deseas cambiar el rol de <strong>{selectedUser.nombre}</strong> de {getRoleName(selectedUser.rol_id)} a <strong style={{ color: '#16a34a' }}>{getRoleName(targetRoleId)}</strong>?
            </p>
            <div style={{ background: '#f8faf9', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left', border: '1px solid #e2ece3' }}>
              <ul style={{ margin: 0, padding: '0 0 0 20px', color: '#64748b', fontSize: '13px', lineHeight: '1.6' }}>
                {targetRoleId === 1 && <li>Tendrá acceso total al panel de administración.</li>}
                {targetRoleId === 2 && <li>Podrá ver y gestionar el inventario desde el panel de vendedor.</li>}
                {targetRoleId === 3 && <li>Solo podrá realizar compras y ver su historial de pedidos.</li>}
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setRoleModalVisible(false)}
                style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmRoleChange}
                style={{ flex: 1, padding: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#15803d'}
                onMouseOut={e => e.currentTarget.style.background = '#16a34a'}
              >
                Sí, cambiar rol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
