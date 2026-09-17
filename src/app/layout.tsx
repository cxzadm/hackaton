import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SmartAdvisor IA | El Agente Cognitivo para la Consultoría Comercial B2B',
  description: 'SmartAdvisor IA: Agente cognitivo inteligente para la consultoría comercial B2B, cotizaciones hiperautomatizadas y análisis financiero societario.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased selection:bg-blue-600 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
