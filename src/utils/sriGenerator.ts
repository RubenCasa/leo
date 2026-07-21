import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CartItem } from '../context/CartContext';
import { generarClaveAccesoSRI, obtenerSiguienteSecuencial } from './sriAccessKey';
import { escapeXML } from './security';

interface CustomerInfo {
  name: string;
  idNumber: string; // RUC/Cédula
  address: string;
  email: string;
}

// RUC oficial de Lácteos Leo (configuración de la empresa)
const EMPRESA = {
  ruc: '0591728391001',
  razonSocial: 'LÁCTEOS LEO S.A.',
  nombreComercial: 'Lácteos Leo',
  direccion: 'Latacunga, Cotopaxi',
  telefono: '0999999999',
  ambiente: '1' as const, // 1 = Pruebas
  establecimiento: '001',
  puntoEmision: '001'
};

export const generarClaveYSecuencialUnicos = () => {
  const date = new Date();
  const secuencial = obtenerSiguienteSecuencial();
  const claveAcceso = generarClaveAccesoSRI({
    fechaEmision: date,
    tipoComprobante: '01',
    rucEmisor: EMPRESA.ruc,
    ambiente: EMPRESA.ambiente,
    establecimiento: EMPRESA.establecimiento,
    puntoEmision: EMPRESA.puntoEmision,
    secuencial: secuencial
  });
  return { claveAcceso, secuencial, date };
};

