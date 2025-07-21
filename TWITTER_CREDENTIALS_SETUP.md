# Configuración de Credenciales de Twitter para Twikit

## 🔐 ¿Por qué necesito credenciales de Twitter?

**Twikit** es una librería que realiza web scraping de Twitter simulando un navegador real. Para acceder a los datos de Twitter, necesita autenticarse con una cuenta de Twitter válida.

## 📋 Credenciales Requeridas

### Variables de Entorno Necesarias:

```bash
# Credenciales básicas de Twitter
TWITTER_USERNAME=tu_usuario_de_twitter
TWITTER_PASSWORD=tu_contraseña_de_twitter  
TWITTER_EMAIL=tu_email_de_twitter@ejemplo.com

# Opcional: Si tienes 2FA activado
TWITTER_2FA_SECRET=tu_secreto_2fa_si_lo_tienes
```

## 🎯 Pasos para Configurar

### 1. **Cuenta de Twitter**
- Necesitas una cuenta de Twitter **válida y activa**
- La cuenta debe poder hacer login normalmente
- **No necesitas** una cuenta de desarrollador de Twitter
- **No necesitas** API keys oficiales

### 2. **Configurar Variables de Entorno**

Edita el archivo `.env.local` en la raíz del proyecto:

```bash
# ========================================
# TWITTER SCRAPING CONFIGURATION (Twikit)
# ========================================

# REQUIRED: Credenciales de tu cuenta de Twitter
TWITTER_USERNAME=mi_usuario_twitter
TWITTER_PASSWORD=mi_contraseña_super_secreta
TWITTER_EMAIL=mi_email@gmail.com

# OPTIONAL: Solo si tienes 2FA activado
TWITTER_2FA_SECRET=ABCD1234EFGH5678
```

### 3. **Seguridad**
- ⚠️ **NUNCA** subas el archivo `.env.local` a Git
- ⚠️ **NUNCA** compartas tus credenciales
- ✅ El archivo `.env.local` está en `.gitignore`
- ✅ Usa una cuenta secundaria si prefieres más seguridad

## ⚙️ ¿Cómo Funciona?

1. **Twikit** usa tus credenciales para hacer login en Twitter
2. Simula un navegador real para evitar detección
3. Extrae datos públicos de tweets, usuarios, hashtags
4. No viola términos de servicio (datos públicos)
5. Incluye rate limiting automático

## 🚨 Problemas Comunes

### Error: "Authentication failed"
```bash
❌ Authentication/scraping failed: Invalid credentials
```
**Solución**: Verifica que tu usuario/contraseña sean correctos

### Error: "Account locked"
```bash
❌ Account locked or suspended
```
**Solución**: Twitter detectó actividad sospechosa. Espera o usa otra cuenta.

### Error: "2FA required"
```bash
❌ Two-factor authentication required
```
**Solución**: Agrega `TWITTER_2FA_SECRET` a tu `.env.local`

### Error: "Rate limiting"
```bash
❌ Rate limiting from Twitter
```
**Solución**: Espera unos minutos. Twikit incluye delays automáticos.

## 🔧 Modo Mock vs Real

### Modo Mock (Por defecto)
- ✅ Funciona sin credenciales
- ✅ Genera datos falsos pero realistas
- ✅ Perfecto para desarrollo y pruebas
- ⚠️ No son datos reales de Twitter

### Modo Real (Con credenciales)
- ✅ Datos reales de Twitter
- ✅ Tweets, usuarios, métricas reales
- ⚠️ Requiere credenciales válidas
- ⚠️ Sujeto a rate limits de Twitter

## 🛡️ Alternativas para Desarrollo

Si no quieres usar tu cuenta personal:

1. **Crear cuenta secundaria**: Crea una cuenta de Twitter solo para desarrollo
2. **Usar modo mock**: El sistema funciona perfectamente con datos simulados
3. **Cuenta compartida**: Usa una cuenta de equipo (con precaución)

## 📊 Estado Actual

```bash
# Para verificar si las credenciales están configuradas:
npm run test:scraping

# Si ves esto, las credenciales funcionan:
✅ Successfully authenticated with Twitter

# Si ves esto, está usando modo mock:
⚠️ Using mock scraper (twid not available)
```

## 💡 Recomendaciones

- **Para desarrollo**: Usa modo mock
- **Para producción**: Configura credenciales reales
- **Para demos**: Modo mock funciona perfectamente
- **Para datos reales**: Credenciales son necesarias

---

¿Necesitas ayuda configurando las credenciales? ¡El sistema funciona perfectamente en modo mock para desarrollo! 🚀
