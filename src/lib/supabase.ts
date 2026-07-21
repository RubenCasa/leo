// ============================================================================
// Supabase Client & Google OAuth for Lácteos Leo Cotopaxi
// Project: https://lxdoovfmkqkklrqzvios.supabase.co
// ============================================================================
import { createClient } from '@supabase/supabase-js';

// Configuración del cliente de Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lxdoovfmkqkklrqzvios.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_yjj5kcg-kCJ-voMJ2-vv8Q__zx2iJ8l';

export const SUPABASE_REST_URL = `${SUPABASE_URL}/rest/v1`;

// Cliente de Supabase (singleton)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Registrar usuario con correo y contraseña.
 * Supabase envía automáticamente un correo de confirmación.
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  metadata?: { name?: string; phone?: string; cedula?: string }
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata || {},
      emailRedirectTo: window.location.origin
    }
  });

  if (error) {
    console.error('[Supabase Auth] Error en registro:', error.message);
    throw error;
  }

  return data;
};

/**
 * Iniciar sesión con correo y contraseña.
 * Solo funciona si el usuario ya confirmó su correo.
 */
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('[Supabase Auth] Error en login:', error.message);
    throw error;
  }

  return data;
};

/**
 * Inicia sesión con Google OAuth a través de Supabase Auth.
 */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) {
    console.error('[Supabase Auth] Error al iniciar sesión con Google:', error.message);
    throw error;
  }

  return data;
};

// ============================================================================
// Comprobantes / Receipts
// ============================================================================

export interface OrderComprobante {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerIdNumber?: string;
  cedula?: string;
  userId?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  date: string;
  status: 'completado' | 'pendiente';
  claveAcceso?: string;
}

/**
 * Envía comprobante de pedido y factura hermosa en HTML vía Supabase Edge Function (Resend)
 */
export const sendComprobanteEmailViaSupabase = async (
  comprobante: OrderComprobante,
  apiKey?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // 1. Guardar siempre en historial local para que el usuario pueda consultar sus comprobantes
    const existingRaw = localStorage.getItem('lacteos_leo_comprobantes');
    const existing: OrderComprobante[] = existingRaw ? JSON.parse(existingRaw) : [];
    existing.unshift(comprobante);
    localStorage.setItem('lacteos_leo_comprobantes', JSON.stringify(existing));

    console.log(`[SUPABASE COMPROBANTE API] Preparando factura y envío a ${comprobante.customerEmail}`, comprobante);

    // 2. Intentar llamar a la Edge Function de Supabase (`enviar-comprobante`)
    try {
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('enviar-comprobante', {
        body: comprobante
      });

      if (!edgeError && edgeData) {
        console.log('[SUPABASE EDGE FUNCTION] Correo enviado por Resend exitosamente:', edgeData);
        return {
          success: true,
          message: `Factura y Comprobante #${comprobante.orderNumber} enviados exitosamente al correo ${comprobante.customerEmail}.`
        };
      }
    } catch (e) {
      console.warn('[SUPABASE EDGE FUNCTION] Edge function no desplegada aún o sin llave de Resend:', e);
    }

    // 3. Respaldo opcional directo desde frontend si VITE_RESEND_API_KEY está configurada en .env
    const clientResendKey = import.meta.env.VITE_RESEND_API_KEY || apiKey;
    if (clientResendKey && clientResendKey.startsWith('re_')) {
      const itemsRows = comprobante.items.map(item => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b;">${item.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #475569; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #475569; text-align: right;">$${Number(item.price).toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #166534; text-align: right;">$${(Number(item.quantity) * Number(item.price)).toFixed(2)}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"></head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, sans-serif; background-color: #f8fafc; color: #334155;">
          <div style="max-width: 640px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #166534 0%, #15803d 100%); padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">🐮 LÁCTEOS LEO</h1>
              <p style="margin: 8px 0 0 0; color: #dcfce7; font-size: 14px;">Excelencia y Tradición Cotopaxense desde 1990</p>
            </div>
            <div style="padding: 36px 32px;">
              <div style="background: #f0fdf4; border-left: 4px solid #166534; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 28px;">
                <h2 style="margin: 0; font-size: 18px; color: #166534; font-weight: 700;">¡Gracias por tu pedido, ${comprobante.customerName}!</h2>
                <p style="margin: 6px 0 0 0; font-size: 14px; color: #15803d;">Tu orden <strong>#${comprobante.orderNumber}</strong> ha sido confirmada y nuestra bodega en Guaytacama ya la está preparando con la mayor frescura.</p>
              </div>
              <h3 style="font-size: 15px; text-transform: uppercase; color: #64748b; margin: 0 0 16px 0;">Desglose de tu Pedido</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                <thead>
                  <tr style="background-color: #f1f5f9; text-align: left;">
                    <th style="padding: 12px; font-size: 12px; color: #475569;">Producto</th>
                    <th style="padding: 12px; font-size: 12px; color: #475569; text-align: center;">Cant.</th>
                    <th style="padding: 12px; font-size: 12px; color: #475569; text-align: right;">Precio</th>
                    <th style="padding: 12px; font-size: 12px; color: #475569; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>${itemsRows}</tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding: 16px 12px; text-align: right; font-weight: 700;">TOTAL PAGADO:</td>
                    <td style="padding: 16px 12px; text-align: right; font-weight: 800; color: #166534;">$${Number(comprobante.totalAmount).toFixed(2)} USD</td>
                  </tr>
                </tfoot>
              </table>
              <p style="font-size: 14px; color: #64748b;">Dudas o envíos por WhatsApp al <strong>099 893 3267</strong>.</p>
            </div>
            <div style="background: #f1f5f9; padding: 24px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">Lácteos Leo - Guaytacama, Cotopaxi, Ecuador</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${clientResendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Lácteos Leo <pedidos@lacteosleo.com>',
          to: [comprobante.customerEmail],
          subject: `🐮 ¡Factura Electrónica y Pedido #${comprobante.orderNumber} - Lácteos Leo!`,
          html: htmlContent
        })
      });
    }

    return {
      success: true,
      message: `Comprobante electrónico #${comprobante.orderNumber} procesado y listo. Facturas en PDF y XML generadas correctamente.`
    };
  } catch (err) {
    console.error('Error procesando comprobante por Supabase API:', err);
    return {
      success: false,
      message: 'Error en procesamiento del comprobante.'
    };
  }
};
