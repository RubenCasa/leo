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
  items: CartItem[],
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

  // Header
  doc.setFontSize(20);
  doc.text('FACTURA', 150, 20);
  
  doc.setFontSize(12);
  doc.text(EMPRESA.razonSocial, 14, 20);
  doc.setFontSize(10);
  doc.text(`RUC: ${EMPRESA.ruc}`, 14, 26);
  doc.text(`Dir: ${EMPRESA.direccion}`, 14, 32);
  doc.text(`Tel: ${EMPRESA.telefono}`, 14, 38);

  // Doc Info
  doc.text(`No. ${numFactura}`, 150, 26);
  doc.text(`Ambiente: ${EMPRESA.ambiente === '1' ? 'Pruebas' : 'Producción'}`, 150, 32);
  doc.text('Emisión: Normal', 150, 38);
  
  // Clave de acceso (wrap si es necesario)
  doc.setFontSize(8);
  doc.text(`Clave de Acceso: ${claveAcceso}`, 14, 48);
  doc.setFontSize(10);

  // Customer Info
  const dateStr = new Date().toLocaleDateString('es-EC');
  doc.text(`Fecha Emisión: ${dateStr}`, 14, 58);
  doc.text(`Razón Social: ${customerInfo.name}`, 14, 64);
  doc.text(`RUC/CI: ${customerInfo.idNumber}`, 14, 70);
  doc.text(`Dirección: ${customerInfo.address}`, 14, 76);
  doc.text(`Email: ${customerInfo.email}`, 14, 82);

  // Table
  const tableData = items.map(item => [
    item.id,
    item.name,
    item.quantity.toString(),
    '$' + item.price.toFixed(2),
    '0%',
    '$' + (item.price * item.quantity).toFixed(2)
  ]);

  autoTable(doc, {
    startY: 90,
    head: [['Código', 'Descripción', 'Cant.', 'P. Unitario', 'IVA', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 50] }
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text(`Subtotal 0%: $${total.toFixed(2)}`, 140, finalY);
  doc.text(`Subtotal 15%: $0.00`, 140, finalY + 6);
  doc.text(`IVA 15%: $0.00`, 140, finalY + 12);
  doc.setFontSize(12);
  doc.text(`VALOR TOTAL: $${total.toFixed(2)}`, 140, finalY + 20);

  // Footer SRI
  doc.setFontSize(7);
  doc.text('Comprobante electrónico generado por LEO-CONNECT • Sistema autorizado SRI', 14, finalY + 35);

  return doc;
};
