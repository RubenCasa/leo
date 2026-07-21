import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Search, ShoppingCart, Check, Plus, Minus, ArrowRight } from 'lucide-react';
import { fetchProductos, type ProductoDB } from '../lib/productosService';
import './ProductsCatalog.css';
import principalImg from '../assets/principal.png';

export interface CatalogItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  desc: string;
  category: 'quesos' | 'yogures' | 'bebidas' | 'especiales';
  badge?: string;
  image: string;
  stock?: number;
  dbId?: number;
}

const LACTEOS_LEO_CATALOG: CatalogItem[] = [
  // --- QUESOS ---
  {
    id: 'leo-queso-maduro',
    name: 'Queso Maduro',
    price: 1.70,
    unit: '/ 500g',
    desc: 'Queso madurado, sabor intenso y textura firme. Ideal para tablas, sánduches y sopas.',
    category: 'quesos',
    badge: 'Popular',
    image: '/productos/maduro.png'
  },
  {
    id: 'leo-queso-tierno',
    name: 'Queso Tierno',
    price: 1.70,
    unit: '/ 500g',
    desc: 'Queso suave y cremoso, ideal para untar o preparar sánduches. Rico en calcio y bajo en sal.',
    category: 'quesos',
    badge: 'Tierno',
    image: '/productos/Tierno.png'
  },
  {
    id: 'leo-queso-cuadrado-500',
    name: 'Queso Cuadrado 500g',
    price: 1.70,
    unit: '/ 500g',
    desc: 'Queso de mesa en presentación cuadrada de 500g, ideal para uso diario y cocina tradicional.',
    category: 'quesos',
    badge: 'Clásico',
    image: '/productos/Queso-mesa-500.png'
  },
  {
    id: 'leo-queso-familiar-750',
    name: 'Queso Familiar',
    price: 2.25,
    unit: '/ 750g',
    desc: 'Queso de mesa en presentación familiar, perfecto para familias grandes y todas tus comidas.',
    category: 'quesos',
    badge: 'Familiar',
    image: '/productos/Queso-mesa-750.png'
  },
  {
    id: 'leo-queso-redondo-500',
    name: 'Queso de Mesa Redondo',
    price: 1.70,
    unit: '/ 500g',
    desc: 'Queso de mesa en presentación redonda tradicional, ideal para uso diario en el hogar.',
    category: 'quesos',
    badge: 'Tradicional',
    image: '/productos/mesa-redondo.png'
  },
  {
    id: 'leo-mozzarella-pequeno',
    name: 'Mozzarella Pequeño',
    price: 0.80,
    unit: '/ 125g',
    desc: 'Mozzarella en presentación pequeña, perfecta para consumo individual o refrigerios rápidos.',
    category: 'quesos',
    badge: 'Práctico',
    image: '/productos/mozarella-pequeño-.png'
  },
  {
    id: 'leo-mozzarella-entero-500',
    name: 'Mozzarella Entero 500g',
    price: 2.50,
    unit: '/ 500g',
    desc: 'Mozzarella entero o laminado de 500g, perfecto para fundir en pizzas, lasañas y sándwiches gourmet.',
    category: 'quesos',
    badge: 'Familiar',
    image: '/productos/Mozarella-entero-500gr.png'
  },
  {
    id: 'leo-cheddar-500',
    name: 'Queso Cheddar 500g',
    price: 2.50,
    unit: '/ 500g',
    desc: 'Queso cheddar madurado con sabor intenso y textura firme, especial para hamburguesas y cocina.',
    category: 'quesos',
    badge: 'Nuevo',
    image: '/productos/cheedar-500g.png'
  },
  {
    id: 'leo-mozzarella-bolita',
    name: 'Queso Mozzarella (Bolita)',
    price: 1.70,
    unit: '/ 500g',
    desc: 'Mozzarella fresca en presentación de bolitas (bocaditos), excelente para ensaladas y picadas.',
    category: 'quesos',
    badge: 'Especial',
    image: '/productos/bolita-mozarella.png'
  },
  {
    id: 'leo-bloque-mozzarella',
    name: 'Bloque de Mozzarella',
    price: 12.00,
    unit: '/ 2.5 kg',
    desc: 'Queso suave y elástico en formato industrial de 2.5 kg, rendimiento superior para restaurantes y pizzerías.',
    category: 'quesos',
    badge: 'Premium',
    image: '/productos/bloque-mozarella-1.png'
  },

  // --- YOGURES ---
  {
    id: 'leo-funda-yogurt',
    name: 'Funda de Yogurt',
    price: 1.60,
    unit: '/ Pack 90ml',
    desc: 'Yogurt en presentación de funda, práctico y económico para la lonchera y el consumo diario.',
    category: 'yogures',
    badge: 'Práctico',
    image: '/productos/funda-yogurt-1.png'
  },
  {
    id: 'leo-yogurt-cereal',
    name: 'Yogurt con Cereal',
    price: 3.00,
    unit: '/ Pack 90ml',
    desc: 'Yogurt natural combinado con cereal crujiente, perfecto para un desayuno nutritivo y delicioso en cualquier lugar.',
    category: 'yogures',
    badge: 'Nuevo',
    image: '/productos/yogurt-cereal.png'
  },
  {
    id: 'leo-yogurt-medio-litro',
    name: 'Yogurt de 1/2 Lt',
    price: 0.50,
    unit: '/ 250ml',
    desc: 'Yogurt natural de medio litro en variados sabores frutales, ideal para consumo individual o en pareja.',
    category: 'yogures',
    badge: 'Económico',
    image: '/productos/yogurt-12.png'
  },
  {
    id: 'leo-yogurt-1lt',
    name: 'Yogur Natural 1L',
    price: 1.00,
    unit: '/ 1 Litro',
    desc: 'Yogur natural cremoso y fresco, rico en probióticos y calcio. Con auténtica pulpa de frutas.',
    category: 'yogures',
    badge: 'Fresco',
    image: '/productos/yogurt-1lt.png'
  },
  {
    id: 'leo-yogurt-2lt',
    name: 'Yogur Natural 2L',
    price: 1.60,
    unit: '/ 2 Litros',
    desc: 'Yogur natural en presentación familiar de 2 litros, el favorito para compartir en la mesa familiar.',
    category: 'yogures',
    badge: 'Familiar',
    image: '/productos/yogurt-2lt-junto.png'
  },
  {
    id: 'leo-yogurt-4lt',
    name: 'Yogurt 4L (Galón)',
    price: 3.25,
    unit: '/ 4 Litros',
    desc: 'Yogurt natural en presentación familiar máxima de 4 litros, rendimiento insuperable para toda la semana.',
    category: 'yogures',
    badge: 'Familiar',
    image: '/productos/yogurt-4lt.png'
  },

  // --- BEBIDAS ---
  {
    id: 'leo-naranjada',
    name: 'Naranjadas',
    price: 1.50,
    unit: '/ Pack 200ml',
    desc: 'Refrescante bebida de naranja con un sabor natural que te llena de energía en cada sorbo.',
    category: 'bebidas',
    badge: 'Natural',
    image: '/productos/naranjada.png'
  },
  {
    id: 'leo-colas',
    name: 'Colas',
    price: 1.50,
    unit: '/ Pack 200ml',
    desc: 'Bebida refrescante sabor cola, excelente acompañamiento para tus refrigerios y comidas.',
    category: 'bebidas',
    badge: 'Refrescante',
    image: '/productos/cola.png'
  },
  {
    id: 'leo-bolos',
    name: 'Bolos',
    price: 1.50,
    unit: '/ Pack 200ml',
    desc: 'Bebida refrescante tradicional en forma de bolos helados, perfecta para refrescarse en los días soleados.',
    category: 'bebidas',
    badge: 'Refrescante',
    image: '/productos/bolos-1.png'
  },
  {
    id: 'leo-bebas',
    name: 'Bebas Refrescantes',
    price: 1.00,
    unit: '/ 200ml',
    desc: 'Bebida refrescante natural para el hogar o la lonchera de los niños.',
    category: 'bebidas',
    badge: 'Natural',
    image: '/productos/beba.png'
  },

  // --- ESPECIALES ---
  {
    id: 'leo-gelatina',
    name: 'Gelatina',
    price: 1.50,
    unit: '/ Pack 100ml',
    desc: 'Gelatina refrescante y deliciosa en variados sabores, perfecta como postre o merienda.',
    category: 'especiales',
    badge: 'Dulce',
    image: '/productos/gelatina1.png'
  },
  {
    id: 'leo-mantequilla-bolita',
    name: 'Bolita de Mantequilla',
    price: 1.00,
    unit: '/ 500g',
    desc: 'Mantequilla artesanal en forma de bolitas elaborada con crema de leche fresca de pastoreo, sin aditivos.',
    category: 'especiales',
    badge: 'Artesanal',
    image: '/productos/bolita-mantequilla.jpeg'
  },
  {
    id: 'leo-queso-manaba',
    name: 'Queso Manaba',
    price: 2.50,
    unit: '/ 500g',
    desc: 'Queso tradicional con sabor auténtico y punto de sal criollo, ideal para verde, bolón o patacones.',
    category: 'especiales',
    badge: 'Tradicional',
    image: '/productos/manaba.jpeg'
  }
];

