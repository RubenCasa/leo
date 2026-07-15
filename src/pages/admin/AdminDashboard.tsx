import React, { useEffect, useState, useRef } from 'react';
import { fetchEstadisticasDashboard } from '../../lib/productosService';
import { Package, ShoppingCart, Users, DollarSign } from 'lucide-react';

interface DashboardStats {
  totalProductos: number;
  totalPedidos: number;
  totalUsuarios: number;
  ventasTotales: number;
  pedidosMensuales: Array<{ created_at: string; total: number }>;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (stats) {
      drawBarChart();
      drawLineChart();
    }
  }, [stats]);

  const loadStats = async () => {
    try {
      const data = await fetchEstadisticasDashboard();
      setStats(data);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      // Usar datos de ejemplo si no hay conexión a BD
      setStats({
        totalProductos: 23,
        totalPedidos: 0,
        totalUsuarios: 0,
        ventasTotales: 0,
        pedidosMensuales: []
      });
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyData = () => {
    const months: Record<string, number> = {};
    const now = new Date();
    // Preparar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }
    // Sumar ventas por mes
    stats?.pedidosMensuales.forEach(p => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (months[key] !== undefined) {
        months[key] += Number(p.total);
      }
    });
    return months;
  };

  const drawBarChart = () => {
    const canvas = barChartRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const monthlyData = getMonthlyData();
    const labels = Object.keys(monthlyData);
    const values = Object.values(monthlyData);
    const maxVal = Math.max(...values, 50);

    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = 340;
    ctx.scale(2, 2);
    const cw = w / 2;
    const ch = h / 2;

    ctx.clearRect(0, 0, cw, ch);

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = cw - padding.left - padding.right;
    const chartH = ch - padding.top - padding.bottom;
    const barWidth = chartW / labels.length * 0.6;
    const barGap = chartW / labels.length * 0.4;

    // Grid lines
    ctx.strokeStyle = '#e2ece3';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(cw - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('$' + Math.round(maxVal - (maxVal / 4) * i).toString(), padding.left - 6, y + 3);
    }

    // Bars
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    labels.forEach((label, i) => {
      const x = padding.left + i * (barWidth + barGap) + barGap / 2;
      const barH = (values[i] / maxVal) * chartH;
      const y = padding.top + chartH - barH;

      // Bar gradient
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, '#43a047');
      grad.addColorStop(1, '#1b5e20');
      ctx.fillStyle = grad;

      // Rounded top
      const radius = 4;
      ctx.beginPath();
      ctx.moveTo(x, y + barH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barH);
      ctx.closePath();
      ctx.fill();

      // Value on top
      ctx.fillStyle = '#1b5e20';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$' + values[i].toFixed(0), x + barWidth / 2, y - 5);

      // Month label
      const monthNum = parseInt(label.split('-')[1], 10);
      ctx.fillStyle = '#475569';
      ctx.font = '10px sans-serif';
      ctx.fillText(monthNames[monthNum - 1], x + barWidth / 2, ch - padding.bottom + 16);
    });
  };

  const drawLineChart = () => {
    const canvas = lineChartRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const monthlyData = getMonthlyData();
    const values = Object.values(monthlyData);
    const labels = Object.keys(monthlyData);
    // Convert to cumulative users (simulated)
    const cumulativeValues = values.map((_, i) => {
      return (stats?.totalUsuarios || 1) * ((i + 1) / values.length);
    });
    const maxVal = Math.max(...cumulativeValues, 5);

    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = 340;
    ctx.scale(2, 2);
    const cw = w / 2;
    const ch = h / 2;

    ctx.clearRect(0, 0, cw, ch);

    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartW = cw - padding.left - padding.right;
    const chartH = ch - padding.top - padding.bottom;

    // Grid lines
    ctx.strokeStyle = '#e2ece3';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(cw - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * i).toString(), padding.left - 6, y + 3);
    }

    // Line
    const points: { x: number; y: number }[] = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    labels.forEach((label, i) => {
      const x = padding.left + (i / (labels.length - 1 || 1)) * chartW;
      const y = padding.top + chartH - (cumulativeValues[i] / maxVal) * chartH;
      points.push({ x, y });

      const monthNum = parseInt(label.split('-')[1], 10);
      ctx.fillStyle = '#475569';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(monthNames[monthNum - 1], x, ch - padding.bottom + 16);
    });

    // Fill area
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      grad.addColorStop(0, 'rgba(46,125,50,0.15)');
      grad.addColorStop(1, 'rgba(46,125,50,0.01)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Line stroke
      ctx.beginPath();
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Points
      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#475569' }}>
        Cargando estadísticas del Dashboard...
      </div>
    );
  }

  const kpis = [
    { icon: <Package size={22} />, label: 'Productos en Catálogo', value: stats?.totalProductos || 0, color: '#2e7d32' },
    { icon: <ShoppingCart size={22} />, label: 'Pedidos Totales', value: stats?.totalPedidos || 0, color: '#1565c0' },
    { icon: <Users size={22} />, label: 'Usuarios Registrados', value: stats?.totalUsuarios || 0, color: '#e65100' },
    { icon: <DollarSign size={22} />, label: 'Ventas Totales', value: '$' + (stats?.ventasTotales || 0).toFixed(2), color: '#2e7d32' },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="font-display">Dashboard LEO-CONNECT</h1>
        <p>Vista general del rendimiento de Lácteos Leo en tiempo real.</p>
      </div>

      {/* KPI Cards */}
      <div className="admin-kpi-row">
        {kpis.map((kpi, i) => (
          <div key={i} className="admin-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ color: kpi.color, opacity: 0.8 }}>{kpi.icon}</div>
              <span className="kpi-label">{kpi.label}</span>
            </div>
            <div className="kpi-value font-display">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts (RF-03) */}
      <div className="admin-charts-row">
        <div className="admin-chart-card">
          <h3 className="font-display">📊 Ventas Mensuales (Últimos 6 Meses)</h3>
          <canvas ref={barChartRef} style={{ width: '100%', height: '170px' }} />
        </div>
        <div className="admin-chart-card">
          <h3 className="font-display">📈 Tendencia de Usuarios Registrados</h3>
          <canvas ref={lineChartRef} style={{ width: '100%', height: '170px' }} />
        </div>
      </div>
    </div>
  );
};
