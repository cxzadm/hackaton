import { SriContribuyente } from './sri';
import { SuperCiasFinancials } from './supercias';

export interface ProformaItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  totalItem: number;
}

export interface CommercialProforma {
  numeroProforma: string;
  fechaEmision: string;
  fechaValidez: string;
  tierCliente: "MICRO / STARTER" | "PYME / PROFESIONAL" | "ENTERPRISE CORPORATIVO";
  planRecomendado: string;
  resumenPerfilFinanciero: {
    activosFormateados: string;
    ingresosFormateados: string;
    cumplimiento: string;
    score: number;
  };
  items: ProformaItem[];
  subtotal: number;
  porcentajeDescuento: number;
  montoDescuento: number;
  subtotalConDescuento: number;
  ivaMonto: number; // 15% IVA Ecuador
  totalFinal: number;
  condicionesPago: string;
  vigenciaDias: number;
}

export function calcularProformaComercial(
  sri: SriContribuyente,
  supercias: SuperCiasFinancials
): CommercialProforma {
  const activos = supercias.activosTotales;
  const ingresos = supercias.ingresosVentas;

  let tier: CommercialProforma["tierCliente"] = "PYME / PROFESIONAL";
  let planNombre = "Plan Automatización Avanzada PyME";
  let precioBase = 650.00;

  if (activos > 1000000 || ingresos > 1500000) {
    tier = "ENTERPRISE CORPORATIVO";
    planNombre = "Plan Hiperautomatización Enterprise AI";
    precioBase = 1450.00;
  } else if (activos < 150000 || ingresos < 200000) {
    tier = "MICRO / STARTER";
    planNombre = "Plan Inteligencia Comercial Starter";
    precioBase = 290.00;
  }

  // Regla de Descuento por Solvencia Financiera
  let pctDescuento = 0;
  if (supercias.cumplimientoObligaciones === "CUMPLIDO" && supercias.scoreFinanciero >= 90) {
    pctDescuento = 15; // 15% Descuento Cliente Premium VIP
  } else if (supercias.scoreFinanciero >= 80) {
    pctDescuento = 10;
  }

  const items: ProformaItem[] = [
    {
      id: "ITEM-01",
      descripcion: `Suscripción Anual ${planNombre} (Facturación e Integración SRI)`,
      cantidad: 1,
      precioUnitario: precioBase * 12,
      totalItem: precioBase * 12
    },
    {
      id: "ITEM-02",
      descripcion: "Módulo Inteligente de Auditoría & Conector SuperCías en Tiempo Real",
      cantidad: 1,
      precioUnitario: Math.round(precioBase * 2.5 * 100) / 100,
      totalItem: Math.round(precioBase * 2.5 * 100) / 100
    },
    {
      id: "ITEM-03",
      descripcion: "Implementación, Configuración de WebDAV Vault & Onboarding Personalizado",
      cantidad: 1,
      precioUnitario: Math.round(precioBase * 1.5 * 100) / 100,
      totalItem: Math.round(precioBase * 1.5 * 100) / 100
    },
    {
      id: "ITEM-04",
      descripcion: "Soporte Técnico Prioritario 24/7 y SLA Garantizado (99.9% Uptime)",
      cantidad: 1,
      precioUnitario: Math.round(precioBase * 0.8 * 100) / 100,
      totalItem: Math.round(precioBase * 0.8 * 100) / 100
    }
  ];

  const subtotal = items.reduce((acc, item) => acc + item.totalItem, 0);
  const montoDescuento = Math.round((subtotal * (pctDescuento / 100)) * 100) / 100;
  const subtotalConDescuento = Math.round((subtotal - montoDescuento) * 100) / 100;
  const ivaMonto = Math.round((subtotalConDescuento * 0.15) * 100) / 100;
  const totalFinal = Math.round((subtotalConDescuento + ivaMonto) * 100) / 100;

  const hoy = new Date();
  const validez = new Date(hoy);
  validez.setDate(validez.getDate() + 15);

  const formatUSD = (val: number) => 
    new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(val);

  return {
    numeroProforma: `PROF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    fechaEmision: hoy.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' }),
    fechaValidez: validez.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' }),
    tierCliente: tier,
    planRecomendado: planNombre,
    resumenPerfilFinanciero: {
      activosFormateados: formatUSD(supercias.activosTotales),
      ingresosFormateados: formatUSD(supercias.ingresosVentas),
      cumplimiento: supercias.cumplimientoObligaciones,
      score: supercias.scoreFinanciero
    },
    items,
    subtotal,
    porcentajeDescuento: pctDescuento,
    montoDescuento,
    subtotalConDescuento,
    ivaMonto,
    totalFinal,
    condicionesPago: "50% Anticipo al inicio de implementación, 50% a la entrega del servicio.",
    vigenciaDias: 15
  };
}
