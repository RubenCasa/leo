import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Check, ArrowRight } from 'lucide-react';
import './Sections.css';

import principalImg from '../assets/principal.png';
import historyImg from '../assets/history.png';

interface FeaturedProduct {
  id: string;
  name: string;
  badge: string;
  desc: string;
  img: string;
  unit: string;
  price: number;
  category: string;
}

const featuredProducts: FeaturedProduct[] = [
  {
    id: 'leo-yogurt-2lt',
    name: 'Yogurt Natural Lácteos Leo 2L',
    badge: 'FAVORITO FAMILIAR',
    desc: 'Elaborado con leche pura de pastoreo de Cotopaxi y auténtica pulpa de fruta natural. Textura cremosa inigualable.',
    img: '/productos/yogurt-2lt-junto.png',
    unit: 'Presentación 2 Litros',
    price: 1.60,
    category: 'yogures'
  },
  {
    id: 'leo-queso-familiar-750',
    name: 'Queso Familiar de Mesa (750g)',
    badge: '100% ARTESANAL',
    desc: 'Elaborado bajo recetas tradicionales de Cotopaxi con leche entera fresca. Suave, nutritivo y perfecto para el hogar.',
    img: '/productos/Queso-mesa-750.png',
    unit: 'Presentación Familiar 750g',
    price: 2.25,
    category: 'quesos'
  },
  {
    id: 'leo-bloque-mozzarella',
    name: 'Bloque de Mozzarella Premium (2.5 kg)',
    badge: 'ALTO RENDIMIENTO',
    desc: 'Queso suave y elástico, fundido perfecto para pizzas, lasañas y restaurantes exigentes.',
    img: '/productos/bloque-mozarella-1.png',
    unit: 'Bloque 2.5 Kilos',
    price: 12.00,
    category: 'quesos'
  }
];

export const Products: React.FC = () => {
  const { addToCart, items } = useCart();
  const [addedToast, setAddedToast] = useState<string | null>(null);

  const handleQuickAdd = (prod: FeaturedProduct) => {
    addToCart({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      desc: prod.desc,
      image: prod.img,
      unit: prod.unit,
      category: prod.category,
      badge: prod.badge
    });
    setAddedToast(`¡${prod.name} agregado a tu carrito!`);
    setTimeout(() => setAddedToast(null), 3000);
  };

  return (
    <section id="productos" className="section-container products-showcase-section">
      {addedToast && (
        <div
          style={{
            position: 'fixed',
            top: '95px',
            right: '24px',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #1d2636, #151c28)',
            border: '1px solid #28a745',
            padding: '14px 22px',
            borderRadius: '12px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}
        >
          <Check size={18} style={{ color: '#28a745' }} />
          <span>{addedToast}</span>
        </div>
      )}

      <div className="section-content">
        <div className="section-header-tag font-display">CATÁLOGO OFICIAL LÁCTEOS LEO</div>
        <h2 className="section-title font-display">PRODUCTOS DESTACADOS DE COTOPAXI</h2>
        <p className="products-subtitle">
          Disfruta de la calidad y tradición de Lácteos Leo Latacunga. Agrega directamente a tu carrito o explora el catálogo completo con más de 20 productos.
        </p>

        {/* Product Cards Grid */}
        <div className="products-showcase-grid">
          {featuredProducts.map((prod) => {
            const inCart = items.find((i) => i.id === prod.id);

            return (
              <div key={prod.id} className="product-showcase-card">
                <div className="product-card-badge font-display">{prod.badge}</div>

                <div className="product-card-image-wrapper">
                  <img
                    src={prod.img}
                    alt={prod.name}
                    className="product-card-image"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== principalImg) {
                        target.src = prod.category === 'quesos' ? historyImg : principalImg;
                      }
                    }}
                  />
                </div>

                <div className="product-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="product-unit-label">{prod.unit}</span>
                    <span style={{ color: '#d4a017', fontWeight: 800, fontSize: '1.25rem' }}>
                      ${prod.price.toFixed(2)}
                    </span>
                  </div>
                  <h3 className="product-card-title font-display">{prod.name}</h3>
                  <p className="product-card-desc">{prod.desc}</p>

                  <div
                    className="product-card-footer"
                    style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                  >
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(prod)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        background: inCart
                          ? 'rgba(40, 167, 69, 0.2)'
                          : 'linear-gradient(135deg, #d4a017 0%, #b8860b 100%)',
                        border: inCart ? '1px solid #28a745' : 'none',
                        color: inCart ? '#28a745' : '#080a0f',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {inCart ? (
                        <>
                          <Check size={16} /> En Carrito ({inCart.quantity})
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={16} /> Agregar al Carrito
                        </>
                      )}
                    </button>

                    <Link
                      to="/productos"
                      className="font-display"
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        textDecoration: 'none',
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        color: '#cfd8ea',
                        fontSize: '13.5px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '10px'
                      }}
                    >
                      Ver Catálogo Completo <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
