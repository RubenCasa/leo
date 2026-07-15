import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase, signUpWithEmail, signInWithEmail, signInWithGoogle } from '../lib/supabase';

export type UserRole = 'administrador' | 'vendedor' | 'cliente';

export interface User {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  cedula?: string;
  provider?: string;
  avatarUrl?: string;
  role: UserRole;
  rolId?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  authError: string;
  authSuccess: string;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, cedula?: string, phone?: string) => Promise<boolean>;
  registerWithGoogle: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  clearAuthError: () => void;
  clearAuthSuccess: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper para verificar si un correo ya fue registrado en nuestra plataforma
const isEmailRegistered = (email: string): boolean => {
  const raw = localStorage.getItem('lacteos_leo_registered_emails');
  const emails: string[] = raw ? JSON.parse(raw) : [];
  return emails.includes(email.toLowerCase());
};

// Helper para guardar un correo como registrado
const saveRegisteredEmail = (email: string) => {
  const raw = localStorage.getItem('lacteos_leo_registered_emails');
  const emails: string[] = raw ? JSON.parse(raw) : [];
  const lower = email.toLowerCase();
  if (!emails.includes(lower)) {
    emails.push(lower);
    localStorage.setItem('lacteos_leo_registered_emails', JSON.stringify(emails));
  }
};

// Helper para obtener el rol del usuario desde Supabase
const fetchUserRole = async (userId: string): Promise<{ role: UserRole; rolId: number; cedula?: string }> => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('rol_id, cedula')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return { role: 'cliente', rolId: 3 };
    }

    const rolId = data.rol_id || 3;
    let rolNombre: UserRole = 'cliente';
    if (rolId === 1) rolNombre = 'administrador';
    else if (rolId === 2) rolNombre = 'vendedor';

    return {
      role: rolNombre,
      rolId: rolId,
      cedula: data.cedula || undefined
    };
  } catch {
    return { role: 'cliente', rolId: 3 };
  }
};

