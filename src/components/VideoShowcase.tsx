import React from 'react';
import { Link } from 'react-router-dom';
import './VideoShowcase.css';
import video1Mp4 from '../assets/video1.mp4';

export const VideoShowcase: React.FC = () => {
  return (
    <section className="video-showcase-section">
      {/* Luz ambiental sutil de fondo */}
      <div className="showcase-ambient-glow"></div>

      {/* Curva Superior Decorativa */}
      <div className="showcase-curve-top">
        <svg viewBox="0 0 1440 70" fill="none" preserveAspectRatio="none">
          <path
            d="M0,0 C480,70 960,70 1440,0 L1440,70 L0,70 Z"
            fill="#0b301c"
          />
        </svg>
      </div>

      <div className="video-showcase-container">
        {/* ========================================================
            LADO IZQUIERDO: REPRODUCTOR DE VIDEO CINEMATOGRÁFICO
            ======================================================== */}
        <div className="video-showcase-left">
          <div className="video-header-meta">
            <span className="video-pill-tag font-display">NUESTRA PLANTA EN GUAYTACAMA</span>
          </div>

          <div className="luxury-video-frame">
            <video
              src={video1Mp4}
              className="showcase-video-player"
              autoPlay
              loop
              muted
              playsInline
              controls
            />
            <div className="video-live-badge">
              <span className="live-dot"></span>
              <span>100% ARTESANAL • COTOPAXI</span>
            </div>
          </div>

          <p className="video-caption">
            Conoce el esmero y dedicación con los que seleccionamos la mejor leche fresca de pastoreo cada mañana.
          </p>
        </div>

        {/* ========================================================
            LADO DERECHO: PILARES DE EXCELENCIA & CATÁLOGO
            ======================================================== */}
        <div className="video-showcase-right">
          <div className="showcase-header">
            <span className="showcase-subhead font-display">CALIDAD SIN COMPROMISOS</span>
            <h2 className="showcase-main-title font-display">
              PURA LECHE DE PASTOREO & EXCELENCIA ARTESANAL
            </h2>
          </div>

          <div className="showcase-cards-stack">
            <div className="showcase-card-item">
              <div className="card-icon-gold">🌿</div>
              <div className="card-text">
                <h3 className="card-title font-display">100% Leche de Pastoreo</h3>
                <p className="card-desc">
                  Ganado alimentado en pastizales fértiles de Guaytacama para una nutrición superior.
                </p>
              </div>
            </div>

            <div className="showcase-card-item">
              <div className="card-icon-gold">🏅</div>
              <div className="card-text">
                <h3 className="card-title font-display">Buenas Prácticas (BPM)</h3>
                <p className="card-desc">
                  Procesos higiénicos estandarizados que aseguran frescura y pureza en cada lote.
                </p>
              </div>
            </div>

            <div className="showcase-card-item">
              <div className="card-icon-gold">🇪🇨</div>
              <div className="card-text">
                <h3 className="card-title font-display">Orgullo de Cotopaxi</h3>
                <p className="card-desc">
                  Más de 35 años elaborando los quesos y yogures tradicionales favoritos de las familias.
                </p>
              </div>
            </div>
          </div>

          <div className="showcase-cta-box">
            <Link to="/productos" className="btn-luxury-catalog font-display">
              Explorar Catálogo Completo y Ver Todos Los Productos →
            </Link>
          </div>
        </div>
      </div>

      {/* Curva Inferior */}
      <div className="showcase-curve-bottom">
        <svg viewBox="0 0 1440 70" fill="none" preserveAspectRatio="none">
          <path
            d="M0,30 C480,70 960,0 1440,40 L1440,70 L0,70 Z"
            fill="#ffffff"
          />
        </svg>
      </div>
    </section>
  );
};
