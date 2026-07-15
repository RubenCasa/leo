// ============================================================================
// LEO-CONNECT: Supabase Edge Function para Envío de Facturas con Resend
// Desplegar con: supabase functions deploy enviar-comprobante
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('Falta configurar la variable RESEND_API_KEY en los secretos de Supabase.');
    }

    const { orderNumber, customerName, customerEmail, items, totalAmount, date, claveAcceso } = await req.json();

    const itemsRows = (items || []).map((item: any) => `
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
      <head>
        <meta charset="UTF-8">
        <title>Factura y Comprobante Lácteos Leo</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; color: #334155;">
        <div style="max-width: 640px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Verde Cotopaxi -->
          <div style="background: linear-gradient(135deg, #166534 0%, #15803d 100%); padding: 36px 32px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">🐮 LÁCTEOS LEO</h1>
            <p style="margin: 8px 0 0 0; color: #dcfce7; font-size: 14px; font-weight: 500;">Excelencia y Tradición Cotopaxense desde 1990</p>
          </div>

          <!-- Contenido Principal -->
          <div style="padding: 36px 32px;">
            <div style="background: #f0fdf4; border-left: 4px solid #166534; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 28px;">
              <h2 style="margin: 0; font-size: 18px; color: #166534; font-weight: 700;">¡Gracias por tu pedido, ${customerName}!</h2>
              <p style="margin: 6px 0 0 0; font-size: 14px; color: #15803d;">Tu orden <strong>#${orderNumber}</strong> ha sido confirmada y nuestra bodega en Guaytacama ya la está preparando con la mayor frescura.</p>
            </div>

            <h3 style="font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 16px 0;">Desglose de tu Pedido</h3>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
              <thead>
                <tr style="background-color: #f1f5f9; text-align: left;">
                  <th style="padding: 12px; font-size: 12px; text-transform: uppercase; color: #475569; font-weight: 700;">Producto</th>
                  <th style="padding: 12px; font-size: 12px; text-transform: uppercase; color: #475569; font-weight: 700; text-align: center;">Cant.</th>
                  <th style="padding: 12px; font-size: 12px; text-transform: uppercase; color: #475569; font-weight: 700; text-align: right;">Precio</th>
                  <th style="padding: 12px; font-size: 12px; text-transform: uppercase; color: #475569; font-weight: 700; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 16px 12px; text-align: right; font-weight: 700; font-size: 16px; color: #0f172a;">TOTAL PAGADO:</td>
                  <td style="padding: 16px 12px; text-align: right; font-weight: 800; font-size: 18px; color: #166534;">$${Number(totalAmount).toFixed(2)} USD</td>
                </tr>
              </tfoot>
            </table>

            <!-- Clave SRI -->
            ${claveAcceso ? `
            <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 28px;">
              <span style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 6px;">Clave de Acceso Electrónica SRI (49 Dígitos)</span>
              <code style="font-family: monospace; font-size: 12px; color: #0f172a; word-break: break-all; font-weight: 600; background: #e2e8f0; padding: 6px 10px; border-radius: 6px; display: inline-block;">${claveAcceso}</code>
            </div>
            ` : ''}

            <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin: 0;">
              Si tienes alguna duda o deseas coordinar detalles especiales del envío, comunícate directamente con nuestro equipo de pedidos por WhatsApp al <strong>099 893 3267</strong>.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">Lácteos Leo - Guaytacama, Cotopaxi, Ecuador</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">100% Leche de Pastoreo • Certificación INEN • Calidad y Tradición</p>
          </div>

        </div>
      </body>
      </html>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Lácteos Leo <pedidos@lacteosleo.com>',
        to: [customerEmail],
        subject: `🐮 ¡Factura Electrónica y Pedido #${orderNumber} - Lácteos Leo!`,
        html: htmlContent
      })
    });

    const resendData = await resendRes.json();

    return new Response(JSON.stringify(resendData), {
      status: resendRes.ok ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
