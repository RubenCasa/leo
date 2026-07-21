import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ============================================================================
// 🛡️ ESCUDO DE DEFENSA ACTIVA • LÁCTEOS LEO (Anti Self-XSS & DevTools Attack)
// ============================================================================
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  setTimeout(() => {
    console.log(
      '%c¡ALTO AQUÍ! 🛑',
      'color: #dc2626; font-size: 48px; font-weight: 900; font-family: sans-serif; text-shadow: 2px 2px 0 #000;'
    );
    console.log(
      '%cEsta función del navegador está diseñada únicamente para desarrolladores e ingenieros de seguridad de Lácteos Leo S.A.\nSi alguien te indicó que copiaras o pegaras algo aquí para "habilitar una función", "obtener descuentos" o "hackear el sistema", se trata de una ESTAFA para robar tu cuenta y tus datos personales o bancarios (Self-XSS).',
      'color: #1e293b; font-size: 16px; line-height: 1.6; font-weight: 600;'
    );
  }, 1000);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
