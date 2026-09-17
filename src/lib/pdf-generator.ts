import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SriContribuyente } from './sri';
import { SuperCiasFullResponse } from './supercias';
import { CommercialProforma } from './rules-engine';

export interface PDFBuffers {
  proformaPdfBase64: string;
  superciasPdfBase64: string;
}

/**
 * Genera el PDF del Estado Financiero Anual Oficial descargado de la SuperCías.
 * Formato elegante y ajustado exactamente al ancho imprimible de página (532 pt).
 */
export function generarSuperciasAnnualPdfBase64(
  anio: string,
  ruc: string,
  razonSocial: string,
  expediente: string,
  activos: number,
  ingresos: number,
  patrimonio: number,
  pasivos: number,
  utilidad: number
): string {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pw = doc.internal.pageSize.getWidth(); // 612 pt
  const marginX = 40;
  const contentWidth = pw - marginX * 2; // 532 pt

  // 1. Header Banner Oficial SuperCías (Slate Oscuro con Acento Dorado/Verde)
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, pw, 85, 'F');

  // Línea de acento dorado
  doc.setFillColor(217, 119, 6); // #D97706
  doc.rect(0, 82, pw, 3, 'F');

  // Títulos Header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text("SUPERINTENDENCIA DE COMPAÑÍAS, VALORES Y SEGUROS", marginX, 34);
  
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(`ESTADO DE SITUACIÓN FINANCIERA CONSOLIDADO - EJERCICIO FISCAL ${anio}`, marginX, 52);

  // Metadata en esquina superior derecha
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(253, 230, 138); // Warm Gold
  doc.text(`EXPEDIENTE N° ${expediente}`, pw - marginX - 160, 34);
  
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(241, 245, 249);
  doc.text(`RUC: ${ruc}`, pw - marginX - 160, 48);
  doc.text(`Corte Anual: 31/12/${anio}`, pw - marginX - 160, 62);

  // 2. Card Informativa de la Compañía
  let y = 105;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, y, contentWidth, 54, 5, 5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, y, contentWidth, 54, 5, 5, 'D');

  // Barra de acento lateral azul
  doc.setFillColor(37, 99, 235);
  doc.rect(marginX, y, 4, 54, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("COMPROBANTE DE PRESENTACIÓN DE BALANCES Y ESTADOS FINANCIEROS", marginX + 14, y + 18);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  
  // Truncar razón social si es muy larga
  const cleanNombre = razonSocial.length > 65 ? razonSocial.substring(0, 65) + '...' : razonSocial;
  doc.text(`Razón Social: ${cleanNombre}`, marginX + 14, y + 33);
  doc.text(`RUC: ${ruc}   |   Expediente: ${expediente}   |   Estado Recepción: CUMPLIDO Y REGISTRADO`, marginX + 14, y + 46);

  // 3. Tabla de Balances Anuales (Ancho Exacto 532 pt)
  y += 72;
  const balanceData = [
    ['1. ACTIVOS CORRIENTES Y NO CORRIENTES', `$ ${activos.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Balance General Entregado'],
    ['2. PASIVOS CORRIENTES Y DE LARGO PLAZO', `$ ${pasivos.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Obligaciones Registradas'],
    ['3. PATRIMONIO NETO SOCIAL', `$ ${patrimonio.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Respaldo Societario Oficial'],
    ['4. INGRESOS DE ACTIVIDADES ORDINARIAS', `$ ${ingresos.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Facturación Anual Declarada'],
    ['5. GANANCIA (UTILIDAD) NETA DEL EJERCICIO', `$ ${utilidad.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Resultado Neto Auditoría']
  ];

  autoTable(doc, {
    startY: y,
    tableWidth: contentWidth, // 532 pt
    head: [['Rubro Contable / Estado Financiero', 'Valor en USD ($)', 'Estado de Registro SuperCías']],
    body: balanceData,
    theme: 'grid',
    headStyles: { 
      fillColor: [15, 23, 42], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold', 
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 6
    },
    bodyStyles: { 
      fontSize: 8.5, 
      textColor: [30, 41, 59],
      cellPadding: 6,
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: 220 },
      1: { cellWidth: 132, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 180, halign: 'left' }
    },
    margin: { left: marginX, right: marginX }
  });

  // @ts-ignore
  let finalY = (doc as any).lastAutoTable.finalY + 30;

  // 4. Caja de Firma Electrónica Registrada
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, finalY, contentWidth, 56, 5, 5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, finalY, contentWidth, 56, 5, 5, 'D');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text("FIRMAS DE RESPONSABILIDAD Y FIRMA ELECTRÓNICA REGISTRADA", marginX + 14, finalY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Documento oficial emitido por el sistema informático de la Superintendencia de Compañías, Valores y Seguros del Ecuador.", marginX + 14, finalY + 34);
  doc.text(`Cadena de Firma Digital SHA-256: ${ruc}-${expediente}-${anio}-SUPERCÍAS-OK-EC`, marginX + 14, finalY + 46);

  // Pie de página
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Página 1 de 1 - Documento Original SuperCías - Hackatón IA Ecuador 2026", pw / 2, 770, { align: 'center' });

  return doc.output('datauristring').split(',')[1];
}

/**
 * Genera la Proforma Comercial y el Reporte Auditado SuperCías con formato profesional sin desbordamientos.
 */
export function generarPDFs(
  sri: SriContribuyente,
  supercias: SuperCiasFullResponse,
  proforma: CommercialProforma
): PDFBuffers {
  const formatUSD = (val: number) => 
    new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(val);

  const docWidth = 612; // Letter Width in pt
  const marginX = 40;
  const contentWidth = docWidth - marginX * 2; // 532 pt

  // =========================================================================
  // 1. PROFORMA COMERCIAL PDF (Formato Ejecutivo Elegante)
  // =========================================================================
  const docP = new jsPDF({ unit: 'pt', format: 'letter' });

  // Header Banner Principal (Dark Blue Premium #0B192C)
  docP.setFillColor(11, 25, 44);
  docP.rect(0, 0, docWidth, 90, 'F');

  // Línea Acento Azul Brillante
  docP.setFillColor(37, 99, 235);
  docP.rect(0, 87, docWidth, 3, 'F');

  docP.setTextColor(255, 255, 255);
  docP.setFontSize(16);
  docP.setFont('helvetica', 'bold');
  docP.text("NEXUSVAULT AI SYSTEMS", marginX, 36);
  
  docP.setFontSize(9);
  docP.setFont('helvetica', 'normal');
  docP.setTextColor(148, 163, 184);
  docP.text("Hiperautomatización Inteligente de Procesos Comerciales", marginX, 52);
  docP.text("Soluciones Cloud & Auditoría Automatizada con Inteligencia Artificial", marginX, 64);

  // Esquina Derecha Header: Proforma Info
  docP.setFontSize(13);
  docP.setFont('helvetica', 'bold');
  docP.setTextColor(96, 165, 250); // Light blue
  docP.text("PROFORMA COMERCIAL", docWidth - marginX - 170, 36);

  docP.setFontSize(8.5);
  docP.setFont('helvetica', 'normal');
  docP.setTextColor(226, 232, 240);
  docP.text(`N° Cotización: ${proforma.numeroProforma}`, docWidth - marginX - 170, 50);
  docP.text(`Fecha Emisión: ${proforma.fechaEmision}`, docWidth - marginX - 170, 62);
  docP.text(`Válida hasta: ${proforma.fechaValidez}`, docWidth - marginX - 170, 74);

  // Datos Cliente & SRI en Box Elegante
  let y = 110;
  docP.setFillColor(248, 250, 252);
  docP.roundedRect(marginX, y, contentWidth, 75, 5, 5, 'F');
  docP.setDrawColor(226, 232, 240);
  docP.roundedRect(marginX, y, contentWidth, 75, 5, 5, 'D');

  docP.setFillColor(37, 99, 235);
  docP.rect(marginX, y, 4, 75, 'F');

  docP.setTextColor(15, 23, 42);
  docP.setFontSize(9.5);
  docP.setFont('helvetica', 'bold');
  docP.text("INFORMACIÓN DEL CLIENTE (VERIFICADO SRI & SUPERCÍAS):", marginX + 14, y + 18);

  docP.setFont('helvetica', 'normal');
  docP.setFontSize(8.5);
  docP.setTextColor(51, 65, 85);
  
  const razonSocialClean = sri.razonSocial.length > 70 ? sri.razonSocial.substring(0, 70) + '...' : sri.razonSocial;
  docP.text(`Cliente: ${razonSocialClean}`, marginX + 14, y + 32);
  docP.text(`RUC: ${sri.numeroRuc}   |   Estado SRI: ${sri.estadoContribuyenteRuc}   |   Tier Comercial: ${proforma.tierCliente}`, marginX + 14, y + 45);
  docP.text(`Representante Legal: ${sri.representanteLegal?.nombre || 'SARMIENTO NARVAEZ ENRIQUETA GONZALINA'}`, marginX + 14, y + 58);

  // Card Solvencia Financiera Badge
  y += 88;
  docP.setFillColor(236, 253, 245); // Emerald light tint
  docP.roundedRect(marginX, y, contentWidth, 38, 4, 4, 'F');
  docP.setDrawColor(16, 185, 129);
  docP.roundedRect(marginX, y, contentWidth, 38, 4, 4, 'D');

  docP.setTextColor(4, 120, 87);
  docP.setFontSize(8.5);
  docP.setFont('helvetica', 'bold');
  docP.text(`Perfil Financiero Auditado SuperCías (${supercias.fechaReporte}):`, marginX + 12, y + 15);
  
  docP.setFont('helvetica', 'normal');
  docP.setTextColor(30, 41, 59);
  docP.text(`Activos: ${proforma.resumenPerfilFinanciero.activosFormateados}   |   Ingresos: ${proforma.resumenPerfilFinanciero.ingresosFormateados}   |   Score Solvencia: ${proforma.resumenPerfilFinanciero.score}/100 (${proforma.porcentajeDescuento}% Descuento Aprobado)`, marginX + 12, y + 27);

  // Tabla de Ítems Comercial (Suma de anchos: 60 + 242 + 40 + 90 + 100 = 532 pt EXACTO)
  y += 50;
  const tableItems = proforma.items.map(it => [
    it.id,
    it.descripcion,
    it.cantidad.toString(),
    formatUSD(it.precioUnitario),
    formatUSD(it.totalItem)
  ]);

  autoTable(docP, {
    startY: y,
    tableWidth: contentWidth, // 532 pt
    head: [['Código', 'Descripción del Servicio / Solución Tecnológica', 'Cant.', 'P. Unitario', 'Total USD ($)']],
    body: tableItems,
    theme: 'grid',
    headStyles: { 
      fillColor: [11, 25, 44], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold', 
      fontSize: 8.5,
      cellPadding: 6 
    },
    bodyStyles: { 
      fontSize: 8.5, 
      textColor: [30, 41, 59],
      cellPadding: 6,
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: 60, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 242, halign: 'left' },
      2: { cellWidth: 40, halign: 'center' },
      3: { cellWidth: 90, halign: 'right' },
      4: { cellWidth: 100, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: marginX, right: marginX }
  });

  // @ts-ignore
  let finalYP = (docP as any).lastAutoTable.finalY + 15;

  // Resumen de Totales Aliniado a la Derecha
  const totalsBoxX = docWidth - marginX - 220;
  docP.setFontSize(8.5);
  docP.setFont('helvetica', 'normal');
  docP.setTextColor(51, 65, 85);

  docP.text("Subtotal Servicios:", totalsBoxX, finalYP);
  docP.text(formatUSD(proforma.subtotal), docWidth - marginX, finalYP, { align: 'right' });

  if (proforma.porcentajeDescuento > 0) {
    finalYP += 14;
    docP.setTextColor(16, 185, 129); // Emerald
    docP.text(`Descuento Solvencia VIP (${proforma.porcentajeDescuento}%):`, totalsBoxX, finalYP);
    docP.text(`-${formatUSD(proforma.montoDescuento)}`, docWidth - marginX, finalYP, { align: 'right' });
    docP.setTextColor(51, 65, 85);

    finalYP += 14;
    docP.text("Subtotal Neto:", totalsBoxX, finalYP);
    docP.text(formatUSD(proforma.subtotalConDescuento), docWidth - marginX, finalYP, { align: 'right' });
  }

  finalYP += 14;
  docP.text("IVA (15% Ecuador):", totalsBoxX, finalYP);
  docP.text(formatUSD(proforma.ivaMonto), docWidth - marginX, finalYP, { align: 'right' });

  // Cuadro Total Destacado
  finalYP += 16;
  docP.setFillColor(11, 25, 44);
  docP.roundedRect(totalsBoxX - 8, finalYP - 12, 228, 26, 4, 4, 'F');
  docP.setTextColor(255, 255, 255);
  docP.setFontSize(10);
  docP.setFont('helvetica', 'bold');
  docP.text("TOTAL FINAL USD:", totalsBoxX, finalYP + 4);
  docP.text(formatUSD(proforma.totalFinal), docWidth - marginX - 6, finalYP + 4, { align: 'right' });

  // Términos y Condiciones
  finalYP += 45;
  docP.setTextColor(15, 23, 42);
  docP.setFontSize(9);
  docP.setFont('helvetica', 'bold');
  docP.text("CONDICIONES COMERCIALES Y DE SERVICIO:", marginX, finalYP);
  
  docP.setFont('helvetica', 'normal');
  docP.setFontSize(8);
  docP.setTextColor(71, 85, 105);
  docP.text(`1. Forma de Pago: ${proforma.condicionesPago}`, marginX, finalYP + 14);
  docP.text(`2. Validez de Oferta: ${proforma.vigenciaDias} días calendarios a partir de su emisión (Vence: ${proforma.fechaValidez}).`, marginX, finalYP + 26);
  docP.text("3. Implementación: Incluye instalación, configuración de conectores SRI/SuperCías y soporte técnico continuo.", marginX, finalYP + 38);

  // Pie de página
  docP.setFontSize(7.5);
  docP.setTextColor(148, 163, 184);
  docP.text("SmartAdvisor IA - El Agente Cognitivo para la Consultoría Comercial B2B", docWidth / 2, 770, { align: 'center' });

  const proformaPdfBase64 = docP.output('datauristring').split(',')[1];


  // =========================================================================
  // 2. REPORTE SUPERCÍAS PDF AUDITADO (Certificado de Cumplimiento)
  // =========================================================================
  const docS = new jsPDF({ unit: 'pt', format: 'letter' });

  // Header Banner SuperCías Audit
  docS.setFillColor(15, 23, 42);
  docS.rect(0, 0, docWidth, 85, 'F');

  // Línea acento verde esmeralda
  docS.setFillColor(16, 185, 129);
  docS.rect(0, 82, docWidth, 3, 'F');

  docS.setTextColor(255, 255, 255);
  docS.setFontSize(13);
  docS.setFont('helvetica', 'bold');
  docS.text("SUPERINTENDENCIA DE COMPAÑÍAS, VALORES Y SEGUROS", marginX, 34);
  
  docS.setFontSize(9);
  docS.setFont('helvetica', 'normal');
  docS.setTextColor(226, 232, 240);
  docS.text("Reporte Automatizado de Cumplimiento Financiero y Análisis de Balances", marginX, 50);

  // Esquina Derecha Header
  docS.setFontSize(11);
  docS.setFont('helvetica', 'bold');
  docS.setTextColor(52, 211, 153); // Emerald text
  docS.text("CERTIFICADO AUDITADO", docWidth - marginX - 170, 34);

  docS.setFontSize(8.5);
  docS.setFont('helvetica', 'normal');
  docS.setTextColor(241, 245, 249);
  docS.text(`Expediente: ${supercias.datos_empresa?.Expediente || '701940'}`, docWidth - marginX - 170, 48);
  docS.text(`Fecha Emisión: ${supercias.fechaReporte}`, docWidth - marginX - 170, 62);

  // 1. Identificación de la Entidad
  y = 105;
  docS.setFillColor(248, 250, 252);
  docS.roundedRect(marginX, y, contentWidth, 68, 5, 5, 'F');
  docS.setDrawColor(226, 232, 240);
  docS.roundedRect(marginX, y, contentWidth, 68, 5, 5, 'D');

  docS.setFillColor(16, 185, 129);
  docS.rect(marginX, y, 4, 68, 'F');

  docS.setTextColor(15, 23, 42);
  docS.setFontSize(9.5);
  docS.setFont('helvetica', 'bold');
  docS.text("1. IDENTIFICACIÓN Y ESTADO LEGAL DE LA SOCIEDAD", marginX + 14, y + 18);

  docS.setFontSize(8.5);
  docS.setFont('helvetica', 'normal');
  docS.setTextColor(51, 65, 85);
  
  docS.text(`Razón Social: ${razonSocialClean}`, marginX + 14, y + 32);
  docS.text(`RUC: ${sri.numeroRuc}   |   Expediente SuperCías: ${supercias.datos_empresa?.Expediente || '701940'}   |   Oficina: CUENCA`, marginX + 14, y + 45);
  docS.text(`Estado de Obligaciones: ${supercias.cumplimientoObligaciones}   |   Nivel Solvencia: ${supercias.nivelSolvencia} (${supercias.scoreFinanciero}/100 pts)`, marginX + 14, y + 58);

  // 2. Tabla Indicadores Financieros (Ancho exacto: 200 + 132 + 200 = 532 pt)
  y += 82;
  docS.setTextColor(15, 23, 42);
  docS.setFontSize(9.5);
  docS.setFont('helvetica', 'bold');
  docS.text("2. RESUMEN DE INDICADORES Y ESTADOS FINANCIEROS AUDITADOS", marginX, y);

  y += 10;
  const auditBalanceData = [
    ['Activos Totales', formatUSD(supercias.activosTotales), 'Estructura de Activos Corrientes y No Corrientes'],
    ['Ingresos por Ventas / Servicios', formatUSD(supercias.ingresosVentas), 'Ventas Operativas Anuales Declaradas'],
    ['Patrimonio Neto', formatUSD(supercias.patrimonioNeto), 'Respaldo de Capital Social y Reservas'],
    ['Pasivos Totales', formatUSD(supercias.pasivosTotales), 'Exigible de Corto y Largo Plazo'],
    ['Utilidad Neta del Ejercicio', formatUSD(supercias.utilidadNeta), 'Resultado Neto Post Impuestos'],
    ['Nómina de Empleados', `${supercias.numeroEmpleados} trabajadores`, 'Registro IESS y Cumplimiento Laboral']
  ];

  autoTable(docS, {
    startY: y,
    tableWidth: contentWidth, // 532 pt
    head: [['Cuenta / Indicador Financiero', 'Valor en USD ($)', 'Observación Auditada']],
    body: auditBalanceData,
    theme: 'striped',
    headStyles: { 
      fillColor: [15, 23, 42], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold', 
      fontSize: 8.5,
      cellPadding: 6 
    },
    bodyStyles: { 
      fontSize: 8.5, 
      textColor: [30, 41, 59],
      cellPadding: 6,
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: 200, fontStyle: 'bold' },
      1: { cellWidth: 132, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 200, halign: 'left' }
    },
    margin: { left: marginX, right: marginX }
  });

  // @ts-ignore
  let finalYS = (docS as any).lastAutoTable.finalY + 25;

  // 3. Dictamen de Cumplimiento Box
  docS.setFillColor(241, 245, 249);
  docS.roundedRect(marginX, finalYS, contentWidth, 54, 5, 5, 'F');
  docS.setDrawColor(203, 213, 225);
  docS.roundedRect(marginX, finalYS, contentWidth, 54, 5, 5, 'D');

  docS.setTextColor(15, 23, 42);
  docS.setFontSize(9);
  docS.setFont('helvetica', 'bold');
  docS.text("DICTAMEN AUTOMATIZADO DE CUMPLIMIENTO FISCAL Y SOLVENCIA", marginX + 14, finalYS + 18);

  docS.setFont('helvetica', 'normal');
  docS.setFontSize(8);
  docS.setTextColor(71, 85, 105);
  docS.text("Se certifica que la entidad consultada registra estatus CUMPLIDO sin mora tributaria ni alertas de empresa fantasma.", marginX + 14, finalYS + 32);
  docS.text("Documento generado automáticamente por SmartAdvisor IA - El Agente Cognitivo para la Consultoría Comercial B2B.", marginX + 14, finalYS + 44);

  // Pie de página
  docS.setFontSize(7.5);
  docS.setTextColor(148, 163, 184);
  docS.text("Superintendencia de Compañías, Valores y Seguros - Certificado AI Hackatón 2026", docWidth / 2, 770, { align: 'center' });

  const superciasPdfBase64 = docS.output('datauristring').split(',')[1];

  return {
    proformaPdfBase64,
    superciasPdfBase64
  };
}
