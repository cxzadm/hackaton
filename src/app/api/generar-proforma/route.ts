import { NextRequest, NextResponse } from 'next/server';
import { consultarSRI } from '@/lib/sri';
import { consultarSuperCias } from '@/lib/supercias';
import { calcularProformaComercial } from '@/lib/rules-engine';
import { generarPDFs } from '@/lib/pdf-generator';
import { enviarCorreoProforma } from '@/lib/email-service';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const query = body.ruc || body.parametro || body.query ? String(body.ruc || body.parametro || body.query).trim() : '';

    if (!query || query.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Ingrese un RUC válido de 13 dígitos o la Razón Social / Nombre de la empresa.' },
        { status: 400 }
      );
    }

    // Paso 1: Consulta API SRI (Soporta RUC o Razón Social)
    const step1Start = Date.now();
    const sriData = await consultarSRI(query);
    const step1Duration = Date.now() - step1Start;

    // Paso 2: Consulta API SuperCías (Estructura Completa por RUC o Razón Social)
    const step2Start = Date.now();
    const superciasData = await consultarSuperCias(sriData.numeroRuc || query, sriData.razonSocial);
    const step2Duration = Date.now() - step2Start;

    // Paso 3: Motor de Reglas en Next.js
    const step3Start = Date.now();
    const proformaData = calcularProformaComercial(sriData, superciasData);
    const step3Duration = Date.now() - step3Start;

    // Paso 4: Generación de PDFs
    const step4Start = Date.now();
    const pdfs = generarPDFs(sriData, superciasData, proformaData);
    const step4Duration = Date.now() - step4Start;

    const enviarEmail = body.enviarEmail !== undefined ? Boolean(body.enviarEmail) : true;
    const correoManual = body.correoManual && typeof body.correoManual === 'string' && body.correoManual.includes('@')
      ? body.correoManual.trim()
      : null;

    const correosSeleccionados = Array.isArray(body.correosSeleccionados) && body.correosSeleccionados.length > 0 
      ? body.correosSeleccionados.filter((e: any) => typeof e === 'string' && e.includes('@'))
      : null;

    // Extraer automáticamente los correos oficiales de la empresa desde la SuperCías ("Correo 1", "Correo 2")
    const correosEncontrados: string[] = [];
    if (superciasData?.datos_empresa) {
      const c1 = superciasData.datos_empresa["Correo 1"];
      const c2 = superciasData.datos_empresa["Correo 2"];
      if (c1 && typeof c1 === 'string' && c1.includes('@')) correosEncontrados.push(c1.trim());
      if (c2 && typeof c2 === 'string' && c2.includes('@') && !correosEncontrados.includes(c2.trim())) correosEncontrados.push(c2.trim());
    }

    // Agregar el correo manual ingresado por el usuario
    if (correoManual && !correosEncontrados.includes(correoManual)) {
      correosEncontrados.push(correoManual);
    }

    const destinatarioEmail = correosSeleccionados && correosSeleccionados.length > 0
      ? (correoManual && !correosSeleccionados.includes(correoManual) 
          ? [...correosSeleccionados, correoManual].join(', ') 
          : correosSeleccionados.join(', '))
      : (correosEncontrados.length > 0 ? correosEncontrados.join(', ') : 'accescontauditoria@gmail.com, enrisarmiento69@hotmail.com');

    // Paso 5: Servicio de Email (Si está activado por el usuario)
    const step5Start = Date.now();
    let mailResult;
    if (enviarEmail) {
      mailResult = await enviarCorreoProforma({
        destinatarioEmail,
        nombreEmpresa: sriData.razonSocial,
        activosFormateados: proformaData.resumenPerfilFinanciero.activosFormateados,
        ingresosFormateados: proformaData.resumenPerfilFinanciero.ingresosFormateados,
        proformaPdfBase64: pdfs.proformaPdfBase64,
        superciasPdfBase64: pdfs.superciasPdfBase64,
        superciasOriginalPdfs: superciasData.pdfs
      });
    } else {
      mailResult = {
        exito: true,
        mensaje: "Envío de correo omitido a petición del usuario. Proforma y consulta disponibles en pantalla.",
        metodoEnvio: "OMITIDO_POR_USUARIO",
        asunto: `Proforma Comercial Personalizada - ${sriData.razonSocial}`,
        cuerpoTexto: `Consulta realizada sin despacho automático de correo.`,
        totalAdjuntos: 0
      };
    }
    const step5Duration = Date.now() - step5Start;

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      executionTimeMs: totalDuration,
      executionTimeSec: (totalDuration / 1000).toFixed(2),
      timings: {
        sriMs: step1Duration,
        superciasMs: step2Duration,
        rulesEngineMs: step3Duration,
        pdfGenMs: step4Duration,
        emailMs: step5Duration
      },
      data: {
        sri: sriData,
        supercias: superciasData,
        proforma: proformaData,
        mail: mailResult,
        pdfs: {
          proformaFileName: `proforma_comercial_${sriData.numeroRuc}.pdf`,
          superciasFileName: `reporte_supercias_${sriData.numeroRuc}.pdf`,
          proformaPdfBase64: pdfs.proformaPdfBase64,
          superciasPdfBase64: pdfs.superciasPdfBase64,
          superciasPdfs: superciasData.pdfs || []
        }
      }
    });

  } catch (err: any) {
    console.error("[API Error] Generar Proforma:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Error interno al procesar la solicitud de proforma.'
      },
      { status: 500 }
    );
  }
}