export const generateSRIXML = (
  customerInfo: CustomerInfo,
  items: CartItem[],
  total: number,
  claveAccesoParam?: string,
  secuencialParam?: string
) => {
  const date = new Date();
  const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  
  // Obtener secuencial autoincremental si no se pasó por parámetro
  const secuencial = secuencialParam || obtenerSiguienteSecuencial();

  // Generar Clave de Acceso real de 49 dígitos usando Módulo 11 del SRI si no se pasó por parámetro
  const claveAcceso = claveAccesoParam || generarClaveAccesoSRI({
    fechaEmision: date,
    tipoComprobante: '01', // Factura
    rucEmisor: EMPRESA.ruc,
    ambiente: EMPRESA.ambiente,
    establecimiento: EMPRESA.establecimiento,
    puntoEmision: EMPRESA.puntoEmision,
    secuencial: secuencial
  });

  // Determinar tipo de identificación del comprador
  const idClean = customerInfo.idNumber.replace(/\D/g, '');
  let tipoIdentificacion = '05'; // Cédula por defecto
  if (idClean.length === 13) tipoIdentificacion = '04'; // RUC
  if (idClean === '9999999999999') tipoIdentificacion = '07'; // Consumidor Final
  
  let detallesXML = '';
  items.forEach(item => {
    detallesXML += `
      <detalle>
        <codigoPrincipal>${escapeXML(String(item.id))}</codigoPrincipal>
        <descripcion>${escapeXML(item.name)}</descripcion>
        <cantidad>${item.quantity}</cantidad>
        <precioUnitario>${item.price.toFixed(2)}</precioUnitario>
        <descuento>0.00</descuento>
        <precioTotalSinImpuesto>${(item.price * item.quantity).toFixed(2)}</precioTotalSinImpuesto>
        <impuestos>
          <impuesto>
            <codigo>2</codigo>
            <codigoPorcentaje>0</codigoPorcentaje>
            <tarifa>0</tarifa>
            <baseImponible>${(item.price * item.quantity).toFixed(2)}</baseImponible>
            <valor>0.00</valor>
          </impuesto>
        </impuestos>
      </detalle>
    `;
  });

  const xmlStr = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${EMPRESA.ambiente}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${escapeXML(EMPRESA.razonSocial)}</razonSocial>
    <nombreComercial>${escapeXML(EMPRESA.nombreComercial)}</nombreComercial>
    <ruc>${EMPRESA.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>01</codDoc>
    <estab>${EMPRESA.establecimiento}</estab>
    <ptoEmi>${EMPRESA.puntoEmision}</ptoEmi>
    <secuencial>${secuencial}</secuencial>
    <dirMatriz>${escapeXML(EMPRESA.direccion)}</dirMatriz>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${dateStr}</fechaEmision>
    <dirEstablecimiento>${escapeXML(EMPRESA.direccion)}</dirEstablecimiento>
    <obligadoContabilidad>SI</obligadoContabilidad>
    <tipoIdentificacionComprador>${tipoIdentificacion}</tipoIdentificacionComprador>
    <razonSocialComprador>${escapeXML(customerInfo.name)}</razonSocialComprador>
    <identificacionComprador>${escapeXML(customerInfo.idNumber)}</identificacionComprador>
    <direccionComprador>${escapeXML(customerInfo.address)}</direccionComprador>
    <totalSinImpuestos>${total.toFixed(2)}</totalSinImpuestos>
    <totalDescuento>0.00</totalDescuento>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>0</codigoPorcentaje>
        <baseImponible>${total.toFixed(2)}</baseImponible>
        <valor>0.00</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <propina>0.00</propina>
    <importeTotal>${total.toFixed(2)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
      <pago>
        <formaPago>01</formaPago>
        <total>${total.toFixed(2)}</total>
        <plazo>0</plazo>
        <unidadTiempo>dias</unidadTiempo>
      </pago>
    </pagos>
  </infoFactura>
  <detalles>
    ${detallesXML}
  </detalles>
  <infoAdicional>
    <campoAdicional nombre="Email">${escapeXML(customerInfo.email)}</campoAdicional>
  </infoAdicional>
</factura>`;

  return xmlStr;
};

export const generateRIDE = (
  customerInfo: CustomerInfo,
  items: Array<{ id?: string | number; name: string; quantity: number; price: number; desc?: string; category?: string }>,
  total: number,
  claveAccesoParam?: string,
  secuencialParam?: string
) => {
  const doc = new jsPDF();
  
  // Obtener el secuencial actual (o usar el pasado por parámetro)
  const secActual = secuencialParam || (localStorage.getItem('lacteos_leo_sri_secuencial') || '1');
  const secuencial = secActual.padStart(9, '0');
  const numFactura = `${EMPRESA.establecimiento}-${EMPRESA.puntoEmision}-${secuencial}`;

  // Generar clave de acceso para mostrar en el RIDE
  const claveAcceso = claveAccesoParam || generarClaveAccesoSRI({
    fechaEmision: new Date(),
    tipoComprobante: '01',
    rucEmisor: EMPRESA.ruc,
    ambiente: EMPRESA.ambiente,
    establecimiento: EMPRESA.establecimiento,
    puntoEmision: EMPRESA.puntoEmision,
    secuencial: secActual
  });

  // ============================================================================
  // CAJA IZQUIERDA: DATOS EMISOR (LÁCTEOS LEO) - FONDO BLANCO PURO
  // ============================================================================
  doc.setDrawColor(203, 213, 225); // Borde gris claro elegante
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 15, 88, 55, 3, 3, 'S'); // 'S' = Solo contorno, fondo 100% blanco y claro

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(22, 163, 74); // Verde Lácteos Leo (#16a34a)
  doc.text(EMPRESA.razonSocial, 18, 26);

  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0); // Texto negro puro para máxima legibilidad y contraste
  doc.text(`Nombre Comercial: ${EMPRESA.nombreComercial}`, 18, 33);
  doc.setFont('helvetica', 'normal');
  doc.text(`RUC: ${EMPRESA.ruc}`, 18, 39);
  doc.text(`Dir. Matriz: ${EMPRESA.direccion}`, 18, 45);
  doc.text(`Teléfono: ${EMPRESA.telefono}`, 18, 51);
  doc.setFont('helvetica', 'bold');
  doc.text('OBLIGADO A LLEVAR CONTABILIDAD: SÍ', 18, 59);

  // ============================================================================
  // CAJA DERECHA: DATOS SRI & CLAVE DE ACCESO - FONDO BLANCO PURO
  // ============================================================================
  doc.roundedRect(106, 15, 90, 55, 3, 3, 'S'); // 'S' = Solo contorno

  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text('FACTURA ELECTRÓNICA', 110, 25);
  doc.setFontSize(11);
  doc.setTextColor(22, 163, 74);
  doc.text(`No. ${numFactura}`, 110, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('NÚMERO DE AUTORIZACIÓN SRI:', 110, 38);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(claveAcceso, 110, 43, { maxWidth: 82 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`FECHA AUTORIZACIÓN: ${new Date().toLocaleString('es-EC')}`, 110, 52);
  doc.text(`AMBIENTE: ${EMPRESA.ambiente === '1' ? 'PRUEBAS' : 'PRODUCCIÓN'}`, 110, 57);
  doc.text('EMISIÓN: NORMAL', 110, 62);
  doc.text('CLAVE DE ACCESO:', 110, 67);

  // ============================================================================
  // CAJA CLIENTE (INFO FACTURA) - FONDO BLANCO PURO
  // ============================================================================
  doc.roundedRect(14, 73, 182, 30, 3, 3, 'S'); // 'S' = Solo contorno, fondo blanco

  const dateStr = new Date().toLocaleDateString('es-EC');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Razón Social / Nombres:', 18, 81);
  doc.setFont('helvetica', 'normal');
  doc.text(customerInfo.name || 'Consumidor Final', 60, 81);

  doc.setFont('helvetica', 'bold');
  doc.text('Identificación / RUC / CI:', 18, 87);
  doc.setFont('helvetica', 'normal');
  doc.text(customerInfo.idNumber || '9999999999999', 60, 87);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de Emisión:', 130, 81);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, 165, 81);

  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', 18, 93);
  doc.setFont('helvetica', 'normal');
  doc.text(customerInfo.address || 'Ecuador', 60, 93, { maxWidth: 65 });

  doc.setFont('helvetica', 'bold');
  doc.text('Email Comprador:', 130, 87);
  doc.setFont('helvetica', 'normal');
  doc.text(customerInfo.email || 'cliente@lacteosleo.com', 165, 87, { maxWidth: 30 });

  // ============================================================================
  // TABLA DE PRODUCTOS Y DETALLE (AUTOTABLE) - FONDO CLARO CON CONTRASTE
  // ============================================================================
  const tableData = (items || []).map(item => [
    String(item.id || 'LEO-PRD'),
    item.name || 'Producto Lácteo',
    String(item.quantity || 1),
    '$' + Number(item.price || 0).toFixed(2),
    '$0.00',
    '$' + (Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)
  ]);

  autoTable(doc, {
    startY: 107,
    head: [['Código', 'Descripción del Producto', 'Cantidad', 'P. Unitario', 'Descuento', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5 },
    bodyStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 8.5 },
    alternateRowStyles: { fillColor: [255, 255, 255] }, // Fondo blanco 100% en todas las filas para máxima claridad
    styles: { fontSize: 8.5, textColor: [0, 0, 0], cellPadding: 3.5, lineColor: [203, 213, 225], lineWidth: 0.3 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 67 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 23, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' }
    }
  });

  // ============================================================================
  // TOTALES FISCALES Y FORMA DE PAGO - FONDO BLANCO PURO
  // ============================================================================
  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Caja izquierda: Información Adicional y Pagos (Solo contorno 'S')
  doc.roundedRect(14, finalY, 100, 48, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 163, 74);
  doc.text('INFORMACIÓN ADICIONAL & FORMA DE PAGO', 18, finalY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(`Correo electrónico: ${customerInfo.email || 'cliente@lacteosleo.com'}`, 18, finalY + 16);
  doc.text('Forma de Pago:', 18, finalY + 24);
  doc.setFont('helvetica', 'bold');
  doc.text('01 - SIN UTILIZACIÓN DEL SISTEMA FINANCIERO / TARJETA', 18, finalY + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(`Valor Pagado: $${total.toFixed(2)} | Plazo: 0 días`, 18, finalY + 38);

  // Caja derecha: Totales (Solo contorno 'S')
  doc.roundedRect(118, finalY, 78, 48, 2, 2, 'S');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  doc.text('SUBTOTAL 0%:', 123, finalY + 8);
  doc.text(`$${total.toFixed(2)}`, 188, finalY + 8, { align: 'right' });

  doc.text('SUBTOTAL 15%:', 123, finalY + 15);
  doc.text('$0.00', 188, finalY + 15, { align: 'right' });

  doc.text('DESCUENTO:', 123, finalY + 22);
  doc.text('$0.00', 188, finalY + 22, { align: 'right' });

  doc.text('IVA 15%:', 123, finalY + 29);
  doc.text('$0.00', 188, finalY + 29, { align: 'right' });

  // Línea divisoria
  doc.setDrawColor(203, 213, 225);
  doc.line(123, finalY + 33, 188, finalY + 33);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(22, 163, 74);
  doc.text('VALOR TOTAL:', 123, finalY + 41);
  doc.text(`$${total.toFixed(2)}`, 188, finalY + 41, { align: 'right' });

  // Footer Oficial SRI
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Comprobante electrónico RIDE generado por el sistema LEO-CONNECT S.A. • Validez tributaria verificable en www.sri.gob.ec con la Clave de Acceso.',
    105,
    Math.min(285, finalY + 62),
    { align: 'center' }
  );

  return doc;
};
