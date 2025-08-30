# K-fold Cross-Validation for Sentiment Analysis

This document explains how to use the k-fold cross-validation functionality for the sentiment analysis model in SentimentalSocial.

## Overview

K-fold cross-validation is a technique used to evaluate the performance of machine learning models by partitioning the dataset into k equally sized folds, training the model on k-1 folds, and validating on the remaining fold. This process is repeated k times, with each fold serving as the validation set once. This approach provides a more robust estimate of model performance compared to a single train/test split.

## Features

- **Stratified k-fold cross-validation**: Maintains the class distribution in each fold
- **Fixed random seed**: Ensures reproducible results (RANDOM_SEED=42)
- **Configurable k**: Default is 5, but can be changed via environment variable
- **Comprehensive metrics**: Accuracy, macro F1, weighted F1, precision, recall, and F1 by class
- **Confusion matrices**: For each fold and aggregated
- **Statistical analysis**: Mean and standard deviation for each metric
- **JSON output**: Results stored in model-metadata.json

## How to Use

### Running Cross-Validation

To run k-fold cross-validation with the default settings (k=5):

```bash
npm run train:cv
```

To run with a different number of folds (e.g., k=10):

```bash
npm run train:cv10
# or
cross-env EVAL_MODE=CROSS_VALIDATION KFOLD=10 npm run train
```

To run with the traditional single split evaluation (80/20):

```bash
npm run train:split
# or
cross-env EVAL_MODE=SINGLE_SPLIT npm run train
```

### Viewing Results

After running cross-validation, the results are stored in `data/model-metadata.json` under the `performance.cv` key.

You can also view the results via the API endpoint:

```
GET /metrics/cv
```

This endpoint returns the cross-validation metrics, including per-fold metrics and aggregate statistics.

### Output Format

The cross-validation results have the following structure:

```json
{
  "performance": {
    "cv": {
      "k": 5,
      "seed": 42,
      "folds": [
        {
          "fold": 1,
          "accuracy": 0.90,
          "macro_f1": 0.91,
          "weighted_f1": 0.90,
          "test_samples": 253,
          "by_class": { 
            "positive": {
              "precision": 0.92,
              "recall": 0.97,
              "f1_score": 0.94,
              "support": 75
            },
            "negative": { ... },
            "neutral": { ... }
          },
          "confusion_matrix": { ... }
        },
        // More folds...
      ],
      "aggregate": {
        "accuracy": {"mean": 0.905, "std": 0.012},
        "macro_f1": {"mean": 0.907, "std": 0.010},
        "weighted_f1": {"mean": 0.904, "std": 0.011},
        "by_class": {
          "positive": {
            "precision": {"mean": 0.92, "std": 0.01},
            "recall": {"mean": 0.97, "std": 0.01},
            "f1": {"mean": 0.94, "std": 0.01},
            "support": {"mean": 75, "std": 2}
          },
          "negative": { ... },
          "neutral": { ... }
        }
      }
    }
  }
}
```

## Technical Details

- The training script ensures no data leakage by fitting the vectorizer on each training fold only.
- Stratified sampling preserves the class distribution in each fold.
- The seeded random number generator ensures reproducibility.
- After evaluation, the model is retrained on the full dataset for production use.

## Benefits of Cross-Validation

- **More robust evaluation**: Uses the entire dataset for both training and validation
- **Performance variance**: Provides insight into model stability across different data subsets
- **Better detection of overfitting**: Helps identify if the model generalizes well to new data
- **Confidence intervals**: Standard deviation gives a range for expected performance
