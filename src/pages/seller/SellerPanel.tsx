import React, { useEffect, useState } from 'react';
import { fetchProductos, crearPedidoCompleto, guardarComprobanteSRI, type ProductoDB } from '../../lib/productosService';
import { generarClaveYSecuencialUnicos, generateSRIXML } from '../../utils/sriGenerator';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Package, ArrowLeft, RefreshCw, Search, AlertTriangle, CheckCircle, XCircle, ShoppingCart, Plus, Minus, Trash2, FileDown, UserCheck } from 'lucide-react';
import { sendComprobanteEmailViaSupabase } from '../../lib/supabase';
import { validarIdentificacion } from '../../utils/cedulaValidator';
import { generateRIDE } from '../../utils/sriGenerator';

type TabType = 'todos' | 'bajo' | 'agotado';

interface CartItem {
  producto_id: number;
  nombre_producto: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

export const SellerPanel: React.FC = () => {
  const [productos, setProductos] = useState<ProductoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  
  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Datos del Cliente en POS
  const [customerPOS, setCustomerPOS] = useState({
    name: 'Consumidor Final',
    idNumber: '9999999999999',
    address: 'Latacunga, Cotopaxi',
    email: 'cliente@lacteosleo.com'
  });
  const [requireInvoice, setRequireInvoice] = useState(false);
  const [lastSale, setLastSale] = useState<{
    numero_pedido: string;
    claveAcceso: string;
    secuencial: string;
    customer: { name: string; idNumber: string; address: string; email: string };
    items: CartItem[];
    total: number;
  } | null>(null);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadProductos();
    const handleStockUpdate = () => {
      fetchProductos().then(data => setProductos(data));
    };
    window.addEventListener('lacteos_leo_stock_updated', handleStockUpdate);
    return () => window.removeEventListener('lacteos_leo_stock_updated', handleStockUpdate);
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

  // --- POS Logic ---
  const addToCart = (p: ProductoDB) => {
    if (p.stock <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(i => i.producto_id === p.id);
      if (existing) {
        if (existing.cantidad >= p.stock) return prev; // Límite de stock
        return prev.map(i => i.producto_id === p.id 
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario } 
          : i);
      }
      return [...prev, {
        producto_id: p.id,
        nombre_producto: p.nombre,
        precio_unitario: p.precio,
        cantidad: 1,
        subtotal: p.precio
      }];
    });
  };

  const removeFromCart = (pId: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.producto_id === pId);
      if (existing && existing.cantidad > 1) {
        return prev.map(i => i.producto_id === pId 
          ? { ...i, cantidad: i.cantidad - 1, subtotal: (i.cantidad - 1) * i.precio_unitario } 
          : i);
      }
      return prev.filter(i => i.producto_id !== pId);
    });
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.cantidad, 0);

  const handleCheckout = async () => {
    if (!user || cart.length === 0) return;

    const finalCustomer = requireInvoice ? {
      name: customerPOS.name.trim() || 'Consumidor Final',
      idNumber: customerPOS.idNumber.trim() || '9999999999999',
      address: customerPOS.address.trim() || 'Latacunga, Cotopaxi',
      email: customerPOS.email.trim() || 'cliente@lacteosleo.com'
    } : {
      name: 'Consumidor Final',
      idNumber: '9999999999999',
      address: 'Latacunga, Cotopaxi',
      email: 'cliente@lacteosleo.com'
    };

    // Si solicita factura personalizada, validar la Cédula/RUC con SRI (Módulo 10)
    if (requireInvoice && finalCustomer.idNumber !== '9999999999999') {
      const idVal = validarIdentificacion(finalCustomer.idNumber);
      if (!idVal.isValid) {
        alert(`❌ Error SRI: La Cédula o RUC ingresado para el cliente no supera el algoritmo Módulo 10 (${idVal.error}). Por favor verifica el número o usa 9999999999999 para Consumidor Final.`);
        return;
      }
    }

    setIsProcessing(true);
    try {
      const numero_pedido = 'RTA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const { claveAcceso, secuencial } = generarClaveYSecuencialUnicos();
      
      const pedidoId = await crearPedidoCompleto({
        usuario_id: user.id as string,
        numero_pedido,
        total: cartTotal,
        metodo_pago: 'efectivo',
        auth_code: 'VENTA-RUTA-' + Date.now(),
        items: cart
      });

      // Generar XML SRI y guardar en tabla comprobantes_sri
      const xmlContenido = generateSRIXML(
        finalCustomer,
        cart.map(c => ({ id: String(c.producto_id), name: c.nombre_producto, price: c.precio_unitario, quantity: c.cantidad, desc: 'Lácteos Leo', image: '', category: 'lácteos' })),
        cartTotal,
        claveAcceso,
        secuencial
      );

      try {
        await guardarComprobanteSRI(pedidoId, claveAcceso, secuencial, xmlContenido);
      } catch (err) {
        console.warn('No se pudo guardar SRI en la nube, respaldo local guardado', err);
      }

      // Guardar también en el historial local de facturas y enviar por correo si procede
      await sendComprobanteEmailViaSupabase({
        id: String(pedidoId || Date.now()),
        orderNumber: numero_pedido,
        customerName: finalCustomer.name,
        customerEmail: finalCustomer.email,
        customerIdNumber: finalCustomer.idNumber,
        cedula: finalCustomer.idNumber,
        userId: user.id as string,
        items: cart.map(i => ({ name: i.nombre_producto, quantity: i.cantidad, price: i.precio_unitario })),
        totalAmount: cartTotal,
        date: new Date().toISOString(),
        status: 'completado',
        claveAcceso
      });

      setLastSale({
        numero_pedido,
        claveAcceso,
        secuencial,
        customer: finalCustomer,
        items: [...cart],
        total: cartTotal
      });

      clearCart();
      setShowConfirmModal(false);
      await loadProductos();
    } catch (error: any) {
      alert('Error al procesar la venta: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Filtering ---
  const stockBajoThreshold = 50;
  const maxStockReference = 200;

  const filtered = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.codigo.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'bajo') matchesTab = p.stock > 0 && p.stock <= stockBajoThreshold;
    if (activeTab === 'agotado') matchesTab = p.stock === 0;

    return matchesSearch && matchesTab;
  });

  const getStockStatus = (stock: number) => {
    if (stock > stockBajoThreshold) return { bg: '#dcfce7', color: '#16a34a', text: '#166534', icon: <CheckCircle size={14} />, label: 'En Stock' };
    if (stock > 0) return { bg: '#fef3c7', color: '#f59e0b', text: '#b45309', icon: <AlertTriangle size={14} />, label: 'Stock Bajo' };
    return { bg: '#fee2e2', color: '#ef4444', text: '#991b1b', icon: <XCircle size={14} />, label: 'Agotado' };
  };

  const getProgressWidth = (stock: number) => {
    return Math.min((stock / maxStockReference) * 100, 100);
  };

  const countStockBajo = productos.filter(p => p.stock > 0 && p.stock <= stockBajoThreshold).length;
  const countAgotado = productos.filter(p => p.stock === 0).length;

  return (
    <div style={{ backgroundColor: '#f8faf9', minHeight: '100vh', paddingBottom: '40px', animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header Premium */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2ece3', padding: '24px 0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', padding: '4px 12px',
                borderRadius: '6px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
              }}>
                <Package size={14} /> POS Móvil
              </span>
              {user && <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Vendedor: {user.name}</span>}
            </div>
            <h1 className="font-display" style={{ color: '#1e293b', margin: 0, fontSize: '28px', letterSpacing: '-0.5px' }}>
              Punto de Venta en Ruta
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', background: '#fff', border: '1.5px solid #e2ece3',
                borderRadius: '10px', color: '#475569', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#cbd5e1'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#e2ece3'}
            >
              <ArrowLeft size={18} /> Salir
            </button>
            <button
              onClick={loadProductos}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none',
                borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                transition: 'transform 0.1s', boxShadow: '0 4px 6px rgba(22, 163, 74, 0.2)'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <RefreshCw size={18} /> Actualizar Bodega
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '32px auto 0', padding: '0 24px', display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Lado Izquierdo: Catálogo y Filtros */}
        <div style={{ flex: '1 1 600px' }}>
          
          {/* Alertas Críticas */}
          {(countAgotado > 0 || countStockBajo > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {countAgotado > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <XCircle size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', color: '#991b1b', fontSize: '14px' }}>Agotados</h4>
                    <p style={{ margin: 0, color: '#b91c1c', fontSize: '12px', fontWeight: '600' }}>{countAgotado} producto(s) sin stock.</p>
                  </div>
                </div>
              )}
              {countStockBajo > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', color: '#b45309', fontSize: '14px' }}>Stock Crítico</h4>
                    <p style={{ margin: 0, color: '#d97706', fontSize: '12px', fontWeight: '600' }}>{countStockBajo} por debajo de {stockBajoThreshold} uds.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Toolbar & Tabs */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e2ece3', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
              <button
                onClick={() => setActiveTab('todos')}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer',
                  background: activeTab === 'todos' ? '#f1f5f9' : 'transparent',
                  color: activeTab === 'todos' ? '#0f172a' : '#64748b'
                }}
              >
                Todos <span style={{ marginLeft: '6px', background: activeTab === 'todos' ? '#e2e8f0' : '#f1f5f9', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{productos.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('bajo')}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer',
                  background: activeTab === 'bajo' ? '#fffbeb' : 'transparent',
                  color: activeTab === 'bajo' ? '#b45309' : '#64748b'
                }}
              >
                Stock Bajo <span style={{ marginLeft: '6px', background: activeTab === 'bajo' ? '#fde68a' : '#f1f5f9', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{countStockBajo}</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8faf9', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '0 12px', flex: '1', minWidth: '200px' }}>
              <Search size={16} style={{ color: '#64748b' }} />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', padding: '10px 0', fontSize: '13px', width: '100%', background: 'transparent' }}
              />
            </div>
          </div>

          {/* Listado de Productos */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Cargando inventario...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filtered.map((p) => {
                const status = getStockStatus(p.stock);
                const progressWidth = getProgressWidth(p.stock);
                const cartItem = cart.find(i => i.producto_id === p.id);
                const cantidadEnCarrito = cartItem?.cantidad || 0;
                
                return (
                  <div key={p.id} style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1px solid #e2ece3', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ flex: 1, paddingRight: '10px' }}>
                        <h3 style={{ margin: '0 0 4px', fontSize: '14px', color: '#1e293b' }}>{p.nombre}</h3>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                          {p.codigo} • {p.categoria}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>${p.precio.toFixed(2)}</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: status.text, background: status.bg, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                          {status.label}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                          {p.stock} <span style={{ fontSize: '11px', color: '#64748b' }}>uds</span>
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progressWidth}%`, height: '100%', background: status.color, borderRadius: '3px' }}></div>
                      </div>
                    </div>

                    {/* Botones Agregar */}
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {cantidadEnCarrito > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', overflow: 'hidden' }}>
                          <button 
                            onClick={() => removeFromCart(p.id)}
                            style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Minus size={16} />
                          </button>
                          <span style={{ fontWeight: '800', color: '#166534', fontSize: '14px' }}>{cantidadEnCarrito}</span>
                          <button 
                            onClick={() => addToCart(p)}
                            disabled={cantidadEnCarrito >= p.stock}
                            style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: cantidadEnCarrito >= p.stock ? '#94a3b8' : '#16a34a', cursor: cantidadEnCarrito >= p.stock ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(p)}
                          disabled={p.stock <= 0}
                          style={{
                            width: '100%', padding: '8px', background: p.stock <= 0 ? '#f1f5f9' : '#fff', 
                            border: `1.5px solid ${p.stock <= 0 ? '#cbd5e1' : '#16a34a'}`,
                            color: p.stock <= 0 ? '#94a3b8' : '#16a34a', borderRadius: '8px', 
                            fontWeight: '700', fontSize: '13px', cursor: p.stock <= 0 ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                          }}
                        >
                          <Plus size={14} /> Añadir a Venta
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lado Derecho: Carrito de Ruta */}
        <div style={{ flex: '0 0 380px', position: 'sticky', top: '104px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2ece3', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 120px)' }}>
            
            <div style={{ padding: '20px', borderBottom: '1px solid #e2ece3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '8px', borderRadius: '10px' }}>
                  <ShoppingCart size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }} className="font-display">Carrito de Venta</h2>
              </div>
              {cart.length > 0 && (
                <button onClick={clearCart} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }} title="Vaciar">
                  <Trash2 size={14} /> Vaciar
                </button>
              )}
            </div>

            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <ShoppingCart size={40} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Sin productos</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Añade productos desde el inventario.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {cart.map(item => (
                    <div key={item.producto_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{item.nombre_producto}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {item.cantidad} x ${item.precio_unitario.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#16a34a' }}>
                        ${item.subtotal.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '20px', background: '#f8faf9', borderTop: '1px solid #e2ece3', borderRadius: '0 0 16px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px', color: '#64748b', fontWeight: '600' }}>
                <span>Artículos: {cartItemsCount}</span>
                <span>Subtotal</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>TOTAL A COBRAR</span>
                <span style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a', lineHeight: 1 }}>${cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={cart.length === 0}
                style={{
                  width: '100%', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '800', border: 'none',
                  background: cart.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: '#fff', cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: cart.length === 0 ? 'none' : '0 4px 12px rgba(22,163,74,0.3)',
                  transition: 'transform 0.1s'
                }}
                onMouseDown={e => { if (cart.length > 0) e.currentTarget.style.transform = 'scale(0.98)' }}
                onMouseUp={e => { if (cart.length > 0) e.currentTarget.style.transform = 'scale(1)' }}
              >
                Cobrar en Efectivo
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Modal Confirmación Venta */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#fff', padding: '28px', borderRadius: '20px', width: '92%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <ShoppingCart size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }} className="font-display">Cobrar Venta POS</h2>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Total: <strong>${cartTotal.toFixed(2)}</strong> ({cartItemsCount} arts)</span>
              </div>
            </div>
            
            {/* Opción de Facturación personalizada */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>
                <input 
                  type="checkbox" 
                  checked={requireInvoice} 
                  onChange={e => setRequireInvoice(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
                />
                <UserCheck size={18} style={{ color: requireInvoice ? '#16a34a' : '#64748b' }} />
                <span>¿El cliente solicita Factura Personalizada?</span>
              </label>

              {requireInvoice && (
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Cédula (10 dígitos) o RUC (13 dígitos) *</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 1712345678" 
                      value={customerPOS.idNumber} 
                      onChange={e => setCustomerPOS({ ...customerPOS, idNumber: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                    {customerPOS.idNumber && customerPOS.idNumber !== '9999999999999' && (
                      <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>
                        {validarIdentificacion(customerPOS.idNumber).isValid ? (
                          <span style={{ color: '#16a34a' }}>✅ Cédula/RUC Válido SRI ({validarIdentificacion(customerPOS.idNumber).provincia})</span>
                        ) : (
                          <span style={{ color: '#ef4444' }}>❌ {validarIdentificacion(customerPOS.idNumber).error}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Nombre completo o Razón Social *</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Juan Pérez" 
                      value={customerPOS.name} 
                      onChange={e => setCustomerPOS({ ...customerPOS, name: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Dirección</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Latacunga" 
                        value={customerPOS.address} 
                        onChange={e => setCustomerPOS({ ...customerPOS, address: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Correo Electrónico</label>
                      <input 
                        type="email" 
                        placeholder="ejemplo@correo.com" 
                        value={customerPOS.email} 
                        onChange={e => setCustomerPOS({ ...customerPOS, email: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                disabled={isProcessing}
                style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '10px', color: '#475569', fontWeight: '700', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleCheckout}
                disabled={isProcessing}
                style={{ flex: 1, padding: '12px', background: '#16a34a', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '700', cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {isProcessing ? (
                  <>Procesando...</>
                ) : (
                  <>Confirmar Pago</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Éxito Venta con Opción a Descargar Factura PDF (RIDE) */}
      {lastSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '440px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ width: '64px', height: '64px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', margin: '0 auto 16px' }}>
              <CheckCircle size={36} />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '22px', color: '#1e293b' }} className="font-display">¡Venta Registrada!</h2>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px' }}>
              El comprobante electrónico SRI fue generado y autorizado correctamente.
            </p>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px', fontSize: '13px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '6px' }}><strong>Pedido:</strong> {lastSale.numero_pedido}</div>
              <div style={{ marginBottom: '6px' }}><strong>Cliente:</strong> {lastSale.customer.name} ({lastSale.customer.idNumber})</div>
              <div><strong>Total Pagado:</strong> <span style={{ color: '#16a34a', fontWeight: 800 }}>${lastSale.total.toFixed(2)}</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  try {
                    const pdfDoc = generateRIDE(
                      lastSale.customer,
                      lastSale.items.map(i => ({
                        id: String(i.producto_id),
                        name: i.nombre_producto,
                        quantity: i.cantidad,
                        price: i.precio_unitario,
                        desc: 'Lácteos Leo'
                      })),
                      lastSale.total,
                      lastSale.claveAcceso,
                      lastSale.secuencial
                    );
                    pdfDoc.save(`factura-sri-${lastSale.numero_pedido}.pdf`);
                  } catch (e: any) {
                    alert('Error generando PDF RIDE: ' + e.message);
                  }
                }}
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}
              >
                <FileDown size={20} />
                Descargar Factura PDF (RIDE SRI)
              </button>
              <button
                onClick={() => setLastSale(null)}
                style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#475569', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
              >
                ✨ Nueva Venta en Mostrador
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};