// Helper para crear/actualizar el registro del usuario en tabla usuarios sin sobrescribir el rol existente
const upsertUsuario = async (
  userId: string,
  nombre: string,
  email: string,
  cedula?: string,
  telefono?: string
) => {
  try {
    // Primero verificamos si el usuario ya existe en la tabla y qué rol tiene
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('rol_id')
      .eq('id', userId)
      .maybeSingle();

    const rolToAssign = existingUser?.rol_id || 3; // Mantener el rol existente, o cliente (3) si es nuevo

    const { error } = await supabase
      .from('usuarios')
      .upsert({
        id: userId,
        nombre,
        email,
        cedula: cedula || null,
        telefono: telefono || null,
        rol_id: rolToAssign,
        activo: true
      }, { onConflict: 'id' });

    if (error) {
      console.warn('Error al guardar usuario en tabla usuarios:', error.message);
    }
  } catch (e) {
    console.warn('Error en upsertUsuario:', e);
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('lacteos_leo_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const buildUserFromSession = async (sessionUser: {
    id?: string;
    email?: string;
    user_metadata?: Record<string, string>;
    app_metadata?: Record<string, string>;
  }): Promise<User> => {
    const meta = sessionUser.user_metadata || {};
    const userId = sessionUser.id || '';

    // Obtener rol desde la base de datos
    let roleInfo: { role: UserRole; rolId: number; cedula?: string } = { role: 'cliente', rolId: 3, cedula: undefined };
    if (userId) {
      roleInfo = await fetchUserRole(userId);
    }

    return {
      id: userId,
      name: meta.full_name || meta.name || sessionUser.email?.split('@')[0] || 'Usuario',
      email: sessionUser.email || '',
      phone: meta.phone || '',
      cedula: roleInfo.cedula || meta.cedula || '',
      provider: sessionUser.app_metadata?.provider === 'google' ? 'Google' : 'Correo',
      avatarUrl: meta.avatar_url || meta.picture || '',
      role: roleInfo.role,
      rolId: roleInfo.rolId
    };
  };

  // Procesar sesión entrante (por ejemplo al volver de Google OAuth o recarga de página)
  useEffect(() => {
    const handleSessionUser = async (sessionUser: { id?: string; email?: string; user_metadata?: Record<string, string>; app_metadata?: Record<string, string> }) => {
      const email = (sessionUser.email || '').toLowerCase();
      if (!email) return;

      const intent = localStorage.getItem('lacteos_leo_google_intent');
      localStorage.removeItem('lacteos_leo_google_intent');

      const userObj = await buildUserFromSession(sessionUser);

      // CASO 1: El usuario dio clic en "Registrarse con Google"
      if (intent === 'register') {
        saveRegisteredEmail(email);
        // Crear registro en tabla usuarios
        if (sessionUser.id) {
          await upsertUsuario(sessionUser.id, userObj.name, email);
        }
        setUser(userObj);
        setIsAuthModalOpen(false);
        return;
      }

      // CASO 2: El usuario dio clic en "Ingresar con Google" (LOGIN)
      if (intent === 'login') {
        if (isEmailRegistered(email)) {
          setUser(userObj);
          setIsAuthModalOpen(false);
        } else {
          try { await supabase.auth.signOut(); } catch { /* silenciar */ }
          setUser(null);
          setAuthError('❌ Esta cuenta de Google aún no está registrada en Lácteos Leo. Por favor ve a la pestaña "Registrarse" primero para crear tu cuenta.');
          setIsAuthModalOpen(true);
          setAuthModalMode('login');
        }
        return;
      }

      // CASO 3: Recarga de página normal (sin intent explícito)
      if (sessionUser.id) {
        saveRegisteredEmail(email);
        await upsertUsuario(sessionUser.id, userObj.name, email);
        setUser(userObj);
      } else {
        try { await supabase.auth.signOut(); } catch { /* silenciar */ }
        setUser(null);
      }
    };

    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await handleSessionUser(session.user);
        }
      } catch (err) {
        console.warn('Error verificando sesión Supabase:', err);
      } finally {
        setLoading(false);
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await handleSessionUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Persistir usuario en localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('lacteos_leo_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('lacteos_leo_user');
    }
  }, [user]);

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthError('');
    setAuthSuccess('');
  };

  const clearAuthError = () => setAuthError('');
  const clearAuthSuccess = () => setAuthSuccess('');

  // ============================================================
  // REGISTRARSE con correo y contraseña (con cédula validada)
  // ============================================================
  const register = async (name: string, email: string, password: string, cedula?: string, phone?: string): Promise<boolean> => {
    setAuthError('');
    setAuthSuccess('');
    try {
      if (isEmailRegistered(email)) {
        setAuthError('❌ Este correo ya está registrado en nuestra plataforma. Por favor usa "Iniciar Sesión".');
        return false;
      }

      const data = await signUpWithEmail(email, password, { name, phone: phone || '', cedula: cedula || '' });

      // Guardar el correo como registrado autorizadamente
      saveRegisteredEmail(email);

      // Al estar "Confirm email" desactivado, entra instantáneamente
      if (data.session?.user || data.user) {
        const userId = data.session?.user?.id || data.user?.id || '';
        
        // Crear registro en tabla usuarios con cédula y rol cliente
        if (userId) {
          await upsertUsuario(userId, name, email, cedula, phone);
        }

        const newUser: User = {
          id: userId,
          name: name,
          email: email,
          phone: phone || '',
          cedula: cedula || '',
          provider: 'Correo',
          role: 'cliente',
          rolId: 3
        };
        setUser(newUser);
        setIsAuthModalOpen(false);
        return true;
      }

      return true;
    } catch (err: unknown) {
      const error = err as { message?: string };
      if (error.message?.includes('already registered')) {
        setAuthError('❌ Este correo ya está registrado. Usa "Iniciar Sesión".');
      } else if (error.message?.includes('password')) {
        setAuthError('❌ La contraseña debe tener al menos 6 caracteres.');
      } else {
        setAuthError('❌ Error al registrar: ' + (error.message || 'Intenta de nuevo.'));
      }
      return false;
    }
  };

  // ============================================================
  // INICIAR SESIÓN con correo y contraseña (bloquea no registrados)
  // ============================================================
  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthError('');
    setAuthSuccess('');
    try {
      if (!isEmailRegistered(email)) {
        setAuthError('❌ No existe ninguna cuenta registrada con este correo. Primero debes ir a la pestaña "Registrarse".');
        return false;
      }

      const data = await signInWithEmail(email, password);
      if (data.user) {
        const userObj = await buildUserFromSession(data.user);
        if (data.user.id) {
          await upsertUsuario(data.user.id, userObj.name, email);
        }
        setUser(userObj);
        setIsAuthModalOpen(false);
        return true;
      }
      return false;
    } catch (err: unknown) {
      const error = err as { message?: string };
      if (error.message?.includes('Invalid login credentials')) {
        setAuthError('❌ Correo o contraseña incorrectos. Verifica tus datos o regístrate si no tienes cuenta.');
      } else {
        setAuthError('❌ Error al iniciar sesión: ' + (error.message || 'Intenta de nuevo.'));
      }
      return false;
    }
  };

  // ============================================================
  // REGISTRARSE con Google OAuth
  // ============================================================
  const registerWithGoogle = async () => {
    setAuthError('');
    setAuthSuccess('');
    localStorage.setItem('lacteos_leo_google_intent', 'register');
    await signInWithGoogle();
  };

  // ============================================================
  // INICIAR SESIÓN con Google OAuth (bloquea no registrados)
  // ============================================================
  const loginWithGoogle = async () => {
    setAuthError('');
    setAuthSuccess('');
    localStorage.setItem('lacteos_leo_google_intent', 'login');
    await signInWithGoogle();
  };

  // ============================================================
  // CERRAR SESIÓN
  // ============================================================
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Error cerrando sesión en Supabase:', e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthModalOpen,
        authModalMode,
        authError,
        authSuccess,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        registerWithGoogle,
        loginWithGoogle,
        logout,
        clearAuthError,
        clearAuthSuccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
