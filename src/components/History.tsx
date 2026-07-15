import React from 'react';
import './Sections.css';
import historyImg from '../assets/history.png';

export const History: React.FC = () => {
  return (
    <section id="historia" className="section-container">
      <div className="section-content">
        <div className="section-header-tag font-display">TRADICIÓN DESDE 1990</div>
        <h2 className="section-title font-display">NUESTRA HISTORIA</h2>
        <div className="history-grid">
          <div className="history-text-container">
            <p className="history-text">
              Con <strong>más de 35 años de experiencia</strong>, Lácteos Leo nació en 1990 en la parroquia de Guaytacama ( Pilacoto), cantón Latacunga.
              Lo que comenzó como una tradición familiar se ha convertido en un símbolo de calidad en toda la provincia de Cotopaxi.
              Nuestra dedicación absoluta a los procesos garantiza que cada producto conserve la esencia pura, fresca y natural que solo la verdadera pasión por los lácteos puede ofrecer.
            </p>
          </div>
          <div className="history-image-container">
            <img src={historyImg} alt="Lácteos Artesanales Premium Cotopaxi" className="history-image" />
          </div>
        </div>
      </div>
    </section>
  );
};
