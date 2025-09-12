# Scripts de Persistencia de Jobs

Este directorio contiene scripts utilitarios para trabajar con el nuevo sistema de persistencia de jobs implementado en la aplicación.

## 📋 Scripts Disponibles

### 1. `test-job-persistence.js`
**Propósito**: Script de demostración y prueba del sistema de persistencia.

**Uso**:
```bash
node scripts/test-job-persistence.js
```

**Qué hace**:
- ✅ Crea varios jobs de prueba con diferentes tipos
- 📊 Demuestra las APIs híbridas (memoria + base de datos)
- 📈 Muestra estadísticas avanzadas del sistema
- 🔍 Obtiene historial detallado de jobs
- 🔧 Prueba filtros y paginación

**Requisitos**:
- Servidor ejecutándose en `localhost:3001`
- Base de datos MongoDB conectada

### 2. `job-persistence-utils.js`
**Propósito**: Utilidades de administración y mantenimiento.

**Uso**:
```bash
node scripts/job-persistence-utils.js [comando]
```

**Comandos disponibles**:

#### `stats` - Estadísticas detalladas
```bash
node scripts/job-persistence-utils.js stats
```
Muestra estadísticas completas del sistema:
- Estado de la cola de jobs
- Métricas de la base de datos
- Distribución por estado, tipo y campaña

#### `export` - Exportar datos
```bash
node scripts/job-persistence-utils.js export
```
Exporta todos los jobs a un archivo JSON con:
- Metadata de exportación
- Resúmenes estadísticos
- Datos completos de jobs

#### `test` - Prueba de conectividad
```bash
node scripts/job-persistence-utils.js test
```
Verifica que todos los servicios estén funcionando:
- Conectividad del servidor
- APIs de jobs
- Endpoints de estadísticas

#### `cleanup` - Limpieza (documentación)
```bash
node scripts/job-persistence-utils.js cleanup
```
Muestra guía para implementar limpieza automática de jobs antiguos.

#### `help` - Ayuda
```bash
node scripts/job-persistence-utils.js help
```

## 🚀 Inicio Rápido

1. **Asegurar que el servidor esté ejecutándose**:
   ```bash
   npm run dev
   ```

2. **Probar el sistema de persistencia**:
   ```bash
   node scripts/test-job-persistence.js
   ```

3. **Ver estadísticas del sistema**:
   ```bash
   node scripts/job-persistence-utils.js stats
   ```

## 📊 Funcionalidades Demostradas

### Sistema Híbrido
Los scripts demuestran el nuevo sistema híbrido que combina:
- **Datos en memoria**: Jobs activos en la cola
- **Datos persistentes**: Jobs almacenados en MongoDB
- **APIs unificadas**: Respuestas que combinan ambas fuentes

### Métricas Avanzadas
- 📈 Estadísticas de rendimiento
- 🎯 Análisis por campaña
- 📊 Distribución por estado y tipo
- 🔍 Historial detallado de jobs

### Administración
- 🧹 Guías de limpieza
- 📤 Exportación de datos
- 🔗 Pruebas de conectividad
- 📋 Monitoreo del sistema

## 🔧 Configuración de Dependencias

Los scripts requieren `axios` para hacer llamadas HTTP:

```bash
npm install axios
```

## 📝 Ejemplos de Salida

### Prueba de Persistencia:
```
🧪 Probando persistencia de jobs...

📝 Paso 1: Creando jobs de prueba...
✅ Job creado: hashtag:"tecnologia" (12345678...)
✅ Job creado: user:"elonmusk" (87654321...)

📋 Paso 2: Obteniendo lista de jobs (datos híbridos)...
📊 Jobs encontrados: 15
📂 Fuentes de datos:
   - Memoria (activos): 3
   - Base de datos: 12
   - Total: 15
```

### Estadísticas Detalladas:
```
📊 Estadísticas detalladas del sistema...

🔄 ESTADO DE LA COLA:
   Activos: 2
   En espera: 1
   Completados: 45
   Fallidos: 3

💾 BASE DE DATOS:
   Total jobs: 48
   Tweets recolectados: 12,450
   Análisis realizados: 11,890
```

## 🛠️ Personalización

### Añadir Nuevas Pruebas
Para añadir nuevas pruebas al script de persistencia:

1. Edita `test-job-persistence.js`
2. Añade tu función de prueba
3. Inclúyela en la secuencia principal

### Crear Nuevas Utilidades
Para crear nuevas utilidades administrativas:

1. Edita `job-persistence-utils.js`
2. Añade tu comando al objeto `commands`
3. Implementa la función correspondiente

## 🐛 Solución de Problemas

### Error de Conexión
```
❌ Error: ECONNREFUSED
```
**Solución**: Verificar que el servidor esté ejecutándose en `localhost:3001`

### Sin Datos en Base de Datos
```
📊 Total jobs históricos: 0
```
**Solución**: Crear algunos jobs primero usando la API o el script de prueba

### Timeout en Pruebas
```
⚠️ Estadísticas: Error (TIMEOUT)
```
**Solución**: Verificar la conectividad de MongoDB y reiniciar el servidor

## 📚 Documentación Relacionada

- [Guía de Persistencia de Jobs](../docs/JOB_PERSISTENCE_GUIDE.md)
- [Documentación de APIs](../docs/api-docs.md)
- [Arquitectura del Sistema](../docs/arquitectura.md)

## 🔮 Futuras Mejoras

- [ ] Implementar endpoint de limpieza automática
- [ ] Añadir métricas de rendimiento en tiempo real
- [ ] Crear dashboard web para monitoreo
- [ ] Implementar alertas automáticas
- [ ] Añadir exportación a diferentes formatos (CSV, Excel)