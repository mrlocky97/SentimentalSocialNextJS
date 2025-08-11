# Diagrama de Arquitectura: Sistema Unificado de Análisis de Sentimiento

```mermaid
graph TD
    A[API Cliente] --> B[SentimentService]
    B --> C[Orquestador]

    C --> D[Engine: Naive Bayes]
    C --> E[Engine: Reglas]
    C --> F[Engine: Híbrido]

    D --> G[Caché]
    E --> G
    F --> G

    G --> H[(Base de Datos)]

    C --> I[Normalización]
    I --> J[Mappers]

    K[Tweet Original] --> I
    I --> L[Tweet Normalizado]
    L --> C

    C --> M[Resultados]
    M --> N[Enriquecimiento]
    N --> O[Tweet con Análisis]

    subgraph "Arquitectura Modular"
        C
        D
        E
        F
    end

    subgraph "Capa de Compatibilidad"
        I
        J
    end

    subgraph "Optimización"
        G
    end

    style C fill:#f9f,stroke:#333,stroke-width:2px
    style G fill:#bbf,stroke:#333,stroke-width:2px
    style I fill:#bfb,stroke:#333,stroke-width:2px
```

## Descripción de Componentes

### 1. Orquestador Central

- Gestiona múltiples motores de análisis
- Decide qué motor utilizar según contexto
- Combina resultados para mejorar precisión

### 2. Motores de Análisis

- **Naive Bayes**: Rápido, entrenado con datos históricos
- **Reglas**: Análisis lingüístico avanzado
- **Híbrido**: Combina métodos para máxima precisión

### 3. Sistema de Caché

- Evita análisis redundantes
- Almacena resultados por ID de tweet
- Configurable por tiempo de expiración

### 4. Normalización

- Convierte formatos antiguos y nuevos
- Garantiza compatibilidad con sistemas existentes
- Mappers para transformación bidireccional

### 5. Enriquecimiento

- Añade resultados de análisis a tweets
- Genera estadísticas agregadas
- Proporciona insights de marketing
