# ADR-001: Unify sentiment services and clarify responsibilities

Date: 2025-08-11

Status: Proposed

## Context

We currently have parallel services with partially repeated logic (e.g., TweetSentimentAnalysisManager vs SentimentAnalysisService). This causes:

- Duplication across tokenization, language detection, sarcasm handling, and weighting.
- Diverging behavior and bugs during maintenance.
- Harder testing and optimization.

## Decision

Adopt a single-core sentiment architecture that separates pure analysis from orchestration and I/O:

1. Analyzer Engine (pure, deterministic)

- Input: AnalysisRequest (text, language, options)
- Output: AnalysisResult (score, label, signals, errors)
- Responsibilities:
  - Preprocessing/tokenization/normalization
  - Feature extraction (n-grams, emojis, punctuation, negation, intensifiers)
  - Sarcasm and context modifiers (rule-based and statistical)
  - Ensemble/weighting logic (hybrid rule-based + NB/ML)
  - No I/O or persistence; deterministic given same input

2. Orchestrator/Manager (integration)

- Responsibilities:
  - Validate/sanitize request payloads
  - Choose language, model, and Analyzer options
  - Invoke Analyzer Engine; compose with other services (e.g., scraping)
  - Persist results/metrics, cache, publish events
  - Handle timeouts, rate limits, tracing

3. Adapters (I/O boundaries)

- Model repository (load/save model weights)
- Cache (memoize expensive features/pipelines)
- Mappers/DTOs (tweet -> analysis input; analysis -> API output)

4. Facade (compat)

- A thin facade provides the old API shape while delegating to the Orchestrator, easing migration.

## Why this design

- Single source of truth for analysis removes duplicated logic.
- Clear boundaries reduce side effects and make tests fast and reliable.
- Easier evolution: swap models, change weights, or tune sarcasm without touching routing or storage.

## Contracts (sketch)

```ts
export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'unknown';

export interface AnalysisRequest {
  text: string;
  language?: LanguageCode;
  allowSarcasmDetection?: boolean;
  allowContextWindow?: boolean;
  maxTokens?: number;
}

export interface SignalBreakdown {
  tokens: string[];
  ngrams?: Record<string, number>;
  emojis?: Record<string, number>;
  negationFlips?: number;
  intensifierBoost?: number;
  sarcasmScore?: number;
}

export interface AnalysisResult {
  label: 'positive' | 'neutral' | 'negative';
  score: number; // -1..1
  confidence: number; // 0..1
  language: LanguageCode;
  signals: SignalBreakdown;
  version: string; // engine version
}

export interface AnalyzerEngine {
  analyze(input: AnalysisRequest): AnalysisResult;
}

export interface SentimentOrchestrator {
  analyzeText(input: AnalysisRequest): Promise<AnalysisResult>;
  analyzeTweet(tweet: TweetDTO): Promise<AnalysisResult & { tweetId: string }>; // uses mappers
}
```

## Migration plan

1. Extract core analysis into AnalyzerEngine (pure library). Move all tokenization/sarcasm/weighting from both services into it.
2. Make TweetSentimentAnalysisManager the Orchestrator. Remove analysis internals from it; delegate to AnalyzerEngine.
3. Deprecate or reduce SentimentAnalysisService to a thin facade that calls the Orchestrator, or remove it after callers migrate.
4. Introduce shared mappers under lib/mappers:
   - mapTweetToAnalysisRequest(tweet)
   - mapAnalysisToApi(result)
5. Centralize validation and sanitization under lib/validation and reuse across routes/services.
6. Add unit tests:
   - Engine: deterministic cases, sarcasm toggles, language edges
   - Orchestrator: input validation, timeouts, error handling, mapper use
   - Back-compat facade: same outputs for legacy inputs (golden tests)
7. Roll out behind a feature flag. Monitor metrics; remove deprecated service after a stable period.

## Consequences

Positive:

- Less duplication, fewer defects, simpler tests.
- Easier to reason about performance and correctness.

Trade-offs:

- Initial refactor effort and temporary compatibility layer.
- Requires coordination across modules using the old services.

## Alternatives considered

- Keep both services and try to share helpers ad-hoc: rejected; drift continues and is error-prone.
- Rewrite to a new microservice: overkill now; can evolve later with the Engine extracted.

## Notes

This ADR defines boundaries only; implementation details like model choice (NB vs. transformer) remain internal to the Engine.
