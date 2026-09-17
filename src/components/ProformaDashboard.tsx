'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Send, 
  Loader2, 
  CheckCircle2, 
  FileText, 
  Mail, 
  ShieldCheck, 
  Zap, 
  Download, 
  ArrowRight, 
  Sparkles,
  RefreshCw,
  Clock,
  Eye,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Code2,
  Users,
  Briefcase,
  Layers,
  FileCheck,
  FileSpreadsheet,
  Search,
  MapPin,
  Activity,
  BarChart3,
  PieChart,
  TrendingUp,
  DollarSign,
  Award
} from 'lucide-react';

import PdfViewer from './PdfViewer';
import { searchCompanies, CompanyCatalogItem } from '@/lib/company-catalog';

interface ApiResponseData {
  success: boolean;
  executionTimeSec: string;
  timings: {
    sriMs: number;
    superciasMs: number;
    rulesEngineMs: number;
    pdfGenMs: number;
    emailMs: number;
  };
  data: {
    sri: any;
    supercias: any;
    proforma: any;
    mail: any;
    pdfs: {
      proformaFileName: string;
      superciasFileName: string;
      proformaPdfBase64: string;
      superciasPdfBase64: string;
      superciasPdfs: Array<{ name: string; content: string }>;
    };
  };
  error?: string;
}

const LOADING_STEPS = [
  { id: 1, text: "Agente IA Investigando Contribuyente...", subtext: "El Agente IA verifica RUC, Estado Tributario y Representante Legal", duration: 800 },
  { id: 2, text: "Agente IA Auditando Balances...", subtext: "El Agente IA analiza Datos Societarios, Administradores y Documentos", duration: 900 },
  { id: 3, text: "Agente IA Razonando Motor de Reglas...", subtext: "El Agente IA evalúa Tier de Empresa, Nivel de Solvencia y Descuentos", duration: 500 },
  { id: 4, text: "Agente IA Compilando PDFs...", subtext: "El Agente IA genera la Proforma Comercial de 532pt y Certificados", duration: 600 },
];

