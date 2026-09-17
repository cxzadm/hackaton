# Guía Completa de Replicación: Consultas Públicas de Ecuador (Cédula, RUC, Apellidos, SENESCYT y SuperCías)

Este documento detalla la arquitectura, endpoints, proveedores externos y código fuente replicable para realizar consultas públicas en Ecuador: **Cédula (Datos de Identidad)**, **RUC y Establecimientos (SRI)**, **Búsqueda por Apellidos y Nombres**, **Títulos Académicos (SENESCYT con auto-resolución de captcha)** y **Superintendencia de Compañías (SuperCías - Información General y Administradores Rápida)**.

---

## Tabla de Contenidos
1. [Resumen General del Módulo](#resumen-general-del-módulo)
2. [Prerrequisitos y Dependencias](#prerrequisitos-y-dependencias)
3. [1. Consulta de Cédula (Registro Civil / ERP UCACUE)](#1-consulta-de-cédula-registro-civil--erp-ucacue)
4. [2. Consulta por Apellidos y Nombres (EcuadorLegalOnline / SRI)](#2-consulta-por-apellidos-y-nombres-ecuadorlegalonline--sri)
5. [3. Consulta de RUC y Establecimientos (SRI Catastro)](#3-consulta-de-ruc-y-establecimientos-sri-catastro)
6. [4. Consulta de Títulos Académicos (SENESCYT con Auto-Captcha)](#4-consulta-de-títulos-académicos-senescyt-con-auto-captcha)
7. [5. Consulta de SuperCías (Información General y Administradores sin PDFs / Rápida)](#5-consulta-de-supercías-información-general-y-administradores-sin-pdfs--rápida)
8. [Guía Paso a Paso para Replicar en un Nuevo Proyecto](#guía-paso-a-paso-para-replicar-en-un-nuevo-proyecto)

---

## Resumen General del Módulo

| Consulta | Proveedor / Fuente Externa | Tipo de Integración | Requiere Captcha | Archivos en Código Actual |
| :--- | :--- | :--- | :--- | :--- |
| **Cédula / Identidad** | ERP UCACUE (Registro Civil Proxy) | Scrape de JSON incrustado en HTML con pre-warming de cookies | No | `backend/app/routers/consultar_cedula.py` |
| **Apellidos y Nombres** | Ecuador Legal Online | API REST / JSON público | No | `backend/app/routers/consulta_establecimientos.py` |
| **RUC / Consolidado** | SRI Catastro Sujeto Servicio | API REST oficial JSON | No | `backend/app/routers/consulta_establecimientos.py` |
| **RUC / Establecimientos** | SRI Catastro Sujeto Servicio | API REST oficial JSON | No | `backend/app/routers/consulta_establecimientos.py` |
| **RUC / Datos HTML** | SRI Facturación Internet | Scraping HTML con BeautifulSoup | No | `backend/app/routers/consultar_empresa.py` |
| **Títulos SENESCYT** | Portal JSF SENESCYT | JSF Form Post + Auto OCR / Captcha Manual | **Sí** (JSF + Image Captcha) | `backend/app/routers/consultaTitulos.py`<br>`backend/app/routers/captchaJump.py` |
| **SuperCías (Ligera)** | Portal JSF SuperCías | JSF PrimeFaces AJAX + Auto PoW ALTCHA (SHA-256) | **Sí** (ALTCHA PoW) | `backend/app/routers/consulta_supercias.py`<br>`documentacion/consultar_supercias_rapido.py` |
| **SuperCías (Con PDFs)** | Portal JSF SuperCías | Scraping Completo + Descarga PDFs + openpyxl Excel + WebDAV | **Sí** (ALTCHA PoW + Captcha Popup) | `backend/app/routers/consulta_supercias.py`<br>`documentacion/GUIA_REPLICACION_SUPERCIAS_DOCUMENTOS.md` |

---

## Prerrequisitos y Dependencias

Para ejecutar todos los conectores en un entorno Python 3.10+ necesitarás:

```bash
pip install requests beautifulsoup4 pytesseract easyocr opencv-python-headless pillow fastapi uvicorn pydantic urllib3
```

### OCR (Para SENESCYT Automático)
- **Tesseract OCR (Opcional pero recomendado)**: Instalar [Tesseract OCR para Windows](https://github.com/UB-Mannheim/tesseract/wiki) en `C:\Program Files\Tesseract-OCR\tesseract.exe` o agregar al `PATH` en Linux.
- **EasyOCR / OpenCV**: Se instalan vía pip y funcionan de respaldo si Tesseract no está configurado.

---

## 1. Consulta de Cédula (Registro Civil / ERP UCACUE)

### Concepto Técnico
El endpoint consulta el ERP público de UCACUE (`https://erpuniversity.ucacue.edu.ec`), el cual interactúa internamente con el servicio del Registro Civil de Ecuador.

Para evitar bloqueos WAF (Web Application Firewall) o fallos de token JWT:
1. Se utiliza una sesión HTTP (`requests.Session()`).
2. Se realiza un **"pre-warming" de cookies** visitando secuencialmente el dominio base y la página de admisiones.
3. Se envía una petición GET a `buscarDatosRC.php?documento={cedula}` con headers de navegador real (`User-Agent`, `Referer`, `X-Requested-With`).
4. Si la respuesta contiene HTML, se extrae el arreglo/objeto JSON mediante Regex y des-escapado de entidades HTML.

### Código Python Replicable (`consultar_cedula.py`)

```python
import json
import re
import html
import requests
import urllib3
from typing import Dict, Any, Optional

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

EXTERNAL_URL = "https://erpuniversity.ucacue.edu.ec/modules/admision/buscarDatosRC.php"

def _extract_json_from_html(text: str) -> Any:
    decoded = html.unescape(text or "")
    body_match = re.search(r"<body[^>]*>([\s\S]*?)</body>", decoded, re.IGNORECASE)
    content = body_match.group(1) if body_match else decoded

    content = re.sub(r"<script[\s\S]*?</script>", " ", content, flags=re.IGNORECASE)
    content = re.sub(r"<style[\s\S]*?</style>", " ", content, flags=re.IGNORECASE)
    content_text = re.sub(r"<[^>]+>", " ", content)

    first_lb = content_text.find('[')
    last_rb = content_text.rfind(']')
    if first_lb != -1 and last_rb != -1 and last_rb > first_lb:
        segment = content_text[first_lb:last_rb+1].strip()
        try:
            return json.loads(segment)
        except Exception:
            pass

    arr_match = re.search(r"\[[\s\S]*?\]", content_text)
    if arr_match:
        try:
            return json.loads(arr_match.group(0))
        except Exception:
            pass
    return json.loads(content_text.strip())

def consultar_cedula_ecuador(cedula: str) -> Dict[str, Any]:
    """Consulta los datos del Registro Civil ecuatoriano a través de ERP UCACUE."""
    if not cedula.isdigit() or len(cedula) != 10:
        raise ValueError("La cédula debe ser de 10 dígitos numéricos.")

    session = requests.Session()
    headers_base = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://erpuniversity.ucacue.edu.ec/modules/admision/inscripcionnuevoposgrado.php",
        "Origin": "https://erpuniversity.ucacue.edu.ec",
    }

    # Pre-warm cookies
    try:
        session.get("https://erpuniversity.ucacue.edu.ec/", timeout=5, verify=False)
        session.get("https://erpuniversity.ucacue.edu.ec/modules/admision/", timeout=5, verify=False)
        session.get("https://erpuniversity.ucacue.edu.ec/modules/admision/inscripcionnuevoposgrado.php", timeout=5, verify=False)
    except Exception:
        pass

    resp = session.get(
        EXTERNAL_URL,
        params={"documento": cedula},
        timeout=20,
        headers=headers_base,
        verify=False
    )
    
    try:
        data = resp.json()
    except Exception:
        data = _extract_json_from_html(resp.text)

    payload = data[0] if isinstance(data, list) and data else data
    if not isinstance(payload, dict):
        raise ValueError("No se encontraron datos para la cédula ingresada.")

    return payload
```

---

## 2. Consulta por Apellidos y Nombres (EcuadorLegalOnline / SRI)

### Concepto Técnico
Permite la búsqueda de cédula o número de identificación a partir del nombre completo de una persona o de una empresa.

1. **Personas Naturales (Por Nombres/Apellidos)**: Consulta el endpoint público de Ecuador Legal Online.
2. **Razón Social / Empresas (SRI)**: Consulta el endpoint catastral REST del SRI.

### Código Python Replicable (`consultar_nombres.py`)

```python
import requests
from typing import List, Dict, Any

def consultar_por_nombres_apellidos(nombres: str) -> List[Dict[str, Any]]:
    """Consulta números de cédula por apellidos y nombres (Ejemplo: 'PEREZ ALVARADO JUAN')."""
    url = "https://apps.ecuadorlegalonline.com/modulo/consultar-cedulanombre.php"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://www.ecuadorlegalonline.com",
        "Referer": "https://www.ecuadorlegalonline.com/"
    }
    
    resp = requests.get(url, params={"nombres": nombres}, headers=headers, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    
    # Retorna lista de dicts: [{'identificacion': '...', 'nombreCompleto': '...', 'fechaDefuncion': '...'}]
    return data if isinstance(data, list) else []

def consultar_sri_por_razon_social(razon_social: str) -> List[Dict[str, Any]]:
    """Consulta en el SRI contribuyentes que coincidan con una Razón Social o Apellidos."""
    url = "https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/Persona/obtenerPersonasEnRucPorRazonSocial"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    resp = requests.get(url, params={"razonSocial": razon_social}, headers=headers, timeout=15)
    resp.raise_for_status()
    try:
        data = resp.json()
        return data if isinstance(data, list) else []
    except ValueError:
        return []
```

---

## 3. Consulta de RUC y Establecimientos (SRI Catastro)

### Concepto Técnico
El SRI provee dos endpoints oficiales en formato REST JSON que no requieren captcha:
1. **Consolidado Contribuyente**: Estado del RUC, nombre comercial, actividad económica, tipo de contribuyente, clase, etc.
2. **Establecimientos**: Matriz y sucursales registradas, estado (ABIERTO/CERRADO) y dirección exacta.

### Código Python Replicable (`consultar_ruc.py`)

```python
import requests
from typing import Dict, List, Any

def obtener_consolidado_ruc(ruc: str) -> Dict[str, Any]:
    """Obtiene la información consolidada de un RUC (13 dígitos) desde el servicio REST del SRI."""
    url = "https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/obtenerPorNumerosRuc"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    resp = requests.get(url, params={"ruc": ruc}, headers=headers, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    return data[0] if isinstance(data, list) and len(data) > 0 else (data or {})

def obtener_establecimientos_ruc(ruc: str) -> List[Dict[str, Any]]:
    """Obtiene todos los establecimientos (matriz y sucursales) asociados a un RUC."""
    url = "https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/Establecimiento/consultarPorNumeroRuc"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    resp = requests.get(url, params={"numeroRuc": ruc}, headers=headers, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else []
```

### Endpoint Backend Integrado: `/empresa/consolidado-ruc`

Servicio proxy REST en la API del proyecto para consultar los datos consolidados del contribuyente desde el SRI.

* **Método HTTP**: `GET`
* **Endpoint**: `/empresa/consolidado-ruc`
* **Parámetros Query**: `ruc` (13 dígitos)

**Ejemplo de Petición HTTP**:
```http
GET /empresa/consolidado-ruc?ruc=0190412040001 HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Ejemplo de Respuesta JSON (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "numeroRuc": "0190412040001",
    "razonSocial": "COMPAÑIA EJEMPLO S.A.",
    "estadoContribuyenteRuc": "ACTIVO",
    "actividadEconomicaPrincipal": "VENTA AL POR MAYOR Y MENOR DE MERCADERIA...",
    "tipoContribuyente": "SOCIEDAD",
    "regimen": "GENERAL",
    "categoria": "PYMES",
    "obligadoLlevarContabilidad": "SI",
    "agenteRetencion": "NO",
    "contribuyenteEspecial": "NO",
    "contribuyenteFantasma": "NO",
    "transaccionesInexistente": "NO",
    "informacionFechasContribuyente": {
      "fechaInicioActividades": "2010-05-12",
      "fechaCese": null,
      "fechaReinicioActividades": null,
      "fechaActualizacion": "2024-01-10"
    },
    "representantesLegales": [
      {
        "identificacion": "0101943926",
        "nombre": "MOLINA ORTEGA MARIA ANGELICA",
        "cargo": "GERENTE GENERAL"
      }
    ]
  }
}
```

---

## 4. Consulta de Títulos Académicos (SENESCYT con Auto-Captcha)

### Concepto Técnico
La consulta de títulos en la SENESCYT se realiza contra una aplicación **JavaServer Faces (JSF)** en URL `https://titulos-edusuperior.minedec.gob.ec/consulta-titulos-web/faces/vista/consulta/consulta.xhtml`.

El flujo consta de:
1. Realizar `GET` a la página de consulta y extraer el campo oculto `javax.faces.ViewState`.
2. Descargar la imagen del captcha en `/Captcha.jpg`.
3. Ejecutar OCR (Pytesseract / EasyOCR / OpenCV) sobre la imagen descargada para generar candidatos de solución del captcha.
4. Enviar un `POST` con los datos del formulario: `formPrincipal:identificacion`, `formPrincipal:captchaSellerInput`, `formPrincipal:boton-buscar='Buscar'`, y `javax.faces.ViewState`.
5. Parsear el HTML resultante con `BeautifulSoup`:
   - Datos Personales: `#formPrincipal:pnlInfoPersonal` o `#formPrincipal:groupDatos`
   - ### Código Python Replicable (`consultar_senescyt.py`)

```python
import base64
import os
import re
import requests
import urllib3
import cv2
import numpy as np
import easyocr
from bs4 import BeautifulSoup
from typing import Dict, List, Any, Tuple

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SENESCYT_BASE = 'https://titulos-edusuperior.minedec.gob.ec'
SENESCYT_PATH = '/consulta-titulos-web/faces/vista/consulta/consulta.xhtml'

# Instancia Singleton de EasyOCR Reader (evita recargar el modelo en memoria)
_EASYOCR_READER = None

def get_easyocr_reader():
    global _EASYOCR_READER
    if _EASYOCR_READER is None:
        _EASYOCR_READER = easyocr.Reader(['en'], gpu=False)
    return _EASYOCR_READER

def extract_captcha_candidates(img_bytes: bytes) -> List[str]:
    reader = get_easyocr_reader()
    nparr = np.frombuffer(img_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        return []

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    mean_val = cv2.mean(gray)[0]
    inv = cv2.bitwise_not(gray) if mean_val < 127 else gray.copy()

    # Preprocesamiento inteligente: reescalar 3x y padding de margen blanco
    scaled = cv2.resize(inv, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    padded_scaled = cv2.copyMakeBorder(scaled, 25, 25, 25, 25, cv2.BORDER_CONSTANT, value=255)
    _, otsu = cv2.threshold(scaled, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    padded_otsu = cv2.copyMakeBorder(otsu, 25, 25, 25, 25, cv2.BORDER_CONSTANT, value=255)

    candidates = []
    for img_var in [padded_scaled, padded_otsu, inv, img_bgr]:
        try:
            ocr_res = reader.readtext(img_var, detail=0, allowlist='abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')
            raw_text = "".join(ocr_res).strip()
            cleaned = re.sub(r'[^a-zA-Z0-9]', '', raw_text)
            if cleaned and 3 <= len(cleaned) <= 6:
                if cleaned not in candidates:
                    candidates.append(cleaned)
                if cleaned.lower() not in candidates:
                    candidates.append(cleaned.lower())
        except Exception:
            pass

    candidates.sort(key=lambda x: (abs(len(x) - 4), x))
    return candidates

def parse_titles_html(html_text: str) -> Tuple[Dict[str, str], List[Dict[str, str]]]:
    soup = BeautifulSoup(html_text, 'html.parser')
    info = {}
    
    # 1. Extraer datos personales si existen
    info_table = soup.select_one('#formPrincipal\\:j_idt44')
    if info_table:
        for tr in info_table.select('tr'):
            tds = tr.select('td')
            if len(tds) >= 2:
                k = tds[0].get_text(strip=True).replace(':', '').lower()
                v = tds[1].get_text(strip=True)
                if 'identificación' in k: info['identificacion'] = v
                elif 'nombres' in k: info['nombres'] = v
                elif 'género' in k: info['genero'] = v
                elif 'nacionalidad' in k: info['nacionalidad'] = v

    # 2. Extraer tablas de títulos
    titulos = []
    containers = soup.find_all(id=re.compile(r":tablaAplicaciones$"))
    for cont in containers:
        nivel = None
        panel = cont.find_parent('div', class_='panel')
        if panel:
            header = panel.select_one('.panel-heading .panel-title')
            if header: nivel = header.get_text(strip=True)

        tbody = cont.find('tbody') or (cont.find('table').find('tbody') if cont.find('table') else None)
        if not tbody:
            continue

        for tr in tbody.find_all('tr'):
            cells = [td.get_text(strip=True) for td in tr.find_all('td')]
            if cells and len(cells) >= 4:
                titulos.append({
                    'nivel': nivel,
                    'titulo': cells[0] if len(cells) > 0 else '',
                    'institucion': cells[1] if len(cells) > 1 else '',
                    'tipo': cells[2] if len(cells) > 2 else '',
                    'reconocidoPor': cells[3] if len(cells) > 3 else '',
                    'numeroRegistro': cells[4] if len(cells) > 4 else '',
                    'fechaRegistro': cells[5] if len(cells) > 5 else '',
                    'areaConocimiento': cells[6] if len(cells) > 6 else '',
                    'observacion': cells[7] if len(cells) > 7 else '',
                })

    return info, titulos

def auto_consultar_senescyt(cedula: str, max_attempts: int = 4) -> Dict[str, Any]:
    """Consulta títulos en SENESCYT resolviendo el captcha mediante EasyOCR + OpenCV."""
    with requests.Session() as s:
        s.verify = False
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Origin': SENESCYT_BASE,
            'Referer': SENESCYT_BASE + SENESCYT_PATH,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        for attempt in range(max_attempts):
            r1 = s.get(SENESCYT_BASE + SENESCYT_PATH, timeout=15)
            soup = BeautifulSoup(r1.text, 'html.parser')
            vs_input = soup.select_one('input[name="javax.faces.ViewState"]')
            vs = vs_input['value'] if vs_input and vs_input.has_attr('value') else ''

            cap_tag = soup.select_one('#formPrincipal\\:capimg')
            cap_src = cap_tag['src'] if cap_tag and cap_tag.has_attr('src') else '/consulta-titulos-web/Captcha.jpg'
            rimg = s.get(SENESCYT_BASE + cap_src, timeout=15)

            candidates = extract_captcha_candidates(rimg.content)
            if not candidates:
                continue

            for guess in candidates[:5]:
                data = {
                    'formPrincipal': 'formPrincipal',
                    'formPrincipal:identificacion': cedula,
                    'formPrincipal:apellidos': '',
                    'formPrincipal:captchaSellerInput': guess,
                    'formPrincipal:boton-buscar': 'Buscar',
                    'javax.faces.ViewState': vs,
                }
                r2 = s.post(SENESCYT_BASE + SENESCYT_PATH, data=data, headers=headers, timeout=20)
                info, titulos = parse_titles_html(r2.text)

                if info or titulos:
                    return {'success': True, 'data': {**info, 'titulos': titulos}}

    return {'success': False, 'detail': 'No se pudo resolver el captcha automáticamente.'}
```

---

## 5. Consulta de SuperCías (Información General y Administradores sin PDFs / Rápida)

### Concepto Técnico
El portal de la **Superintendencia de Compañías, Valores y Seguros de Ecuador (SuperCías)** (`https://appscvsgen.supercias.gob.ec/consultaCompanias/societario/busquedaCompanias.jsf`) permite consultar expedientes, información general de compañías y la nómina de administradores actuales.

Para realizar esta consulta de forma ligera (sin descargar los archivos PDF de balances de años anteriores), se siguen estos pasos:
1. **Petición GET inicial**: Se obtiene la página HTML y se extrae el token `javax.faces.ViewState`.
2. **Autocompletado PrimeFaces**: Se simulan peticiones AJAX para buscar por RUC (13 dígitos), Expediente o Razón Social.
3. **Resolución de reto ALTCHA (PoW SHA-256)**: SuperCías protege el formulario de consulta mediante ALTCHA. Se obtiene un reto JSON de `https://appscvsgen.supercias.gob.ec/consultaCompanias/altcha-challenge` conteniendo `salt` y `challenge`. Se resuelve mediante un bucle en Python buscando el número `i` tal que `sha256(salt + str(i)) == challenge`, y se convierte el resultado a Base64.
4. **Navegación JSF**: Se envía la consulta y se ingresa a `informacionCompanias.jsf`.
5. **Extracción HTML/XML**: Se solicitan las vistas AJAX `menuInformacionGeneral` y `menuAdministradoresActuales`. Se parsea el XML devuelto y la estructura HTML interior con BeautifulSoup para extraer clave-valor de información de la empresa y la tabla de administradores.

### Código Python Replicable Autónomo (`consultar_supercias_rapido.py`)

No requiere dependencias complejas de OCR o Tesseract; únicamente `requests` y `beautifulsoup4`:

```python
import base64
import hashlib
import json
import re
import requests
from bs4 import BeautifulSoup
from urllib3.util import Retry
from requests.adapters import HTTPAdapter

URL_BUSQUEDA = "https://appscvsgen.supercias.gob.ec/consultaCompanias/societario/busquedaCompanias.jsf"
URL_INFO = "https://appscvsgen.supercias.gob.ec/consultaCompanias/societario/informacionCompanias.jsf"
URL_ALTCHA = "https://appscvsgen.supercias.gob.ec/consultaCompanias/altcha-challenge"

def extract_viewstate(text: str) -> str:
    soup = BeautifulSoup(text, 'html.parser')
    viewstate = soup.find('input', {'name': 'javax.faces.ViewState'})
    if viewstate and viewstate.get('value'):
        return viewstate.get('value')
    match = re.search(r'<update id="j_id1:javax.faces.ViewState:?\d*"><!\[CDATA\[(.*?)\]\]></update>', text)
    return match.group(1) if match else ""

def resolver_altcha(session: requests.Session, challenge_url: str) -> str:
    """Resuelve el reto PoW SHA-256 de ALTCHA."""
    try:
        res = session.get(challenge_url, timeout=10)
        if res.status_code != 200:
            return ""
        data = res.json()
        salt = data.get("salt")
        challenge = data.get("challenge")
        algorithm = data.get("algorithm", "SHA-256")
        max_number = data.get("maxnumber", 50000)
        signature = data.get("signature")

        if not salt or not challenge:
            return ""

        for i in range(max_number + 1):
            h = hashlib.sha256((salt + str(i)).encode('utf-8')).hexdigest()
            if h == challenge:
                payload = {
                    "algorithm": algorithm,
                    "challenge": challenge,
                    "salt": salt,
                    "signature": signature,
                    "number": i
                }
                return base64.b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8')
        return ""
    except Exception as e:
        print(f"[SuperCías] Error en ALTCHA: {e}")
        return ""

def consultar_supercias_sin_pdfs(parametro_busqueda: str) -> dict:
    """
    Consulta información general y administradores en SuperCías omitiendo PDFs.
    :param parametro_busqueda: RUC (13 dígitos), Expediente o Razón Social.
    """
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    session.mount('https://', HTTPAdapter(max_retries=retries))
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Origin": "https://appscvsgen.supercias.gob.ec",
        "Referer": URL_BUSQUEDA,
        "X-Requested-With": "XMLHttpRequest"
    })

    try:
        # Step 1: Petición inicial para obtener ViewState
        res = session.get(URL_BUSQUEDA, timeout=25)
        if res.status_code != 200:
            return {"success": False, "error": "El portal de SuperCías no responde."}
        viewstate = extract_viewstate(res.text)

        es_ruc = parametro_busqueda.isdigit() and len(parametro_busqueda) == 13
        tipo_busqueda = "2" if es_ruc else "3"
        ajax_headers = {"Faces-Request": "partial/ajax", "Accept": "application/xml, text/xml, */*; q=0.01"}

        # Step 2: Autocompletar
        payload_autocomplete = {
            "javax.faces.partial.ajax": "true",
            "javax.faces.source": "frmBusquedaCompanias:parametroBusqueda",
            "javax.faces.partial.execute": "frmBusquedaCompanias:parametroBusqueda",
            "javax.faces.partial.render": "frmBusquedaCompanias:parametroBusqueda",
            "frmBusquedaCompanias:parametroBusqueda": "frmBusquedaCompanias:parametroBusqueda",
            "frmBusquedaCompanias:parametroBusqueda_query": parametro_busqueda,
            "frmBusquedaCompanias": "frmBusquedaCompanias",
            "frmBusquedaCompanias:tipoBusqueda": tipo_busqueda,
            "frmBusquedaCompanias:parametroBusqueda_input": parametro_busqueda,
            "javax.faces.ViewState": viewstate
        }
        res_auto = session.post(URL_BUSQUEDA, data=payload_autocomplete, headers=ajax_headers)
        viewstate = extract_viewstate(res_auto.text) or viewstate

        empresas = []
        soup_xml = BeautifulSoup(res_auto.text, 'xml')
        update_node = soup_xml.find('update', {'id': 'frmBusquedaCompanias:parametroBusqueda'})
        if update_node and update_node.text:
            soup_html = BeautifulSoup(update_node.text, 'html.parser')
            for item in soup_html.find_all('li', class_='ui-autocomplete-item'):
                val = item.get('data-item-value', '')
                if val:
                    empresas.append(val)

        empresa_seleccionada = empresas[0] if empresas else parametro_busqueda

        # Step 3: Selección y envío de ALTCHA PoW
        codigo_altcha = resolver_altcha(session, URL_ALTCHA)
        if not codigo_altcha:
            return {"success": False, "error": "No se pudo resolver el reto ALTCHA."}

        payload_consultar = {
            "javax.faces.partial.ajax": "true",
            "javax.faces.source": "frmBusquedaCompanias:btnConsultarCompania",
            "javax.faces.partial.execute": "frmBusquedaCompanias:btnConsultarCompania frmBusquedaCompanias:payloadOculto",
            "frmBusquedaCompanias:btnConsultarCompania": "frmBusquedaCompanias:btnConsultarCompania",
            "frmBusquedaCompanias": "frmBusquedaCompanias",
            "frmBusquedaCompanias:tipoBusqueda": tipo_busqueda,
            "frmBusquedaCompanias:parametroBusqueda_input": empresa_seleccionada,
            "frmBusquedaCompanias:payloadOculto": codigo_altcha,
            "javax.faces.ViewState": viewstate
        }
        res_consultar = session.post(URL_BUSQUEDA, data=payload_consultar, headers=ajax_headers)
        viewstate = extract_viewstate(res_consultar.text) or viewstate

        # Step 4: Navegar a Información de Compañía
        session.get(URL_INFO, timeout=20)

        # Step 5: Petición AJAX para Información General
        payload_info = {
            "javax.faces.partial.ajax": "true",
            "javax.faces.source": "frmMenu:menuInformacionGeneral",
            "javax.faces.partial.execute": "frmMenu:menuInformacionGeneral",
            "javax.faces.partial.render": "frmInformacionCompanias:panelGroupInformacionCompanias",
            "frmMenu:menuInformacionGeneral": "frmMenu:menuInformacionGeneral",
            "frmMenu": "frmMenu",
            "javax.faces.ViewState": viewstate
        }
        res_datos = session.post(URL_INFO, data=payload_info, headers=ajax_headers)
        viewstate = extract_viewstate(res_datos.text) or viewstate

        datos_empresa = {}
        soup_xml = BeautifulSoup(res_datos.text, 'xml')
        update_node = soup_xml.find('update', {'id': 'frmInformacionCompanias:panelGroupInformacionCompanias'})
        if update_node and update_node.text:
            soup_html = BeautifulSoup(update_node.text, 'html.parser')
            for label in soup_html.find_all('label', class_='ui-outputlabel'):
                campo = label.get_text(strip=True).replace(':', '')
                td_padre = label.find_parent('td')
                if td_padre:
                    td_valor = td_padre.find_next_sibling('td')
                    if td_valor:
                        inp = td_valor.find('input')
                        txt = td_valor.find('textarea')
                        val = inp['value'].strip() if inp and inp.has_attr('value') else (txt.get_text(strip=True) if txt else td_valor.get_text(strip=True))
                        if campo and val and val.upper() not in ["NO APLICA", "NINGUNA", "NA", "N/A"]:
                            datos_empresa[campo] = val

        # Step 6: Petición AJAX para Administradores
        payload_admin = {
            "javax.faces.partial.ajax": "true",
            "javax.faces.source": "frmMenu:menuAdministradoresActuales",
            "javax.faces.partial.execute": "frmMenu:menuAdministradoresActuales",
            "javax.faces.partial.render": "frmInformacionCompanias:panelGroupInformacionCompanias",
            "frmMenu:menuAdministradoresActuales": "frmMenu:menuAdministradoresActuales",
            "frmMenu": "frmMenu",
            "javax.faces.ViewState": viewstate
        }
        res_admin = session.post(URL_INFO, data=payload_admin, headers=ajax_headers)
        soup_admin_xml = BeautifulSoup(res_admin.text, 'xml')

        administradores = []
        update_admin = soup_admin_xml.find('update', {'id': 'frmInformacionCompanias:panelGroupInformacionCompanias'})
        if update_admin and update_admin.text:
            soup_admin_html = BeautifulSoup(update_admin.text, 'html.parser')
            for r in soup_admin_html.find_all('tr', class_=re.compile(r'ui-widget-content')):
                cols = [td.get_text(strip=True) for td in r.find_all('td')]
                if len(cols) >= 5:
                    administradores.append({
                        "Identificación": cols[0],
                        "Nombre": cols[1],
                        "Cargo": cols[2],
                        "Fecha Nombramiento": cols[3],
                        "Periodo": cols[4]
                    })

        return {
            "success": True,
            "empresa_seleccionada": empresa_seleccionada,
            "datos_empresa": datos_empresa,
            "administradores": administradores
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### Endpoints Backend Integrados: `/empresa/supercias/consultar` y `/empresa/supercias/estado/{job_id}`

Para la arquitectura del sistema que ejecuta el proceso en segundo plano (asíncrono con BackgroundTasks):

#### 1. Iniciar Consulta Asíncrona (Sin PDFs / Rápida)
* **Método HTTP**: `GET` / `POST`
* **Endpoint**: `/empresa/supercias/consultar`
* **Parámetros Query**: `parametro` (RUC, Expediente o Razón Social) y `sin_pdfs=true`

**Ejemplo de Petición HTTP**:
```http
GET /empresa/supercias/consultar?parametro=0190412040001&sin_pdfs=true HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Ejemplo de Respuesta JSON (`200 OK`)**:
```json
{
  "job_id": "8f3b2c1a-4e5d-6f7a-8b9c-0d1e2f3a4b5c",
  "status": "processing_info"
}
```

#### 2. Consultar Estado de Avance (Sondeo / Polling)
* **Método HTTP**: `GET`
* **Endpoint**: `/empresa/supercias/estado/{job_id}`

**Ejemplo de Petición HTTP**:
```http
GET /empresa/supercias/estado/8f3b2c1a-4e5d-6f7a-8b9c-0d1e2f3a4b5c HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Ejemplo de Respuesta JSON al completar (`status: "completed"`)**:
```json
{
  "status": "completed",
  "success": true,
  "empresa_seleccionada": "30023 - 0190412040001 - HOMERO ORTEGA PENAFIEL E HIJOS C LTDA",
  "datos_empresa": {
    "Expediente": "30023",
    "R.U.C.": "0190412040001",
    "Fecha de constitución": "1972-02-08",
    "Tipo de compañía": "RESPONSABILIDAD LIMITADA",
    "Situación legal": "ACTIVA",
    "Provincia": "AZUAY",
    "Cantón": "CUENCA",
    "Ciudad": "CUENCA",
    "Calle": "AV. GIL RAMIREZ DAVALOS",
    "Número": "3-86",
    "Teléfono 1": "072809000",
    "Correo 1": "contab1@homeroortega.com",
    "CIIU actividad principal": "C1410.05",
    "Descripción": "FABRICACIÓN DE GORROS Y SOMBREROS (INCLUIDO LOS DE PIEL Y PAJA TOQUILLA).",
    "Capital suscrito": "268,975.00"
  },
  "administradores": [
    {
      "Identificación": "0101943926",
      "Nombre": "MOLINA ORTEGA MARIA ANGELICA",
      "Cargo": "GERENTE GENERAL",
      "Fecha Nombramiento": "2022-05-05",
      "Periodo": "5 AÑOS"
    }
  ],
  "pdfs": [],
  "error": null
}
```

#### Ejemplo de Código de Invención / Polling en JavaScript (Axios)
```javascript
import axios from 'axios'

async function consultarSuperciasRapido(ruc) {
  // 1. Iniciar tarea de extracción ligera
  const startResp = await axios.get('/api/empresa/supercias/consultar', {
    params: { parametro: ruc, sin_pdfs: true }
  })
  const jobId = startResp.data.job_id

  // 2. Sondeo (Polling) cada 2 segundos hasta completar
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const stateResp = await axios.get(`/api/empresa/supercias/estado/${jobId}`)
        const state = stateResp.data
        if (state.status === 'completed') {
          clearInterval(interval)
          resolve(state)
        } else if (state.status === 'error') {
          clearInterval(interval)
          reject(new Error(state.error || 'Error en la consulta de SuperCías'))
        }
      } catch (err) {
        clearInterval(interval)
        reject(err)
      }
    }, 2000)
  })
}
```

---

## Guía Paso a Paso para Replicar en un Nuevo Proyecto

Si deseas integrar estos servicios en un **nuevo proyecto backend con FastAPI**:

### Estructura de Proyecto Recomendada
```
mi_nuevo_proyecto/
├── app/
│   ├── __init__.py
│   ├── main.py
│   └── routers/
│       ├── __init__.py
│       ├── cedula.py
│       ├── ruc.py
│       ├── nombres.py
│       └── senescyt.py
├── requirements.txt
└── README.md
```

### Configuración del Servidor FastAPI (`app/main.py`)

```python
from fastapi import FastAPI
from app.routers import cedula, ruc, nombres, senescyt

app = FastAPI(title="API Consultas Ecuador", version="1.0.0")

app.include_router(cedula.router, prefix="/api/cedula", tags=["Cédula"])
app.include_router(ruc.router, prefix="/api/ruc", tags=["RUC / SRI"])
app.include_router(nombres.router, prefix="/api/nombres", tags=["Nombres"])
app.include_router(senescyt.router, prefix="/api/senescyt", tags=["SENESCYT"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

### Archivo `requirements.txt`
```text
fastapi>=0.100.0
uvicorn>=0.22.0
requests>=2.31.0
beautifulsoup4>=4.12.0
urllib3>=2.0.0
pytesseract>=0.3.10
pillow>=10.0.0
pydantic>=2.0.0
```

---

## Puntos Clave de Mantenimiento y Troubleshooting

1. **Requisitos SSL de la SENESCYT y Registro Civil**:
   Los portales gubernamentales de Ecuador frecuentemente presentan cadenas de certificados SSL incompletas. En Python, siempre es necesario desactivar advertencias SSL cuando sea indispensable (`urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)` y `verify=False` en `requests`).

2. **Pre-warming de Cookies en Cédulas**:
   El servidor de UCACUE / ERPUniversity valida la secuencia de navegación. Si no navegas previamente a `/modules/admision/` antes de llamar a `buscarDatosRC.php`, la petición retornará errores de token JWT o HTTP 400.

3. **Fallback para Captcha SENESCYT**:
   Aunque el auto-OCR resuelve la mayoría de captchas en 1 a 3 intentos, es recomendable ofrecer un endpoint alternativo que envíe el captcha codificado en Base64 al frontend para resolución manual por el usuario si el auto-OCR falla tras 4 intentos.
