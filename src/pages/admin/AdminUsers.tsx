import React, { useEffect, useState } from 'react';
import { fetchTodosUsuarios, cambiarRolUsuario } from '../../lib/productosService';
import { Search } from 'lucide-react';

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

  const handleRoleChange = async (usuarioId: string, nuevoRolId: number) => {
    try {
      await cambiarRolUsuario(usuarioId, nuevoRolId);
      await loadUsuarios();
      alert('✅ Rol actualizado correctamente.');
    } catch (err: any) {
      alert('Error al cambiar rol: ' + (err.message || 'Intenta de nuevo.'));
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

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center' }}>Cargando usuarios...</div>;
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="font-display">Gestión de Usuarios y Roles</h1>
        <p>Administra los usuarios registrados y asigna roles diferenciados (Administrador, Vendedor, Cliente).</p>
      </div>

      <div className="admin-table-wrapper">
        <div className="admin-table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={16} style={{ color: '#64748b' }} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o cédula..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
            {filteredUsers.length} usuarios registrados
          </span>
        </div>

        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo Electrónico</th>
              <th>Cédula / RUC</th>
              <th>Teléfono</th>
              <th>Rol Actual</th>
              <th>Cambiar Rol</th>
              <th>Estado</th>
              <th>Registro</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 700 }}>{user.nombre}</td>
                <td>{user.email}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                  {user.cedula || '—'}
                </td>
                <td>{user.telefono || '—'}</td>
                <td>
                  <span className={`role-badge ${getRoleClass(user.roles?.nombre || 'cliente')}`}>
                    {user.roles?.nombre || 'cliente'}
                  </span>
                </td>
                <td>
                  <select
                    value={user.rol_id}
                    onChange={e => handleRoleChange(user.id, parseInt(e.target.value, 10))}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #d1ddd3',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <option value={1}>🛡️ Administrador</option>
                    <option value={2}>🏪 Vendedor</option>
                    <option value={3}>👤 Cliente</option>
                  </select>
                </td>
                <td>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: user.activo ? '#2e7d32' : '#94a3b8'
                  }}>
                    {user.activo ? '● Activo' : '○ Inactivo'}
                  </span>
                </td>
                <td style={{ fontSize: '12px', color: '#64748b' }}>
                  {new Date(user.created_at).toLocaleDateString('es-EC')}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No se encontraron usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
