import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const razonSocial = searchParams.get('razonSocial') || searchParams.get('nombre') || searchParams.get('q') || '';

  if (!razonSocial || razonSocial.trim().length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const cleanQuery = razonSocial.trim();

  try {
    const sriUrl = `https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/Persona/obtenerPersonasEnRucPorRazonSocial?razonSocial=${encodeURIComponent(cleanQuery)}`;
    
    const response = await fetch(sriUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 60 }
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        query: cleanQuery,
        data: Array.isArray(data) ? data : []
      });
    }

    return NextResponse.json({
      success: false,
      error: `SRI returned HTTP status ${response.status}`,
      data: []
    }, { status: response.status });

  } catch (err: any) {
    console.error("[API Error] Consultar Razón Social SRI:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Error al consultar la razón social en el SRI",
      data: []
    }, { status: 500 });
  }
}
