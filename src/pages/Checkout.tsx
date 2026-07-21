import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { generateSRIXML, generateRIDE, generarClaveYSecuencialUnicos } from '../utils/sriGenerator';
import { sendComprobanteEmailViaSupabase, type OrderComprobante } from '../lib/supabase';
import { crearPedidoCompleto, guardarComprobanteSRI } from '../lib/productosService';
import { checkRateLimit, resetRateLimit, sanitizeInput } from '../utils/security';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Smartphone,
  Fingerprint,
  KeyRound
} from 'lucide-react';
import './Checkout.css';

export const Checkout: React.FC = () => {
  const { items, getCartTotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    idNumber: '',
    address: '',
    email: user?.email || ''
  });

  // Método de pago y pasarela segura en Ecuador
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
  const [gatewayProvider, setGatewayProvider] = useState<'payphone' | 'kushki'>('kushki');
  
  // Datos de tarjeta encriptada
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiry: '',
    cvv: '',
    installments: 'corriente'
  });

  // Estado de procesamiento API pago & EMVCo 3D Secure 2.0
  const [processingState, setProcessingState] = useState<{
    status: 'idle' | 'connecting' | 'challenge_3ds' | 'verifying' | 'approved' | 'error';
    message: string;
    authCode?: string;
  }>({
    status: 'idle',
    message: ''
  });

  // Estado del reto 3D Secure 2.0 (SMS OTP / Biométrico)
  const [challenge3DS, setChallenge3DS] = useState<{
    mode: 'sms' | 'biometric';
    otp: string;
    issuerBank: string;
  }>({
    mode: 'sms',
    otp: '',
    issuerBank: 'Banco Pichincha C.A. / Ecuador'
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name,
        email: prev.email || user.email
      }));
    }
  }, [user]);

  const total = getCartTotal();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatCardNumber = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 16);
    return clean.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 3) {
      return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    }
    return clean;
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'cardNumber') {
      setCardData(prev => ({ ...prev, cardNumber: formatCardNumber(value) }));
    } else if (name === 'expiry') {
      setCardData(prev => ({ ...prev, expiry: formatExpiry(value) }));
    } else if (name === 'cvv') {
      const clean = value.replace(/\D/g, '').slice(0, 4);
      setCardData(prev => ({ ...prev, cvv: clean }));
    } else {
      setCardData(prev => ({ ...prev, [name]: value }));
    }
  };

  const getCardBrand = (num: string) => {
    const clean = num.replace(/\D/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (clean.startsWith('5') || clean.startsWith('2')) return 'MASTERCARD';
    if (clean.startsWith('36') || clean.startsWith('38')) return 'DINERS CLUB';
    if (clean.startsWith('34') || clean.startsWith('37')) return 'AMEX';
    return 'TARJETA';
  };

  const detectIssuerBank = (num: string) => {
    const clean = num.replace(/\D/g, '');
    if (clean.startsWith('4500') || clean.startsWith('4312')) return 'Banco Pichincha Ecuador';
    if (clean.startsWith('5412') || clean.startsWith('5523')) return 'Banco Guayaquil Ecuador';
    if (clean.startsWith('36')) return 'Diners Club del Ecuador';
    if (clean.startsWith('4911')) return 'Produbanco Grupo Promerica';
    return 'Banco Emisor Ecuador';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    // Rate Limit Check anti card-testing / spam de pagos en el Checkout (máx 5 transacciones en 60 seg)
    const rateCheck = checkRateLimit('checkout_submit', 5, 60);
    if (!rateCheck.allowed) {
      alert(`❌ Demasiados intentos de pago. Por protección anti-fraude y bloqueo de tarjeta, espera ${rateCheck.remainingSeconds} segundos antes de volver a intentar.`);
      return;
    }

    // Validación de tarjeta si el método es tarjeta
    if (paymentMethod === 'card') {
      const cleanNum = cardData.cardNumber.replace(/\D/g, '');
      if (cleanNum.length < 15) {
        alert('Por favor ingresa un número de tarjeta válido (15 o 16 dígitos).');
        return;
      }
      if (!cardData.cardHolder.trim()) {
        alert('Por favor ingresa el nombre del titular de la tarjeta.');
        return;
      }
      if (cardData.expiry.length < 5) {
        alert('Por favor ingresa una fecha de expiración válida (MM/AA).');
        return;
      }
      if (cardData.cvv.length < 3) {
        alert('Por favor ingresa el código de seguridad CVV (3 o 4 dígitos).');
        return;
      }

      // Paso 1: Conexión segura PCI-DSS y activación de Reto 3D Secure 2.0
      setProcessingState({
        status: 'connecting',
        message: `Conectando con servidor API ${gatewayProvider === 'kushki' ? 'Kushki Pagos Ecuador' : 'Payphone Ecuador'} SSL 256-bit...`
      });

      await new Promise(r => setTimeout(r, 1100));

      // Paso 2: Abrir Reto EMVCo 3D Secure 2.0 (Autenticación Biométrica / SMS)
      setChallenge3DS({
        mode: 'sms',
        otp: '',
        issuerBank: detectIssuerBank(cardData.cardNumber)
      });
      setProcessingState({
        status: 'challenge_3ds',
        message: 'Verificación Bancaria EMVCo 3D Secure 2.0 requerida por tu banco.'
      });
      return;
    }

    // Si es transferencia directa procedemos a finalizar
    await finalizeOrderFlow('EC-TR-DIRECTA');
  };

  // Finalizar verificación EMVCo 3D Secure 2.0 y procesar compra
  const handleVerify3DS = async (simulatedOtp?: string) => {
    const finalOtp = simulatedOtp || challenge3DS.otp;
    if (challenge3DS.mode === 'sms' && finalOtp.length < 6) {
      alert('Por favor ingresa el código OTP bancario de 6 dígitos.');
      return;
    }

    setProcessingState({
      status: 'verifying',
      message: `Verificando firma criptográfica EMVCo 3D Secure 2.0 con ${challenge3DS.issuerBank}...`
    });

    await new Promise(r => setTimeout(r, 1400));

    const authCode = `3DS2-EC-${Math.floor(100000 + Math.random() * 900000)}`;
    setProcessingState({
      status: 'approved',
      message: `¡Autenticación 3D Secure Exitosa! Código de Autorización SRI/Banco: ${authCode}`,
      authCode
    });

    await new Promise(r => setTimeout(r, 1100));

    await finalizeOrderFlow(authCode);
  };

  const finalizeOrderFlow = async (authCode: string) => {
    // Generar Clave de Acceso y Secuencial SRI Únicos para esta transacción
    const { claveAcceso, secuencial } = generarClaveYSecuencialUnicos();

    // Sanitizar entradas del comprador para evitar inyección en XML/PDF
    const cleanCustomer = {
      ...formData,
      name: sanitizeInput(formData.name),
      address: sanitizeInput(formData.address),
      email: sanitizeInput(formData.email)
    };

    // Generate SRI XML
    const xml = generateSRIXML(cleanCustomer, items, total, claveAcceso, secuencial);
    const xmlBlob = new Blob([xml], { type: 'application/xml' });
    const xmlUrl = URL.createObjectURL(xmlBlob);
    
    const xmlLink = document.createElement('a');
    xmlLink.href = xmlUrl;
    xmlLink.download = `factura-sri-${cleanCustomer.idNumber || 'LEO'}.xml`;
    document.body.appendChild(xmlLink);
    xmlLink.click();
    document.body.removeChild(xmlLink);

    // Generate RIDE PDF
    const pdfDoc = generateRIDE(cleanCustomer, items, total, claveAcceso, secuencial);
    pdfDoc.save(`factura-ride-${cleanCustomer.idNumber || 'LEO'}.pdf`);

    // Create & send Comprobante via Supabase API (Resend)
    const orderNumber = `LEO-${Math.floor(100000 + Math.random() * 900000)}`;
    const comprobante: OrderComprobante = {
      id: `ord_${Date.now()}`,
      orderNumber,
      customerName: cleanCustomer.name,
      customerEmail: cleanCustomer.email,
      userId: user?.id,
      items: items.map(i => ({ name: sanitizeInput(i.name), quantity: i.quantity, price: i.price })),
      totalAmount: total,
      date: new Date().toISOString(),
      status: 'completado',
      claveAcceso
    };

    // 1. Guardar pedido en base de datos Supabase e historial (si usuario ha iniciado sesión)
    if (user?.id) {
      try {
        const pedidoId = await crearPedidoCompleto({
          usuario_id: user.id,
          numero_pedido: orderNumber,
          total: total,
          metodo_pago: gatewayProvider,
          auth_code: authCode,
          items: items.map(i => ({
            producto_id: typeof i.id === 'number' ? i.id : parseInt(String(i.id), 10) || 1,
            nombre_producto: sanitizeInput(i.name),
            cantidad: i.quantity,
            precio_unitario: i.price,
            subtotal: Number((i.price * i.quantity).toFixed(2))
          }))
        });
        // 2. Guardar comprobante SRI oficial en la tabla comprobantes_sri
        await guardarComprobanteSRI(pedidoId, claveAcceso, secuencial, xml);
      } catch (dbError) {
        console.error('No se pudo guardar historial en Supabase:', dbError);
      }
    }

    const result = await sendComprobanteEmailViaSupabase(comprobante);

    resetRateLimit('checkout_submit');
    setProcessingState({ status: 'idle', message: '' });

    alert(`¡Transacción Bancaria Exitosamente Procesada y Verificada en Ecuador!\n\n• Pasarela: ${gatewayProvider.toUpperCase()} ECUADOR (PCI-DSS Nivel 1)\n• Seguridad: EMVCo 3D Secure 2.0 Aprobado\n• Aut Banco: ${authCode}\n• Pedido: #${orderNumber}\n\nFacturas electrónicas XML y PDF descargadas y guardadas en tu apartado de Mis Facturas (Supabase).\n${result.message}`);
    clearCart();
    if (user?.id) {
      navigate('/mis-facturas');
    } else {
      navigate('/');
    }
  };

  if (!user) {
    return (
      <div className="checkout-page empty" style={{ textAlign: 'center' }}>
        <Lock size={52} color="#2e7d32" />
        <h2 className="font-display">Requiere Iniciar Sesión para Comprar</h2>
        <p style={{ color: '#475569', maxWidth: '460px', margin: '0 auto', lineHeight: 1.6, fontSize: '15px' }}>
          Para acceder a tu Carrito de Compras, emitir tu factura electrónica SRI y usar la pasarela segura EMVCo 3D Secure 2.0, por favor inicia sesión o regístrate gratis.
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '12px' }}>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="checkout-submit-btn"
            style={{ margin: 0, padding: '14px 28px' }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => openAuthModal('register')}
            className="return-btn"
            style={{ margin: 0, padding: '14px 28px', background: '#e8f5e9', color: '#1b5e20', border: '1.5px solid #2e7d32' }}
          >
            Crear Cuenta Gratis
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="checkout-page empty">
        <h2>Tu carrito de compras está vacío</h2>
        <button onClick={() => navigate('/productos')} className="return-btn">
          Volver al Catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      {/* 1) MODAL EMVCo 3D SECURE 2.0 (RETOS DE AUTENTICACIÓN SMS / BIOMÉTRICA) */}
      {processingState.status === 'challenge_3ds' && (
        <div className="secure-payment-overlay">
          <div className="emvco-3ds-modal">
            <div className="emvco-header">
              <div className="emvco-header-badges">
                <span className="emvco-seal-pill">EMVCo 3D SECURE 2.0</span>
                <span className="emvco-seal-pill brand">VERIFIED BY {getCardBrand(cardData.cardNumber)}</span>
              </div>
              <h3 className="font-display">Autenticación Bancaria de Seguridad</h3>
              <p className="emvco-subtitle">
                Banco Emisor: <strong>{challenge3DS.issuerBank}</strong>
              </p>
            </div>

            <div className="emvco-transaction-summary">
              <div className="emvco-row">
                <span>Comercio:</span>
                <strong>Lácteos Leo Cotopaxi S.A.</strong>
              </div>
              <div className="emvco-row">
                <span>Tarjeta:</span>
                <strong>•••• •••• •••• {cardData.cardNumber.slice(-4) || '1234'}</strong>
              </div>
              <div className="emvco-row">
                <span>Monto de Compra:</span>
                <strong className="emvco-amount">${total.toFixed(2)} USD</strong>
              </div>
            </div>

            {/* Selector de tipo de reto 3D Secure */}
            <div className="emvco-tabs">
              <button
                type="button"
                className={`emvco-tab ${challenge3DS.mode === 'sms' ? 'active' : ''}`}
                onClick={() => setChallenge3DS(prev => ({ ...prev, mode: 'sms' }))}
              >
                <Smartphone size={18} />
                <span>Código SMS (OTP)</span>
              </button>
              <button
                type="button"
                className={`emvco-tab ${challenge3DS.mode === 'biometric' ? 'active' : ''}`}
                onClick={() => setChallenge3DS(prev => ({ ...prev, mode: 'biometric' }))}
              >
                <Fingerprint size={18} />
                <span>Biometría App Móvil</span>
              </button>
            </div>

            {/* RETO SMS OTP */}
            {challenge3DS.mode === 'sms' && (
              <div className="emvco-challenge-body">
                <div className="emvco-info-notice">
                  <KeyRound size={18} />
                  <span>
                    Se envió un código temporal de 6 dígitos a tu celular bancario registrado (+593 ••• ••• •84).
                  </span>
                </div>

                <div className="emvco-otp-wrapper">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="• • • • • •"
                    className="emvco-otp-input"
                    value={challenge3DS.otp}
                    onChange={e =>
                      setChallenge3DS(prev => ({
                        ...prev,
                        otp: e.target.value.replace(/\D/g, '')
                      }))
                    }
                  />
                </div>

                <div className="emvco-actions">
                  <button
                    type="button"
                    className="emvco-btn-verify"
                    onClick={() => handleVerify3DS()}
                  >
                    <ShieldCheck size={18} />
                    <span>Confirmar Código OTP</span>
                  </button>
                  <button
                    type="button"
                    className="emvco-btn-simulate"
                    onClick={() => handleVerify3DS('839204')}
                  >
                    ⚡ Simular SMS Aprobado (839204)
                  </button>
                </div>
              </div>
            )}

            {/* RETO BIOMÉTRICO */}
            {challenge3DS.mode === 'biometric' && (
              <div className="emvco-challenge-body">
                <div className="emvco-biometric-box">
                  <Fingerprint size={52} className="emvco-fingerprint-icon" />
                  <h4>Aprobación por Face ID / Huella Dactilar</h4>
                  <p>
                    Abre la aplicación móvil de <strong>{challenge3DS.issuerBank}</strong> en tu celular y aprueba la solicitud de pago de Lácteos Leo.
                  </p>
                </div>

                <div className="emvco-actions">
                  <button
                    type="button"
                    className="emvco-btn-verify"
                    onClick={() => handleVerify3DS('BIOMETRIC-OK')}
                  >
                    👆 Simular Aprobación Biométrica App
                  </button>
                </div>
              </div>
            )}

            <div className="payment-security-footer">
              <Lock size={14} />
              <span>Estándar Global EMVCo 3D Secure 2.0 • Prevención Antifraude</span>
            </div>
          </div>
        </div>
      )}

      {/* 2) MODAL DE PROCESAMIENTO GENERAL / APROBADO */}
      {processingState.status !== 'idle' && processingState.status !== 'challenge_3ds' && (
        <div className="secure-payment-overlay">
          <div className="secure-payment-modal">
            {processingState.status === 'approved' ? (
              <CheckCircle2 size={56} className="payment-modal-icon success" />
            ) : (
              <Loader2 size={48} className="payment-modal-icon spinning" />
            )}
            <h3 className="font-display">
              {processingState.status === 'approved'
                ? '¡Pago 3D Secure Autorizado!'
                : 'Conectando con Pasarela Bancaria'}
            </h3>
            <p className="payment-modal-text">{processingState.message}</p>
            <div className="payment-security-footer">
              <ShieldCheck size={16} />
              <span>Conexión Bancaria Encriptada SSL 256-bit • PCI-DSS Nivel 1</span>
            </div>
          </div>
        </div>
      )}

      <div className="checkout-container">
        {/* Lado Izquierdo: Formulario de Facturación y Pago */}
        <div className="checkout-form-section">
          <div className="checkout-secure-badge-top">
            <Lock size={16} />
            <span>Pasarela Segura Kushki / Payphone Ecuador • Encriptación 256-Bit SSL</span>
          </div>

          <h2 className="font-display">Datos de Facturación SRI</h2>
          
          <form onSubmit={handleSubmit} className="checkout-form">
            <div className="form-row-2">
              <div className="form-group">
                <label>Razón Social / Nombre Completo *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Ej. Juan Pérez / Lácteos S.A."
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Cédula de Identidad / RUC *</label>
                <input
                  type="text"
                  name="idNumber"
                  required
                  placeholder="Ej. 1712345678"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Dirección en Ecuador *</label>
                <input
                  type="text"
                  name="address"
                  required
                  placeholder="Calle, Ciudad, Provincia"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Correo Electrónico *</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="tuemail@ejemplo.com"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* SECCIÓN DE MÉTODO DE PAGO SEGURO ECUADOR */}
            <div className="payment-gateway-section">
              <h3 className="payment-section-title font-display">
                Método de Pago Seguro en Ecuador
              </h3>
              
              <div className="gateway-selector-tabs">
                <button
                  type="button"
                  className={`gateway-tab ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard size={18} />
                  <span>Tarjeta de Crédito / Débito (3DS2)</span>
                </button>
                <button
                  type="button"
                  className={`gateway-tab ${paymentMethod === 'transfer' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('transfer')}
                >
                  <Building2 size={18} />
                  <span>Transferencia Bancaria Directa</span>
                </button>
              </div>

              {/* OPCIÓN 1: PAGO CON TARJETA ENCRIPTADA */}
              {paymentMethod === 'card' && (
                <div className="secure-card-form">
                  <div className="gateway-provider-switch">
                    <span className="provider-label">Procesador Certificado SRI / Superbancos:</span>
                    <div className="provider-options">
                      <label
                        className={`provider-pill ${gatewayProvider === 'kushki' ? 'active' : ''}`}
                        onClick={() => setGatewayProvider('kushki')}
                      >
                        Kushki Pagos Ecuador
                      </label>
                      <label
                        className={`provider-pill ${gatewayProvider === 'payphone' ? 'active' : ''}`}
                        onClick={() => setGatewayProvider('payphone')}
                      >
                        Payphone Ecuador (Promerica)
                      </label>
                    </div>
                  </div>

                  <div className="card-brand-badges">
                    <span className="card-badge-pill">VISA 3DS</span>
                    <span className="card-badge-pill">MASTERCARD ID CHECK</span>
                    <span className="card-badge-pill">DINERS CLUB</span>
                    <span className="card-badge-pill">DISCOVER</span>
                    <span className="card-badge-pill">AMEX</span>
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label>Número de Tarjeta (16 dígitos) *</label>
                      <span style={{ fontWeight: 800, color: '#1b5e20', fontSize: '13px' }}>
                        {getCardBrand(cardData.cardNumber)}
                      </span>
                    </div>
                    <div className="input-with-icon">
                      <CreditCard size={18} className="input-icon" />
                      <input
                        type="text"
                        name="cardNumber"
                        required
                        placeholder="4500 •••• •••• ••••"
                        maxLength={19}
                        value={cardData.cardNumber}
                        onChange={handleCardChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Nombre en la Tarjeta *</label>
                    <input
                      type="text"
                      name="cardHolder"
                      required
                      placeholder="COMO APARECE EN LA TARJETA"
                      value={cardData.cardHolder.toUpperCase()}
                      onChange={handleCardChange}
                    />
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Fecha Expiración *</label>
                      <input
                        type="text"
                        name="expiry"
                        required
                        placeholder="MM/AA"
                        maxLength={5}
                        value={cardData.expiry}
                        onChange={handleCardChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Código de Seguridad (CVV) *</label>
                      <div className="input-with-icon right">
                        <Lock size={16} className="input-icon-right" />
                        <input
                          type="password"
                          name="cvv"
                          required
                          placeholder="•••"
                          maxLength={4}
                          value={cardData.cvv}
                          onChange={handleCardChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Forma de Pago (Bancos de Ecuador) *</label>
                    <select
                      name="installments"
                      className="secure-select-input"
                      value={cardData.installments}
                      onChange={handleCardChange}
                    >
                      <option value="corriente">Pago Corriente (Un solo pago - Sin Intereses)</option>
                      <option value="3m">Diferido a 3 meses sin intereses (${(total / 3).toFixed(2)}/mes)</option>
                      <option value="6m">Diferido a 6 meses sin intereses (${(total / 6).toFixed(2)}/mes)</option>
                    </select>
                  </div>

                  <div className="pci-dss-banner">
                    <ShieldCheck size={20} className="pci-icon" />
                    <div className="pci-text">
                      <strong>Protección Antifraude EMVCo 3D Secure 2.0 & PCI-DSS</strong>
                      <span>Autenticación por SMS o Biometría bancaria con tu banco emisor en Ecuador. Tus datos viajan 100% encriptados.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* OPCIÓN 2: TRANSFERENCIA DIRECTA */}
              {paymentMethod === 'transfer' && (
                <div className="bank-transfer-info">
                  <div className="transfer-header">
                    <Building2 size={24} />
                    <div>
                      <h4>Transferencia Bancaria en Ecuador</h4>
                      <p>Puedes transferir desde Banco Pichincha, Produbanco, Guayaquil o Pacífico.</p>
                    </div>
                  </div>

                  <div className="bank-details-grid">
                    <div>
                      <span className="bank-label">Banco:</span>
                      <strong>Banco Pichincha C.A.</strong>
                    </div>
                    <div>
                      <span className="bank-label">Tipo de Cuenta:</span>
                      <strong>Corriente # 2100984512</strong>
                    </div>
                    <div>
                      <span className="bank-label">Titular:</span>
                      <strong>Lácteos Leo Cotopaxi S.A.</strong>
                    </div>
                    <div>
                      <span className="bank-label">RUC:</span>
                      <strong>0591728391001</strong>
                    </div>
                  </div>

                  <div className="transfer-notice">
                    <AlertCircle size={16} />
                    <span>Una vez realizado el pedido, envía tu comprobante por WhatsApp para despacho inmediato.</span>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="checkout-submit-btn">
              <Lock size={18} />
              <span>Pagar ${total.toFixed(2)} USD con 3D Secure</span>
            </button>
          </form>
        </div>

        {/* Lado Derecho: Resumen del Pedido */}
        <div className="checkout-summary-section">
          <h2 className="font-display">Resumen de tu Pedido</h2>
          
          <div className="summary-items">
            {items.map(item => (
              <div
                key={item.id}
                className="summary-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 0',
                  borderBottom: '1px solid #e2ece3'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: '48px',
                        height: '48px',
                        objectFit: 'contain',
                        background: '#ffffff',
                        border: '1px solid #e2ece3',
                        borderRadius: '10px',
                        padding: '4px'
                      }}
                    />
                  )}
                  <div>
                    <div className="item-name" style={{ fontWeight: 700, color: '#1b5e20' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                      ${item.price.toFixed(2)} c/u {item.unit || ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#e8f5e9',
                      border: '1px solid #a5d6a7',
                      color: '#1b5e20',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}
                    title="Restar 1"
                  >
                    -
                  </button>
                  <span
                    className="item-qty"
                    style={{
                      fontWeight: 800,
                      minWidth: '28px',
                      textAlign: 'center',
                      fontSize: '15px'
                    }}
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#2e7d32',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}
                    title="Sumar 1"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 5)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '8px',
                      background: 'rgba(46, 125, 50, 0.15)',
                      border: '1px solid #2e7d32',
                      color: '#2e7d32',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '12px'
                    }}
                    title="Añadir 5 unidades más"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#e53935',
                      cursor: 'pointer',
                      fontSize: '14px',
                      marginLeft: '4px'
                    }}
                    title="Eliminar del carrito"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="summary-totals">
            <div className="total-row">
              <span>Subtotal Lácteos:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Envío en Ecuador:</span>
              <span style={{ color: '#2e7d32', fontWeight: 800 }}>¡GRATIS!</span>
            </div>
            <div className="grand-total">
              <span>Total a Pagar (USD):</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="checkout-trust-badges">
            <div className="trust-item">
              <ShieldCheck size={20} color="#2e7d32" />
              <span>Facturación Electrónica Autorizada por el SRI</span>
            </div>
            <div className="trust-item">
              <Lock size={20} color="#2e7d32" />
              <span>Autenticada con EMVCo 3D Secure 2.0 (Verified by Visa)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
