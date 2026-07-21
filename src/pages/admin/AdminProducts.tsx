import React, { useEffect, useState } from 'react';
import {
  fetchTodosProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  type ProductoDB,
  type CreateProductoDTO,
  type UpdateProductoDTO
} from '../../lib/productosService';
import { Plus, Search, Edit3, Trash2, X, LayoutGrid, List, Image as ImageIcon, Package, AlertTriangle } from 'lucide-react';

type ModalMode = 'create' | 'edit' | null;
type ViewMode = 'table' | 'grid';

export const AdminProducts: React.FC = () => {
  const [productos, setProductos] = useState<ProductoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingProduct, setEditingProduct] = useState<ProductoDB | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria: 'quesos',
    unidad: '',
    imagen_url: '',
    badge: ''
  });

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    try {
      const data = await fetchTodosProductos();
      setProductos(data);
    } catch (err) {
      console.error('Error cargando productos:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ codigo: '', nombre: '', descripcion: '', precio: '', stock: '', categoria: 'quesos', unidad: '', imagen_url: '', badge: '' });
    setFormError('');
    setFormSuccess('');
    setEditingProduct(null);
    setModalMode('create');
  };

  const openEditModal = (product: ProductoDB) => {
    setFormData({
      codigo: product.codigo,
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      precio: product.precio.toString(),
      stock: product.stock.toString(),
      categoria: product.categoria,
      unidad: product.unidad || '',
      imagen_url: product.imagen_url || '',
      badge: product.badge || ''
    });
    setFormError('');
    setFormSuccess('');
    setEditingProduct(product);
    setModalMode('edit');
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const precio = parseFloat(formData.precio);
    const stock = parseInt(formData.stock, 10);

    // Validación de reglas de negocio
    if (isNaN(precio) || precio <= 0) {
      setFormError('⚠️ El precio debe ser mayor a $0.00. No se permite un precio menor o igual a cero.');
      return;
    }
    if (isNaN(stock) || stock < 0) {
      setFormError('⚠️ El stock no puede ser negativo.');
      return;
    }

    try {
      if (modalMode === 'create') {
        const dto: CreateProductoDTO = {
          codigo: formData.codigo,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio,
          stock,
          categoria: formData.categoria,
          unidad: formData.unidad,
          imagen_url: formData.imagen_url,
          badge: formData.badge
        };
        await crearProducto(dto);
        setFormSuccess('✅ Producto creado exitosamente.');
      } else if (modalMode === 'edit' && editingProduct) {
        const dto: UpdateProductoDTO = {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio,
          stock,
          categoria: formData.categoria,
          unidad: formData.unidad,
          imagen_url: formData.imagen_url,
          badge: formData.badge
        };
        await actualizarProducto(editingProduct.id, dto);
        setFormSuccess('✅ Producto actualizado exitosamente.');
      }
      await loadProductos();
      setTimeout(() => setModalMode(null), 800);
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el producto.');
    }
  };

  const handleDeleteProduct = async (product: ProductoDB) => {
    if (!confirm(`¿Estás seguro de eliminar "${product.nombre}"?`)) return;
    try {
      await eliminarProducto(product.id);
      await loadProductos();
      alert('✅ Producto eliminado correctamente.');
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el producto.');
    }
  };

  const filteredProducts = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.codigo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || p.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['todos', ...Array.from(new Set(productos.map(p => p.categoria)))];

  const getStockClass = (stock: number) => {
    if (stock > 50) return 'high';
    if (stock > 0) return 'medium';
    return 'low';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#475569' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2ece3', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
        <p className="font-display">Cargando catálogo...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="font-display">Catálogo de Productos</h1>
          <p>Gestiona tu inventario, precios y disponibilidad en tiempo real.</p>
        </div>
        <button className="admin-btn-primary" onClick={openCreateModal} style={{ padding: '12px 24px', fontSize: '15px' }}>
          <Plus size={18} />
          Nuevo Producto
        </button>
      </div>

      <div className="admin-table-wrapper" style={{ marginBottom: '24px' }}>
        <div className="admin-table-toolbar" style={{ flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', flex: 1 }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                  border: '1.5px solid',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: selectedCategory === cat ? '#dcfce7' : '#fff',
                  borderColor: selectedCategory === cat ? '#16a34a' : '#e2ece3',
                  color: selectedCategory === cat ? '#166534' : '#64748b'
                }}
              >
                {cat}
                <span style={{ 
                  marginLeft: '6px', 
                  background: selectedCategory === cat ? '#16a34a' : '#f1f5f9', 
                  color: selectedCategory === cat ? '#fff' : '#64748b',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '10px'
                }}>
                  {cat === 'todos' ? productos.length : productos.filter(p => p.categoria === cat).length}
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8faf9', padding: '4px', borderRadius: '8px', border: '1px solid #e2ece3' }}>
              <button 
                onClick={() => setViewMode('table')}
                style={{ padding: '6px 10px', background: viewMode === 'table' ? '#fff' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: viewMode === 'table' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', color: viewMode === 'table' ? '#16a34a' : '#64748b', transition: 'all 0.2s' }}
              ><List size={18} /></button>
              <button 
                onClick={() => setViewMode('grid')}
                style={{ padding: '6px 10px', background: viewMode === 'grid' ? '#fff' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', color: viewMode === 'grid' ? '#16a34a' : '#64748b', transition: 'all 0.2s' }}
              ><LayoutGrid size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1.5px solid #d1ddd3', borderRadius: '10px', padding: '0 12px' }}>
              <Search size={16} style={{ color: '#64748b' }} />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', padding: '10px 0', fontSize: '13px', minWidth: '200px' }}
              />
            </div>
          </div>
        </div>

        {viewMode === 'table' ? (
          <table className="admin-data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Código</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock (RS-01)</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id} style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {product.imagen_url ? (
                      <img src={product.imagen_url} alt={product.nombre} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <ImageIcon size={20} />
                      </div>
                    )}
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{product.nombre}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>{product.codigo}</td>
                  <td style={{ textTransform: 'capitalize' }}>{product.categoria}</td>
                  <td style={{ fontWeight: 700, color: '#1b5e20' }}>${product.precio.toFixed(2)}</td>
                  <td>
                    <span className={`stock-badge ${getStockClass(product.stock)}`}>
                      {product.stock} uds
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '4px 8px',
                      borderRadius: '20px',
                      background: product.activo ? '#dcfce7' : '#f1f5f9',
                      color: product.activo ? '#166534' : '#64748b'
                    }}>
                      {product.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button className="admin-btn-edit" onClick={() => openEditModal(product)}>
                        <Edit3 size={14} /> Editar
                      </button>
                      <button className="admin-btn-danger" onClick={() => handleDeleteProduct(product)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                    <Package size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <p style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>No se encontraron productos</p>
                    <p style={{ fontSize: '13px', margin: '4px 0 0' }}>Prueba con otro término de búsqueda o categoría.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', background: '#f8faf9' }}>
            {filteredProducts.map(product => (
              <div key={product.id} className="admin-kpi-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', height: '180px', background: '#f1f5f9' }}>
                  {product.imagen_url ? (
                    <img src={product.imagen_url} alt={product.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      <ImageIcon size={48} opacity={0.2} />
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px' }}>
                    <span className={`stock-badge ${getStockClass(product.stock)}`} style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      {product.stock} uds
                    </span>
                  </div>
                  {product.badge && (
                    <div style={{ position: 'absolute', top: '12px', left: '12px', background: '#16a34a', color: '#fff', fontSize: '10px', fontWeight: '800', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      {product.badge}
                    </div>
                  )}
                </div>
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    {product.categoria} • {product.codigo}
                  </div>
                  <h4 style={{ margin: '0 0 12px', fontSize: '16px', color: '#1e293b' }}>{product.nombre}</h4>
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a' }}>${product.precio.toFixed(2)}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="admin-btn-edit" onClick={() => openEditModal(product)} style={{ padding: '8px' }}>
                        <Edit3 size={16} />
                      </button>
                      <button className="admin-btn-danger" onClick={() => handleDeleteProduct(product)} style={{ padding: '8px' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#94a3b8', background: '#fff', borderRadius: '16px' }}>
                <Package size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>No se encontraron productos</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Producto */}
      {modalMode && (
        <div className="admin-modal-overlay" onClick={() => setModalMode(null)}>
          <div className="admin-modal-box" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', width: '700px' }}>
            
            <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', padding: '24px 32px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="font-display" style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {modalMode === 'create' ? <Plus size={24} /> : <Edit3 size={24} />}
                {modalMode === 'create' ? 'Crear Nuevo Producto' : 'Editar Producto'}
              </h3>
              <button onClick={() => setModalMode(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '32px', overflowY: 'auto', maxHeight: '70vh' }}>
              {formError && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', fontSize: '14px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} /> {formError}
                </div>
              )}
              {formSuccess && (
                <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#16a34a', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleSubmitProduct}>
                <div style={{ display: 'grid', gridTemplateColumns: formData.imagen_url ? '1fr 2fr' : '1fr', gap: '24px', marginBottom: '24px' }}>
                  {formData.imagen_url && (
                    <div style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2ece3', background: '#f8faf9', alignSelf: 'start' }}>
                      <img src={formData.imagen_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:12px;text-align:center;padding:20px;">URL de imagen inválida</div>'; }} />
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Código Único *</label>
                        <input name="codigo" required value={formData.codigo} onChange={handleFormChange} placeholder="leo-producto-nuevo" disabled={modalMode === 'edit'} style={{ background: modalMode === 'edit' ? '#f1f5f9' : '#fff' }} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Nombre del Producto *</label>
                        <input name="nombre" required value={formData.nombre} onChange={handleFormChange} placeholder="Queso Nuevo" />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Descripción</label>
                      <textarea name="descripcion" value={formData.descripcion} onChange={handleFormChange} rows={3} placeholder="Descripción detallada del producto..." />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Precio USD *</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 'bold' }}>$</span>
                      <input name="precio" type="number" step="0.01" min="0.01" required value={formData.precio} onChange={handleFormChange} placeholder="1.50" style={{ paddingLeft: '28px' }} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Stock *</label>
                    <input name="stock" type="number" min="0" required value={formData.stock} onChange={handleFormChange} placeholder="100" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Categoría *</label>
                    <select name="categoria" value={formData.categoria} onChange={handleFormChange}>
                      <option value="quesos">Quesos</option>
                      <option value="yogures">Yogures</option>
                      <option value="bebidas">Bebidas</option>
                      <option value="especiales">Especiales</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Unidad / Formato</label>
                    <input name="unidad" value={formData.unidad} onChange={handleFormChange} placeholder="Ej: 500g, 1 Litro" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Etiqueta Promocional (Badge)</label>
                    <input name="badge" value={formData.badge} onChange={handleFormChange} placeholder="Ej: Nuevo, Popular, Oferta" />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '32px' }}>
                  <label>URL de Imagen</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ background: '#f8faf9', border: '1.5px solid #cbd5e1', borderRadius: '10px 0 0 10px', padding: '12px', display: 'flex', alignItems: 'center', color: '#64748b', borderRight: 'none' }}>
                      <ImageIcon size={18} />
                    </div>
                    <input name="imagen_url" value={formData.imagen_url} onChange={handleFormChange} placeholder="https://ejemplo.com/imagen.jpg" style={{ borderRadius: '0 10px 10px 0' }} />
                  </div>
                </div>

                <div className="admin-modal-actions" style={{ marginTop: 0, paddingTop: '24px', borderTop: '1px solid #e2ece3' }}>
                  <button type="button" className="admin-btn-cancel" onClick={() => setModalMode(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="admin-btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }}>
                    {modalMode === 'create' ? 'Crear Producto' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
