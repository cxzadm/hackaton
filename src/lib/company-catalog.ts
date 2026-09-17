export interface CompanyCatalogItem {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  ciudad: string;
  provincia: string;
  actividad: string;
  estado: string;
  tipo: string;
}

export const COMPANY_CATALOG: CompanyCatalogItem[] = [
  {
    ruc: "0190412040001",
    razonSocial: "AUDITORES CONTABLES & CONSULTORES ENRIQUETA SARMIENTO ACCESCONT CIA. LTDA.",
    nombreComercial: "ACCESCONT AUDITORES",
    ciudad: "CUENCA",
    provincia: "AZUAY",
    actividad: "CONSULTORIA CONTABLE, AUDITORIA & ASESORIA TRIBUTARIA",
    estado: "ACTIVA",
    tipo: "RESPONSABILIDAD LIMITADA"
  },
  {
    ruc: "1790016919001",
    razonSocial: "IMPORTADORA Y DISTRIBUIDORA ANDINA C.A.",
    nombreComercial: "DISTRIBUIDORA ANDINA",
    ciudad: "QUITO",
    provincia: "PICHINCHA",
    actividad: "IMPORTACION Y DISTRIBUCION DE MAQUINARIA INDUSTRIAL Y TECNOLOGICA",
    estado: "ACTIVA",
    tipo: "SOCIEDAD ANONIMA"
  },
  {
    ruc: "1790004198001",
    razonSocial: "CORPORACION FAVORITA C.A.",
    nombreComercial: "SUPERMAXI / MEGAMAXI",
    ciudad: "QUITO",
    provincia: "PICHINCHA",
    actividad: "VENTA AL POR MAYOR Y MENOR EN SUPERMERCADOS",
    estado: "ACTIVA",
    tipo: "SOCIEDAD ANONIMA"
  },
  {
    ruc: "0990004196001",
    razonSocial: "CORPORACION EL ROSADO S.A.",
    nombreComercial: "MI COMISARIATO / FERRISARIATO",
    ciudad: "GUAYAQUIL",
    provincia: "GUAYAS",
    actividad: "COMERCIO AL POR MAYOR Y MENOR DE MERCADERIAS DIVERSAS",
    estado: "ACTIVA",
    tipo: "SOCIEDAD ANONIMA"
  },
  {
    ruc: "1790008703001",
    razonSocial: "LA FABRIL S.A.",
    nombreComercial: "LA FABRIL",
    ciudad: "MANTA",
    provincia: "MANABI",
    actividad: "ELABORACION DE ACEITES, GRASAS VEGETALES Y PRODUCTOS DE ASEO",
    estado: "ACTIVA",
    tipo: "SOCIEDAD ANONIMA"
  },
  {
    ruc: "1790016919002",
    razonSocial: "PROCESADORA NACIONAL DE ALIMENTOS C.A. PRONACA",
    nombreComercial: "PRONACA",
    ciudad: "QUITO",
    provincia: "PICHINCHA",
    actividad: "PROCESAMIENTO Y COMERCIALIZACION DE ALIMENTOS CANICOS Y AGRICOLAS",
    estado: "ACTIVA",
    tipo: "SOCIEDAD ANONIMA"
  },
  {
    ruc: "0990005737001",
    razonSocial: "CERVECERIA NACIONAL CN S.A.",
    nombreComercial: "CERVECERIA NACIONAL",
    ciudad: "GUAYAQUIL",
    provincia: "GUAYAS",
    actividad: "ELABORACION DE BEBIDAS MALTEADAS Y CERVEZAS",
    estado: "ACTIVA",
    tipo: "SOCIEDAD ANONIMA"
  },
  {
    ruc: "0190002130001",
    razonSocial: "CORPTEC SERVICIOS Y TECNOLOGIA CIA. LTDA.",
    nombreComercial: "CORPTEC ECUADOR",
    ciudad: "CUENCA",
    provincia: "AZUAY",
    actividad: "SERVICIOS TECNOLOGICOS, SOFTWARE Y TELECOMUNICACIONES",
    estado: "ACTIVA",
    tipo: "RESPONSABILIDAD LIMITADA"
  },
  {
    ruc: "1791845182001",
    razonSocial: "CONSTRUCTORA Y CONSULTORA DEL AZUAY C.A.",
    nombreComercial: "AZUAY CONSTRUCCIONES",
    ciudad: "CUENCA",
    provincia: "AZUAY",
    actividad: "CONSTRUCCION DE OBRAS CIVILES E INFRAESTRUCTURA",
    estado: "ACTIVA",
    tipo: "SOCIEDAD ANONIMA"
  },
  {
    ruc: "0190345678001",
    razonSocial: "SOLUCIONES TECNOLOGICAS INTEGRALES SOFTEC CIA. LTDA.",
    nombreComercial: "SOFTEC ECUADOR",
    ciudad: "CUENCA",
    provincia: "AZUAY",
    actividad: "DESARROLLO DE SOFTWARE Y DEPOSITOS DE DATOS",
    estado: "ACTIVA",
    tipo: "RESPONSABILIDAD LIMITADA"
  }
];

export function searchCompanies(query: string): CompanyCatalogItem[] {
  if (!query || query.trim().length === 0) {
    return COMPANY_CATALOG.slice(0, 5);
  }

  const cleanQuery = query.trim().toUpperCase();
  
  return COMPANY_CATALOG.filter(c => 
    c.ruc.includes(cleanQuery) ||
    c.razonSocial.toUpperCase().includes(cleanQuery) ||
    c.nombreComercial.toUpperCase().includes(cleanQuery) ||
    c.ciudad.toUpperCase().includes(cleanQuery) ||
    c.actividad.toUpperCase().includes(cleanQuery)
  );
}
