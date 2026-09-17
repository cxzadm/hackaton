# SmartAdvisor IA
> **El Agente Cognitivo para la Consultoría Comercial B2B**

SmartAdvisor IA es una solución de hiperautomatización comercial desarrollada para la **Hackatón IA 2026** (UNIR • Telconet • Cirion). Permite cotizaciones comerciales ultra-rápidas en tiempo real realizando investigación societaria y financiera autónoma.

---

## 🚀 Características Principales

1. **Agente Cognitivo Autónomo (Paso 1):**
   - Búsqueda autocompletable en tiempo real de contribuyentes y empresas (`/empresa/consultar-razon-social`).
   - Conexión con datos tributarios y de la Superintendencia de Compañías.
   - Evaluación de niveles de solvencia (Tier de empresa, score financiero 0-100 y porcentajes de descuento).

2. **Dashboard de Gráficas Financieras:**
   - Visualización de Activos Totales, Pasivos, Patrimonio y Rentabilidad.
   - Comparativo de crecimiento interanual de ventas y margen neto.

3. **Despacho Controlado por Gmail SMTP (Paso 2):**
   - Confirmación y envío de la proforma comercial personalizada a múltiples destinatarios.
   - Adjunta automáticamente 4 archivos PDF (Proforma Comercial 532pt, Reporte Auditado SuperCías y Balances Anuales).

---

## 🛠️ Tecnologías

- **Framework:** Next.js 16 (App Router) + React 19
- **Lenguaje:** TypeScript / Node.js
- **Estilos:** Tailwind CSS & Lucide Icons
- **PDF Engine:** jsPDF + autoTable
- **Email Service:** Nodemailer (Gmail SMTP integration)

---

## 💻 Ejecución Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) en su navegador para ver la aplicación.
