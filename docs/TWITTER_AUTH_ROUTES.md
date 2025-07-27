# Twitter Authentication API Routes

## Resumen del Sistema de Autenticación de Twitter

El sistema de autenticación de Twitter está separado del scraping principal y permite a los usuarios gestionar sus sesiones de Twitter de forma independiente.

### 🔗 Rutas Principales de Scraping

#### Rutas Existentes:
1. **POST `/api/v1/scraping/hashtag`** - Scraping por hashtag
2. **POST `/api/v1/scraping/user`** - Scraping de perfil de usuario  
3. **POST `/api/v1/scraping/search`** - Búsqueda general
4. **GET `/api/v1/scraping/status`** - Estado del scraper

#### Sistema Híbrido:
- **Scraper Real**: Intenta usar Twitter real con cookies
- **Fallback Automático**: Si falla la autenticación, usa datos mock
- **Sin Bloqueo**: Las rutas funcionan con o sin autenticación de Twitter

---

## 🔐 Nuevas Rutas de Autenticación de Twitter

### Base URL: `/api/v1/twitter-auth`

Todas las rutas requieren autenticación de usuario (`Bearer Token`).

#### 1. **POST `/login`**
- **Descripción**: Autenticación con credenciales de Twitter
- **Cuerpo**: No requiere parámetros (usa variables de entorno)
- **Respuesta**:
```json
{
  "success": true,
  "message": "Twitter authentication successful",
  "cookiesSaved": true
}
```

#### 2. **POST `/import-cookies`**
- **Descripción**: Importar cookies extraídas manualmente del navegador
- **Cuerpo**: 
```json
{
  "cookiesFilePath": "path/to/manual-cookies.json"
}
```
- **Funcionalidad**: Importa desde `manual-cookies.json`

#### 3. **GET `/status`**
- **Descripción**: Verificar estado de autenticación de Twitter
- **Respuesta**:
```json
{
  "success": true,
  "authenticated": true,
  "cookieCount": 10,
  "sessionValid": true
}
```

#### 4. **POST `/logout`**
- **Descripción**: Cerrar sesión y limpiar cookies de Twitter
- **Respuesta**:
```json
{
  "success": true,
  "message": "Twitter logout successful"
}
```

#### 5. **GET `/validate-cookies`**
- **Descripción**: Validar si las cookies actuales funcionan
- **Respuesta**:
```json
{
  "success": true,
  "message": "Cookies are valid",
  "valid": true
}
```

#### 6. **GET `/session-info`**
- **Descripción**: Información detallada de la sesión
- **Respuesta**:
```json
{
  "success": true,
  "sessionInfo": {
    "authenticated": true,
    "cookieCount": 10,
    "hasManualCookies": true,
    "cookieNames": ["auth_token", "ct0", "guest_id", "..."],
    "timestamp": "2025-07-23T..."
  }
}
```

---

## 🛠️ Middleware de Autenticación de Twitter

### Archivos Creados:
- `src/middleware/twitter-auth.ts`

### Funciones Disponibles:

#### 1. `checkTwitterAuth` (Opcional)
- Añade información de autenticación de Twitter al request
- **No bloquea** la petición si no hay autenticación
- Útil para saber el estado sin forzar autenticación

#### 2. `requireTwitterAuth` (Obligatorio)
- **Bloquea** la petición si no hay autenticación de Twitter
- Devuelve error 401 con mensaje informativo
- Útil para rutas que requieren Twitter obligatoriamente

#### 3. `TwitterAuthStatus.getStatus()` (Utilidad)
- Función estática para obtener estado de autenticación
- Útil para checks internos

---

## 🔄 Flujo de Trabajo Propuesto

### Para Desarrolladores:
1. **Configurar Credenciales**:
   ```bash
   # .env.local
   TWITTER_USERNAME=tu_usuario
   TWITTER_PASSWORD=tu_password
   TWITTER_EMAIL=tu_email
   ```

2. **Autenticarse con Twitter**:
   ```bash
   POST /api/v1/twitter-auth/login
   ```

3. **Usar Scraping**:
   ```bash
   POST /api/v1/scraping/hashtag
   # Usará scraper real si hay autenticación
   # Fallback a mock si no hay autenticación
   ```

### Para Usuarios con Cookies Manuales:
1. **Extraer Cookies del Navegador**
2. **Llenar `manual-cookies.json`**
3. **Importar Cookies**:
   ```bash
   POST /api/v1/twitter-auth/import-cookies
   ```

---

## 🎯 Ventajas del Sistema Separado

### ✅ **Beneficios**:
1. **Independencia**: Autenticación separada del scraping
2. **Flexibilidad**: Rutas funcionan con o sin Twitter
3. **Fallback Automático**: Nunca falla completamente
4. **Control Granular**: Usuarios eligen cuándo autenticarse
5. **Debugging**: Rutas específicas para verificar estado
6. **Escalabilidad**: Fácil añadir nuevos métodos de auth

### 🔧 **Casos de Uso**:
- **Desarrollo**: Usar mock data sin configurar Twitter
- **Producción**: Usar datos reales con autenticación
- **Testing**: Verificar ambos flujos
- **Demo**: Mostrar funcionalidad sin credenciales

---

## 📝 Próximos Pasos Sugeridos

1. **Testing**: Probar todas las rutas nuevas
2. **Documentación**: Actualizar Swagger con nuevas rutas
3. **Frontend**: Crear interfaz para gestión de autenticación
4. **Monitoring**: Añadir logs para tracking de autenticación
5. **Rate Limiting**: Implementar límites específicos por tipo de auth

El sistema está listo para usar y es completamente compatible con el código existente.
