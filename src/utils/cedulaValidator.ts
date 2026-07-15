/**
 * Validador de Cédula de Identidad Ecuatoriana
 * Implementa el algoritmo oficial del dígito verificador del Registro Civil del Ecuador.
 * 
 * Algoritmo:
 * 1. La cédula tiene 10 dígitos
 * 2. Los 2 primeros dígitos son el código de provincia (01-24)
 * 3. El tercer dígito debe ser menor que 6 (persona natural)
 * 4. Se multiplican los dígitos impares por 2, si el resultado >= 10 se resta 9
 * 5. Se multiplican los dígitos pares por 1
 * 6. Se suman todos los resultados
 * 7. Se obtiene la decena superior más cercana
 * 8. El dígito verificador = decena superior - suma
 */

export interface CedulaValidationResult {
  isValid: boolean;
  error: string;
  provincia?: string;
}

const PROVINCIAS_ECUADOR: Record<string, string> = {
  '01': 'Azuay',
  '02': 'Bolívar',
  '03': 'Cañar',
  '04': 'Carchi',
  '05': 'Cotopaxi',
  '06': 'Chimborazo',
  '07': 'El Oro',
  '08': 'Esmeraldas',
  '09': 'Guayas',
  '10': 'Imbabura',
  '11': 'Loja',
  '12': 'Los Ríos',
  '13': 'Manabí',
  '14': 'Morona Santiago',
  '15': 'Napo',
  '16': 'Pastaza',
  '17': 'Pichincha',
  '18': 'Tungurahua',
  '19': 'Zamora Chinchipe',
  '20': 'Galápagos',
  '21': 'Sucumbíos',
  '22': 'Orellana',
  '23': 'Santo Domingo de los Tsáchilas',
  '24': 'Santa Elena',
  '30': 'Consulados / Exterior'
};

/**
 * Valida una cédula de identidad ecuatoriana usando el algoritmo
 * oficial de dígito verificador (coeficientes 2 y 1 alternados).
 */
export const validarCedulaEcuatoriana = (cedula: string): CedulaValidationResult => {
  // Limpiar espacios y guiones
  const clean = cedula.replace(/[\s\-]/g, '');

  // Validar que tenga exactamente 10 dígitos numéricos
  if (!/^\d{10}$/.test(clean)) {
    return {
      isValid: false,
      error: 'La cédula debe tener exactamente 10 dígitos numéricos.'
    };
  }

  // Validar código de provincia (primeros 2 dígitos: 01-24 o 30)
  const codigoProvincia = clean.substring(0, 2);
  const numProvincia = parseInt(codigoProvincia, 10);
  if (numProvincia < 1 || (numProvincia > 24 && numProvincia !== 30)) {
    return {
      isValid: false,
      error: `Código de provincia "${codigoProvincia}" no válido. Debe estar entre 01 y 24.`
    };
  }

  // Validar tercer dígito (debe ser < 6 para persona natural)
  const tercerDigito = parseInt(clean[2], 10);
  if (tercerDigito >= 6) {
    return {
      isValid: false,
      error: `El tercer dígito "${tercerDigito}" no es válido para cédula de persona natural (debe ser 0-5).`
    };
  }

  // Algoritmo de validación con coeficientes 2, 1, 2, 1, 2, 1, 2, 1, 2
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let producto = parseInt(clean[i], 10) * coeficientes[i];
    // Si el producto es >= 10, restar 9
    if (producto >= 10) {
      producto -= 9;
    }
    suma += producto;
  }

  // Obtener la decena superior más cercana
  const decenaSuperior = Math.ceil(suma / 10) * 10;

  // Calcular dígito verificador
  const digitoVerificadorCalculado = decenaSuperior - suma;

  // Comparar con el décimo dígito de la cédula
  const digitoVerificadorCedula = parseInt(clean[9], 10);

  if (digitoVerificadorCalculado !== digitoVerificadorCedula) {
    return {
      isValid: false,
      error: 'La cédula no es válida. El dígito verificador no coincide.'
    };
  }

  return {
    isValid: true,
    error: '',
    provincia: PROVINCIAS_ECUADOR[codigoProvincia] || 'Desconocida'
  };
};

/**
 * Valida un RUC ecuatoriano (13 dígitos).
 * Los primeros 10 dígitos corresponden a la cédula,
 * y los últimos 3 dígitos son el código de establecimiento (usualmente 001).
 */
export const validarRUC = (ruc: string): CedulaValidationResult => {
  const clean = ruc.replace(/[\s\-]/g, '');

  if (!/^\d{13}$/.test(clean)) {
    return {
      isValid: false,
      error: 'El RUC debe tener exactamente 13 dígitos numéricos.'
    };
  }

  // Los últimos 3 dígitos deben ser 001 o mayor
  const establecimiento = clean.substring(10, 13);
  if (establecimiento === '000') {
    return {
      isValid: false,
      error: 'Los últimos 3 dígitos del RUC no pueden ser 000.'
    };
  }

  // Validar los primeros 10 dígitos como cédula
  const cedulaParte = clean.substring(0, 10);
  const resultCedula = validarCedulaEcuatoriana(cedulaParte);

  if (!resultCedula.isValid) {
    return {
      isValid: false,
      error: 'El RUC no es válido: ' + resultCedula.error
    };
  }

  return {
    isValid: true,
    error: '',
    provincia: resultCedula.provincia
  };
};

/**
 * Valida cédula o RUC automáticamente según la longitud.
 */
export const validarIdentificacion = (valor: string): CedulaValidationResult => {
  const clean = valor.replace(/[\s\-]/g, '');
  if (clean.length === 10) return validarCedulaEcuatoriana(clean);
  if (clean.length === 13) return validarRUC(clean);
  return {
    isValid: false,
    error: 'Ingresa una cédula (10 dígitos) o RUC (13 dígitos) válido.'
  };
};
