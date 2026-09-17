# 🚀 Manual de Integración Completa - NexusVault DAL & BaaS Platform



> **Proyecto**: hackaton-ia (hackaton-ia-723)

> **API Server Domain**: https://api.accescont.com/api/v1/hackaton-ia-723 (o https://api.accescont.com/api/v1/hackaton-ia-723)

> **API Key Pública**: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu

> **Host MongoDB Público**: mongo.accescont.com:27017 (Red LAN: 192.168.68.141:27017)

> **Hosts Mail Públicos**: imap.accescont.com:993, pop.accescont.com:995, smtp.accescont.com:587

> **Fecha de Exportación**: 17/9/2026



---



## 📋 Tabla de Contenidos

1. [Visión General & Arquitectura BaaS](#1-visión-general--arquitectura-baas)

2. [Autenticación & Gestión de Usuarios (JWT Auth)](#2-autenticación--gestión-de-usuarios-jwt-auth)

3. [Base de Datos Documental (Firestore Database Engine)](#3-base-de-datos-documental-firestore-database-engine)

4. [Base de Datos en Tiempo Real (Realtime Database Stream)](#4-base-de-datos-en-tiempo-real-realtime-database-stream)

5. [Almacenamiento de Archivos (Storage Bucket Engine)](#5-almacenamiento-de-archivos-storage-bucket-engine)

6. [Hosting CDN & Dominios Personalizados](#6-hosting-cdn--dominios-personalizados)

7. [Webhooks & Notificaciones de Eventos](#7-webhooks--notificaciones-de-eventos)

8. [Acceso Directo a MongoDB & Respaldos](#8-acceso-directo-a-mongodb--respaldos)

9. [SDK JavaScript (nexus-sdk.js)](#9-sdk-javascript-nexus-sdkjs)

10. [Analytics & Telemetría (Eventos y Métricas)](#10-analytics--telemetría-eventos-y-métricas)

11. [Plataforma de Email & Conexión IMAP/POP3/SMTP](#11-plataforma-de-email--conexión-imappop3smtp)

12. [Despliegue Híbrido (Vercel/NAS) & Consultas Ecuador (Cédula/RUC)](#12-despliegue-híbrido-vercelnas--consultas-ecuador-cédularuc)



---



## 1. Visión General & Arquitectura BaaS



NexusVault opera como una plataforma BaaS (*Backend-as-a-Service*) desacoplada y multi-tenant sobre MongoDB. Cada proyecto registrado posee aislamiento estricto de colecciones y usuarios.



🔒 **Ventaja Clave de Seguridad - CERO Apertura de Puertos TCP**:

NO es necesario abrir el puerto 27017 de MongoDB en routers, servidores cliente ni firewalls.

Todas las funcionalidades (Autenticación JWT, Firestore, Realtime SSE, Storage Bucket, Mail, Analytics y Webhooks) se ejecutan sobre HTTPS en la API REST https://api.accescont.com/api/v1/hackaton-ia-723.



---



## 2. Autenticación & Gestión de Usuarios (JWT Auth)

### 2.1 Registrar Nuevo Usuario
- **Método**: `POST`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/auth/signup`
- **Headers**:
  - `x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "PasswordSegura123!",
  "name": "Carlos Rodríguez",
  "role": "editor"
}
```
- **Respuesta (201 Created)**:
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_98127391",
    "email": "usuario@ejemplo.com",
    "name": "Carlos Rodríguez",
    "role": "editor",
    "createdAt": "2026-08-20T03:55:00.000Z"
  }
}
```

### 2.2 Iniciar Sesión (Obtener JWT Bearer Token)
- **Método**: `POST`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/auth/login`
- **Headers**:
  - `x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "PasswordSegura123!"
}
```

### 2.3 Consultar Usuarios Registrados
- **Método**: `GET`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/auth/users`
- **Headers**:
  - `x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu`

### 2.4 Actualizar Usuario (Email / Contraseña)
- **Método**: `PUT` / `PATCH`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/auth/users/:uid`
- **Headers**:
  - `x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "email": "nuevo.email@ejemplo.com",
  "password": "Nuevapassword123!"
}
```
- **Respuesta (200 OK)**:
```json
{
  "success": true,
  "user": {
    "uid": "usr_98127391",
    "email": "nuevo.email@ejemplo.com",
    "createdAt": "2026-08-20T03:55:00.000Z"
  }
}
```

### 2.5 Eliminar Usuario
- **Método**: `DELETE`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/auth/users/:uid`
- **Headers**:
  - `x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu`
- **Respuesta (200 OK)**:
```json
{
  "success": true,
  "message": "Usuario eliminado correctamente."
}
```

---

## 3. Base de Datos Documental (Firestore Database Engine)

### 3.1 Consultar Documentos de una Colección
- **Método**: `GET`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/data?collection=productos`
- **Headers**:
  - `x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu`
- **Respuesta**:
```json
{
  "status": "success",
  "collection": "productos",
  "count": 2,
  "data": [
    {
      "id": "doc_101",
      "nombre": "Laptop Pro 16",
      "precio": 1299.99,
      "stock": 15,
      "_created": "2026-08-20T03:55:00.000Z"
    }
  ]
}
```

### 3.2 Insertar Nuevo Documento
- **Método**: `POST`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/data`
- **Headers**:
  - `x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "collection": "productos",
  "data": {
    "nombre": "Monitor 4K 27 pulgadas",
    "precio": 450.00,
    "categoria": "Hardware",
    "stock": 30
  }
}
```

### 3.3 Actualizar Documento por ID
- **Método**: `PUT`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/data/{docId}?collection=productos`
- **Headers**:
  - `x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "precio": 420.00,
  "stock": 28
}
```

### 3.4 Eliminar Documento
- **Método**: `DELETE`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/data/{docId}?collection=productos`
- **Headers**:
  - `x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu`

---

## 4. Base de Datos en Tiempo Real (Realtime Database Stream)

### 4.1 Escribir / Actualizar Estado en Vivo (Node PUT)
- **Método**: `PUT`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/realtime/data?path=/sensores/temperatura`
- **Headers**:
  - `x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "valor": 26.4,
  "unidad": "Celsius",
  "dispositivo": "sensor_sala_01",
  "timestamp": "2026-08-20T03:55:00.000Z"
}
```

### 4.2 Leer Nodo en Tiempo Real
- **Método**: `GET`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/realtime/data?path=/sensores/temperatura`

### 4.3 Suscripción SSE (Server-Sent Events) en vivo
- **Método**: `GET`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/realtime/stream?path=/sensores`
- **Ejemplo JavaScript Client**:
```javascript
const eventSource = new EventSource('https://api.accescont.com/api/v1/hackaton-ia-723/realtime/stream?path=/sensores');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Cambio en tiempo real detectado:', data);
};
```

---

## 5. Almacenamiento de Archivos (Storage Bucket Engine)

### 5.1 Subir Archivo (Multipart Upload)
- **Método**: `POST`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/storage`
- **Headers**:
  - `x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu`
  - `Content-Type: multipart/form-data`
- **Form Data**: `file: <archivo_binario>`
- **Respuesta (201 Created)**:
```json
{
  "status": "success",
  "file": {
    "id": "file_mt22w33m0li3",
    "projectId": "hackaton-ia-723",
    "filename": "file_mt22w33m0li3-equipo.png",
    "originalname": "equipo.png",
    "mimetype": "image/png",
    "size": 431268,
    "url": "/uploads/hackaton-ia-723/file_mt22w33m0li3-equipo.png",
    "createdAt": "2026-08-20T22:14:46.450Z"
  },
  "url": "/uploads/hackaton-ia-723/file_mt22w33m0li3-equipo.png"
}
```

### 5.2 Lectura y Acceso Público a Archivos (HTTP / HTTPS CDN)
- **Método**: `GET`
- **URL de Acceso Directo**: `https://api.accescont.com/uploads/hackaton-ia-723/<filename>`
- **Ejemplo**: `https://api.accescont.com/uploads/hackaton-ia-723/file_mt22w33m0li3-equipo.png`
- **Descripción**: Entrega el archivo multimedia (imágenes, PDF, documentos, audios) con su `Content-Type` correcto y cabeceras de caché. Cuenta con resolución multi-entorno (Disco Local → Red LAN SMB NAS → HTTPS CDN) permitiendo visualizar archivos cargados desde desarrollo local o desde el NAS de producción sin errores 404.

### 5.3 Listar Archivos Subidos
- **Método**: `GET`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/storage/files`
- **Respuesta (200 OK)**:
```json
{
  "success": true,
  "projectId": "hackaton-ia-723",
  "files": [
    {
      "id": "file_mt22w33m0li3",
      "projectId": "hackaton-ia-723",
      "filename": "file_mt22w33m0li3-equipo.png",
      "originalname": "equipo.png",
      "mimetype": "image/png",
      "size": 431268,
      "url": "/uploads/hackaton-ia-723/file_mt22w33m0li3-equipo.png",
      "createdAt": "2026-08-20T22:14:46.450Z"
    }
  ]
}
```

### 5.4 Eliminar Archivo del Storage
- **Método**: `DELETE`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/storage/files?id=<fileId>`
- **Respuesta (200 OK)**:
```json
{
  "success": true,
  "projectId": "hackaton-ia-723",
  "fileId": "file_mt22w33m0li3"
}
```


---

## 6. Hosting CDN & Dominios Personalizados

- **URL de Hosting Directo**: `https://hackaton-ia-723.accescont.com`
- **Reglas de Reescritura (`nexus.json`)**:
```json
{
  "hosting": {
    "public": "public",
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```
- **Configuración DNS para Dominio Personalizado**:
  - **Registro A**: `192.168.68.141`
  - **Registro CNAME**: `api.accescont.com` (o `hackaton-ia-723.accescont.com`)

---

## 7. Webhooks & Notificaciones de Eventos

Configura una URL receptora en la pestaña **Configuración del proyecto -> Integraciones**. Cada cambio en la base de datos enviará una carga útil `HTTP POST`:

```json
{
  "event": "doc.created",
  "projectId": "hackaton-ia-723",
  "collection": "productos",
  "documentId": "doc_991823",
  "data": {
    "nombre": "Monitor 4K",
    "precio": 420.00
  },
  "timestamp": "2026-08-20T03:55:00.000Z"
}
```

---

## 8. Acceso Directo a MongoDB & Respaldos

Para administradores del sistema o herramientas externas (Compass, DBeaver, scripts Python/Node):
- **URI Conexión Pública (Dominio Cloudflare)**: `mongodb://admin_user_db:8SMma18*x8aRFSI%23YTj%23@mongo.accescont.com:27017/?authSource=admin`
- **URI Conexión Red Local (LAN)**: `mongodb://admin_user_db:8SMma18*x8aRFSI%23YTj%23@192.168.68.141:27017/?authSource=admin`
- **Comando mongodump (Respaldo público)**:
```bash
mongodump --host mongo.accescont.com --port 27017 --username admin_user_db --password "8SMma18*x8aRFSI#YTj#" --authenticationDatabase admin --out /backups
```
- **Comando mongorestore (Restauración pública)**:
```bash
mongorestore --host mongo.accescont.com --port 27017 --username admin_user_db --password "8SMma18*x8aRFSI#YTj#" --authenticationDatabase admin /backups
```

---

## 9. SDK JavaScript (`nexus-sdk.js`)

Descarga la librería desde `https://api.accescont.com/nexus-sdk.js` o inclúyela vía CDN:

```html
<script src="https://api.accescont.com/nexus-sdk.js"></script>
<script>
  const app = NexusVault.initializeApp({
    projectId: "hackaton-ia-723",
    apiKey: "nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu",
    databaseURL: "https://api.accescont.com/api/v1/hackaton-ia-723"
  });

  // Consultar colecciones
  app.firestore().collection('productos').get().then(res => {
    console.log('Productos:', res);
  });
</script>
```

---

## 10. Analytics & Telemetría (Eventos y Métricas)

### 10.1 Registrar Evento Personalizado de Analytics
- **Método**: `POST`
- **Endpoint**: `https://api.accescont.com/api/v1/hackaton-ia-723/analytics/events`
- **Headers**:
  - `x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "eventName": "button_click",
  "category": "UI_Interaction",
  "params": {
    "screen_name": "HomeDashboard",
    "button_id": "btn_checkout",
    "user_id": "usr_98127391"
  }
}
```
- **Respuesta (201 Created)**:
```json
{
  "status": "success",
  "message": "Evento de analítica registrado correctamente",
  "eventId": "evt_9918237"
}
```

### 10.2 Consultar Logs de Telemetría del Proyecto
- **Método**: `GET`
- **Endpoint**: `https://api.accescont.com/api/admin/logs?projectId=hackaton-ia-723`
- **Headers**:
  - `x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu`
- **Respuesta (200 OK)**:
```json
{
  "success": true,
  "logs": [
    {
      "id": "log_99182",
      "projectId": "hackaton-ia-723",
      "method": "POST",
      "endpoint": "/api/v1/hackaton-ia-723/data",
      "duration": 14,
      "status": "success",
      "timestamp": "2026-08-20T15:25:00.000Z"
    }
  ]
}
```

### 10.3 Tracking Automático desde el SDK JavaScript
```javascript
// Registrar eventos de analítica desde tu app frontend
app.analytics().logEvent('page_view', { page_title: 'Catálogo de Productos' });
app.analytics().logEvent('purchase_completed', { item_count: 3, total_amount: 149.99 });
```


---

## 11. Plataforma de Email & Conexión IMAP/POP3/SMTP

### 11.1 Servidores Centralizados Universales
- **Host IMAP (Entrada)**: imap.accescont.com (Puerto 993, Cifrado SSL/TLS)
- **Host POP3 (Descarga)**: pop.accescont.com (Puerto 995, Cifrado SSL/TLS)
- **Host SMTP (Salida)**: smtp.accescont.com (Puerto 587, Cifrado STARTTLS/TLS)
- **Respaldo LAN Local**: 192.168.68.141

> 🔒 **Aislamiento Multi-Tenant**: Cada cuenta de correo (ventas@dominio.com) accede de forma aislada a su propio buzón.

### 11.2 Consultar Configuración Mail del Proyecto
- **Método**: GET
- **Endpoint**: https://api.accescont.com/api/v1/hackaton-ia-723/mail
- **Headers**: x-api-key: nx_live_9b77di3dk014tx0ji33a01y2bzwqegnu

### 11.3 Probar Conexión Socket IMAP / POP3 / SMTP en Vivo
- **Método**: POST
- **Endpoint**: https://api.accescont.com/api/v1/hackaton-ia-723/mail/test

### 11.4 Administrar Cuentas / Buzones de Correo
- **Listar Buzones**: GET https://api.accescont.com/api/v1/hackaton-ia-723/mail/accounts
- **Crear Buzón**: POST https://api.accescont.com/api/v1/hackaton-ia-723/mail/accounts
- **Eliminar Buzón**: DELETE https://api.accescont.com/api/v1/hackaton-ia-723/mail/accounts?id=<mailboxId>

---

## 12. Despliegue Híbrido (Vercel/NAS) & Consultas Ecuador (Cédula/RUC)

### 12.1 Manifest `nexus.json` del Proyecto
Cada proyecto debe definir su manifest en la raíz:
```json
{
  "projectId": "hackaton-ia-723",
  "appName": "hackaton-ia",
  "version": "1.0.1",
  "api": {
    "endpoint": "https://api.accescont.com/api/v1/hackaton-ia-723"
  },
  "hosting": {
    "targetUrl": "https://hackaton-ia-723.accescont.com"
  }
}
```

### 12.2 Cliente Híbrido (`consultarCedula` / `consultarRuc`)
```typescript
import { consultarCedula, consultarRuc } from '@/lib/nexus';

// Consulta de Cédula (Registro Civil, ANT, SRI)
const resCedula = await consultarCedula('0105246318');

// Consulta de RUC (SRI & SuperCías)
const resRuc = await consultarRuc('0105246318001');
```
-- Intenta primero la ruta local `/api/consultar-cedula` (en Vercel/SSR) y realiza fallback automático a `https://api.accescont.com/api/v1/hackaton-ia-723/cedula` en Hosting Estático.

### 12.3 Despliegue Frontend a NexusVault Hosting
```bash
node scripts/deploy-hosting.mjs
```

### 12.4 Despliegue Backend al Synology NAS (`db-mongo-docker`)
```bash
npm run deploy
```
Ejecuta `deploy-nas.mjs` sincronizando el código fuente con Robocopy (`/XD node_modules .next .git data dist releases cache`) y reconstruye el contenedor Docker en el NAS vía SSH.

---

*Manual generado automáticamente por el Motor NexusVault BaaS & Synology NAS Docker Server.*