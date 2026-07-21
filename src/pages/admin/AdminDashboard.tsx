import React, { useEffect, useState, useRef } from 'react';
import { fetchEstadisticasDashboard, fetchTodosPedidos, fetchTodosProductos } from '../../lib/productosService';
import { Package, ShoppingCart, Users, DollarSign, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface DashboardStats {
  totalProductos: number;
  totalPedidos: number;
  totalUsuarios: number;
  ventasTotales: number;
  pedidosMensuales: Array<{ created_at: string; total: number }>;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (stats) {
      drawBarChart();
      drawLineChart();
    }
  }, [stats]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, ordersData, productsData] = await Promise.all([
        fetchEstadisticasDashboard(),
        fetchTodosPedidos(),
        fetchTodosProductos()
      ]);
      setStats(statsData);
      
      // Get recent 5 orders
      setRecentOrders(ordersData.slice(0, 5));
      
      // Get low stock products (stock < 15)
      const lowStock = productsData.filter(p => p.stock > 0 && p.stock <= 15).sort((a, b) => a.stock - b.stock).slice(0, 5);
      setLowStockProducts(lowStock);

    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
      // Fallback data
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

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
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

    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartW = cw - padding.left - padding.right;
    const chartH = ch - padding.top - padding.bottom;
    const barWidth = chartW / labels.length * 0.5;
    const barGap = chartW / labels.length * 0.5;

    // Grid lines
    ctx.strokeStyle = '#e2ece3';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(cw - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('$' + Math.round(maxVal - (maxVal / 4) * i).toString(), padding.left - 10, y + 4);
    }
    ctx.setLineDash([]);

    // Bars
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    labels.forEach((label, i) => {
      const x = padding.left + i * (barWidth + barGap) + barGap / 2;
      const barH = (values[i] / maxVal) * chartH;
      const y = padding.top + chartH - barH;

      // Bar gradient
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, '#4ade80');
      grad.addColorStop(1, '#16a34a');
      ctx.fillStyle = grad;

      // Rounded top
      const radius = 6;
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
      if (values[i] > 0) {
        ctx.fillStyle = '#16a34a';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('$' + values[i].toFixed(0), x + barWidth / 2, y - 8);
      }

      // Month label
      const monthNum = parseInt(label.split('-')[1], 10);
      ctx.fillStyle = '#475569';
      ctx.font = '600 11px sans-serif';
      ctx.fillText(monthNames[monthNum - 1], x + barWidth / 2, ch - padding.bottom + 20);
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

    const padding = { top: 30, right: 30, bottom: 40, left: 40 };
    const chartW = cw - padding.left - padding.right;
    const chartH = ch - padding.top - padding.bottom;

    // Grid lines
    ctx.strokeStyle = '#e2ece3';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(cw - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * i).toString(), padding.left - 10, y + 4);
    }
    ctx.setLineDash([]);

    // Line
    const points: { x: number; y: number }[] = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    labels.forEach((label, i) => {
      const x = padding.left + (i / (labels.length - 1 || 1)) * chartW;
      const y = padding.top + chartH - (cumulativeValues[i] / maxVal) * chartH;
      points.push({ x, y });

      const monthNum = parseInt(label.split('-')[1], 10);
      ctx.fillStyle = '#475569';
      ctx.font = '600 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(monthNames[monthNum - 1], x, ch - padding.bottom + 20);
    });

    // Fill area
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      grad.addColorStop(0, 'rgba(37,99,235,0.2)');
      grad.addColorStop(1, 'rgba(37,99,235,0.01)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Line stroke
      ctx.beginPath();
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Points
      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#475569' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2ece3', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
        <p className="font-display">Cargando datos del Dashboard...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const kpis = [
    { icon: <Package size={24} />, label: 'Productos en Catálogo', value: stats?.totalProductos || 0, color: '#16a34a', trend: '+12%', trendUp: true },
    { icon: <ShoppingCart size={24} />, label: 'Pedidos Totales', value: stats?.totalPedidos || 0, color: '#2563eb', trend: '+5%', trendUp: true },
    { icon: <Users size={24} />, label: 'Usuarios Registrados', value: stats?.totalUsuarios || 0, color: '#ea580c', trend: '+18%', trendUp: true },
    { icon: <DollarSign size={24} />, label: 'Ventas Totales', value: '$' + (stats?.ventasTotales || 0).toFixed(2), color: '#0d9488', trend: '+8%', trendUp: true },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="font-display" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {getWelcomeMessage()}, {user?.name?.split(' ')[0] || 'Administrador'} 👋
          </h1>
          <p>Aquí tienes un resumen de la actividad de Lácteos Leo de hoy.</p>
        </div>
        <div style={{ background: '#fff', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2ece3', display: 'flex', gap: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '13px', fontWeight: '600' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', animation: 'pulseSubtle 2s infinite' }}></div>
            Sistema en Línea
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="admin-kpi-row">
        {kpis.map((kpi, i) => (
          <div key={i} className="admin-kpi-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ 
                background: `${kpi.color}15`, 
                color: kpi.color, 
                padding: '12px', 
                borderRadius: '14px',
                display: 'inline-flex'
              }}>
                {kpi.icon}
              </div>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '4px', 
                background: kpi.trendUp ? '#dcfce7' : '#fee2e2', 
                color: kpi.trendUp ? '#166534' : '#991b1b',
                padding: '4px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: '700'
              }}>
                <TrendingUp size={12} style={{ transform: kpi.trendUp ? 'none' : 'rotate(180deg)' }} />
                {kpi.trend}
              </div>
            </div>
            <span className="kpi-label">{kpi.label}</span>
            <div className="kpi-value font-display">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Charts Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="admin-chart-card">
            <h3 className="font-display">📊 Rendimiento de Ventas (6 Meses)</h3>
            <canvas ref={barChartRef} style={{ width: '100%', height: '220px' }} />
          </div>
          <div className="admin-chart-card">
            <h3 className="font-display">📈 Crecimiento de Usuarios</h3>
            <canvas ref={lineChartRef} style={{ width: '100%', height: '220px' }} />
          </div>
        </div>

        {/* Side Widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Recent Activity */}
          <div className="admin-chart-card" style={{ flex: '1', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="font-display" style={{ margin: 0 }}>🔔 Actividad Reciente</h3>
            </div>
            
            {recentOrders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {recentOrders.map((order, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', paddingBottom: '16px', borderBottom: i !== recentOrders.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ShoppingCart size={16} />
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                        Nuevo pedido <span style={{ color: '#2563eb' }}>#{order.numero_pedido}</span>
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {new Date(order.created_at).toLocaleDateString('es-EC', { hour: '2-digit', minute: '2-digit' })} • ${Number(order.total).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>No hay actividad reciente.</p>
            )}
          </div>

          {/* Low Stock Alerts */}
          <div className="admin-chart-card" style={{ padding: '24px', background: 'linear-gradient(to bottom, #fff, #fef2f2)', border: '1px solid #fee2e2' }}>
            <h3 className="font-display" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', margin: '0 0 20px' }}>
              <AlertTriangle size={18} /> Alertas de Stock
            </h3>
            
            {lowStockProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lowStockProducts.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #fecaca', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={p.imagen_url} alt={p.nombre} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{p.nombre}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{p.categoria}</p>
                      </div>
                    </div>
                    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
                      {p.stock} unid.
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px 0', color: '#16a34a' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={20} />
                </div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>Inventario saludable</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