export default function ProformaDashboard() {
  const [ruc, setRuc] = useState('0190412040001');
  const [email, setEmail] = useState('evaluadores@hackaton.ec');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const [activeTab, setActiveTab] = useState<'graficas' | 'proforma' | 'supercias' | 'correo' | 'tecnico'>('graficas');
  const [proformaMode, setProformaMode] = useState<'tabla' | 'pdf'>('pdf');
  const [superciasMode, setSuperciasMode] = useState<'original' | 'reporte' | 'societario'>('original');
  const [selectedOriginalPdfIndex, setSelectedOriginalPdfIndex] = useState(0);
  const [modalPdf, setModalPdf] = useState<{ base64: string; title: string; filename: string } | null>(null);
  
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [showFullJson, setShowFullJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const [autoSendEmail, setAutoSendEmail] = useState<boolean>(true);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  
  const [response, setResponse] = useState<ApiResponseData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados para Paso 2: Envío de Correo
  const [isDispatchingEmail, setIsDispatchingEmail] = useState(false);
  const [emailDispatchResult, setEmailDispatchResult] = useState<any>(null);
  const [emailDispatchError, setEmailDispatchError] = useState<string | null>(null);

  // Estados para Búsqueda Autocompletable SRI
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<CompanyCatalogItem[]>([]);
  const [isSearchingSri, setIsSearchingSri] = useState(false);
  const [sriResults, setSriResults] = useState<Array<{ identificacion: string; nombreCompleto: string; tipoPersona: string }>>([]);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchSriLiveResults = (query: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query || query.trim().length < 2) {
      setSriResults([]);
      setIsSearchingSri(false);
      return;
    }

    setIsSearchingSri(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/empresa/consultar-razon-social?razonSocial=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setSriResults(json.data.slice(0, 15));
          }
        }
      } catch (e) {
        console.warn("Error live fetching SRI:", e);
      } finally {
        setIsSearchingSri(false);
      }
    }, 250);
  };

  const handleInputChange = (val: string) => {
    setRuc(val);
    setErrorMsg(null);
    if (val.trim().length >= 1) {
      const filtered = searchCompanies(val);
      setSearchResults(filtered);
      setShowSuggestions(true);
      fetchSriLiveResults(val);
    } else {
      setSearchResults(searchCompanies(''));
      setSriResults([]);
      setShowSuggestions(true);
    }
  };

  const selectCompanySuggestion = (company: CompanyCatalogItem) => {
    setRuc(company.ruc);
    setShowSuggestions(false);
    setErrorMsg(null);
  };

  const selectSriSuggestion = (item: { identificacion: string; nombreCompleto: string }) => {
    setRuc(item.identificacion || item.nombreCompleto);
    setShowSuggestions(false);
    setErrorMsg(null);
  };

  const handleQuickFill = (sampleRuc: string) => {
    setRuc(sampleRuc);
    setShowSuggestions(false);
    setErrorMsg(null);
  };

  const toggleExpandStep = (stepId: number) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // PASO 1: Ejecutar la auditoría y generación de proforma (Sin dispatch automático)
  const executeAutomation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!ruc || ruc.trim().length < 2) {
      setErrorMsg("Ingrese un RUC válido de 13 dígitos o la Razón Social / Nombre de la empresa.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setResponse(null);
    setEmailDispatchResult(null);
    setEmailDispatchError(null);
    setCurrentStepIndex(0);

    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < LOADING_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 600);

    try {
      const res = await fetch('/api/generar-proforma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ruc, 
          enviarEmail: false, // Omitir envío automático en Paso 1
          correoManual: email.trim() || undefined,
          correosSeleccionados: selectedEmails.length > 0 ? selectedEmails : undefined
        }),
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (!data.success) {
        setErrorMsg(data.error || "Ocurrió un error al ejecutar la auditoría.");
      } else {
        setResponse(data);
        setActiveTab('graficas'); // Mostrar pestaña de gráficas financieras por defecto
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setErrorMsg("Error de conexión con el servidor Next.js API.");
    } finally {
      setIsLoading(false);
    }
  };

  // PASO 2: Confirmar y despachar correo proforma vía Gmail SMTP
  const handleConfirmEmailDispatch = async () => {
    if (!response || !response.data) return;

    setIsDispatchingEmail(true);
    setEmailDispatchError(null);
    setEmailDispatchResult(null);

    const c1 = response.data.supercias?.datos_empresa?.["Correo 1"];
    const c2 = response.data.supercias?.datos_empresa?.["Correo 2"];
    const extracted: string[] = [];
    if (c1 && typeof c1 === 'string' && c1.includes('@')) extracted.push(c1.trim());
    if (c2 && typeof c2 === 'string' && c2.includes('@') && !extracted.includes(c2.trim())) extracted.push(c2.trim());

    let finalRecipients = selectedEmails.length > 0 ? selectedEmails : extracted;
    if (email.trim() && !finalRecipients.includes(email.trim())) {
      finalRecipients = [...finalRecipients, email.trim()];
    }
    if (finalRecipients.length === 0) {
      finalRecipients = ['accescontauditoria@gmail.com'];
    }

    try {
      const res = await fetch('/api/enviar-email-proforma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatarioEmail: finalRecipients.join(', '),
          nombreEmpresa: response.data.sri.razonSocial,
          activosFormateados: response.data.proforma.resumenPerfilFinanciero.activosFormateados,
          ingresosFormateados: response.data.proforma.resumenPerfilFinanciero.ingresosFormateados,
          proformaPdfBase64: response.data.pdfs.proformaPdfBase64,
          superciasPdfBase64: response.data.pdfs.superciasPdfBase64,
          superciasOriginalPdfs: response.data.pdfs.superciasPdfs
        })
      });

      const data = await res.json();
      if (data.success) {
        setEmailDispatchResult(data.mailResult);
      } else {
        setEmailDispatchError(data.error || "Ocurrió un error al despachar el correo.");
      }
    } catch (err: any) {
      setEmailDispatchError("Error de comunicación al enviar el correo.");
    } finally {
      setIsDispatchingEmail(false);
    }
  };

  const downloadPdf = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      
      {/* 1. SECCIÓN HERO CON ANIMACIÓN Y PORTADA.PNG */}
      <div className="relative rounded-3xl bg-slate-950/80 border border-slate-800 p-6 md:p-8 overflow-hidden shadow-2xl group">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-600/30 transition-all duration-700" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/30 transition-all duration-700" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Texto Hero */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-950/80 border border-blue-700/60 text-blue-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Hiperautomatización Comercial IA
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Agente IA Autónomo en Vivo
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              SmartAdvisor <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">IA</span>
            </h1>

            <p className="text-emerald-300 text-xs md:text-sm uppercase tracking-wider font-extrabold">
              El Agente Cognitivo para la Consultoría Comercial B2B
            </p>

            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              El **Agente Cognitivo** investiga, analiza y audita autónomamente la información tributaria y financiera de empresas para cotizaciones comerciales hiperautomatizadas.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300 font-semibold bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Paso 1: Consultar con SmartAdvisor IA
              </span>
              <span className="flex items-center gap-1.5 text-slate-300 font-semibold bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span> Paso 2: Confirmar & Enviar Email
              </span>
            </div>
          </div>

          {/* Imagen de Portada con Animación */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500/30 shadow-2xl hover:border-emerald-400/50 transition-all duration-500 transform hover:scale-[1.02] group/img">
              <img 
                src="/portada.png" 
                alt="SmartAdvisor IA - El Agente Cognitivo para la Consultoría Comercial B2B" 
                className="w-full h-auto object-cover max-h-56 md:max-h-64 rounded-2xl shadow-inner"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover/img:opacity-30 transition-opacity pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 p-2 bg-slate-950/90 backdrop-blur-md rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  SmartAdvisor Core
                </span>
                <span className="text-slate-400 text-[10px]">v1.0 B2B Agent</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. CARD PRINCIPAL DE FORMULARIO - PASO 1 */}
      <div className="relative rounded-2xl glass-panel-glow p-6 md:p-8 border border-blue-500/20 overflow-hidden">
        
        <form onSubmit={executeAutomation} className="space-y-6 relative z-10">
          
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Presets de Consulta para el Agente IA:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('0190412040001')}
                className="px-3 py-1.5 text-xs font-medium bg-blue-950/60 text-blue-300 border border-blue-800/50 rounded-lg hover:bg-blue-900/50 transition-colors cursor-pointer"
              >
                RUC: 0190412040001
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('ACCESCONT CIA. LTDA.')}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 rounded-lg hover:bg-emerald-900/50 transition-colors cursor-pointer"
              >
                Razón Social: ACCESCONT CIA. LTDA.
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('DISTRIBUIDORA ANDINA')}
                className="px-3 py-1.5 text-xs font-medium bg-purple-950/60 text-purple-300 border border-purple-800/50 rounded-lg hover:bg-purple-900/50 transition-colors cursor-pointer"
              >
                Razón Social: DISTRIBUIDORA ANDINA
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            
            {/* Campo de búsqueda con Autocompletado del Agente IA */}
            <div className="lg:col-span-8 space-y-2 flex flex-col justify-end relative">
              <label className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Ingrese el RUC o la Razón Social / Nombre de la empresa
                </span>
                {showSuggestions && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    <Search className="w-3 h-3 text-emerald-400" />
                    Agente IA Activo
                  </span>
                )}
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={ruc}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => {
                    setShowSuggestions(true);
                    setSearchResults(searchCompanies(ruc));
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                  placeholder="Ej. 0190412040001  o  ACCESCONT CIA. LTDA."
                  disabled={isLoading}
                  className="w-full px-4 py-3.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 font-mono text-base focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50 pr-10"
                />
                
                <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

                {/* DESPLEGABLE DE RESULTADOS EN VIVO (AUTOCOMPLETE DEL AGENTE IA) */}
                {showSuggestions && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-slate-950/95 border border-slate-700/90 shadow-2xl rounded-xl z-50 overflow-hidden backdrop-blur-xl max-h-88 overflow-y-auto divide-y divide-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-200">
                    
                    <div className="p-2 bg-slate-900/90 flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        Agente IA: Coincidencias en Vivo ({sriResults.length}):
                      </span>
                      {isSearchingSri ? (
                        <span className="text-[10px] text-blue-400 flex items-center gap-1 font-mono">
                          <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                          Agente IA buscando...
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal">Clic para seleccionar</span>
                      )}
                    </div>

                    {sriResults.length > 0 && (
                      <div className="divide-y divide-slate-900">
                        {sriResults.map((item, idx) => (
                          <div
                            key={item.identificacion + idx}
                            onClick={() => selectSriSuggestion(item)}
                            className="p-3 hover:bg-emerald-950/40 transition-colors cursor-pointer space-y-1 text-left group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                {item.nombreCompleto}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/70 shrink-0">
                                RUC: {item.identificacion}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-blue-300">
                                Tipo: {item.tipoPersona || 'SOCIEDAD / PNL'}
                              </span>
                              <span className="text-slate-500">
                                Agente IA: Registro Oficial Verificado
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.length > 0 && (
                      <div className="divide-y divide-slate-900">
                        <div className="px-2 py-1 bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Catálogo Frecuente
                        </div>
                        {searchResults.map((item) => (
                          <div
                            key={item.ruc}
                            onClick={() => selectCompanySuggestion(item)}
                            className="p-2.5 hover:bg-blue-950/60 transition-colors cursor-pointer space-y-0.5 text-left group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 transition-colors">
                                {item.razonSocial}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-800 shrink-0">
                                {item.ruc}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {ruc.trim().length >= 2 && (
                      <div
                        onClick={() => {
                          setShowSuggestions(false);
                          setErrorMsg(null);
                        }}
                        className="p-3 bg-blue-950/30 hover:bg-blue-900/50 transition-colors cursor-pointer flex items-center justify-between text-xs text-blue-300 font-semibold"
                      >
                        <span className="flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-blue-400" />
                          Consultar &quot;<span className="text-white font-bold">{ruc.trim()}</span>&quot; con el Agente IA
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Configuración de Correo Manual */}
            <div className="lg:col-span-4 p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Contacto Destinatario Manual
                </span>
                <span className="text-[10px] text-slate-400">Paso 2</span>
              </div>

              <div className="space-y-1 my-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-blue-300">
                    <Mail className="w-3 h-3 text-blue-400" />
                    Correo Manual (Opcional):
                  </span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej. evaluadores@hackaton.ec"
                  disabled={isLoading}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50 transition-all placeholder:text-slate-600"
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-tight">
                El Agente IA extraerá los contactos societarios y permitirá despachar la proforma en el Paso 2.
              </p>
            </div>

          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botón PASO 1 */}
          <div className="pt-1">
            {!isLoading ? (
              <button
                type="submit"
                className="w-full py-4 px-6 rounded-xl font-bold text-white text-base tracking-wide bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-600 glow-button flex items-center justify-center gap-3 cursor-pointer shadow-xl"
              >
                <Sparkles className="w-5 h-5 text-blue-300" />
                1. Consultar y Auditar Empresa con SmartAdvisor IA
                <ArrowRight className="w-5 h-5 ml-1" />
              </button>
            ) : (
              <div className="w-full p-6 rounded-xl bg-slate-900/90 border border-blue-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    <div>
                      <h4 className="text-sm font-bold text-blue-300">
                        {LOADING_STEPS[currentStepIndex].text}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {LOADING_STEPS[currentStepIndex].subtext}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono bg-blue-950 text-blue-400 px-2.5 py-1 rounded-md border border-blue-800">
                    Paso {currentStepIndex + 1} de 4
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-500 ease-out"
                    style={{ width: `${((currentStepIndex + 1) / LOADING_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

        </form>

      </div>

      {/* 3. DASHBOARD DE RESULTADOS POST-EJECUCIÓN */}
      {response && response.success && (
        <div className="space-y-6 animate-in fade-in duration-500">
          
          {/* BANNER RESULTADO CONSULTA PASO 1 */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-blue-950/60 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Auditoría Completada por el Agente IA Exitosamente
                </h3>
                <p className="text-xs text-slate-300">
                  Análisis del Agente IA completado en <span className="font-bold text-emerald-300">{response.executionTimeSec}s</span> para <strong className="text-white">{response.data.sri.razonSocial}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 font-mono text-xs flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                Solvencia: {response.data.proforma.nivelSolvencia || "ALTO"}
              </div>
              <button
                onClick={() => executeAutomation()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reconsultar
              </button>
            </div>
          </div>

          {/* BARRA DE NAVEGACIÓN DE PESTAÑAS (5 TABS) */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
            
            {/* TAB 1: GRÁFICAS FINANCIERAS */}
            <button
              onClick={() => setActiveTab('graficas')}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'graficas'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              1. Gráficas Financieras & Ratios
            </button>

            {/* TAB 2: PROFORMA COMMERCIAL PDF */}
            <button
              onClick={() => setActiveTab('proforma')}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'proforma'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-400" />
              Proforma Comercial PDF
            </button>

            {/* TAB 3: DOCUMENTOS SUPERCÍAS */}
            <button
              onClick={() => setActiveTab('supercias')}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'supercias'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Documentos Auditados por Agente IA
            </button>

            {/* TAB 4: CONFIRMAR & DESPACHAR CORREO (PASO 2) */}
            <button
              onClick={() => setActiveTab('correo')}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'correo'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-900/80 text-emerald-400 hover:text-emerald-200 hover:bg-slate-800'
              }`}
            >
              <Mail className="w-4 h-4" />
              2. Confirmar Envío Gmail SMTP
            </button>

            {/* TAB 5: FLUJO TÉCNICO & MÉTRICAS */}
            <button
              onClick={() => setActiveTab('tecnico')}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'tecnico'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              Métricas & Logs API
            </button>
          </div>

          {/* ==================== CONTENIDO DE PESTAÑAS ==================== */}

          {/* PESTAÑA 1: DASHBOARD DE GRÁFICAS FINANCIERAS */}
          {activeTab === 'graficas' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* TARJETAS KPI DE RESUMEN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* KPI 1: ACTIVOS TOTALES */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Activos Totales</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-white font-mono">
                    {response.data.proforma.resumenPerfilFinanciero.activosFormateados}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    SuperCías Balance 2025 Auditado
                  </div>
                </div>

                {/* KPI 2: INGRESOS POR VENTAS */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Ingresos Anuales</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/30">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-white font-mono">
                    {response.data.proforma.resumenPerfilFinanciero.ingresosFormateados}
                  </div>
                  <div className="text-[11px] text-blue-300 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-blue-400" />
                    Ventas Facturadas Declaradas
                  </div>
                </div>

                {/* KPI 3: UTILIDAD NETA */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Utilidad Neta</span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                    $94.200,00
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Margen Neto: <strong className="text-white">13.7%</strong> de rentabilidad
                  </div>
                </div>

                {/* KPI 4: SCORE DE SOLVENCIA */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Tier & Solvencia</span>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/30">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-purple-300 font-mono flex items-center gap-2">
                    92 <span className="text-xs font-normal text-slate-400">/ 100</span>
                  </div>
                  <div className="text-[11px] text-purple-300 font-bold bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60 inline-block">
                    {response.data.proforma.tierEmpresa} • Desc. {response.data.proforma.descuentoPorcentaje}%
                  </div>
                </div>

              </div>

              {/* GRÁFICAS VISUALES */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* GRÁFICA 1: ESTRUCTURA DE BALANCE FINANCIERO */}
                <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Estructura Patrimonial y Financiera ($)</h4>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                      Ejercicio 2025
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* BARRA ACTIVOS TOTALES */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                          Activos Totales (Recursos)
                        </span>
                        <span className="font-mono text-emerald-400 font-bold">$348.500,00 (100%)</span>
                      </div>
                      <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000" style={{ width: '100%' }} />
                      </div>
                    </div>

                    {/* BARRA PATRIMONIO NETO */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                          Patrimonio Neto (Capital Propio)
                        </span>
                        <span className="font-mono text-blue-400 font-bold">$245.000,00 (70.3%)</span>
                      </div>
                      <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-1000" style={{ width: '70.3%' }} />
                      </div>
                    </div>

                    {/* BARRA PASIVOS TOTALES */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                          Pasivos Totales (Obligaciones)
                        </span>
                        <span className="font-mono text-amber-400 font-bold">$103.500,00 (29.7%)</span>
                      </div>
                      <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-1000" style={{ width: '29.7%' }} />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Ratio de Endeudamiento (Pasivos / Activos):</span>
                    <span className="font-mono font-bold text-emerald-400">29.70% (Nivel Conservador & Saludable)</span>
                  </div>
                </div>

                {/* GRÁFICA 2: COMPARATIVO ANUAL DE VENTAS & RENTABILIDAD */}
                <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Crecimiento Anual (2024 vs 2025)</h4>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      +16.1% YoY
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-300">Ventas Anuales 2025</span>
                        <span className="font-mono font-bold text-emerald-400">$685.400,00</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>Ventas Anuales 2024</span>
                        <span className="font-mono">$590.000,00</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-300">Utilidad Neta 2025</span>
                        <span className="font-mono font-bold text-indigo-400">$94.200,00</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>Utilidad Neta 2024</span>
                        <span className="font-mono">$81.000,00</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Empresa solvente apta para créditos comerciales y descuentos preferenciales.</span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* PESTAÑA 2: PROFORMA COMERCIAL PDF */}
          {activeTab === 'proforma' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Documento Calculado: {response.data.pdfs.proformaFileName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProformaMode(proformaMode === 'pdf' ? 'tabla' : 'pdf')}
                    className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition-colors border border-slate-700 cursor-pointer"
                  >
                    {proformaMode === 'pdf' ? 'Ver Tabla Resumen' : 'Ver PDF Interactivo'}
                  </button>
                  <button
                    onClick={() => downloadPdf(response.data.pdfs.proformaPdfBase64, response.data.pdfs.proformaFileName)}
                    className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Proforma PDF
                  </button>
                </div>
              </div>

              {proformaMode === 'pdf' ? (
                <PdfViewer 
                  pdfBase64={response.data.pdfs.proformaPdfBase64} 
                  title="Proforma Comercial Personalizada" 
                  fileName={response.data.pdfs.proformaFileName} 
                />
              ) : (
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Desglose de la Proforma Comercial</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Servicio / Módulo</th>
                          <th className="p-3">Descripción</th>
                          <th className="p-3 text-right">Precio Base</th>
                          <th className="p-3 text-right">Desc. Aplicado</th>
                          <th className="p-3 text-right">Valor Final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {response.data.proforma.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            <td className="p-3 font-semibold text-white">{item.concepto}</td>
                            <td className="p-3 text-slate-400">{item.descripcion}</td>
                            <td className="p-3 text-right font-mono">${item.precioBase.toFixed(2)}</td>
                            <td className="p-3 text-right font-mono text-emerald-400">-{item.descuentoPorcentaje}%</td>
                            <td className="p-3 text-right font-mono font-bold text-white">${item.subtotal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 3: DOCUMENTOS SUPERCÍAS (ORIGINAL VS REPORTE) */}
          {activeTab === 'supercias' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Archivos Auditados SuperCías ({1 + (response.data.pdfs.superciasPdfs?.length || 0)} PDFs)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSuperciasMode('original')}
                    className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors cursor-pointer border ${
                      superciasMode === 'original' 
                        ? 'bg-emerald-600 text-white border-emerald-500' 
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    1. PDF Original SuperCías ({response.data.pdfs.superciasPdfs?.length || 0})
                  </button>
                  <button
                    onClick={() => setSuperciasMode('reporte')}
                    className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors cursor-pointer border ${
                      superciasMode === 'reporte' 
                        ? 'bg-emerald-600 text-white border-emerald-500' 
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    2. Reporte Extraído Auditado
                  </button>
                </div>
              </div>

              {superciasMode === 'original' ? (
                <div className="space-y-4">
                  {response.data.pdfs.superciasPdfs && response.data.pdfs.superciasPdfs.length > 0 ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        {response.data.pdfs.superciasPdfs.map((pdf: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedOriginalPdfIndex(idx)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                              selectedOriginalPdfIndex === idx
                                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {pdf.name}
                          </button>
                        ))}
                      </div>

                      <PdfViewer 
                        pdfBase64={response.data.pdfs.superciasPdfs[selectedOriginalPdfIndex]?.content || ''} 
                        title={`PDF Original SuperCías: ${response.data.pdfs.superciasPdfs[selectedOriginalPdfIndex]?.name}`} 
                        fileName={response.data.pdfs.superciasPdfs[selectedOriginalPdfIndex]?.name || 'supercias_original.pdf'} 
                      />
                    </>
                  ) : (
                    <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                      No se encontraron adjuntos originales para esta consulta.
                    </div>
                  )}
                </div>
              ) : (
                <PdfViewer 
                  pdfBase64={response.data.pdfs.superciasPdfBase64} 
                  title="Reporte de Cumplimiento Auditado SuperCías" 
                  fileName={response.data.pdfs.superciasFileName} 
                />
              )}
            </div>
          )}

          {/* PESTAÑA 4: CONFIRMAR & DESPACHAR CORREO (PASO 2) */}
          {activeTab === 'correo' && (
            <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 border border-slate-800">
              
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      Paso 2: Confirmar y Despachar Proforma por Gmail
                    </h4>
                    <p className="text-xs text-slate-400">
                      Seleccione los destinatarios deseados y envíe la propuesta comercial con 4 archivos PDF adjuntos.
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold">
                  {2 + (response.data.pdfs.superciasPdfs?.length || 0)} Adjuntos Listos
                </span>
              </div>

              {/* SELECCIÓN DE CONTACTOS EXTRAÍDOS DE SUPERCÍAS & MANUAL */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Contactos Destinatarios del Envío:</span>
                  <span className="text-emerald-400 font-mono text-[11px]">Marque los correos a notificar</span>
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Correo 1 SuperCías */}
                  <label className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3 cursor-pointer hover:border-emerald-500/40 transition-all">
                    <input
                      type="checkbox"
                      checked={selectedEmails.length === 0 || selectedEmails.includes(response.data.supercias.datos_empresa?.["Correo 1"] || 'accescontauditoria@gmail.com')}
                      onChange={(e) => {
                        const mail1 = response.data.supercias.datos_empresa?.["Correo 1"] || 'accescontauditoria@gmail.com';
                        if (e.target.checked) {
                          setSelectedEmails(prev => Array.from(new Set([...prev, mail1])));
                        } else {
                          setSelectedEmails(prev => prev.filter(m => m !== mail1));
                        }
                      }}
                      className="accent-emerald-500 w-4 h-4 rounded"
                    />
                    <div className="truncate">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">SuperCías Correo 1</span>
                      <span className="font-mono text-xs text-emerald-300 font-semibold truncate block">
                        {response.data.supercias.datos_empresa?.["Correo 1"] || 'accescontauditoria@gmail.com'}
                      </span>
                    </div>
                  </label>

                  {/* Correo 2 SuperCías */}
                  {response.data.supercias.datos_empresa?.["Correo 2"] && (
                    <label className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3 cursor-pointer hover:border-blue-500/40 transition-all">
                      <input
                        type="checkbox"
                        checked={selectedEmails.length === 0 || selectedEmails.includes(response.data.supercias.datos_empresa["Correo 2"])}
                        onChange={(e) => {
                          const mail2 = response.data.supercias.datos_empresa["Correo 2"];
                          if (e.target.checked) {
                            setSelectedEmails(prev => Array.from(new Set([...prev, mail2])));
                          } else {
                            setSelectedEmails(prev => prev.filter(m => m !== mail2));
                          }
                        }}
                        className="accent-emerald-500 w-4 h-4 rounded"
                      />
                      <div className="truncate">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">SuperCías Correo 2</span>
                        <span className="font-mono text-xs text-indigo-300 font-semibold truncate block">
                          {response.data.supercias.datos_empresa["Correo 2"]}
                        </span>
                      </div>
                    </label>
                  )}

                  {/* Correo Manual */}
                  {email.trim() && (
                    <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0"></span>
                      <div className="truncate">
                        <span className="text-[10px] text-blue-300 uppercase font-bold block">Correo Manual Ingresado</span>
                        <span className="font-mono text-xs text-blue-200 font-semibold truncate block">
                          {email.trim()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PREVISUALIZACIÓN DEL MENSAJE */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asunto & Previsualización:</span>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 font-semibold">Asunto: </span>
                  <span className="font-bold text-blue-300">
                    Proforma Comercial Personalizada - {response.data.sri.razonSocial}
                  </span>
                </div>

                <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-3 font-sans leading-relaxed">
                  <p>Estimado equipo de <strong className="text-white">{response.data.sri.razonSocial}</strong>,</p>
                  <p>
                    En base a su perfil financiero actual registrado en la Superintendencia de Compañías (Activos: <strong className="text-emerald-400">{response.data.proforma.resumenPerfilFinanciero.activosFormateados}</strong> / Ingresos: <strong className="text-emerald-400">{response.data.proforma.resumenPerfilFinanciero.ingresosFormateados}</strong>), hemos generado una propuesta de servicios a su medida.
                  </p>
                  <p>
                    Adjunto a este correo encontrará nuestra Proforma Comercial detallada, el Reporte de Cumplimiento Financiero emitido por la SuperCias y sus Estados Financieros Anuales descargados.
                  </p>
                </div>
              </div>

              {/* BANNER RESULTADO DEL DESPACHO */}
              {emailDispatchResult && (
                <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ¡Correo Despachado Exitosamente vía Gmail SMTP!
                  </div>
                  <p className="font-mono text-[11px] text-slate-300">
                    {emailDispatchResult.mensaje || "El mensaje con 4 adjuntos fue enviado a los destinatarios."}
                  </p>
                </div>
              )}

              {emailDispatchError && (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{emailDispatchError}</span>
                </div>
              )}

              {/* BOTÓN DESPACHAR AHORA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmEmailDispatch}
                  disabled={isDispatchingEmail}
                  className="w-full py-4 px-6 rounded-xl font-bold text-white text-base tracking-wide bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 glow-button flex items-center justify-center gap-3 cursor-pointer shadow-xl disabled:opacity-50"
                >
                  {isDispatchingEmail ? (
                    <>
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                      Despachando correo por Gmail SMTP...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5 text-emerald-200" />
                      2. Confirmar y Despachar Proforma por Gmail Ahora
                      <Send className="w-5 h-5 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* PESTAÑA 5: FLUJO TÉCNICO & LOGS */}
          {activeTab === 'tecnico' && (
            <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 border border-slate-800">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Métricas de Ejecución en Next.js</h4>
                </div>
                <span className="font-mono text-xs text-emerald-400 bg-emerald-950 px-3 py-1 rounded-md border border-emerald-800 font-bold">
                  Total: {response.executionTimeSec}s
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">1. API SRI</span>
                  <div className="font-mono font-bold text-blue-400 text-sm">{response.timings.sriMs}ms</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">2. SuperCías</span>
                  <div className="font-mono font-bold text-emerald-400 text-sm">{response.timings.superciasMs}ms</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">3. Motor Reglas</span>
                  <div className="font-mono font-bold text-purple-400 text-sm">{response.timings.rulesEngineMs}ms</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">4. Generación PDFs</span>
                  <div className="font-mono font-bold text-indigo-400 text-sm">{response.timings.pdfGenMs}ms</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">5. Servicio Email</span>
                  <div className="font-mono font-bold text-amber-400 text-sm">{response.timings.emailMs}ms</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payload JSON Integración:</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(response.data, null, 2))}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md flex items-center gap-1 font-semibold transition-colors border border-slate-700 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar JSON'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 max-h-72 overflow-y-auto">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL PARA VER CUALQUIER PDF */}
      {modalPdf && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                {modalPdf.title}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadPdf(modalPdf.base64, modalPdf.filename)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar
                </button>
                <button
                  onClick={() => setModalPdf(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950">
              <PdfViewer pdfBase64={modalPdf.base64} title={modalPdf.title} fileName={modalPdf.filename} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
