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
import { Plus, Search, Edit3, Trash2, X } from 'lucide-react';

type ModalMode = 'create' | 'edit' | null;

export const AdminProducts: React.FC = () => {
  const [productos, setProductos] = useState<ProductoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredProducts = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.categoria.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockClass = (stock: number) => {
    if (stock > 50) return 'high';
    if (stock > 0) return 'medium';
    return 'low';
  };

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center' }}>Cargando productos...</div>;
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="font-display">Gestión de Productos</h1>
        <p>Crear, editar y eliminar productos del catálogo. Stock en tiempo real.</p>
      </div>

      <div className="admin-table-wrapper">
        <div className="admin-table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={16} style={{ color: '#64748b' }} />
            <input
              type="text"
              placeholder="Buscar por nombre, código o categoría..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="admin-btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Crear Producto
          </button>
        </div>

        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock (RS-01)</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>{product.codigo}</td>
                <td style={{ fontWeight: 700 }}>{product.nombre}</td>
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
                    fontWeight: 700,
                    color: product.activo ? '#2e7d32' : '#94a3b8'
                  }}>
                    {product.activo ? '● Activo' : '○ Inactivo'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="admin-btn-edit" onClick={() => openEditModal(product)}>
                      <Edit3 size={13} /> Editar
                    </button>
                    <button className="admin-btn-danger" onClick={() => handleDeleteProduct(product)}>
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No se encontraron productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear / Editar Producto */}
      {modalMode && (
        <div className="admin-modal-overlay" onClick={() => setModalMode(null)}>
          <div className="admin-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="font-display" style={{ margin: 0 }}>
                {modalMode === 'create' ? '➕ Crear Nuevo Producto' : '✏️ Editar Producto'}
              </h3>
              <button onClick={() => setModalMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
                {formError}
              </div>
            )}
            {formSuccess && (
              <div style={{ padding: '10px 14px', background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '8px', color: '#2e7d32', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Código Único *</label>
                  <input name="codigo" required value={formData.codigo} onChange={handleFormChange} placeholder="leo-producto-nuevo" disabled={modalMode === 'edit'} />
                </div>
                <div className="form-group">
                  <label>Nombre del Producto *</label>
                  <input name="nombre" required value={formData.nombre} onChange={handleFormChange} placeholder="Queso Nuevo" />
                </div>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea name="descripcion" value={formData.descripcion} onChange={handleFormChange} rows={2} placeholder="Descripción del producto..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Precio USD * (debe ser &gt; 0)</label>
                  <input name="precio" type="number" step="0.01" min="0.01" required value={formData.precio} onChange={handleFormChange} placeholder="1.50" />
                </div>
                <div className="form-group">
                  <label>Stock * (no negativo)</label>
                  <input name="stock" type="number" min="0" required value={formData.stock} onChange={handleFormChange} placeholder="100" />
                </div>
                <div className="form-group">
                  <label>Categoría *</label>
                  <select name="categoria" value={formData.categoria} onChange={handleFormChange}>
                    <option value="quesos">Quesos</option>
                    <option value="yogures">Yogures</option>
                    <option value="bebidas">Bebidas</option>
                    <option value="especiales">Especiales</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Unidad</label>
                  <input name="unidad" value={formData.unidad} onChange={handleFormChange} placeholder="/ 500g" />
                </div>
                <div className="form-group">
                  <label>Badge / Etiqueta</label>
                  <input name="badge" value={formData.badge} onChange={handleFormChange} placeholder="Nuevo, Popular, Premium" />
                </div>
              </div>

              <div className="form-group">
                <label>URL de Imagen</label>
                <input name="imagen_url" value={formData.imagen_url} onChange={handleFormChange} placeholder="/productos/imagen.png" />
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="admin-btn-cancel" onClick={() => setModalMode(null)}>
                  Cancelar
                </button>
                <button type="submit" className="admin-btn-primary">
                  {modalMode === 'create' ? '✅ Crear Producto' : '💾 Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
