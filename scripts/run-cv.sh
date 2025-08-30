#!/bin/bash
# Script to run k-fold cross-validation for sentiment analysis model

# Set default values
KFOLD=${1:-5}
EVAL_MODE="CROSS_VALIDATION"
RANDOM_SEED=${2:-42}

echo "🧪 Running $KFOLD-fold cross-validation with seed $RANDOM_SEED..."

# Run the training script with appropriate environment variables
EVAL_MODE=$EVAL_MODE KFOLD=$KFOLD RANDOM_SEED=$RANDOM_SEED npx tsx scripts/train-model-kfold.ts

echo "✅ Cross-validation complete. Check data/model-metadata.json for results."
echo "📊 You can also view the results at the API endpoint: GET /metrics/cv"
