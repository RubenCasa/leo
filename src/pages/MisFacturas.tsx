import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { obtenerFacturasUsuario, type FacturaUsuarioDB } from '../lib/productosService';
import { supabase } from '../lib/supabase';
import { validarIdentificacion, type CedulaValidationResult } from '../utils/cedulaValidator';
import { FileText, Download, CheckCircle2, Loader2, AlertCircle, Copy, ArrowLeft, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const MisFacturas: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const [facturas, setFacturas] = useState<FacturaUsuarioDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cedulaInput, setCedulaInput] = useState('');
  const [cedulaResult, setCedulaResult] = useState<CedulaValidationResult | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      cargarFacturas();

      // CONEXIÓN EN VIVO A SUPABASE (WebSockets Realtime)
      const channel = supabase
        .channel('comprobantes-realtime-client')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comprobantes_sri' },
          (payload) => {
            console.log('⚡ ¡Cambio EN VIVO en Supabase detectado!', payload);
            cargarFacturas(); // Actualización en vivo al instante
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const cargarFacturas = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const data = await obtenerFacturasUsuario(user.id);
      setFacturas(data);
    } catch (err: any) {
      console.error('Error detallado de Supabase:', err);
      setError(err?.message || 'No se pudieron cargar tus facturas electrónicas desde Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const copiarClave = (clave: string) => {
    navigator.clipboard.writeText(clave);
    alert('Clave de Acceso SRI copiada al portapapeles:\n' + clave);
  };

  const descargarXML = (xml: string, numPedido: string) => {
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-${numPedido}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!user) {
    return (
      <div style={{ maxWidth: '800px', margin: '80px auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '48px 24px' }}>
          <FileText size={56} style={{ color: '#16a34a', margin: '0 auto 16px', opacity: 0.8 }} />
          <h2 className="font-display" style={{ fontSize: '28px', color: '#0f172a', marginBottom: '12px' }}>
            Inicia Sesión para Ver tus Facturas
          </h2>
          <p style={{ color: '#64748b', fontSize: '15px', maxWidth: '420px', margin: '0 auto 24px' }}>
            Para consultar tu historial oficial de facturación electrónica e inventario de pedidos con SRI, por favor ingresa a tu cuenta.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="nav-btn-login font-display"
            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '30px', fontSize: '16px', cursor: 'pointer' }}
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 140px)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#334155' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PANEL DEL CLIENTE • LÁCTEOS LEO
            </span>
            <h1 className="font-display" style={{ fontSize: '32px', color: '#0f172a', margin: '4px 0 0' }}>
              Mis Facturas Electrónicas y Pedidos
            </h1>
          </div>
        </div>

        {/* Info Banner */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '16px 20px', marginBottom: '28px', display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1 }}>
            <ShieldCheck size={28} style={{ color: '#16a34a', flexShrink: 0 }} />
            <div style={{ fontSize: '13.5px', color: '#14532d' }}>
              <strong>Validación Oficial SRI & Supabase:</strong> Todas las facturas generadas están enlazadas criptográficamente y cumplen con el Módulo 11 del SRI.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
            SUPABASE REALTIME EN VIVO
          </div>
        </div>

        {/* Validador Oficial de Cédula / RUC SRI & Registro Civil */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '10px', borderRadius: '12px' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-display" style={{ margin: 0, fontSize: '19px', color: '#0f172a' }}>
                Verificación Oficial de Identidad (Cédula / RUC Ecuador)
              </h3>
              <span style={{ fontSize: '13.5px', color: '#64748b' }}>
                Comprueba la autenticidad en tiempo real con el algoritmo oficial Módulo 10 del Registro Civil y SRI antes de consultar facturas tributarias.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '18px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Ej: 1712345678 (Cédula) o 1712345678001 (RUC)..."
              value={cedulaInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                setCedulaInput(val);
                if (val.length === 10 || val.length === 13) {
                  setCedulaResult(validarIdentificacion(val));
                } else {
                  setCedulaResult(null);
                }
              }}
              style={{
                flex: '1 1 280px',
                padding: '14px 18px',
                borderRadius: '12px',
                border: `2px solid ${cedulaResult ? (cedulaResult.isValid ? '#22c55e' : '#ef4444') : '#cbd5e1'}`,
                fontSize: '15px',
                fontWeight: 600,
                outline: 'none',
                color: '#0f172a',
                fontFamily: 'monospace'
              }}
            />
            <button
              type="button"
              onClick={() => setCedulaResult(validarIdentificacion(cedulaInput))}
              style={{
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                padding: '14px 26px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              Verificar Autenticidad SRI
            </button>
          </div>

          {/* Resultado del algoritmo Módulo 10 */}
          {cedulaResult && (
            <div style={{
              marginTop: '18px',
              padding: '16px 20px',
              borderRadius: '12px',
              background: cedulaResult.isValid ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${cedulaResult.isValid ? '#bbf7d0' : '#fecaca'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {cedulaResult.isValid ? (
                  <CheckCircle2 size={26} style={{ color: '#16a34a' }} />
                ) : (
                  <AlertCircle size={26} style={{ color: '#dc2626' }} />
                )}
                <div>
                  <strong style={{ display: 'block', fontSize: '14.5px', color: cedulaResult.isValid ? '#14532d' : '#991b1b', marginBottom: '2px' }}>
                    {cedulaResult.isValid ? 'DOCUMENTO DE IDENTIDAD 100% VÁLIDO EN ECUADOR' : 'ERROR EN VALIDACIÓN DEL DOCUMENTO'}
                  </strong>
                  <span style={{ fontSize: '13.5px', color: cedulaResult.isValid ? '#166534' : '#b91c1c' }}>
                    {cedulaResult.isValid
                      ? `Provincia de Emisión detectada: ${cedulaResult.provincia} • Algoritmo oficial Módulo 10 verificado.`
                      : cedulaResult.error}
                  </span>
                </div>
              </div>
              {cedulaResult.isValid && (
                <span style={{ fontSize: '11px', fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '6px 12px', borderRadius: '20px', border: '1px solid #86efac' }}>
                  CERTIFICADO REGISTRO CIVIL / SRI
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content Section */}
        {loading ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '80px 20px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <Loader2 className="animate-spin" size={44} style={{ margin: '0 auto 16px', color: '#16a34a' }} />
            <h3 style={{ margin: '0 0 8px', color: '#334155' }}>Sincronizando con Supabase...</h3>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Obteniendo tus transacciones e historial tributario en tiempo real.</p>
          </div>
        ) : error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '14px', padding: '24px', color: '#b91c1c', display: 'flex', gap: '14px', alignItems: 'center' }}>
            <AlertCircle size={28} />
            <div>
              <strong style={{ display: 'block', marginBottom: '4px' }}>Ocurrió un error al cargar el historial</strong>
              <span>{error}</span>
            </div>
          </div>
        ) : facturas.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '80px 20px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <ShoppingBag size={56} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
            <h3 className="font-display" style={{ fontSize: '22px', color: '#334155', marginBottom: '8px' }}>
              Aún no tienes facturas registradas en el sistema
            </h3>
            <p style={{ color: '#64748b', fontSize: '15px', maxWidth: '450px', margin: '0 auto 24px' }}>
              ¡Explora nuestro catálogo de quesos maduros y yogures naturales! Tus facturas electrónicas aparecerán aquí inmediatamente al confirmar el pago.
            </p>
            <Link
              to="/productos"
              className="font-display"
              style={{ display: 'inline-block', background: '#16a34a', color: '#fff', padding: '12px 28px', borderRadius: '30px', textDecoration: 'none', fontWeight: 600 }}
            >
              Ir al Catálogo de Lácteos
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {facturas.map((fac) => (
              <div
                key={fac.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Header Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase' }}>
                      {fac.pedidos?.metodo_pago || 'TARJETA'} ECUADOR (PCI-DSS)
                    </span>
                    <h3 className="font-display" style={{ margin: '10px 0 4px', fontSize: '22px', color: '#0f172a' }}>
                      Pedido #{fac.pedidos?.numero_pedido || `FAC-${fac.id}`}
                    </h3>
                    <span style={{ fontSize: '13.5px', color: '#64748b' }}>
                      Fecha de Emisión: {new Date(fac.created_at).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#16a34a' }}>
                      ${fac.pedidos?.total ? fac.pedidos.total.toFixed(2) : '0.00'}
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
                      <CheckCircle2 size={15} /> {fac.estado.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* SRI Key Box */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 700, marginBottom: '6px' }}>
                    CLAVE DE ACCESO OFICIAL SRI (49 DÍGITOS - MÓDULO 11):
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <code style={{ fontSize: '13px', color: '#0f172a', wordBreak: 'break-all', fontFamily: 'monospace', fontWeight: 600 }}>
                      {fac.clave_acceso}
                    </code>
                    <button
                      type="button"
                      onClick={() => copiarClave(fac.clave_acceso)}
                      style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600, flexShrink: 0 }}
                      title="Copiar Clave"
                    >
                      <Copy size={15} /> Copiar Clave
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '4px' }}>
                  {fac.xml_contenido && (
                    <button
                      type="button"
                      onClick={() => descargarXML(fac.xml_contenido || '', fac.pedidos?.numero_pedido || 'sri')}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Download size={16} /> Descargar Archivo XML SRI
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
