# SentimentalSocial API - Postman Collections

Este directorio contiene las colecciones de Postman completas para probar todos los endpoints de la API de SentimentalSocial.

## 📋 Archivos Incluidos

### Colecciones

1. **SentimentalSocial-Complete.postman_collection.json**
   - Colección completa con todos los endpoints organizados por categorías
   - Incluye ejemplos de uso para cada endpoint
   - Tests automáticos para validar respuestas

2. **SentimentalSocial-AutomatedTests.postman_collection.json**
   - Suite de tests automatizados para probar la API completa
   - Ejecuta un flujo completo de registro → login → pruebas → logout
   - Perfecto para testing de integración continua

3. **47374584-a2cb7156-76aa-4663-a258-df1f07264e83.json**
   - Colección original (mantener como backup)

### Entornos

1. **SentimentalSocial-Complete.postman_environment.json**
   - Entorno actualizado con todas las variables necesarias
   - Incluye tokens, URLs, y datos de prueba

2. **SentimentalSocial-Dev.postman_environment.json**
   - Entorno original (mantener como backup)

## 🚀 Cómo Usar

### 1. Importar en Postman

1. Abre Postman
2. Click en "Import"
3. Arrastra y suelta los archivos .json o selecciona "Upload Files"
4. Importa tanto las colecciones como el entorno

### 2. Configurar el Entorno

1. Selecciona el entorno "SentimentalSocial-Complete-Environment"
2. Verifica que `baseUrl` esté configurado como `http://localhost:3001`
3. Las demás variables se auto-completarán durante el uso

### 3. Ejecutar Tests Automatizados

Para una prueba rápida de toda la API:

1. Asegúrate de que el servidor esté corriendo (`npm run debug:prod`)
2. Selecciona la colección "SentimentalSocial - Automated Test Suite"
3. Click en "Run collection"
4. Ejecuta toda la colección para un test completo

### 4. Usar la Colección Completa

Para testing manual detallado:

1. Selecciona "SentimentalSocial API - Complete Collection"
2. Comienza con la sección "🔐 AUTHENTICATION"
3. Ejecuta "Register User" y luego "Login User"
4. Los tokens se guardarán automáticamente
5. Explora las demás secciones según necesites

## 📚 Estructura de Endpoints

### 🔐 Authentication

- `POST /auth/register` - Registrar usuario
- `POST /auth/login` - Iniciar sesión
- `POST /auth/logout` - Cerrar sesión
- `POST /auth/refresh` - Renovar token

### 👤 User Management

- `GET /users/profile` - Obtener perfil
- `PUT /users/profile` - Actualizar perfil
- `DELETE /users/{id}` - Eliminar cuenta

### 🔒 Security

- `GET /security/status` - Estado de seguridad
- `POST /security/blacklist-token` - Añadir token a lista negra

### 🎯 Sentiment Analysis

- `POST /sentiment/analyze` - Analizar texto individual
- `POST /sentiment/analyze-batch` - Analizar múltiples textos
- `GET /sentiment/model-status` - Estado del modelo

### 🐦 Twitter Scraping

- `GET /scraping/status` - Estado del scraping
- `POST /scraping/hashtag` - Scraping por hashtag
- `POST /scraping/user` - Scraping por usuario
- `POST /scraping/search` - Scraping por búsqueda

### 🔑 Twitter Auth

- `GET /twitter-auth/status` - Estado de autenticación Twitter
- `POST /twitter-auth/validate` - Validar cookies
- `GET /twitter-auth/session-info` - Información de sesión

### 📊 Campaigns

- `GET /campaigns` - Listar campañas
- `POST /campaigns` - Crear campaña
- `GET /campaigns/{id}` - Obtener campaña
- `PUT /campaigns/{id}` - Actualizar campaña
- `DELETE /campaigns/{id}` - Eliminar campaña

### 📋 Templates

- `GET /templates` - Listar plantillas
- `POST /templates` - Crear plantilla
- `GET /templates/{id}` - Obtener plantilla
- `POST /templates/{id}/create-campaign` - Crear campaña desde plantilla

### ⚙️ Admin (Solo Administradores)

- `GET /admin/database/health` - Salud de base de datos
- `GET /admin/users` - Listar todos los usuarios
- `DELETE /admin/users/{id}` - Eliminar usuario
- `POST /admin/clear-users` - Limpiar usuarios (PELIGROSO)

### 🏥 System Health

- `GET /health` - Chequeo básico
- `GET /api/v1/health` - Chequeo de API

## 🔧 Variables de Entorno

| Variable       | Descripción                         | Valor por Defecto       |
| -------------- | ----------------------------------- | ----------------------- |
| `baseUrl`      | URL base del servidor               | `http://localhost:3001` |
| `apiVersion`   | Versión de la API                   | `v1`                    |
| `authToken`    | Token JWT (auto-generado)           | -                       |
| `refreshToken` | Token de renovación (auto-generado) | -                       |
| `userId`       | ID del usuario (auto-generado)      | -                       |
| `userEmail`    | Email de prueba                     | `admin@test.com`        |
| `userPassword` | Contraseña de prueba                | `AdminPassword123!`     |
| `testHashtag`  | Hashtag para testing                | `test`                  |
| `testUsername` | Usuario para testing                | `elonmusk`              |
| `maxTweets`    | Máximo tweets a extraer             | `10`                    |
| `campaignId`   | ID de campaña para testing          | -                       |
| `templateId`   | ID de plantilla para testing        | -                       |

## 🧪 Testing Automático

### Tests Incluidos

- ✅ Registro y autenticación de usuarios
- ✅ Validación de roles (admin)
- ✅ Salud de base de datos
- ✅ Estado de seguridad
- ✅ Análisis de sentimientos
- ✅ Gestión de campañas
- ✅ Plantillas y templates
- ✅ Estado de scraping
- ✅ Autenticación Twitter

### Flujo de Testing

1. **Setup**: Registra usuario admin y hace login
2. **Core Tests**: Prueba funcionalidades principales
3. **Integration Tests**: Crea y gestiona recursos
4. **Cleanup**: Cierra sesión y limpia tokens

## 🚨 Notas Importantes

1. **Servidor Requerido**: Asegúrate de que el servidor esté corriendo en `localhost:3001`
2. **Rate Limiting**: El servidor tiene limitación de requests. Si obtienes error 429, espera 15 minutos o reinicia el servidor
3. **Tokens Admin**: Para endpoints de admin, necesitas un usuario con rol "admin"
4. **Credenciales Twitter**: Los endpoints de scraping requieren configuración Twitter válida
5. **Base de Datos**: Los tests crean datos reales en la base de datos

## 🔄 Mantenimiento

Para mantener las colecciones actualizadas:

1. Exporta las colecciones desde Postman después de hacer cambios
2. Actualiza este README si añades nuevos endpoints
3. Verifica que los tests automatizados sigan funcionando
4. Mantén sincronizadas las variables de entorno

## 🆘 Solución de Problemas

### Error 401 - No autorizado

- Verifica que el token esté configurado
- Ejecuta el login para renovar el token
- Verifica que el usuario tenga los permisos necesarios

### Error 429 - Rate Limit

- Espera 15 minutos o reinicia el servidor
- Usa menos requests simultáneos

### Error 404 - Endpoint no encontrado

- Verifica que el servidor esté corriendo
- Verifica la URL base en las variables de entorno
- Verifica que el endpoint exista en el servidor

### Error 500 - Error del servidor

- Revisa los logs del servidor
- Verifica que la base de datos esté conectada
- Verifica que todas las dependencias estén instaladas

¡Feliz testing! 🎉
