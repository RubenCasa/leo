import React, { useEffect, useState } from 'react';
import { fetchProductos, type ProductoDB } from '../../lib/productosService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Package, ArrowLeft, RefreshCw } from 'lucide-react';

export const SellerPanel: React.FC = () => {
  const [productos, setProductos] = useState<ProductoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    setLoading(true);
    try {
      const data = await fetchProductos();
      setProductos(data);
    } catch (err) {
      console.error('Error cargando productos:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.categoria.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockColor = (stock: number) => {
    if (stock > 50) return { bg: '#e8f5e9', color: '#2e7d32', label: '● En stock' };
    if (stock > 0) return { bg: '#fff8e1', color: '#f57f17', label: '⚠ Stock bajo' };
    return { bg: '#fce4ec', color: '#c62828', label: '✕ Agotado' };
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              background: '#fff3e0', color: '#e65100', padding: '4px 12px',
              borderRadius: '6px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px'
            }}>
              🏪 PANEL VENDEDOR
            </span>
            {user && <span style={{ fontSize: '13px', color: '#64748b' }}>Hola, {user.name}</span>}
          </div>
          <h1 className="font-display" style={{ color: '#1b5e20', margin: 0, fontSize: '1.5rem' }}>
            Stock en Tiempo Real (RS-01)
          </h1>
          <p style={{ color: '#475569', margin: '4px 0 0', fontSize: '14px' }}>
            Consulta la cantidad exacta de productos disponibles en bodega antes de atender al cliente.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={loadProductos}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', background: '#e8f5e9', border: '1.5px solid #a5d6a7',
              borderRadius: '8px', color: '#2e7d32', fontWeight: 700, fontSize: '13px', cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} /> Actualizar
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', background: '#f1f5f0', border: '1.5px solid #d1ddd3',
              borderRadius: '8px', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} /> Volver
          </button>
        </div>
      </div>

      {/* Resumen rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2ece3' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Productos</div>
          <div className="font-display" style={{ fontSize: '1.6rem', color: '#1b5e20', fontWeight: 800 }}>{productos.length}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2ece3' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Con Stock</div>
          <div className="font-display" style={{ fontSize: '1.6rem', color: '#2e7d32', fontWeight: 800 }}>{productos.filter(p => p.stock > 0).length}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2ece3' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Stock Bajo</div>
          <div className="font-display" style={{ fontSize: '1.6rem', color: '#f57f17', fontWeight: 800 }}>{productos.filter(p => p.stock > 0 && p.stock <= 50).length}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2ece3' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Agotados</div>
          <div className="font-display" style={{ fontSize: '1.6rem', color: '#c62828', fontWeight: 800 }}>{productos.filter(p => p.stock === 0).length}</div>
        </div>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="🔍 Buscar producto por nombre o categoría..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: '10px',
            border: '1.5px solid #d1ddd3', fontSize: '14px', outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Tabla de Stock */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>Cargando inventario...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2ece3', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f1f5f0' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#1b5e20', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Producto</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#1b5e20', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Categoría</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#1b5e20', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Precio</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#1b5e20', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Stock en Bodega</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#1b5e20', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const stockInfo = getStockColor(p.stock);
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f0' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Package size={16} style={{ color: '#94a3b8' }} />
                        <div>
                          <div style={{ fontWeight: 700 }}>{p.nombre}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{p.unidad}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textTransform: 'capitalize' }}>{p.categoria}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1b5e20' }}>${p.precio.toFixed(2)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '1.2rem', fontWeight: 800, color: stockInfo.color
                      }}>
                        {p.stock}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '4px' }}>uds</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: '6px',
                        fontSize: '11px', fontWeight: 700,
                        background: stockInfo.bg, color: stockInfo.color
                      }}>
                        {stockInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
