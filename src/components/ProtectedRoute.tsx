import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[]; // Roles permitidos: 'administrador', 'vendedor', 'cliente'
}

/**
 * Componente Guard que protege rutas según el rol del usuario.
 * Si el usuario no está autenticado, redirige al inicio.
 * Si no tiene el rol adecuado, muestra mensaje de acceso denegado.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user, loading } = useAuth();

  // Mientras carga la sesión, mostrar loading
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        color: '#475569',
        fontSize: '16px'
      }}>
        Verificando permisos...
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al inicio
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Si se especifican roles y el usuario no tiene uno de ellos
  if (roles && roles.length > 0) {
    const userRole = user.role || 'cliente';
    if (!roles.includes(userRole)) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          padding: '40px 20px'
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '16px'
          }}>🔒</div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            color: '#1b5e20',
            marginBottom: '12px',
            fontSize: '1.5rem'
          }}>
            Acceso Restringido
          </h2>
          <p style={{
            color: '#475569',
            maxWidth: '450px',
            lineHeight: 1.7,
            fontSize: '15px'
          }}>
            Tu cuenta con rol <strong>"{userRole}"</strong> no tiene permisos para acceder a esta sección.
            {roles.includes('administrador') && ' Solo los administradores pueden acceder aquí.'}
            {roles.includes('vendedor') && !roles.includes('administrador') && ' Solo vendedores y administradores tienen acceso.'}
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              marginTop: '20px',
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #2e7d32, #1b5e20)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '14px'
            }}
          >
            ← Volver
          </button>
        </div>
      );
    }
  }

  return <>{children}</>;
};
