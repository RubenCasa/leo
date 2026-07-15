/**
 * Generador de Clave de Acceso de 49 dígitos para el SRI Ecuador
 * 
 * Estructura oficial del SRI:
 * Pos 1-8:   Fecha de emisión (ddmmaaaa)
 * Pos 9-10:  Tipo de comprobante (01=Factura, 04=Nota Crédito, etc.)
 * Pos 11-23: RUC del emisor (13 dígitos)
 * Pos 24:    Tipo de ambiente (1=Pruebas, 2=Producción)
 * Pos 25-27: Código del establecimiento (3 dígitos)
 * Pos 28-30: Código del punto de emisión (3 dígitos)
 * Pos 31-39: Número secuencial del comprobante (9 dígitos)
 * Pos 40-47: Código numérico aleatorio (8 dígitos)
 * Pos 48:    Tipo de emisión (1=Normal)
 * Pos 49:    Dígito verificador (Módulo 11)
 */

export interface ClaveAccesoParams {
  fechaEmision: Date;
  tipoComprobante?: string;  // default '01' (Factura)
  rucEmisor: string;         // 13 dígitos
  ambiente?: '1' | '2';      // 1=Pruebas, 2=Producción
  establecimiento?: string;  // 3 dígitos, default '001'
  puntoEmision?: string;     // 3 dígitos, default '001'
  secuencial: string;        // Hasta 9 dígitos (se rellena con ceros a la izquierda)
  codigoNumerico?: string;   // 8 dígitos aleatorios
  tipoEmision?: '1' | '2';   // 1=Normal, default '1'
}

/**
 * Calcula el dígito verificador usando el algoritmo Módulo 11 del SRI.
 * 
 * Se multiplica cada dígito de derecha a izquierda por un factor
 * que va rotando: 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, ...
 * Se suman los productos, se calcula 11 - (suma % 11).
 * Si el resultado es 11 → dígito = 0
 * Si el resultado es 10 → dígito = 1
 * Caso contrario, el resultado es el dígito verificador.
 */
const calcularModulo11 = (cadena: string): number => {
  const digits = cadena.split('').map(Number);
  let factor = 2;
  let suma = 0;

  // Recorrer de derecha a izquierda
  for (let i = digits.length - 1; i >= 0; i--) {
    suma += digits[i] * factor;
    factor++;
    if (factor > 7) factor = 2; // Rotar: 2,3,4,5,6,7,2,3,...
  }

  const residuo = suma % 11;
  const resultado = 11 - residuo;

  if (resultado === 11) return 0;
  if (resultado === 10) return 1;
  return resultado;
};

/**
 * Genera un código numérico aleatorio de 8 dígitos.
 */
const generarCodigoNumerico = (): string => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

/**
 * Formatea la fecha en formato ddmmaaaa (8 dígitos).
 */
const formatearFechaSRI = (fecha: Date): string => {
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const aaaa = String(fecha.getFullYear());
  return `${dd}${mm}${aaaa}`;
};

/**
 * Genera la Clave de Acceso completa de 49 dígitos para comprobantes electrónicos SRI.
 */
export const generarClaveAccesoSRI = (params: ClaveAccesoParams): string => {
  const {
    fechaEmision,
    tipoComprobante = '01',
    rucEmisor,
    ambiente = '1',
    establecimiento = '001',
    puntoEmision = '001',
    secuencial,
    codigoNumerico = generarCodigoNumerico(),
    tipoEmision = '1'
  } = params;

  // Construir los primeros 48 dígitos
  const fecha8 = formatearFechaSRI(fechaEmision);           // 8 dígitos
  const tipo2 = tipoComprobante.padStart(2, '0');            // 2 dígitos
  const ruc13 = rucEmisor.padStart(13, '0');                 // 13 dígitos
  const amb1 = ambiente;                                      // 1 dígito
  const estab3 = establecimiento.padStart(3, '0');           // 3 dígitos
  const pto3 = puntoEmision.padStart(3, '0');                // 3 dígitos
  const sec9 = secuencial.padStart(9, '0');                  // 9 dígitos
  const cod8 = codigoNumerico.padStart(8, '0');              // 8 dígitos
  const tipoEm1 = tipoEmision;                               // 1 dígito

  const cadena48 = `${fecha8}${tipo2}${ruc13}${amb1}${estab3}${pto3}${sec9}${cod8}${tipoEm1}`;

  // Verificar longitud (debe ser 48 antes del dígito verificador)
  if (cadena48.length !== 48) {
    console.error(`[SRI] Clave de acceso con longitud incorrecta: ${cadena48.length} (esperado 48)`);
  }

  // Calcular dígito verificador con Módulo 11
  const digitoVerificador = calcularModulo11(cadena48);

  // Clave completa de 49 dígitos
  return `${cadena48}${digitoVerificador}`;
};

/**
 * Gestiona el secuencial de facturas (autoincremental).
 * Se almacena en localStorage para persistir entre sesiones.
 */
const SECUENCIAL_KEY = 'lacteos_leo_sri_secuencial';

export const obtenerSiguienteSecuencial = (): string => {
  const current = parseInt(localStorage.getItem(SECUENCIAL_KEY) || '0', 10);
  const next = current + 1;
  localStorage.setItem(SECUENCIAL_KEY, next.toString());
  return next.toString().padStart(9, '0');
};

export const getSecuencialActual = (): string => {
  const current = parseInt(localStorage.getItem(SECUENCIAL_KEY) || '0', 10);
  return current.toString().padStart(9, '0');
};
