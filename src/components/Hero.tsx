import React from 'react';
import './Hero.css';

import video1Mp4 from '../assets/video1.mp4';

export const Hero: React.FC = () => {
  return (
    <section className="elranchito-hero" id="inicio">
      <div className="hero-grid-container">
        {/* Left Column: Editorial Headline & Copy */}
        <div className="hero-copy-col">
          <div className="hero-pill-badge">
            🥛 CALIDAD COTOPAXI & TRADICIÓN
          </div>

          <h1 className="hero-main-title font-display">
            “Desde 1990, el <span className="highlight-yellow">sabor</span> y la <span className="highlight-yellow">confianza</span> se disfrutan en cada bocado”
          </h1>

          <p className="hero-lead-text font-body">
            Nuestras vacas pastan en los campos más fértiles de Guaytacama - Cotopaxi, disfrutando de la vida tranquila y natural que se refleja en cada gota de nuestra leche y en nuestros quesos artesanales.
          </p>

          <div className="hero-action-buttons">
            <a href="#productos" className="hero-btn-primary font-display">
              Ver Nuestros Productos →
            </a>
            <a href="#historia" className="hero-btn-secondary">
              Nuestro Compromiso
            </a>
          </div>

          <div className="hero-stats-row">
            <div className="hero-stat">
              <span className="stat-number font-display">+35</span>
              <span className="stat-label">Años de Tradición</span>
            </div>
            <div className="stat-divider"></div>
            <div className="hero-stat">
              <span className="stat-number font-display">100%</span>
              <span className="stat-label">Leche de Pastoreo</span>
            </div>
            <div className="stat-divider"></div>
            <div className="hero-stat">
              <span className="stat-number font-display">INEN</span>
              <span className="stat-label">Calidad & Higiene</span>
            </div>
          </div>
        </div>

        {/* Right Column: Video Oficial Destacado */}
        <div className="hero-products-showcase">
          <div className="principal-showcase-wrapper">
            <div className="principal-glow"></div>

            <div className="hero-video-frame">
              <video
                src={video1Mp4}
                className="hero-principal-video"
                autoPlay
                loop
                muted
                playsInline
                controls
              />
            </div>

            <div className="principal-floating-badge badge-top-right font-display">
              <span>✨ 100% LECHE DE PASTOREO</span>
            </div>

            <div className="principal-floating-badge badge-bottom-left font-display">
              <span>⭐ CALIDAD COTOPAXI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Curved Wave Separator into white background */}
      <div className="hero-wave-divider">
        <svg viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none">
          <path
            d="M0,32L60,42.7C120,53,240,75,360,74.7C480,75,600,53,720,48C840,43,960,53,1080,64C1200,75,1320,85,1380,90.7L1440,96L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z"
            fill="#ffffff"
          ></path>
        </svg>
      </div>
    </section>
  );
};
