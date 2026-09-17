import React from 'react';
import ProformaDashboard from '@/components/ProformaDashboard';
import { Sparkles, Cpu, Award } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070d19] text-white flex flex-col justify-between p-4 sm:p-8 md:p-12 relative overflow-hidden">
      
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* HEADER PRINCIPAL DE LA HACKATÓN */}
      <header className="max-w-6xl mx-auto w-full text-center space-y-4 pt-4 pb-6 relative z-10">
        
        {/* Badges superiores */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/80 shadow-sm">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            Agente Cognitivo Autónomo
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shadow-sm">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            Hackatón IA para la Innovación Empresarial
          </span>
        </div>

        {/* Título Principal */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-emerald-300">
          SmartAdvisor IA
        </h1>

        <p className="text-base sm:text-lg text-emerald-300 max-w-2xl mx-auto font-semibold tracking-wide uppercase">
          El Agente Cognitivo para la Consultoría Comercial B2B
        </p>

      </header>

      {/* SECCIÓN CENTRAL INTERACTIVA */}
      <div className="flex-1 flex items-center justify-center relative z-10 my-4">
        <ProformaDashboard />
      </div>

      {/* FOOTER CORPORATIVO HACKATÓN */}
      <footer className="max-w-6xl mx-auto w-full pt-8 pb-4 text-center border-t border-slate-900 mt-12 text-xs text-slate-500 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">SmartAdvisor IA Platform</span>
          <span>•</span>
          <span>Agente Cognitivo B2B Core</span>
        </div>
        <div>
          Desarrollado para la <strong className="text-slate-400">Hackatón IA 2026</strong> (UNIR • Telconet • Cirion)
        </div>
      </footer>

    </main>
  );
}
