# 🔄 Plan de Refactorización de Archivos Experimentales

## 📋 Propuesta de Reorganización

### **Fase 1: Promover a Sistema Principal**
```
src/experimental/naive-bayes.model.ts 
    ↓ MOVER A ↓
src/models/naive-bayes.model.ts
```

### **Fase 2: Crear Módulo de Evaluación**
```
src/experimental/model-evaluation.service.ts
src/experimental/visualization.service.ts
    ↓ MOVER A ↓
src/services/evaluation/
├── model-evaluation.service.ts
├── visualization.service.ts
└── index.ts
```

### **Fase 3: Actualizar Imports**
Actualizar todas las importaciones en:
- `src/services/hybrid-sentiment-analysis.service.ts`
- `src/scripts/*.ts`
- `src/data/*.ts`
- Otros archivos que importen desde experimental

### **Fase 4: Opcional - Eliminar Rutas Experimentales**
Si no necesitas los endpoints de evaluación:
```
src/routes/experimental.routes.ts ❌ ELIMINAR
```
Y quitar del servidor:
```typescript
// En src/server.ts - ELIMINAR estas líneas:
import experimentalRoutes from './routes/experimental.routes';
app.use('/api/v1/experimental', experimentalRoutes);
```
