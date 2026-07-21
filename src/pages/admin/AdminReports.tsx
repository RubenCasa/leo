import React, { useEffect, useState } from 'react';
import { fetchTodosPedidos, updatePedidoEstado } from '../../lib/productosService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, FileText, Search, X, Filter, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';

interface PedidoReport {
  id: number;
  numero_pedido: string;
  total: number;
  estado: string;
  metodo_pago: string;
  created_at: string;
  usuarios: { nombre: string; email: string; cedula: string | null } | null;
  detalle_pedidos: Array<{
    nombre_producto: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
  comprobantes_sri?: Array<{
    clave_acceso?: string;
    xml_contenido?: string;
  }>;
  cedula_cliente?: string;
  identificacion_cliente?: string;
  usuario_id?: string;
}

/**
 * Obtiene la Cédula/RUC de un pedido buscando en múltiples fuentes:
 * 1. Perfil del usuario (tabla usuarios)
 * 2. XML oficial del SRI guardado (tabla comprobantes_sri)
 * 3. Campos del pedido directo
 * 4. Historial local de comprobantes
 */
const obtenerCedulaPedido = (pedido: PedidoReport): string => {
  if (pedido.usuarios?.cedula && pedido.usuarios.cedula.trim() !== '' && pedido.usuarios.cedula !== 'N/A') {
    return pedido.usuarios.cedula;
  }
  if (pedido.cedula_cliente && pedido.cedula_cliente.trim() !== '') {
    return pedido.cedula_cliente;
  }
  if (pedido.identificacion_cliente && pedido.identificacion_cliente.trim() !== '') {
    return pedido.identificacion_cliente;
  }
  if (pedido.comprobantes_sri && pedido.comprobantes_sri.length > 0) {
    const xml = pedido.comprobantes_sri[0].xml_contenido;
    if (xml) {
      const match = xml.match(/<identificacionComprador>([^<]+)<\/identificacionComprador>/);
      if (match && match[1] && match[1].trim() !== '') {
        const idExtracted = match[1].trim();
        return idExtracted === '9999999999999' ? '9999999999 (C. Final)' : idExtracted;
      }
    }
  }
  try {
    const raw = localStorage.getItem('lacteos_leo_comprobantes');
    if (raw) {
      const comprobantes = JSON.parse(raw);
      const match = comprobantes.find((c: any) => 
        c.orderNumber === pedido.numero_pedido || 
        (pedido.usuario_id && c.userId === pedido.usuario_id)
      );
      if (match && (match.customerIdNumber || match.idNumber || match.cedula)) {
        const idLocal = (match.customerIdNumber || match.idNumber || match.cedula).trim();
        return idLocal === '9999999999999' ? '9999999999 (C. Final)' : idLocal;
      }
    }
  } catch {
    // ignorar error de localStorage
  }
  return '9999999999 (C. Final)';
};

export const AdminReports: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    try {
      const data = await fetchTodosPedidos();
      setPedidos(data as PedidoReport[]);
    } catch (err) {
      console.error('Error cargando pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEstadoChange = async (pedidoId: number, numeroPedido: string, nuevoEstado: 'completado' | 'pendiente' | 'cancelado') => {
    try {
      await updatePedidoEstado(pedidoId, numeroPedido, nuevoEstado);
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: nuevoEstado } : p));
    } catch (err) {
      console.error('Error al actualizar el estado del pedido:', err);
    }
  };

  const filteredPedidos = pedidos.filter(p => {
    const matchesSearch = searchQuery.trim() === '' ||
      p.numero_pedido.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.usuarios?.nombre || '').toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(p.created_at) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(p.created_at) <= new Date(dateTo + 'T23:59:59');
    }

    return matchesSearch && matchesDate;
  });

  const totalVentas = filteredPedidos.reduce((sum, p) => sum + Number(p.total), 0);
  const pedidosCompletados = filteredPedidos.filter(p => p.estado === 'completado').length;
  const pedidosPendientes = filteredPedidos.filter(p => p.estado === 'pendiente').length;

  const total = filteredPedidos.length;
  const pctCompletado = total ? (pedidosCompletados / total) * 100 : 0;
  const pctPendiente = total ? (pedidosPendientes / total) * 100 : 0;
  
  const donutGradient = total === 0 
    ? 'conic-gradient(#e2ece3 0% 100%)' 
    : `conic-gradient(
        #16a34a 0% ${pctCompletado}%, 
        #f59e0b ${pctCompletado}% ${pctCompletado + pctPendiente}%, 
        #ef4444 ${pctCompletado + pctPendiente}% 100%
      )`;

  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = searchQuery !== '' || dateFrom !== '' || dateTo !== '';

  // ============================================================
  // EXPORTAR A CSV (RS-02)
  // ============================================================
  const exportCSV = () => {
    const headers = ['N° Pedido', 'Cliente', 'Email', 'Cédula', 'Total USD', 'Método Pago', 'Estado', 'Fecha'];
    const rows = filteredPedidos.map(p => [
      p.numero_pedido,
      p.usuarios?.nombre || 'N/A',
      p.usuarios?.email || 'N/A',
      obtenerCedulaPedido(p),
      p.total.toFixed(2),
      p.metodo_pago || 'N/A',
      p.estado,
      new Date(p.created_at).toLocaleDateString('es-EC')
    ]);

    const csvContent = [
      'REPORTE DE VENTAS - LÁCTEOS LEO COTOPAXI S.A.',
      `Generado: ${new Date().toLocaleString('es-EC')}`,
      `Total de pedidos: ${filteredPedidos.length}`,
      `Venta total: $${totalVentas.toFixed(2)}`,
      '',
      headers.join(','),
      ...rows.map(r => r.map(c => `"${c}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-ventas-lacteos-leo-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================================
  // EXPORTAR A PDF (RS-02)
  // ============================================================
  const exportPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text('REPORTE DE VENTAS', 14, 20);
    doc.setFontSize(12);
    doc.text('LÁCTEOS LEO COTOPAXI S.A.', 14, 28);
    doc.setFontSize(10);
    doc.text(`RUC: 0591728391001`, 14, 34);
    doc.text(`Generado: ${new Date().toLocaleString('es-EC')}`, 14, 40);
    doc.text(`Total de pedidos: ${filteredPedidos.length}`, 14, 46);
    doc.text(`Venta total: $${totalVentas.toFixed(2)}`, 14, 52);

    // Línea separadora
    doc.setDrawColor(46, 125, 50);
    doc.setLineWidth(0.5);
    doc.line(14, 56, 196, 56);

    // Tabla de pedidos
    const tableData = filteredPedidos.map(p => [
      p.numero_pedido,
      p.usuarios?.nombre || 'N/A',
      obtenerCedulaPedido(p),
      '$' + p.total.toFixed(2),
      p.metodo_pago || 'N/A',
      p.estado,
      new Date(p.created_at).toLocaleDateString('es-EC')
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['N° Pedido', 'Cliente', 'Cédula', 'Total', 'Método', 'Estado', 'Fecha']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [46, 125, 50], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 253, 248] }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || 60;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Documento generado por LEO-CONNECT • Sistema de Gestión Comercial', 14, finalY + 15);
    doc.text('Para auditoría financiera externa • Lácteos Leo Cotopaxi S.A.', 14, finalY + 20);

    doc.save(`reporte-ventas-lacteos-leo-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#475569' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2ece3', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
        <p className="font-display">Generando reportes...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="admin-page-header">
        <h1 className="font-display">Reportes y Auditoría (RS-02)</h1>
        <p>Analiza el rendimiento de ventas y exporta el registro en formatos CSV y PDF.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', marginBottom: '24px' }}>
        {/* KPIs Gradiente */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="admin-kpi-card" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ingresos Totales</span>
                <div style={{ fontSize: '36px', fontWeight: '800', marginTop: '8px' }}>${totalVentas.toFixed(2)}</div>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={24} color="#fff" />
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: '20px', width: 'fit-content' }}>
              <TrendingUp size={14} /> +12.5% vs mes anterior
            </div>
          </div>

          <div className="admin-kpi-card" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: '#fff', border: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pedidos en Rango</span>
                <div style={{ fontSize: '36px', fontWeight: '800', marginTop: '8px' }}>{total}</div>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={24} color="#fff" />
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: '20px', width: 'fit-content' }}>
              {pedidosCompletados} completados
            </div>
          </div>
        </div>

        {/* Gráfico de Dona CSS */}
        <div className="admin-kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', alignSelf: 'flex-start', marginBottom: '16px' }}>Estado de Pedidos</span>
          <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', background: donutGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{total}</span>
              <span style={{ fontSize: '10px', fontWeight: '600', color: '#64748b' }}>TOTAL</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '20px', width: '100%', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a' }}></div> Completado
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></div> Pendiente
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div> Cancelado
            </div>
          </div>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <div className="admin-table-toolbar" style={{ flexWrap: 'wrap', gap: '16px', background: '#f8faf9', borderBottom: '1px solid #e2ece3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1.5px solid #d1ddd3', borderRadius: '10px', padding: '0 12px' }}>
              <Search size={16} style={{ color: '#64748b' }} />
              <input
                type="text"
                placeholder="Buscar por N° pedido o cliente..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', padding: '10px 0', fontSize: '13px', width: '220px' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1.5px solid #d1ddd3', borderRadius: '10px', padding: '6px 12px' }}>
              <Filter size={14} style={{ color: '#64748b' }} />
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#475569', background: 'transparent' }}
              />
              <span style={{ color: '#cbd5e1' }}>|</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#475569', background: 'transparent' }}
              />
            </div>

            {hasFilters && (
              <button 
                onClick={clearFilters}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' }}
              >
                <X size={14} /> Limpiar Filtros
              </button>
            )}
          </div>
          
          <div className="admin-export-btns" style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={exportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1.5px solid #e2ece3', color: '#475569', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#16a34a'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#e2ece3'}
            >
              <FileDown size={16} color="#16a34a" /> CSV
            </button>
            <button 
              onClick={exportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1.5px solid #e2ece3', color: '#475569', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#dc2626'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#e2ece3'}
            >
              <FileText size={16} color="#dc2626" /> PDF
            </button>
          </div>
        </div>

        <table className="admin-data-table">
          <thead>
            <tr>
              <th>N° Pedido</th>
              <th>Cliente</th>
              <th>Cédula</th>
              <th>Total</th>
              <th>Método Pago</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {filteredPedidos.map(pedido => (
              <tr key={pedido.id} style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#16a34a' }}>
                  {pedido.numero_pedido}
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{pedido.usuarios?.nombre || 'N/A'}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{pedido.usuarios?.email || ''}</div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                  {obtenerCedulaPedido(pedido)}
                </td>
                <td style={{ fontWeight: 800, color: '#16a34a', fontSize: '15px' }}>
                  ${Number(pedido.total).toFixed(2)}
                </td>
                <td>
                  <span style={{ display: 'inline-block', padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>
                    {pedido.metodo_pago || 'N/A'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pedido.estado === 'completado' ? '#16a34a' : pedido.estado === 'pendiente' ? '#f59e0b' : '#ef4444', flexShrink: 0 }}></span>
                    <select
                      value={pedido.estado}
                      onChange={e => handleEstadoChange(pedido.id, pedido.numero_pedido, e.target.value as any)}
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: pedido.estado === 'completado' ? '#166534' : pedido.estado === 'pendiente' ? '#b45309' : '#991b1b',
                        background: pedido.estado === 'completado' ? '#dcfce7' : pedido.estado === 'pendiente' ? '#fef3c7' : '#fee2e2',
                        padding: '4px 8px',
                        borderRadius: '20px',
                        textTransform: 'uppercase',
                        border: '1px solid transparent',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="completado" style={{ background: '#fff', color: '#166534', fontWeight: 700 }}>COMPLETADO</option>
                      <option value="pendiente" style={{ background: '#fff', color: '#b45309', fontWeight: 700 }}>PENDIENTE</option>
                      <option value="cancelado" style={{ background: '#fff', color: '#991b1b', fontWeight: 700 }}>CANCELADO</option>
                    </select>
                  </div>
                </td>
                <td style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                  {new Date(pedido.created_at).toLocaleDateString('es-EC')}
                </td>
              </tr>
            ))}
            {filteredPedidos.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  <FileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                  <p style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>No se encontraron pedidos.</p>
                  <p style={{ fontSize: '13px', margin: '4px 0 0' }}>Intenta ajustar los filtros de búsqueda.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
