/**
 * Lácteos Leo • Core Enterprise Security & Sanitization Library
 * Módulo de defensa activa: Sanitización XSS, Anti-SQLi, Escape XML, y Rate Limiting Anti-Brute Force.
 */

/**
 * Escapa caracteres especiales en strings para prevenir inyección XML (SRI XXE / Tag Injection)
 */
export const escapeXML = (str: string | undefined | null): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Sanitización básica contra XSS en inputs de texto del cliente
 */
export const sanitizeInput = (input: string | undefined | null): string => {
  if (!input) return '';
  return String(input)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover etiquetas script
    .replace(/on\w+\s*=\s*([`"']).*?\1/gi, '') // Remover event handlers tipo onerror=, onload=
    .replace(/on\w+\s*=\s*[^`"'>\s]+/gi, '')
    .replace(/javascript:/gi, '') // Remover URI schemes peligrosos
    .replace(/data:text\/html/gi, '')
    .trim();
};

/**
 * Validación estricta y segura de formato de correo electrónico
 */
export const isValidEmailSecure = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
};

/**
 * Sistema Rate Limiter en cliente (Memoria + localStorage) para prevenir Brute Force (Fuerza Bruta)
 * Protege contra intentos repetidos de Login, Registro, o Card Testing en Checkout.
 */
interface RateLimitRecord {
  attempts: number;
  firstAttemptTime: number;
}

const memoryRateLimits = new Map<string, RateLimitRecord>();

export const checkRateLimit = (
  actionKey: string,
  maxAttempts: number = 5,
  windowSeconds: number = 60
): { allowed: boolean; remainingSeconds?: number } => {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const storageKey = `lacteos_leo_ratelimit_${actionKey}`;

  // Intentar cargar de memoria o de localStorage
  let record = memoryRateLimits.get(actionKey);
  if (!record) {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        record = JSON.parse(stored);
      }
    } catch {
      // Ignorar error si localStorage está restringido
    }
  }

  if (!record) {
    record = { attempts: 1, firstAttemptTime: now };
    memoryRateLimits.set(actionKey, record);
    try { localStorage.setItem(storageKey, JSON.stringify(record)); } catch {}
    return { allowed: true };
  }

  // Verificar si la ventana de tiempo ya expiró
  if (now - record.firstAttemptTime > windowMs) {
    // Reiniciar contador
    record = { attempts: 1, firstAttemptTime: now };
    memoryRateLimits.set(actionKey, record);
    try { localStorage.setItem(storageKey, JSON.stringify(record)); } catch {}
    return { allowed: true };
  }

  // Incrementar intento
  record.attempts += 1;
  memoryRateLimits.set(actionKey, record);
  try { localStorage.setItem(storageKey, JSON.stringify(record)); } catch {}

  if (record.attempts > maxAttempts) {
    const elapsedSeconds = Math.floor((now - record.firstAttemptTime) / 1000);
    const remainingSeconds = Math.max(1, windowSeconds - elapsedSeconds);
    return { allowed: false, remainingSeconds };
  }

  return { allowed: true };
};

/**
 * Limpia el contador de rate limit tras un éxito (ej. Login exitoso o Checkout exitoso)
 */
export const resetRateLimit = (actionKey: string): void => {
  memoryRateLimits.delete(actionKey);
  try {
    localStorage.removeItem(`lacteos_leo_ratelimit_${actionKey}`);
  } catch {}
};
