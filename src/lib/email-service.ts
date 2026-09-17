import nodemailer from 'nodemailer';
import { SuperCiasPdf } from './supercias';

export interface EmailDispatchOptions {
  destinatarioEmail: string;
  nombreEmpresa: string;
  activosFormateados: string;
  ingresosFormateados: string;
  proformaPdfBase64: string;
  superciasPdfBase64: string;
  superciasOriginalPdfs?: SuperCiasPdf[];
}

export interface EmailDispatchResult {
  exito: boolean;
  mensaje: string;
  metodoEnvio: "GMAIL_SMTP" | "NEXUS_VAULT_API" | "SIMULADO_DEMO";
  asunto: string;
  cuerpoTexto: string;
  totalAdjuntos: number;
}

export async function enviarCorreoProforma(options: EmailDispatchOptions): Promise<EmailDispatchResult> {
  const {
    destinatarioEmail,
    nombreEmpresa,
    activosFormateados,
    ingresosFormateados,
    proformaPdfBase64,
    superciasPdfBase64,
    superciasOriginalPdfs = []
  } = options;

  const asunto = `Proforma Comercial Personalizada - ${nombreEmpresa}`;

  const cuerpoTexto = `Estimado equipo de ${nombreEmpresa},

En base a su perfil financiero actual registrado en la Superintendencia de Compañías (Activos: ${activosFormateados} / Ingresos: ${ingresosFormateados}), nuestro Agente Cognitivo ha generado una propuesta de servicios a su medida.

Adjunto a este correo encontrará nuestra Proforma Comercial detallada, el Reporte de Cumplimiento Financiero emitido por la SuperCías y sus Estados Financieros Anuales auditados.

Saludos cordiales,
SmartAdvisor IA - El Agente Cognitivo para la Consultoría Comercial B2B`;

  // Construir lista de adjuntos con buffer binario para Nodemailer / API
  const attachmentsList: any[] = [
    { filename: 'proforma_comercial.pdf', content: proformaPdfBase64, encoding: 'base64' },
    { filename: 'reporte_supercias.pdf', content: superciasPdfBase64, encoding: 'base64' }
  ];

  if (Array.isArray(superciasOriginalPdfs) && superciasOriginalPdfs.length > 0) {
    superciasOriginalPdfs.forEach(pdf => {
      if (pdf.name && pdf.content) {
        attachmentsList.push({
          filename: pdf.name,
          content: pdf.content,
          encoding: 'base64'
        });
      }
    });
  }

  // 1. MÉTODO PRINCIPAL: Envío Real vía Gmail SMTP (cx.practica@gmail.com)
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'cx.practica@gmail.com',
        pass: 'vhlqfcxhziuwgasu' // Contraseña de aplicación otorgada por el usuario
      }
    });

    const info = await transporter.sendMail({
      from: '"Generador Inteligente de Proformas" <cx.practica@gmail.com>',
      to: destinatarioEmail,
      subject: asunto,
      text: cuerpoTexto,
      attachments: attachmentsList.map(a => ({
        filename: a.filename,
        content: Buffer.from(a.content, 'base64')
      }))
    });

    console.log(`[Mail Gmail SMTP] Correo enviado exitosamente a ${destinatarioEmail}. ID: ${info.messageId}`);

    return {
      exito: true,
      mensaje: `Correo enviado exitosamente a ${destinatarioEmail} con ${attachmentsList.length} adjuntos vía Gmail SMTP (cx.practica@gmail.com).`,
      metodoEnvio: "GMAIL_SMTP",
      asunto,
      cuerpoTexto,
      totalAdjuntos: attachmentsList.length
    };
  } catch (gmailErr: any) {
    console.warn("[Mail] Fallo el envío por Gmail SMTP, intentando API de respaldo:", gmailErr?.message || gmailErr);
  }

  // 2. FALLBACK 1: API BaaS de Respaldo
  try {
    const resMail = await fetch('https://api.accescont.com/api/v1/hackaton-ia-723/mail/send', {
      method: 'POST',
      headers: {
        'x-api-key': 'nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: destinatarioEmail,
        subject: asunto,
        text: cuerpoTexto,
        attachments: attachmentsList
      })
    });

    if (resMail.ok) {
      return {
        exito: true,
        mensaje: `Correo enviado exitosamente a ${destinatarioEmail} con ${attachmentsList.length} adjuntos vía NexusVault API (Respaldo).`,
        metodoEnvio: "NEXUS_VAULT_API",
        asunto,
        cuerpoTexto,
        totalAdjuntos: attachmentsList.length
      };
    }
  } catch (apiErr) {
    console.warn("[Mail] Fallo API de respaldo:", apiErr);
  }

  // 3. FALLBACK 2: Simulador para presentación offline
  return {
    exito: true,
    mensaje: `Correo simulado y preparado correctamente para ${destinatarioEmail} con ${attachmentsList.length} adjuntos. (Modo Hackatón Live)`,
    metodoEnvio: "SIMULADO_DEMO",
    asunto,
    cuerpoTexto,
    totalAdjuntos: attachmentsList.length
  };
}
