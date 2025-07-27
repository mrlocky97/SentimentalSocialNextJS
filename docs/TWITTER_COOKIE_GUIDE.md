/**
 * Manual Twitter Cookie Extraction Guide
 * Step-by-step guide to manually extract Twitter cookies for scraping
 */

# 🍪 **Guía para Obtener Cookies de Twitter Manualmente**

## **Método 1: Usando el Navegador (Recomendado)**

### **Paso 1: Login Manual en Twitter**
1. Abre tu navegador (Chrome, Firefox, Edge)
2. Ve a https://twitter.com
3. Haz login con tus credenciales normalmente
4. Asegúrate de que estés completamente logueado

### **Paso 2: Extraer Cookies del Navegador**

#### **Para Chrome/Edge:**
1. Presiona `F12` para abrir DevTools
2. Ve a la pestaña **Application** (o **Aplicación**)
3. En el panel izquierdo, expande **Storage** → **Cookies** → **https://twitter.com**
4. Verás una lista de cookies. Las importantes son:
   - `auth_token`
   - `ct0`
   - `twid`
   - `_twitter_sess`
   - Cualquier cookie que contenga "auth" o "session"

#### **Para Firefox:**
1. Presiona `F12` para abrir DevTools
2. Ve a la pestaña **Storage**
3. Expande **Cookies** → **https://twitter.com**
4. Copia las mismas cookies mencionadas arriba

### **Paso 3: Crear archivo cookies.json**

Crea un archivo llamado `cookies.json` en la raíz del proyecto con este formato:

```json
{
  "cookies": [
    {
      "name": "auth_token",
      "value": "TU_AUTH_TOKEN_AQUI",
      "domain": ".twitter.com",
      "path": "/",
      "httpOnly": true,
      "secure": true,
      "sameSite": "None"
    },
    {
      "name": "ct0",
      "value": "TU_CT0_TOKEN_AQUI",
      "domain": ".twitter.com",
      "path": "/",
      "httpOnly": false,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "twid",
      "value": "TU_TWID_AQUI",
      "domain": ".twitter.com",
      "path": "/",
      "httpOnly": true,
      "secure": true,
      "sameSite": "None"
    }
  ],
  "timestamp": TIMESTAMP_ACTUAL,
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "isValid": true,
  "expirationTime": TIMESTAMP_EXPIRACION
}
```

### **Paso 4: Usar nuestro helper para importar**

Una vez que tengas el archivo cookies.json:

```bash
npm run auth import cookies.json
```

---

## **Método 2: Usando Extension del Navegador**

### **Cookie Editor Extension (Recomendado)**

1. Instala la extensión "Cookie Editor" en Chrome/Firefox
2. Ve a twitter.com y haz login
3. Haz clic en la extensión Cookie Editor
4. Exporta todas las cookies como JSON
5. Guarda el archivo como `cookies.json`

---

## **Método 3: Copiar desde tu Otro Proyecto**

Si ya tienes cookies funcionando en otro proyecto:

```bash
# Copia el archivo cookies.json de tu otro proyecto
npm run auth import /ruta/a/tu/otro/proyecto/cookies.json
```

---

## **Comandos de la Herramienta de Autenticación**

```bash
# Ver estado actual
npm run auth status

# Intentar login automático (puede fallar por bloqueos)
npm run auth login

# Importar cookies desde archivo
npm run auth import /ruta/a/cookies.json

# Probar cookies existentes
npm run auth test

# Limpiar sesión
npm run auth clear

# Ver ayuda
npm run auth
```

---

## **¿Qué hacer después de obtener las cookies?**

1. **Verificar que funcionan:**
   ```bash
   npm run auth test
   ```

2. **Comprobar el estado:**
   ```bash
   npm run auth status
   ```

3. **Probar el scraping real:**
   - Iniciar el servidor: `npm run dev`
   - Probar endpoint: `GET /api/v1/scraping/status`
   - Hacer scraping: `POST /api/v1/scraping/hashtag`

---

## **Consejos Importantes**

🔐 **Seguridad:**
- Las cookies son sensibles, no las compartas
- El archivo cookies.json está en .gitignore automáticamente
- Las cookies expiran, necesitarás renovarlas ocasionalmente

⏰ **Duración:**
- Las cookies de Twitter suelen durar 24-48 horas
- El sistema detecta automáticamente cuando expiran
- Puedes volver a hacer login manual cuando sea necesario

🛡️ **Detección:**
- Twitter detecta patrones automatizados
- Usar cookies reales reduce mucho la detección
- Mantén los delays entre requests (configurado automáticamente)

---

## **Solución de Problemas**

**Error "Forbidden":**
- Es normal al intentar login automático
- Usa el método manual de cookies

**Cookies no funcionan:**
- Asegúrate de que están recientes (menos de 24 horas)
- Verifica que copiaste todos los campos correctamente
- Prueba hacer login manual de nuevo

**Rate limiting:**
- El sistema tiene protecciones automáticas
- Espera unos minutos entre intentos
- Las cookies válidas reducen mucho los rate limits
