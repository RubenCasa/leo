import React, { useEffect, useState } from 'react';
import { fetchTodosPedidos } from '../../lib/productosService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, FileText, Search } from 'lucide-react';

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
}

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

  // ============================================================
  // EXPORTAR A CSV (RS-02)
  // ============================================================
  const exportCSV = () => {
    const headers = ['N° Pedido', 'Cliente', 'Email', 'Cédula', 'Total USD', 'Método Pago', 'Estado', 'Fecha'];
    const rows = filteredPedidos.map(p => [
      p.numero_pedido,
      p.usuarios?.nombre || 'N/A',
      p.usuarios?.email || 'N/A',
      p.usuarios?.cedula || 'N/A',
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
      p.usuarios?.cedula || 'N/A',
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
    return <div style={{ padding: '60px', textAlign: 'center' }}>Cargando reportes...</div>;
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="font-display">Reportes y Auditoría (RS-02)</h1>
        <p>Exporta el registro completo de ventas en formatos CSV y PDF para auditorías financieras externas.</p>
      </div>

      {/* Resumen */}
      <div className="admin-kpi-row" style={{ marginBottom: '20px' }}>
        <div className="admin-kpi-card">
          <span className="kpi-label">Pedidos en Rango</span>
          <div className="kpi-value font-display">{filteredPedidos.length}</div>
        </div>
        <div className="admin-kpi-card">
          <span className="kpi-label">Venta Total</span>
          <div className="kpi-value font-display">${totalVentas.toFixed(2)}</div>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <div className="admin-table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Search size={16} style={{ color: '#64748b' }} />
            <input
              type="text"
              placeholder="Buscar por N° pedido o cliente..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{ padding: '9px 12px', border: '1.5px solid #d1ddd3', borderRadius: '8px', fontSize: '13px' }}
            />
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>a</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{ padding: '9px 12px', border: '1.5px solid #d1ddd3', borderRadius: '8px', fontSize: '13px' }}
            />
          </div>
          <div className="admin-export-btns">
            <button className="admin-btn-export csv" onClick={exportCSV}>
              <FileDown size={15} /> Exportar CSV
            </button>
            <button className="admin-btn-export pdf" onClick={exportPDF}>
              <FileText size={15} /> Exportar PDF
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
              <tr key={pedido.id}>
                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1b5e20' }}>
                  {pedido.numero_pedido}
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{pedido.usuarios?.nombre || 'N/A'}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{pedido.usuarios?.email || ''}</div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                  {pedido.usuarios?.cedula || '—'}
                </td>
                <td style={{ fontWeight: 800, color: '#1b5e20' }}>
                  ${Number(pedido.total).toFixed(2)}
                </td>
                <td style={{ textTransform: 'capitalize', fontSize: '12px' }}>
                  {pedido.metodo_pago || 'N/A'}
                </td>
                <td>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: pedido.estado === 'completado' ? '#2e7d32' : '#e65100',
                    background: pedido.estado === 'completado' ? '#e8f5e9' : '#fff3e0',
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}>
                    {pedido.estado}
                  </span>
                </td>
                <td style={{ fontSize: '12px', color: '#64748b' }}>
                  {new Date(pedido.created_at).toLocaleDateString('es-EC')}
                </td>
              </tr>
            ))}
            {filteredPedidos.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No se encontraron pedidos en el rango seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
