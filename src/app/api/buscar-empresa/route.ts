import { NextRequest, NextResponse } from 'next/server';
import { searchCompanies, COMPANY_CATALOG } from '@/lib/company-catalog';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  const results = searchCompanies(q);

  return NextResponse.json({
    success: true,
    query: q,
    count: results.length,
    results
  });
}
