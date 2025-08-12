# Tests Structure

Esta carpeta contiene toda la infraestructura de testing organizada para SentimentalSocial.

## 📁 Estructura

```
tests/
├── api/                     # Tests de integración para endpoints
│   └── endpoints.test.ts    # Tests de API endpoints
├── services/                # Tests unitarios de servicios
│   ├── tweet-sentiment-analysis.test.ts
│   └── twitter-auth-manager.test.ts
├── scripts/                 # Scripts de testing manual
│   ├── test-endpoints.ps1
│   ├── test-enhanced-simple.ps1
│   └── test-enhanced-system.ps1
├── utils/                   # Utilidades para tests
│   └── test-helpers.ts      # Helpers para crear objetos de test
├── setup-env.js            # Configuración de variables de entorno
└── setup.ts                # Configuración global de Jest
```

## 🧪 Tipos de Tests

### Tests Unitarios (`npm run test:unit`)

- Servicios individuales
- Lógica de negocio aislada
- Rápidos y confiables

### Tests de Integración (`npm run test:integration`)

- Endpoints de API
- Flujos completos
- Interacción entre componentes

### Scripts Manuales (`tests/scripts/`)

- Verificación manual de endpoints
- Tests de carga
- Validación de sistema completo

## 🚀 Comandos

```bash
npm test                 # Todos los tests
npm run test:unit        # Solo tests unitarios
npm run test:integration # Solo tests de integración
npm run test:coverage    # Con cobertura
npm run test:watch       # Modo watch
```

## 📋 Reglas

1. **Tests unitarios** van en `services/`
2. **Tests de API** van en `api/`
3. **Scripts manuales** van en `scripts/`
4. **Utilidades compartidas** van en `utils/`
5. **NO crear archivos de test en la raíz del proyecto**