export const ProductsCatalog: React.FC = () => {
  const { items, addToCart, updateQuantity, getCartTotal } = useCart();
  const { user, openAuthModal } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dbProducts, setDbProducts] = useState<ProductoDB[]>([]);

  const loadLiveStock = async () => {
    try {
      const data = await fetchProductos();
      setDbProducts(data);
    } catch (e) {
      console.error('Error cargando stock real en catálogo:', e);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadLiveStock();
    const handleStockUpdate = () => loadLiveStock();
    window.addEventListener('lacteos_leo_stock_updated', handleStockUpdate);
    return () => window.removeEventListener('lacteos_leo_stock_updated', handleStockUpdate);
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const mergedCatalog = useMemo(() => {
    return LACTEOS_LEO_CATALOG.map(staticItem => {
      const matched = dbProducts.find(p => 
        p.nombre.toLowerCase().trim() === staticItem.name.toLowerCase().trim() ||
        staticItem.name.toLowerCase().includes(p.nombre.toLowerCase()) ||
        p.nombre.toLowerCase().includes(staticItem.name.toLowerCase()) ||
        String(p.id) === staticItem.id ||
        p.codigo === staticItem.id
      );
      if (matched) {
        return {
          ...staticItem,
          id: String(matched.id),
          price: matched.precio,
          stock: matched.stock,
          dbId: matched.id
        };
      }
      return {
        ...staticItem,
        stock: 30 // stock inicial por defecto
      };
    });
  }, [dbProducts]);

  const filteredCatalog = useMemo(() => {
    return mergedCatalog.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory, mergedCatalog]);

  const totalItemsCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );
  const cartTotalAmount = useMemo(() => getCartTotal(), [items, getCartTotal]);

  const handleAddToCart = (item: CatalogItem) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      desc: item.desc,
      image: item.image,
      unit: item.unit,
      category: item.category,
      badge: item.badge
    });
    showToast(`¡${item.name} agregado al carrito!`);
  };

  const categories = [
    { id: 'all', label: 'Todos los Productos', icon: '✨' },
    { id: 'quesos', label: 'Quesos de Cotopaxi', icon: '🧀' },
    { id: 'yogures', label: 'Yogures Naturales', icon: '🥛' },
    { id: 'bebidas', label: 'Bebidas Refrescantes', icon: '🥤' },
    { id: 'especiales', label: 'Especialidades', icon: '🌟' }
  ];

  return (
    <div className="catalog-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="catalog-toast">
          <div className="catalog-toast-icon">
            <Check size={16} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="catalog-header">
        <span className="catalog-subtitle-badge">CATÁLOGO OFICIAL 100% FRESCO</span>
        <h1 className="font-display">NUESTROS PRODUCTOS LÁCTEOS LEO</h1>
        <p>
          Explora la línea completa de Lácteos Leo Latacunga. Agrega tus productos favoritos directamente
          al carrito de compras y realiza tu pedido en línea con entrega y facturación electrónica SRI.
        </p>
      </div>

      {/* Buscador & Categorías */}
      <div className="catalog-controls">
        <div className="catalog-search-wrapper">
          <Search size={18} className="catalog-search-icon" />
          <input
            type="text"
            className="catalog-search-input"
            placeholder="Buscar por nombre (ej. Mozzarella, Yogur 2L, Cheddar...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-filters">
          {categories.map((cat) => {
            const count =
              cat.id === 'all'
                ? LACTEOS_LEO_CATALOG.length
                : LACTEOS_LEO_CATALOG.filter((p) => p.category === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                className={`category-filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className="category-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="catalog-grid">
        {filteredCatalog.map((product) => {
          const cartItem = items.find((i) => i.id === product.id);

          return (
            <div key={product.id} className="catalog-card">
              {product.badge && (
                <div className="catalog-card-badge">{product.badge}</div>
              )}

              {cartItem && (
                <div className="catalog-card-incart-badge">
                  <Check size={13} />
                  En Carrito ({cartItem.quantity})
                </div>
              )}

              <div className="catalog-card-image-box">
                <img
                  src={product.image}
                  alt={product.name}
                  className="catalog-card-image"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== principalImg) {
                      target.src = principalImg;
                    }
                  }}
                />
              </div>

              <div className="catalog-card-content">
                <span className="catalog-card-category">{product.category}</span>
                <h3 className="catalog-card-title">{product.name}</h3>
                <p className="catalog-card-desc">{product.desc}</p>

                <div className="catalog-card-price-row">
                  <div>
                    <span className="catalog-price-num">
                      ${product.price.toFixed(2)}
                    </span>
                    <span className="catalog-price-unit">{product.unit}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: (product.stock ?? 30) <= 5 ? '#fef2f2' : '#f0fdf4',
                      color: (product.stock ?? 30) <= 5 ? '#dc2626' : '#166534',
                      border: `1px solid ${(product.stock ?? 30) <= 5 ? '#fecaca' : '#bbf7d0'}`
                    }}>
                      {(product.stock ?? 30) > 0 ? `Stock: ${product.stock ?? 30} uds` : '¡Agotado!'}
                    </span>
                  </div>
                </div>

                <div className="catalog-card-actions">
                  {(product.stock ?? 30) <= 0 ? (
                    <button
                      type="button"
                      className="btn-add-catalog font-display"
                      disabled
                      style={{ background: '#94a3b8', cursor: 'not-allowed', opacity: 0.7 }}
                    >
                      Sin Stock Disponible
                    </button>
                  ) : !cartItem ? (
                    <button
                      type="button"
                      className="btn-add-catalog font-display"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart size={17} />
                      Agregar al Carrito
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="incart-controls">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                          title="Reducir cantidad"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="qty-display">{cartItem.quantity} en carrito</span>
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => {
                            if (cartItem.quantity >= (product.stock ?? 30)) {
                              showToast(`Límite máximo de stock alcanzado (${product.stock ?? 30} uds)`);
                              return;
                            }
                            updateQuantity(product.id, cartItem.quantity + 1);
                            showToast(`+1 ${product.name}`);
                          }}
                          title="Aumentar cantidad"
                          style={{ opacity: cartItem.quantity >= (product.stock ?? 30) ? 0.4 : 1 }}
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="btn-add-catalog font-display"
                        onClick={() => {
                          if (cartItem.quantity >= (product.stock ?? 30)) {
                            showToast(`Límite máximo de stock alcanzado (${product.stock ?? 30} uds)`);
                            return;
                          }
                          updateQuantity(product.id, cartItem.quantity + 1);
                          showToast(`+1 ${product.name} añadido al pedido`);
                        }}
                        style={{
                          background: cartItem.quantity >= (product.stock ?? 30) ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          boxShadow: cartItem.quantity >= (product.stock ?? 30) ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.25)',
                          cursor: cartItem.quantity >= (product.stock ?? 30) ? 'not-allowed' : 'pointer'
                        }}
                        disabled={cartItem.quantity >= (product.stock ?? 30)}
                      >
                        <Plus size={16} />
                        + Agregar Más Cantidad
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCatalog.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '12px', color: '#0f172a' }}>
            No encontramos productos con &quot;{searchQuery}&quot;
          </h3>
          <button
            type="button"
            className="category-filter-btn active"
            style={{ margin: '0 auto' }}
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
          >
            Ver todos los productos
          </button>
        </div>
      )}

      {/* Floating Sticky Cart Bar */}
      {totalItemsCount > 0 && (
        <div className="sticky-catalog-cart">
          <div className="sticky-cart-info">
            <div className="sticky-cart-icon-wrapper">
              <ShoppingCart size={22} />
              <span className="sticky-cart-badge">{totalItemsCount}</span>
            </div>
            <div className="sticky-cart-text">
              <span className="sticky-cart-label">Tu Carrito de Pedidos</span>
              <span className="sticky-cart-total font-display">
                ${cartTotalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <Link
            to="/checkout"
            className="sticky-cart-checkout-btn font-display"
            onClick={(e) => {
              if (!user) {
                e.preventDefault();
                openAuthModal('login');
              }
            }}
          >
            Ir al Carrito / Pagar
            <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </div>
  );
};
