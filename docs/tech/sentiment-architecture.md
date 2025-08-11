# Sentiment Architecture: Engine, Orchestrator, Adapters

This document describes the target architecture to remove duplication between sentiment-related services.

## Overview

- Engine: Pure analysis library. No I/O. Deterministic.
- Orchestrator: Coordinates inputs/outputs, validation, caching, persistence, and timeouts.
- Adapters: Model repo, cache, and mappers (Tweet <-> AnalysisRequest, AnalysisResult <-> API DTO).
- Facade: Backward compatible surface until callers migrate.

## Packages/Modules

- src/lib/sentiment/engine.ts
- src/lib/sentiment/orchestrator.ts
- src/lib/sentiment/mappers.ts
- src/lib/sentiment/types.ts

## Types

```ts
export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'unknown';

export interface AnalysisRequest {
  text: string;
  language?: LanguageCode;
  allowSarcasmDetection?: boolean;
  allowContextWindow?: boolean;
  maxTokens?: number;
}

export interface AnalysisResult {
  label: 'positive' | 'neutral' | 'negative';
  score: number; // -1..1
  confidence: number; // 0..1
  language: LanguageCode;
  version: string;
}
```

## Migration Steps

1. Move analysis internals from existing services into Engine.
2. Keep Orchestrator minimal: input validation, flag handling, engine call, error mapping.
3. Replace service usages with Orchestrator; keep a thin facade for legacy API if needed.
4. Add tests for both Engine and Orchestrator. Use golden tests to guarantee non-regression.

## Testing Strategy

- Unit: Engine (tokenization, negation, sarcasm switch)
- Integration: Orchestrator with mocked cache/repo
- Contract: DTO mapping

## Operational Concerns

- Timeouts: Orchestrator enforces per-call budget.
- Telemetry: emit metrics for latency, errors, cache hit rate.
- Feature flags: allow gradual rollout.
