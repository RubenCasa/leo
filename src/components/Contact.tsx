import React from 'react';
import './Sections.css';

export const Contact: React.FC = () => {
  return (
    <section id="contacto" className="section-container" style={{ minHeight: '70vh', paddingBottom: '100px' }}>
      <div className="section-content">
        <div className="section-header-tag font-display">SIEMPRE CERCA DE TI</div>
        <h2 className="section-title font-display">CONTÁCTANOS & PEDIDOS</h2>
        <p className="products-subtitle">
          Atendemos pedidos personales, familiares y al por mayor para negocios y panaderías.
        </p>

        <div className="contact-info-grid">
          <div className="contact-box">
            <div className="value-prop-icon">📍</div>
            <h4 className="font-display">Planta & Producción</h4>
            <p>Guaytacama - Pilacoto<br/>Latacunga, Cotopaxi - Ecuador</p>
          </div>

          <div className="contact-box">
            <div className="value-prop-icon">⏰</div>
            <h4 className="font-display">Horario de Atención</h4>
            <p>Lunes a Sábado<br/>08:00 AM - 18:00 PM</p>
          </div>

          <div className="contact-box">
            <div className="value-prop-icon">💬</div>
            <h4 className="font-display">Atención Directa</h4>
            <p>Teléfono & WhatsApp<br/><strong>099 893 3267</strong></p>
          </div>
        </div>

        <div style={{ marginTop: '50px', display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://wa.me/593998933267?text=%C2%A1Hola%20L%C3%A1cteos%20Leo!%20Deseo%20hacer%20una%20consulta."
            target="_blank"
            rel="noopener noreferrer"
            className="btn-explore-catalog font-display"
            style={{ backgroundColor: '#25d366' }}
          >
            💬 Chatear por WhatsApp
          </a>
          <a
            href="mailto:lacteosleo2@gmail.com"
            className="contact-btn font-display"
          >
            ✉️ lacteosleo2@gmail.com
          </a>
        </div>
      </div>
    </section>
  );
};
