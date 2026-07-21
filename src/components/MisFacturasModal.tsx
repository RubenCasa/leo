import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { obtenerFacturasUsuario, type FacturaUsuarioDB } from '../lib/productosService';
import { generateSRIXML, generateRIDE } from '../utils/sriGenerator';
import { FileText, Download, CheckCircle2, Loader2, AlertCircle, X, Copy } from 'lucide-react';
import './AuthModal.css'; // Reutilizamos estilos modales limpios

interface MisFacturasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MisFacturasModal: React.FC<MisFacturasModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [facturas, setFacturas] = useState<FacturaUsuarioDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarFacturas();
    }
  }, [isOpen, user]);

  const cargarFacturas = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await obtenerFacturasUsuario(user?.id, user?.role, user?.email);
      setFacturas(data);
    } catch (err: any) {
      setError('No se pudieron cargar tus facturas electrónicas.');
    } finally {
      setLoading(false);
    }
  };

  const copiarClave = (clave: string) => {
    navigator.clipboard.writeText(clave);
    alert('Clave de Acceso SRI copiada al portapapeles:\n' + clave);
  };

  const descargarXML = (fac: FacturaUsuarioDB) => {
    let xml = fac.xml_contenido || '';
    const numPedido = fac.pedidos?.numero_pedido || 'SRI-' + (fac.secuencial || fac.id);
    if (!xml || xml.trim() === '') {
      xml = generateSRIXML(
        { name: user?.name || 'Cliente Lácteos Leo', idNumber: '9999999999999', address: 'Ecuador', email: user?.email || 'cliente@lacteosleo.com' },
        [{ id: '1', name: `Pedido #${numPedido}`, price: fac.pedidos?.total || 10, quantity: 1, desc: 'Producto Lácteos Leo', image: '', category: 'lácteos' }],
        fac.pedidos?.total || 10,
        fac.clave_acceso,
        fac.secuencial || '001'
      );
    }
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-sri-${numPedido}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const descargarPDF = (fac: FacturaUsuarioDB) => {
    const numPedido = fac.pedidos?.numero_pedido || 'SRI-' + (fac.secuencial || fac.id);
    const doc = generateRIDE(
      { name: user?.name || 'Cliente Lácteos Leo', idNumber: '9999999999999', address: 'Ecuador', email: user?.email || 'cliente@lacteosleo.com' },
      [{ id: '1', name: `Pedido #${numPedido}`, price: fac.pedidos?.total || 10, quantity: 1, desc: 'Producto Lácteos Leo', image: '', category: 'lácteos' }],
      fac.pedidos?.total || 10,
      fac.clave_acceso,
      fac.secuencial || '001'
    );
    doc.save(`comprobante-ride-${numPedido}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '750px', width: '95%', maxHeight: '85vh', overflowY: 'auto', padding: '28px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#dcfce7', color: '#166534', padding: '10px', borderRadius: '12px' }}>
              <FileText size={26} />
            </div>
            <div>
              <h2 className="font-display" style={{ margin: 0, fontSize: '22px', color: '#111827' }}>
                Mis Facturas Electrónicas (SRI)
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Historial de comprobantes emitidos y almacenados en Supabase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', color: '#475569' }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
            <Loader2 className="animate-spin" size={36} style={{ margin: '0 auto 12px', color: '#16a34a' }} />
            <p>Consultando base de datos Supabase...</p>
          </div>
        ) : error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px', color: '#b91c1c', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <AlertCircle size={24} />
            <span>{error}</span>
          </div>
        ) : facturas.length === 0 ? (
          <div style={{ padding: '50px 0', textAlign: 'center', color: '#64748b' }}>
            <FileText size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <h4 style={{ margin: '0 0 8px', color: '#334155' }}>Aún no tienes facturas registradas</h4>
            <p style={{ fontSize: '14px', maxWidth: '350px', margin: '0 auto' }}>
              Todas tus compras en Lácteos Leo se guardarán aquí con su Clave de Acceso oficial del SRI.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {facturas.map((fac) => (
              <div
                key={fac.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '16px',
                  background: '#f8fafc',
                  transition: 'box-shadow 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
                      {fac.pedidos?.metodo_pago || 'TARJETA'} ECUADOR
                    </span>
                    <h4 className="font-display" style={{ margin: '8px 0 4px', fontSize: '18px', color: '#1e293b' }}>
                      Pedido #{fac.pedidos?.numero_pedido || `FAC-${fac.id}`}
                    </h4>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      Emitida el {new Date(fac.created_at).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>
                      ${fac.pedidos?.total ? fac.pedidos.total.toFixed(2) : '0.00'}
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                      <CheckCircle2 size={13} /> {fac.estado.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                    CLAVE DE ACCESO SRI (49 DÍGITOS):
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <code style={{ fontSize: '11.5px', color: '#0f172a', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {fac.clave_acceso}
                    </code>
                    <button
                      type="button"
                      onClick={() => copiarClave(fac.clave_acceso)}
                      style={{ background: '#f1f5f9', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#334155', flexShrink: 0 }}
                      title="Copiar Clave"
                    >
                      <Copy size={13} /> Copiar
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => descargarXML(fac)}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> Descargar XML SRI
                  </button>
                  <button
                    type="button"
                    onClick={() => descargarPDF(fac)}
                    style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> Descargar PDF RIDE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
