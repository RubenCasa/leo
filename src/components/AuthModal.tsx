import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { validarIdentificacion } from '../utils/cedulaValidator';
import './AuthModal.css';

export const AuthModal: React.FC = () => {
  const {
    user,
    isAuthModalOpen,
    authModalMode,
    authError,
    authSuccess,
    closeAuthModal,
    openAuthModal,
    login,
    register,
    registerWithGoogle,
    loginWithGoogle,
    logout,
    clearAuthError,
    clearAuthSuccess
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [localError, setLocalError] = useState('');
  const [cedulaError, setCedulaError] = useState('');
  const [cedulaProvincia, setCedulaProvincia] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Sincronizar errores/éxito del contexto
  useEffect(() => {
    if (authError) {
      setLocalError(authError);
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  // Validar cédula en tiempo real cuando cambia
  useEffect(() => {
    if (cedula.length === 0) {
      setCedulaError('');
      setCedulaProvincia('');
      return;
    }
    const clean = cedula.replace(/\D/g, '');
    if (clean.length >= 10) {
      const result = validarIdentificacion(clean);
      if (result.isValid) {
        setCedulaError('');
        setCedulaProvincia(result.provincia || '');
      } else {
        setCedulaError(result.error);
        setCedulaProvincia('');
      }
    } else {
      setCedulaError('');
      setCedulaProvincia('');
    }
  }, [cedula]);

  if (!isAuthModalOpen) return null;

  const displayError = localError || authError;
  const displaySuccess = authSuccess;

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearAuthSuccess();
    setIsSubmitting(true);

    try {
      if (authModalMode === 'login') {
        if (!email.trim() || !password.trim()) {
          setLocalError('Por favor ingresa tu correo y contraseña.');
          setIsSubmitting(false);
          return;
        }
        await login(email, password);
      } else {
        if (!name.trim() || !email.trim() || !password.trim()) {
          setLocalError('Por favor completa todos los campos obligatorios.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setLocalError('La contraseña debe tener al menos 6 caracteres.');
          setIsSubmitting(false);
          return;
        }

        // Validar cédula si se proporcionó (RF-01)
        if (cedula.trim()) {
          const cedulaResult = validarIdentificacion(cedula.trim());
          if (!cedulaResult.isValid) {
            setLocalError('❌ ' + cedulaResult.error);
            setIsSubmitting(false);
            return;
          }
        }

        await register(name, email, password, cedula.trim(), phone);
      }
    } catch {
      setLocalError('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchTab = (mode: 'login' | 'register') => {
    openAuthModal(mode);
    setLocalError('');
    clearAuthError();
    setCedulaError('');
    setCedulaProvincia('');
    clearAuthSuccess();
  };

  return (
    <div className="auth-modal-overlay" onClick={closeAuthModal}>
      <div className="auth-modal-box" onClick={(e) => e.stopPropagation()}>
        <button
          className="auth-modal-close"
          onClick={closeAuthModal}
          aria-label="Cerrar"
        >
          ✕
        </button>

        {user ? (
          /* ================================================================
             Vista de sesión iniciada
             ================================================================ */
          <div className="auth-logged-in-view">
            <div className="auth-brand-badge font-display">🥛 LÁCTEOS LEO COTOPAXI</div>
            <h3 className="auth-title font-display">¡SESIÓN INICIADA!</h3>
            <div className="logged-user-card">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="logged-avatar-img" />
              ) : (
                <div className="logged-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="logged-info">
                <h4 className="font-display">{user.name}</h4>
                <p className="logged-email">{user.email}</p>
                {user.role && (
                  <span className="logged-provider" style={{
                    background: user.role === 'administrador' ? '#fce4ec' :
                      user.role === 'vendedor' ? '#fff3e0' : '#e8f5e9',
                    color: user.role === 'administrador' ? '#c62828' :
                      user.role === 'vendedor' ? '#e65100' : '#2e7d32',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Rol: {user.role}
                  </span>
                )}
                {user.provider && <span className="logged-provider">✓ Conectado vía {user.provider}</span>}
              </div>
            </div>
            <div className="logged-actions">
              <button
                type="button"
                onClick={closeAuthModal}
                className="auth-submit-btn font-display"
              >
                Continuar al Carrito →
              </button>
              {user.role === 'administrador' && (
                <button
                  type="button"
                  onClick={() => {
                    closeAuthModal();
                    window.location.href = '/admin';
                  }}
                  className="auth-submit-btn font-display"
                  style={{ background: 'linear-gradient(135deg, #c62828, #b71c1c)' }}
                >
                  Panel de Administración →
                </button>
              )}
              {(user.role === 'vendedor' || user.role === 'administrador') && (
                <button
                  type="button"
                  onClick={() => {
                    closeAuthModal();
                    window.location.href = '/vendedor';
                  }}
                  className="auth-submit-btn font-display"
                  style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)' }}
                >
                  Panel de Vendedor →
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  logout();
                  closeAuthModal();
                }}
                className="btn-logout-modal font-display"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        ) : (
          /* ================================================================
             Vista de login / registro
             ================================================================ */
          <>
            <div className="auth-modal-header">
              <div className="auth-brand-badge font-display">🥛 LÁCTEOS LEO COTOPAXI</div>
              <h3 className="auth-title font-display">
                {authModalMode === 'login' ? '¡BIENVENIDO DE VUELTA!' : 'CREA TU CUENTA'}
              </h3>
              <p className="auth-subtitle">
                {authModalMode === 'login'
                  ? 'Inicia sesión con tu correo y contraseña o con Google.'
                  : 'Regístrate y comienza a comprar productos lácteos frescos en línea.'}
              </p>
            </div>

            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab-btn ${authModalMode === 'login' ? 'active' : ''}`}
                onClick={() => switchTab('login')}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${authModalMode === 'register' ? 'active' : ''}`}
                onClick={() => switchTab('register')}
              >
                Registrarse
              </button>
            </div>

            {/* Mensajes de error y éxito */}
            {displayError && <div className="auth-error-msg">{displayError}</div>}
            {displaySuccess && (
              <div className="auth-success-msg">
                <span className="success-icon">✉️</span>
                {displaySuccess}
              </div>
            )}

            {/* Botón Google en ambas pestañas */}
            <div className="social-login-block">
              <button
                type="button"
                onClick={async () => {
                  setGoogleLoading(true);
                  setLocalError('');
                  clearAuthSuccess();
                  try {
                    if (authModalMode === 'register') {
                      await registerWithGoogle();
                    } else {
                      await loginWithGoogle();
                    }
                  } catch (err: unknown) {
                    console.error('Error Google OAuth:', err);
                    const errorObj = err as { message?: string };
                    const msg = errorObj.message || '';
                    if (msg.includes('provider is not enabled') || msg.includes('Unsupported provider')) {
                      setLocalError('⚠️ El inicio de sesión con Google está desactivado en tu Supabase. Ve a Authentication > Providers > Google y actívalo.');
                    } else if (msg.includes('API key')) {
                      setLocalError('⚠️ La clave API de Supabase en el archivo .env no es válida.');
                    } else {
                      setLocalError('⚠️ Error de Supabase al conectar con Google: ' + (msg || 'Intenta de nuevo.'));
                    }
                    setGoogleLoading(false);
                  }
                }}
                className={`google-oauth-btn ${googleLoading ? 'loading' : ''}`}
                disabled={googleLoading}
              >
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading
                  ? 'Conectando...'
                  : authModalMode === 'register'
                    ? 'Registrarse con Google'
                    : 'Ingresar con Google'
                }
              </button>
            </div>

            <div className="auth-divider">
              <span>{authModalMode === 'register' ? 'O regístrate con tu correo' : 'O con tu correo y contraseña'}</span>
            </div>

            {/* Formulario */}
            {!displaySuccess && (
              <form onSubmit={handleStandardSubmit} className="auth-form">
                {authModalMode === 'register' && (
                  <div className="auth-field">
                    <label>Nombre y Apellido *</label>
                    <input
                      type="text"
                      placeholder="Ej. Carlos Mendoza"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                )}

                {authModalMode === 'register' && (
                  <div className="auth-field">
                    <label>
                      Cédula de Identidad / RUC
                      {cedulaProvincia && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '11px',
                          color: '#2e7d32',
                          fontWeight: 700,
                          background: '#e8f5e9',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          ✅ {cedulaProvincia}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 0501234567 (10 dígitos)"
                      value={cedula}
                      maxLength={13}
                      onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                      style={cedulaError ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' } : {}}
                    />
                    {cedulaError && (
                      <span style={{
                        display: 'block',
                        fontSize: '12px',
                        color: '#ef4444',
                        marginTop: '4px',
                        fontWeight: 500
                      }}>
                        ❌ {cedulaError}
                      </span>
                    )}
                  </div>
                )}

                <div className="auth-field">
                  <label>Correo Electrónico *</label>
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {authModalMode === 'register' && (
                  <div className="auth-field">
                    <label>Teléfono / WhatsApp (Opcional)</label>
                    <input
                      type="tel"
                      placeholder="099 893 3267"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                )}

                <div className="auth-field">
                  <label>Contraseña {authModalMode === 'register' && <span className="field-hint">(mínimo 6 caracteres)</span>}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  className={`auth-submit-btn font-display ${isSubmitting ? 'loading' : ''}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Procesando...'
                    : authModalMode === 'login'
                      ? 'INGRESAR →'
                      : 'CREAR CUENTA →'
                  }
                </button>
              </form>
            )}

            <div className="auth-modal-footer">
              {authModalMode === 'login' ? (
                <p>
                  ¿Aún no tienes cuenta?{' '}
                  <span onClick={() => switchTab('register')}>Regístrate aquí</span>
                </p>
              ) : (
                <p>
                  ¿Ya tienes cuenta?{' '}
                  <span onClick={() => switchTab('login')}>Inicia sesión</span>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
