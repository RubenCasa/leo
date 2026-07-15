import React from 'react';
import './TopBar.css';

export const TopBar: React.FC = () => {
  return (
    <div className="topbar-container">
      <div className="topbar-content">
        <div className="topbar-left">
          <span className="topbar-badge">¡NUEVO!</span>
          <span className="topbar-text">
            Celebrando más de 35 años de Excelencia Láctea en Guaytacama - Cotopaxi
          </span>
        </div>
        <div className="topbar-right">
          <a
            href="https://wa.me/593998933267?text=%C2%A1Hola%20L%C3%A1cteos%20Leo!"
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-link"
          >
             Pedidos WhatsApp: 099 893 3267
          </a>
          <span className="topbar-separator">|</span>
          <span className="topbar-hours"> Lunes a Sábado: 08:00 - 18:00</span>
        </div>
      </div>
    </div>
  );
};
