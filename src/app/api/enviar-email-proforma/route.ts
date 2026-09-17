import { NextRequest, NextResponse } from 'next/server';
import { enviarCorreoProforma } from '@/lib/email-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      destinatarioEmail,
      nombreEmpresa,
      activosFormateados,
      ingresosFormateados,
      proformaPdfBase64,
      superciasPdfBase64,
      superciasOriginalPdfs
    } = body;

    if (!destinatarioEmail || !nombreEmpresa) {
      return NextResponse.json(
        { success: false, error: "Destinatario y Nombre de la Empresa son requeridos." },
        { status: 400 }
      );
    }

    const mailResult = await enviarCorreoProforma({
      destinatarioEmail,
      nombreEmpresa,
      activosFormateados: activosFormateados || "$0,00",
      ingresosFormateados: ingresosFormateados || "$0,00",
      proformaPdfBase64: proformaPdfBase64 || "",
      superciasPdfBase64: superciasPdfBase64 || "",
      superciasOriginalPdfs: superciasOriginalPdfs || []
    });

    return NextResponse.json({
      success: true,
      mailResult
    });

  } catch (err: any) {
    console.error("[API Error] Enviar Email Proforma:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Error al enviar el correo." },
      { status: 500 }
    );
  }
}
